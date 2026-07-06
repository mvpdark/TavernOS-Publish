// packages/cli/src/commands/book.ts
// `tavernos book <subcommand>` — manage books within a project.

import type { Command } from "commander";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import {
  type BookConfig,
} from "@tavernos/core";
import {
  resolveCliContext,
  resolveBookId,
  listBookIds,
  loadBookMeta,
  saveBookConfig,
  bookDir,
  ensureDir,
  info,
  success,
  CHAPTERS_DIR,
  STORY_DIR,
} from "../context.js";

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerBookCommand(program: Command): void {
  const book = program.command("book").description("管理书籍");

  book
    .command("create <title>")
    .description("创建一本新书")
    .option("-g, --genre <genre>", "类型/流派", "都市")
    .option("-p, --platform <platform>", "发布平台 (tomato, feilu, qidian, other)", "other")
    .option("--target-chapters <n>", "目标章节数", "200")
    .option("--chapter-words <n>", "每章字数目标", "3000")
    .option("--language <lang>", "写作语言 (zh, en)")
    .action(async (title: string, opts: BookCreateOptions) => {
      await runBookCreate(title, opts);
    });

  book
    .command("list")
    .description("列出所有书籍")
    .action(async () => {
      await runBookList();
    });

  book
    .command("info [bookId]")
    .description("显示书籍详情")
    .action(async (bookId?: string) => {
      await runBookInfo(bookId);
    });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookCreateOptions {
  genre?: string;
  platform?: string;
  targetChapters?: string;
  chapterWords?: string;
  language?: string;
}

// ---------------------------------------------------------------------------
// book create
// ---------------------------------------------------------------------------

async function runBookCreate(title: string, opts: BookCreateOptions): Promise<void> {
  const ctx = await resolveCliContext();

  // Generate a short book id from the title (slugify + short uuid suffix)
  const slug = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20) || "book";
  const bookId = `${slug}-${randomUUID().slice(0, 8)}`;

  const now = new Date().toISOString();

  const config: BookConfig = {
    id: bookId,
    title,
    platform: (opts.platform as BookConfig["platform"]) ?? "other",
    genre: opts.genre ?? "都市",
    status: "incubating",
    targetChapters: parseInt(opts.targetChapters ?? "200", 10),
    chapterWordCount: parseInt(opts.chapterWords ?? "2000", 10),
    language: (opts.language as "zh" | "en" | undefined) ?? ctx.config.language,
    createdAt: now,
    updatedAt: now,
    writing: { reviewMode: "auto", reviewRetries: 1 },
  };

  // Create book directory structure
  const dir = bookDir(ctx.projectRoot, bookId);
  await ensureDir(dir);
  await ensureDir(join(dir, CHAPTERS_DIR));
  await ensureDir(join(dir, STORY_DIR));

  await saveBookConfig(ctx.projectRoot, bookId, config);

  success(`书籍已创建: ${title}`);
  info(`  ID: ${bookId}`);
  info(`  类型: ${config.genre}`);
  info(`  平台: ${config.platform}`);
  info(`  目标章节: ${config.targetChapters} 章 × ${config.chapterWordCount} 字`);
  info("");
  info("下一步:");
  info("  tavernos write          — 生成第一章");
  info("  tavernos draft           — 仅生成草稿（无审核）");
}

// ---------------------------------------------------------------------------
// book list
// ---------------------------------------------------------------------------

async function runBookList(): Promise<void> {
  const ctx = await resolveCliContext();
  const ids = await listBookIds(ctx.projectRoot);

  if (ids.length === 0) {
    info("暂无书籍。运行 `tavernos book create <标题>` 创建一本。");
    return;
  }

  info(`共 ${ids.length} 本书:`);
  info("");

  for (const id of ids) {
    const meta = await loadBookMeta(ctx.projectRoot, id);
    info(`  ${meta.config.title}`);
    info(`    ID:     ${id}`);
    info(`    状态:   ${meta.config.status}`);
    info(`    章节:   ${meta.chapterCount} / ${meta.config.targetChapters}`);
    info(`    字数:   ${meta.totalWords.toLocaleString()}`);
    info("");
  }
}

// ---------------------------------------------------------------------------
// book info
// ---------------------------------------------------------------------------

async function runBookInfo(bookId?: string): Promise<void> {
  const ctx = await resolveCliContext();
  const id = await resolveBookId(ctx, bookId);
  const meta = await loadBookMeta(ctx.projectRoot, id);

  info(`标题:   ${meta.config.title}`);
  info(`ID:     ${id}`);
  info(`状态:   ${meta.config.status}`);
  info(`类型:   ${meta.config.genre}`);
  info(`平台:   ${meta.config.platform}`);
  info(`章节:   ${meta.chapterCount} / ${meta.config.targetChapters}`);
  info(`字数:   ${meta.totalWords.toLocaleString()}`);
  info(`每章:   ${meta.config.chapterWordCount} 字`);
  info(`语言:   ${meta.config.language}`);
  info(`创建:   ${meta.config.createdAt}`);
  info(`更新:   ${meta.config.updatedAt}`);
  if (meta.config.fanficMode) {
    info(`同人:   ${meta.config.fanficMode}`);
  }
  if (meta.tags.length > 0) {
    info(`标签:   ${meta.tags.join(", ")}`);
  }
}
