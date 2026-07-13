import { createStyleRef } from "./styleLibrary";
import type { CanvasNode, ComposerPreset, NodeStyleRef, NodeType } from "./canvas-types";
import type { CanvasNodeSize } from "./canvasNodeSizing";

export type CanvasPoint = { x: number; y: number };

export const NODE_TYPE_FALLBACK_EMOJI: Record<NodeType, string> = {
	text: "✦",
	shot: "◼",
	character: "●",
	scene: "▲",
	audio: "♫",
	music: "♬",
	image: "▣",
	video: "▶",
	editor: "▤",
};

export function getNodeCopy(type: NodeType) {
	if (type === "text")
		return { label: "文本", placeholder: "双击开始编辑...", innerIcon: null };
	if (type === "shot")
		return {
			label: "镜头",
			placeholder: "镜头意图 / 景别 / 构图 / 运镜",
			innerIcon: NODE_TYPE_FALLBACK_EMOJI.shot,
		};
	if (type === "character")
		return {
			label: "角色",
			placeholder: "角色身份 / 外观 / 情绪 / 动作",
			innerIcon: NODE_TYPE_FALLBACK_EMOJI.character,
		};
	if (type === "scene")
		return {
			label: "场景",
			placeholder: "空间 / 时间 / 光线 / 氛围",
			innerIcon: NODE_TYPE_FALLBACK_EMOJI.scene,
		};
	if (type === "video")
		return {
			label: "视频",
			placeholder: "",
			innerIcon: NODE_TYPE_FALLBACK_EMOJI.video,
		};
	if (type === "audio")
		return {
			label: "音频",
			placeholder: "",
			innerIcon: NODE_TYPE_FALLBACK_EMOJI.audio,
		};
	if (type === "music")
		return {
			label: "音乐",
			placeholder: "",
			innerIcon: NODE_TYPE_FALLBACK_EMOJI.music,
		};
	if (type === "editor")
		return {
			label: "图片编辑器",
			placeholder: "",
			innerIcon: NODE_TYPE_FALLBACK_EMOJI.editor,
		};
	return {
		label: "图片",
		placeholder: "",
		innerIcon: NODE_TYPE_FALLBACK_EMOJI.image,
	};
}

export function screenToWorld(
	screenX: number,
	screenY: number,
	panX: number,
	panY: number,
	zoom: number,
) {
	return { x: (screenX - panX) / zoom, y: (screenY - panY) / zoom };
}

export function getDefaultNodeSize(type: NodeType): CanvasNodeSize {
	if (type === "shot") return { width: 380, height: 220 };
	if (type === "character" || type === "scene")
		return { width: 360, height: 220 };
	return type === "video" || type === "audio" || type === "music"
		? { width: 440, height: 220 }
		: { width: 328, height: 328 };
}

export function cloneComposer(composer: ComposerPreset): ComposerPreset {
	return {
		...composer,
		referenceAssets: composer.referenceAssets?.map((asset) =>
			asset ? { ...asset } : null,
		),
	};
}

export function createCanvasNode(
	type: NodeType,
	point: CanvasPoint,
	composer: ComposerPreset,
	size = getDefaultNodeSize(type),
	asset?: NonNullable<CanvasNode["asset"]>,
	style: NodeStyleRef = createStyleRef(),
): CanvasNode {
	return {
		id: crypto.randomUUID(),
		type,
		x: point.x,
		y: point.y,
		width: size.width,
		height: size.height,
		title: getNodeCopy(type).label,
		composer: cloneComposer(composer),
		style: { ...style },
		...(asset ? { asset: { ...asset } } : {}),
	};
}
