// Image generation client.
//
// Uses native fetch (no external SDK) to call the OpenAI DALL-E compatible
// image generation endpoint (POST /v1/images/generations). The base URL is
// resolved from the image provider registry so that Stable Diffusion and
// ComfyUI endpoints work transparently.
import { imageProviderRegistry } from "./types.js";
import { isImageStubEnabled, stubImageGeneration } from "./stub.js";
import { normalizeApiUrl, buildHeaders, throwApiError } from "../shared/http.js";
import { lookup as dnsLookup } from "node:dns/promises";
// ---------------------------------------------------------------------------
// SSRF protection — block reference-image URLs that resolve to private IPs.
// Mirrors the isPrivateIp / assertPublicHost logic in studio/server/index.ts.
// ---------------------------------------------------------------------------
const PRIVATE_IP_PATTERNS = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^169\.254\./,
    /^0\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
    /^fd/i,
];
function isPrivateIp(ip) {
    return PRIVATE_IP_PATTERNS.some((re) => re.test(ip));
}
/**
 * Resolve a URL's hostname and reject if it points to a private/internal IP.
 * Prevents server-side request forgery via the user-supplied
 * {@link ImageGenRequest.referenceImageUrl}. Mirrors the private-IP filtering
 * used by the studio server so both fetch sites share the same guard.
 */
async function assertPublicUrl(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        throw new Error(`Invalid reference image URL: ${url}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(`Reference image URL must use http(s): ${url}`);
    }
    const hostname = parsed.hostname;
    const results = await dnsLookup(hostname, { all: true }).catch(() => []);
    if (results.length === 0) {
        // DNS resolution failed — could still be a literal IP. Reject if private.
        if (isPrivateIp(hostname)) {
            throw new Error("Reference image URL resolves to a private address");
        }
        return; // unresolvable public-looking host — let fetch surface the error
    }
    for (const r of results) {
        if (isPrivateIp(r.address)) {
            throw new Error("Reference image URL resolves to a private address");
        }
    }
}
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createImageGenClient(config) {
    // Resolve the base URL from the provider registry for known providers so
    // that ComfyUI / Stable Diffusion endpoints are used automatically. For the
    // "custom" provider (not in the registry) the config baseUrl is used as-is.
    const providerConfig = imageProviderRegistry.get(config.provider);
    const baseUrl = providerConfig?.baseUrl ?? config.baseUrl;
    const model = config.model || providerConfig?.models[0]?.id || "dall-e-3";
    return {
        provider: config.provider,
        baseUrl,
        defaults: {
            model,
            size: config.size,
            style: config.style,
            quality: config.quality,
        },
        generate: (request) => generateImage(config, baseUrl, model, request),
    };
}
// ---------------------------------------------------------------------------
// Generation (stub mode → real API call)
// ---------------------------------------------------------------------------
async function generateImage(config, baseUrl, model, request) {
    // 1. Stub mode — deterministic offline response
    if (isImageStubEnabled()) {
        return stubImageGeneration(request);
    }
    const headers = buildHeaders(config.apiKey);
    // 2. If a reference image is provided, use the /images/edits endpoint
    //    (gpt-image-2 supports image editing with a reference image).
    if (request.referenceImageBuffer ?? request.referenceImageUrl) {
        // Use pre-downloaded buffer if available; otherwise fetch from URL.
        let imgArrayBuffer;
        if (request.referenceImageBuffer) {
            const buf = request.referenceImageBuffer instanceof Buffer
                ? request.referenceImageBuffer
                : Buffer.from(request.referenceImageBuffer);
            imgArrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        }
        else {
            // SSRF guard: never fetch a user-supplied reference image URL that
            // resolves to a private/internal address.
            await assertPublicUrl(request.referenceImageUrl);
            const imgRes = await fetch(request.referenceImageUrl, { signal: AbortSignal.timeout(30000) });
            if (!imgRes.ok)
                throw new Error(`下载参考图失败: ${imgRes.status}`);
            imgArrayBuffer = await imgRes.arrayBuffer();
        }
        const url = normalizeApiUrl(baseUrl, "/images/edits");
        const formData = new FormData();
        formData.append("model", model);
        formData.append("prompt", request.prompt);
        formData.append("n", String(request.n ?? 1));
        formData.append("size", request.size ?? config.size);
        formData.append("image", new Blob([imgArrayBuffer], { type: "image/png" }), "reference.png");
        // Do NOT set Content-Type for FormData — the runtime must auto-set
        // multipart/form-data with the correct boundary.
        const editHeaders = buildHeaders(config.apiKey, { json: false });
        const response = await fetch(url, {
            method: "POST",
            headers: editHeaders,
            body: formData,
        });
        if (!response.ok) {
            await throwApiError(response, "Image edit API");
        }
        const data = (await response.json());
        const images = (data.data ?? []).map((d) => ({
            url: d.url ?? (d.b64_json ? `data:image/png;base64,${d.b64_json}` : ""),
            revisedPrompt: d.revised_prompt,
            b64Json: d.b64_json,
        }));
        return { images, created: data.created ?? Math.floor(Date.now() / 1000) };
    }
    // 3. Regular text-to-image generation
    const url = normalizeApiUrl(baseUrl, "/images/generations");
    const body = {
        model,
        prompt: request.prompt,
        n: request.n ?? 1,
        size: request.size ?? config.size,
    };
    // Agnes does not support style / quality / response_format params
    if (config.provider !== "agnes") {
        body.style = request.style ?? config.style;
        body.quality = request.quality ?? config.quality;
        body.response_format = "url";
    }
    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        await throwApiError(response, "Image generation API");
    }
    const data = (await response.json());
    const images = (data.data ?? []).map((d) => ({
        url: d.url ?? (d.b64_json ? `data:image/png;base64,${d.b64_json}` : ""),
        revisedPrompt: d.revised_prompt,
        b64Json: d.b64_json,
    }));
    return {
        images,
        created: data.created ?? Math.floor(Date.now() / 1000),
    };
}
//# sourceMappingURL=client.js.map