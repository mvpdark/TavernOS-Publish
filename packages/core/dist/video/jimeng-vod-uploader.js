// Jimeng VOD audio uploader — reverse-engineered from jimeng-api PR #134.
//
// Implements the 4-step VOD upload pipeline for reference audio in omni_reference
// mode. Audio files are uploaded via ByteDance's internal VOD service
// (vod.bytedanceapi.com), which uses standard AWS V4 (SigV4) signing.
//
// Pipeline:
//   1. POST /mweb/v1/get_upload_token  → STS credentials (AK/SK/SessionToken)
//   2. GET  vod.bytedanceapi.com/?Action=ApplyUploadInner  → UploadHost/StoreUri/Auth/SessionKey/Vid
//   3. POST https://{UploadHost}/upload/v1/{StoreUri}  → upload binary (with Content-CRC32)
//   4. POST vod.bytedanceapi.com/?Action=CommitUploadInner  → finalize, get Vid + metadata
//
// Key insight: VOD does NOT support FileType=audio — audio must be uploaded
// as FileType=video. The returned VideoMeta contains Duration/Format/etc.
//
// References:
//   - jimeng-api PR #134: https://github.com/iptag/jimeng-api/pull/134
//   - jimeng-api aws-signature.ts: createSignature() function
//   - jimeng-api util.ts: calculateCRC32() function
import { createHash, createHmac } from "node:crypto";
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** VOD API host (ByteDance internal, AWS V4 compatible). */
const VOD_HOST = "https://vod.bytedanceapi.com";
/** AWS region for CN (jimeng.jianying.com). */
const AWS_REGION_CN = "cn-north-1";
/** AWS service name for VOD. */
const AWS_SERVICE_VOD = "vod";
/** Default space name for Jimeng CN. */
const DEFAULT_SPACE_NAME = "dreamina";
/** Minimum audio duration in seconds (即梦 constraint). */
const MIN_AUDIO_DURATION = 2;
/** Maximum audio duration in seconds (即梦 constraint). */
const MAX_AUDIO_DURATION = 15;
/** Maximum total audio duration across all references. */
const MAX_TOTAL_AUDIO_DURATION = 15;
// ---------------------------------------------------------------------------
// AWS V4 Signature (ported from jimeng-api src/lib/aws-signature.ts)
// ---------------------------------------------------------------------------
/**
 * Create an AWS4-HMAC-SHA256 signature for VOD API requests.
 *
 * This is the standard AWS SigV4 algorithm — ByteDance's internal VOD service
 * (vod.bytedanceapi.com) is AWS-compatible and accepts this signature format.
 *
 * @param method          HTTP method (GET/POST)
 * @param url             Full URL including query string
 * @param headers         Headers to sign (must include x-amz-date)
 * @param accessKeyId     STS access key ID
 * @param secretAccessKey STS secret access key
 * @param sessionToken    STS session token
 * @param payload         Request body (empty string for GET)
 * @param region          AWS region (cn-north-1 for CN)
 * @param service         AWS service ("vod" for VOD uploads)
 * @returns Authorization header value
 */
