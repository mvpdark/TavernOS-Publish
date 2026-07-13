import { MINIMAX_TOKEN_PLAN_STORAGE_KEY } from "./minimaxTokenPlan";
import { normalizeRouteProjectId } from "./appRouting";

export type ProjectEntry = {
	id: string;
	title: string;
	time: string;
	count: string;
	accent: string;
	blurb: string;
};

export const CANVAS_LIBRARY_SEED: ProjectEntry[] = [
	{
		id: "canvas-today",
		title: "创作旅程（0417）",
		time: "今天 01:24",
		count: "5 个节点",
		accent: "linear-gradient(135deg, #55f1cf, #7c8cff 48%, #ff8fc7)",
		blurb: "当前主项目，适合继续做节点编排、连线引用和生成流程。",
	},
	{
		id: "canvas-midnight",
		title: "夜间广告脚本",
		time: "昨天 23:18",
		count: "3 个节点",
		accent: "linear-gradient(135deg, #ffbd7a, #ff5ba8 52%, #7a8cff)",
		blurb: "偏文本链路，适合脚本、分镜和广告文案的前期构思。",
	},
	{
		id: "canvas-image-set",
		title: "人物写真素材板",
		time: "4月6日 18:40",
		count: "8 个节点",
		accent: "linear-gradient(135deg, #65f0ff, #5e7bff 46%, #20242c)",
		blurb: "以图片节点为主，方便整理参考图、提示词和成片素材。",
	},
	{
		id: "canvas-audio",
		title: "音乐分镜草稿",
		time: "4月5日 09:32",
		count: "4 个节点",
		accent: "linear-gradient(135deg, #e8ff8f, #56f0b3 44%, #3a6cff)",
		blurb: "围绕音频节点的实验版项目，用来编排节奏与情绪线。",
	},
];

export const CANVAS_ACCENT_PRESETS = [
	"linear-gradient(135deg, #55f1cf, #7c8cff 48%, #ff8fc7)",
	"linear-gradient(135deg, #ffbd7a, #ff5ba8 52%, #7a8cff)",
	"linear-gradient(135deg, #65f0ff, #5e7bff 46%, #20242c)",
	"linear-gradient(135deg, #e8ff8f, #56f0b3 44%, #3a6cff)",
	"linear-gradient(135deg, #64f1df, #4a75ff 52%, #10131f)",
	"linear-gradient(135deg, #ffca78, #ff719e 44%, #6a77ff)",
	"linear-gradient(135deg, #8df7b6, #2f9d89 45%, #0c1717)",
	"linear-gradient(135deg, #f5a6ff, #7a5cff 48%, #1a0f2e)",
];

export const WORKSHOP_LIBRARY: ProjectEntry[] = [
	{
		id: "workshop-model-lab",
		title: "模型工坊",
		time: "今天 10:42",
		count: "12 个方案",
		accent: "linear-gradient(135deg, #64f1df, #4a75ff 52%, #10131f)",
		blurb: "集中管理模型方案、参数模板和不同能力的实验配置。",
	},
	{
		id: "workshop-assets",
		title: "资产整理台",
		time: "昨天 21:05",
		count: "28 个素材集",
		accent: "linear-gradient(135deg, #ffca78, #ff719e 44%, #6a77ff)",
		blurb: "更适合做图片、视频、音频成品的归档和二次筛选。",
	},
	{
		id: "workshop-templates",
		title: "模板市场草案",
		time: "4月6日 14:20",
		count: "9 个模板",
		accent: "linear-gradient(135deg, #8df7b6, #2f9d89 45%, #0c1717)",
		blurb: "后续可以承接模板、预设和可复用流程的市场化展示。",
	},
];

export const DEFAULT_CANVAS_PROJECT_ID = CANVAS_LIBRARY_SEED[0].id;
export const DEFAULT_WORKSHOP_PROJECT_ID = WORKSHOP_LIBRARY[0].id;
export const LEGACY_CANVAS_ID = "8d335a72-e16f-485e-8aeb-66e622cbe87a";

export const STORAGE_KEYS = {
	viewport: "kakashow-viewport-storage",
	workspaces: "kakashow-canvas-workspaces",
	styles: "kakashow-style-library",
	modelPrefs: "kakashow:model_prefs",
	language: "kakashowI18nextLng",
	notices: "kakashow:update_notices",
	tips: "kakashow-tutorial-tips-storage",
	theme: "kakashow-theme-tone",
	workshopDraft: "kakashow:workshop_draft",
	minimaxTokenPlan: MINIMAX_TOKEN_PLAN_STORAGE_KEY,
	voiceCatalog: "kakashow:voice_catalog",
	canvasLibrary: "kakashow-canvas-library",
	workshopLibrary: "kakashow-workshop-library",
} as const;

