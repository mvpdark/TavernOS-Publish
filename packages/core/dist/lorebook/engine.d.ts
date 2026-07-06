import type { LoreEntry, LoreScanConfig, LoreScanResult } from "./types.js";
import { approxTokens } from "../llm/token-utils.js";
export { approxTokens };
export interface ScanInput {
    readonly entries: readonly LoreEntry[];
    readonly messages: readonly string[];
    readonly config: LoreScanConfig;
    readonly maxContextTokens: number;
}
/**
 * Lore trigger engine.
 * Scans messages for keyword matches and activates entries with budget control.
 * Supports recursive keyword activation: activated entries' content is scanned
 * for further keyword matches up to recursionDepth levels deep.
 */
export declare class LoreEngine {
    private readonly config;
    constructor(config: LoreScanConfig);
    scan(input: ScanInput): LoreScanResult;
}
//# sourceMappingURL=engine.d.ts.map