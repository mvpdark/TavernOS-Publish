/**
 * Embed persona card JSON into a PNG buffer as a single `tavernos_persona`
 * tEXt chunk. Any existing persona / chara / ccv3 chunks are stripped first
 * to avoid stale duplicates. The cardJson is stored verbatim (no spec
 * mutation) as base64.
 */
export declare function embedPersonaInPNG(pngBuffer: Buffer | Uint8Array, cardJson: string): Buffer;
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
export declare function extractPersonaFromPNG(pngBuffer: Buffer | Uint8Array): string;
//# sourceMappingURL=png.d.ts.map