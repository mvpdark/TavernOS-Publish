export type MidjourneyActionId =
	| "imagine"
	| "blend"
	| "describe"
	| "upscale"
	| "variation"
	| "high_variation"
	| "low_variation"
	| "reroll"
	| "pan"
	| "zoom"
	| "custom_zoom"
	| "inpaint";

export type MidjourneyActionOption = {
	value: MidjourneyActionId;
	label: string;
	model: string;
	requiresTask: boolean;
};

export const MIDJOURNEY_ACTION_OPTIONS: MidjourneyActionOption[] = [
	{ value: "imagine", label: "生图", model: "mj_imagine(yunwu)", requiresTask: false },
	{ value: "blend", label: "混图", model: "mj_blend(yunwu)", requiresTask: false },
	{ value: "describe", label: "反推", model: "mj_describe(yunwu)", requiresTask: false },
	{ value: "upscale", label: "放大", model: "mj_upscale(yunwu)", requiresTask: true },
	{ value: "variation", label: "变体", model: "mj_variation(yunwu)", requiresTask: true },
	{ value: "high_variation", label: "高变化", model: "mj_high_variation(yunwu)", requiresTask: true },
	{ value: "low_variation", label: "低变化", model: "mj_low_variation(yunwu)", requiresTask: true },
	{ value: "reroll", label: "重抽", model: "mj_reroll(yunwu)", requiresTask: true },
	{ value: "pan", label: "平移", model: "mj_pan(yunwu)", requiresTask: true },
	{ value: "zoom", label: "缩放", model: "mj_zoom(yunwu)", requiresTask: true },
	{ value: "custom_zoom", label: "自定义缩放", model: "mj_custom_zoom(yunwu)", requiresTask: true },
	{ value: "inpaint", label: "局部重绘", model: "mj_inpaint(yunwu)", requiresTask: true },
];

const MIDJOURNEY_ACTION_BY_VALUE = new Map(
	MIDJOURNEY_ACTION_OPTIONS.map((option) => [option.value, option]),
);

export function normalizeMidjourneyAction(value?: string | null): MidjourneyActionId {
	const normalized = String(value || "").trim() as MidjourneyActionId;
	return MIDJOURNEY_ACTION_BY_VALUE.has(normalized) ? normalized : "imagine";
}

export function getMidjourneyActionOption(value?: string | null) {
	return MIDJOURNEY_ACTION_BY_VALUE.get(normalizeMidjourneyAction(value)) ?? MIDJOURNEY_ACTION_OPTIONS[0];
}

export function getMidjourneyActionLabel(value?: string | null) {
	return getMidjourneyActionOption(value).label;
}

export function isMidjourneyTaskAction(value?: string | null) {
	return getMidjourneyActionOption(value).requiresTask;
}
