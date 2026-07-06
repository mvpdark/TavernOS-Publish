// packages/cli/src/commands/export.ts
// `tavernos export` — export book chapters to markdown, text, or JSON.

import type { Command } from "commander";
import { join } from "node:path";
import {
  type Chapter,
} from "@tavernos/core";
import {
  resolveCliContext,
  resolveBookId,
  loadBookConfig,
  listChapters,
  loadChapter,
  writeText,
  info,
  success,
  error,
  EXPORTS_DIR,
} from "../context.js";

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

interface ExportOptions {
  book?: string;
  format?: string;
  output?: string;
  range?: string;
}

export function registerExportCommand(program: Command): void {
  program
    .command("export")
    .description("导出书籍章节")
    .option("-b, --book <id>", "书籍 ID")
    .option("-f, --format <fmt>", "导出格式 (markdown, txt, json)", "markdown")
    .option("-o, --output <path>", "输出文件路径")
    .option("-r, --range <range>", "章节范围 (如 1-10 或 1,3,5)")
    .action(async (opts: ExportOptions) => {
      await runExport(opts);
    });
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

async function runExport(opts: ExportOptions): Promise<void> {
  const ctx = await resolveCliContext();
  const bookId = await resolveBookId(ctx, opts.book);
  const bookConfig = await loadBookConfig(ctx.projectRoot, bookId);

  const format = opts.format ?? "markdown";
  if (!["markdown", "txt", "json"].includes(format)) {
    // NOTE: EPUB export is available in the Studio web UI but not in the CLI.
    // The CLI supports markdown, txt, and json only (no EPUB dependency here).
    error(`不支持的格式: ${format} (可选: markdown, txt, json)`);
    process.exit(1);
  }

  // Load all chapters
  const chapterList = await listChapters(ctx.projectRoot, bookId);
  if (chapterList.length === 0) {
    error("暂无章节可导出。");
    process.exit(1);
  }

  // Parse chapter range filter. If the user passed --range but it is invalid,
  // fail loudly instead of silently exporting everything.
  const filter = parseRangeFilter(opts.range);
  if (opts.range && filter === null) {
    error(`无效的章节范围: ${opts.range}`);
    process.exit(1);
  }
  const targetNumbers = filter
    ? chapterList.map((c) => c.number).filter(filter)
    : chapterList.map((c) => c.number);

  if (targetNumbers.length === 0) {
    error("指定的范围内没有章节。");
    process.exit(1);
  }

  // Load full chapter data
  const chapters: Chapter[] = [];
  for (const num of targetNumbers) {
    const ch = await loadChapter(ctx.projectRoot, bookId, num);
    if (ch) chapters.push(ch);
  }

  info(`书籍: ${bookConfig.title}`);
  info(`章节: ${chapters.length} 章`);
  info(`格式: ${format}`);
  info("");

  // Determine output path.
  // NOTE: --output is resolved relative to the project root (not the current
  // working directory) for consistency with other CLI commands. A bare filename
  // lands in <projectRoot>/<output>; a path with separators is joined to root.
  const ext = format === "markdown" ? "md" : format === "txt" ? "txt" : "json";
  const defaultFileName = `${bookId}.${ext}`;
  const outputPath = opts.output
    ? join(ctx.projectRoot, opts.output)
    : join(ctx.projectRoot, EXPORTS_DIR, defaultFileName);

  // Generate output content
  let content: string;
  if (format === "json") {
    content = JSON.stringify({
      book: bookConfig,
      chapters: chapters.map((c) => ({
        number: c.number,
        title: c.title,
        status: c.status,
        wordCount: c.wordCount,
        body: c.body,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    }, null, 2);
  } else if (format === "txt") {
    const parts: string[] = [
      bookConfig.title,
      "=".repeat(bookConfig.title.length * 2),
      "",
    ];
    for (const ch of chapters) {
      parts.push(`${ch.title}`, "", ch.body, "", "---", "");
    }
    content = parts.join("\n");
  } else {
    // markdown
    const parts: string[] = [
      `# ${bookConfig.title}`,
      "",
      `> 类型: ${bookConfig.genre} | 平台: ${bookConfig.platform} | 状态: ${bookConfig.status}`,
      `> 共 ${chapters.length} 章 | ${chapters.reduce((s, c) => s + c.wordCount, 0).toLocaleString()} 字`,
      "",
      "---",
      "",
    ];
    for (const ch of chapters) {
      parts.push(`## ${ch.title}`, "", ch.body, "", "---", "");
    }
    content = parts.join("\n");
  }

  await writeText(outputPath, content);

  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);
  success(`已导出: ${outputPath}`);
  info(`  章节: ${chapters.length} 章`);
  info(`  字数: ${totalWords.toLocaleString()}`);
  info(`  大小: ${(Buffer.byteLength(content) / 1024).toFixed(1)} KB`);
}

// ---------------------------------------------------------------------------
// Range filter parsing
// ---------------------------------------------------------------------------

/**
 * Parse a range string into a filter function. Supports:
 *   - single number:        "5"
 *   - inclusive range:      "1-10"
 *   - comma-separated mix:  "1-3,5,8-10"
 * Returns null when the input is present but invalid (so the caller can fail
 * loudly instead of silently exporting everything).
 */
function parseRangeFilter(range?: string): ((n: number) => boolean) | null {
  if (!range) return null;

  const allowed = new Set<number>();
  // Split by comma first; each part is either "N" (single) or "N-M" (range).
  const parts = range.split(",").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const lo = parseInt(rangeMatch[1]!, 10);
      const hi = parseInt(rangeMatch[2]!, 10);
      // Normalize reversed ranges (e.g. "10-3") to avoid empty loops.
      const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
      for (let n = a; n <= b; n++) allowed.add(n);
      continue;
    }
    const single = parseInt(part, 10);
    if (!Number.isNaN(single)) {
      allowed.add(single);
      continue;
    }
    // Invalid token — the whole range string is invalid.
    return null;
  }

  if (allowed.size === 0) return null;
  return (n: number) => allowed.has(n);
}
