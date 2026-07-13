import { isRecord } from "./appResponseParsing";
import { getStoredModelValue } from "./modelOptions";

export type WorkshopExtractedEntity = {
	id: string;
	name: string;
	summary: string;
	detail: string;
};

export type WorkshopExtractionState = {
	characters: WorkshopExtractedEntity[];
	scenes: WorkshopExtractedEntity[];
	props: WorkshopExtractedEntity[];
	rawText?: string;
};

export const EMPTY_WORKSHOP_EXTRACTION: WorkshopExtractionState = {
	characters: [],
	scenes: [],
	props: [],
};

type WorkshopModelCatalogLike = {
	preferredRawLabelByModel: Record<string, string | undefined>;
};

function extractJsonObjectFromText(text: string) {
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced?.[1] ?? text;
	const firstBrace = candidate.indexOf("{");
	const lastBrace = candidate.lastIndexOf("}");
	if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
		throw new Error("模型没有返回可解析的 JSON。");
	}
	return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
}

function getRecordArray(value: unknown) {
	return Array.isArray(value)
		? value.filter((item): item is Record<string, unknown> => isRecord(item))
		: [];
}

function getStringField(record: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.trim()) return value.trim();
		if (Array.isArray(value)) {
			const joined = value
				.map((item) => (typeof item === "string" ? item.trim() : ""))
				.filter(Boolean)
				.join("、");
			if (joined) return joined;
		}
	}
	return "";
}

function normalizeWorkshopEntities(
	items: Array<Record<string, unknown>>,
	prefix: string,
) {
	return items.map((item, index) => {
		const id =
			getStringField(item, ["id"]) ||
			`${prefix}${String(index + 1).padStart(2, "0")}`;
		const name = getStringField(item, ["name", "title"]) || id;
		const summary = getStringField(item, [
			"role",
			"type",
			"summary",
			"importance",
			"mood",
			"location",
		]);
		const detail = getStringField(item, [
			"appearance_hint",
			"environment",
			"description",
			"traits",
			"current_action",
			"key_props",
			"aliases",
		]);
		return { id, name, summary, detail };
	});
}

export function normalizeWorkshopExtractionFromText(
	text: string,
): WorkshopExtractionState {
	const parsed = extractJsonObjectFromText(text);
	return {
		characters: normalizeWorkshopEntities(getRecordArray(parsed.characters), "char_"),
		scenes: normalizeWorkshopEntities(getRecordArray(parsed.scenes), "scene_"),
		props: normalizeWorkshopEntities(
			getRecordArray(parsed.props ?? parsed.items ?? parsed.objects),
			"prop_",
		),
		rawText: text,
	};
}

export function buildWorkshopExtractionPrompt(script: string) {
	return [
		"你是小说转脚本分镜Agent。请从用户给出的小说/剧本文本中提取角色、场景、物品。",
		"只返回严格 JSON，不要 Markdown，不要解释。",
		"JSON 结构必须是：",
		'{"characters":[{"id":"","name":"","aliases":[],"gender":"","age_range":"","role":"","importance":"","traits":[],"appearance_hint":"","current_emotion":"","current_action":"","is_on_stage":true}],"scenes":[{"id":"","name":"","type":"","location":"","time":"","mood":"","environment":"","characters_present":[],"key_props":[]}],"props":[{"id":"","name":"","type":"","owner":"","visual_hint":"","narrative_function":""}]}',
		"要求：只提取正文中真实出现或明确提及的内容；名称要短；视觉描述要适合后续生成角色设定和场景设定。",
		"用户文本：",
		script,
	].join("\n\n");
}

export function resolveWorkshopTextModelValue(
	model: string,
	catalog: WorkshopModelCatalogLike,
) {
	const preferred = catalog.preferredRawLabelByModel[model] ?? model;
	const storedPreferred = getStoredModelValue("text", preferred);
	const storedDisplay = getStoredModelValue("text", model);
	const candidates = [storedPreferred, preferred, storedDisplay, model]
		.map((value) => value.trim())
		.filter(Boolean);
	return (
		candidates.find((value) => /\([^)]+\)$/.test(value)) ??
		candidates[0] ??
		model
	);
}
