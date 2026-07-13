import { getModelDisplayLabel } from "./modelOptions";
import type { CanvasNode, NodeType } from "./canvas-types";

export type ImageToolbarActionKey = "perspective" | "redraw" | "reverse-prompt" | "folder";

export type ImageToolbarAction = {
	key: ImageToolbarActionKey;
	label: string;
};

export type CanvasNodeShotSourceState = {
	shotSourceTitle: string;
	showShotSource: boolean;
	shotSourceBadgeLabel: string;
	shotSourceInlineLabel: string;
};

export type CanvasNodeShotSummaryState = {
	shotCharacterSummary: string;
	shotSceneSummary: string;
	shotMetaLabels: readonly string[];
};

export type CanvasNodeStructuredPreviewState = {
	showStructuredPreview: boolean;
	structuredPreviewChipLabel: string;
	showStructuredPreviewLinks: boolean;
	showStructuredPreviewMeta: boolean;
};

export type CanvasNodeViewState = {
	titleLabel: string;
	textPreview: string;
	modelDisplayLabel: string;
	showGrokExtendButton: boolean;
	imageToolbarActions: readonly ImageToolbarAction[];
} & CanvasNodeShotSourceState & CanvasNodeShotSummaryState & CanvasNodeStructuredPreviewState;

export type CanvasNodeVideoToolbarState = {
	isVideoEnhanceButtonActive: boolean;
	isVideoEnhanceButtonDisabled: boolean;
	isVideoExtendButtonActive: boolean;
	isVideoExtendButtonDisabled: boolean;
	videoEnhanceButtonLabel: string;
	videoExtendButtonLabel: string;
	grokExtendButtonLabel: string;
	grokExtendButtonDisabled: boolean;
};

export type CanvasNodeViewStateOptions = {
	shotSourceTitle?: string | null;
	shotLinkedCharacterCount?: number;
	shotLinkedSceneCount?: number;
	shotLinkedCharacterTitles?: readonly string[];
	shotLinkedSceneTitles?: readonly string[];
	hasInlineVideoAsset?: boolean;
	isVideoEnhancePanelOpen?: boolean;
	isVideoEnhancing?: boolean;
	isVideoExtendPanelOpen?: boolean;
	isVideoExtending?: boolean;
};

const DEFAULT_TEXT_PREVIEW = "等待输入或生成文本内容";

export const IMAGE_TOOLBAR_ACTIONS: readonly ImageToolbarAction[] = [
	{ key: "perspective", label: "多角度" },
	{ key: "redraw", label: "重绘" },
	{ key: "reverse-prompt", label: "反推" },
	{ key: "folder", label: "上传" },
];

const NODE_TITLE_LABELS: Record<NodeType, string> = {
	image: "image",
	text: "text",
	video: "video",
	audio: "audio",
	music: "music",
	shot: "shot",
	character: "character",
	scene: "scene",
	editor: "image",
};

const STRUCTURED_PREVIEW_CHIP_LABELS: Partial<Record<NodeType, string>> = {
	shot: "镜头规划",
	character: "角色设定",
	scene: "场景设定",
};

export function canExtendGrokVideoAsset(asset?: CanvasNode["asset"]) {
	if (!asset?.providerTaskId) return false;
	const provider = String(asset.provider || "").trim().toLowerCase();
	const model = String(asset.providerModel || "").trim().toLowerCase();
	return provider === "grok" || model.includes("grok-video");
}

export function buildCanvasNodeVideoToolbarState(
	options: CanvasNodeViewStateOptions = {},
): CanvasNodeVideoToolbarState {
	const hasInlineVideoAsset = Boolean(options.hasInlineVideoAsset);
	const isVideoEnhancePanelOpen = Boolean(options.isVideoEnhancePanelOpen);
	const isVideoEnhancing = Boolean(options.isVideoEnhancing);
	const isVideoExtendPanelOpen = Boolean(options.isVideoExtendPanelOpen);
	const isVideoExtending = Boolean(options.isVideoExtending);
	return {
		isVideoEnhanceButtonActive: isVideoEnhancePanelOpen || isVideoExtendPanelOpen,
		isVideoEnhanceButtonDisabled: !hasInlineVideoAsset || isVideoEnhancing,
		isVideoExtendButtonActive: isVideoExtendPanelOpen,
		isVideoExtendButtonDisabled: !hasInlineVideoAsset || isVideoExtending,
		videoEnhanceButtonLabel: isVideoEnhancing ? "处理中" : "增强",
		videoExtendButtonLabel: isVideoExtending ? "扩展中" : "扩展",
		grokExtendButtonLabel: isVideoExtending ? "扩展中" : "Grok 扩展",
		grokExtendButtonDisabled: isVideoExtending,
	};
}

