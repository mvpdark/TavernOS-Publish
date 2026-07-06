// ScriptParserPanel — collapsible panel for intelligent script parsing.
//
// Pastes a screenplay / novel (up to 50k chars), sends it to the backend
// /videos/parse-script SSE endpoint, and displays the structured result
// (characters / scenes / props / beats) in tabbed views.
//
// The backend splits the script into ~5000-char chunks, parses each via LLM,
// and streams per-chunk progress. A single chunk failure is non-fatal.

import { useEffect, useRef, useState } from "react";
import type { ParsedScript, ParsedCharacter, ParsedScene, ParsedProp, ParsedSceneBeat } from "@tavernos/core";
import { BASE_URL, streamSsePost } from "../../api/client.js";
import { IconChevron, IconSparkles, IconUsers, IconMap, IconLayers, IconFileText } from "../../components/Icons.tsx";
import { APPLE_FONT_STYLE, formatDuration } from "./shared.js";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScriptParserPanelProps {
  projectId: string | null;
}

/** SSE event streamed by POST /videos/parse-script. */
interface ParseScriptSseEvent {
  type: "status" | "progress" | "done" | "error";
  message?: string;
  current?: number;
  total?: number;
  result?: ParsedScript;
}

type ActiveTab = "characters" | "scenes" | "props" | "beats";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum allowed script length (matches backend cap). */
const MAX_SCRIPT_CHARS = 50_000;

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Map gender enum to Chinese label. */
function genderLabel(gender: ParsedCharacter["gender"]): string {
  switch (gender) {
    case "male":
      return "男";
    case "female":
      return "女";
    default:
      return "未知";
  }
}

