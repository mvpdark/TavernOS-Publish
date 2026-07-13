import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";

import { resolveAppProjectRoutingState } from "../appProjectRoutingState";
import type { ProjectEntry } from "../canvasPersistence";
import { useAppProjectNavigation } from "./useAppProjectNavigation";
import { useAppProjectRouteEffects } from "./useAppProjectRouteEffects";

export type UseAppProjectRoutingConfig = {
	pathname: string;
	canvasLibrary: ProjectEntry[];
	workshopLibrary: ProjectEntry[];
	nodesLength: number;
	setCanvasLibrary: Dispatch<SetStateAction<ProjectEntry[]>>;
	setWorkshopLibrary: Dispatch<SetStateAction<ProjectEntry[]>>;
	setPathname: Dispatch<SetStateAction<string>>;
};

export function useAppProjectRouting({
	pathname,
	canvasLibrary,
	workshopLibrary,
	nodesLength,
	setCanvasLibrary,
	setWorkshopLibrary,
	setPathname,
}: UseAppProjectRoutingConfig) {
	const routingState = useMemo(
		() =>
			resolveAppProjectRoutingState({
				pathname,
				canvasLibrary,
				workshopLibrary,
			}),
		[canvasLibrary, pathname, workshopLibrary],
	);
	const navigate = useAppProjectNavigation({ pathname, setPathname });

	useAppProjectRouteEffects({
		routingState,
		pathname,
		canvasLibrary,
		workshopLibrary,
		nodesLength,
		setCanvasLibrary,
		setWorkshopLibrary,
		setPathname,
	});

	return {
		...routingState,
		navigate,
	};
}
