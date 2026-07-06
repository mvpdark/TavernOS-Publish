import { useEffect, useState } from "react";
import { useProjectStore } from "../store/project.js";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client.js";
import { ConfirmDialog, BTN } from "../components/ui.tsx";
import { ScanConfigPanel } from "./lorebook/ScanConfigPanel.js";
import { EntryTable } from "./lorebook/EntryTable.js";
import { EntryFormModal } from "./lorebook/EntryFormModal.js";
import type {
  LoreEntry,
  EntriesResponse,
  DeleteResponse,
  ScanConfig,
  EntryForm,
} from "./lorebook/types.js";
import { EMPTY_FORM, parseKeys } from "./lorebook/types.js";
import type { JSX } from "react";

export default function LoreBook(): JSX.Element {
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [entries, setEntries] = useState<LoreEntry[]>([]);
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    recursionDepth: 1,
    scanDepth: 2,
    budgetPercentage: 25,
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LoreEntry | null>(null);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<LoreEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = async (id: string): Promise<void> => {
    try {
      const data = await apiGet<EntriesResponse>(`/projects/${id}/lorebook`);
      setEntries(data.entries ?? []);
    } catch {
      setEntries([]);
    }
  };

  const fetchConfig = async (id: string): Promise<void> => {
    try {
      const config = await apiGet<ScanConfig>(
        `/projects/${id}/lorebook/config`,
      );
      setScanConfig(config);
    } catch {
      // Use defaults if config not found
    }
  };

  const handleSaveConfig = async (newConfig: ScanConfig): Promise<void> => {
    if (!projectId) return;
    // Save the previous config so we can roll back the optimistic update if
    // the PUT fails (handleScanConfigChange already set the new value).
    const oldConfig = scanConfig;
    setConfigSaving(true);
    try {
      const saved = await apiPut<ScanConfig>(
        `/projects/${projectId}/lorebook/config`,
        newConfig,
      );
      setScanConfig(saved);
    } catch (e) {
      setScanConfig(oldConfig);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConfigSaving(false);
    }
  };

  const handleScanConfigChange = (newConfig: ScanConfig): void => {
    setScanConfig(newConfig);
    void handleSaveConfig(newConfig);
  };

  useEffect(() => {
    if (projectId) {
      void fetchEntries(projectId);
      void fetchConfig(projectId);
    } else {
      setEntries([]);
    }
  }, [projectId]);

  const openNew = (): void => {
    setForm(EMPTY_FORM);
    setEditingEntry(null);
    setModalOpen(true);
  };

  const openEdit = (entry: LoreEntry): void => {
    setEditingEntry(entry);
    setForm({
      key: entry.key?.join(", ") ?? "",
      keysecondary: entry.keysecondary?.join(", ") ?? "",
      comment: entry.comment ?? "",
      content: entry.content ?? "",
      constant: entry.constant ?? false,
      selectiveLogic: entry.selectiveLogic ?? "AND_ANY",
      order: entry.order ?? 100,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!projectId) return;
    const keys = parseKeys(form.key);
    if (keys.length === 0) {
      setError("请至少输入一个关键词");
      return;
    }
    try {
      if (editingEntry) {
        // Update existing entry
        await apiPut(`/projects/${projectId}/lorebook/${encodeURIComponent(editingEntry.filename)}`, {
          key: keys,
          keysecondary: parseKeys(form.keysecondary),
          comment: form.comment,
          content: form.content,
          constant: form.constant,
          selectiveLogic: form.selectiveLogic,
          order: form.order,
        });
      } else {
        // Create new entry
        await apiPost(`/projects/${projectId}/lorebook`, {
          key: keys,
          keysecondary: parseKeys(form.keysecondary),
          comment: form.comment,
          content: form.content,
          constant: form.constant,
          selectiveLogic: form.selectiveLogic,
          order: form.order,
        });
      }
      setModalOpen(false);
      setEditingEntry(null);
      await fetchEntries(projectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!projectId || !confirmDelete) return;
    try {
      await apiDelete<DeleteResponse>(
        `/projects/${projectId}/lorebook/${encodeURIComponent(confirmDelete.filename)}`,
      );
      setConfirmDelete(null);
      await fetchEntries(projectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!projectId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-light">世界书</h1>
        <p className="mt-6 text-gray-500">请先在仪表盘选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light">世界书</h1>
          <p className="mt-1 text-sm text-gray-500">
            当前项目：{currentProject?.name}
          </p>
        </div>
        <button
          onClick={openNew}
          className={BTN.primary}
        >
          新建条目
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-[rgba(201,104,90,0.08)] p-3 text-sm text-[#C9685A]">
          {error}
        </p>
      )}

      <ScanConfigPanel
        scanConfig={scanConfig}
        configSaving={configSaving}
        onChange={handleScanConfigChange}
      />

      {entries.length === 0 ? (
        <p className="mt-6 text-gray-500">暂无条目，点击"新建条目"创建</p>
      ) : (
        <EntryTable entries={entries} onDelete={setConfirmDelete} onEdit={openEdit} />
      )}

      {modalOpen && (
        <EntryFormModal
          form={form}
          onFormChange={setForm}
          onCancel={() => { setModalOpen(false); setEditingEntry(null); }}
          onSubmit={handleSubmit}
          isEdit={!!editingEntry}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="确认删除此条目？此操作不可撤销。"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