export const LEGACY_STORAGE_KEYS = {
	viewport: "tap-viewport-storage",
	modelPrefs: "tap:model_prefs",
	language: "tapnowI18nextLng",
	notices: "tap:update_notices",
	tips: "tap-tutorial-tips-storage",
} as const;

export const STORAGE_MIGRATION_MARKER_KEY = "kakashow:migrated_v1";

function normalizeProjectText(value: unknown, fallback: string) {
	const normalized = typeof value === "string" ? value.trim() : "";
	return normalized || fallback;
}

function getProjectCountSuffix(fallback: string) {
	const match = fallback.trim().match(/^-?\d+(.*)$/);
	return match?.[1] ?? "";
}

export function formatProjectCount(value: number, fallback: string) {
	if (!Number.isFinite(value)) return fallback;
	const normalizedCount = Math.max(0, Math.floor(value));
	return `${normalizedCount}${getProjectCountSuffix(fallback)}`;
}

export function normalizeProjectCount(value: unknown, fallback: string) {
	if (typeof value === "string") {
		const normalized = value.trim();
		if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
			return formatProjectCount(Number(normalized), fallback);
		}
		return normalized || fallback;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return formatProjectCount(value, fallback);
	}
	return fallback;
}

export function normalizeProjectAccent(value: unknown, fallback: string) {
	if (typeof value !== "string") return fallback;
	const normalized = value.trim();
	if (!normalized) return fallback;
	if (/^(linear|radial)-gradient\(/i.test(normalized)) return normalized;
	if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(normalized)) {
		return normalized;
	}
	if (/^rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?/i.test(normalized)) {
		return normalized;
	}
	if (/^hsla?\(\s*[\d.]+(?:deg|rad|turn)?\s*,\s*[\d.]+%\s*,\s*[\d.]+%/i.test(normalized)) {
		return normalized;
	}
	return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizeProjectEntry(
	value: unknown,
	fallback: ProjectEntry,
): ProjectEntry | null {
	if (!isRecord(value)) return null;
	const id = normalizeRouteProjectId(value.id);
	if (!id) return null;
	return {
		id,
		title: normalizeProjectText(value.title, fallback.title),
		time: normalizeProjectText(value.time, fallback.time),
		count: normalizeProjectCount(value.count, fallback.count),
		accent: normalizeProjectAccent(value.accent, fallback.accent),
		blurb: normalizeProjectText(value.blurb, fallback.blurb),
	};
}

export function normalizeProjectLibrary(
	value: unknown,
	fallbackLibrary: ProjectEntry[],
	{ fallbackWhenEmpty = true }: { fallbackWhenEmpty?: boolean } = {},
): ProjectEntry[] {
	const fallback = fallbackLibrary[0];
	if (!fallback) return [];
	const source = Array.isArray(value) ? value : [];
	const seenIds = new Set<string>();
	const normalized = source.flatMap((entry, index) => {
		const project = normalizeProjectEntry(
			entry,
			fallbackLibrary[index] ?? fallback,
		);
		if (!project || seenIds.has(project.id)) return [];
		seenIds.add(project.id);
		return [project];
	});
	if (normalized.length > 0 || !fallbackWhenEmpty) return normalized;
	return fallbackLibrary.map((project) => ({ ...project }));
}

export function normalizeProjectLibraryForWrite(
	value: ProjectEntry[],
	fallbackLibrary: ProjectEntry[],
): ProjectEntry[] {
	return normalizeProjectLibrary(value, fallbackLibrary, {
		fallbackWhenEmpty: false,
	});
}

function areProjectEntriesEqual(left: ProjectEntry, right: ProjectEntry) {
	return (
		left.id === right.id &&
		left.title === right.title &&
		left.time === right.time &&
		left.count === right.count &&
		left.accent === right.accent &&
		left.blurb === right.blurb
	);
}

export function normalizeProjectLibraryForState(
	value: ProjectEntry[],
	fallbackLibrary: ProjectEntry[],
): ProjectEntry[] {
	const normalized = normalizeProjectLibraryForWrite(value, fallbackLibrary);
	if (
		normalized.length === value.length &&
		normalized.every((project, index) =>
			areProjectEntriesEqual(project, value[index]),
		)
	) {
		return value;
	}
	return normalized;
}

export function readStorageString(key: string, fallback: string) {
	if (typeof window === "undefined") return fallback;
	try {
		return window.localStorage.getItem(key) ?? fallback;
	} catch {
		return fallback;
	}
}

export function readStorageJson<T>(key: string, fallback: T): T {
	if (typeof window === "undefined") return fallback;
	try {
		const value = window.localStorage.getItem(key);
		return value ? (JSON.parse(value) as T) : fallback;
	} catch {
		return fallback;
	}
}

export function writeStorageJson<T>(key: string, value: T) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// ignore storage write failures
	}
}

