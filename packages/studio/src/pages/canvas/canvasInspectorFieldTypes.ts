import type {
	ActionParamField,
	InputParamField,
	SelectParamField,
	TextareaParamField,
} from "./components/InspectorParamCards";
import type { CanvasInspectorMenuKey } from "./canvasInspectorTypes";
import type { PanelOption } from "./parameterPanelPresentation";
import { findPanelOptionLabel, formatNodeMetric } from "./parameterPanelPresentation";

export type InspectorSelectField =
	| SelectParamField<CanvasInspectorMenuKey>
	| null
	| false
	| undefined;
export type InspectorActionField = ActionParamField | null | false | undefined;
export type InspectorInputField = InputParamField | null | false | undefined;
export type InspectorTextareaField = TextareaParamField | null | false | undefined;

export function selectField(
	field: SelectParamField<CanvasInspectorMenuKey>,
): InspectorSelectField {
	return field;
}

export function inputField(field: InputParamField): InspectorInputField {
	return field;
}

export function actionField(field: ActionParamField): InspectorActionField {
	return field;
}

export function textareaField(
	field: TextareaParamField,
): InspectorTextareaField {
	return field;
}

export function fieldWhen<Field>(
	condition: unknown,
	buildField: () => Field,
): Field | false {
	return condition ? buildField() : false;
}

export function selectFieldWhen(
	condition: unknown,
	buildField: () => SelectParamField<CanvasInspectorMenuKey>,
): InspectorSelectField {
	return fieldWhen(condition, () => selectField(buildField()));
}

export function selectOptionFieldWhen({
	condition,
	label,
	value,
	selectedValue,
	menuKey,
	options,
	fallback,
	formatValue,
	className,
	valueClassName,
	onSelect,
}: {
	condition: unknown;
	label: string;
	value?: string;
	selectedValue?: string;
	menuKey: CanvasInspectorMenuKey;
	options: PanelOption[];
	fallback?: string;
	formatValue?: (value?: string | null) => string;
	className?: string;
	valueClassName?: string;
	onSelect: (value: string) => void;
}): InspectorSelectField {
	const displayValue = value ?? selectedValue;

	return selectFieldWhen(condition, () => ({
		label,
		value: formatValue
			? formatValue(displayValue)
			: findPanelOptionLabel(
					options,
					displayValue,
					fallback ?? formatNodeMetric(displayValue),
				),
		selectedValue,
		menuKey,
		options,
		className,
		valueClassName,
		onSelect,
	}));
}

export function inputFieldWhen(
	condition: unknown,
	buildField: () => InputParamField,
): InspectorInputField {
	return fieldWhen(condition, () => inputField(buildField()));
}

export function actionFieldWhen(
	condition: unknown,
	buildField: () => ActionParamField,
): InspectorActionField {
	return fieldWhen(condition, () => actionField(buildField()));
}

export function textareaFieldWhen(
	condition: unknown,
	buildField: () => TextareaParamField,
): InspectorTextareaField {
	return fieldWhen(condition, () => textareaField(buildField()));
}
