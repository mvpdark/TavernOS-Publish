// Token estimation and context window guard
// CJK-aware: Chinese/Japanese/Korean chars count as ~1 token each
// Non-CJK: ~4 chars per token

import { ContextWindowExceededError } from "./errors.js";
import { lookupModel, UNKNOWN_MODEL_FALLBACK_CONTEXT_WINDOW } from "./provider-bank.js";

// ---------------------------------------------------------------------------
// Token Estimation
// ---------------------------------------------------------------------------

const CJK_REGEX = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;

/**
 * Approximate token count for a string.
 * CJK characters: ~1 token per character
 * Non-CJK: ~1 token per 4 characters
 */
export function approxTokens(text: string): number {
  if (!text) return 0;

  const cjkMatches = text.match(CJK_REGEX);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  const nonCjkCount = text.length - cjkCount;

  return Math.ceil(cjkCount + nonCjkCount / 4);
}

/**
 * Approximate total tokens for a list of messages.
 */
export function estimateMessagesTokens(
  messages: ReadonlyArray<{ readonly role: string; readonly content: string }>,
): number {
  let total = 0;
  for (const msg of messages) {
    total += approxTokens(msg.content);
    total += 4; // Role + structural overhead per message
  }
  return total + 3; // priming tokens
}

// ---------------------------------------------------------------------------
// Context Window Guard
// ---------------------------------------------------------------------------

export interface ContextWindowCheck {
  readonly inputTokens: number;
  readonly contextWindow: number;
  readonly reservedOutput: number;
  readonly available: number;
  readonly withinWindow: boolean;
}

/**
 * Check whether the input fits within the model's context window
 * after reserving space for the output.
 */
export function checkContextWindow(
  inputTokens: number,
  serviceName: string,
  modelName: string,
  reservedOutput?: number,
): ContextWindowCheck {
  const modelCard = lookupModel(serviceName, modelName);
  const contextWindow = modelCard?.contextWindowTokens ?? UNKNOWN_MODEL_FALLBACK_CONTEXT_WINDOW;
  const output = reservedOutput ?? modelCard?.maxOutput ?? 8192;
  const available = contextWindow - output;

  return {
    inputTokens,
    contextWindow,
    reservedOutput: output,
    available,
    withinWindow: inputTokens <= available,
  };
}

/**
 * Assert that the input fits within the context window.
 * Throws ContextWindowExceededError if not — never silently truncates.
 */
export function assertWithinContextWindow(
  inputTokens: number,
  serviceName: string,
  modelName: string,
  reservedOutput?: number,
): void {
  const check = checkContextWindow(inputTokens, serviceName, modelName, reservedOutput);
  if (!check.withinWindow) {
    throw new ContextWindowExceededError(
      `Estimated input tokens (${check.inputTokens}) exceed available context window ` +
        `(${check.available}/${check.contextWindow} after reserving ${check.reservedOutput} for output). ` +
        `Reduce the input or use a model with a larger context window.`,
      check.inputTokens,
      check.contextWindow,
      check.reservedOutput,
    );
  }
}

// ---------------------------------------------------------------------------
// Temperature Clamping
// ---------------------------------------------------------------------------

/**
 * Clamp temperature for models that require a specific temperature.
 * E.g., Moonshot kimi-k2.5 requires temperature === 1.
 */
export function clampTemperatureForModel(
  serviceName: string,
  modelName: string,
  temperature: number,
): number {
  const modelCard = lookupModel(serviceName, modelName);
  if (modelCard?.fixedTemperature !== undefined) {
    return modelCard.fixedTemperature;
  }
  return temperature;
}
