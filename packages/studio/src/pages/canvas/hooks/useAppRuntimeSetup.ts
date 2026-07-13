import { useMemo } from "react";

import { readAppInitialState } from "../appInitialState";
import { useMiniMaxTokenPlanState } from "./useMiniMaxTokenPlanState";
import { useRuntimeNotices } from "./useRuntimeNotices";

export function useAppRuntimeSetup() {
	const initialState = useMemo(readAppInitialState, []);
	const miniMaxTokenPlanState = useMiniMaxTokenPlanState(
		initialState.miniMaxTokenPlan.rawText,
	);
	const runtimeNoticeState = useRuntimeNotices();

	return {
		initialState,
		miniMaxTokenPlanState,
		...runtimeNoticeState,
	};
}
