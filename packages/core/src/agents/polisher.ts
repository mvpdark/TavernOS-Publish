// packages/core/src/agents/polisher.ts
import type { LLMMessage } from "../llm/types.js";
import { createAgentRuntime, toErrorMessage, type AgentContext, type AgentChatOptions } from "./base.js";
import type { SentinelIssue } from "./sentinel.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single paragraph that was revised by the polisher. */
export interface PolishedParagraph {
  location: string;
  originalText: string;
  revisedText: string;
}

export interface PolisherOutput {
  revisedContent: string;
  appliedFixes: string[];
  revisedParagraphs: PolishedParagraph[];
  /** Aggregated token usage from all LLM calls (paragraph revisions + full-text). */
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

/** Polisher agent produced by the factory (compose pattern). */
export interface Polisher {
  readonly name: string;
  revise(input: {
    chapterContent: string;
    auditIssues: SentinelIssue[];
  }, options?: AgentChatOptions): Promise<PolisherOutput>;
}

// ---------------------------------------------------------------------------
// Pure helper functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Split chapter text into paragraphs by double newlines.
 * Handles both LF and CRLF line endings. Empty segments are filtered out.
 */
export function splitIntoParagraphs(text: string): string[] {
  if (!text) return [];
  // Normalize CRLF to LF
  const normalized = text.replace(/\r\n/g, "\n");
  // Split by 2+ consecutive newlines
  return normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Locate a paragraph index (0-based) from a location string.
 *
 * Tries two strategies in order:
 * 1. Extract a number from the location string and use it as a 1-based paragraph index.
 *    Supports formats like "paragraph 2", "para 1", "3", "第2段", "段落3".
 * 2. Search for the location string as a text snippet within each paragraph.
 *
 * Returns -1 if no paragraph can be located.
 */
export function locateParagraph(paragraphs: string[], location: string): number {
  if (!location || paragraphs.length === 0) return -1;

  // Strategy 1: Extract a number and use as 1-based index.
  // Use the LAST number in the string to avoid ambiguity: e.g.
  // "section 2, paragraph 3" should target paragraph 3, not 2.
  const matches = location.match(/(\d+)/g);
  if (matches) {
    const num = parseInt(matches[matches.length - 1]!, 10);
    const index = num - 1; // Convert to 0-based
    if (index >= 0 && index < paragraphs.length) {
      return index;
    }
  }

  // Strategy 2: Text snippet match
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i]!.includes(location)) {
      return i;
    }
  }

  return -1;
}

// ---------------------------------------------------------------------------
// Concurrency-limited mapping (prevents parallel retry storms)
// ---------------------------------------------------------------------------

/** Max number of paragraphs revised in parallel. Bounds concurrent LLM
 *  requests (and concurrent retries) so an N-paragraph chapter never fires
 *  N requests at once. */
const PARAGRAPH_REVISION_CONCURRENCY = 3;

/** A successfully revised paragraph entry produced by the parallel mapper. */
interface RevisionEntry {
  paraIndex: number;
  originalText: string;
  revisedText: string;
  location: string;
}

/**
 * Map over an array with a bounded number of in-flight tasks.
 *
 * At most `concurrency` tasks run at once; the rest queue. Results are
 * returned in input order, like `Promise.all`, but the parallelism is
 * capped. Used by the polisher so that revising N paragraphs in parallel
 * does not fire N concurrent LLM requests (and N concurrent retries when
 * several paragraphs fail simultaneously).
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]!);
    }
  }
  // Spawn at most `concurrency` (and no more than items.length) workers.
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => run()));
  return results;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Factory: build an Polisher by composing a shared runtime.
 * Replaces the former `class Polisher extends BaseAgent`.
 *
 * Paragraph-level revision: when SentinelIssue has scope="paragraph" and a
 * locatable `location`, only that paragraph is sent to the LLM for rewriting.
 * Issues with scope="global" or unlocatable locations fall back to full-text
 * revision. This preserves the author's style in unaffected paragraphs.
 */
