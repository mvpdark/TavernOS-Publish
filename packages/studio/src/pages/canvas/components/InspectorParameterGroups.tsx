import type { ReactNode } from "react";

import {
	ActionParamCard,
	InputParamCard,
	SelectParamCard,
	TextareaParamCard,
} from "./InspectorBaseParamCards";
import type {
	ActionParamField,
	InputParamField,
	SelectParamField,
	TextareaParamField,
} from "./InspectorBaseParamCards";

export type InspectorParameterCardsProps<MenuKey extends string> = {
	selectFields: Array<SelectParamField<MenuKey> | null | false | undefined>;
	inputFields?: Array<InputParamField | null | false | undefined>;
	textareaFields?: Array<TextareaParamField | null | false | undefined>;
	actionFields?: Array<ActionParamField | null | false | undefined>;
	openMenu: MenuKey | null;
	onToggle: (menuKey: MenuKey) => void;
	onAfterSelect?: () => void;
};

export type InspectorParameterFieldBundle<MenuKey extends string> = Pick<
	InspectorParameterCardsProps<MenuKey>,
	"selectFields" | "inputFields" | "textareaFields" | "actionFields"
>;

export type InspectorParameterGroupRenderConfig<MenuKey extends string> = {
	id: string;
	shouldRender: boolean;
	fields: InspectorParameterFieldBundle<MenuKey>;
};

type MaybeField<Field> = Field | null | false | undefined;
type TextParamField = InputParamField | TextareaParamField;
type TextParamRenderConfig =
	| {
			control: "input";
			field: InputParamField;
	  }
	| {
			control: "textarea";
			field: TextareaParamField;
	  };

export function renderVisibleFields<Field>(
	fields: MaybeField<Field>[],
	renderField: (field: Field) => ReactNode,
) {
	return fields.map((field) => (field ? renderField(field) : null));
}

export function renderSelectParamFields<MenuKey extends string>({
	fields,
	openMenu,
	onToggle,
	onAfterSelect,
}: {
	fields: Array<SelectParamField<MenuKey> | null | false | undefined>;
	openMenu: MenuKey | null;
	onToggle: (menuKey: MenuKey) => void;
	onAfterSelect?: () => void;
}) {
	return renderVisibleFields(fields, (field) => (
		<SelectParamCard
			key={field.menuKey}
			field={field}
			openMenu={openMenu}
			onToggle={onToggle}
			onAfterSelect={onAfterSelect}
		/>
	));
}

function getTextParamFieldKey(field: TextParamField) {
	return field.id ?? field.label;
}

function renderTextParamField(config: TextParamRenderConfig) {
	const { field } = config;
	const sharedProps = {
		key: getTextParamFieldKey(field),
		label: field.label,
		value: field.value,
		placeholder: field.placeholder,
		onChange: field.onChange,
	};

	if (config.control === "textarea") {
		return <TextareaParamCard {...sharedProps} rows={config.field.rows} />;
	}

	return <InputParamCard {...sharedProps} inputMode={config.field.inputMode} />;
}

function renderInputParamFields(fields: MaybeField<InputParamField>[]) {
	return renderVisibleFields(fields, (field) =>
		renderTextParamField({ control: "input", field }),
	);
}

function renderTextareaParamFields(fields: MaybeField<TextareaParamField>[]) {
	return (
		renderVisibleFields(fields, (field) =>
			renderTextParamField({ control: "textarea", field }),
		)
	);
}

function renderActionParamField(field: ActionParamField) {
	return <ActionParamCard key={field.id ?? field.label} field={field} />;
}

export function InspectorParameterCards<MenuKey extends string>({
	selectFields,
	inputFields = [],
	textareaFields = [],
	actionFields = [],
	openMenu,
	onToggle,
	onAfterSelect,
}: InspectorParameterCardsProps<MenuKey>) {
	return (
		<>
			{renderSelectParamFields({
				fields: selectFields,
				openMenu,
				onToggle,
				onAfterSelect,
			})}
			{renderInputParamFields(inputFields)}
			{renderTextareaParamFields(textareaFields)}
			{renderVisibleFields(actionFields, renderActionParamField)}
		</>
	);
}

export function InspectorParameterGroup<MenuKey extends string>({
	shouldRender,
	fields,
	openMenu,
	onToggle,
	onAfterSelect,
}: Omit<InspectorParameterCardsProps<MenuKey>, keyof InspectorParameterFieldBundle<MenuKey>> &
	InspectorParameterGroupRenderConfig<MenuKey>) {
	if (!shouldRender) return null;

	return (
		<InspectorParameterCards
			openMenu={openMenu}
			onToggle={onToggle}
			onAfterSelect={onAfterSelect}
			selectFields={fields.selectFields}
			inputFields={fields.inputFields}
			textareaFields={fields.textareaFields}
			actionFields={fields.actionFields}
		/>
	);
}

export function InspectorParameterGroupList<MenuKey extends string>({
	groups,
	openMenu,
	onToggle,
	onAfterSelect,
}: {
	groups: Array<InspectorParameterGroupRenderConfig<MenuKey>>;
	openMenu: MenuKey | null;
	onToggle: (menuKey: MenuKey) => void;
	onAfterSelect?: () => void;
}) {
	return groups.map((group) => (
		<InspectorParameterGroup
			key={group.id}
			{...group}
			openMenu={openMenu}
			onToggle={onToggle}
			onAfterSelect={onAfterSelect}
		/>
	));
}