function createAwsV4Signature(method, url, headers, accessKeyId, secretAccessKey, sessionToken, payload, region, service) {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname || "/";
    const search = urlObj.search;
    const timestamp = headers["x-amz-date"];
    const date = timestamp.substring(0, 8);
    // 1. Canonical query string (sorted by key)
    const queryParams = [];
    const searchParams = new URLSearchParams(search);
    searchParams.forEach((value, key) => {
        queryParams.push([key, value]);
    });
    queryParams.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const canonicalQueryString = queryParams.map(([k, v]) => `${k}=${v}`).join("&");
    // 2. Canonical headers (only x-amz-date, x-amz-security-token, and x-amz-content-sha256 for POST)
    const headersToSign = {
        "x-amz-date": timestamp,
    };
    if (sessionToken) {
        headersToSign["x-amz-security-token"] = sessionToken;
    }
    let payloadHash = createHash("sha256").update("").digest("hex");
    if (method.toUpperCase() === "POST" && payload) {
        payloadHash = createHash("sha256").update(payload, "utf8").digest("hex");
        headersToSign["x-amz-content-sha256"] = payloadHash;
    }
    const signedHeaders = Object.keys(headersToSign)
        .map((k) => k.toLowerCase())
        .sort()
        .join(";");
    const canonicalHeaders = Object.keys(headersToSign)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .map((k) => `${k.toLowerCase()}:${headersToSign[k].trim()}\n`)
        .join("");
    // 3. Canonical request
    const canonicalRequest = [
        method.toUpperCase(),
        pathname,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join("\n");
    // 4. String to sign
    const credentialScope = `${date}/${region}/${service}/aws4_request`;
    const stringToSign = [
        "AWS4-HMAC-SHA256",
        timestamp,
        credentialScope,
        createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
    ].join("\n");
    // 5. Derive signing key (4-layer HMAC, raw bytes)
    const kDate = createHmac("sha256", `AWS4${secretAccessKey}`).update(date).digest();
    const kRegion = createHmac("sha256", kDate).update(region).digest();
    const kService = createHmac("sha256", kRegion).update(service).digest();
    const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
    // 6. Compute signature
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
    return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}
// ---------------------------------------------------------------------------
// CRC32 (ported from jimeng-api src/lib/util.ts)
// ---------------------------------------------------------------------------
/** Pre-computed CRC32 lookup table. */
let crcTable = null;
function getCrcTable() {
    if (crcTable)
        return crcTable;
    crcTable = new Array(256);
    for (let i = 0; i < 256; i++) {
        let crc = i;
        for (let j = 0; j < 8; j++) {
            crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
        }
        crcTable[i] = crc;
    }
    return crcTable;
}
/**
 * Calculate CRC32 of a buffer, returning an 8-char hex string.
 * Used for the Content-CRC32 header in the binary upload step.
 */
function calculateCRC32(buffer) {
    const table = getCrcTable();
    let crc = 0 ^ -1;
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
    }
    return ((crc ^ -1) >>> 0).toString(16).padStart(8, "0");
}
// ---------------------------------------------------------------------------
// VOD Upload Pipeline (4 steps)
// ---------------------------------------------------------------------------
/** Browser-like headers for VOD requests (to avoid bot detection). */
function browserHeaders() {
    return {
        Accept: "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Sec-Ch-Ua": '"Google Chrome";v="132", "Chromium";v="132", "Not_A Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    };
}
/**
 * Step 1: Get STS credentials from Jimeng Web API.
 *
 * POST /mweb/v1/get_upload_token { scene: 1 }
 * → { access_key_id, secret_access_key, session_token, space_name }
 */
async function getUploadToken(sessionid, buildHeadersFn, buildQueryParamsFn, postFn) {
    const timestamp = Math.floor(Date.now() / 1000);
    const uri = "/mweb/v1/get_upload_token";
    const url = "https://jimeng.jianying.com" + uri;
    const headers = buildHeadersFn(sessionid, uri, timestamp);
    const params = buildQueryParamsFn();
    const response = await postFn(url, params, { scene: 1 }, headers, 30_000);
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`获取上传令牌失败 (HTTP ${response.status}): ${text.slice(0, 200)}`);
    }
    const data = (await response.json());
    if (data.ret !== 0 || !data.data) {
        throw new Error(`获取上传令牌失败: ${data.errmsg ?? `ret=${data.ret}`}`);
    }
    const creds = data.data;
    if (!creds.access_key_id || !creds.secret_access_key || !creds.session_token) {
        throw new Error("上传令牌缺少必要的凭证字段");
    }
    return {
        ...creds,
        space_name: creds.space_name || DEFAULT_SPACE_NAME,
    };
}
/**
 * Step 2: Apply for upload permission via ApplyUploadInner.
 *
 * GET vod.bytedanceapi.com/?Action=ApplyUploadInner&Version=2020-11-19&SpaceName=...&FileType=video&IsInner=1&FileSize=...
 * → UploadHost, StoreUri, Auth, SessionKey, Vid
 */
