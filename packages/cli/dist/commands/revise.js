// packages/cli/src/commands/revise.ts
// `tavernos revise <chapter>` — run the editor agent to fix audit issues.
import { createEditorAgent, } from "@tavernos/core";
import { resolveCliContext, resolveBookId, loadBookConfig, loadChapter, saveChapter, info, success, error, } from "../context.js";
import { countWords } from "./pipeline-helpers.js";
export function registerReviseCommand(program) {
    program
        .command("revise <chapter>")
        .description("对已审核的章节进行自动修订")
        .option("-b, --book <id>", "书籍 ID")
        .action(async (chapterStr, opts) => {
        await runRevise(chapterStr, opts);
    });
}
// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------
async function runRevise(chapterStr, opts) {
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
    if ((chapter.auditIssues ?? []).length === 0) {
        info(`第 ${chapterNum} 章没有审核问题，无需修订。`);
        info("先运行 `tavernos audit " + chapterNum + "` 进行审核。");
        return;
    }
    info(`书籍: ${bookConfig.title}`);
    info(`章节: 第 ${chapterNum} 章`);
    info(`待修复问题: ${(chapter.auditIssues ?? []).length} 个`);
    info("");
    const agentCtx = {
        client: ctx.client,
        model: ctx.model,
        projectRoot: ctx.projectRoot,
        bookId,
    };
    const reviser = createEditorAgent(agentCtx);
    // Build audit issue objects from stored messages (reconstruct minimal shape)
    const auditIssues = chapter.auditIssues.map((msg) => ({
        severity: "error",
        scope: "chapter",
        dimension: "general",
        message: msg,
        repairScope: "local",
        location: `第${chapterNum}章`,
    }));
    info("正在修订...");
    try {
        const result = await reviser.revise({
            chapterContent: chapter.body,
            auditIssues,
        });
        const wordCount = countWords(result.revisedContent);
        // Update chapter with revised content
        chapter.body = result.revisedContent;
        chapter.wordCount = wordCount;
        chapter.status = "revising";
        chapter.auditIssues = [];
        chapter.updatedAt = new Date().toISOString();
        await saveChapter(ctx.projectRoot, bookId, chapter);
        success(`第 ${chapterNum} 章已修订 (${wordCount.toLocaleString()} 字)`);
        info("");
        info("已应用的修复:");
        for (const fix of result.appliedFixes) {
            info(`  - ${fix}`);
        }
    }
    catch (e) {
        error(`修订失败: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
    }
}
//# sourceMappingURL=revise.js.map