/** Tailwind badge class for a gender. */
function genderBadge(gender: ParsedCharacter["gender"]): string {
  switch (gender) {
    case "male":
      return "bg-blue-100 text-blue-700";
    case "female":
      return "bg-pink-100 text-pink-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

/** Map importance enum to Chinese label. */
function importanceLabel(importance: ParsedProp["importance"]): string {
  return importance === "key" ? "关键" : "普通";
}

/** Tailwind badge class for prop importance. */
function importanceBadge(importance: ParsedProp["importance"]): string {
  return importance === "key"
    ? "bg-amber-100 text-amber-700"
    : "bg-gray-100 text-gray-600";
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

interface TabDef {
  key: ActiveTab;
  label: string;
  icon: (props: { size?: number; className?: string }) => JSX.Element;
}

const TABS: readonly TabDef[] = [
  { key: "characters", label: "角色", icon: IconUsers },
  { key: "scenes", label: "场景", icon: IconMap },
  { key: "props", label: "道具", icon: IconLayers },
  { key: "beats", label: "分场概要", icon: IconFileText },
] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Characters tab: table with name / gender / age / role / personality. */
function CharactersTable({ characters }: { characters: readonly ParsedCharacter[] }): JSX.Element {
  if (characters.length === 0) {
    return <EmptyHint text="未识别到角色" />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-faint)]">
            <th className="py-2 pr-3 font-normal">名字</th>
            <th className="py-2 pr-3 font-normal">性别</th>
            <th className="py-2 pr-3 font-normal">年龄</th>
            <th className="py-2 pr-3 font-normal">角色类型</th>
            <th className="py-2 pr-3 font-normal">性格</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((c, i) => (
            <tr key={`${c.name}-${i}`} className="border-b border-[var(--color-border)]/50">
              <td className="py-2 pr-3 font-medium text-[var(--color-text)]">{c.name}</td>
              <td className="py-2 pr-3">
                <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${genderBadge(c.gender)}`}>
                  {genderLabel(c.gender)}
                </span>
              </td>
              <td className="py-2 pr-3 text-[var(--color-text-secondary)]">{c.ageRange ?? "—"}</td>
              <td className="py-2 pr-3 text-[var(--color-text-secondary)]">{c.role || "—"}</td>
              <td className="py-2 pr-3 text-[var(--color-text-secondary)]">{c.personality || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Scenes tab: card grid with name / location / time / mood. */
function ScenesGrid({ scenes }: { scenes: readonly ParsedScene[] }): JSX.Element {
  if (scenes.length === 0) {
    return <EmptyHint text="未识别到场景" />;
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {scenes.map((s, i) => (
        <div
          key={`${s.name}-${i}`}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-text)]">{s.name}</span>
            {s.timeOfDay && (
              <span className="rounded bg-[var(--color-border)]/50 px-1.5 py-0.5 text-xs text-[var(--color-text-faint)]">
                {s.timeOfDay}
              </span>
            )}
          </div>
          <div className="mt-1.5 space-y-0.5 text-xs text-[var(--color-text-secondary)]">
            {s.location && <div>地点：{s.location}</div>}
            {s.mood && <div>氛围：{s.mood}</div>}
            {s.description && <div className="text-[var(--color-text-faint)]">{s.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Props tab: list with name / description / importance. */
function PropsList({ props }: { props: readonly ParsedProp[] }): JSX.Element {
  if (props.length === 0) {
    return <EmptyHint text="未识别到道具" />;
  }
  return (
    <ul className="space-y-1.5">
      {props.map((p, i) => (
        <li
          key={`${p.name}-${i}`}
          className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2"
        >
          <span
            className={`mt-0.5 inline-block shrink-0 rounded px-1.5 py-0.5 text-xs ${importanceBadge(p.importance)}`}
          >
            {importanceLabel(p.importance)}
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-[var(--color-text)]">{p.name}</span>
            {p.description && (
              <span className="ml-2 text-sm text-[var(--color-text-secondary)]">{p.description}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Beats tab: timeline with scene number / title / characters / summary / emotion / duration. */
function BeatsTimeline({ beats }: { beats: readonly ParsedSceneBeat[] }): JSX.Element {
  if (beats.length === 0) {
    return <EmptyHint text="未识别到分场概要" />;
  }
  return (
    <ol className="relative space-y-3 border-l border-[var(--color-border)] pl-4">
      {beats.map((b, i) => (
        <li key={i} className="relative">
          {/* Timeline dot */}
          <span className="absolute -left-[1.31rem] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-surface)]" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-text-faint)]">#{b.sceneNumber}</span>
            <span className="font-medium text-[var(--color-text)]">{b.title}</span>
            {b.emotion && (
              <span className="rounded bg-[var(--color-border)]/50 px-1.5 py-0.5 text-xs text-[var(--color-text-faint)]">
                {b.emotion}
              </span>
            )}
            {b.estimatedDuration != null && (
              <span className="text-xs text-[var(--color-text-faint)]">~{formatDuration(b.estimatedDuration)}</span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{b.summary}</p>
          {b.characters.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {b.characters.map((name, ci) => (
                <span
                  key={ci}
                  className="rounded bg-[var(--color-border)]/40 px-1.5 py-0.5 text-xs text-[var(--color-text-faint)]"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
          {b.scene && (
            <div className="mt-0.5 text-xs text-[var(--color-text-faint)]">场景：{b.scene}</div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Placeholder shown when a tab has no data. */
function EmptyHint({ text }: { text: string }): JSX.Element {
  return <p className="py-6 text-center text-sm text-[var(--color-text-faint)]">{text}</p>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ScriptParserPanel({ projectId }: ScriptParserPanelProps): JSX.Element | null {
  const [collapsed, setCollapsed] = useState(true);
  const [scriptText, setScriptText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState("");
  const [parsedResult, setParsedResult] = useState<ParsedScript | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("characters");
  const [error, setError] = useState<string | null>(null);

  // AbortController for the SSE stream; aborted on unmount or new parse.
  const abortRef = useRef<AbortController | null>(null);

  // 组件卸载时中止 SSE 流，避免离开页面后流仍在后台运行
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const charCount = scriptText.length;
  const overLimit = charCount > MAX_SCRIPT_CHARS;

  const handleParse = async (): Promise<void> => {
    if (!projectId || !scriptText.trim() || parsing || overLimit) return;

    // Abort any previous parse stream, then start a fresh one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setParsing(true);
    setParseProgress("正在解析剧本...");
    setError(null);
    setParsedResult(null);

    try {
      await streamSsePost<ParseScriptSseEvent>(
        `${BASE_URL}/projects/${projectId}/videos/parse-script`,
        { script: scriptText },
        (event) => {
          if (controller.signal.aborted) return;
          switch (event.type) {
            case "status":
              if (event.message) setParseProgress(event.message);
              break;
            case "progress": {
              const cur = event.current ?? 0;
              const total = event.total ?? 0;
              setParseProgress(total > 0 ? `正在解析 ${cur} / ${total} 片段...` : "正在解析...");
              break;
            }
            case "done":
              if (event.result) {
                setParsedResult(event.result);
                setParseProgress("");
              }
              break;
            case "error":
              setError(event.message ?? "剧本解析失败");
              setParseProgress("");
              break;
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
        // Cancelled — keep partial state, no error.
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (!controller.signal.aborted) setParsing(false);
    }
  };

  // --- Render ---

  return (
    <div
      style={APPLE_FONT_STYLE}
      className="mx-4 mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-sunken)]"
      >
        <IconSparkles size={18} className="text-[var(--color-primary)]" />
        <span className="text-sm font-medium text-[var(--color-text)]">剧本智能解析</span>
        <span className="text-xs text-[var(--color-text-faint)]">
          自动提取角色、场景、道具与分场概要
        </span>
        <span className="ml-auto">
          <IconChevron size={18} direction={collapsed ? "right" : "down"} className="text-[var(--color-text-faint)]" />
        </span>
      </button>

      {/* Panel body (collapsible) */}
      {!collapsed && (
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          {/* Script input row */}
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                rows={4}
                disabled={parsing}
                placeholder="粘贴剧本或小说文本（支持最多 5 万字，将自动分片解析）..."
                className="w-full resize-y rounded-control border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-placeholder)] transition-colors focus:border-[var(--color-border-accent)] focus:outline-none disabled:opacity-50"
              />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className={overLimit ? "text-[#C9685A]" : "text-[var(--color-text-faint)]"}>
                  {charCount.toLocaleString()} / {MAX_SCRIPT_CHARS.toLocaleString()} 字
                </span>
                {parsedResult && (
                  <span className="text-[var(--color-text-faint)]">
                    {parsedResult.characters.length} 角色 · {parsedResult.scenes.length} 场景 ·{" "}
                    {parsedResult.props.length} 道具 · {parsedResult.beats.length} 场戏
                    {parsedResult.estimatedTotalDuration != null &&
                      ` · 约 ${formatDuration(parsedResult.estimatedTotalDuration)}`}
                  </span>
                )}
              </div>
            </div>

            {/* Parse button */}
            <div className="flex shrink-0 flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => void handleParse()}
                disabled={!projectId || !scriptText.trim() || parsing || overLimit}
                className="btn-press rounded-control bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-[0_0_12px_rgba(201,168,108,0.15)] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
              >
                {parsing ? "解析中..." : "解析剧本"}
              </button>
              {!projectId && (
                <span className="text-xs text-[var(--color-text-faint)]">请先选择项目</span>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          {parsing && parseProgress && (
            <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
              {parseProgress}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-2 rounded-lg bg-[rgba(201,104,90,0.08)] p-2.5 text-sm text-[#C9685A]">
              {error}
            </div>
          )}

          {/* Results: tabbed view */}
          {parsedResult && (
            <div className="mt-3">
              {/* Tab navigation */}
              <div className="flex gap-1 border-b border-[var(--color-border)]">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  const count =
                    tab.key === "characters"
                      ? parsedResult.characters.length
                      : tab.key === "scenes"
                        ? parsedResult.scenes.length
                        : tab.key === "props"
                          ? parsedResult.props.length
                          : parsedResult.beats.length;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "border-[var(--color-primary)] text-[var(--color-text)]"
                          : "border-transparent text-[var(--color-text-faint)] hover:text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <Icon size={15} />
                      {tab.label}
                      <span className="text-xs text-[var(--color-text-faint)]">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="mt-3 max-h-[420px] overflow-y-auto pr-1">
                {activeTab === "characters" && <CharactersTable characters={parsedResult.characters} />}
                {activeTab === "scenes" && <ScenesGrid scenes={parsedResult.scenes} />}
                {activeTab === "props" && <PropsList props={parsedResult.props} />}
                {activeTab === "beats" && <BeatsTimeline beats={parsedResult.beats} />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
