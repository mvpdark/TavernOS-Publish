import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

import {
	type AppRoute,
	buildProjectRouteNormalizationPlan,
} from "../appRouting";

export type UseProjectRouteNormalizationConfig = {
	route: AppRoute;
	pathname: string;
	canvasProjectId: string | null;
	workshopProjectId: string | null;
	setPathname: Dispatch<SetStateAction<string>>;
};

export function useProjectRouteNormalization({
	route,
	pathname,
	canvasProjectId,
	workshopProjectId,
	setPathname,
}: UseProjectRouteNormalizationConfig) {
	useEffect(() => {
		const normalizationPlan = buildProjectRouteNormalizationPlan({
			route,
			pathname,
			canvasProjectId,
			workshopProjectId,
		});
		if (!normalizationPlan) return;
		// TavernOS uses HashRouter — do not call window.history.replaceState
		// as it would modify the real pathname and break react-router.
		setPathname(normalizationPlan.nextPath);
	}, [canvasProjectId, pathname, route, setPathname, workshopProjectId]);
}
