import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

import {
	type AppRoute,
	routeToPath,
} from "../appRouting";

export type UseAppProjectNavigationConfig = {
	pathname: string;
	setPathname: Dispatch<SetStateAction<string>>;
};

export function useAppProjectNavigation({
	pathname,
	setPathname,
}: UseAppProjectNavigationConfig) {
	return useCallback(
		(routeOrPath: AppRoute | string) => {
			const nextPath =
				typeof routeOrPath === "string" ? routeOrPath : routeToPath(routeOrPath);
			if (nextPath === pathname) return;
			// TavernOS uses HashRouter — do not call window.history.pushState
			// as it would modify the real pathname and break react-router.
			// Only update internal state for canvas project switching.
			setPathname(nextPath);
		},
		[pathname, setPathname],
	);
}
