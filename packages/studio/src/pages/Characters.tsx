import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useProjectStore } from "../store/project.js";
import { useTaskStore } from "../store/tasks.js";
import { apiGet, apiPost, apiPut, apiDelete, proxyImageUrl } from "../api/client.js";
import { TextInput, TextArea, Modal, ConfirmDialog, BTN } from "../components/ui.tsx";
import type { PersonaCard, PersonaData, CharacterVoice, CharactersResponse, DeleteResponse } from "../shared/types.js";
import type { JSX } from "react";
import { EMPTY_FORM, EMPTY_VOICE, DEFAULT_PREVIEW_TEXT, VOICE_PROVIDERS, coverColor } from "./characters-utils.js";
import type { ConfirmedSlotEntry, SlotViewState, PendingCharacter } from "./characters-utils.js";
import { EmptyState } from "../components/EmptyState.js";
import { CharacterCard } from "./CharacterCard.js";
import { ImageSelectionModal } from "./ImageSelectionModal.js";
import { ConfirmedSlotNavigator } from "./ConfirmedSlotNavigator.js";
import { PendingCharacterStrip } from "./PendingCharacterStrip.js";
import { CharacterDetailPanel } from "./CharacterDetailPanel.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  id: string;
  name: string;
  type?: "long" | "short";
  genre?: string;
  coverUrl?: string;
  createdAt?: string;
  blueprint?: { premise?: string; sellingPoints?: string };
}

interface AssetEntry {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  firstChapter: number;
  lastChapter: number;
  appearanceCount: number;
  attributes: Record<string, string>;
}

interface GlobalCharacter {
  filename: string;
  projectId: string;
  name: string;
  description: string;
  personality: string;
  roleType: string;
  avatar: string;
  allImages: string[];
  pendingSelection: boolean;
}

// ---------------------------------------------------------------------------
// Main Characters page — two-layer navigation
// ---------------------------------------------------------------------------

