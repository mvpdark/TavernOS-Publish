import {
	CANVAS_LIBRARY_SEED,
	WORKSHOP_LIBRARY,
	buildProjectLibraryStorageValue,
	normalizeProjectLibraryForState,
	writeCanvasLibrary,
	writeWorkshopLibrary,
	type ProjectEntry,
} from "./canvasPersistence";

export type ProjectLibraryStorageEffectPlan = {
	normalizedLibrary: ProjectEntry[];
	storageValue: ProjectEntry[];
	shouldNormalizeState: boolean;
};

export function buildProjectLibraryStorageEffectPlan({
	library,
	fallbackLibrary,
}: {
	library: ProjectEntry[];
	fallbackLibrary: ProjectEntry[];
}): ProjectLibraryStorageEffectPlan {
	const normalizedLibrary = normalizeProjectLibraryForState(
		library,
		fallbackLibrary,
	);
	return {
		normalizedLibrary,
		storageValue: buildProjectLibraryStorageValue(
			normalizedLibrary,
			fallbackLibrary,
		),
		shouldNormalizeState: normalizedLibrary !== library,
	};
}

export function buildCanvasProjectLibraryStorageEffectPlan(
	library: ProjectEntry[],
) {
	return buildProjectLibraryStorageEffectPlan({
		library,
		fallbackLibrary: CANVAS_LIBRARY_SEED,
	});
}

export function buildWorkshopProjectLibraryStorageEffectPlan(
	library: ProjectEntry[],
) {
	return buildProjectLibraryStorageEffectPlan({
		library,
		fallbackLibrary: WORKSHOP_LIBRARY,
	});
}

export function persistProjectLibraryStorageEffectPlan(
	storagePlan: ProjectLibraryStorageEffectPlan,
	persistStorageValue: (storageValue: ProjectEntry[]) => void,
): ProjectLibraryStorageEffectPlan {
	persistStorageValue(storagePlan.storageValue);
	return storagePlan;
}

export function persistCanvasProjectLibraryStorageEffect(
	library: ProjectEntry[],
) {
	return persistProjectLibraryStorageEffectPlan(
		buildCanvasProjectLibraryStorageEffectPlan(library),
		writeCanvasLibrary,
	);
}

export function persistWorkshopProjectLibraryStorageEffect(
	library: ProjectEntry[],
) {
	return persistProjectLibraryStorageEffectPlan(
		buildWorkshopProjectLibraryStorageEffectPlan(library),
		writeWorkshopLibrary,
	);
}
