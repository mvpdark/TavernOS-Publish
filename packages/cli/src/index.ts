#!/usr/bin/env node

// packages/cli/src/index.ts
// TavernOS CLI entry point — registers all commands and parses argv.

import { Command } from "commander";
import { registerInitCommand } from "./commands/init.js";
import { registerBookCommand } from "./commands/book.js";
import { registerWriteCommand, registerDraftCommand } from "./commands/write.js";
import { registerAuditCommand } from "./commands/audit.js";
import { registerReviseCommand } from "./commands/revise.js";
import { registerExportCommand } from "./commands/export.js";

const program = new Command();

program
  .name("tavernos")
  .description("AI 辅助创意写作平台 — 从项目初始化到章节生成、审核、修订、导出")
  .version("0.1.0");

// Register all commands
registerInitCommand(program);
registerBookCommand(program);
registerWriteCommand(program);
registerDraftCommand(program);
registerAuditCommand(program);
registerReviseCommand(program);
registerExportCommand(program);

// Top-level error handler: catch errors from async actions
program.parseAsync(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`\u2717 ${msg}\n`);
  process.exit(1);
});
