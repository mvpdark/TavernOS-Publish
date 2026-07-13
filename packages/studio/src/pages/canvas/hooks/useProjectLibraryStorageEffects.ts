import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

import {
	persistCanvasProjectLibraryStorageEffect,
	persistWorkshopProjectLibraryStorageEffect,
} from "../appProjectLibraryStorageEffectPlanning";
import type { ProjectEntry } from "../canvasPersistence";

export type UseProjectLibraryStorageEffectsConfig = {
	canvasLibrary: ProjectEntry[];
	workshopLibrary: ProjectEntry[];
	setCanvasLibrary: Dispatch<SetStateAction<ProjectEntry[]>>;
	setWorkshopLibrary: Dispatch<SetStateAction<ProjectEntry[]>>;
};

export function useProjectLibraryStorageEffects({
	canvasLibrary,
	workshopLibrary,
	setCanvasLibrary,
	setWorkshopLibrary,
}: UseProjectLibraryStorageEffectsConfig) {
	useEffect(() => {
		const storagePlan = persistCanvasProjectLibraryStorageEffect(canvasLibrary);
		if (storagePlan.shouldNormalizeState) {
			setCanvasLibrary(storagePlan.normalizedLibrary);
		}
	}, [canvasLibrary, setCanvasLibrary]);

	useEffect(() => {
		const storagePlan =
			persistWorkshopProjectLibraryStorageEffect(workshopLibrary);
		if (storagePlan.shouldNormalizeState) {
			setWorkshopLibrary(storagePlan.normalizedLibrary);
		}
	}, [setWorkshopLibrary, workshopLibrary]);
}