export function createPolisher(ctx: AgentContext): Polisher {
  const runtime = createAgentRuntime(ctx);
  const name = "polisher";

  /**
   * Revise a single paragraph by sending only that paragraph + its issues.
   */
  async function reviseParagraph(
    paragraphText: string,
    issues: SentinelIssue[],
    options?: AgentChatOptions,
  ): Promise<{ content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const systemContent =
      "You are a revision editor. Your task is to fix the identified issues in the paragraph " +
      "while preserving the story's core narrative, style, and voice. " +
      "Address each issue carefully and output only the revised paragraph.";

    const issuesList = issues
      .map(
        (issue, i) =>
          `${i + 1}. [${issue.severity}] ${issue.dimension}: ${issue.message} ` +
          `(location: ${issue.location}, repairScope: ${issue.repairScope})`,
      )
      .join("\n");

    const userContent =
      `## Paragraph to Revise\n\n${paragraphText}\n\n` +
      `## Issues to Fix\n\n${issuesList}\n\n` +
      `Please revise the paragraph to address all the listed issues. Output only the revised paragraph.`;

    const messages: LLMMessage[] = [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ];

    const response = await runtime.chat(messages, options);
    return { content: response.content, usage: response.usage };
  }

  /**
   * Revise the full chapter text (fallback for global issues).
   */
  async function reviseFullText(
    content: string,
    issues: SentinelIssue[],
    options?: AgentChatOptions,
  ): Promise<{ content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const systemContent =
      "You are a revision editor. Your task is to fix the identified issues in the chapter content " +
      "while preserving the story's core narrative, style, and voice. " +
      "Address each issue carefully and output only the revised chapter content.";

    const issuesList = issues
      .map(
        (issue, i) =>
          `${i + 1}. [${issue.severity}] ${issue.dimension}: ${issue.message} ` +
          `(location: ${issue.location}, repairScope: ${issue.repairScope})`,
      )
      .join("\n");

    const userContent =
      `## Chapter Content\n\n${content}\n\n` +
      `## Issues to Fix\n\n${issuesList}\n\n` +
      `Please revise the chapter content to address all the listed issues. Output only the revised content.`;

    const messages: LLMMessage[] = [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ];

    const response = await runtime.chat(messages, options);
    return { content: response.content, usage: response.usage };
  }

  async function revise(input: {
    chapterContent: string;
    auditIssues: SentinelIssue[];
  }, options?: AgentChatOptions): Promise<PolisherOutput> {
    // No issues → return original content unchanged
    if (input.auditIssues.length === 0) {
      return {
        revisedContent: input.chapterContent,
        appliedFixes: [],
        revisedParagraphs: [],
      };
    }

    const paragraphs = splitIntoParagraphs(input.chapterContent);
    const revisedParagraphs: PolishedParagraph[] = [];

    // Classify issues: paragraph-level (locatable) vs global (fallback)
    // Only scope="paragraph" issues attempt paragraph-level revision.
    // scope="global" and scope="chapter" both use full-text revision.
    const paragraphIssues = new Map<number, SentinelIssue[]>();
    const globalIssues: SentinelIssue[] = [];

    for (const issue of input.auditIssues) {
      if (issue.scope === "paragraph") {
        const paraIndex = locateParagraph(paragraphs, issue.location);
        if (paraIndex >= 0) {
          const existing = paragraphIssues.get(paraIndex);
          if (existing) {
            existing.push(issue);
          } else {
            paragraphIssues.set(paraIndex, [issue]);
          }
        } else {
          // Cannot locate paragraph → treat as global
          globalIssues.push(issue);
        }
      } else {
        // scope is "global" or "chapter" → full-text revision
        globalIssues.push(issue);
      }
    }

    // Step 1: Revise paragraphs with issues (preserve unmodified paragraphs)
    const revisedParagraphTexts = [...paragraphs];

    // Accumulate token usage from all LLM calls (paragraph + full-text revisions).
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTotalTokens = 0;
    let hasUsage = false;

    // Revise paragraphs with bounded concurrency. The LLM client already
    // retries transient failures serially (withTransientRetry), so each
    // paragraph's retries are serial; capping the parallelism here prevents
    // an N×retry request storm when many paragraphs fail at once. A single
    // paragraph that still fails after its client-level retries only keeps
    // its original text — the remaining paragraphs are still revised.
    const paragraphEntries = Array.from(paragraphIssues.entries());
    const revisedResults = await mapWithConcurrency(
      paragraphEntries,
      PARAGRAPH_REVISION_CONCURRENCY,
      async ([paraIndex, issues]): Promise<RevisionEntry | null> => {
        const originalText = paragraphs[paraIndex]!;
        try {
          const { content: revisedText, usage: paraUsage } = await reviseParagraph(originalText, issues, options);
          if (paraUsage) {
            hasUsage = true;
            totalPromptTokens += paraUsage.promptTokens;
            totalCompletionTokens += paraUsage.completionTokens;
            totalTotalTokens += paraUsage.totalTokens;
          }
          return { paraIndex, originalText, revisedText, location: issues[0]!.location };
        } catch (err) {
          // Only this paragraph failed (after its serial client retries) —
          // keep its original text and let the other paragraphs proceed.
          console.warn(
            `[polisher] Paragraph ${paraIndex + 1} revision failed — ` +
            `${toErrorMessage(err)}. Keeping original text.`,
          );
          return null;
        }
      },
    );

    // Sort successful revisions by paraIndex to preserve original paragraph order
    const successful = revisedResults
      .filter((r): r is RevisionEntry => r !== null)
      .sort((a, b) => a.paraIndex - b.paraIndex);
    for (const { paraIndex, originalText, revisedText, location } of successful) {
      revisedParagraphTexts[paraIndex] = revisedText;
      revisedParagraphs.push({ location, originalText, revisedText });
    }

    // Splice revised paragraphs back into full content
    let content = revisedParagraphTexts.join("\n\n");

    // Step 2: If global issues exist, do full-text revision on the spliced content
    if (globalIssues.length > 0) {
      const { content: fullRevised, usage: fullUsage } = await reviseFullText(content, globalIssues, options);
      if (fullUsage) {
        hasUsage = true;
        totalPromptTokens += fullUsage.promptTokens;
        totalCompletionTokens += fullUsage.completionTokens;
        totalTotalTokens += fullUsage.totalTokens;
      }
      content = fullRevised;
    }

    return {
      revisedContent: content,
      appliedFixes: input.auditIssues.map((i) => i.message),
      revisedParagraphs,
      usage: hasUsage
        ? { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens, totalTokens: totalTotalTokens }
        : undefined,
    };
  }

  return { name, revise };
}
