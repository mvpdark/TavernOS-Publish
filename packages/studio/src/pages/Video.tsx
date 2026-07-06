import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../store/project.js";
import { apiGet, apiPost, apiDelete, apiPut, BASE_URL } from "../api/client.js";
import type {
  SavedClip,
  VideoReviewResult,
  ComposeResult,
  ClipsResponse,
  ReviewResponse,
  ComposeSseEvent,
  GenerateSseEvent,
  PipelineSseEvent,
} from "./video/types.js";
import { streamSsePost } from "./video/utils.js";
import GeneratePanel from "./video/GeneratePanel.tsx";
import ClipList from "./video/ClipList.tsx";
import ReviewPanel from "./video/ReviewPanel.tsx";
import ScriptParserPanel from "./video/ScriptParserPanel.tsx";
import CharacterPanel from "./video/CharacterPanel.tsx";
import PromptTemplatePanel from "./video/PromptTemplatePanel.tsx";
import BillingPanel from "./video/BillingPanel.tsx";
import { enhancePrompt } from "./video/prompt-enhancer.js";
import type { SceneType } from "./video/prompt-enhancer.js";
import type { LipSyncProvider } from "@tavernos/core";
import type { JSX } from "react";

export default function Video(): JSX.Element {
  const { t } = useTranslation();
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  // Generation form state
  const [prompt, setPrompt] = useState("");
  const [chapterId, setChapterId] = useState(1);
  const [clipNumber, setClipNumber] = useState(1);
  const [duration, setDuration] = useState(5);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");

  // Prompt enhancement state
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceSceneType, setEnhanceSceneType] = useState<SceneType | "auto">("auto");
  const [lastEnhancedInfo, setLastEnhancedInfo] = useState<string | null>(null);

  // Clip list state
  const [clips, setClips] = useState<SavedClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [clipsLoading, setClipsLoading] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");

  // Review state
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<VideoReviewResult | null>(null);
  const [scriptContext, setScriptContext] = useState("");

  // Composition state
  const [composing, setComposing] = useState(false);
  const [composeStatus, setComposeStatus] = useState("");
  const [composeProgress, setComposeProgress] = useState<{ current: number; total: number } | null>(null);
  const [composeResult, setComposeResult] = useState<ComposeResult | null>(null);
  const [transitionType, setTransitionType] = useState<"cut" | "crossfade" | "fade">("crossfade");
  /** Selected clip IDs for composition. Empty = compose all. */
  const [composeClipIds, setComposeClipIds] = useState<Set<string>>(new Set());

  // AutoCut (one-shot pipeline) state
  const [autocutting, setAutocutting] = useState(false);
  const [autocutStatus, setAutocutStatus] = useState("");

  // JianYing (CapCut) export state
  const [exportingJianying, setExportingJianying] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  // Lip sync state
  const [enableLipSync, setEnableLipSync] = useState(false);
  const [lipSyncProvider, setLipSyncProvider] = useState<LipSyncProvider>("seedance-audio");

  // Image editor state
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imageEditorUrl, setImageEditorUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // AbortControllers for the long-running SSE streams (generate / compose / autocut).
  // Aborted on unmount so video generation doesn't keep running in the
  // background after the user leaves the page.
  const generateAbortRef = useRef<AbortController | null>(null);
  const composeAbortRef = useRef<AbortController | null>(null);
  const autocutAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      generateAbortRef.current?.abort();
      composeAbortRef.current?.abort();
      autocutAbortRef.current?.abort();
    };
  }, []);

  // Load clips when project changes
  const loadClips = useCallback(async () => {
    if (!projectId) return;
    setClipsLoading(true);
    try {
      const data = await apiGet<ClipsResponse>(
        `/projects/${projectId}/videos/clips`,
      );
      setClips(data.clips ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setClipsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadClips();
  }, [loadClips]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null;

  // --- Generate a new video clip ---
  const handleGenerate = async (): Promise<void> => {
    if (!projectId || !prompt.trim()) return;
    // Abort any previous generate stream, then start a fresh one.
    generateAbortRef.current?.abort();
    const controller = new AbortController();
    generateAbortRef.current = controller;
    setGenerating(true);
    setGenStatus(t("video.sse.generating"));
    setError(null);

    // Parse multi-line reference image URLs (one per line, max 9).
    // Backward compat: a single URL is sent as `referenceImageUrl`; multiple
    // URLs are sent as `referenceImageUrls` (omni_reference mode).
    const refUrls = referenceImageUrl
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 9);
    const refPayload =
      refUrls.length === 0
        ? {}
        : refUrls.length === 1
          ? { referenceImageUrl: refUrls[0] }
          : { referenceImageUrls: refUrls };

    try {
      await streamSsePost<GenerateSseEvent>(
        `${BASE_URL}/projects/${projectId}/videos/generate`,
        {
          prompt,
          chapterId,
          clipNumber,
          duration,
          ...refPayload,
        },
        (event) => {
          // Ignore events arriving after the stream was cancelled.
          if (controller.signal.aborted) return;
          if (event.type === "status") {
            // Translate messageKey if present, fallback to message
            const msg = event.messageKey
              ? t(event.messageKey, event.messageParams)
              : event.message ?? "";
            setGenStatus(msg);
          } else if (event.type === "done" && event.clip) {
            setClips((prev) => [event.clip!, ...prev]);
            setSelectedClipId(event.clip.id);
            setGenStatus("");
          } else if (event.type === "error") {
            const msg = event.messageKey
              ? t(event.messageKey)
              : event.error ?? t("video.sse.generateError");
            setError(msg);
            setGenStatus("");
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
        // Cancelled (unmount / new generation) — keep partial state, no error.
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (!controller.signal.aborted) setGenerating(false);
    }
  };

  // --- Enhance prompt (multi-scene) ---
  const handleEnhance = useCallback((): void => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    // Use setTimeout to allow the spinner to render (pure function is instant)
    setTimeout(() => {
      const sceneType: SceneType | "auto" = enhanceSceneType;
      const result = enhancePrompt(prompt, { duration, sceneType });
      setPrompt(result.enhanced);
      setLastEnhancedInfo(`已按「${result.sceneLabel}」风格增强，可再次点击换一组编排`);
      setEnhancing(false);
    }, 150);
  }, [prompt, duration, enhanceSceneType]);

  // --- Select a prompt template (fills the visual prompt input) ---
  const handleSelectTemplate = useCallback((visualPrompt: string, _actingPrompt: string) => {
    setPrompt(visualPrompt);
  }, []);

  // --- Image editor ---
  const handleOpenImageEditor = useCallback((url: string) => {
    setImageEditorUrl(url);
    setImageEditorOpen(true);
  }, []);

  const handleCloseImageEditor = useCallback(() => {
    setImageEditorOpen(false);
    setImageEditorUrl(null);
  }, []);

  const handleImageExport = useCallback((editedUrl: string) => {
    setReferenceImageUrl(editedUrl);
    setImageEditorOpen(false);
    setImageEditorUrl(null);
  }, []);

  // --- Review the selected clip ---
  const handleReview = async (): Promise<void> => {
    if (!projectId || !selectedClip) return;
    setReviewing(true);
    setError(null);
    setReviewResult(null);

    try {
      const res = await apiPost<ReviewResponse>(
        `/projects/${projectId}/videos/review`,
        {
          clip: selectedClip,
          clipId: selectedClipId,
          scriptContext: scriptContext || "（无剧本上下文）",
        },
      );
      setReviewResult(res.review);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReviewing(false);
    }
  };

  // --- Compose selected (or all) clips into a single video ---
  const handleCompose = async (): Promise<void> => {
    if (!projectId || clips.length === 0) return;
    // Use selected clips if any are checked, otherwise use all clips
    const clipsToCompose = composeClipIds.size > 0
      ? clips.filter((c) => composeClipIds.has(c.id))
      : clips;
    if (clipsToCompose.length === 0) return;
    // Abort any previous compose stream, then start a fresh one.
    composeAbortRef.current?.abort();
    const controller = new AbortController();
    composeAbortRef.current = controller;
    setComposing(true);
    setComposeStatus(t("video.sse.composing", { count: clipsToCompose.length }));
    setComposeProgress(null);
    setComposeResult(null);
    setError(null);

    // Build transitions between consecutive clips
    const transitions = clipsToCompose.slice(1).map((clip, i) => ({
      from: clipsToCompose[i]!.id,
      to: clip.id,
      type: transitionType,
      duration: transitionType === "cut" ? 0 : 0.5,
    }));

    try {
      await streamSsePost<ComposeSseEvent>(
        `${BASE_URL}/projects/${projectId}/videos/compose`,
        {
          clips: clipsToCompose,
          transitions,
        },
        (event) => {
          // Ignore events arriving after the stream was cancelled.
          if (controller.signal.aborted) return;
          if (event.type === "status") {
            const msg = event.messageKey
              ? t(event.messageKey, event.messageParams)
              : event.message ?? "";
            setComposeStatus(msg);
          } else if (event.type === "progress") {
            setComposeProgress({
              current: event.current ?? 0,
              total: event.total ?? 0,
            });
          } else if (event.type === "done" && event.result) {
            setComposeResult(event.result);
            setComposeStatus(t("video.sse.composeDone"));
          } else if (event.type === "error") {
            const msg = event.messageKey
              ? t(event.messageKey)
              : event.error ?? t("video.sse.composeError");
            setError(msg);
            setComposeStatus("");
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
        // Cancelled (unmount / new compose) — keep partial state, no error.
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (!controller.signal.aborted) setComposing(false);
    }
  };

  // --- AutoCut: one-shot pipeline (generate → review → reroll → compose) ---
  const handleAutoCut = async (): Promise<void> => {
    if (!projectId || clips.length === 0) return;
    const clipsToProcess =
      composeClipIds.size > 0
        ? clips.filter((c) => composeClipIds.has(c.id))
        : clips;
    if (clipsToProcess.length === 0) return;

    // Abort any previous autocut stream, then start a fresh one.
    autocutAbortRef.current?.abort();
    const controller = new AbortController();
    autocutAbortRef.current = controller;
    setAutocutting(true);
    setAutocutStatus(t("video.sse.pipelineStart", { count: clipsToProcess.length }));
    setComposeResult(null);
    setError(null);

    // Build pipeline clip specs from existing clips' prompts.
    const pipelineClips = clipsToProcess.map((c) => ({
      prompt: c.prompt,
      chapterId: c.chapterId,
      clipNumber: c.clipNumber,
      duration: c.duration,
    }));

    try {
      await streamSsePost<PipelineSseEvent>(
        `${BASE_URL}/projects/${projectId}/videos/pipeline`,
        {
          clips: pipelineClips,
          chapterScript: scriptContext || "",
          transitionType,
          concurrency: 3,
          enableLipSync: enableLipSync,
          lipSyncProvider: lipSyncProvider,
          enableConsistencyCheck: enableLipSync, // 口型同步开启时也开启一致性检查
        },
        (event) => {
          if (controller.signal.aborted) return;
          switch (event.type) {
            case "status": {
              const msg = event.messageKey
                ? t(event.messageKey, event.messageParams)
                : event.message ?? "";
              if (msg) setAutocutStatus(msg);
              break;
            }
            case "clip_generated": {
              setAutocutStatus(
                `片段 ${event.clipNumber ?? "?"} 已生成（第 ${event.attempt ?? 1} 次）`,
              );
              break;
            }
            case "clip_reviewed": {
              setAutocutStatus(
                `片段 ${event.clipNumber ?? "?"} 审核：${event.verdict ?? "?"} ${event.score ?? ""}`.trim(),
              );
              break;
            }
            case "clip_failed": {
              setAutocutStatus(`片段 ${event.clipNumber ?? "?"} 失败：${event.error ?? ""}`);
              break;
            }
            case "compose_progress": {
              if (event.message) setAutocutStatus(event.message);
              break;
            }
            case "lip_sync_applied": {
              setAutocutStatus(`片段${event.clipNumber}: 口型同步${event.success ? "成功" : "失败"}`);
              break;
            }
            case "consistency_checked": {
              setAutocutStatus(`片段${event.clipNumber}: 角色一致性${event.passed ? "通过" : "未通过"} (${event.score}分)`);
              break;
            }
            case "done": {
              if (event.composeResult) setComposeResult(event.composeResult);
              setAutocutStatus(
                `${t("video.sse.composeDone")}${event.failedClips ? ` · 失败 ${event.failedClips}` : ""}`,
              );
              // Reload clips so newly generated/persisted clips appear.
              void loadClips();
              break;
            }
            case "error": {
              const msg = event.messageKey
                ? t(event.messageKey)
                : event.error ?? t("video.sse.pipelineError");
              setError(msg);
              setAutocutStatus("");
              break;
            }
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
        // Cancelled (unmount / new autocut) — keep partial state, no error.
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (!controller.signal.aborted) setAutocutting(false);
    }
  };

  // --- Export clips to a JianYing (CapCut) .draft project file ---
  const handleExportJianying = async (): Promise<void> => {
    if (!projectId || clips.length === 0) return;
    // Use selected clips if any are checked, otherwise use all clips
    const clipsToExport = composeClipIds.size > 0
      ? clips.filter((c) => composeClipIds.has(c.id))
      : clips;
    if (clipsToExport.length === 0) return;

    setExportingJianying(true);
    setExportStatus("正在导出剪映工程...");
    setError(null);

    try {
      const res = await apiPost<{ success: boolean; filePath: string; fileName: string }>(
        `/projects/${projectId}/videos/export-jianying`,
        {
          clips: clipsToExport,
          includeSubtitles: true,
        },
      );
      setExportStatus(`已导出: ${res.fileName}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setExportStatus("");
    } finally {
      setExportingJianying(false);
    }
  };

  // --- Delete a clip ---
  const handleDeleteClip = async (clipId: string): Promise<void> => {
    if (!projectId) return;
    setError(null);
    setComposeClipIds((prev) => {
      if (!prev.has(clipId)) return prev;
      const next = new Set(prev);
      next.delete(clipId);
      return next;
    });
    try {
      await apiDelete(`/projects/${projectId}/videos/clips/${clipId}`);
      setClips((prev) => prev.filter((c) => c.id !== clipId));
      if (selectedClipId === clipId) {
        setSelectedClipId(null);
        setReviewResult(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // --- Reorder clips (drag and drop) ---
  const handleReorderClips = async (clipIds: string[]): Promise<void> => {
    if (!projectId) return;
    // Optimistically update UI
    const reordered = clipIds
      .map((id) => clips.find((c) => c.id === id))
      .filter((c): c is SavedClip => c !== undefined);
    setClips(reordered);
    try {
      await apiPut(`/projects/${projectId}/videos/clips/reorder`, { clipIds });
    } catch (e) {
      // Revert on failure
      void loadClips();
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!projectId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-light">视频制作</h1>
        <p className="mt-6 text-gray-500">请先在仪表盘选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-[#141414] px-6 py-4">
        <h1 className="text-xl font-light">视频制作</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          AI 视频生成 → 质检审核 → FFmpeg 剪辑合成
        </p>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">
          {error}
        </div>
      )}

      {/* Script parser panel (collapsible, above the three-column layout) */}
      <ScriptParserPanel projectId={projectId} />
      <CharacterPanel projectId={projectId} />
      <PromptTemplatePanel onSelectTemplate={handleSelectTemplate} />
      <BillingPanel projectId={projectId} />

      {/* Three-column layout */}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-3">
        {/* Left: Generation Configuration */}
        <GeneratePanel
          prompt={prompt}
          onPromptChange={setPrompt}
          chapterId={chapterId}
          onChapterIdChange={setChapterId}
          clipNumber={clipNumber}
          onClipNumberChange={setClipNumber}
          duration={duration}
          onDurationChange={setDuration}
          referenceImageUrl={referenceImageUrl}
          onReferenceImageUrlChange={setReferenceImageUrl}
          generating={generating}
          genStatus={genStatus}
          onGenerate={() => void handleGenerate()}
          enhancing={enhancing}
          enhanceSceneType={enhanceSceneType}
          onEnhanceSceneTypeChange={setEnhanceSceneType}
          onEnhance={handleEnhance}
          lastEnhancedInfo={lastEnhancedInfo}
          transitionType={transitionType}
          onTransitionTypeChange={setTransitionType}
          composing={composing}
          composeStatus={composeStatus}
          composeProgress={composeProgress}
          composeResult={composeResult}
          clipsCount={composeClipIds.size > 0 ? composeClipIds.size : clips.length}
          onCompose={() => void handleCompose()}
          autocutting={autocutting}
          autocutStatus={autocutStatus}
          onAutoCut={() => void handleAutoCut()}
          exportingJianying={exportingJianying}
          exportStatus={exportStatus}
          onExportJianying={() => void handleExportJianying()}
          enableLipSync={enableLipSync}
          onEnableLipSyncChange={setEnableLipSync}
          lipSyncProvider={lipSyncProvider}
          onLipSyncProviderChange={setLipSyncProvider}
          imageEditorOpen={imageEditorOpen}
          imageEditorUrl={imageEditorUrl}
          onOpenImageEditor={handleOpenImageEditor}
          onCloseImageEditor={handleCloseImageEditor}
          onImageExport={handleImageExport}
        />

        {/* Center: Clip List */}
        <ClipList
          clips={clips}
          selectedClipId={selectedClipId}
          clipsLoading={clipsLoading}
          onRefresh={() => void loadClips()}
          onSelectClip={(clipId) => {
            setSelectedClipId(clipId);
            setReviewResult(null);
          }}
          onDeleteClip={(clipId) => void handleDeleteClip(clipId)}
          onReorder={(clipIds) => void handleReorderClips(clipIds)}
          composeClipIds={composeClipIds}
          onToggleComposeClip={(clipId) => {
            setComposeClipIds((prev) => {
              const next = new Set(prev);
              if (next.has(clipId)) next.delete(clipId);
              else next.add(clipId);
              return next;
            });
          }}
        />

        {/* Right: Review + Details */}
        <ReviewPanel
          selectedClip={selectedClip}
          reviewing={reviewing}
          reviewResult={reviewResult}
          scriptContext={scriptContext}
          onScriptContextChange={setScriptContext}
          onReview={() => void handleReview()}
          onUseRerollPrompt={(rerollPrompt) => {
            setPrompt(rerollPrompt);
            setReviewResult(null);
          }}
        />
      </div>
    </div>
  );
}
