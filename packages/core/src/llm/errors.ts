// Custom error classes for LLM operations

/**
 * Thrown when a streaming response is interrupted before completion.
 * The partial content is preserved for diagnostic purposes only —
 * it must NEVER be written to disk as a successful chapter.
 */
export class PartialResponseError extends Error {
  readonly partialContent: string;

  constructor(message: string, partialContent: string) {
    super(message);
    this.name = "PartialResponseError";
    this.partialContent = partialContent;
  }
}

/**
 * Thrown when the estimated input tokens exceed the model's context window
 * after reserving space for the output. Semantic text is NEVER silently
 * truncated — the caller must explicitly reduce the input.
 */
export class ContextWindowExceededError extends Error {
  readonly estimatedInputTokens: number;
  readonly contextWindow: number;
  readonly reservedOutput: number;

  constructor(
    message: string,
    estimatedInputTokens: number,
    contextWindow: number,
    reservedOutput: number,
  ) {
    super(message);
    this.name = "ContextWindowExceededError";
    this.estimatedInputTokens = estimatedInputTokens;
    this.contextWindow = contextWindow;
    this.reservedOutput = reservedOutput;
  }
}

/**
 * Thrown when a model/service mismatch is detected (e.g., using a Kimi model
 * with a Google service endpoint).
 */
export class ModelServiceMismatchError extends Error {
  readonly service: string;
  readonly model: string;

  constructor(service: string, model: string) {
    super(`Model "${model}" does not belong to service "${service}"`);
    this.name = "ModelServiceMismatchError";
    this.service = service;
    this.model = model;
  }
}

/**
 * Thrown when all transient retry attempts are exhausted.
 */
export class LLMRetryExhaustedError extends Error {
  readonly lastError: unknown;
  readonly attempts: number;

  constructor(message: string, lastError: unknown, attempts: number) {
    super(message);
    this.name = "LLMRetryExhaustedError";
    this.lastError = lastError;
    this.attempts = attempts;
  }
}

/**
 * Thrown when an LLM API call exceeds the configured timeout.
 * The call is aborted via AbortController to prevent indefinite hangs.
 */
export class LLMTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = "LLMTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}
