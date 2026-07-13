import type { NodeStyleRef, StyleCategory, StyleDocument, StyleLibraryState, StylePreset, StyleSource } from './canvas-types';

const now = Date.now();

const categories: StyleCategory[] = [
  { id: 'realistic', name: '写实', description: '电影感、纪实感与年代风格。', cover: 'linear-gradient(160deg, #f8d49a, #9a5c42 52%, #281814)' },
  { id: 'anime-2d', name: '2D动漫', description: '手绘、赛璐璐与日系动画。', cover: 'linear-gradient(160deg, #8de7c5, #4c8f7b 55%, #1a2930)' },
  { id: 'anime-3d', name: '3D动漫', description: '三维角色、CG 与风格化渲染。', cover: 'linear-gradient(160deg, #ffc187, #ff7b96 55%, #5b3357)' },
  { id: 'retro', name: '复古', description: '胶片、VHS、年代视觉。', cover: 'linear-gradient(160deg, #f9a77e, #8f5eff 58%, #160f25)' },
  { id: 'experimental', name: '实验', description: '概念感和强风格化表达。', cover: 'linear-gradient(160deg, #52d8ff, #8b4dff 56%, #120b27)' },
];

const presets: StylePreset[] = [
  { id: 'realistic-80s', categoryId: 'realistic', name: '80年代', summary: '暖调胶片、年代生活感。', cover: 'linear-gradient(160deg, #f8d49a, #9a5c42 52%, #281814)', docId: 'doc-realistic-80s' },
  { id: 'realistic-tvb', categoryId: 'realistic', name: 'TVB风', summary: '港味电视剧灯光与生活场景。', cover: 'linear-gradient(160deg, #f3b07a, #8c4f52 52%, #22131c)', docId: 'doc-realistic-tvb' },
  { id: 'anime2d-ghibli', categoryId: 'anime-2d', name: '宫崎骏', summary: '柔和天光、自然气息、童话感。', cover: 'linear-gradient(160deg, #8de7c5, #4c8f7b 55%, #1a2930)', docId: 'doc-anime2d-ghibli' },
  { id: 'anime2d-shinkai', categoryId: 'anime-2d', name: '新海诚', summary: '高饱和天空、通透光影、情绪景别。', cover: 'linear-gradient(160deg, #76d6ff, #5669ff 54%, #241f3d)', docId: 'doc-anime2d-shinkai' },
  { id: 'anime3d-pixar', categoryId: 'anime-3d', name: '皮克斯感', summary: '圆润材质、柔和体积光、角色电影感。', cover: 'linear-gradient(160deg, #ffc187, #ff7b96 55%, #5b3357)', docId: 'doc-anime3d-pixar' },
  { id: 'anime3d-gamecg', categoryId: 'anime-3d', name: '游戏CG', summary: '高对比边缘光、戏剧化角色塑形。', cover: 'linear-gradient(160deg, #85c9ff, #4d6dff 55%, #13162e)', docId: 'doc-anime3d-gamecg' },
  { id: 'retro-vhs', categoryId: 'retro', name: 'VHS', summary: '噪点、磁带偏色与旧电视质感。', cover: 'linear-gradient(160deg, #f9a77e, #8f5eff 58%, #160f25)', docId: 'doc-retro-vhs' },
  { id: 'retro-film', categoryId: 'retro', name: '老胶片', summary: '颗粒、暗角、轻微偏黄。', cover: 'linear-gradient(160deg, #f2d089, #8f6a3d 58%, #25170d)', docId: 'doc-retro-film' },
  { id: 'experimental-cyberpunk', categoryId: 'experimental', name: '赛博朋克', summary: '霓虹、雨夜、金属与蓝粉光。', cover: 'linear-gradient(160deg, #52d8ff, #8b4dff 56%, #120b27)', docId: 'doc-experimental-cyberpunk' },
  { id: 'experimental-ink', categoryId: 'experimental', name: '水墨', summary: '留白、墨韵、层次晕染。', cover: 'linear-gradient(160deg, #d9dce2, #767f90 56%, #161a24)', docId: 'doc-experimental-ink' },
];

