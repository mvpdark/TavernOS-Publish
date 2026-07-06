// packages/core/src/character/png.ts
//
// Persona PNG embedding — stores character card JSON inside PNG tEXt chunks
// using a TavernOS-native keyword (`tavernos_persona`). This replaces the
// legacy dual-write strategy (`chara` + `ccv3`) with a single-write approach.
//
// Reading remains backward-compatible: if a PNG was created by older software
// using `ccv3` or `chara` keywords, those are still recognised on import.
//
import extract from "png-chunks-extract";
import { encode as encodeText, decode as decodeText } from "png-chunk-text";
// --- Constants ---
/** tEXt keyword for TavernOS-native persona data (base64-encoded JSON). */
const PERSONA_KEYWORD = "tavernos_persona";
/** Legacy keywords retained for backward-compatible reading only. */
const LEGACY_KEYWORDS = ["ccv3", "chara"];
/** All keywords we recognise when reading or scrubbing. */
const ALL_KEYWORDS = [PERSONA_KEYWORD, ...LEGACY_KEYWORDS];
// --- Public API ---
/**
 * Embed persona card JSON into a PNG buffer as a single `tavernos_persona`
 * tEXt chunk. Any existing persona / chara / ccv3 chunks are stripped first
 * to avoid stale duplicates. The cardJson is stored verbatim (no spec
 * mutation) as base64.
 */
export function embedPersonaInPNG(pngBuffer, cardJson) {
    const src = pngBuffer instanceof Buffer ? pngBuffer : Buffer.from(pngBuffer);
    const chunks = extract(src);
    // Scrub all existing persona-related tEXt chunks
    const cleaned = chunks.filter((chunk) => {
        if (chunk.name !== "tEXt")
            return true;
        const decoded = decodeText(chunk.data);
        return !ALL_KEYWORDS.includes(decoded.keyword.toLowerCase());
    });
    // Inject the single tavernos_persona chunk before IEND
    const payload = Buffer.from(cardJson, "utf8").toString("base64");
    cleaned.splice(-1, 0, encodeText(PERSONA_KEYWORD, payload));
    return reassemblePNG(cleaned);
}
/**
 * Extract persona card JSON from a PNG buffer.
 *
 * Lookup priority:
 *   1. `tavernos_persona` — TavernOS native format
 *   2. `ccv3`             — legacy V3 dual-write
 *   3. `chara`            — legacy V2 single-write
 *
 * Throws if the PNG contains no tEXt metadata at all, or if no recognised
 * persona keyword is found.
 */
export function extractPersonaFromPNG(pngBuffer) {
    const src = pngBuffer instanceof Buffer ? pngBuffer : Buffer.from(pngBuffer);
    const chunks = extract(src);
    const textChunks = chunks
        .filter((c) => c.name === "tEXt")
        .map((c) => decodeText(c.data));
    if (textChunks.length === 0) {
        throw new Error("No PNG metadata found");
    }
    // Try each keyword in priority order
    for (const keyword of ALL_KEYWORDS) {
        const match = textChunks.find((c) => c.keyword.toLowerCase() === keyword);
        if (match) {
            return Buffer.from(match.text, "base64").toString("utf8");
        }
    }
    throw new Error("No persona card data found in PNG");
}
// --- PNG re-encoder ---
/** Reassemble a PNG buffer from an array of named chunks. */
function reassemblePNG(chunks) {
    const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const parts = [PNG_SIGNATURE];
    for (const chunk of chunks) {
        const nameBuf = Buffer.from(chunk.name, "ascii");
        const lengthBuf = Buffer.alloc(4);
        lengthBuf.writeUInt32BE(chunk.data.length, 0);
        const crcInput = Buffer.concat([nameBuf, Buffer.from(chunk.data)]);
        const crcBuf = Buffer.alloc(4);
        crcBuf.writeUInt32BE(computeCRC32(crcInput), 0);
        parts.push(lengthBuf, nameBuf, Buffer.from(chunk.data), crcBuf);
    }
    return Buffer.concat(parts);
}
// --- CRC32 (IEEE polynomial) ---
const CRC_LOOKUP_TABLE = (() => {
    const table = new Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    return table;
})();
function computeCRC32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = CRC_LOOKUP_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
//# sourceMappingURL=png.js.map