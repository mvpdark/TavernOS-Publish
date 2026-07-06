import {
  TextInput,
  TextArea,
  Modal,
  SelectField,
  NumberField,
} from "../../components/ui.tsx";
import type { EntryForm } from "./types.js";
import { LOGIC_OPTIONS, parseKeys } from "./types.js";
import type { JSX } from "react";

interface EntryFormModalProps {
  form: EntryForm;
  onFormChange: (form: EntryForm) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isEdit?: boolean;
}

export function EntryFormModal({
  form,
  onFormChange,
  onCancel,
  onSubmit,
  isEdit = false,
}: EntryFormModalProps): JSX.Element {
  return (
    <Modal
      title={isEdit ? "编辑条目" : "新建条目"}
      onClose={onCancel}
      footer={
        <>
          <button
            onClick={onCancel}
            className="btn-press rounded-lg border px-4 py-2 text-sm hover:bg-[var(--color-surface-hover)]"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={parseKeys(form.key).length === 0}
            className="btn-press rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            保存
          </button>
        </>
      }
    >
      <TextInput
        label="关键词（逗号分隔）"
        value={form.key}
        onChange={(v) => onFormChange({ ...form, key: v })}
      />
      <TextInput
        label="次要关键词（逗号分隔）"
        value={form.keysecondary}
        onChange={(v) => onFormChange({ ...form, keysecondary: v })}
      />
      <TextInput
        label="备注"
        value={form.comment}
        onChange={(v) => onFormChange({ ...form, comment: v })}
      />
      <TextArea
        label="内容"
        value={form.content}
        onChange={(v) => onFormChange({ ...form, content: v })}
        rows={4}
      />
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.constant}
          onChange={(e) => onFormChange({ ...form, constant: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <span className="text-sm text-[var(--color-text)]">常驻（Constant）</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="选择逻辑"
          value={form.selectiveLogic}
          onChange={(v) => onFormChange({ ...form, selectiveLogic: v })}
          options={LOGIC_OPTIONS}
        />
        <NumberField
          label="顺序"
          value={form.order}
          onChange={(v) => onFormChange({ ...form, order: v })}
        />
      </div>
    </Modal>
  );
}
