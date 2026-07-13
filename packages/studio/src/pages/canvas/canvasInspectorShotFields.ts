import {
	selectField,
	type InspectorSelectField,
} from "./canvasInspectorFieldTypes";
import type { CanvasInspectorShotOptions } from "./canvasInspectorTypes";
import {
	formatNodeMetric,
	toPanelOptions as toOptions,
} from "./parameterPanelPresentation";
import type { ComposerPreset } from "./canvas-types";

export type ShotParameterFieldConfig = {
	composer: ComposerPreset;
	shotOptions: CanvasInspectorShotOptions;
	onUpdateShotField: (
		key: "shotSize" | "cameraAngle" | "frameRatio",
		value: string,
	) => void;
};

export function buildShotParameterFields({
	composer,
	shotOptions,
	onUpdateShotField,
}: ShotParameterFieldConfig) {
	const selectFields: InspectorSelectField[] = [
		selectField({
			label: "景别",
			value: formatNodeMetric(composer.shotSize),
			menuKey: "shotSize",
			options: toOptions(shotOptions.sizes),
			onSelect: (value) => onUpdateShotField("shotSize", value),
		}),
		selectField({
			label: "角度",
			value: formatNodeMetric(composer.cameraAngle),
			menuKey: "shotAngle",
			options: toOptions(shotOptions.angles),
			onSelect: (value) => onUpdateShotField("cameraAngle", value),
		}),
		selectField({
			label: "比例",
			value: formatNodeMetric(composer.frameRatio),
			menuKey: "shotRatio",
			options: toOptions(shotOptions.ratios),
			onSelect: (value) => onUpdateShotField("frameRatio", value),
		}),
	];

	return { selectFields };
}