async function applyUploadInner(creds, fileSize) {
    const now = new Date();
    const timestamp = now
        .toISOString()
        .replace(/[:\-]/g, "")
        .replace(/\.\d{3}Z$/, "Z");
    const randomStr = Math.random().toString(36).substring(2, 12);
    const applyUrl = `${VOD_HOST}/?Action=ApplyUploadInner&Version=2020-11-19&SpaceName=${creds.space_name}&FileType=video&IsInner=1&FileSize=${fileSize}&s=${randomStr}`;
    const requestHeaders = {
        "x-amz-date": timestamp,
        "x-amz-security-token": creds.session_token,
    };
    const authorization = createAwsV4Signature("GET", applyUrl, requestHeaders, creds.access_key_id, creds.secret_access_key, creds.session_token, "", AWS_REGION_CN, AWS_SERVICE_VOD);
    const response = await fetch(applyUrl, {
        method: "GET",
        headers: {
            ...browserHeaders(),
            authorization,
            origin: "https://jimeng.jianying.com",
            referer: "https://jimeng.jianying.com/ai-tool/generate",
            "x-amz-date": timestamp,
            "x-amz-security-token": creds.session_token,
        },
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`ApplyUploadInner 失败 (HTTP ${response.status}): ${text.slice(0, 300)}`);
    }
    const result = (await response.json());
    if (result.ResponseMetadata?.Error) {
        throw new Error(`ApplyUploadInner 错误: ${JSON.stringify(result.ResponseMetadata.Error)}`);
    }
    const uploadNodes = result.Result?.InnerUploadAddress?.UploadNodes;
    if (!uploadNodes || uploadNodes.length === 0) {
        throw new Error(`ApplyUploadInner 响应缺少上传节点: ${JSON.stringify(result).slice(0, 300)}`);
    }
    const node = uploadNodes[0];
    const storeInfo = node.StoreInfos?.[0];
    if (!storeInfo) {
        throw new Error(`ApplyUploadInner 响应缺少存储信息: ${JSON.stringify(node).slice(0, 200)}`);
    }
    return {
        uploadHost: node.UploadHost,
        storeUri: storeInfo.StoreUri,
        auth: storeInfo.Auth,
        sessionKey: node.SessionKey,
        vid: node.Vid,
    };
}
/**
 * Step 3: Upload audio binary data to VOD.
 *
 * POST https://{uploadHost}/upload/v1/{storeUri}
 * Headers: Authorization={auth}, Content-CRC32={crc32}, Content-Type=application/octet-stream
 * Success: response JSON code === 2000
 */
async function uploadBinary(node, audioBuffer) {
    const uploadUrl = `https://${node.uploadHost}/upload/v1/${node.storeUri}`;
    const crc32 = calculateCRC32(audioBuffer);
    // Convert Buffer to Uint8Array for fetch body compatibility
    const bodyData = audioBuffer instanceof ArrayBuffer
        ? audioBuffer
        : new Uint8Array(audioBuffer);
    const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
            ...browserHeaders(),
            Authorization: node.auth,
            "Content-CRC32": crc32,
            "Content-Type": "application/octet-stream",
            Origin: "https://jimeng.jianying.com",
            Referer: "https://jimeng.jianying.com/ai-tool/generate",
        },
        body: bodyData,
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`音频二进制上传失败 (HTTP ${response.status}): ${text.slice(0, 300)}`);
    }
    const data = (await response.json());
    if (data.code !== 2000) {
        throw new Error(`音频二进制上传失败: code=${data.code}, message=${data.message ?? "unknown"}`);
    }
}
/**
 * Step 4: Commit upload to finalize and get Vid + metadata.
 *
 * POST vod.bytedanceapi.com/?Action=CommitUploadInner&Version=2020-11-19&SpaceName=...
 * Body: { SessionKey, Functions: [] }
 * → Result.Results[0].Vid + VideoMeta (Duration/Format/Size/Md5)
 */
