// packages/cli/src/commands/audit.ts
// `tavernos audit <chapter>` — run consistency audit on an existing chapter.
import { createConsistencyChecker, } from "@tavernos/core";
import { resolveCliContext, resolveBookId, loadBookConfig, loadChapter, saveChapter, info, success, error, } from "../context.js";
import { buildStoryContext } from "./pipeline-helpers.js";
export function registerAuditCommand(program) {
    program
        .command("audit <chapter>")
        .description("对已存在的章节进行一致性审核")
        .option("-b, --book <id>", "书籍 ID")
        .action(async (chapterStr, opts) => {
        await runAudit(chapterStr, opts);
    });
}
// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------
async function runAudit(chapterStr, opts) {
    const ctx = await resolveCliContext();
    const bookId = await resolveBookId(ctx, opts.book);
    const bookConfig = await loadBookConfig(ctx.projectRoot, bookId);
    const chapterNum = parseInt(chapterStr, 10);
    if (isNaN(chapterNum) || chapterNum < 1) {
        error(`无效的章节号: ${chapterStr}`);
        process.exit(1);
    }
    const chapter = await loadChapter(ctx.projectRoot, bookId, chapterNum);
    if (!chapter) {
        error(`章节不存在: 第 ${chapterNum} 章`);
        process.exit(1);
    }
    info(`书籍: ${bookConfig.title}`);
    info(`章节: 第 ${chapterNum} 章`);
    info(`字数: ${chapter.wordCount.toLocaleString()}`);
    info("");
    // Build story context (excluding the current chapter from summaries)
    const storyCtx = await buildStoryContext(ctx.projectRoot, bookId, bookConfig);
    const agentCtx = {
        client: ctx.client,
        model: ctx.model,
        projectRoot: ctx.projectRoot,
        bookId,
    };
    const auditor = createConsistencyChecker(agentCtx);
    info("正在审核...");
    try {
        const issues = await auditor.audit({
            storyBible: storyCtx.storyBible,
            currentState: storyCtx.currentState,
            activeHooks: storyCtx.activeHooks,
            chapterSummaries: storyCtx.recentChapterSummaries,
            chapterContent: chapter.body,
        });
        if (issues.length === 0) {
            success("审核通过，未发现问题。");
            // Update chapter status
            chapter.status = "audit-passed";
            chapter.auditIssues = [];
            chapter.updatedAt = new Date().toISOString();
            await saveChapter(ctx.projectRoot, bookId, chapter);
        }
        else {
            const errors = issues.filter((i) => i.severity === "error");
            const warnings = issues.filter((i) => i.severity === "warning");
            const infos = issues.filter((i) => i.severity === "info");
            info(`审核完成: ${errors.length} 错误, ${warnings.length} 警告, ${infos.length} 提示`);
            info("");
            for (const issue of issues) {
                const icon = issue.severity === "error" ? "!" : issue.severity === "warning" ? "?" : "i";
                info(`  [${icon}] (${issue.scope}) ${issue.dimension}`);
                info(`      ${issue.message}`);
                info(`      位置: ${issue.location} | 修复范围: ${issue.repairScope}`);
                info("");
            }
            // Update chapter status and audit issues
            chapter.status = errors.length > 0 ? "audit-failed" : "audit-passed";
            chapter.auditIssues = issues.map((i) => i.message);
            chapter.updatedAt = new Date().toISOString();
            await saveChapter(ctx.projectRoot, bookId, chapter);
            if (errors.length > 0) {
                info(`发现 ${errors.length} 个错误。运行 \`tavernos revise ${chapterNum}\` 自动修订。`);
            }
        }
    }
    catch (e) {
        error(`审核失败: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
    }
}
//# sourceMappingURL=audit.js.map