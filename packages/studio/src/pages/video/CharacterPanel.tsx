// CharacterPanel — collapsible panel for character consistency management.
//
// Lists project characters (from the character-consistency backend module),
// supports adding new characters with reference images, and generating
// three-view sheets (front / side / back) for visual consistency across clips.
//
// Style mirrors ScriptParserPanel: Apple system font, collapsible header,
// CSS-variable-driven theming.

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, proxyImageUrl } from "../../api/client.js";
import { IconChevron, IconUsers, IconPlus, IconImage } from "../../components/Icons.tsx";
import { APPLE_FONT_STYLE, genderLabel, genderBadge } from "./shared.js";
import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CharacterPanelProps {
  projectId: string | null;
}

/** A character managed by the character-consistency backend module. */
interface Character {
  id: string;
  name: string;
  gender: "male" | "female" | "other";
  ageRange?: string;
  role?: string;
  appearance?: string;
  clothing?: string;
  referenceImages?: Array<{ url: string; type: string; label?: string }>;
  threeView?: {
    front: string;
    side: string;
    back: string;
  };
  /** 三视图提示词（由 generate-three-view 端点返回，是文本而非图片 URL） */
  threeViewPrompts?: {
    front: string;
    side: string;
    back: string;
  };
}

/** Response shape for GET /projects/:projectId/characters. */
interface CharactersResponse {
  characters: Character[];
}

/** generate-three-view 后端返回的是提示词文本，而非图片 URL */
interface ThreeViewResponse {
  characterId?: string;
  prompts?: {
    front: string;
    side: string;
    back: string;
  };
}

/** New-character form fields. */
interface NewCharacterForm {
  name: string;
  gender: "male" | "female" | "other";
  ageRange: string;
  role: string;
  appearance: string;
  clothing: string;
  referenceImages: string;
}

