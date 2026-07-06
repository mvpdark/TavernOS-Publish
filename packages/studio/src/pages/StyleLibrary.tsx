// packages/studio/src/pages/StyleLibrary.tsx
// Style Library — clone writing styles from reference texts.

import { useEffect, useState } from "react";
import type { JSX } from "react";
import { apiGet, apiPost, apiDelete } from "../api/client.js";
import { BTN } from "../components/ui.tsx";

interface StyleSummary {
  id: string;
  name: string;
  description?: string;
  language: "zh" | "en";
  avgSentenceLength: number;
  vocabularyDiversity: number;
  rhetoricalFeatures: string[];
  sample?: string;
  createdAt: string;
}

interface StyleDetail extends StyleSummary {
  profile: {
    avgSentenceLength: number;
    sentenceLengthStdDev: number;
    avgParagraphLength: number;
    paragraphLengthRange: { min: number; max: number };
    vocabularyDiversity: number;
    topPatterns: string[];
    rhetoricalFeatures: string[];
    language: "zh" | "en";
    sourceName?: string;
    analyzedAt?: string;
  };
  guide: string;
  sample?: string;
}

export default function StyleLibrary(): JSX.Element {
  const [styles, setStyles] = useState<StyleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StyleDetail | null>(null);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [statsOnly, setStatsOnly] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewResult, setPreviewResult] = useState<{ summary: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      const d = await apiGet<{ styles: StyleSummary[] }>("/style-library");
      setStyles(d.styles);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handlePreview = async (): Promise<void> => {
    if (text.length < 100) {
      setMsg("文本太短，至少需要 100 字符");
      return;
    }
    setPreviewing(true);
    setMsg(null);
    try {
      const r = await apiPost<{ summary: string; totalChars: number }>("/style-library/analyze", { text });
      setPreviewResult({ summary: r.summary });
    } catch (e) {
      setMsg(`分析失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPreviewing(false);
    }
  };

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) {
      setMsg("请输入风格名称");
      return;
    }
    if (text.length < 500) {
      setMsg("参考文本至少需要 500 字符才能生成可靠的风格指纹");
      return;
    }
    setCreating(true);
    setMsg(null);
    try {
      const r = await apiPost<{ success: boolean; style: StyleDetail }>("/style-library", {
        name,
        description,
        text,
        statsOnly,
      });
      if (r.success) {
        setMsg(`✓ 文风"${name}"克隆成功！`);
        setShowForm(false);
        setName("");
        setDescription("");
        setText("");
        setPreviewResult(null);
        await load();
      }
    } catch (e) {
      setMsg(`克隆失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("确定删除此文风？")) return;
    try {
      await apiDelete(`/style-library/${id}`);
      if (selected?.id === id) setSelected(null);
      await load();
    } catch {
      // ignore
    }
  };

  const handleSelect = async (id: string): Promise<void> => {
    try {
      const d = await apiGet<StyleDetail>(`/style-library/${id}`);
      setSelected(d);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-[#787878]">加载文风库…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-light text-[#C9A86C]">文风克隆库</h1>
          <p className="mt-1 text-sm text-[#787878]">从参考文本中提取写作风格指纹，写作时自动仿写</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={BTN.primary}
        >
          {showForm ? "取消" : "+ 克隆新文风"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 rounded-[14px] bg-[#141414] p-6 shadow-md border border-[#1A1A1A]">
          <h2 className="mb-4 text-base text-[#E8E8E8]">克隆新文风</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-[#787878]">风格名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: 余华风格、Cyberpunk Noir"
                className="w-full rounded-lg bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] outline-none ring-1 ring-[#2A2A2A] focus:ring-[#C9A86C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#787878]">描述（可选）</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简短描述这个文风的特点"
                className="w-full rounded-lg bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] outline-none ring-1 ring-[#2A2A2A] focus:ring-[#C9A86C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#787878]">
                参考文本（粘贴一段 500 字以上的作者原文）
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="粘贴要模仿的作者的一段原文（小说章节、散文段落等），至少 500 字。文本越长，风格分析越准确。"
                rows={8}
                className="w-full rounded-lg bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] outline-none ring-1 ring-[#2A2A2A] focus:ring-[#C9A86C] [resize:vertical]"
              />
              <div className="mt-1 text-xs text-[#555]">{text.length} 字符</div>
            </div>

            {/* Preview analysis */}
            {previewResult && (
              <div className="rounded-lg bg-[#0F0F0F] p-3 text-xs text-[#999]">
                <div className="text-[#C9A86C]">统计指纹预览</div>
                <pre className="mt-1 whitespace-pre-wrap font-mono">{previewResult.summary}</pre>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handlePreview}
                disabled={previewing || text.length < 100}
                className={BTN.ghost}
              >
                {previewing ? "分析中…" : "预览统计指纹"}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim() || text.length < 500}
                className={BTN.primary}
              >
                {creating ? "克隆中…" : statsOnly ? "克隆（仅统计）" : "克隆文风"}
              </button>
              <label className="flex items-center gap-1.5 text-xs text-[#787878]">
                <input
                  type="checkbox"
                  checked={statsOnly}
                  onChange={(e) => setStatsOnly(e.target.checked)}
                  className="accent-[#C9A86C]"
                />
                仅统计指纹（跳过 LLM 风格指南生成）
              </label>
            </div>

            {msg && (
              <p className={`rounded-lg p-2 text-sm ${msg.startsWith("✓") ? "bg-[rgba(120,180,120,0.1)] text-[#78B478]" : "bg-[rgba(201,104,90,0.08)] text-[#C9685A]"}`}>
                {msg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Style list + detail split */}
      <div className="grid grid-cols-[1fr_1fr] gap-4">
        {/* List */}
        <div className="space-y-3">
          {styles.length === 0 ? (
            <div className="rounded-[14px] bg-[#141414] p-8 text-center text-sm text-[#787878]">
              文风库为空。点击「克隆新文风」开始。
            </div>
          ) : (
            styles.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`cursor-pointer rounded-[14px] p-4 border transition-all ${
                  selected?.id === s.id
                    ? "border-[#C9A86C] bg-[rgba(201,168,108,0.08)]"
                    : "border-[#1A1A1A] bg-[#141414] hover:border-[#3A3A3A]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#E8E8E8]">{s.name}</span>
                  <span className="rounded-full bg-[#0F0F0F] px-2 py-0.5 text-xs text-[#787878]">
                    {s.language === "zh" ? "中文" : "EN"}
                  </span>
                </div>
                {s.description && <p className="mt-1 text-xs text-[#787878]">{s.description}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded bg-[#0F0F0F] px-1.5 py-0.5 text-xs text-[#787878]">
                    句长 {s.avgSentenceLength}
                  </span>
                  <span className="rounded bg-[#0F0F0F] px-1.5 py-0.5 text-xs text-[#787878]">
                    TTR {s.vocabularyDiversity}
                  </span>
                  {s.rhetoricalFeatures.slice(0, 2).map((r) => (
                    <span key={r} className="rounded bg-[#0F0F0F] px-1.5 py-0.5 text-xs text-[#787878]">
                      {r}
                    </span>
                  ))}
                </div>
                {s.sample && (
                  <p className="mt-2 text-xs text-[#555] line-clamp-2">{s.sample}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-[#444]">{s.createdAt.split("T")[0]}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleDelete(s.id); }}
                    className="text-xs text-[#555] hover:text-[#C9685A]"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail */}
        <div>
          {selected ? (
            <div className="sticky top-4 rounded-[14px] bg-[#141414] p-6 shadow-md border border-[#1A1A1A]">
              <h2 className="text-base text-[#C9A86C]">{selected.name}</h2>
              {selected.description && <p className="mt-1 text-sm text-[#787878]">{selected.description}</p>}

              {/* Stats */}
              <div className="mt-4">
                <h3 className="mb-2 text-xs text-[#C9A86C]">统计指纹</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-[#0F0F0F] px-2 py-1.5">
                    <span className="text-[#555]">平均句长</span>
                    <span className="float-right text-[#E8E8E8]">{selected.profile.avgSentenceLength}</span>
                  </div>
                  <div className="rounded bg-[#0F0F0F] px-2 py-1.5">
                    <span className="text-[#555]">句长标准差</span>
                    <span className="float-right text-[#E8E8E8]">{selected.profile.sentenceLengthStdDev}</span>
                  </div>
                  <div className="rounded bg-[#0F0F0F] px-2 py-1.5">
                    <span className="text-[#555]">平均段落</span>
                    <span className="float-right text-[#E8E8E8]">{selected.profile.avgParagraphLength}</span>
                  </div>
                  <div className="rounded bg-[#0F0F0F] px-2 py-1.5">
                    <span className="text-[#555]">段落范围</span>
                    <span className="float-right text-[#E8E8E8]">
                      {selected.profile.paragraphLengthRange.min}-{selected.profile.paragraphLengthRange.max}
                    </span>
                  </div>
                  <div className="rounded bg-[#0F0F0F] px-2 py-1.5">
                    <span className="text-[#555]">词汇多样性</span>
                    <span className="float-right text-[#E8E8E8]">{selected.profile.vocabularyDiversity}</span>
                  </div>
                  <div className="rounded bg-[#0F0F0F] px-2 py-1.5">
                    <span className="text-[#555]">语言</span>
                    <span className="float-right text-[#E8E8E8]">{selected.profile.language === "zh" ? "中文" : "English"}</span>
                  </div>
                </div>

                {selected.profile.topPatterns.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-[#555]">高频句首: </span>
                    {selected.profile.topPatterns.map((p) => (
                      <span key={p} className="ml-1 rounded bg-[#0F0F0F] px-1.5 py-0.5 text-xs text-[#999]">{p}</span>
                    ))}
                  </div>
                )}
                {selected.profile.rhetoricalFeatures.length > 0 && (
                  <div className="mt-1">
                    <span className="text-xs text-[#555]">修辞特征: </span>
                    {selected.profile.rhetoricalFeatures.map((r) => (
                      <span key={r} className="ml-1 rounded bg-[#0F0F0F] px-1.5 py-0.5 text-xs text-[#999]">{r}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Guide */}
              <div className="mt-4">
                <h3 className="mb-2 text-xs text-[#C9A86C]">写作风格指南</h3>
                <div className="max-h-[50vh] overflow-y-auto rounded-lg bg-[#0F0F0F] p-3 text-xs leading-relaxed text-[#999] whitespace-pre-wrap">
                  {selected.guide}
                </div>
              </div>

              {selected.sample && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs text-[#C9A86C]">原文样本</h3>
                  <p className="text-xs text-[#555] line-clamp-3">{selected.sample}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[14px] bg-[#141414] p-8 text-center text-sm text-[#787878]">
              选择左侧的文风查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
