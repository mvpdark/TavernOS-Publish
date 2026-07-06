import { checkEntryMatch, matchKeys } from "./matcher.js";
import { approxTokens } from "../llm/token-utils.js";
export { approxTokens };
/**
 * Find the first matching primary key in the haystack.
 * Returns the key string, or null if no primary key matches.
 */
function findMatchingKey(haystack, entry, globalOptions) {
    const options = {
        caseSensitive: entry.caseSensitive ?? globalOptions.caseSensitive,
        matchWholeWords: entry.matchWholeWords ?? globalOptions.matchWholeWords,
    };
    for (const k of entry.key) {
        if (k.trim() !== "" && matchKeys(haystack, k, options)) {
            return k;
        }
    }
    return null;
}
/**
 * Check if an entry matches and return the matching key.
 * Wraps checkEntryMatch with additional key identification for activation chain tracking.
 * Constant entries activate unconditionally (matching original engine behavior).
 */
function checkEntryMatchWithKey(haystack, entry, globalOptions) {
    // Constant entries activate unconditionally (no keyword match needed)
    if (entry.constant) {
        return { matched: true, key: "constant" };
    }
    // Non-constant: use checkEntryMatch for the full match logic (primary + secondary)
    if (!checkEntryMatch(haystack, entry, globalOptions)) {
        return { matched: false, key: "" };
    }
    // If matched, find which key triggered it
    const key = findMatchingKey(haystack, entry, globalOptions);
    return { matched: true, key: key ?? "" };
}
/**
 * Lore trigger engine.
 * Scans messages for keyword matches and activates entries with budget control.
 * Supports recursive keyword activation: activated entries' content is scanned
 * for further keyword matches up to recursionDepth levels deep.
 */
export class LoreEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    scan(input) {
        const { entries, messages, maxContextTokens } = input;
        const config = this.config;
        // Compute token budget
        const budgetFromPercent = Math.floor((config.budgetPercentage * maxContextTokens) / 100);
        const budget = config.budgetCap > 0 ? Math.min(budgetFromPercent, config.budgetCap) : budgetFromPercent;
        // Sort entries by order descending (higher order = higher priority)
        const sorted = [...entries].sort((a, b) => b.order - a.order);
        // Build depth buffer: first scanDepth messages joined
        const depthBuffer = messages.slice(0, Math.max(config.scanDepth, 1)).join("\n");
        const globalOptions = {
            caseSensitive: false,
            matchWholeWords: false,
        };
        const activated = [];
        const activatedUids = new Set();
        const activationChain = [];
        let tokenUsage = 0;
        let overflow = false;
        // --- Depth 0: Initial scan (match against original messages) ---
        const depth0NewEntries = [];
        for (const entry of sorted) {
            if (entry.disable)
                continue;
            const matchResult = checkEntryMatchWithKey(depthBuffer, entry, globalOptions);
            let shouldActivate = matchResult.matched;
            // Probability check
            if (shouldActivate && entry.useProbability) {
                if (Math.random() * 100 > entry.probability) {
                    shouldActivate = false;
                }
            }
            if (!shouldActivate)
                continue;
            // Budget check
            const entryTokens = approxTokens(entry.content);
            if (!entry.ignoreBudget && tokenUsage + entryTokens > budget && budget > 0) {
                overflow = true;
                continue;
            }
            // Activate
            activated.push(entry);
            activatedUids.add(entry.uid);
            tokenUsage += entryTokens;
            activationChain.push({ depth: 0, entryUid: entry.uid, triggeredBy: matchResult.key });
            // Collect for recursion (unless preventRecursion)
            if (!entry.preventRecursion) {
                depth0NewEntries.push(entry);
            }
        }
        // --- Depth 1 to N: Recursive scan ---
        // Determine effective recursion depth:
        // recursionDepth takes precedence; fall back to legacy recursionEnabled/maxRecursionSteps
        const effectiveDepth = config.recursionDepth > 0
            ? config.recursionDepth
            : (config.recursionEnabled ? config.maxRecursionSteps : 0);
        // Each depth level scans content from the PREVIOUS depth's new activations only.
        // This creates a chain: depth0 content → triggers depth1 entries → depth1 content → triggers depth2 entries...
        let previousDepthEntries = depth0NewEntries;
        for (let depth = 1; depth <= effectiveDepth; depth++) {
            // Build scan text from previous depth's new activations
            const depthText = previousDepthEntries.map((e) => e.content).join("\n");
            if (!depthText)
                break;
            const currentDepthEntries = [];
            for (const entry of sorted) {
                if (entry.disable)
                    continue;
                if (activatedUids.has(entry.uid))
                    continue;
                if (entry.excludeRecursion)
                    continue;
                const matchResult = checkEntryMatchWithKey(depthText, entry, globalOptions);
                if (!matchResult.matched)
                    continue;
                // Probability check
                if (entry.useProbability && Math.random() * 100 > entry.probability) {
                    continue;
                }
                // Budget check
                const entryTokens = approxTokens(entry.content);
                if (!entry.ignoreBudget && tokenUsage + entryTokens > budget && budget > 0) {
                    overflow = true;
                    continue;
                }
                // Activate
                activated.push(entry);
                activatedUids.add(entry.uid);
                tokenUsage += entryTokens;
                activationChain.push({ depth, entryUid: entry.uid, triggeredBy: matchResult.key });
                if (!entry.preventRecursion) {
                    currentDepthEntries.push(entry);
                }
            }
            // No new activations at this depth — stop recursion early
            if (currentDepthEntries.length === 0)
                break;
            // Next depth scans content from this depth's new activations
            previousDepthEntries = currentDepthEntries;
        }
        // Build injected content (sorted by order for consistent output)
        const injectedContent = activated
            .sort((a, b) => b.order - a.order)
            .map((e) => e.content)
            .join("\n\n");
        return {
            activatedEntries: activated,
            injectedContent,
            tokenUsage,
            overflow,
            activationChain,
        };
    }
}
//# sourceMappingURL=engine.js.map