export function getNodeTitleLabel(type: NodeType) {
	return NODE_TITLE_LABELS[type] ?? type;
}

export function getTextPreview(prompt?: string) {
	const value = (prompt || "").trim();
	if (!value) return DEFAULT_TEXT_PREVIEW;
	return value;
}

export function getCanvasNodeTextPreview(node: CanvasNode) {
	return node.type === "text" || node.type === "shot"
		? getTextPreview(node.composer?.prompt)
		: "";
}

export function getShotSourceTitle(title?: string | null) {
	return (title || "").trim();
}

export function shouldShowShotSource(type: NodeType, shotSourceTitle: string) {
	return Boolean(shotSourceTitle) && (type === "image" || type === "video");
}

export function normalizeShotLinkCount(count = 0) {
	if (!Number.isFinite(count)) return 0;
	return Math.max(0, Math.floor(count));
}

export function getShotLinkSummary(
	label: "角色" | "场景",
	titles: readonly string[] = [],
	count = 0,
) {
	const visibleTitles = titles.map((title) => title.trim()).filter(Boolean);
	const normalizedCount = normalizeShotLinkCount(count);
	if (!visibleTitles.length) return `${label} ${normalizedCount}`;
	const overflowCount = visibleTitles.length - 2;
	return `${label} · ${visibleTitles.slice(0, 2).join("、")}${
		overflowCount > 0 ? ` +${overflowCount}` : ""
	}`;
}

export function getCanvasNodeShotMetaLabels(node: CanvasNode) {
	return [
		node.composer?.shotSize,
		node.composer?.cameraAngle,
		node.composer?.frameRatio,
	].map((label) => (label || "").trim()).filter(Boolean);
}

export function buildCanvasNodeShotSourceState(
	type: NodeType,
	title?: string | null,
): CanvasNodeShotSourceState {
	const shotSourceTitle = getShotSourceTitle(title);
	const showShotSource = shouldShowShotSource(type, shotSourceTitle);
	return {
		shotSourceTitle,
		showShotSource,
		shotSourceBadgeLabel: showShotSource ? `镜头来源 · ${shotSourceTitle}` : "",
		shotSourceInlineLabel: showShotSource ? `来源镜头：${shotSourceTitle}` : "",
	};
}

export function buildCanvasNodeShotSummaryState(
	node: CanvasNode,
	options: CanvasNodeViewStateOptions = {},
): CanvasNodeShotSummaryState {
	return {
		shotCharacterSummary: getShotLinkSummary(
			"角色",
			options.shotLinkedCharacterTitles,
			options.shotLinkedCharacterCount,
		),
		shotSceneSummary: getShotLinkSummary(
			"场景",
			options.shotLinkedSceneTitles,
			options.shotLinkedSceneCount,
		),
		shotMetaLabels: getCanvasNodeShotMetaLabels(node),
	};
}

export function buildCanvasNodeStructuredPreviewState(
	type: NodeType,
): CanvasNodeStructuredPreviewState {
	const structuredPreviewChipLabel = STRUCTURED_PREVIEW_CHIP_LABELS[type] ?? "";
	const showStructuredPreview = Boolean(structuredPreviewChipLabel);
	return {
		showStructuredPreview,
		structuredPreviewChipLabel,
		showStructuredPreviewLinks: type === "shot",
		showStructuredPreviewMeta: type === "shot",
	};
}

export function buildCanvasNodeViewState(
	node: CanvasNode,
	options: CanvasNodeViewStateOptions = {},
): CanvasNodeViewState {
	const shotSourceState = buildCanvasNodeShotSourceState(node.type, options.shotSourceTitle);
	const shotSummaryState = buildCanvasNodeShotSummaryState(node, options);
	const structuredPreviewState = buildCanvasNodeStructuredPreviewState(node.type);
	return {
		titleLabel: getNodeTitleLabel(node.type),
		textPreview: getCanvasNodeTextPreview(node),
		modelDisplayLabel: node.composer?.model
			? getModelDisplayLabel(node.composer.model)
			: "",
		...shotSourceState,
		...shotSummaryState,
		...structuredPreviewState,
		showGrokExtendButton: node.type === "video" && canExtendGrokVideoAsset(node.asset),
		imageToolbarActions: IMAGE_TOOLBAR_ACTIONS,
	};
}
