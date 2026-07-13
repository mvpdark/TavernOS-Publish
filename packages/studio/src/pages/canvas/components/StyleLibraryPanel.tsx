import { useMemo, useState } from 'react';
import { createNewCategory, createNewPreset, getStyleDocument } from '../styleLibrary';
import type { StyleLibraryState } from '../canvas-types';

type StyleReferenceCounts = {
  categories: Record<string, number>;
  presets: Record<string, number>;
};

type StyleLibraryPanelProps = {
  library: StyleLibraryState;
  referenceCounts: StyleReferenceCounts;
  onChange: (library: StyleLibraryState) => void;
};

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      const targetWidth = 360;
      const targetHeight = 480;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Failed to prepare image cover'));
        return;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const sourceRatio = image.width / image.height;
      const targetRatio = targetWidth / targetHeight;
      const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
      const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
      const sourceX = (image.width - sourceWidth) / 2;
      const sourceY = (image.height - sourceHeight) / 2;

      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/webp', 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read image'));
    };
    image.src = url;
  });
}

function coverStyle(cover: string) {
  return cover.startsWith('data:')
    ? { backgroundImage: `url("${cover}")` }
    : { background: cover };
}

export function StyleLibraryPanel({ library, referenceCounts, onChange }: StyleLibraryPanelProps) {
  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState(library.categories[0]?.id ?? '');
  const [activePresetId, setActivePresetId] = useState(library.presets[0]?.id ?? '');
  const canDeleteCategory = library.categories.length > 1;

  const normalizedQuery = query.trim().toLowerCase();
  const visibleCategories = useMemo(
    () => library.categories.filter((category) => {
      if (!normalizedQuery) return true;
      return `${category.name} ${category.description}`.toLowerCase().includes(normalizedQuery);
    }),
    [library.categories, normalizedQuery],
  );
  const categoryPresets = useMemo(
    () => library.presets.filter((preset) => {
      if (preset.categoryId !== activeCategoryId) return false;
      if (!normalizedQuery) return true;
      return `${preset.name} ${preset.summary}`.toLowerCase().includes(normalizedQuery);
    }),
    [activeCategoryId, library.presets, normalizedQuery],
  );
  const activePreset = library.presets.find((preset) => preset.id === activePresetId) ?? categoryPresets[0] ?? null;
  const activeCategory = library.categories.find((category) => category.id === activeCategoryId) ?? library.categories[0] ?? null;
  const activeDocument = getStyleDocument(library, activePreset?.docId ?? null);
  const canDeletePreset = activeCategory
    ? library.presets.filter((preset) => preset.categoryId === activeCategory.id).length > 1
    : false;

  function updateCategory(categoryId: string, patch: Partial<(typeof library.categories)[number]>) {
    onChange({
      ...library,
      categories: library.categories.map((category) => (
        category.id === categoryId ? { ...category, ...patch } : category
      )),
    });
  }

  function updatePreset(presetId: string, patch: Partial<(typeof library.presets)[number]>) {
    onChange({
      ...library,
      presets: library.presets.map((preset) => (
        preset.id === presetId ? { ...preset, ...patch } : preset
      )),
    });
  }

  function createCategory() {
    const nextCategory = createNewCategory(`新分类 ${library.categories.length + 1}`);
    onChange({ ...library, categories: [...library.categories, nextCategory] });
    setActiveCategoryId(nextCategory.id);
  }

  function createPreset() {
    if (!activeCategoryId) return;
    const { preset, document } = createNewPreset(activeCategoryId, `新风格 ${categoryPresets.length + 1}`);
    onChange({
      categories: library.categories,
      presets: [...library.presets, preset],
      documents: [...library.documents, document],
    });
    setActivePresetId(preset.id);
  }

  function deleteCategory(categoryId: string) {
    if (library.categories.length <= 1) return;
    const deletedPresetIds = new Set(library.presets.filter((preset) => preset.categoryId === categoryId).map((preset) => preset.id));
    const nextCategories = library.categories.filter((category) => category.id !== categoryId);
    const nextPresets = library.presets.filter((preset) => preset.categoryId !== categoryId);
    const nextDocuments = library.documents.filter((document) => !deletedPresetIds.has(document.presetId));
    onChange({ categories: nextCategories, presets: nextPresets, documents: nextDocuments });
    setActiveCategoryId(nextCategories[0]?.id ?? '');
    setActivePresetId(nextPresets[0]?.id ?? '');
  }

  function deletePreset(presetId: string) {
    const categoryPresetCount = library.presets.filter((preset) => preset.categoryId === activeCategoryId).length;
    if (categoryPresetCount <= 1) return;
    const nextPresets = library.presets.filter((preset) => preset.id !== presetId);
    onChange({
      categories: library.categories,
      presets: nextPresets,
      documents: library.documents.filter((document) => document.presetId !== presetId),
    });
    setActivePresetId(nextPresets.find((preset) => preset.categoryId === activeCategoryId)?.id ?? nextPresets[0]?.id ?? '');
  }

  async function uploadCategoryCover(categoryId: string, file: File | null) {
    if (!file?.type?.startsWith('image/')) return;
    const cover = await readImageAsDataUrl(file);
    updateCategory(categoryId, { cover });
  }

  async function uploadPresetCover(presetId: string, file: File | null) {
    if (!file?.type?.startsWith('image/')) return;
    const cover = await readImageAsDataUrl(file);
    updatePreset(presetId, { cover });
  }

  return (
    <section className="style-library-panel">
      <div className="style-library-panel__head">
        <div>
          <span className="canvas-library__eyebrow">风格库</span>
          <h2>风格库</h2>
          <p>在网页里维护分类、子风格和关键词文档，节点只引用这里的风格配置。</p>
        </div>
        <div className="style-library-panel__actions">
          <label className="style-library-search">
            <span>搜索</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索分类或风格" />
          </label>
          <button className="workshop-page__back" type="button" onClick={createCategory}>新建主分类</button>
          <button className="workshop-page__back workshop-page__back--accent" type="button" onClick={createPreset}>新建子风格</button>
        </div>
      </div>

      <div className="style-library-workspace">
        <div className="style-library-column">
          <div className="style-library-column__head">
            <h3>主分类</h3>
            <span>{visibleCategories.length}</span>
          </div>
          <div className="style-library-folder-grid">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                className={`style-folder style-folder--library ${activeCategoryId === category.id ? 'is-active' : ''}`}
                type="button"
                onClick={() => {
                  setActiveCategoryId(category.id);
                  const firstPreset = library.presets.find((preset) => preset.categoryId === category.id);
                  if (firstPreset) setActivePresetId(firstPreset.id);
                }}
              >
                <span className="style-folder__cover" style={coverStyle(category.cover)} />
                <span className="style-folder__text">
                  <strong>{category.name}</strong>
                  <small>{category.description}</small>
                  <em>{referenceCounts.categories[category.id] ?? 0} 个节点引用</em>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="style-library-column style-library-column--cards">
          <div className="style-library-column__head">
            <h3>子风格</h3>
            <span>{categoryPresets.length}</span>
          </div>
          <div className="style-library-card-grid">
            {categoryPresets.map((preset) => (
              <button
                key={preset.id}
                className={`style-card style-card--library ${activePresetId === preset.id ? 'is-active' : ''}`}
                type="button"
                onClick={() => setActivePresetId(preset.id)}
              >
                <span className="style-card__cover style-card__cover--library" style={coverStyle(preset.cover)} />
                <span className="style-card__meta">
                  <strong>{preset.name}</strong>
                  <small>{preset.summary}</small>
                  <em>{referenceCounts.presets[preset.id] ?? 0} 个节点</em>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="style-library-column style-library-column--doc">
          <div className="style-library-column__head">
            <h3>风格详情</h3>
            {activePreset ? <span>{activePreset.name}</span> : null}
          </div>
          {activeCategory ? (
            <div className="style-library-editor-strip style-library-editor-strip--category">
              <label className="style-library-cover-upload">
                <span>{activePreset ? '子风格封面' : '分类封面'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => {
                    if (activePreset) {
                      uploadPresetCover(activePreset.id, event.target.files?.[0] ?? null);
                    } else {
                      uploadCategoryCover(activeCategory.id, event.target.files?.[0] ?? null);
                    }
                    event.currentTarget.value = '';
                  }}
                />
                <span
                  className="style-library-cover-upload__preview style-library-cover-upload__preview--portrait"
                  style={coverStyle(activePreset?.cover ?? activeCategory.cover)}
                >
                  <span>上传 3:4 图片</span>
                </span>
              </label>
              <label>
                分类名
                <input value={activeCategory.name} onChange={(event) => updateCategory(activeCategory.id, { name: event.target.value })} />
              </label>
              <label className="style-library-editor-strip__wide">
                分类说明
                <textarea value={activeCategory.description} onChange={(event) => updateCategory(activeCategory.id, { description: event.target.value })} />
              </label>
              <button
                className="style-library-danger"
                type="button"
                disabled={!canDeleteCategory}
                title={canDeleteCategory ? undefined : '至少保留一个分类'}
                onClick={() => deleteCategory(activeCategory.id)}
              >
                删除分类
              </button>
            </div>
          ) : null}
          {activePreset ? (
            <div className="style-library-editor-strip style-library-editor-strip--preset">
              <label>
                风格名
                <input value={activePreset.name} onChange={(event) => updatePreset(activePreset.id, { name: event.target.value })} />
              </label>
              <label className="style-library-editor-strip__wide">
                卡片说明
                <textarea value={activePreset.summary} onChange={(event) => updatePreset(activePreset.id, { summary: event.target.value })} />
              </label>
              <button
                className="style-library-danger"
                type="button"
                disabled={!canDeletePreset}
                title={canDeletePreset ? undefined : '至少保留一个子风格'}
                onClick={() => deletePreset(activePreset.id)}
              >
                删除子风格
              </button>
            </div>
          ) : null}
          <textarea
            className="style-library-doc"
            value={activeDocument?.body ?? ''}
            placeholder="选择一个风格后，在这里编辑关键词文档。"
            onChange={(event) => {
              if (!activeDocument) return;
              onChange({
                categories: library.categories,
                presets: library.presets,
                documents: library.documents.map((document) => (
                  document.id === activeDocument.id
                    ? { ...document, body: event.target.value, updatedAt: Date.now() }
                    : document
                )),
              });
            }}
          />
        </div>
      </div>
    </section>
  );
}
