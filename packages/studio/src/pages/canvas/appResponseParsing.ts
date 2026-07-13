import type { AssetRef } from "./canvas-types";

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function unwrapKakaAlignedResponse(payload: unknown) {
	if (!isRecord(payload)) return payload;
	if (payload.success === false) {
		const errorValue = payload.error;
		if (typeof errorValue === "string" && errorValue.trim()) {
			throw new Error(errorValue.trim());
		}
		if (isRecord(errorValue) && typeof errorValue.message === "string") {
			throw new Error(errorValue.message);
		}
		if (typeof payload.message === "string" && payload.message.trim()) {
			throw new Error(payload.message.trim());
		}
		throw new Error("kaka-api 图片编辑请求失败。");
	}
	return "data" in payload ? payload.data : payload;
}

export function extractFirstAssetUrl(value: unknown): string | null {
	if (!value) return null;
	if (typeof value === "string" && value.trim()) return value.trim();
	if (Array.isArray(value)) {
		for (const item of value) {
			const nested = extractFirstAssetUrl(item);
			if (nested) return nested;
		}
		return null;
	}
	if (!isRecord(value)) return null;
	for (const key of ["image_url", "video_url", "audio_url", "url", "uri", "src"] as const) {
		const direct = value[key];
		if (typeof direct === "string" && direct.trim()) return direct.trim();
	}
	for (const key of ["images", "urls", "data", "result", "output"] as const) {
		const nested = extractFirstAssetUrl(value[key]);
		if (nested) return nested;
	}
	return null;
}

export function extractVideoUrlsFromWorkshopFrames(frames: string[]) {
	const urls = frames.flatMap((frame) =>
		Array.from(
			frame.matchAll(/https?:\/\/[^\s，,]+|file:\/\/\/[^\s，,]+|blob:[^\s，,]+|data:video\/[^\s，,]+/gi),
			(match) => match[0].trim(),
		),
	);
	return Array.from(new Set(urls));
}

export function extractProviderTaskId(value: unknown): string | null {
	if (!value) return null;
	if (typeof value === "string" && value.trim().startsWith("grok:")) return value.trim();
	if (Array.isArray(value)) {
		for (const item of value) {
			const nested = extractProviderTaskId(item);
			if (nested) return nested;
		}
		return null;
	}
	if (!isRecord(value)) return null;
	for (const key of ["task_id", "taskId", "id"] as const) {
		const direct = value[key];
		if (typeof direct === "string" && direct.trim()) return direct.trim();
		if (typeof direct === "number") return String(direct);
	}
	for (const key of ["data", "result", "task", "raw", "_create_task"] as const) {
		const nested = extractProviderTaskId(value[key]);
		if (nested) return nested;
	}
	return null;
}

export function isGrokVideoAsset(asset?: Pick<AssetRef, "providerTaskId" | "provider" | "providerModel"> | null) {
	if (!asset?.providerTaskId) return false;
	const provider = String(asset.provider || "").toLowerCase();
	const model = String(asset.providerModel || "").toLowerCase();
	return provider === "grok" || model.includes("grok-video");
}

export function isLikelyUrlText(value: string) {
	return /^https?:\/\//i.test(value.trim()) || /^data:/i.test(value.trim());
}

export function extractFirstTextValue(value: unknown): string | null {
	if (!value) return null;
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed && !isLikelyUrlText(trimmed) ? trimmed : null;
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			const nested = extractFirstTextValue(item);
			if (nested) return nested;
		}
		return null;
	}
	if (!isRecord(value)) return null;
	for (const key of ["prompt", "description", "text", "content", "message"] as const) {
		const nested = extractFirstTextValue(value[key]);
		if (nested) return nested;
	}
	for (const key of ["choices", "data", "result", "output", "outputs"] as const) {
		const nested = extractFirstTextValue(value[key]);
		if (nested) return nested;
	}
	return null;
}

export function scoreReversePromptCandidate(text: string) {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized || /^(提交成功|提交已成功|success|submitted|task submitted|ok)$/i.test(normalized)) return 0;

	let score = Math.min(normalized.length, 240);
	if (/(^|\s)[1-4](?:\ufe0f?\u20e3)?\s/.test(normalized)) score += 160;
	if (/--ar\s+\d+\s*:\s*\d+/i.test(normalized)) score += 160;
	if (/\b(lighting|composition|style|background|portrait|image|screenshot|generated|poster|logo|typography)\b/i.test(normalized)) {
		score += 60;
	}
	if (normalized.length < 20) score -= 80;
	return score;
}

export function collectReversePromptTextCandidates(value: unknown, candidates: string[] = []) {
	if (!value) return candidates;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed && !isLikelyUrlText(trimmed)) candidates.push(trimmed);
		return candidates;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectReversePromptTextCandidates(item, candidates);
		return candidates;
	}
	if (!isRecord(value)) return candidates;

	const preferredKeys = [
		"prompt",
		"promptEn",
		"finalPrompt",
		"description",
		"descriptions",
		"text",
		"content",
		"message",
		"result",
		"output",
		"outputs",
		"raw",
		"properties",
		"data",
	] as const;
	const visited = new Set<string>();
	for (const key of preferredKeys) {
		visited.add(key);
		collectReversePromptTextCandidates(value[key], candidates);
	}
	for (const [key, nested] of Object.entries(value)) {
		if (!visited.has(key)) collectReversePromptTextCandidates(nested, candidates);
	}
	return candidates;
}

export function extractReversePromptTextValue(value: unknown): string | null {
	const candidates = collectReversePromptTextCandidates(value);
	let best: string | null = null;
	let bestScore = 0;
	for (const candidate of candidates) {
		const score = scoreReversePromptCandidate(candidate);
		if (score > bestScore) {
			best = candidate;
			bestScore = score;
		}
	}
	return best;
}

export function extractChatCompletionText(payload: unknown) {
	if (!isRecord(payload)) return null;
	const choices = payload.choices;
	if (!Array.isArray(choices)) return null;
	for (const choice of choices) {
		if (!isRecord(choice) || !isRecord(choice.message)) continue;
		const content = extractFirstTextValue(choice.message.content);
		if (content) return content;
	}
	return null;
}

export function resolveReversePromptRoute(classification: string): "mj" | "ideogram" {
	const normalized = classification.toLowerCase();
	if (normalized.includes("ideogram")) return "ideogram";
	if (/poster|logo|typography|layout|commercial|brand|text-heavy|文字|海报|标志|排版|商业|设计/.test(normalized)) {
		return "ideogram";
	}
	return "mj";
}
