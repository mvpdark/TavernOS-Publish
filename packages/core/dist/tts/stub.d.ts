import type { TTSRequest, TTSResponse } from "./types.js";
/** True when the TTS stub is enabled via env var. */
export declare function isTTSStubEnabled(): boolean;
/**
 * Deterministic stub TTS synthesis.
 * Produces a stable placeholder audio buffer derived from the input text so
 * that the same text always yields the same buffer — no network access required.
 */
export declare function stubTTSSynthesis(request: TTSRequest): TTSResponse;
//# sourceMappingURL=stub.d.ts.map