export function persistStorageJson(key: string, value: unknown) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Large media assets live in IndexedDB; if storage is full, keep the canvas usable.
	}
}

export function readCanvasLibrary(): ProjectEntry[] {
	return readProjectLibrary(STORAGE_KEYS.canvasLibrary, CANVAS_LIBRARY_SEED);
}

export function writeCanvasLibrary(library: ProjectEntry[]) {
	writeProjectLibrary(STORAGE_KEYS.canvasLibrary, library, CANVAS_LIBRARY_SEED);
}

export function readWorkshopLibrary(): ProjectEntry[] {
	return readProjectLibrary(STORAGE_KEYS.workshopLibrary, WORKSHOP_LIBRARY);
}

export function writeWorkshopLibrary(library: ProjectEntry[]) {
	writeProjectLibrary(STORAGE_KEYS.workshopLibrary, library, WORKSHOP_LIBRARY);
}

export function readProjectLibrary(
	storageKey: string,
	fallbackLibrary: ProjectEntry[],
): ProjectEntry[] {
	const library = readStorageJson<unknown>(storageKey, fallbackLibrary);
	return normalizeProjectLibrary(library, fallbackLibrary);
}

export function buildProjectLibraryStorageValue(
	library: ProjectEntry[],
	fallbackLibrary: ProjectEntry[],
): ProjectEntry[] {
	return normalizeProjectLibraryForWrite(library, fallbackLibrary);
}

export function writeProjectLibrary(
	storageKey: string,
	library: ProjectEntry[],
	fallbackLibrary: ProjectEntry[],
) {
	writeStorageJson(
		storageKey,
		buildProjectLibraryStorageValue(library, fallbackLibrary),
	);
}

export function formatProjectTime(date = new Date()) {
	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);
	const startOfTarget = new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	);
	const dayDiff = Math.round(
		(startOfToday.getTime() - startOfTarget.getTime()) / (24 * 60 * 60 * 1000),
	);
	const time = date.toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	if (dayDiff === 0) return `今天 ${time}`;
	if (dayDiff === 1) return `昨天 ${time}`;
	return date.toLocaleDateString("zh-CN", {
		month: "numeric",
		day: "numeric",
	});
}

export function getCanvasDefaultProjectId(projects: ProjectEntry[]) {
	return projects[0]?.id ?? DEFAULT_CANVAS_PROJECT_ID;
}

export function getWorkshopDefaultProjectId(projects: ProjectEntry[]) {
	return projects[0]?.id ?? DEFAULT_WORKSHOP_PROJECT_ID;
}

export function createCanvasProjectEntry(
	index: number,
	nodeCount = 1,
	date = new Date(),
): ProjectEntry {
	const id = `canvas-${date.getTime().toString(36)}`;
	return {
		id,
		title: `新建画布 ${index + 1}`,
		time: formatProjectTime(date),
		count: formatProjectCount(nodeCount, CANVAS_LIBRARY_SEED[0].count),
		accent:
			CANVAS_ACCENT_PRESETS[index % CANVAS_ACCENT_PRESETS.length] ??
			CANVAS_ACCENT_PRESETS[0],
		blurb: "新建空白画布，可继续编排节点、连线和生成流程。",
	};
}

export function createWorkshopProjectEntry(
	index: number,
	date = new Date(),
): ProjectEntry {
	const id = `workshop-${date.getTime().toString(36)}`;
	return {
		id,
		title: `新建工坊 ${index + 1}`,
		time: formatProjectTime(date),
		count: formatProjectCount(0, WORKSHOP_LIBRARY[0].count),
		accent:
			CANVAS_ACCENT_PRESETS[(index + 4) % CANVAS_ACCENT_PRESETS.length] ??
			CANVAS_ACCENT_PRESETS[0],
		blurb: "新建工坊项目，可继续整理模型方案、素材集和模板流程。",
	};
}