const EMPTY_FORM: NewCharacterForm = {
  name: "",
  gender: "male",
  ageRange: "",
  role: "",
  appearance: "",
  clothing: "",
  referenceImages: "",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Three-view image strip (front / side / back) or prompt display. */
function ThreeViewStrip({
  images,
  prompts,
}: {
  images?: NonNullable<Character["threeView"]>;
  prompts?: NonNullable<Character["threeViewPrompts"]>;
}): JSX.Element {
  const views: { key: "front" | "side" | "back"; label: string }[] = [
    { key: "front", label: "正面" },
    { key: "side", label: "侧面" },
    { key: "back", label: "背面" },
  ];
  return (
    <div className="mt-2 flex gap-2">
      {views.map((v) => {
        const imgUrl = images?.[v.key];
        const promptText = prompts?.[v.key];
        return (
          <div key={v.key} className="flex flex-col items-center gap-1">
            {imgUrl ? (
              <img
                src={proxyImageUrl(imgUrl)}
                alt={v.label}
                className="h-20 w-16 rounded border border-[var(--color-border)] object-cover"
              />
            ) : promptText ? (
              <div className="h-20 w-16 overflow-auto rounded border border-dashed border-[var(--color-border)] p-1 text-[9px] leading-tight text-[var(--color-text-faint)]">
                {promptText}
              </div>
            ) : (
              <div className="flex h-20 w-16 items-center justify-center rounded border border-dashed border-[var(--color-border)] text-[10px] text-[var(--color-text-faint)]">
                无
              </div>
            )}
            <span className="text-[10px] text-[var(--color-text-faint)]">{v.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** A single character card. */
function CharacterCard({
  character,
  generating,
  onGenerateThreeView,
}: {
  character: Character;
  generating: boolean;
  onGenerateThreeView: () => void;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3">
      {/* Header: name + badges */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-[var(--color-text)]">{character.name}</span>
        <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${genderBadge(character.gender)}`}>
          {genderLabel(character.gender)}
        </span>
        {character.ageRange && (
          <span className="rounded bg-[var(--color-border)]/50 px-1.5 py-0.5 text-xs text-[var(--color-text-faint)]">
            {character.ageRange}
          </span>
        )}
        {character.role && (
          <span className="rounded bg-[var(--color-border)]/50 px-1.5 py-0.5 text-xs text-[var(--color-text-faint)]">
            {character.role}
          </span>
        )}
      </div>

      {/* Description */}
      {character.appearance && (
        <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">{character.appearance}</p>
      )}
      {character.clothing && (
        <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">服装：{character.clothing}</p>
      )}

      {/* Reference images */}
      {character.referenceImages && character.referenceImages.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {character.referenceImages.map((img, i) => (
            <img
              key={i}
              src={proxyImageUrl(img.url)}
              alt={`参考图 ${i + 1}`}
              className="h-14 w-14 rounded border border-[var(--color-border)] object-cover"
            />
          ))}
        </div>
      )}

      {/* Three-view images or prompts */}
      {(character.threeView || character.threeViewPrompts) && (
        <ThreeViewStrip images={character.threeView} prompts={character.threeViewPrompts} />
      )}

      {/* Actions */}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onGenerateThreeView}
          disabled={generating}
          className="btn-press rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)]/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? "生成中..." : "生成三视图"}
        </button>
      </div>
    </div>
  );
}

/** Add-character form. */
function AddCharacterForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
}: {
  form: NewCharacterForm;
  onChange: (field: keyof NewCharacterForm, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
}): JSX.Element {
  const inputClass =
    "w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-placeholder)] transition-colors focus:border-[var(--color-border-accent)] focus:outline-none";
  const labelClass = "mb-0.5 block text-xs font-medium text-[var(--color-text-faint)]";

  return (
    <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>名字</label>
          <input
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="角色名称"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>性别</label>
          <select
            value={form.gender}
            onChange={(e) => onChange("gender", e.target.value)}
            className={inputClass}
          >
            <option value="male">男</option>
            <option value="female">女</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>年龄</label>
          <input
            value={form.ageRange}
            onChange={(e) => onChange("ageRange", e.target.value)}
            placeholder="如 25"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>角色类型</label>
          <input
            value={form.role}
            onChange={(e) => onChange("role", e.target.value)}
            placeholder="如 主角 / 配角 / 反派"
            className={inputClass}
          />
        </div>
      </div>
      <div className="mt-2">
        <label className={labelClass}>外貌描述</label>
        <textarea
          value={form.appearance}
          onChange={(e) => onChange("appearance", e.target.value)}
          rows={2}
          placeholder="外貌特征描述..."
          className={`${inputClass} resize-y`}
        />
      </div>
      <div className="mt-2">
        <label className={labelClass}>服装</label>
        <input
          value={form.clothing}
          onChange={(e) => onChange("clothing", e.target.value)}
          placeholder="服装描述"
          className={inputClass}
        />
      </div>
      <div className="mt-2">
        <label className={labelClass}>参考图 URL（每行一个，支持多张）</label>
        <textarea
          value={form.referenceImages}
          onChange={(e) => onChange("referenceImages", e.target.value)}
          rows={2}
          placeholder="https://example.com/ref1.png&#10;https://example.com/ref2.png"
          className={`${inputClass} resize-y`}
        />
      </div>
      <div className="mt-2.5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-control px-3 py-1 text-xs text-[var(--color-text-faint)] transition-colors hover:text-[var(--color-text-secondary)]"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !form.name.trim()}
          className="btn-press rounded-control bg-[var(--color-primary)] px-3 py-1 text-xs font-medium text-[var(--color-text-inverse)] transition-all hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "添加中..." : "添加角色"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CharacterPanel({ projectId }: CharacterPanelProps): JSX.Element | null {
  const [collapsed, setCollapsed] = useState(true);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<NewCharacterForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Load characters ---
  const loadCharacters = useCallback(async (): Promise<void> => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<CharactersResponse>(`/projects/${projectId}/characters`);
      setCharacters(data.characters ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Auto-load when expanded and project changes.
  useEffect(() => {
    if (!collapsed && projectId) {
      void loadCharacters();
    }
  }, [collapsed, projectId, loadCharacters]);

  // --- Form helpers ---
  const handleFormChange = (field: keyof NewCharacterForm, value: string): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCharacter = async (): Promise<void> => {
    if (!projectId || !form.name.trim()) return;
    setSubmitting(true);
    setError(null);
    // 将文本框中的 URL 列表转换为后端期望的 { url, type, label? } 数组
    const refImages = form.referenceImages
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((url) => ({ url, type: "portrait" }));
    try {
      const { character } = await apiPost<{ character: Character }>(
        `/projects/${projectId}/characters`,
        {
          name: form.name.trim(),
          gender: form.gender,
          ageRange: form.ageRange.trim() || undefined,
          role: form.role.trim() || undefined,
          appearance: form.appearance.trim() || undefined,
          clothing: form.clothing.trim() || undefined,
          referenceImages: refImages.length > 0 ? refImages : undefined,
        },
      );
      setCharacters((prev) => [character, ...prev]);
      setForm(EMPTY_FORM);
      setShowAddForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  // --- Generate three-view ---
  const handleGenerateThreeView = async (characterId: string): Promise<void> => {
    if (!projectId) return;
    setGeneratingId(characterId);
    setError(null);
    try {
      const res = await apiPost<ThreeViewResponse>(
        `/projects/${projectId}/characters/${characterId}/generate-three-view`,
        {},
      );
      // 后端返回的是提示词文本（prompts），而非图片 URL
      if (res.prompts) {
        setCharacters((prev) =>
          prev.map((c) =>
            c.id === characterId ? { ...c, threeViewPrompts: res.prompts! } : c,
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGeneratingId(null);
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
        <IconUsers size={18} className="text-[var(--color-primary)]" />
        <span className="text-sm font-medium text-[var(--color-text)]">角色管理</span>
        <span className="text-xs text-[var(--color-text-faint)]">
          角色一致性与三视图生成
        </span>
        {characters.length > 0 && (
          <span className="rounded bg-[var(--color-border)]/50 px-1.5 py-0.5 text-xs text-[var(--color-text-faint)]">
            {characters.length}
          </span>
        )}
        <span className="ml-auto">
          <IconChevron size={18} direction={collapsed ? "right" : "down"} className="text-[var(--color-text-faint)]" />
        </span>
      </button>

      {/* Panel body (collapsible) */}
      {!collapsed && (
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-faint)]">
              {loading ? "加载中..." : `${characters.length} 个角色`}
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              disabled={!projectId}
              className="btn-press flex items-center gap-1 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)]/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconPlus size={14} />
              添加角色
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-2 rounded-lg bg-[rgba(201,104,90,0.08)] p-2.5 text-sm text-[#C9685A]">
              {error}
            </div>
          )}

          {/* Add-character form */}
          {showAddForm && (
            <AddCharacterForm
              form={form}
              onChange={handleFormChange}
              onSubmit={() => void handleAddCharacter()}
              onCancel={() => {
                setShowAddForm(false);
                setForm(EMPTY_FORM);
              }}
              submitting={submitting}
            />
          )}

          {/* Character list */}
          {loading && characters.length === 0 ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
              正在加载角色...
            </div>
          ) : characters.length === 0 ? (
            <div className="mt-3 flex flex-col items-center gap-2 py-6 text-center">
              <IconImage size={28} className="text-[var(--color-text-faint)]" />
              <p className="text-sm text-[var(--color-text-faint)]">
                暂无角色，点击「添加角色」创建
              </p>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {characters.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  generating={generatingId === c.id}
                  onGenerateThreeView={() => void handleGenerateThreeView(c.id)}
                />
              ))}
            </div>
          )}

          {/* Hint */}
          {!projectId && (
            <p className="mt-2 text-xs text-[var(--color-text-faint)]">请先选择项目</p>
          )}
        </div>
      )}
    </div>
  );
}