async function commitUploadInner(creds, sessionKey) {
    const commitUrl = `${VOD_HOST}/?Action=CommitUploadInner&Version=2020-11-19&SpaceName=${creds.space_name}`;
    const commitTimestamp = new Date()
        .toISOString()
        .replace(/[:\-]/g, "")
        .replace(/\.\d{3}Z$/, "Z");
    const commitPayload = JSON.stringify({
        SessionKey: sessionKey,
        Functions: [],
    });
    const payloadHash = createHash("sha256").update(commitPayload, "utf8").digest("hex");
    const commitHeaders = {
        "x-amz-date": commitTimestamp,
        "x-amz-security-token": creds.session_token,
        "x-amz-content-sha256": payloadHash,
    };
    const authorization = createAwsV4Signature("POST", commitUrl, commitHeaders, creds.access_key_id, creds.secret_access_key, creds.session_token, commitPayload, AWS_REGION_CN, AWS_SERVICE_VOD);
    const response = await fetch(commitUrl, {
        method: "POST",
        headers: {
            ...browserHeaders(),
            authorization,
            "content-type": "application/json",
            origin: "https://jimeng.jianying.com",
            referer: "https://jimeng.jianying.com/ai-tool/generate",
            "x-amz-date": commitTimestamp,
            "x-amz-security-token": creds.session_token,
            "x-amz-content-sha256": payloadHash,
        },
        body: commitPayload,
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`CommitUploadInner 失败 (HTTP ${response.status}): ${text.slice(0, 300)}`);
    }
    const result = (await response.json());
    if (result.ResponseMetadata?.Error) {
        throw new Error(`CommitUploadInner 错误: ${JSON.stringify(result.ResponseMetadata.Error)}`);
    }
    const commitResult = result.Result?.Results?.[0];
    if (!commitResult?.Vid) {
        throw new Error(`CommitUploadInner 响应缺少结果: ${JSON.stringify(result).slice(0, 300)}`);
    }
    const meta = commitResult.VideoMeta;
    // Validate audio duration (即梦 constraint: 2-15 seconds per file)
    if (meta?.Duration) {
        if (meta.Duration > MAX_AUDIO_DURATION) {
            throw new Error(`音频时长 ${meta.Duration.toFixed(2)}s 超过限制 (最大 ${MAX_AUDIO_DURATION}s)`);
        }
        if (meta.Duration < MIN_AUDIO_DURATION) {
            throw new Error(`音频时长 ${meta.Duration.toFixed(2)}s 低于限制 (最小 ${MIN_AUDIO_DURATION}s)`);
        }
    }
    return {
        vid: commitResult.Vid,
        duration: meta?.Duration ?? 0,
        format: meta?.Format ?? "",
        size: meta?.Size ?? 0,
        md5: meta?.Md5 ?? "",
    };
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/** Maximum total audio duration across all references. */
export { MAX_TOTAL_AUDIO_DURATION as MAX_TOTAL_AUDIO_DURATION_SEC };
/**
 * Upload an audio buffer to VOD and return the Vid + metadata.
 *
 * This is the main entry point for audio uploads in omni_reference mode.
 * It executes the full 4-step VOD pipeline:
 *   1. Get STS credentials from Jimeng Web API
 *   2. Apply for upload permission (ApplyUploadInner)
 *   3. Upload binary data
 *   4. Commit upload (CommitUploadInner) → get Vid
 *
 * @param audioBuffer       The audio file as an ArrayBuffer/Buffer
 * @param sessionid         Jimeng sessionid (for get_upload_token)
 * @param buildHeadersFn    Function to build Jimeng API headers (from jimeng-direct.ts)
 * @param buildQueryParamsFn Function to build Jimeng query params (from jimeng-direct.ts)
 * @param postFn            Function to POST to Jimeng API (from jimeng-direct.ts)
 * @returns AudioUploadResult with vid, uri, and audioMeta
 */
export async function uploadAudioBuffer(audioBuffer, sessionid, buildHeadersFn, buildQueryParamsFn, postFn) {
    const fileSize = audioBuffer.byteLength;
    console.log(`[jimeng-vod] 开始上传音频: ${fileSize} 字节`);
    // Step 1: Get STS credentials
    const creds = await getUploadToken(sessionid, buildHeadersFn, buildQueryParamsFn, postFn);
    console.log(`[jimeng-vod] 获取上传令牌成功: spaceName=${creds.space_name}`);
    // Step 2: Apply for upload
    const node = await applyUploadInner(creds, fileSize);
    console.log(`[jimeng-vod] 获取上传节点: host=${node.uploadHost}, vid=${node.vid}`);
    // Step 3: Upload binary
    await uploadBinary(node, audioBuffer);
    console.log(`[jimeng-vod] 二进制上传成功`);
    // Step 4: Commit upload
    const commitResult = await commitUploadInner(creds, node.sessionKey);
    console.log(`[jimeng-vod] 上传完成: vid=${commitResult.vid}, ${commitResult.duration}s, ${commitResult.format}`);
    return {
        vid: commitResult.vid,
        uri: "",
        audioMeta: {
            duration: commitResult.duration,
            durationMs: Math.round(commitResult.duration * 1000),
            format: commitResult.format,
            size: commitResult.size,
            md5: commitResult.md5,
        },
    };
}
/**
 * Download audio from a URL and upload it to VOD.
 *
 * @param audioUrl          URL of the audio file to download
 * @param sessionid         Jimeng sessionid
 * @param buildHeadersFn    Function to build Jimeng API headers
 * @param buildQueryParamsFn Function to build Jimeng query params
 * @param postFn            Function to POST to Jimeng API
 * @returns AudioUploadResult with vid, uri, and audioMeta
 */
export async function uploadAudioFromUrl(audioUrl, sessionid, buildHeadersFn, buildQueryParamsFn, postFn) {
    console.log(`[jimeng-vod] 下载音频: ${audioUrl}`);
    const response = await fetch(audioUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) {
        throw new Error(`下载音频失败 (HTTP ${response.status}): ${audioUrl}`);
    }
    const audioBuffer = await response.arrayBuffer();
    console.log(`[jimeng-vod] 音频下载完成: ${audioBuffer.byteLength} 字节`);
    return uploadAudioBuffer(audioBuffer, sessionid, buildHeadersFn, buildQueryParamsFn, postFn);
}
//# sourceMappingURL=jimeng-vod-uploader.js.map