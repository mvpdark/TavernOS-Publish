// Shared LLM types

export interface LLMMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface LLMResponse {
  readonly content: string;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
}

export interface StreamProgress {
  readonly elapsedMs: number;
  readonly totalChars: number;
  readonly chineseChars: number;
  readonly status: "streaming" | "done";
}

export type OnStreamProgress = (progress: StreamProgress) => void;

export interface ChatOptions {
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly onStreamProgress?: OnStreamProgress;
  /** Called for every text delta received during streaming. */
  readonly onChunk?: (delta: string) => void;
  readonly signal?: AbortSignal;
  /** Per-request timeout in milliseconds. No default timeout — set explicitly if needed. */
  readonly timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Stream Tracker
// ---------------------------------------------------------------------------

export function createStreamTracker(
  onProgress?: OnStreamProgress,
  intervalMs: number = 30_000,
): { readonly onChunk: (text: string) => void; readonly stop: () => void } {
  let totalChars = 0;
  let chineseChars = 0;
  const startTime = Date.now();
  let timer: ReturnType<typeof setInterval> | undefined;

  if (onProgress) {
    timer = setInterval(() => {
      try {
        onProgress({
          elapsedMs: Date.now() - startTime,
          totalChars,
          chineseChars,
          status: "streaming",
        });
      } catch {
        // Swallow errors from user-supplied progress callbacks to keep
        // the interval loop alive; a throwing callback should not crash
        // the stream parser.
      }
    }, intervalMs);
  }

  return {
    onChunk(text: string): void {
      totalChars += text.length;
      chineseChars += (text.match(/[\u4e00-\u9fff]/g) || []).length;
    },
    stop(): void {
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
