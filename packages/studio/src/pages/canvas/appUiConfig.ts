import { NODE_TYPE_FALLBACK_EMOJI } from "./canvasNodeActions";
import type { PerspectiveEditSettings } from "./components/CanvasNodeView";
import { THREE_D_DIRECTOR_LABEL } from "./appThreeDDirector";
import type { NodeType, ThemeOption } from "./canvas-types";

export type MenuItem = {
	type: NodeType | "upload";
	label: string;
	desc?: string;
	icon: string;
};

export type WorkshopRoleTab = "角色设定" | "场景设定" | "物品设定";
export type WorkshopFrameTab = "模板" | "生图" | "生视频";
export type CanvasMode = "canvas" | "director" | "preview";

export const LEFT_TOOLS: Array<{ type: NodeType; icon: string }> = [
	{ type: "text", icon: NODE_TYPE_FALLBACK_EMOJI.text },
	{ type: "image", icon: NODE_TYPE_FALLBACK_EMOJI.image },
	{ type: "video", icon: NODE_TYPE_FALLBACK_EMOJI.video },
	{ type: "audio", icon: NODE_TYPE_FALLBACK_EMOJI.audio },
	{ type: "music", icon: NODE_TYPE_FALLBACK_EMOJI.music },
	{ type: "editor", icon: NODE_TYPE_FALLBACK_EMOJI.editor },
];

export const MENU_ITEMS: MenuItem[] = [
	{ type: "text", label: "文本", desc: "脚本、广告词、品牌文案", icon: NODE_TYPE_FALLBACK_EMOJI.text },
	{ type: "image", label: "图片", icon: NODE_TYPE_FALLBACK_EMOJI.image },
	{ type: "video", label: "视频", icon: NODE_TYPE_FALLBACK_EMOJI.video },
	{ type: "audio", label: "音频", icon: NODE_TYPE_FALLBACK_EMOJI.audio },
	{ type: "music", label: "音乐", icon: NODE_TYPE_FALLBACK_EMOJI.music },
	{ type: "editor", label: "图片编辑器", icon: NODE_TYPE_FALLBACK_EMOJI.editor },
	{ type: "upload", label: "上传", icon: "⇧" },
];

export const REFERENCE_MENU_ITEMS: MenuItem[] = [
	{
		type: "text",
		label: "文本生成",
		desc: "脚本、广告词、品牌文案",
		icon: NODE_TYPE_FALLBACK_EMOJI.text,
	},
	{ type: "image", label: "图片生成", icon: NODE_TYPE_FALLBACK_EMOJI.image },
	{ type: "video", label: "视频生成", icon: NODE_TYPE_FALLBACK_EMOJI.video },
	{ type: "audio", label: "音频", icon: NODE_TYPE_FALLBACK_EMOJI.audio },
	{ type: "music", label: "音乐", icon: NODE_TYPE_FALLBACK_EMOJI.music },
];

export const THEME_TONES: ThemeOption[] = [
	{
		id: "emerald",
		name: "渐变翡翠",
		desc: "清透、流动、偏创作感",
		swatch: "linear-gradient(135deg, #4cffcf, #226f64 52%, #061614)",
	},
	{
		id: "indigo",
		name: "渐变静蓝",
		desc: "冷静、科技、偏深蓝调",
		swatch: "linear-gradient(135deg, #8ba2ff, #313b91 48%, #080914)",
	},
	{
		id: "black",
		name: "渐变深黑",
		desc: "克制、暗场、最高对比",
		swatch: "linear-gradient(135deg, #2f3238, #0c0d10 48%, #000)",
	},
	{
		id: "cycle",
		name: "循环",
		desc: "翡翠、静蓝、深黑，5 分钟一轮",
		swatch: "linear-gradient(135deg, #4cffcf, #313b91 48%, #000)",
	},
];

export const CANVAS_MODES: Array<{
	id: CanvasMode;
	label: string;
	description: string;
}> = [
	{ id: "canvas", label: "画布", description: "节点生成" },
	{ id: "director", label: "导演", description: "镜头编排" },
	{ id: "preview", label: "预览", description: "结果预览" },
];

export const SHOT_SIZE_OPTIONS = ["远景", "中景", "近景", "特写"] as const;
export const SHOT_ANGLE_OPTIONS = ["平视", "俯拍", "仰拍", "跟拍"] as const;

export const COPY = {
	community: "社区",
	helloTitle: "今天一起创作点什么？",
	helloUser: "Hi 1991991940!",
	project: "创作旅程（0417）",
	addNode: "添加节点",
	addAsset: "添加资源",
	createAsset: "创建资产",
	group: "打组",
	openEditor: "打开编辑器",
	upload: "上传",
};

export const IMAGE_TOOLBAR_ITEMS = [
	{ key: "crop", icon: "⌗", label: "裁剪" },
	{ key: "upscale", icon: "2×", label: "图片超分" },
	{ key: "perspective", icon: "◈", label: "改变视角" },
	{ key: "redraw", icon: "↻", label: "重绘" },
	{ key: "reverse-prompt", icon: "◐", label: "反推" },
	{ key: "wand", icon: "✦", label: THREE_D_DIRECTOR_LABEL },
	{ key: "more", icon: "⋯", label: "更多" },
	{ key: "protect", icon: "▣", label: "保护区域" },
	{ key: "folder", icon: "▱+", label: "保存到资产夹" },
	{ key: "download", icon: "⇩", label: "下载" },
	{ key: "expand", icon: "↗", label: "放大查看" },
];

export const DEFAULT_PERSPECTIVE_EDIT_SETTINGS: PerspectiveEditSettings = {
	preset: "custom",
	yaw: 0,
	pitch: 0,
	roll: 0,
	zoom: 0,
	lens: 35,
};

export const PERSPECTIVE_EDIT_MODEL = "gpt-image-2-all(yunwu)";
export const PERSPECTIVE_ZOOM_OUT_MODEL = "ideogram_reframe_V_3_DEFAULT";
export const IDEOGRAM_INPAINT_MODEL = "ideogram_edit_V_3_DEFAULT(yunwu)";
export const REVERSE_PROMPT_VLM_MODEL = "Qwen/Qwen3-VL-32B-Instruct(siliconflow)";
export const REVERSE_PROMPT_CLASSIFIER_MAX_SIDE = 1024;
export const MIDJOURNEY_DESCRIBE_MODEL = "mj_describe(yunwu)";
export const IDEOGRAM_DESCRIBE_MODEL = "ideogram_describe(yunwu)";

export const WORKSHOP_ROLE_TABS: WorkshopRoleTab[] = ["角色设定", "场景设定", "物品设定"];
export const WORKSHOP_FRAME_TABS: WorkshopFrameTab[] = ["模板", "生图", "生视频"];
export const WORKSHOP_DIRECT_EXTRACT_TEMPLATE_FILE = "提取模板.json";
