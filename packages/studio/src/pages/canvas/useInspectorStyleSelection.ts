import { useEffect, useState } from "react";

import type { NodeStyleRef, StyleLibraryState } from "./canvas-types";

export function useInspectorStyleSelection(
	styleLibrary: StyleLibraryState,
	selectedStyle?: NodeStyleRef | null,
) {
	const [activeStyleCategoryId, setActiveStyleCategoryId] = useState<
		string | null
	>(selectedStyle?.categoryId ?? styleLibrary.categories[0]?.id ?? null);
	const [hoveredStylePresetId, setHoveredStylePresetId] = useState<
		string | null
	>(selectedStyle?.presetId ?? null);

	useEffect(() => {
		setActiveStyleCategoryId(
			selectedStyle?.categoryId ?? styleLibrary.categories[0]?.id ?? null,
		);
		setHoveredStylePresetId(selectedStyle?.presetId ?? null);
	}, [selectedStyle, styleLibrary.categories]);

	const styleCategories = styleLibrary.categories;
	const activeStylePresets = styleLibrary.presets.filter(
		(preset) => preset.categoryId === activeStyleCategoryId,
	);
	const previewPreset =
		styleLibrary.presets.find((preset) => preset.id === hoveredStylePresetId) ??
		styleLibrary.presets.find((preset) => preset.id === selectedStyle?.presetId) ??
		null;

	return {
		styleCategories,
		activeStyleCategoryId,
		activeStylePresets,
		previewPreset,
		setActiveStyleCategoryId,
		setHoveredStylePresetId,
	};
}
