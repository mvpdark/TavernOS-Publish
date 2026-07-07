// packages/core/src/agents/architect.ts
import type { LLMMessage } from "../llm/types.js";
import { loadPrompt } from "../prompts/loader.js";
import { createAgentRuntime, type AgentContext, type AgentChatOptions } from "./base.js";
import { parseSections, extractPromptMessages } from "./json-utils.js";

// Re-export parseSections for backward compatibility (tests import from architect.js)
export { parseSections };

export interface ArchitectOutput {
  premise: string;
  world: string;
  characters: string;
  plot: string;
  hooks: string;
}

/** Outline planner agent produced by the factory (compose pattern). */
export interface OutlinePlanner {
  readonly name: string;
  generate(input: {
    title: string;
    genre: string;
    language: string;
    additionalRequirements?: string;
  }, options?: AgentChatOptions): Promise<ArchitectOutput>;
}

const REQUIRED_SECTIONS = ["premise", "world", "characters", "plot", "hooks"] as const;
const MAX_REPAIR_ATTEMPTS = 2;

/**
 * Factory: build an OutlineConductor agent by composing a shared runtime.
 * Replaces the former `class OutlinePlanner extends BaseAgent`.
 */
export function createOutlinePlanner(ctx: AgentContext): OutlinePlanner {
  const runtime = createAgentRuntime(ctx);
  const name = "architect";

  /**
   * Try to parse SECTION blocks from the LLM response.
   * If required sections are missing, send a repair request asking the LLM
   * to fix its output. Retry up to MAX_REPAIR_ATTEMPTS times.
   */
  async function parseSectionsWithRepair(
    initialText: string,
    originalMessages: ReadonlyArray<LLMMessage>,
    options?: AgentChatOptions,
  ): Promise<Map<string, string>> {
    let sections = parseSections(initialText);
    let lastText = initialText;
    let repairError: string | undefined;

    for (let attempt = 0; attempt < MAX_REPAIR_ATTEMPTS; attempt++) {
      const missing = REQUIRED_SECTIONS.filter((s) => !sections.has(s));
      if (missing.length === 0) break;

      const repairMessages: LLMMessage[] = [
        ...originalMessages,
        { role: "assistant", content: lastText },
        {
          role: "user",
          content:
            `Your previous response is missing the following sections: ${missing.join(", ")}.\n` +
            `Please re-output ALL required sections using the "## SECTION: <name>" format.\n` +
            `Required sections: ${REQUIRED_SECTIONS.join(", ")}.`,
        },
      ];

      try {
        const response = await runtime.chat(repairMessages, options);
        lastText = response.content;
        sections = parseSections(response.content);
      } catch (e) {
        // Repair call failed — record the reason and stop retrying.
        repairError = e instanceof Error ? e.message : String(e);
        break;
      }
    }

    // If required sections are still missing after all repair attempts, fail
    // loudly instead of silently returning empty content (M4 / L4).
    const stillMissing = REQUIRED_SECTIONS.filter((s) => !sections.has(s));
    if (stillMissing.length > 0) {
      throw new Error(
        `Architect section parsing failed after repair attempts (missing: ${stillMissing.join(", ")})` +
          (repairError ? `: ${repairError}` : ""),
      );
    }

    return sections;
  }

  async function generate(input: {
    title: string;
    genre: string;
    language: string;
    additionalRequirements?: string;
  }, options?: AgentChatOptions): Promise<ArchitectOutput> {
    const promptText = await loadPrompt("architect", {
      title: input.title,
      genre: input.genre,
      language: input.language,
      additionalRequirements: input.additionalRequirements ?? "",
    });

    const { system, user } = extractPromptMessages(promptText);
    const messages: LLMMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    const response = await runtime.chat(messages, options);
    const sections = await parseSectionsWithRepair(response.content, messages, options);

    return {
      premise: sections.get("premise") ?? "",
      world: sections.get("world") ?? "",
      characters: sections.get("characters") ?? "",
      plot: sections.get("plot") ?? "",
      hooks: sections.get("hooks") ?? "",
    };
  }

  return { name, generate };
}
