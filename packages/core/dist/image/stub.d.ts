import type { ImageGenRequest, ImageGenResponse } from "./types.js";
/** True when the image-generation stub is enabled via env var. */
export declare function isImageStubEnabled(): boolean;
/**
 * Deterministic stub image generation.
 * Produces a stable data-URL placeholder derived from the prompt so that the
 * same prompt always yields the same image — no network access required.
 */
export declare function stubImageGeneration(request: ImageGenRequest): ImageGenResponse;
//# sourceMappingURL=stub.d.ts.map