const documents: StyleDocument[] = [
  createDocument('doc-realistic-80s', 'realistic', 'realistic-80s', '写实 / 80年代', ['80年代生活气息', '暖黄胶片', '柔和室内灯', '真实服饰', '旧时代城市质感'], ['过度未来感', '赛博朋克', '塑料皮肤', '低质 AI 细节'], '适合人物、街景、年代叙事。'),
  createDocument('doc-realistic-tvb', 'realistic', 'realistic-tvb', '写实 / TVB风', ['港风电视剧构图', '都市夜景', '低饱和肤色', '生活化布光', '轻微潮湿空气'], ['夸张二次元', '过强梦幻光晕', '超现实材质'], '适合都市人物、家庭戏、夜景街道。'),
  createDocument('doc-anime2d-ghibli', 'anime-2d', 'anime2d-ghibli', '2D动漫 / 宫崎骏', ['手绘动画背景', '自然风', '童话感', '温柔天光', '清新色彩'], ['重金属质感', '硬朗赛博光效', '写实摄影感'], '适合温暖人物与自然场景。'),
  createDocument('doc-anime2d-shinkai', 'anime-2d', 'anime2d-shinkai', '2D动漫 / 新海诚', ['高饱和天空', '澄澈空气透视', '情绪化逆光', '青春电影感'], ['低对比灰暗', '粗糙材质', '复古噪点过强'], '适合都市、校园、黄昏场景。'),
  createDocument('doc-anime3d-pixar', 'anime-3d', 'anime3d-pixar', '3D动漫 / 皮克斯感', ['圆润角色', '电影级柔光', '细腻材质', '亲和表情'], ['残酷写实', '脏污噪点', '过度锐利边缘'], '适合角色型图片、动画短片。'),
  createDocument('doc-anime3d-gamecg', 'anime-3d', 'anime3d-gamecg', '3D动漫 / 游戏CG', ['英雄角色', '高对比边缘光', '写实 CG 材质', '戏剧化镜头'], ['平淡生活感', '过度卡通化', '模糊细节'], '适合人物立绘与战斗场面。'),
  createDocument('doc-retro-vhs', 'retro', 'retro-vhs', '复古 / VHS', ['VHS 扫描线', '磁带色偏', '颗粒感', '旧电视影像'], ['现代数字锐利感', '超高清干净背景'], '适合怀旧 MV 与复古影像。'),
  createDocument('doc-retro-film', 'retro', 'retro-film', '复古 / 老胶片', ['电影胶片颗粒', '暗角', '暖黄偏色', '低对比'], ['霓虹赛博', '高饱和二次元'], '适合旧时代人物和街景。'),
  createDocument('doc-experimental-cyberpunk', 'experimental', 'experimental-cyberpunk', '实验 / 赛博朋克', ['霓虹雨夜', '蓝粉对撞', '未来金属', '湿润反射路面'], ['乡村自然风', '胶片暖黄', '纯白干净背景'], '适合城市、角色和视频概念设计。'),
  createDocument('doc-experimental-ink', 'experimental', 'experimental-ink', '实验 / 水墨', ['水墨晕染', '留白', '纸张肌理', '东方意境'], ['塑料感 3D', '强烈霓虹光', '写实摄影镜头'], '适合人物、山水、意境类画面。'),
];

function createDocument(
  id: string,
  categoryId: string,
  presetId: string,
  title: string,
  keywords: string[],
  negative: string[],
  notes: string,
): StyleDocument {
  return {
    id,
    categoryId,
    presetId,
    title,
    updatedAt: now,
    body: `# ${title}\n\n[keywords]\n${keywords.join('\n')}\n\n[negative]\n${negative.join('\n')}\n\n[notes]\n${notes}\n`,
  };
}

export const DEFAULT_STYLE_PRESET_ID = 'realistic-tvb';

export const DEFAULT_STYLE_LIBRARY: StyleLibraryState = {
  categories,
  presets,
  documents,
};

export function normalizeStyleLibrary(library: StyleLibraryState): StyleLibraryState {
  return {
    categories: library.categories.map((category) => ({
      ...category,
      cover: category.cover ?? 'linear-gradient(160deg, #98baff, #6568b9 52%, #1b1d32)',
    })),
    presets: library.presets.map((preset) => ({
      ...preset,
      cover: preset.cover ?? 'linear-gradient(160deg, #98baff, #6568b9 52%, #1b1d32)',
    })),
    documents: library.documents,
  };
}

export function createStyleRef(presetId = DEFAULT_STYLE_PRESET_ID, source: StyleSource = 'auto', library = DEFAULT_STYLE_LIBRARY): NodeStyleRef {
  const preset = library.presets.find((item) => item.id === presetId) ?? library.presets[0];
  return {
    categoryId: preset.categoryId,
    presetId: preset.id,
    docId: preset.docId,
    source,
    updatedAt: Date.now(),
  };
}

export function getStylePreset(library: StyleLibraryState, presetId?: string | null) {
  return library.presets.find((preset) => preset.id === presetId) ?? null;
}

export function getStyleCategory(library: StyleLibraryState, categoryId?: string | null) {
  return library.categories.find((category) => category.id === categoryId) ?? null;
}

export function getStyleDocument(library: StyleLibraryState, docId?: string | null) {
  return library.documents.find((document) => document.id === docId) ?? null;
}

export function getStyleLabel(library: StyleLibraryState, style?: NodeStyleRef | null) {
  if (!style) return '风格';
  const category = getStyleCategory(library, style.categoryId);
  const preset = getStylePreset(library, style.presetId);
  if (!category || !preset) return '风格';
  return `${category.name} / ${preset.name}`;
}

export function syncStyleRef(library: StyleLibraryState, nextPresetId: string, source: StyleSource): NodeStyleRef {
  return createStyleRef(nextPresetId, source, library);
}

export function createNewCategory(name: string): StyleCategory {
  const id = `category-${Date.now()}`;
  return {
    id,
    name,
    description: '自定义分类',
    cover: 'linear-gradient(160deg, #98baff, #6568b9 52%, #1b1d32)',
  };
}

export function createNewPreset(categoryId: string, name: string): { preset: StylePreset; document: StyleDocument } {
  const id = `preset-${Date.now()}`;
  const docId = `doc-${Date.now()}`;
  return {
    preset: {
      id,
      categoryId,
      name,
      summary: '自定义风格卡片',
      cover: 'linear-gradient(160deg, #98baff, #6568b9 52%, #1b1d32)',
      docId,
    },
    document: {
      id: docId,
      categoryId,
      presetId: id,
      title: name,
      body: `# ${name}\n\n[keywords]\n在这里写你的风格关键词\n\n[negative]\n在这里写你不想要的内容\n\n[notes]\n在这里补充说明。\n`,
      updatedAt: Date.now(),
    },
  };
}
