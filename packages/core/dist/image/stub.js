// Image generation stub mode.
//
// When the TAVERNOS_IMAGE_STUB environment variable is truthy, the image
// client short-circuits real HTTP calls and returns deterministic placeholder
// images. This mirrors the LLM stub pattern and enables fully offline tests.
/** True when the image-generation stub is enabled via env var. */
export function isImageStubEnabled() {
    const v = process.env["TAVERNOS_IMAGE_STUB"];
    return v === "true" || v === "1";
}
/**
 * Deterministic stub image generation.
 * Produces a stable data-URL placeholder derived from the prompt so that the
 * same prompt always yields the same image — no network access required.
 */
export function stubImageGeneration(request) {
    const n = request.n ?? 1;
    const images = [];
    for (let i = 0; i < n; i++) {
        // Tiny 1x1 transparent PNG base64 — deterministic and valid.
        const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
        images.push({
            url: `data:image/png;base64,${b64}`,
            revisedPrompt: `[STUB] ${request.prompt}${n > 1 ? ` #${i + 1}` : ""}`,
            b64Json: b64,
        });
    }
    return {
        images,
        created: Math.floor(Date.now() / 1000),
    };
}
//# sourceMappingURL=stub.js.map