export default function Characters(): JSX.Element {
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  // Layer state: null = overview (folders), string = viewing characters of projectId
  // Always start at Layer 1 (overview) — user picks a novel folder to enter
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [characters, setCharacters] = useState<PersonaCard[]>([]);
  const [assetMap, setAssetMap] = useState<Record<string, AssetEntry>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonaCard | null>(null);
  const [form, setForm] = useState<PersonaData>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<PersonaCard | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [voice, setVoice] = useState<CharacterVoice>(EMPTY_VOICE);
  const [voiceDesignPrompt, setVoiceDesignPrompt] = useState("");
  const [designing, setDesigning] = useState(false);
  // TTS providers with voice lists (includes custom voices merged by backend)
  const [ttsProviders, setTtsProviders] = useState<Array<{ id: string; voices: Array<{ id: string; name: string }> }>>([]);
  // 确选卡导航: entered=是否点开书封面, mode=动漫/写实, gender=男/女, role=主配角/NPC
  const [slotView, setSlotView] = useState<SlotViewState>({ entered: false, mode: null, gender: null, role: null });
  const [selectionCard, setSelectionCard] = useState<(PersonaCard & { projectId?: string }) | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [matching, setMatching] = useState(false);
  const [confirmedSlots, setConfirmedSlots] = useState<ConfirmedSlotEntry[]>([]);
  const [pendingCharacters, setPendingCharacters] = useState<PendingCharacter[]>([]);
  const [globalCharacters, setGlobalCharacters] = useState<GlobalCharacter[]>([]);
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string; projectName: string } | null>(null);
  const [generatingCover, setGeneratingCover] = useState<string | null>(null); // 正在生成封面的 projectId
  // 角色详情弹窗
  const [detailCard, setDetailCard] = useState<PersonaCard | null>(null);
  const charactersRef = useRef<PersonaCard[]>([]);
  // Keep the ref in sync via an effect rather than assigning during render
  // (assigning during render can produce stale reads under concurrent mode).
  useEffect(() => { charactersRef.current = characters; }, [characters]);
  // P1 fix: track latest selectedProjectId to prevent stale fetch overwrites
  const currentProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  // Watch for completed background tasks — auto-refresh relevant data.
  const taskTasks = useTaskStore((s) => s.tasks);
  const lastTaskRefreshRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastTaskRefreshRef.current < 2000) return; // Throttle
    // Check for recently completed tasks related to this page.
    const recentlyCompleted = taskTasks.filter(
      (t) =>
        (t.status === "completed" || t.status === "failed") &&
        now - t.updatedAt < 5000 &&
        (t.type === "generate-three-view" ||
          t.type === "generate-mj-avatar" ||
          t.type === "generate-cover"),
    );
    if (recentlyCompleted.length === 0) return;
    lastTaskRefreshRef.current = now;
    // Cancel flag + project snapshot: prevents stale setState if the user
    // switches projects while the async refresh is in flight.
    let cancelled = false;
    const projectIdSnapshot = selectedProjectId;
    // Refresh the relevant data.
    void (async () => {
      // Refresh characters for the current project.
      if (projectIdSnapshot) {
        try {
          const data = await apiGet<CharactersResponse>(`/projects/${projectIdSnapshot}/characters`);
          if (cancelled) return;
          // Only apply if the user hasn't switched to another project.
          if (data.characters && currentProjectIdRef.current === projectIdSnapshot) {
            const mapped = data.characters.map((c) => ({
              ...c,
              filename: c.filename ?? "",
            }));
            setCharacters(mapped);
          }
        } catch { /* non-fatal */ }
      }
      // Refresh pending + confirmed slots.
      try {
        const [slotData, pendingData] = await Promise.all([
          apiGet<{ entries: ConfirmedSlotEntry[] }>("/plus/confirmed-slot"),
          apiGet<{ pending: PendingCharacter[] }>("/characters/pending"),
        ]);
        if (cancelled) return;
        setConfirmedSlots(slotData.entries ?? []);
        setPendingCharacters(pendingData.pending ?? []);
      } catch { /* non-fatal */ }
      // Refresh projects (for cover URL updates).
      await fetchProjects();
      if (cancelled) return;
      // Clear generating state for completed/failed tasks only.
      const completedFilenames = recentlyCompleted
        .filter((t) => t.type === "generate-three-view" && t.meta?.filename)
        .map((t) => t.meta!.filename as string);
      if (completedFilenames.length > 0) {
        setGenerating((prev) => {
          const s = new Set(prev);
          for (const f of completedFilenames) s.delete(f);
          return s;
        });
      }
      setGeneratingCover(null);
    })();
    return () => { cancelled = true; };
  }, [taskTasks, selectedProjectId, fetchProjects]);

  // Fetch confirmed slots (global, not per-project) + pending characters + all characters
  useEffect(() => {
    void (async () => {
      try {
        const [slotData, pendingData, allData] = await Promise.all([
          apiGet<{ entries: ConfirmedSlotEntry[] }>("/plus/confirmed-slot"),
          apiGet<{ pending: PendingCharacter[] }>("/characters/pending"),
          apiGet<{ characters: GlobalCharacter[] }>("/characters/all"),
        ]);
        setConfirmedSlots(slotData.entries ?? []);
        setPendingCharacters(pendingData.pending ?? []);
        setGlobalCharacters(allData.characters ?? []);
      } catch {
        // Non-fatal
      }
    })();

    // Fetch TTS providers (voice lists include custom voices merged by backend)
    apiGet<{ providers: Array<{ id: string; voices: Array<{ id: string; name: string }> }> }>("/tts/config")
      .then((d) => setTtsProviders(d.providers ?? []))
      .catch(() => { /* non-fatal */ });
  }, []);

  // Fetch characters + asset catalog when a project is selected
  const fetchCharacters = useCallback(async (id: string): Promise<void> => {
    try {
      const [charData, assetData] = await Promise.all([
        apiGet<CharactersResponse>(`/projects/${id}/characters`),
        apiGet<{ assets: AssetEntry[] }>(`/projects/${id}/assets/characters`).catch(() => ({ assets: [] })),
      ]);
      // P1 fix: bail out if user has switched to a different project
      if (currentProjectIdRef.current !== id) return;
      const list = charData.characters ?? [];
      setCharacters(list);

      // Build asset map for weight sorting
      const amap: Record<string, AssetEntry> = {};
      for (const a of assetData.assets ?? []) {
        amap[a.name] = a;
        for (const alias of (a.aliases ?? [])) amap[alias] = a;
      }
      setAssetMap(amap);

      // Seed avatars
      const seeded: Record<string, string> = {};
      for (const c of list) {
        const url = c.data.extensions?.tavernos?.avatar;
        if (url) seeded[c.filename] = url;
      }
      if (Object.keys(seeded).length > 0) {
        setAvatars((prev) => ({ ...seeded, ...prev }));
      }
    } catch (e) {
      if (currentProjectIdRef.current !== id) return;
      setCharacters([]);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    currentProjectIdRef.current = selectedProjectId;
    if (selectedProjectId) void fetchCharacters(selectedProjectId);
    else { setCharacters([]); setAssetMap({}); }
  }, [selectedProjectId, fetchCharacters]);

  // --- Compute sorted characters by weight ---
  // Weight = appearanceCount from asset-catalog (higher = more important).
  // Characters not in asset-catalog get weight 0 (manual cards).
  // Auto-synced cards without asset data get weight 0.5 (above manual).
  const sortedCharacters = useMemo(() => [...characters].sort((a, b) => {
    const wa = a.data.name ? (assetMap[a.data.name]?.appearanceCount ?? (a.data.extensions?.tavernos?.autoSynced ? 0.5 : 0)) : 0;
    const wb = b.data.name ? (assetMap[b.data.name]?.appearanceCount ?? (b.data.extensions?.tavernos?.autoSynced ? 0.5 : 0)) : 0;
    return wb - wa;
  }), [characters, assetMap]);

  // Count characters pending image selection (4-to-1 pick).
  const pendingCount = characters.filter(
    (c) => c.data.extensions?.tavernos?.pendingSelection === true,
  ).length;

  // --- Handlers ---
  const update = (field: keyof PersonaData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const openNew = (): void => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setVoice(EMPTY_VOICE);
    setVoiceDesignPrompt("");
    setModalOpen(true);
  };

  const openEdit = (card: PersonaCard): void => {
    setEditing(card);
    setForm({
      name: card.data.name ?? "",
      description: card.data.description ?? "",
      personality: card.data.personality ?? "",
      scenario: card.data.scenario ?? "",
      first_mes: card.data.first_mes ?? "",
      // Preserve existing extensions (avatar, allImages, roleType, gender, etc.)
      // so PUT doesn't overwrite them with empty values.
      extensions: card.data.extensions ?? {},
    });
    const extVoice = card.data.extensions?.tavernos?.voice;
    setVoice(extVoice ?? EMPTY_VOICE);
    setVoiceDesignPrompt("");
    setModalOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!selectedProjectId || !form.name.trim()) return;
    try {
      const payload: PersonaData = {
        ...form,
        extensions: {
          ...(form.extensions ?? {}),
          tavernos: {
            ...(form.extensions?.tavernos ?? {}),
            voice: voice.enabled ? voice : undefined,
          },
        },
      };
      if (editing) {
        await apiPut(
          `/projects/${selectedProjectId}/characters/${encodeURIComponent(editing.filename)}`,
          payload,
        );
      } else {
        await apiPost(`/projects/${selectedProjectId}/characters`, payload);
      }
      setModalOpen(false);
      await fetchCharacters(selectedProjectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedProjectId || !confirmDelete) return;
    try {
      await apiDelete<DeleteResponse>(
        `/projects/${selectedProjectId}/characters/${encodeURIComponent(confirmDelete.filename)}`,
      );
      setConfirmDelete(null);
      await fetchCharacters(selectedProjectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDesignVoice = async (): Promise<void> => {
    if (!voiceDesignPrompt.trim() || !form.name.trim()) return;
    setDesigning(true);
    setError(null);
    try {
      const voiceId = `char_${form.name.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Date.now().toString(36)}`;
      const result = await apiPost<{ voiceId: string; raw: unknown }>(
        "/voices/minimax/design",
        { prompt: voiceDesignPrompt, preview_text: DEFAULT_PREVIEW_TEXT, voice_id: voiceId, aigc_watermark: false },
      );
      setVoice((prev) => ({ ...prev, enabled: true, provider: "yunwu-minimax", voiceId: result.voiceId ?? voiceId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDesigning(false);
    }
  };

  const handleGenerateAvatar = async (card: PersonaCard): Promise<void> => {
    if (!selectedProjectId) return;
    setGenerating((prev) => new Set(prev).add(card.filename));
    setError(null);
    try {
      // API now returns { taskId, status: "running" } — generation runs in background.
      await apiPost<{ taskId: string; status: string }>(
        `/projects/${selectedProjectId}/characters/${encodeURIComponent(card.filename)}/generate-three-view`,
        {},
      );
      // Don't wait — the task store + useEffect will auto-refresh when complete.
      // TaskIndicator shows progress globally.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setGenerating((prev) => { const s = new Set(prev); s.delete(card.filename); return s; });
    }
  };

  const handleSelectNovel = (p: Project): void => {
    setCurrentProject(p);
    setSelectedProjectId(p.id);
    setError(null);
  };

  // 生成小说封面
  const handleGenerateCover = async (projectId: string): Promise<void> => {
    setGeneratingCover(projectId);
    setContextMenu(null);
    try {
      // API now returns { taskId, status: "running" } — generation runs in background.
      await apiPost<{ taskId: string; status: string }>(`/projects/${projectId}/generate-cover`, {});
      // Don't wait — the task store + useEffect will auto-refresh when complete.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setGeneratingCover(null);
    }
  };

  // 删除小说项目
  const handleDeleteProject = async (projectId: string, projectName: string): Promise<void> => {
    setContextMenu(null);
    // Use the custom ConfirmDialog instead of the native confirm() — the
    // native dialog is blocked/suppressed in some Electron configurations and
    // cannot be styled to match the app.
    setConfirmDeleteProject({ id: projectId, name: projectName });
  };

  // Actually delete the project after the user confirms in the dialog.
  const confirmProjectDelete = async (): Promise<void> => {
    if (!confirmDeleteProject) return;
    const { id: projectId } = confirmDeleteProject;
    try {
      await apiDelete(`/projects/${projectId}`);
      // 刷新项目列表
      await fetchProjects();
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
        setCurrentProject(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConfirmDeleteProject(null);
    }
  };

  // 右键菜单关闭：点击任意位置关闭菜单
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [contextMenu]);

  const handlePendingSelect = (pc: PendingCharacter): void => {
    // Build the selection card in a single setState call (previously two
    // calls caused a render with a card missing projectId).
    setSelectionCard({
      filename: pc.filename,
      projectId: pc.projectId,
      data: {
        name: pc.name,
        description: "",
        personality: "",
        extensions: {
          tavernos: {
            avatar: pc.avatar,
            allImages: pc.allImages,
            pendingSelection: true,
          },
        },
      },
    } as unknown as PersonaCard & { projectId?: string });
  };

  const handleSelectImage = async (url: string): Promise<void> => {
    if (!selectionCard) return;
    // Logic flow:
    //  1. Determine which project the character card belongs to. The card's
    //     `projectId` may be "_plus_pending" (a Plus-generated character that
    //     hasn't been assigned to a book yet) or a concrete project id.
    //  2. `targetProjectId` is only set when the card is still pending
    //     ("_plus_pending") AND the user currently has a project open — in that
    //     case the confirmed character is auto-moved into that project. When no
    //     project is open, the character stays in the pending pool
    //     ("_plus_pending") and can be assigned later by a scheduled task or
    //     manually. This is intentional so users aren't forced to pick a target.
    //  3. After the backend confirms the selection, refresh local avatar state,
    //     close the selection card, and re-fetch characters / pending / slots.
    setSelecting(true);
    setError(null);
    try {
      // selectionCard.projectId 可能是 "_plus_pending"（Plus 生成角色）或具体项目 ID。
      // 对于 _plus_pending 角色，不强制选择目标项目——角色卡可以保留在待选区，
      // 后续由定时任务或用户手动分配到书籍项目中。
      const cardProjectId = selectionCard.projectId || selectedProjectId || "_plus_pending";
      // 如果当前有选中的项目，自动将确认的角色移动到该项目；否则保留在 _plus_pending。
      const targetProjectId =
        cardProjectId === "_plus_pending" ? (selectedProjectId ?? undefined) : undefined;
      await apiPost(
        `/projects/${cardProjectId}/characters/${encodeURIComponent(selectionCard.filename)}/select-image`,
        {
          selectedUrl: url,
          targetProjectId,
        },
      );
      // Update local avatar state.
      setAvatars((prev) => ({ ...prev, [selectionCard.filename]: url }));
      setSelectionCard(null);
      // 刷新角色列表、pending 列表和确选槽
      if (selectedProjectId) await fetchCharacters(selectedProjectId);
      try {
        const pendingData = await apiGet<{ pending: PendingCharacter[] }>("/characters/pending");
        setPendingCharacters(pendingData.pending ?? []);
      } catch { /* non-fatal */ }
      try {
        const slotData = await apiGet<{ entries: ConfirmedSlotEntry[] }>("/plus/confirmed-slot");
        setConfirmedSlots(slotData.entries ?? []);
      } catch { /* non-fatal */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSelecting(false);
    }
  };

  const handleMatchCharacters = async (): Promise<void> => {
    if (!selectedProjectId) return;
    setMatching(true);
    setError(null);
    try {
      const res = await apiPost<{ matched: number; total: number; message?: string; error?: string; results?: Array<{ name: string; matched: boolean; imageName?: string; confidence?: number; reason?: string }> }>(
        `/projects/${selectedProjectId}/match-characters`,
        {},
      );
      if (res.error) {
        setError(res.error);
      } else if (res.message) {
        setError(res.message);
      } else if (res.results) {
        const matched = res.results.filter((r) => r.matched);
        const unmatched = res.results.filter((r) => !r.matched);
        if (matched.length > 0) {
          const matchDetail = matched.map((m) => `${m.name}→${m.imageName ?? "?"}(${m.confidence ?? 0}%)`).join("，");
          const unmatchDetail = unmatched.length > 0
            ? `；未匹配：${unmatched.map((u) => `${u.name}(${u.confidence ?? 0}%，${u.reason ?? ""})`).join("，")}`
            : "";
          setError(`匹配完成：${matched.length}/${res.total} 个角色匹配成功 — ${matchDetail}${unmatchDetail}`);
        } else {
          const unmatchDetail = res.results.map((u) => `${u.name}(${u.confidence ?? 0}%，${u.reason ?? ""})`).join("，");
          setError(`匹配完成：0/${res.total} 个角色匹配成功 — 所有角色符合度均低于70% — ${unmatchDetail}`);
        }
      }
      // 刷新角色列表和确选槽
      await fetchCharacters(selectedProjectId);
      try {
        const slotData = await apiGet<{ entries: ConfirmedSlotEntry[] }>("/plus/confirmed-slot");
        setConfirmedSlots(slotData.entries ?? []);
      } catch { /* non-fatal */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setMatching(false);
    }
  };

  const handleBackToSelector = (): void => {
    setSelectedProjectId(null);
    setCharacters([]);
    setAssetMap({});
    setError(null);
  };

  // --- Render: Layer 1 (character management overview) ---
  if (!selectedProjectId) {
    // Group global characters by projectId
    const charsByProject: Record<string, GlobalCharacter[]> = {};
    for (const gc of globalCharacters) {
      if (!charsByProject[gc.projectId]) charsByProject[gc.projectId] = [];
      charsByProject[gc.projectId].push(gc);
    }
    const allProjectIds = Array.from(new Set([
      ...projects.map((p) => p.id),
      ...Object.keys(charsByProject),
    ]));

    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-light">角色管理</h1>
          <p className="mt-0.5 text-sm text-gray-500">管理对话角色和群组角色</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">
            {error}
          </p>
        )}

        {/* 待挑选头像 (4-to-1) */}
        <PendingCharacterStrip
          pendingCharacters={pendingCharacters}
          onSelect={handlePendingSelect}
        />

        {/* 确选卡 — 书封面 + 多级导航 */}
        <ConfirmedSlotNavigator
          confirmedSlots={confirmedSlots}
          slotView={slotView}
          setSlotView={setSlotView}
        />

        {/* 小说角色 — folder cards */}
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-medium text-gray-400">小说角色</h2>
          <span className="text-xs text-gray-600">
            {allProjectIds.length} 本小说
          </span>
        </div>
        {allProjectIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2A2A2A] p-12 text-center text-gray-500">
            暂无小说项目
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {allProjectIds.map((pid) => {
              const proj = projects.find((p) => p.id === pid);
              const projChars = charsByProject[pid] ?? [];
              const displayName = proj?.name ?? pid;
              const colors = coverColor(displayName);
              const hasPending = projChars.some((gc) => gc.pendingSelection);
              const isGeneratingCover = generatingCover === pid;
              return (
                <div
                  key={pid}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] transition-all hover:border-[#C9A86C]/30 hover:shadow-2xl"
                  style={{ width: 120 }}
                  onClick={() => {
                    if (proj) {
                      handleSelectNovel(proj);
                    } else {
                      setSelectedProjectId(pid);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, projectId: pid, projectName: displayName });
                  }}
                >
                  <div className="relative h-44 bg-[#0A0A0A]">
                    {proj?.coverUrl ? (
                      <img
                        src={proxyImageUrl(proj.coverUrl)}
                        alt={displayName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${colors.bg}`}>
                        {isGeneratingCover && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <span className="text-xs text-[#C9A86C] animate-pulse">生成封面中…</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    {projChars.length > 0 && (
                      <div className="absolute right-2 top-2 flex -space-x-1.5">
                        {projChars.slice(0, 3).map((gc) => (
                          <div key={gc.filename} className="h-6 w-6 overflow-hidden rounded-full border border-[#0F0F0F] bg-[#1A1A1A]">
                            {gc.avatar && (
                              <img
                                src={proxyImageUrl(gc.avatar)}
                                alt={gc.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {hasPending && (
                      <span className="absolute left-2 top-2 rounded bg-[rgba(201,104,90,0.8)] px-1 py-0.5 text-[9px] text-white">
                        待选图
                      </span>
                    )}
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <p className="truncate text-sm font-medium text-[#C9A86C]">{displayName}</p>
                      <p className="text-[9px] text-gray-500">{projChars.length} 个角色</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 右键菜单 */}
        {contextMenu && (
          <div
            className="fixed z-50 min-w-[160px] rounded-lg border border-[#2A2A2A] bg-[#141414] py-1 shadow-2xl popover-enter"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-[#1F1F1F] hover:text-[#C9A86C] transition-colors"
              onClick={() => void handleGenerateCover(contextMenu.projectId)}
            >
              {generatingCover === contextMenu.projectId ? "生成中…" : "生成封面"}
            </button>
            <button
              className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-[#1F1F1F] hover:text-[#C9A86C] transition-colors"
              onClick={() => {
                const proj = projects.find((p) => p.id === contextMenu.projectId);
                if (proj) handleSelectNovel(proj);
                setContextMenu(null);
              }}
            >
              打开小说
            </button>
            <div className="my-1 border-t border-[#2A2A2A]" />
            <button
              className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-[#1F1F1F] transition-colors"
              onClick={() => void handleDeleteProject(contextMenu.projectId, contextMenu.projectName)}
            >
              删除小说
            </button>
          </div>
        )}

        {/* Image selection modal (for pending — triggered from Layer 1) */}
        {selectionCard && (
          <ImageSelectionModal
            selectionCard={selectionCard}
            currentAvatar={avatars[selectionCard.filename]}
            selecting={selecting}
            onSelectImage={(url) => void handleSelectImage(url)}
            onClose={() => setSelectionCard(null)}
            description="选择一张作为角色头像，其余 3 张将自动删除。确认后自动归入精选角色。"
          />
        )}
      </div>
    );
  }

  // --- Render: Layer 2 (character cards) ---
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="p-8">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToSelector}
            className="text-sm text-gray-500 hover:text-[#C9A86C]"
          >
            ← 选择小说
          </button>
          <div>
            <h1 className="text-2xl font-light">角色管理</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {selectedProject?.name ?? selectedProjectId}
              {characters.length > 0 && ` · ${characters.length} 个角色`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleMatchCharacters()}
            disabled={matching || characters.length === 0}
            className="rounded-lg border border-[rgba(201,168,108,0.3)] bg-[rgba(201,168,108,0.05)] px-4 py-2 text-sm text-[#C9A86C] transition-all hover:bg-[rgba(201,168,108,0.1)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {matching ? "匹配中..." : "匹配角色"}
          </button>
          <button onClick={openNew} className={BTN.primary}>
            新建角色
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">
          {error}
        </p>
      )}

      {/* Pending selection banner */}
      {pendingCount > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[rgba(201,104,90,0.2)] bg-[rgba(201,104,90,0.06)] p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖼️</span>
            <div>
              <p className="text-sm text-[#C9685A]">
                有 <strong>{pendingCount}</strong> 个角色等待你挑选头像
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                每个角色有 4 张候选图，选择一张保留，其余自动删除
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const first = characters.find((c) => c.data.extensions?.tavernos?.pendingSelection);
              if (first) setSelectionCard(first);
            }}
            className="rounded-lg border border-[rgba(201,104,90,0.3)] bg-[rgba(201,104,90,0.1)] px-4 py-2 text-sm text-[#C9685A] hover:bg-[rgba(201,104,90,0.15)]"
          >
            开始挑选
          </button>
        </div>
      )}

      {characters.length === 0 ? (
        <EmptyState
          icon="user"
          title="暂无角色"
          description="写小说时出现的角色会自动同步到这里，也可以手动创建"
          className="mt-8"
        />
      ) : (
        <div className="mt-6 flex flex-wrap gap-4">
          {sortedCharacters.map((card, idx) => {
            const asset = card.data.name ? assetMap[card.data.name] : undefined;
            // 查找该角色对应的确选槽图片
            const matchedSlot = confirmedSlots.find((s) => s.name === card.data.name);
            return (
              <CharacterCard
                key={card.filename}
                card={card}
                avatar={avatars[card.filename]}
                generating={generating.has(card.filename)}
                weightRank={idx}
                appearanceCount={asset?.appearanceCount}
                confirmedSlotUrl={matchedSlot?.imageUrl}
                onEdit={() => openEdit(card)}
                onDelete={() => setConfirmDelete(card)}
                onGenerateAvatar={() => void handleGenerateAvatar(card)}
                onSelectImage={() => setSelectionCard(card)}
                onClick={() => setDetailCard(card)}
              />
            );
          })}
        </div>
      )}

      {/* Edit/Create modal (unchanged) */}
      {modalOpen && (
        <Modal
          title={editing ? "编辑角色" : "新建角色"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button onClick={() => setModalOpen(false)} className={BTN.ghost}>取消</button>
              <button onClick={handleSubmit} disabled={!form.name.trim()} className={BTN.primary}>保存</button>
            </>
          }
        >
          <TextInput label="名称（必填）" value={form.name} onChange={(v) => update("name", v)} />
          <TextArea label="描述" value={form.description ?? ""} onChange={(v) => update("description", v)} />
          <TextArea label="性格" value={form.personality ?? ""} onChange={(v) => update("personality", v)} />
          <TextArea label="场景" value={form.scenario ?? ""} onChange={(v) => update("scenario", v)} />
          <TextArea label="开场白" value={form.first_mes ?? ""} onChange={(v) => update("first_mes", v)} />

          {/* Voice config */}
          <div className="mt-6 border-t border-[#1A1A1A] pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-[#C9A86C]">专属音色</h4>
              <label className="flex items-center gap-2 text-xs text-[#E8E8E8]">
                <input
                  type="checkbox"
                  checked={voice.enabled}
                  onChange={(e) => setVoice((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="accent-[#C9A86C]"
                />
                启用
              </label>
            </div>
            {voice.enabled && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs text-[#E8E8E8]">TTS 供应商</label>
                  <select
                    value={voice.provider ?? "yunwu"}
                    onChange={(e) => setVoice((prev) => ({ ...prev, provider: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8]"
                  >
                    {VOICE_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#E8E8E8]">音色 ID</label>
                  {(() => {
                    const tp = ttsProviders.find((p) => p.id === (voice.provider ?? "yunwu"));
                    const voiceOpts = tp?.voices ?? [];
                    return voiceOpts.length > 0 ? (
                      <select
                        value={voice.voiceId ?? ""}
                        onChange={(e) => setVoice((prev) => ({ ...prev, voiceId: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8]"
                      >
                        <option value="">— 选择音色 —</option>
                        {voiceOpts.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={voice.voiceId ?? ""}
                        onChange={(e) => setVoice((prev) => ({ ...prev, voiceId: e.target.value }))}
                        placeholder="输入预设音色 ID 或使用下方设计"
                        className="mt-1 w-full rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8]"
                      />
                    );
                  })()}
                </div>
                <div>
                  <label className="text-xs text-[#E8E8E8]">语速 ({voice.speed ?? 1})</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voice.speed ?? 1}
                    onChange={(e) => setVoice((prev) => ({ ...prev, speed: parseFloat(e.target.value) }))}
                    className="mt-1 w-full accent-[#C9A86C]"
                  />
                </div>
                {voice.provider === "yunwu-minimax" && (
                  <div className="rounded-lg bg-[#0F0F0F] p-3">
                    <label className="text-xs text-[#C9A86C]">音色设计（用文字描述生成音色）</label>
                    <textarea
                      value={voiceDesignPrompt}
                      onChange={(e) => setVoiceDesignPrompt(e.target.value)}
                      placeholder="例：讲述悬疑故事的播音员，声音低沉富有磁性"
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8]"
                    />
                    <button
                      onClick={() => void handleDesignVoice()}
                      disabled={designing || !voiceDesignPrompt.trim() || !form.name.trim()}
                      className="mt-2 rounded-lg border border-[rgba(201,168,108,0.3)] px-3 py-1.5 text-xs text-[#C9A86C] hover:bg-[rgba(201,168,108,0.08)] disabled:opacity-50"
                    >
                      {designing ? "设计中..." : "设计音色"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`确认删除角色"${confirmDelete.data.name}"？此操作不可撤销。`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {confirmDeleteProject && (
        <ConfirmDialog
          message={`确认删除小说"${confirmDeleteProject.name}"？所有角色、章节和世界书都将被删除，此操作不可撤销。`}
          onCancel={() => setConfirmDeleteProject(null)}
          onConfirm={confirmProjectDelete}
        />
      )}

      {/* Image selection modal — 4-to-1 pick */}
      {selectionCard && (
        <ImageSelectionModal
          selectionCard={selectionCard}
          currentAvatar={avatars[selectionCard.filename]}
          selecting={selecting}
          onSelectImage={(url) => void handleSelectImage(url)}
          onClose={() => setSelectionCard(null)}
        />
      )}

      {/* 角色详情弹窗 */}
      {detailCard && selectedProjectId && (
        <CharacterDetailPanel
          card={detailCard}
          projectId={selectedProjectId}
          onClose={() => setDetailCard(null)}
          onEdit={(c) => { openEdit(c); setDetailCard(null); }}
          onVoiceUpdated={() => {
            // Refresh character list to reflect updated voice config.
            void fetchCharacters(selectedProjectId);
          }}
          onCardUpdated={(updatedCard) => {
            // Update the detail card so the UI reflects the new image/text immediately.
            setDetailCard(updatedCard);
            // Refresh the character list so the card grid shows the new avatar.
            void fetchCharacters(selectedProjectId);
          }}
        />
      )}
    </div>
  );
}
