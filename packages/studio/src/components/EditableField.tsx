// EditableField.tsx
// ---------------------------------------------------------------------------
// Inline-editable text field extracted from CharacterDetailPanel.
//
// Shows a label + text preview. Clicking "编辑" switches to a textarea
// with save/cancel buttons. On save, calls onSave(newValue) and reverts
// to preview mode. On failure, reverts the draft and shows preview.
// ---------------------------------------------------------------------------

import { useState, type JSX } from "react";

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (newValue: string) => Promise<void>;
}

export default function EditableField({
  label,
  value,
  onSave,
}: EditableFieldProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async (): Promise<void> => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e) {
      console.error(`[detail] save ${label} failed:`, e);
      // Revert on failure
      setDraft(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (): void => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-[#C9A86C]">{label}</h4>
        {!editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="text-[10px] text-gray-500 hover:text-[#C9A86C] transition-colors"
          >
            编辑
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-1 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            autoFocus
            className="w-full rounded-lg border border-[rgba(201,168,108,0.3)] bg-[#0F0F0F] px-3 py-2 text-sm text-[#E8E8E8] focus:border-[#C9A86C] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded bg-[rgba(201,168,108,0.2)] px-2 py-0.5 text-[10px] text-[#C9A86C] hover:bg-[rgba(201,168,108,0.3)] disabled:opacity-50"
            >
              {saving ? "保存中…" : "保存"}
            </button>
            <button
              onClick={handleCancel}
              className="rounded bg-[#1C1C1E] px-2 py-0.5 text-[10px] text-gray-400 hover:bg-[#2A2A2A]"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-sm text-gray-300 whitespace-pre-wrap">
          {value || <span className="text-gray-600 italic">（空）</span>}
        </p>
      )}
    </div>
  );
}
