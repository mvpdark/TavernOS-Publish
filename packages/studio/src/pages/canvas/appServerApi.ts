// appServerApi.ts — TavernOS canvas API client
//
// All network calls go through the TavernOS API client (../../api/client.ts):
//   apiGet / apiPost / apiDelete / apiUpload
// Path arguments DO NOT include the `/api` prefix (the client adds it).
//
// Project id resolution: appServerApi.ts is a collection of pure (non-hook)
// functions, so it cannot call `useProjectStore()` directly. The store is
// persisted to localStorage under the key "tavernos-project" (zustand/persist),
// with shape { state: { currentProject: { id, name, ... } }, version: 0 }.
// `getCurrentProjectId()` reads that id at call time.

import {
	apiGet,
	apiPost,
	apiDelete,
	apiUpload,
} from "../../api/client.js";
import { toSafeCloudCollectionId } from "./appAssetRuntime";
import { normalizeRouteProjectId } from "./appRouting";
import { getReferenceAssetUrl } from "./referenceAssetUtils";
import type { CanvasWorkspaceSnapshot } from "./appWorkspaceSnapshot";

export type GeneratedAssetCategory = "video" | "audio" | "music" | "image";
export type GeneratedAssetImportSource = string | { url: string };
export type CloudAssetUploadResult = { cloudPath: string; url: string };
export type AssetRenameResponse = { cloudPath: string; url: string; name: string };
export type CanvasServerSnapshot = CanvasWorkspaceSnapshot & {
	id?: string;
	name?: string;
};
export type FfmpegStatusResponse = {
	available: boolean;
	path?: string;
	version?: string;
	error?: string;
};
export type FfmpegInstallResponse = FfmpegStatusResponse & {
	installed?: boolean;
	opened?: boolean;
	message?: string;
};

// ---------------------------------------------------------------------------
// Project id resolution
// ---------------------------------------------------------------------------

/**
 * Read the current project id from the persisted project store.
 * Returns "" when no project is selected or localStorage is unavailable.
 */
function getCurrentProjectId(): string {
	try {
		if (typeof localStorage === "undefined") return "";
		const raw = localStorage.getItem("tavernos-project");
		if (!raw) return "";
		const parsed = JSON.parse(raw) as
			| { state?: { currentProject?: { id?: unknown } } }
			| { currentProject?: { id?: unknown } }
			| null;
		const currentProject =
			(parsed as { state?: { currentProject?: { id?: unknown } } })?.state?.currentProject
			?? (parsed as { currentProject?: { id?: unknown } })?.currentProject;
		const id = currentProject?.id;
		return typeof id === "string" ? id.trim() : "";
	} catch {
		return "";
	}
}

/** Resolve the current project id, throwing a clear error when none is set. */
function requireProjectId(label: string): string {
	const projectId = getCurrentProjectId();
	if (!projectId) {
		throw new Error(
			`${label} 失败：未选择项目，无法访问 TavernOS 画布 API。`,
		);
	}
	return projectId;
}

// ---------------------------------------------------------------------------
// Shared normalizers / helpers
// ---------------------------------------------------------------------------

function normalizeOptionalQueryValue(value: string | undefined) {
	const normalized = value?.trim();
	return normalized || undefined;
}

function normalizeRequiredQueryValue(value: string | undefined, fallback: string) {
	return normalizeOptionalQueryValue(value) ?? fallback;
}

