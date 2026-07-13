import { useMemo, useState } from "react";

import {
	parseMiniMaxTokenPlan,
	summarizeMiniMaxTokenPlan,
} from "../minimaxTokenPlan";

export function useMiniMaxTokenPlanState(initialRawText?: string | null) {
	const [rawText, setRawText] = useState(initialRawText ?? "");
	const parsed = useMemo(() => parseMiniMaxTokenPlan(rawText), [rawText]);
	const summary = useMemo(
		() => summarizeMiniMaxTokenPlan(parsed.plan),
		[parsed.plan],
	);

	return {
		rawText,
		setRawText,
		parseError: parsed.error,
		plan: parsed.plan,
		summary,
	};
}
