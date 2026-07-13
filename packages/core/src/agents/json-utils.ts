// packages/core/src/agents/json-utils.ts
//
// Shared utilities for LLM response parsing across agents.
// Extracted from consolidator.ts, asset-extractor.ts, video-reviewer.ts,
// auditor.ts, architect.ts, planner.ts, and writer.ts to eliminate the
// 4-level JSON parsing fallback duplication (OPT-C1).
import type { ZodTypeAny } from "zod";

/**
 * Parse a JSON object from an LLM response using a 4-level fallback strategy:
 * 1. JSON.parse() on the full response text
 * 2. Extract JSON object between `{` and `}` (greedy) using regex
 * 3. Extract JSON from a ```json ... ``` code block
 * 4. Return null (caller falls back to a default)
 *
 * Used by: StateExtractor, AssetExtractor, VideoReviewer.
 */
export function parseJsonObject(text: string): unknown | null {
  // Level 1: Try full parse
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }

  // Level 2: Extract JSON object between { and } (greedy — matches last })
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]!);
    } catch {
      // fall through
    }
  }

  // Level 2b: Balanced-brace extraction — handles nested objects and
  // trailing text that confuse the greedy regex. Scans the text for the
  // first complete top-level JSON object by tracking brace depth and
  // string literals (same approach as parseJsonArray Level 3).
  {
    let depth = 0;
    let start = -1;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i]!;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === "{") {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && start >= 0) {
          const objStr = text.slice(start, i + 1);
          try {
            return JSON.parse(objStr);
          } catch {
            // continue scanning for another object
          }
          start = -1;
        }
      }
    }
  }

  // Level 3: Extract from code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]!);
    } catch {
      // fall through
    }
  }

  // Level 4: Return null
  return null;
}

/**
 * Parse a JSON array from an LLM response using a 4-level fallback strategy:
 * 1. JSON.parse() on the full response text (must be an array)
 * 2. Extract JSON array between `[` and `]` using regex
 * 3. Extract individual JSON objects via balanced-brace scanning
 * 4. Return an empty array
 *
 * Used by: Sentinel (auditor).
 */
export function parseJsonArray(text: string): unknown[] {
  // Level 1: Try full parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }

  // Level 2: Extract JSON array between [ and ]
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]!);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through
    }
  }

  // Level 3: Extract individual JSON objects via balanced-brace scanning
  const objects: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const objStr = text.slice(start, i + 1);
        try {
          objects.push(JSON.parse(objStr));
        } catch {
          // skip malformed object
        }
        start = -1;
      }
    }
  }

  if (objects.length > 0) return objects;

  // Level 4: Return empty array
  return [];
}

/**
 * Parse a JSON object from text and validate it against a Zod schema.
 * Combines {@link parseJsonObject} with `schema.safeParse()`, returning the
 * validated data on success or `null` when parsing or validation fails.
 *
 * Used by: StateExtractor, AssetExtractor, VideoReviewer.
 */
export function parseAndValidate<S extends ZodTypeAny>(
  text: string,
  schema: S,
): S["_output"] | null {
  const parsed = parseJsonObject(text);
  if (parsed === null) return null;
  const result = schema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * Parse a JSON array from text and validate each element against a Zod
 * schema. Elements that fail validation are silently skipped.
 * Combines {@link parseJsonArray} with per-element `schema.safeParse()`.
 *
 * Used by: Sentinel (auditor).
 */
export function parseAndValidateArray<S extends ZodTypeAny>(
  text: string,
  schema: S,
): S["_output"][] {
  const rawItems = parseJsonArray(text);
  const results: S["_output"][] = [];
  for (const raw of rawItems) {
    const result = schema.safeParse(raw);
    if (result.success) {
      results.push(result.data);
    }
  }
  return results;
}

/**
 * Extract the `system:` and `user:` literal-block parts from a prompt YAML string.
 * This avoids a full YAML parser dependency while handling the predictable
 * two-key structure used by TavernOS prompt templates.
 *
 * Used by: OutlinePlanner, Scribe, Sentinel, Planner.
 */
export function extractPromptMessages(promptText: string): { system: string; user: string } {
  const normalized = promptText.replace(/\r\n/g, "\n");
  const systemMatch = normalized.match(/^system:\s*\|\s*\n([\s\S]*?)(?=\nuser:\s*\|)/m);
  const userMatch = normalized.match(/^user:\s*\|\s*\n([\s\S]*)/m);
  return {
    system: systemMatch?.[1]?.trim() ?? "",
    user: userMatch?.[1]?.trim() ?? "",
  };
}

/**
 * Parse "## SECTION: <name>" blocks from text into a Map.
 * Each block's content is the text between its header and the next header (or end).
 *
 * Used by: OutlinePlanner, Planner.
 */
export function parseSections(text: string): Map<string, string> {
  const normalized = text.replace(/\r\n/g, "\n");
  const result = new Map<string, string>();
  // Capture section names as a non-whitespace run ([^\s]+) so Unicode names
  // (e.g. CJK section headers) are matched — \w+ only matches ASCII word chars.
  const regex = /## SECTION:\s*([^\s]+)\s*\n([\s\S]*?)(?=\n## SECTION:|$)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    result.set(match[1]!, match[2]!.trim());
  }
  return result;
}