function normalizeCanvasProjectId(value: string | undefined) {
	return normalizeRouteProjectId(value) || "canvas";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requireTrimmedResponseString(
	record: Record<string, unknown>,
	key: string,
	label: string,
) {
	const value = record[key];
	const normalized = typeof value === "string" ? value.trim() : "";
	if (!normalized) {
		throw new Error(`${label} response is missing ${key}.`);
	}
	return normalized;
}

export function normalizeCloudAssetUploadResult(
	value: unknown,
	label = "CloudDrive upload",
): CloudAssetUploadResult {
	if (!isRecord(value)) {
		throw new Error(`${label} response is invalid.`);
	}
	return {
		cloudPath: requireTrimmedResponseString(value, "cloudPath", label),
		url: requireTrimmedResponseString(value, "url", label),
	};
}

export function normalizeAssetRenameResponse(
	value: unknown,
	label = "Asset rename",
): AssetRenameResponse {
	if (!isRecord(value)) {
		throw new Error(`${label} response is invalid.`);
	}
	return {
		cloudPath: requireTrimmedResponseString(value, "cloudPath", label),
		url: requireTrimmedResponseString(value, "url", label),
		name: requireTrimmedResponseString(value, "name", label),
	};
}

export function normalizeCanvasServerSnapshot(
	value: unknown,
): CanvasServerSnapshot | null {
	if (!isRecord(value)) return null;
	if (!Array.isArray(value.nodes)) return null;
	const connections = Array.isArray(value.connections) ? value.connections : [];
	const id = typeof value.id === "string" ? value.id.trim() : "";
	const name = typeof value.name === "string" ? value.name.trim() : "";
	return {
		...(id ? { id } : {}),
		...(name ? { name } : {}),
		nodes: value.nodes as CanvasWorkspaceSnapshot["nodes"],
		connections: connections as CanvasWorkspaceSnapshot["connections"],
	};
}

export function buildCanvasSaveRequestBody(
	canvasProjectId: string,
	canvasName: string,
	snapshot: CanvasWorkspaceSnapshot,
): CanvasServerSnapshot {
	const id = normalizeCanvasProjectId(canvasProjectId);
	const name = normalizeRequiredQueryValue(canvasName, id);
	return {
		id,
		name,
		nodes: Array.isArray(snapshot.nodes) ? snapshot.nodes : [],
		connections: Array.isArray(snapshot.connections)
			? snapshot.connections
			: [],
	};
}

// ---------------------------------------------------------------------------
// Canvas API path builders (no `/api` prefix)
// ---------------------------------------------------------------------------

/**
 * Build the TavernOS canvas API path (without the `/api` prefix) for a single
 * canvas: `/projects/{projectId}/canvas/{canvasId}`.
 *
 * `projectId` is resolved from the persisted project store; `canvasId` is
 * derived from `canvasProjectId` (the route project id). Throws when no
 * project is selected.
 */
export function buildCanvasApiPath(canvasProjectId: string) {
	const projectId = requireProjectId("访问画布");
	const canvasId = normalizeCanvasProjectId(canvasProjectId);
	return `/projects/${encodeURIComponent(projectId)}/canvas/${encodeURIComponent(
		canvasId,
	)}`;
}

/** Path for listing all canvases of the current project. */
function buildCanvasListApiPath() {
	const projectId = requireProjectId("列出画布");
	return `/projects/${encodeURIComponent(projectId)}/canvas`;
}

/** Path for the FFmpeg status endpoint of the current project. */
function buildFfmpegStatusApiPath() {
	const projectId = requireProjectId("查询 FFmpeg 状态");
	return `/projects/${encodeURIComponent(projectId)}/canvas/ffmpeg-status`;
}

/** Path for canvas asset uploads of the current project. */
function buildCanvasAssetUploadApiPath() {
	const projectId = requireProjectId("上传画布资产");
	return `/projects/${encodeURIComponent(
		projectId,
	)}/canvas-assets/upload`;
}

// ---------------------------------------------------------------------------
// Canvas CRUD
// ---------------------------------------------------------------------------

/**
 * List all canvases of the current project.
 * Accepts both a bare array and a `{ canvases: [...] }` response shape.
 */
export async function listCanvasesFromServer(): Promise<CanvasServerSnapshot[]> {
	const data = await apiGet<unknown>(buildCanvasListApiPath());
	const items = Array.isArray(data)
		? data
		: isRecord(data) && Array.isArray(data.canvases)
			? data.canvases
			: [];
	return items
		.map((item) => normalizeCanvasServerSnapshot(item))
		.filter((snapshot): snapshot is CanvasServerSnapshot => snapshot !== null);
}

export async function loadCanvasFromServer(
	canvasProjectId: string,
): Promise<CanvasServerSnapshot | null> {
	try {
		const data = await apiGet<unknown>(buildCanvasApiPath(canvasProjectId));
		return normalizeCanvasServerSnapshot(data);
	} catch {
		// Missing project, 404, or network error — treat as "no canvas".
		return null;
	}
}

export async function saveCanvasToServer(
	canvasProjectId: string,
	canvasName: string,
	snapshot: CanvasWorkspaceSnapshot,
): Promise<void> {
	await apiPost(
		buildCanvasApiPath(canvasProjectId),
		buildCanvasSaveRequestBody(canvasProjectId, canvasName, snapshot),
	);
}

export async function deleteCanvasFromServer(
	canvasProjectId: string,
): Promise<void> {
	try {
		await apiDelete(buildCanvasApiPath(canvasProjectId));
	} catch (error) {
		// Tolerate 404 / not-found (canvas already deleted) to preserve the
		// previous behavior where deletion of a missing canvas was a no-op.
		const message = error instanceof Error ? error.message : String(error);
		if (/\b404\b/.test(message) || /not\s+found/i.test(message)) return;
		throw error;
	}
}

// ---------------------------------------------------------------------------
// FFmpeg
// ---------------------------------------------------------------------------

export async function fetchFfmpegStatus(): Promise<FfmpegStatusResponse> {
	return apiGet<FfmpegStatusResponse>(buildFfmpegStatusApiPath());
}

export async function requestLocalFfmpegStatus(): Promise<FfmpegStatusResponse> {
	return fetchFfmpegStatus();
}

export async function requestLocalFfmpegInstall(): Promise<FfmpegInstallResponse> {
	// TavernOS canvas backend exposes only ffmpeg-status; automatic install is
	// not supported server-side.
	throw new Error("TavernOS 后端暂不支持 FFmpeg 自动安装。");
}

export async function requestLocalVideoProbe(blob: Blob): Promise<unknown> {
	// TavernOS canvas backend does not expose a video probe endpoint.
	void blob;
	throw new Error("TavernOS 后端暂不支持本地视频探测（ffprobe）。");
}

// ---------------------------------------------------------------------------
// Asset upload helpers
// ---------------------------------------------------------------------------

type AssetUploadUrlOptions = {
	mode: "temp" | "generated" | "asset";
	category: string;
	name?: string;
	space?: string;
	canvas?: string;
	canvasName?: string;
};

type AssetUploadRequestOptions = Omit<AssetUploadUrlOptions, "name"> & {
	file: Pick<File, "name" | "type">;
	fallbackName?: string;
	fallbackContentType?: string;
};

/**
 * Internal plan for a canvas asset upload: the multipart endpoint path plus
 * the metadata fields that should be appended to the FormData alongside the
 * file, and the file's content type.
 */
type AssetUploadRequest = {
	path: string;
	contentType: string;
	fields: Record<string, string>;
};

type CanvasAssetUploadRequestOptions = {
	file: Pick<File, "name" | "type">;
	canvasProjectId?: string | null;
	canvasName?: string;
	category: string;
};

export function resolveAssetUploadFileName(
	file: Pick<File, "name">,
	fallback = "asset.bin",
) {
	return normalizeRequiredQueryValue(file.name, fallback);
}

export function resolveAssetUploadContentType(
	file: Pick<File, "type">,
	fallback = "application/octet-stream",
) {
	return normalizeRequiredQueryValue(file.type, fallback);
}

/**
 * Build the TavernOS canvas asset upload path (without `/api` prefix).
 * Metadata (mode/category/name/space/canvas/canvasName) is sent as FormData
 * fields by `buildAssetUploadRequest`, not as query parameters.
 */
export function buildAssetUploadUrl(options: AssetUploadUrlOptions) {
	void options;
	return buildCanvasAssetUploadApiPath();
}

export function buildAssetUploadRequest(
	options: AssetUploadRequestOptions,
): AssetUploadRequest {
	const fields: Record<string, string> = {
		mode: options.mode,
		category: normalizeRequiredQueryValue(options.category, "asset"),
		name: resolveAssetUploadFileName(options.file, options.fallbackName),
	};
	const space = normalizeOptionalQueryValue(options.space);
	const canvas = normalizeOptionalQueryValue(options.canvas);
	const canvasName = normalizeOptionalQueryValue(options.canvasName);
	if (space) fields.space = space;
	if (canvas) fields.canvas = canvas;
	if (canvasName) fields.canvasName = canvasName;
	return {
		path: buildCanvasAssetUploadApiPath(),
		contentType: resolveAssetUploadContentType(
			options.file,
			options.fallbackContentType,
		),
		fields,
	};
}

export function buildCanvasAssetUploadRequest(
	options: CanvasAssetUploadRequestOptions,
): AssetUploadRequest {
	const canvasProjectId = normalizeCanvasProjectId(
		options.canvasProjectId ?? undefined,
	);
	return buildAssetUploadRequest({
		mode: "temp",
		space: "画布",
		canvas: canvasProjectId,
		canvasName: normalizeRequiredQueryValue(options.canvasName, canvasProjectId),
		category: options.category,
		file: options.file,
	});
}

export function buildGeneratedAssetImportBody(
	sourceUrl: GeneratedAssetImportSource,
	name: string,
	category: GeneratedAssetCategory,
	contentType?: string,
) {
	const normalizedSourceUrl = resolveGeneratedAssetImportSourceUrl(sourceUrl);
	return {
		sourceUrl: normalizedSourceUrl,
		mode: "generated",
		category,
		name,
		contentType,
	};
}

export function resolveGeneratedAssetImportSourceUrl(
	sourceUrl: GeneratedAssetImportSource,
) {
	return typeof sourceUrl === "string"
		? sourceUrl.trim()
		: getReferenceAssetUrl(sourceUrl);
}

async function uploadFileToCloudDrive(
	request: AssetUploadRequest,
	file: File,
	fallbackMessage: string,
): Promise<CloudAssetUploadResult> {
	const formData = new FormData();
	for (const [key, value] of Object.entries(request.fields)) {
		formData.append(key, value);
	}
	formData.append("file", file, file.name || "asset.bin");
	const result = await apiUpload<unknown>(request.path, formData);
	return normalizeCloudAssetUploadResult(result, fallbackMessage);
}

export async function uploadAssetToCloudDrive(
	file: File,
	canvasProjectId: string | null,
	canvasName: string,
	category: string,
): Promise<CloudAssetUploadResult> {
	return uploadFileToCloudDrive(
		buildCanvasAssetUploadRequest({
			canvasProjectId,
			canvasName,
			category,
			file,
		}),
		file,
		"CloudDrive upload failed",
	);
}

export async function uploadGeneratedAssetToCloudDrive(
	file: File,
	category: GeneratedAssetCategory,
): Promise<CloudAssetUploadResult> {
	return uploadFileToCloudDrive(
		buildAssetUploadRequest({
			mode: "generated",
			category,
			file,
		}),
		file,
		"Generated asset upload failed",
	);
}

export async function uploadAssetToLibraryCloudDrive(
	file: File,
	space: string,
	collectionName: string,
	category: string,
): Promise<CloudAssetUploadResult> {
	return uploadFileToCloudDrive(
		buildAssetUploadRequest({
			mode: "asset",
			space,
			canvas: toSafeCloudCollectionId(collectionName),
			canvasName: collectionName,
			category,
			file,
		}),
		file,
		"Asset library upload failed",
	);
}

export async function importGeneratedAssetToCloudDrive(
	sourceUrl: GeneratedAssetImportSource,
	name: string,
	category: GeneratedAssetCategory,
	contentType?: string,
): Promise<CloudAssetUploadResult> {
	const body = buildGeneratedAssetImportBody(sourceUrl, name, category, contentType);
	if (!body.sourceUrl) {
		throw new Error("Generated asset import source URL is empty.");
	}
	// TavernOS canvas backend exposes only multipart asset upload; importing
	// an asset from a remote URL is not supported.
	throw new Error("TavernOS 后端暂不支持从 URL 导入画布资产。");
}

export async function renameAssetInCloudDrive(
	cloudPath: string,
	name: string,
): Promise<AssetRenameResponse> {
	const normalizedCloudPath = cloudPath.trim();
	const normalizedName = name.trim();
	if (!normalizedCloudPath) {
		throw new Error("Asset rename cloud path is empty.");
	}
	if (!normalizedName) {
		throw new Error("Asset rename name is empty.");
	}
	// TavernOS canvas backend does not expose an asset rename endpoint.
	throw new Error("TavernOS 后端暂不支持画布资产重命名。");
}
