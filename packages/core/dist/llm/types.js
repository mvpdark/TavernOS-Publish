// Shared LLM types
// ---------------------------------------------------------------------------
// Stream Tracker
// ---------------------------------------------------------------------------
export function createStreamTracker(onProgress, intervalMs = 30_000) {
    let totalChars = 0;
    let chineseChars = 0;
    const startTime = Date.now();
    let timer;
    if (onProgress) {
        timer = setInterval(() => {
            try {
                onProgress({
                    elapsedMs: Date.now() - startTime,
                    totalChars,
                    chineseChars,
                    status: "streaming",
                });
            }
            catch {
                // Swallow errors from user-supplied progress callbacks to keep
                // the interval loop alive; a throwing callback should not crash
                // the stream parser.
            }
        }, intervalMs);
    }
    return {
        onChunk(text) {
            totalChars += text.length;
            chineseChars += (text.match(/[\u4e00-\u9fff]/g) || []).length;
        },
        stop() {
            if (timer !== undefined) {
                clearInterval(timer);
                timer = undefined;
            }
            onProgress?.({
                elapsedMs: Date.now() - startTime,
                totalChars,
                chineseChars,
                status: "done",
            });
        },
    };
}
//# sourceMappingURL=types.js.map