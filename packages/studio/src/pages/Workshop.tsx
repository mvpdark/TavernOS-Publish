// Workshop page — Obsidian Frames design philosophy
//
// The storyboard pipeline visualized as a specimen chamber:
// each frame is a unit of captured time, mounted for examination.
//
// Step-based UI:
//   1. Select a chapter (specimen selection)
//   2. Generate storyboard script (scene dissection)
//   3. Split into shots (temporal quantization 4-15s)

import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../store/project.js";
import { apiGet, apiPost, proxyImageUrl } from "../api/client.js";
import { BTN } from "../components/ui.js";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Chapter {
  id: string;
  title: string;
  content?: string;
  order?: number;
}

interface StoryboardScene {
  sceneNumber: number;
  title: string;
  location: string;
  description: string;
  characters: string[];
  props: string[];
  mood: string;
  estimatedDuration: number;
}

interface StoryboardScript {
  title: string;
  summary: string;
  scenes: StoryboardScene[];
}

interface Shot {
  shotNumber: number;
  sceneNumber: number;
  description: string;
  prompt: string;
  dialogue: string;
  characters: string[];
  scenes: string[];
  props: string[];
  duration: number;
  aspectRatio: string;
  cameraMovement: string;
  lighting: string;
}

interface ShotList {
  shots: Shot[];
  totalDuration: number;
}

// ---------------------------------------------------------------------------
// Design tokens — Obsidian Frames
// ---------------------------------------------------------------------------

/** Sprocket hole strip — CSS-only film perforation pattern. */
const sprocketRail =
  "relative before:absolute before:left-0 before:top-0 before:h-full before:w-3 before:content-[''] " +
  "before:bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_6px,#050505_6px,#050505_14px)] " +
  "after:absolute after:right-0 after:top-0 after:h-full after:w-3 after:content-[''] " +
  "after:bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_6px,#050505_6px,#050505_14px)]";

/** Faint grid overlay — surveyor's lines. */
const gridOverlay =
  "before:absolute before:inset-0 before:content-[''] " +
  "before:bg-[linear-gradient(rgba(201,168,108,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(201,168,108,0.025)_1px,transparent_1px)] " +
  "before:bg-[size:80px_80px] before:pointer-events-none";

/** Crosshair registration mark. */
function Crosshair({ x, y }: { x: string; y: string }): JSX.Element {
  return (
    <div className="pointer-events-none absolute z-10" style={{ left: x, top: y }}>
      <div className="relative h-5 w-5">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[rgba(201,168,108,0.3)]" />
        <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-[rgba(201,168,108,0.3)]" />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(201,168,108,0.4)]" />
      </div>
    </div>
  );
}

