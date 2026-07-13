import { getModelDisplayLabel, getSelectedModelPlatformEmoji } from "./modelOptions";
import type { ComposerPreset } from "./canvas-types";

export const MINIMAX_TOKEN_PLAN_STORAGE_KEY = "kakashow:minimax_token_plan";

export type MiniMaxTokenPlan = {
	rolling_5h_remaining?: number;
	rolling_5h_total?: number;
	weekly_remaining?: number;
	weekly_total?: number;
	remaining_usage_counts?: Record<string, number>;
};

export type MiniMaxTokenPlanSummary = {
	rolling5hLabel: string | null;
	weeklyLabel: string | null;
	modelCount: number;
	topModelEntries: Array<{ key: string; remaining: number }>;
};

function toFiniteNumber(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function toCountMap(value: unknown) {
	if (typeof value !== "object" || value === null) return undefined;
	const entries = Object.entries(value as Record<string, unknown>)
		.map(([key, rawValue]) => {
			const numericValue = toFiniteNumber(rawValue);
			return typeof numericValue === "number" ? [key, numericValue] : null;
		})
		.filter((entry): entry is [string, number] => entry !== null);
	return entries.length ? Object.fromEntries(entries) : undefined;
}

export function parseMiniMaxTokenPlan(rawText: string) {
	const trimmed = rawText.trim();
	if (!trimmed) return { plan: null, error: null as string | null };
	try {
		const parsed = JSON.parse(trimmed) as Record<string, unknown>;
		const plan: MiniMaxTokenPlan = {
			rolling_5h_remaining: toFiniteNumber(parsed.rolling_5h_remaining),
			rolling_5h_total: toFiniteNumber(parsed.rolling_5h_total),
			weekly_remaining: toFiniteNumber(parsed.weekly_remaining),
			weekly_total: toFiniteNumber(parsed.weekly_total),
			remaining_usage_counts: toCountMap(parsed.remaining_usage_counts),
		};
		return { plan, error: null as string | null };
	} catch (error) {
		return {
			plan: null,
			error: error instanceof Error ? error.message : "JSON 解析失败",
		};
	}
}

export function readMiniMaxTokenPlanFromStorage() {
	if (typeof window === "undefined") return null;
	const rawText = window.localStorage.getItem(MINIMAX_TOKEN_PLAN_STORAGE_KEY) ?? "";
	return parseMiniMaxTokenPlan(rawText).plan;
}

function getModelKey(model: string) {
	const label = getModelDisplayLabel(model).trim();
	const emoji = getSelectedModelPlatformEmoji(model).trim();
	return emoji ? `${label} ${emoji}` : label;
}

function getMiniMaxCandidateKeys(composer: ComposerPreset) {
	const modelKey = getModelKey(composer.model);
	if (modelKey === "MiniMax Speech 2.8 HD ☁️" || modelKey === "Minimax Speech 2.8 ☁️") {
		return ["speech-2.8-hd(yunwu)", "speech-2.8-hd", modelKey];
	}
	if (modelKey === "MiniMax Hailuo 2.3 ☁️") {
		return ["MiniMax Hailuo 2.3 ☁️", "hailuo-2.3", "hailuo2.3"];
	}
	return [modelKey];
}

export function getMiniMaxUsageLabel(composer: ComposerPreset, plan?: MiniMaxTokenPlan | null) {
	const resolvedPlan = plan ?? readMiniMaxTokenPlanFromStorage();
	if (!resolvedPlan) return null;
	const candidates = getMiniMaxCandidateKeys(composer);
	for (const key of candidates) {
		const remaining = resolvedPlan.remaining_usage_counts?.[key];
		if (typeof remaining === "number") {
			return `剩余 ${remaining} 次`;
		}
	}
	if (
		typeof resolvedPlan.rolling_5h_remaining === "number" &&
		typeof resolvedPlan.rolling_5h_total === "number"
	) {
		return `5h ${resolvedPlan.rolling_5h_remaining}/${resolvedPlan.rolling_5h_total}`;
	}
	if (
		typeof resolvedPlan.weekly_remaining === "number" &&
		typeof resolvedPlan.weekly_total === "number"
	) {
		return `本周 ${resolvedPlan.weekly_remaining}/${resolvedPlan.weekly_total}`;
	}
	return null;
}

export function summarizeMiniMaxTokenPlan(
	plan: MiniMaxTokenPlan | null | undefined,
): MiniMaxTokenPlanSummary {
	const remainingUsageCounts = plan?.remaining_usage_counts ?? {};
	const topModelEntries = Object.entries(remainingUsageCounts)
		.map(([key, remaining]) => ({ key, remaining }))
		.sort((left, right) => right.remaining - left.remaining)
		.slice(0, 6);

	return {
		rolling5hLabel:
			typeof plan?.rolling_5h_remaining === "number" &&
			typeof plan?.rolling_5h_total === "number"
				? `${plan.rolling_5h_remaining}/${plan.rolling_5h_total}`
				: null,
		weeklyLabel:
			typeof plan?.weekly_remaining === "number" &&
			typeof plan?.weekly_total === "number"
				? `${plan.weekly_remaining}/${plan.weekly_total}`
				: null,
		modelCount: Object.keys(remainingUsageCounts).length,
		topModelEntries,
	};
}
