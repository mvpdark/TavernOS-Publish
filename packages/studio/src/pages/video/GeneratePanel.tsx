import { TextArea, SelectField, NumberField } from "../../components/ui.tsx";
import type { ComposeResult } from "./types.js";
import { IconCheck, IconX } from "../../components/Icons.tsx";
import { getSceneTypes, type SceneType } from "./prompt-enhancer.js";
import type { LipSyncProvider } from "@tavernos/core";
import ImageEditorModal from "./ImageEditorModal.js";
import type { JSX } from "react";

// TODO: i18n — This component contains hardcoded Chinese strings that should be migrated to t() calls.
//   Key strings to migrate:
//   - "生成配置" → video.generate.config
//   - "视频提示词" → video.generate.prompt
//   - "智能增强" / "增强中" → video.generate.enhance / video.generate.enhancing
//   - "章节 ID" → video.generate.chapterId
//   - "片段编号" → video.generate.clipNumber
//   - "时长（秒）" → video.generate.duration
//   - "参考图 URL（可选，每行一个，最多9个）" → video.generate.referenceImage
//   - "编辑图片" → video.generate.editImage
//   - "口型同步" → video.generate.lipSync
//   - lipSyncProvider options → video.generate.lipSyncProvider.*
//   - "生成视频" / "生成中..." → video.generate.generateBtn / video.generate.generating
//   - "剪辑合成" → video.compose.title
//   - "将所有已生成的片段合成为完整视频" → video.compose.description
//   - "转场类型" → video.compose.transitionType
//   - "合成 N 个片段" / "合成中..." → video.compose.composeBtn / video.compose.composing
//   - "AutoCut 智能剪辑" / "AutoCut 处理中..." → video.compose.autocut / video.compose.autocutting
//   - "导出剪映工程" / "导出中..." → video.compose.exportJianying / video.compose.exporting
//   - "合成成功" / "合成失败" → video.compose.success / video.compose.failed
//   - "时长" / "片段" → video.compose.duration / video.compose.clips
//   - "进度:" → needs its own key

const SCENE_TYPES = getSceneTypes();

interface GeneratePanelProps {
  // Generation form
  prompt: string;
  onPromptChange: (value: string) => void;
  chapterId: number;
  onChapterIdChange: (value: number) => void;
  clipNumber: number;
  onClipNumberChange: (value: number) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  /** Multi-line reference image URLs (one per line, max 9). Backward compatible: a single URL is sent as referenceImageUrl. */
  referenceImageUrl: string;
  onReferenceImageUrlChange: (value: string) => void;
  generating: boolean;
  genStatus: string;
  onGenerate: () => void;

  // Prompt enhancement
  enhancing: boolean;
  enhanceSceneType: SceneType | "auto";
  onEnhanceSceneTypeChange: (value: SceneType | "auto") => void;
  onEnhance: () => void;
  lastEnhancedInfo: string | null;

  // Composition controls
  transitionType: "cut" | "crossfade" | "fade";
  onTransitionTypeChange: (value: "cut" | "crossfade" | "fade") => void;
  composing: boolean;
  composeStatus: string;
  composeProgress: { current: number; total: number } | null;
  composeResult: ComposeResult | null;
  clipsCount: number;
  onCompose: () => void;

  // AutoCut — one-shot pipeline (generate → review → reroll → compose)
  autocutting: boolean;
  autocutStatus: string;
  onAutoCut: () => void;

  // JianYing export
  exportingJianying: boolean;
  exportStatus: string;
  onExportJianying: () => void;

  // Lip sync
  enableLipSync: boolean;
  onEnableLipSyncChange: (value: boolean) => void;
  lipSyncProvider: LipSyncProvider;
  onLipSyncProviderChange: (value: LipSyncProvider) => void;

  // Image editor
  imageEditorOpen: boolean;
  imageEditorUrl: string | null;
  onOpenImageEditor: (url: string) => void;
  onCloseImageEditor: () => void;
  onImageExport: (editedUrl: string) => void;
}

