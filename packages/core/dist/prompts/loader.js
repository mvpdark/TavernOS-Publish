// packages/core/src/prompts/loader.ts
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
/**
 * In-memory cache for loaded prompt templates.
 * Key: prompt name, Value: raw YAML content.
 * Prompt files are immutable at runtime, so caching is safe.
 */
const promptCache = new Map();
/**
 * Read a prompt YAML file, with a src/ fallback for development.
 *
 * tsc does not copy .yaml files to dist/, so a bare `tsc` (without the
 * `copy-prompts` build step) leaves 0-byte placeholders in dist/prompts/.
 * When the dist copy is empty, fall back to the adjacent src/prompts/ so the
 * LLM never receives a blank prompt. In production installs (no src/), the
 * fallback path simply doesn't exist and the original error propagates.
 */
async function readPromptFile(name) {
    const distPath = join(__dirname, `${name}.yaml`);
    let content = await readFile(distPath, "utf8");
    if (content.trim().length > 0)
        return content;
    // Empty dist copy — try the src fallback (development / monorepo only).
    const srcPath = join(__dirname, "..", "..", "src", "prompts", `${name}.yaml`);
    try {
        const fallback = await readFile(srcPath, "utf8");
        if (fallback.trim().length > 0) {
            console.warn(`[prompt-loader] "${name}.yaml" was empty in dist/ — used src/ fallback. ` +
                `Run "npm run build" (not bare tsc) to copy prompts to dist/.`);
            return fallback;
        }
    }
    catch {
        // No src fallback available (production install) — fall through.
    }
    console.error(`[prompt-loader] "${name}.yaml" is empty and no src fallback exists. ` +
        `The LLM will receive a blank prompt. Rebuild with "npm run build".`);
    return content;
}
/**
 * Load a prompt template from the prompts directory and interpolate variables.
 *
 * Uses async file I/O to avoid blocking the event loop during concurrent
 * request handling. Results are cached in-memory after the first load.
 *
 * @param name - Prompt name (without .yaml extension)
 * @param variables - Variables to interpolate using {{variable}} syntax
 * @returns The interpolated prompt string
 */
export async function loadPrompt(name, variables) {
    let content = promptCache.get(name);
    if (content === undefined) {
        content = await readPromptFile(name);
        promptCache.set(name, content);
    }
    if (!variables) {
        return content;
    }
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = variables[key];
        if (value === undefined) {
            // Warn about unfilled variables so they are not silently left as
            // literal placeholders. The literal is retained to avoid breaking
            // the prompt at runtime.
            console.warn(`[prompt-loader] Unfilled variable: ${key}`);
            return match;
        }
        return value;
    });
}
/**
 * Interpolate variables in a template string.
 */
export function interpolateTemplate(template, variables) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = variables[key];
        if (value === undefined) {
            console.warn(`[prompt-loader] Unfilled variable: ${key}`);
            return match;
        }
        return value;
    });
}
//# sourceMappingURL=loader.js.map