/** Specimen label — clinical monospace key/value pair. */
function SpecimenLabel({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-[#555555]">
        {label}
      </span>
      <span
        className={`font-mono text-xs ${accent ? "text-[#C9A86C]" : "text-[#999999]"}`}
      >
        {value}
      </span>
    </div>
  );
}

/** Duration spectrum ruler — bottom measurement scale. */
function DurationSpectrum({
  durations,
}: {
  durations: number[];
}): JSX.Element {
  const min = 4;
  const max = 15;
  const ticks = [4, 6, 8, 10, 12, 15];
  return (
    <div className="relative pt-6">
      <span className="absolute left-0 top-0 font-mono text-[10px] uppercase tracking-wider text-[#555555]">
        Duration Spectrum
      </span>
      <span className="absolute right-0 top-0 font-mono text-[10px] text-[#555555]">
        Frame Quantum (s)
      </span>
      <div className="relative h-8">
        {/* Main line */}
        <div className="absolute left-0 top-4 h-px w-full bg-[rgba(201,168,108,0.2)]" />
        {/* Ticks */}
        {ticks.map((t) => {
          const pos = ((t - min) / (max - min)) * 100;
          return (
            <div key={t} className="absolute flex flex-col items-center" style={{ left: `${pos}%`, transform: "translateX(-50%)" }}>
              <div className="h-2.5 w-px bg-[rgba(201,168,108,0.3)]" />
              <span className="mt-1 font-mono text-[10px] text-[#666666]">{t}s</span>
            </div>
          );
        })}
        {/* Active duration markers */}
        {durations.map((d, i) => {
          const pos = ((d - min) / (max - min)) * 100;
          return (
            <div
              key={i}
              className="absolute top-3.5 h-2 w-2 -translate-x-1/2 rounded-full bg-[#C9A86C]"
              style={{ left: `${pos}%`, boxShadow: "0 0 6px rgba(201,168,108,0.4)" }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Workshop(): JSX.Element {
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const createProject = useProjectStore((s) => s.createProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [script, setScript] = useState<StoryboardScript | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [shotList, setShotList] = useState<ShotList | null>(null);
  const [shotsLoading, setShotsLoading] = useState(false);
  const [maxDuration, setMaxDuration] = useState(15);
  const [error, setError] = useState<string | null>(null);

  // Per-shot generation state: shotNumber → { imageUrl?, videoUrl?, loading }
  const [shotAssets, setShotAssets] = useState<Map<number, { imageUrl?: string; videoUrl?: string; thumbnailUrl?: string }>>(new Map());
  const [shotLoading, setShotLoading] = useState<Map<number, "image" | "video" | null>>(new Map());

  // Project creation state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState("zh");
  const [createError, setCreateError] = useState<string | null>(null);

  // Ref to access latest selectedChapterId without stale closure in useCallback
  const selectedChapterIdRef = useRef(selectedChapterId);
  useEffect(() => {
    selectedChapterIdRef.current = selectedChapterId;
  }, [selectedChapterId]);

  // AbortController for the in-flight chapter fetch — aborted on project switch
  // or unmount so a stale response can't overwrite the new project's state.
  const loadAbortRef = useRef<AbortController | null>(null);
  // AbortController for global generation functions (script/shots) — aborted
  // on project switch so stale requests can't overwrite new state.
  const abortRef = useRef<AbortController | null>(null);
  // Per-shot AbortControllers for image/video generation. Keyed by shotNumber
  // so generating shot 2's video doesn't abort shot 1's in-flight image.
  // A single shared abortRef caused cross-shot interference.
  const shotAbortMapRef = useRef<Map<number, AbortController>>(new Map());

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return;
    setCreateError(null);
    try {
      await createProject(newName.trim(), newLang);
      setShowCreate(false);
      setNewName("");
      setNewLang("zh");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    }
  };

  const loadChapters = useCallback(async () => {
    if (!projectId) return;
    // Abort any previous in-flight chapter fetch (e.g. from a prior project)
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    setChaptersLoading(true);
    try {
      const data = await apiGet<{ chapters: Chapter[] }>(
        `/projects/${projectId}/story`,
        controller.signal,
      );
      // Race guard: drop the result if the request was cancelled.
      if (controller.signal.aborted) return;
      const list = data.chapters ?? [];
      setChapters(list);
      if (list.length > 0 && !selectedChapterIdRef.current) {
        setSelectedChapterId(list[0]!.id);
      }
    } catch (e) {
      if (controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!controller.signal.aborted) setChaptersLoading(false);
    }
  }, [projectId]);

  // Reset workshop state when switching projects to avoid stale data leaking
  // across projects (selected chapter, script, shots, assets). Runs before the
  // loadChapters effect so the auto-select check sees an empty selection.
  useEffect(() => {
    setStep(1);
    setScript(null);
    setShotList(null);
    setShotAssets(new Map());
    setShotLoading(new Map());
    setError(null);
    setSelectedChapterId("");
    selectedChapterIdRef.current = "";
    // 项目切换时中止所有进行中的生成请求，避免旧请求覆盖新状态
    abortRef.current?.abort();
    // Also abort all per-shot image/video generations
    for (const ctrl of shotAbortMapRef.current.values()) ctrl.abort();
    shotAbortMapRef.current.clear();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadChapters();
    return () => {
      // Abort the in-flight fetch when the project changes or the component unmounts.
      loadAbortRef.current?.abort();
    };
  }, [loadChapters]);

  const generateScript = async () => {
    if (!projectId || !selectedChapterId) return;
    // 中止前一个生成请求，防止旧请求覆盖新状态
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setScriptLoading(true);
    setError(null);
    setScript(null);
    setShotList(null);
    try {
      const data = await apiPost<{ script: StoryboardScript }>(
        `/projects/${projectId}/workshop/script`,
        { chapterId: selectedChapterId },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setScript(data.script);
      setStep(2);
    } catch (e) {
      if (controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!controller.signal.aborted) setScriptLoading(false);
    }
  };

  const splitShots = async () => {
    if (!projectId || !script) return;
    // 中止前一个生成请求，防止旧请求覆盖新状态
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setShotsLoading(true);
    setError(null);
    try {
      const data = await apiPost<{ shots: Shot[]; totalDuration: number }>(
        `/projects/${projectId}/workshop/shots`,
        { script, chapterId: selectedChapterId, maxDuration },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setShotList({ shots: data.shots, totalDuration: data.totalDuration });
      setStep(3);
    } catch (e) {
      if (controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!controller.signal.aborted) setShotsLoading(false);
    }
  };

  const reset = () => {
    setScript(null);
    setShotList(null);
    setStep(1);
    setError(null);
    setShotAssets(new Map());
    setShotLoading(new Map());
  };

  // Generate storyboard image for a shot
  const generateShotImage = async (shot: Shot) => {
    if (!projectId || !selectedChapterId) return;
    // Per-shot abort: only abort the same shot's previous request, not other shots
    shotAbortMapRef.current.get(shot.shotNumber)?.abort();
    const controller = new AbortController();
    shotAbortMapRef.current.set(shot.shotNumber, controller);
    setShotLoading(prev => new Map(prev).set(shot.shotNumber, "image"));
    try {
      const data = await apiPost<{ imageUrl: string }>(
        `/projects/${projectId}/workshop/shots/${shot.shotNumber}/image`,
        { prompt: shot.prompt, chapterId: selectedChapterId },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setShotAssets(prev => {
        const next = new Map(prev);
        const existing = next.get(shot.shotNumber) ?? {};
        next.set(shot.shotNumber, { ...existing, imageUrl: data.imageUrl });
        return next;
      });
    } catch (e) {
      if (controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
      setError(`镜头 ${shot.shotNumber} 生图失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      // 无论是否中止都清除该镜头的 loading 状态，避免 UI 卡在"生成中"
      setShotLoading(prev => new Map(prev).set(shot.shotNumber, null));
      // Clean up the per-shot controller
      shotAbortMapRef.current.delete(shot.shotNumber);
    }
  };

  // Generate video for a shot (image-to-video if image exists)
  const generateShotVideo = async (shot: Shot) => {
    if (!projectId || !selectedChapterId) return;
    // Per-shot abort: only abort the same shot's previous request, not other shots
    shotAbortMapRef.current.get(shot.shotNumber)?.abort();
    const controller = new AbortController();
    shotAbortMapRef.current.set(shot.shotNumber, controller);
    setShotLoading(prev => new Map(prev).set(shot.shotNumber, "video"));
    try {
      const existing = shotAssets.get(shot.shotNumber);
      const data = await apiPost<{ videoUrl: string; thumbnailUrl?: string; duration: number }>(
        `/projects/${projectId}/workshop/shots/${shot.shotNumber}/video`,
        {
          prompt: shot.prompt,
          duration: shot.duration,
          referenceImageUrl: existing?.imageUrl,
          chapterId: selectedChapterId,
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setShotAssets(prev => {
        const next = new Map(prev);
        const cur = next.get(shot.shotNumber) ?? {};
        next.set(shot.shotNumber, { ...cur, videoUrl: data.videoUrl, thumbnailUrl: data.thumbnailUrl });
        return next;
      });
    } catch (e) {
      if (controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
      setError(`镜头 ${shot.shotNumber} 生视频失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      // 无论是否中止都清除该镜头的 loading 状态，避免 UI 卡在"生成中"
      setShotLoading(prev => new Map(prev).set(shot.shotNumber, null));
      // Clean up the per-shot controller
      shotAbortMapRef.current.delete(shot.shotNumber);
    }
  };

  // Batch generate images for all shots that don't have one yet.
  // Processes sequentially to avoid overwhelming the image API.
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const batchGenerateImages = async () => {
    if (!shotList || batchGenerating) return;
    const shotsNeedingImages = shotList.shots.filter(
      (s) => !shotAssets.get(s.shotNumber)?.imageUrl,
    );
    if (shotsNeedingImages.length === 0) return;

    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: shotsNeedingImages.length });

    for (let i = 0; i < shotsNeedingImages.length; i++) {
      setBatchProgress({ current: i + 1, total: shotsNeedingImages.length });
      await generateShotImage(shotsNeedingImages[i]!);
    }

    setBatchGenerating(false);
    setBatchProgress(null);
  };

  // Batch generate videos for all shots that have images but no video.
  const batchGenerateVideos = async () => {
    if (!shotList || batchGenerating) return;
    const shotsNeedingVideos = shotList.shots.filter(
      (s) => shotAssets.get(s.shotNumber)?.imageUrl && !shotAssets.get(s.shotNumber)?.videoUrl,
    );
    if (shotsNeedingVideos.length === 0) return;

    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: shotsNeedingVideos.length });

    for (let i = 0; i < shotsNeedingVideos.length; i++) {
      setBatchProgress({ current: i + 1, total: shotsNeedingVideos.length });
      await generateShotVideo(shotsNeedingVideos[i]!);
    }

    setBatchGenerating(false);
    setBatchProgress(null);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!projectId) {
    return (
      <div className={`relative min-h-[80vh] ${gridOverlay}`}>
        <Crosshair x="20px" y="20px" />
        <Crosshair x="calc(100% - 40px)" y="20px" />
        <Crosshair x="20px" y="calc(100% - 40px)" />
        <Crosshair x="calc(100% - 40px)" y="calc(100% - 40px)" />

        <div className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-6">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mb-2 flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-[rgba(201,168,108,0.3)]" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
                  Specimen Chamber
                </span>
                <div className="h-px w-12 bg-[rgba(201,168,108,0.3)]" />
              </div>
              <h2 className="font-serif text-2xl font-light tracking-wide text-[#E8E8E8]">
                Obsidian Frames
              </h2>
              <p className="mt-1 font-serif text-sm italic text-[rgba(201,168,108,0.5)]">
                A Cartography of Temporal Units
              </p>
            </div>

            {/* Project selection or creation */}
            {projects.length > 0 ? (
              <div className={`overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0C0C0C] ${sprocketRail}`}>
                <div className="px-6 py-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px w-8 bg-[rgba(201,168,108,0.3)]" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
                      Select Specimen
                    </span>
                  </div>
                  <div className="space-y-2">
                    {projects.map((p, i) => (
                      <button
                        key={p.id}
                        onClick={() => setCurrentProject(p)}
                        className="group flex w-full items-center gap-4 rounded border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 text-left transition-all hover:border-[rgba(201,168,108,0.2)] hover:bg-[rgba(201,168,108,0.02)]"
                      >
                        <span className="font-mono text-[10px] text-[#444444]">
                          {String(i + 1).padStart(3, "0")}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm text-[#AAAAAA]">{p.name ?? p.id}</span>
                          <span className="block font-mono text-[10px] text-[#555555]">
                            {p.id} · {p.language ?? "zh"}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] text-[#444444] transition-colors group-hover:text-[#C9A86C]">
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 border-t border-[#1A1A1A] pt-4">
                    <button
                      onClick={() => setShowCreate(true)}
                      className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[#2A2A2A] px-4 py-3 text-sm text-[#666666] transition-colors hover:border-[rgba(201,168,108,0.2)] hover:text-[#C9A86C]"
                    >
                      <span className="font-mono text-xs">+</span>
                      新建项目
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0C0C0C] ${sprocketRail}`}>
                <div className="px-6 py-8 text-center">
                  <div className="mb-4 flex items-center justify-center gap-3">
                    <div className="h-px w-8 bg-[rgba(201,168,108,0.3)]" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
                      Empty Archive
                    </span>
                    <div className="h-px w-8 bg-[rgba(201,168,108,0.3)]" />
                  </div>
                  <p className="mb-2 text-sm text-[#E8E8E8]">尚无项目</p>
                  <p className="mb-6 font-mono text-xs text-[#555555]">
                    Create your first specimen to begin dissection
                  </p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className={BTN.primary}
                  >
                    新建项目
                  </button>
                </div>
              </div>
            )}

            {/* Create project modal — Obsidian Frames style */}
            {showCreate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className={`relative w-96 overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0C0C0C] ${sprocketRail}`}>
                  <div className="px-6 py-6">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="h-px w-8 bg-[rgba(201,168,108,0.3)]" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
                        New Specimen Registration
                      </span>
                    </div>
                    <h3 className="mb-4 font-serif text-lg font-light text-[#E8E8E8]">
                      新建项目
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[#555555]">
                          Project Name
                        </label>
                        <input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="项目名称"
                          className="w-full rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#444444] focus:border-[rgba(201,168,108,0.3)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[#555555]">
                          Language
                        </label>
                        <select
                          value={newLang}
                          onChange={(e) => setNewLang(e.target.value)}
                          className="w-full rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E8E8E8]"
                        >
                          <option value="zh">中文</option>
                          <option value="en">English</option>
                          <option value="ja">日本語</option>
                        </select>
                      </div>
                    </div>
                    {createError && (
                      <div className="mt-3 rounded border border-[rgba(201,104,90,0.2)] bg-[rgba(201,104,90,0.04)] px-3 py-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#C9685A]">
                          Error
                        </span>
                        <p className="mt-0.5 text-sm text-[#C9685A]">{createError}</p>
                      </div>
                    )}
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowCreate(false);
                          setCreateError(null);
                        }}
                        className={BTN.ghost}
                      >
                        取消
                      </button>
                      <button
                        onClick={handleCreate}
                        disabled={!newName.trim()}
                        className={BTN.primary}
                      >
                        创建
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-[80vh] ${gridOverlay}`}>
      {/* Registration marks at corners */}
      <Crosshair x="20px" y="20px" />
      <Crosshair x="calc(100% - 40px)" y="20px" />
      <Crosshair x="20px" y="calc(100% - 40px)" />
      <Crosshair x="calc(100% - 40px)" y="calc(100% - 40px)" />

      <div className="relative z-10 space-y-6">
        {/* === Specimen Header === */}
        <div className="flex flex-col gap-4 border-b border-[rgba(201,168,108,0.08)] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <div className="h-px w-12 bg-[rgba(201,168,108,0.3)]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
                Workshop · Specimen Chamber
              </span>
            </div>
            <h2 className="font-serif text-xl font-light tracking-wide text-[#E8E8E8] sm:text-2xl">
              Obsidian Frames
            </h2>
            <p className="mt-0.5 font-serif text-sm italic text-[rgba(201,168,108,0.6)]">
              A Cartography of Temporal Units
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-4 sm:gap-6">
            {/* Project switcher — always visible so user can switch projects */}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#555555]">
                Project
              </span>
              <select
                value={projectId ?? ""}
                onChange={(e) => {
                  const p = projects.find((p) => p.id === e.target.value);
                  if (p) setCurrentProject(p);
                }}
                className="rounded border border-[#1A1A1A] bg-[#0A0A0A] px-3 py-1.5 font-mono text-xs text-[#E8E8E8] focus:border-[rgba(201,168,108,0.3)] focus:outline-none"
              >
                {projects.length === 0 && <option value="">— 无项目 —</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.id}
                  </option>
                ))}
              </select>
            </div>
            <SpecimenLabel label="Specimen №" value="OF-2026" accent />
            <SpecimenLabel label="Quantum" value="4s — 15s" />
            <SpecimenLabel
              label="Phase"
              value={step === 1 ? "Selection" : step === 2 ? "Dissection" : "Quantization"}
              accent
            />
          </div>
        </div>

        {/* === Step Timeline (film strip style) — vertical on mobile, horizontal on desktop === */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
          {[
            { n: 1, label: "选择章节", en: "Selection" },
            { n: 2, label: "分镜脚本", en: "Dissection" },
            { n: 3, label: "镜头拆分", en: "Quantization" },
          ].map((s, i) => (
            <div key={s.n} className="flex flex-1 items-center sm:flex-row">
              {/* Film frame block */}
              <div
                className={`relative flex h-12 flex-1 items-center justify-between overflow-hidden border border-[#1A1A1A] px-3 sm:h-14 sm:px-4 ${
                  i < 2 ? "sm:border-r-0 sm:border-t sm:border-b sm:border-l" : "sm:border-y sm:border-l"
                } ${
                  step >= (s.n as 1 | 2 | 3)
                    ? "bg-[rgba(201,168,108,0.04)]"
                    : "bg-transparent"
                }`}
              >
                {/* Sprocket holes top */}
                <div className="absolute left-0 top-0 h-1.5 w-full bg-[repeating-linear-gradient(to_right,transparent_0,transparent_8px,#050505_8px,#050505_16px)] opacity-60" />
                {/* Sprocket holes bottom */}
                <div className="absolute bottom-0 left-0 h-1.5 w-full bg-[repeating-linear-gradient(to_right,transparent_0,transparent_8px,#050505_8px,#050505_16px)] opacity-60" />
                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-mono text-base sm:text-lg ${
                      step >= (s.n as 1 | 2 | 3)
                        ? "text-[#C9A86C]"
                        : "text-[#444444]"
                    }`}
                  >
                    {String(s.n).padStart(2, "0")}
                  </span>
                  <span
                    className={`text-xs sm:text-sm ${
                      step >= (s.n as 1 | 2 | 3)
                        ? "text-[#E8E8E8]"
                        : "text-[#555555]"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#444444]">
                  {s.en}
                </span>
              </div>
              {/* Connector — only on desktop */}
              {i < 2 && (
                <div className="hidden h-px w-4 bg-[#1A1A1A] sm:block" />
              )}
            </div>
          ))}
        </div>

        {(script || shotList) && (
          <div className="flex justify-end">
            <button className={BTN.ghost} onClick={reset}>
              重新开始
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-[rgba(201,104,90,0.2)] bg-[rgba(201,104,90,0.04)] px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#C9685A]">
              Error
            </span>
            <p className="mt-1 text-sm text-[#C9685A]">{error}</p>
          </div>
        )}

        {/* === Step 1: Chapter Selection === */}
        {step === 1 && (
          <div className="relative overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0C0C0C]">
            {/* Sprocket rails */}
            <div className={`flex ${sprocketRail}`}>
              <div className="flex-1 px-6 py-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px w-8 bg-[rgba(201,168,108,0.3)]" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
                    Phase 01 — Specimen Selection
                  </span>
                </div>

                {chaptersLoading ? (
                  <div className="flex items-center gap-3 py-8">
                    <div className="h-4 w-4 animate-spin rounded-full border border-[#333333] border-t-[#C9A86C]" />
                    <span className="font-mono text-xs text-[#666666]">
                      Scanning archive...
                    </span>
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="font-mono text-xs text-[#555555]">
                      No specimens found in archive
                    </p>
                    <p className="mt-2 text-sm text-[#666666]">
                      请先在写作模块创建章节
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-[#E8E8E8]">
                      选择一个章节作为分镜素材。已有的角色、场景、道具将自动被引用。
                    </p>
                    <div className="space-y-2">
                      {chapters.map((ch, i) => (
                        <button
                          key={ch.id}
                          onClick={() => setSelectedChapterId(ch.id)}
                          className={`group flex w-full items-center gap-4 rounded border px-4 py-3 text-left transition-all ${
                            selectedChapterId === ch.id
                              ? "border-[rgba(201,168,108,0.3)] bg-[rgba(201,168,108,0.03)]"
                              : "border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#2A2A2A]"
                          }`}
                        >
                          <span className="font-mono text-[10px] text-[#444444]">
                            {String(i + 1).padStart(3, "0")}
                          </span>
                          <span
                            className={`font-mono text-xs ${
                              selectedChapterId === ch.id
                                ? "text-[#C9A86C]"
                                : "text-[#666666]"
                            }`}
                          >
                            {ch.id}
                          </span>
                          <span className="flex-1 text-sm text-[#AAAAAA]">
                            {ch.title}
                          </span>
                          {selectedChapterId === ch.id && (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[#C9A86C]">
                              ● Selected
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <button
                        className={BTN.primary}
                        onClick={generateScript}
                        disabled={!selectedChapterId || scriptLoading}
                      >
                        {scriptLoading ? "解剖中..." : "生成分镜脚本"}
                      </button>
                      {scriptLoading && (
                        <span className="font-mono text-[10px] text-[#555555]">
                          Dissecting narrative structure...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === Step 2: Storyboard Script (Scene Dissection) === */}
        {step >= 2 && script && (
          <div className="relative overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0C0C0C]">
            <div className={`flex ${sprocketRail}`}>
              <div className="flex-1 px-6 py-8">
                {/* Script header */}
                <div className="mb-6 flex flex-col gap-3 border-b border-[#1A1A1A] pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-3">
                      <div className="h-px w-8 bg-[rgba(201,168,108,0.3)]" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
                        Phase 02 — Narrative Dissection
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-light text-[#E8E8E8] sm:text-xl">
                      {script.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#E8E8E8]">
                      {script.summary}
                    </p>
                  </div>
                  <div className="flex gap-4 sm:gap-6">
                    <SpecimenLabel
                      label="Scenes"
                      value={String((script.scenes ?? []).length)}
                      accent
                    />
                    <SpecimenLabel
                      label="Total"
                      value={`${(script.scenes ?? []).reduce((s, sc) => s + sc.estimatedDuration, 0)}s`}
                    />
                  </div>
                </div>

                {/* Scene cards — film frames */}
                <div className="space-y-3">
                  {(script.scenes ?? []).map((scene, idx) => (
                    <div
                      key={`scene-${scene.sceneNumber}-${idx}`}
                      className="group relative overflow-hidden rounded border border-[#1A1A1A] bg-[#0A0A0A] transition-colors hover:border-[rgba(201,168,108,0.15)]"
                    >
                      {/* Sprocket holes — left rail */}
                      <div className="absolute left-0 top-0 h-full w-2 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_5px,#050505_5px,#050505_11px)] opacity-50" />
                      <div className="absolute right-0 top-0 h-full w-2 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_5px,#050505_5px,#050505_11px)] opacity-50" />

                      <div className="px-5 py-4">
                        {/* Frame header */}
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-baseline gap-3">
                            <span className="font-mono text-[10px] text-[#444444]">
                              FR.{String(scene.sceneNumber).padStart(3, "0")}
                            </span>
                            <span className="text-sm font-medium text-[#C9A86C]">
                              {scene.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[#555555]">
                              {scene.mood}
                            </span>
                            <span className="font-mono text-xs text-[#C9A86C]">
                              {scene.estimatedDuration}s
                            </span>
                          </div>
                        </div>

                        {/* Frame content */}
                        <p className="mt-2 text-sm leading-relaxed text-[#AAAAAA]">
                          {scene.description}
                        </p>

                        {/* Frame metadata — clinical labels */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[#141414] pt-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[#444444]">
                              LOC
                            </span>
                            <span className="text-xs text-[#C8C8C8]">
                              {scene.location}
                            </span>
                          </div>
                          {(scene.characters ?? []).length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#444444]">
                                CHAR
                              </span>
                              <span className="text-xs text-[#999999]">
                                {scene.characters.join(" · ")}
                              </span>
                            </div>
                          )}
                          {(scene.props ?? []).length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#444444]">
                                PROP
                              </span>
                              <span className="text-xs text-[#C8C8C8]">
                                {scene.props.join(" · ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action bar */}
                {step === 2 && (
                  <div className="mt-6 flex flex-col gap-4 border-t border-[#1A1A1A] pt-5 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#555555]">
                        Max Duration
                      </span>
                      <div className="flex gap-1">
                        {[5, 8, 10, 15].map((d) => (
                          <button
                            key={d}
                            onClick={() => setMaxDuration(d)}
                            className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
                              maxDuration === d
                                ? "border-[rgba(201,168,108,0.3)] bg-[rgba(201,168,108,0.06)] text-[#C9A86C]"
                                : "border-[#1A1A1A] bg-[#0A0A0A] text-[#666666] hover:border-[#2A2A2A]"
                            }`}
                          >
                            {d}s
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      className={BTN.primary}
                      onClick={splitShots}
                      disabled={shotsLoading}
                    >
                      {shotsLoading ? "量子化中..." : "拆分镜头"}
                    </button>
                    {shotsLoading && (
                      <span className="font-mono text-[10px] text-[#555555]">
                        Quantizing temporal units...
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === Step 3: Shot List (Temporal Quantization) === */}
        {step === 3 && shotList && (
          <div className="relative overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0C0C0C]">
            <div className={`flex ${sprocketRail}`}>
              <div className="flex-1 px-6 py-8">
                {/* Shot list header */}
                <div className="mb-6 flex flex-col gap-3 border-b border-[#1A1A1A] pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-3">
                      <div className="h-px w-8 bg-[rgba(201,168,108,0.3)]" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">
                        Phase 03 — Temporal Quantization
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-light text-[#E8E8E8] sm:text-xl">
                      镜头列表
                    </h3>
                    <p className="mt-1 font-serif text-sm italic text-[rgba(201,168,108,0.5)]">
                      the invisible art of decomposition
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 sm:gap-6">
                    <SpecimenLabel
                      label="Shots"
                      value={String((shotList.shots ?? []).length)}
                      accent
                    />
                    <SpecimenLabel
                      label="Total"
                      value={`${shotList.totalDuration}s`}
                    />
                    {/* Batch generation buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={batchGenerateImages}
                        disabled={batchGenerating}
                        className="rounded border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#E8E8E8] transition-colors hover:border-[rgba(201,168,108,0.4)] hover:text-[#C9A86C] disabled:opacity-40"
                      >
                        {batchGenerating && batchProgress ? `批量 ${batchProgress.current}/${batchProgress.total}` : "批量生图"}
                      </button>
                      <button
                        onClick={batchGenerateVideos}
                        disabled={batchGenerating}
                        className="rounded border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#E8E8E8] transition-colors hover:border-[rgba(201,168,108,0.4)] hover:text-[#C9A86C] disabled:opacity-40"
                      >
                        批量生视频
                      </button>
                    </div>
                  </div>
                </div>

                {/* Shot cards — individual film frames */}
                <div className="space-y-3">
                  {(shotList.shots ?? []).map((shot, idx) => (
                    <div
                      key={`shot-${shot.shotNumber}-${idx}`}
                      className="group relative overflow-hidden rounded border border-[#1A1A1A] bg-[#0A0A0A] transition-colors hover:border-[rgba(201,168,108,0.15)]"
                    >
                      {/* Sprocket holes */}
                      <div className="absolute left-0 top-0 h-full w-2 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_5px,#050505_5px,#050505_11px)] opacity-50" />
                      <div className="absolute right-0 top-0 h-full w-2 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_5px,#050505_5px,#050505_11px)] opacity-50" />

                      <div className="px-5 py-4">
                        {/* Frame header */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-baseline gap-3">
                            <span className="font-mono text-[10px] text-[#444444]">
                              SH.{String(shot.shotNumber).padStart(3, "0")}
                            </span>
                            <span className="text-sm font-medium text-[#C9A86C]">
                              镜头 {shot.shotNumber}
                            </span>
                            <span className="font-mono text-[10px] text-[#555555]">
                              / Scene {shot.sceneNumber}
                            </span>
                          </div>
                          {/* Technical metadata — clinical chips */}
                          <div className="flex flex-wrap items-center gap-2">
                            {[
                              { label: "DUR", val: `${shot.duration}s` },
                              { label: "AR", val: shot.aspectRatio },
                              { label: "CAM", val: shot.cameraMovement },
                              { label: "LUX", val: shot.lighting },
                            ].map((chip) => (
                              <div
                                key={chip.label}
                                className="flex items-center gap-1 rounded border border-[#1A1A1A] bg-[#0F0F0F] px-2 py-0.5"
                              >
                                <span className="font-mono text-[8px] uppercase tracking-wider text-[#444444]">
                                  {chip.label}
                                </span>
                                <span className="font-mono text-[10px] text-[#999999]">
                                  {chip.val}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="mt-2 text-sm leading-relaxed text-[#AAAAAA]">
                          {shot.description}
                        </p>

                        {/* Prompt — monospace code block */}
                        <div className="mt-3 rounded border border-[#141414] bg-[#080808] px-3 py-2">
                          <div className="mb-1 flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-[rgba(201,168,108,0.4)]" />
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[#444444]">
                              Generation Prompt
                            </span>
                          </div>
                          <p className="font-mono text-xs leading-relaxed text-[#E8E8E8]">
                            {shot.prompt}
                          </p>
                        </div>

                        {/* Dialogue */}
                        {shot.dialogue && (
                          <p className="mt-2 pl-3 border-l border-[rgba(201,168,108,0.15)] text-xs italic text-[#C8C8C8]">
                            「{shot.dialogue}」
                          </p>
                        )}

                        {/* Asset references */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[#141414] pt-3">
                          {shot.characters.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#444444]">
                                CHAR
                              </span>
                              <span className="text-xs text-[#999999]">
                                {shot.characters.join(" · ")}
                              </span>
                            </div>
                          )}
                          {shot.scenes.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#444444]">
                                SCN
                              </span>
                              <span className="text-xs text-[#C8C8C8]">
                                {shot.scenes.join(" · ")}
                              </span>
                            </div>
                          )}
                          {shot.props.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#444444]">
                                PROP
                              </span>
                              <span className="text-xs text-[#C8C8C8]">
                                {shot.props.join(" · ")}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Generation actions + results */}
                        <div className="mt-3 border-t border-[#141414] pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => generateShotImage(shot)}
                              disabled={shotLoading.get(shot.shotNumber) === "image"}
                              className="rounded border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#E8E8E8] transition-colors hover:border-[rgba(201,168,108,0.2)] hover:text-[#C9A86C] disabled:opacity-40"
                            >
                              {shotLoading.get(shot.shotNumber) === "image" ? "生成中..." : "生成分镜图"}
                            </button>
                            <button
                              onClick={() => generateShotVideo(shot)}
                              disabled={shotLoading.get(shot.shotNumber) === "video" || !shotAssets.get(shot.shotNumber)?.imageUrl}
                              className="rounded border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#E8E8E8] transition-colors hover:border-[rgba(201,168,108,0.2)] hover:text-[#C9A86C] disabled:opacity-40"
                            >
                              {shotLoading.get(shot.shotNumber) === "video" ? "生成中..." : "生成视频"}
                            </button>
                            {!shotAssets.get(shot.shotNumber)?.imageUrl && (
                              <span className="font-mono text-[9px] text-[#444444]">
                                先生成分镜图再做图生视频
                              </span>
                            )}
                          </div>

                          {shotAssets.get(shot.shotNumber)?.imageUrl && (
                            <div className="mt-3 rounded border border-[#141414] bg-[#080808] p-2">
                              <div className="mb-1.5 flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-[rgba(201,168,108,0.4)]" />
                                <span className="font-mono text-[9px] uppercase tracking-wider text-[#444444]">
                                  Storyboard Image
                                </span>
                              </div>
                              <img
                                src={proxyImageUrl(shotAssets.get(shot.shotNumber)!.imageUrl)}
                                alt={`Shot ${shot.shotNumber}`}
                                className="max-h-48 w-full rounded object-cover"
                              />
                            </div>
                          )}

                          {shotAssets.get(shot.shotNumber)?.videoUrl && (
                            <div className="mt-2 rounded border border-[#141414] bg-[#080808] p-2">
                              <div className="mb-1.5 flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-[rgba(201,168,108,0.6)]" />
                                <span className="font-mono text-[9px] uppercase tracking-wider text-[#C9A86C]">
                                  Generated Video
                                </span>
                              </div>
                              <video
                                src={proxyImageUrl(shotAssets.get(shot.shotNumber)!.videoUrl)}
                                controls
                                className="max-h-56 w-full rounded"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Duration spectrum at bottom */}
                <div className="mt-8 border-t border-[#1A1A1A] pt-4">
                  <DurationSpectrum durations={shotList.shots.map((s) => s.duration)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
