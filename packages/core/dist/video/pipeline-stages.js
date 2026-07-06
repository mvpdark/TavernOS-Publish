// Named pipeline stages — each stage is a discrete, composable agent.
//
// The VideoPipeline V2.1 had a monolithic processClip() method (~200 lines)
// that interleaved generation, download, frame-check, review, reroll, AutoCut,
// and composition. This module breaks that into 9 named stages, each with:
//   - A clear interface (input → output)
//   - Independent error handling
//   - Observable progress reporting
//   - Composability (stages can be swapped, reordered, or skipped)
//
// Stage list:
//   1. GenerationStage   — calls video API to generate a clip
//   2. DownloadStage     — downloads remote URL to local file
//   3. FrameCheckStage   — SSIM auto-trim of bad frames
//   4. ReviewStage       — 9-dimension LLM review
//   5. RerollStage       — prompt patching for next attempt
//   6. AutoCutStage      — smart editing plan generation
//   7. ComposeStage      — FFmpeg composition
//   7.5. LipSyncStage    — post-generation lip synchronization (optional)
//   8. OrchestrateStage  — coordinates the above per-clip loop
//
// Usage:
//   const stages = createDefaultStages(client, reviewer, composer, callbacks);
//   const result = await stages.orchestrate.run(input);
import { FrameQualityChecker } from "./frame-quality.js";
import { VideoDownloader } from "./video-downloader.js";
import { generateAutoCutPlan, autocutPlanToEDL } from "./autocut.js";
import { DEFAULT_REVIEW_CONFIG } from "./pipeline-types.js";
import { enhancePromptWithTemplate } from "./prompt-template-enhancer.js";
import { CharacterConsistencyChecker, StubFaceEmbeddingProvider } from "./character-consistency.js";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
export class GenerationStage {
    client;
    constructor(client) {
        this.client = client;
    }
    async run(input, ctx) {
        const request = {
            prompt: input.prompt,
            referenceImageUrls: ctx.referenceImages.length > 0 ? ctx.referenceImages : undefined,
            referenceImageUrl: ctx.referenceImages.length === 1 ? ctx.referenceImages[0] : undefined,
            duration: input.clip.generateConfig.duration,
            model: input.clip.generateConfig.model,
        };
        try {
            const response = await this.client.generate(request);
            return {
                success: true,
                data: {
                    videoUrl: response.videoUrl,
                    thumbnailUrl: response.thumbnailUrl,
                },
            };
        }
        catch (e) {
            return { success: false, error: `生成失败 (attempt ${input.attempt}): ${e.message}` };
        }
    }
}
export class DownloadStage {
    downloader;
    constructor(downloader) {
        this.downloader = downloader;
    }
    async run(input) {
        try {
            const result = await this.downloader.downloadIfNeeded(input.videoUrl, input.clip.localPath, input.clip.id);
            return {
                success: true,
                data: result.success ? { localPath: result.localPath } : {},
            };
        }
        catch {
            // Best-effort — fall back to remote URL
            return { success: true, data: {}, skipped: true };
        }
    }
}
export class FrameCheckStage {
    checker;
    constructor(checker) {
        this.checker = checker;
    }
    async run(input, ctx) {
        try {
            const trimResult = await this.checker.autoTrim(input.videoSource);
            if (trimResult.success && trimResult.badFrameCount > 0) {
                ctx.callbacks.onComposeProgress?.(`片段${input.clip.clipNumber}: 自动裁剪${trimResult.badFrameCount}个坏帧 ` +
                    `(首${trimResult.trimStart.toFixed(1)}s` +
                    (trimResult.trimEnd != null
                        ? `尾裁${trimResult.trimEnd.toFixed(1)}s`
                        : "") +
                    ")");
                return {
                    success: true,
                    data: {
                        trimStart: trimResult.trimStart,
                        trimEnd: trimResult.trimEnd,
                        badFrameCount: trimResult.badFrameCount,
                    },
                };
            }
            return { success: true, data: { badFrameCount: 0 } };
        }
        catch {
            // Best-effort — skip frame check on error
            return { success: true, data: { badFrameCount: 0 }, skipped: true };
        }
    }
}
export class ReviewStage {
    reviewer;
    constructor(reviewer) {
        this.reviewer = reviewer;
    }
    async run(input, ctx) {
        // When no reviewer is configured (e.g. LLM settings missing), skip
        // review and treat the clip as passed so the pipeline can continue.
        if (!this.reviewer) {
            const skipped = {
                verdict: "pass",
                score: 100,
                grade: "A",
                issues: [],
                summary: "Review skipped (no reviewer configured)",
            };
            return { success: true, data: skipped };
        }
        try {
            const review = await this.reviewer.review({
                videoClip: input.clip,
                scriptContext: ctx.chapterScript,
                referenceImages: ctx.referenceImages,
            });
            ctx.callbacks.onClipReviewed?.(input.clip, review, 0);
            return { success: true, data: review };
        }
        catch (e) {
            return { success: false, error: `审核失败: ${e.message}` };
        }
    }
}
export class RerollStage {
    decide(params) {
        const { review, attempt, maxAttempts, passScore, currentPrompt } = params;
        // Passed — no reroll needed
        if (review.verdict === "pass" || review.score >= passScore) {
            return { shouldReroll: false, reason: `审核通过 (score=${review.score})` };
        }
        // Max attempts reached
        if (attempt >= maxAttempts) {
            return {
                shouldReroll: false,
                reason: `审核未通过 (score=${review.score})，已达最大重生成次数`,
            };
        }
        // Has reroll prompt — patch and retry
        if (review.rerollPrompt) {
            return {
                shouldReroll: true,
                patchedPrompt: `${currentPrompt}\n\n【修复指令 - 第${attempt + 1}次重生成】\n${review.rerollPrompt}`,
                reason: `审核未通过 (score=${review.score})，准备第${attempt + 1}次重生成`,
            };
        }
        // Failed without reroll prompt
        return {
            shouldReroll: false,
            reason: `审核未通过 (score=${review.score})，无重生成指令`,
        };
    }
}
export class AutoCutStage {
    async run(input, ctx) {
        const clipsForCompose = input.clips.filter((c) => c.videoUrl);
        if (clipsForCompose.length <= 1) {
            return { success: false, error: "需要至少2个片段才能使用AutoCut", skipped: true };
        }
        try {
            ctx.callbacks.onComposeProgress?.("正在生成智能剪辑方案...");
            const videoClipRefs = clipsForCompose.map((c) => ({
                id: c.id,
                videoUrl: c.videoUrl,
                sourcePath: c.localPath ?? c.videoUrl,
            }));
            const autoPlan = generateAutoCutPlan(input.shots, videoClipRefs);
            const edlResult = autocutPlanToEDL(autoPlan, videoClipRefs);
            ctx.callbacks.onComposeProgress?.(`智能剪辑方案：${autoPlan.styleSummary}，预估时长 ${autoPlan.estimatedDuration.toFixed(1)}s`);
            return {
                success: true,
                data: {
                    clips: edlResult.clips,
                    transitions: edlResult.transitions,
                    styleSummary: autoPlan.styleSummary,
                    estimatedDuration: autoPlan.estimatedDuration,
                },
            };
        }
        catch (e) {
            return { success: false, error: `智能剪辑失败: ${e.message}` };
        }
    }
}
export class ComposeStage {
    composer;
    constructor(composer) {
        this.composer = composer;
    }
    async run(input, ctx) {
        if (!this.composer) {
            return { success: false, error: "Composer not configured" };
        }
        ctx.callbacks.onComposeProgress?.("开始合成视频...");
        try {
            if (input.edlClips) {
                const result = await this.composer.composeFromEDL({
                    clips: input.edlClips,
                    transitions: input.edlTransitions ?? [],
                    outputPath: input.outputPath,
                });
                return { success: true, data: result };
            }
            const result = await this.composer.compose({
                clips: input.clips,
                transitions: input.transitions ?? [],
                outputPath: input.outputPath,
                config: { fps: 30 },
            });
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: `合成失败: ${e.message}` };
        }
    }
}
export class LipSyncStage {
    /** Lip-sync manager (public for OrchestrateStage to access via ctx). */
    manager;
    constructor(manager) {
        this.manager = manager;
    }
    async run(input, ctx) {
        if (!this.manager) {
            return { success: false, error: "LipSync manager not configured", skipped: true };
        }
        const providers = this.manager.listAvailableProviders();
        if (providers.length === 0) {
            return { success: false, error: "No lip-sync provider available", skipped: true };
        }
        try {
            ctx.callbacks.onComposeProgress?.(`正在应用口型同步 (${input.provider ?? "auto"})...`);
            const result = input.provider
                ? await this.manager.syncWith(input.provider, {
                    videoUrl: input.clip.videoUrl,
                    videoLocalPath: input.clip.localPath,
                    audioUrl: input.audioUrl ?? "",
                    characterImage: input.characterImage,
                    outputPath: input.outputPath,
                })
                : await this.manager.sync({
                    videoUrl: input.clip.videoUrl,
                    videoLocalPath: input.clip.localPath,
                    audioUrl: input.audioUrl ?? "",
                    characterImage: input.characterImage,
                    outputPath: input.outputPath,
                });
            ctx.callbacks.onLipSyncApplied?.(input.clip, result.success);
            if (!result.success) {
                return { success: false, error: result.error ?? "Lip-sync failed" };
            }
            return {
                success: true,
                data: {
                    success: true,
                    outputPath: result.outputPath,
                    provider: result.provider,
                },
            };
        }
        catch (e) {
            return { success: false, error: `口型同步失败: ${e.message}` };
        }
    }
}
export class OrchestrateStage {
    stages;
    defaultCallbacks;
    constructor(stages, defaultCallbacks = {}) {
        this.stages = stages;
        this.defaultCallbacks = defaultCallbacks;
    }
    async run(input) {
        const reviewConfig = {
            ...DEFAULT_REVIEW_CONFIG,
            ...input.reviewConfig,
        };
        const consistencyChecker = input.characterLibrary
            ? new CharacterConsistencyChecker(input.characterLibrary, undefined, new StubFaceEmbeddingProvider())
            : undefined;
        const ctx = {
            reviewConfig,
            chapterScript: input.chapterScript,
            referenceImages: input.referenceImages ?? [],
            callbacks: this.defaultCallbacks,
            characterLibrary: input.characterLibrary,
            enableConsistencyCheck: input.enableConsistencyCheck,
            consistencyChecker,
            enableLipSync: input.enableLipSync,
            lipSyncProvider: input.lipSyncProvider,
            lipSyncManager: this.stages.lipSync.manager,
            outputPath: input.outputPath,
            promptTemplateId: input.promptTemplateId,
            ttsAudioUrl: input.ttsAudioUrl,
        };
        const concurrency = Math.max(1, input.concurrency ?? 1);
        const clips = [...input.clips];
        const clipResults = new Array(clips.length);
        let nextIndex = 0;
        const worker = async () => {
            while (true) {
                const i = nextIndex++;
                if (i >= clips.length)
                    return;
                clipResults[i] = await this.processSingleClip(clips[i], ctx);
                clips[i] = clipResults[i].clip;
            }
        };
        const workers = Array.from({ length: concurrency }, () => worker());
        await Promise.all(workers);
        // Collect errors
        const errors = clipResults.filter((r) => r.error).map((r) => r.error);
        const allPassed = clipResults.every((r) => !r.error && r.review.verdict !== "fail");
        // Compose if all clips passed
        let composeResult;
        if (allPassed && input.outputPath) {
            const clipsForCompose = clips.filter((c) => c.videoUrl);
            let composed = false;
            // ── AutoCut path ──────────────────────────────────────────────
            if (input.shots &&
                input.shots.length > 0 &&
                clipsForCompose.length > 1 &&
                input.useAutoCut !== false) {
                const acResult = await this.stages.autoCut.run({ clips: clipsForCompose, shots: input.shots }, ctx);
                if (acResult.success && acResult.data) {
                    const cResult = await this.stages.compose.run({
                        clips: clipsForCompose,
                        outputPath: input.outputPath,
                        edlClips: acResult.data.clips,
                        edlTransitions: acResult.data.transitions,
                    }, ctx);
                    if (cResult.success && cResult.data) {
                        composeResult = cResult.data;
                        composed = true;
                    }
                    else if (cResult.error) {
                        errors.push(cResult.error);
                    }
                }
                else if (acResult.error && !acResult.skipped) {
                    ctx.callbacks.onComposeProgress?.(`智能剪辑失败，使用基础合成: ${acResult.error}`);
                }
            }
            // ── Fallback: normal compose ──────────────────────────────────
            if (!composed) {
                const cResult = await this.stages.compose.run({
                    clips: clipsForCompose,
                    outputPath: input.outputPath,
                    transitions: input.transitions ?? [],
                }, ctx);
                if (cResult.success && cResult.data) {
                    composeResult = cResult.data;
                }
                else if (cResult.error) {
                    errors.push(cResult.error);
                }
            }
        }
        return {
            clips,
            reviewResults: clipResults.map((r) => r.review),
            composeResult,
            success: allPassed && errors.length === 0,
            errors,
            clipResults,
        };
    }
    /**
     * Process a single clip through the full stage chain:
     * generate → download → frameCheck → review → reroll (loop)
     */
    async processSingleClip(clip, ctx) {
        let currentPrompt = clip.prompt;
        // ── Stage 0: Prompt Template Enhancement ─────────────────────
        if (ctx.promptTemplateId) {
            currentPrompt = enhancePromptWithTemplate({
                templateId: ctx.promptTemplateId,
                clip,
            });
        }
        let review;
        let attempt = 0;
        const maxAttempts = ctx.reviewConfig.maxRerolls + 1;
        let lastError;
        while (attempt < maxAttempts) {
            attempt++;
            clip.status = "generating";
            // ── Stage 1: Generation ─────────────────────────────────────
            const genResult = await this.stages.generation.run({ clip, prompt: currentPrompt, attempt }, ctx);
            if (!genResult.success) {
                lastError = genResult.error;
                ctx.callbacks.onClipFailed?.(clip, lastError);
                if (attempt >= maxAttempts)
                    break;
                continue;
            }
            clip.videoUrl = genResult.data.videoUrl;
            clip.thumbnailUrl = genResult.data.thumbnailUrl;
            clip.status = "completed";
            // Fire onClipGenerated AFTER generation succeeds and the clip has its
            // videoUrl set — previously this callback was invoked inside
            // GenerationStage.run() *before* client.generate(), causing consumers
            // (SSE progress, clip persistence) to see a clip with no videoUrl.
            ctx.callbacks.onClipGenerated?.(clip, attempt);
            // ── Stage 2: Download ───────────────────────────────────────
            const dlResult = await this.stages.download.run({
                clip,
                videoUrl: clip.videoUrl,
            });
            if (dlResult.success && dlResult.data?.localPath) {
                clip.localPath = dlResult.data.localPath;
            }
            // ── Stage 3: Frame Check ────────────────────────────────────
            const videoSource = clip.localPath ?? clip.videoUrl;
            if (videoSource) {
                const fcResult = await this.stages.frameCheck.run({ clip, videoSource }, ctx);
                if (fcResult.success && fcResult.data) {
                    if (fcResult.data.trimStart !== undefined) {
                        clip.trimStart = fcResult.data.trimStart;
                    }
                    if (fcResult.data.trimEnd !== undefined) {
                        clip.trimEnd = fcResult.data.trimEnd;
                    }
                }
            }
            // ── Stage 4: Review ─────────────────────────────────────────
            const rvResult = await this.stages.review.run({ clip }, ctx);
            if (!rvResult.success) {
                lastError = rvResult.error;
                ctx.callbacks.onClipFailed?.(clip, lastError);
                if (attempt >= maxAttempts)
                    break;
                continue;
            }
            review = rvResult.data;
            // ── Stage 5: Reroll Decision ────────────────────────────────
            const decision = this.stages.reroll.decide({
                review,
                attempt,
                maxAttempts,
                passScore: ctx.reviewConfig.passScore,
                currentPrompt,
            });
            if (!decision.shouldReroll) {
                if (review.verdict === "pass" || review.score >= ctx.reviewConfig.passScore) {
                    clip.status = "completed";
                    // ── Stage 4.5: Character Consistency Check ──────────────────
                    let consistencyScore;
                    if (ctx.enableConsistencyCheck && ctx.characterLibrary && ctx.consistencyChecker) {
                        // 一致性检查是最佳努力，不会阻塞流水线
                        try {
                            const framePath = clip.thumbnailUrl || clip.videoUrl;
                            if (framePath) {
                                const characters = ctx.characterLibrary.listCharacters();
                                if (characters.length > 0) {
                                    const checkResult = await ctx.consistencyChecker.checkFrame(framePath, characters[0].id);
                                    // 如果结果是跳过（suggestion 以 "[Skipped]" 开头），不设置分数
                                    if (checkResult.suggestion?.startsWith("[Skipped]")) {
                                        consistencyScore = undefined;
                                    }
                                    else {
                                        consistencyScore = checkResult.score;
                                        ctx.callbacks.onConsistencyChecked?.(clip, consistencyScore, checkResult.passed);
                                    }
                                }
                            }
                        }
                        catch {
                            // 最佳努力，出错时跳过
                            consistencyScore = undefined;
                        }
                    }
                    // ── Stage 4.6: Lip Sync ─────────────────────────────────────
                    let lipSyncApplied;
                    if (ctx.enableLipSync && ctx.lipSyncManager) {
                        const lipSyncResult = await this.stages.lipSync?.run({
                            clip,
                            audioUrl: ctx.ttsAudioUrl,
                            outputPath: join(dirname(clip.localPath || tmpdir()), `lipsync-${clip.id}.mp4`),
                            provider: ctx.lipSyncProvider,
                        }, ctx);
                        if (lipSyncResult?.success && lipSyncResult.data) {
                            clip.videoUrl = lipSyncResult.data.outputPath;
                            lipSyncApplied = true;
                        }
                    }
                    return { clip, review, attempts: attempt, lipSyncApplied, consistencyScore };
                }
                lastError = decision.reason;
                break;
            }
            // Prepare for reroll
            currentPrompt = decision.patchedPrompt;
            clip.status = "pending";
        }
        clip.status = lastError ? "failed" : "completed";
        return {
            clip,
            review: review ?? {
                verdict: "fail",
                score: 0,
                grade: "F",
                issues: [],
                summary: lastError ?? "未知错误",
            },
            error: lastError,
            attempts: attempt,
        };
    }
}
// ---------------------------------------------------------------------------
// Factory: create default stage instances
// ---------------------------------------------------------------------------
export function createPipelineStages(client, reviewer, composer, callbacks = {}, lipSyncManager) {
    const downloader = new VideoDownloader();
    const frameChecker = new FrameQualityChecker();
    const stages = {
        generation: new GenerationStage(client),
        download: new DownloadStage(downloader),
        frameCheck: new FrameCheckStage(frameChecker),
        review: new ReviewStage(reviewer),
        reroll: new RerollStage(),
        autoCut: new AutoCutStage(),
        compose: new ComposeStage(composer),
        lipSync: new LipSyncStage(lipSyncManager),
        orchestrate: undefined, // set below
    };
    stages.orchestrate = new OrchestrateStage(stages, callbacks);
    return stages;
}
//# sourceMappingURL=pipeline-stages.js.map