/** Left column: video generation configuration and composition controls. */
export default function GeneratePanel({
  prompt,
  onPromptChange,
  chapterId,
  onChapterIdChange,
  clipNumber,
  onClipNumberChange,
  duration,
  onDurationChange,
  referenceImageUrl,
  onReferenceImageUrlChange,
  generating,
  genStatus,
  onGenerate,
  enhancing,
  enhanceSceneType,
  onEnhanceSceneTypeChange,
  onEnhance,
  lastEnhancedInfo,
  transitionType,
  onTransitionTypeChange,
  composing,
  composeStatus,
  composeProgress,
  composeResult,
  clipsCount,
  onCompose,
  autocutting,
  autocutStatus,
  onAutoCut,
  exportingJianying,
  exportStatus,
  onExportJianying,
  enableLipSync,
  onEnableLipSyncChange,
  lipSyncProvider,
  onLipSyncProviderChange,
  imageEditorOpen,
  imageEditorUrl,
  onOpenImageEditor,
  onCloseImageEditor,
  onImageExport,
}: GeneratePanelProps): JSX.Element {
  const canEnhance = !enhancing && !generating && prompt.trim().length > 0;

  return (
    <div className="overflow-y-auto rounded-lg bg-white p-5 shadow">
      <h2 className="mb-3 text-sm font-light">生成配置</h2>

      <div className="space-y-3">
        {/* Prompt enhancement toolbar */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">视频提示词</label>
            <div className="flex items-center gap-1.5">
              <select
                value={enhanceSceneType}
                onChange={(e) => onEnhanceSceneTypeChange(e.target.value as SceneType | "auto")}
                disabled={enhancing || generating}
                className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] text-gray-600 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
                title="选择场景类型（自动识别或手动指定）"
              >
                <option value="auto">🎯 自动识别</option>
                {SCENE_TYPES.map((s) => (
                  <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
                ))}
              </select>
              <button
                onClick={onEnhance}
                disabled={!canEnhance}
                title="输入简单描述后点击，自动按万能公式补全为专业级prompt"
                className="btn-press flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {enhancing ? (
                  <>
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    增强中
                  </>
                ) : (
                  <>✨ 智能增强</>
                )}
              </button>
            </div>
          </div>
          <TextArea
            label=""
            value={prompt}
            onChange={onPromptChange}
            rows={4}
          />
          {lastEnhancedInfo && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-green-600">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{lastEnhancedInfo}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="章节 ID"
            value={chapterId}
            onChange={onChapterIdChange}
          />
          <NumberField
            label="片段编号"
            value={clipNumber}
            onChange={onClipNumberChange}
          />
        </div>

        <SelectField
          label="时长（秒）"
          value={String(duration)}
          onChange={(v) => onDurationChange(Number(v))}
          options={["4", "5", "6", "8", "10", "15"]}
        />

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">
              参考图 URL（可选，每行一个，最多9个）
            </label>
            {referenceImageUrl.trim() && (
              <button
                type="button"
                onClick={() => onOpenImageEditor(referenceImageUrl.trim().split("\n")[0]!.trim())}
                className="btn-press flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
                title="使用图片编辑器裁剪、标注或画蒙版"
              >
                ✏ 编辑图片
              </button>
            )}
          </div>
          <TextArea
            label=""
            value={referenceImageUrl}
            onChange={onReferenceImageUrlChange}
            rows={3}
          />
        </div>

        {/* Lip sync configuration */}
        <div className="rounded-lg bg-gray-50 p-3">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={enableLipSync}
              onChange={(e) => onEnableLipSyncChange(e.target.checked)}
              className="rounded"
            />
            口型同步
          </label>
          {enableLipSync && (
            <select
              value={lipSyncProvider}
              onChange={(e) => onLipSyncProviderChange(e.target.value as LipSyncProvider)}
              className="mt-2 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs"
            >
              <option value="seedance-audio">Seedance 音频引用（推荐，生成时同步）</option>
              <option value="wav2lip">Wav2Lip（后处理）</option>
              <option value="musetalk">MuseTalk（高分辨率后处理）</option>
              <option value="sadtalker">SadTalker（单图驱动）</option>
            </select>
          )}
        </div>

        <button
          onClick={onGenerate}
          disabled={generating || !prompt.trim()}
          className="btn-press w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {generating ? genStatus || "生成中..." : "生成视频"}
        </button>
      </div>

      {/* Composition controls */}
      <div className="mt-6 border-t pt-4">
        <h3 className="mb-2 text-sm font-light">剪辑合成</h3>
        <p className="mb-3 text-xs text-gray-500">
          将所有已生成的片段合成为完整视频
        </p>

        <SelectField
          label="转场类型"
          value={transitionType}
          onChange={(v) => onTransitionTypeChange(v)}
          options={["cut", "crossfade", "fade"] as const}
        />

        <button
          onClick={onCompose}
          disabled={composing || clipsCount === 0}
          className="btn-press mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {composing ? composeStatus || "合成中..." : `合成 ${clipsCount} 个片段`}
        </button>

        {/* AutoCut — one-shot intelligent pipeline */}
        <button
          onClick={onAutoCut}
          disabled={autocutting || composing || clipsCount === 0}
          className="btn-press mt-2 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {autocutting ? autocutStatus || "AutoCut 处理中..." : "AutoCut 智能剪辑"}
        </button>

        {/* Export to JianYing (CapCut) draft project file */}
        <button
          onClick={onExportJianying}
          disabled={exportingJianying || clipsCount === 0}
          className="btn-press mt-2 w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {exportingJianying ? exportStatus || "导出中..." : "导出剪映工程"}
        </button>

        {composeProgress && (
          <div className="mt-2 text-xs text-gray-500">
            进度: {composeProgress.current} / {composeProgress.total}
          </div>
        )}

        {composeResult && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs">
            <div className="flex items-center gap-1 font-medium">
              {composeResult.success ? (
                <>
                  <IconCheck size={14} className="text-green-600" />
                  <span>合成成功</span>
                </>
              ) : (
                <>
                  <IconX size={14} className="text-red-500" />
                  <span>合成失败</span>
                </>
              )}
            </div>
            <div className="mt-1 text-gray-500">
              时长: {composeResult.duration?.toFixed(1) ?? "—"}s · 片段: {composeResult.clipCount}
            </div>
            {composeResult.error && (
              <div className="mt-1 text-red-500">{composeResult.error}</div>
            )}
          </div>
        )}
      </div>

      {/* Image editor modal */}
      <ImageEditorModal
        open={imageEditorOpen}
        imageUrl={imageEditorUrl ?? undefined}
        onExport={(editedUrl) => onImageExport(editedUrl)}
        onClose={onCloseImageEditor}
      />
    </div>
  );
}
