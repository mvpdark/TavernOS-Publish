// packages/cli/src/commands/write.ts
// `tavernos write` — generate the next chapter using the full multi-agent pipeline.
// `tavernos draft` — generate a draft chapter (writer only, no audit/revise).
import { join } from "node:path";
import { StoryOrchestrator, applyAndPersistDelta, AssetCatalogManager, emptyCatalog, } from "@tavernos/core";
import { resolveCliContext, resolveBookId, loadBookConfig, saveChapter, nextChapterNumber, info, success, error, readJson, writeJson, ensureDir, } from "../context.js";
import { bookDir } from "../paths.js";
import { buildStoryContext, buildWriterInput, countWords } from "./pipeline-helpers.js";
export function registerWriteCommand(program) {
    program
        .command("write")
        .description("生成下一章（完整流水线：架构 → 写作 → 审核 → 修订）")
        .option("-b, --book <id>", "书籍 ID")
        .option("-o, --outline <text>", "本章大纲/写作意图")
        .option("--no-architect", "跳过架构阶段")
        .option("--audit <mode>", "审核模式 (auto, manual, off)", "auto")
        .action(async (opts) => {
        await runWrite(opts, /* isDraft */ false);
    });
}
export function registerDraftCommand(program) {
    program
        .command("draft")
        .description("生成草稿（仅写作，无审核）")
        .option("-b, --book <id>", "书籍 ID")
        .option("-o, --outline <text>", "本章大纲/写作意图")
        .action(async (opts) => {
        await runWrite(opts, /* isDraft */ true);
    });
}
// ---------------------------------------------------------------------------
// Shared implementation
// ---------------------------------------------------------------------------
async function runWrite(opts, isDraft) {
    const ctx = await resolveCliContext();
    const bookId = await resolveBookId(ctx, opts.book);
    const bookConfig = await loadBookConfig(ctx.projectRoot, bookId);
    const chapterNum = await nextChapterNumber(ctx.projectRoot, bookId);
    info(`书籍: ${bookConfig.title}`);
    info(`章节: 第 ${chapterNum} 章`);
    info(`模式: ${isDraft ? "草稿（无审核）" : "完整流水线"}`);
    info("");
    // Build story context from existing chapters
    const storyCtx = await buildStoryContext(ctx.projectRoot, bookId, bookConfig);
    // Determine audit mode
    const auditMode = isDraft
        ? "off"
        : opts.auditMode ?? "auto";
    // Determine whether to run architect (first chapter or explicit flag)
    const runArchitect = !isDraft && (opts.architect !== false) && chapterNum === 1;
    // Build writer input
    const writerInput = buildWriterInput(chapterNum, storyCtx, opts.outline);
    // Build agent context
    const agentCtx = {
        client: ctx.client,
        model: ctx.model,
        projectRoot: ctx.projectRoot,
        bookId,
    };
    // Resolve model overrides from project config
    const modelOverrides = ctx.config.modelOverrides
        ? Object.fromEntries(Object.entries(ctx.config.modelOverrides).map(([k, v]) => [
            k,
            typeof v === "string" ? v : v.model,
        ]))
        : undefined;
    // StoryOrchestrator signature: (ctx, resolveContext?, modelOverrides?).
    // Pass undefined for the per-agent resolver (CLI uses the shared client) and
    // supply modelOverrides as the 3rd arg (legacy model-only override path).
    const orchestrator = new StoryOrchestrator(agentCtx, undefined, modelOverrides);
    // The CLI stores per-book truth files (story-state.json, asset-catalog.json)
    // inside the book directory, mirroring the Studio server's per-project layout.
    const bookRoot = bookDir(ctx.projectRoot, bookId);
    await ensureDir(bookRoot);
    // Load existing asset catalog so the extractor can track recurring assets
    // across chapters and the system can merge rather than duplicate entries.
    const catalogPath = join(bookRoot, "asset-catalog.json");
    let existingAssetCatalog = emptyCatalog();
    try {
        const existingRaw = await readJson(catalogPath);
        if (existingRaw) {
            existingAssetCatalog = AssetCatalogManager.parseCatalog(JSON.stringify(existingRaw));
        }
    }
    catch {
        /* catalog may not exist yet — start from empty */
    }
    info("正在生成章节...");
    info("");
    try {
        const result = await orchestrator.runChapter({
            architectInput: runArchitect
                ? {
                    title: bookConfig.title,
                    genre: bookConfig.genre,
                    language: bookConfig.language,
                }
                : undefined,
            writerInput,
            auditMode,
            storyContext: auditMode !== "off" ? {
                storyBible: storyCtx.storyBible,
                currentState: storyCtx.currentState,
                activeHooks: storyCtx.activeHooks,
                chapterSummaries: storyCtx.recentChapterSummaries,
            } : undefined,
            existingAssetCatalog,
        });
        info(""); // newline after streaming output
        // Determine final narrative (revised if available)
        const narrative = result.revisedNarrative ?? result.narrative;
        // Build chapter metadata
        const now = new Date().toISOString();
        const wordCount = countWords(narrative);
        // Determine chapter status: degraded takes priority over audit results
        let status;
        if (result.degraded) {
            status = "state-degraded";
        }
        else if (isDraft) {
            status = "drafted";
        }
        else {
            status = result.auditIssues && result.auditIssues.length === 0 ? "audit-passed" : "drafted";
        }
        const chapter = {
            number: chapterNum,
            title: `第${chapterNum}章`,
            status,
            bookId,
            body: narrative,
            intent: opts.outline,
            wordCount,
            createdAt: now,
            updatedAt: now,
            auditIssues: result.auditIssues?.map((i) => i.message) ?? [],
            lengthWarnings: [],
        };
        await saveChapter(ctx.projectRoot, bookId, chapter);
        // --- Persist story-state delta (applyAndPersistDelta) ---
        // This mirrors the Studio server path (create-helpers.ts): when the
        // ChapterAnalyzer produced a valid (non-degraded) delta, apply it to
        // the book's truth files so subsequent chapters see accumulated state.
        if (!result.degraded && result.delta) {
            try {
                const persistResult = await applyAndPersistDelta({
                    projectRoot: bookRoot,
                    delta: result.delta,
                });
                if (!persistResult.applied) {
                    info("  状态增量未应用（可能是章节回退）。");
                }
            }
            catch (e) {
                info(`  状态持久化失败: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        // --- Persist asset catalog (merge + write) ---
        if (result.assetCatalog && !result.degraded) {
            try {
                const mergedCatalog = AssetCatalogManager.mergeCatalog(existingAssetCatalog, {
                    catalog: result.assetCatalog,
                    rawResponse: "",
                    degraded: false,
                });
                await writeJson(catalogPath, JSON.parse(AssetCatalogManager.serializeCatalog(mergedCatalog)));
            }
            catch (e) {
                info(`  资产目录持久化失败: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        success(`第 ${chapterNum} 章已保存 (${wordCount.toLocaleString()} 字)`);
        if (result.degraded) {
            info("");
            info("⚠ 状态提取降级：LLM 响应无法解析，未合并故事状态增量。");
            info("  章节正文已保存，请手动检查或重新生成状态。");
        }
        if (result.auditIssues && result.auditIssues.length > 0) {
            info("");
            info(`审核发现 ${result.auditIssues.length} 个问题:`);
            for (const issue of result.auditIssues) {
                const icon = issue.severity === "error" ? "!" : issue.severity === "warning" ? "?" : "i";
                info(`  [${icon}] ${issue.dimension}: ${issue.message}`);
            }
            if (result.revisedNarrative) {
                info("");
                success("已自动修订。");
            }
        }
        if (result.architecture) {
            info("");
            info("架构生成:");
            info(`  前提: ${result.architecture.premise.slice(0, 60)}...`);
            info(`  世界: ${result.architecture.world.slice(0, 60)}...`);
            info(`  角色: ${result.architecture.characters.slice(0, 60)}...`);
        }
    }
    catch (e) {
        info("");
        error(`生成失败: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
    }
}
//# sourceMappingURL=write.js.map