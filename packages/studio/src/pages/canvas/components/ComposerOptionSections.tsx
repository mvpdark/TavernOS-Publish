import type { ReactNode } from "react";

import { normalizePanelOption } from "../parameterPanelPresentation";
import {
	OptionPanelHintBlock,
	OptionPanelInputGridSection,
	type OptionPanelInputFieldConfig,
	type OptionPanelOption,
	OptionPanelOptionSection,
	OptionPanelOptionSectionList,
	type OptionPanelOptionSectionListItem,
	OptionPanelTextAreaSection,
	type OptionPanelSectionClassNames,
} from "./OptionPanelSections";
import { DEFAULT_LYRICS_PLACEHOLDER } from "./TextControl";

export type ComposerOption = OptionPanelOption;

export type ComposerOptionSectionProps = {
	label: string;
	options: ComposerOption[];
	currentValue: string;
	onSelect: (value: string) => void;
};

const IMAGE_OPTION_SECTION_CLASS_NAMES: OptionPanelSectionClassNames = {
	section: "image-options-section",
	head: "image-options-section__head",
	label: "image-options-section__label",
	grid: "image-option-grid",
	chip: "image-option-chip",
	active: "is-active",
};

export function normalizeComposerOption(option: ComposerOption) {
	return normalizePanelOption(option);
}

type ImageOptionInputType = "number" | "text";

type ImageOptionInputFieldConfig = OptionPanelInputFieldConfig & {
	fieldLabel: string;
	type?: ImageOptionInputType;
	value: string;
	onChange: (value: string) => void;
};

type ImageInputOptionSectionProps = {
	label: string;
	fields: ImageOptionInputFieldConfig[];
	defaultType?: ImageOptionInputType;
	defaultPlaceholder?: string;
};

function ImageInputOptionSection({
	label,
	fields,
	defaultType = "text",
	defaultPlaceholder,
}: ImageInputOptionSectionProps) {
	return (
		<OptionPanelInputGridSection
			label={label}
			fields={fields.map((field) => ({
				...field,
				type: field.type ?? defaultType,
			}))}
			classNames={IMAGE_OPTION_SECTION_CLASS_NAMES}
			gridClassName="image-options-input-grid"
			fieldClassName="image-options-input"
			inputClassName="composer-option-input"
			defaultPlaceholder={defaultPlaceholder}
			stopClickPropagation
		/>
	);
}

type SingleImageInputSectionProps = {
	label: string;
	fieldLabel: string;
	value: string;
	onChange: (value: string) => void;
	type?: ImageOptionInputType;
	placeholder?: string;
};

function SingleImageInputSection({
	label,
	fieldLabel,
	value,
	onChange,
	type,
	placeholder,
}: SingleImageInputSectionProps) {
	return (
		<ImageInputOptionSection
			label={label}
			fields={[
				{
					fieldLabel,
					type,
					value,
					onChange,
					placeholder,
				},
			]}
		/>
	);
}

type PairedImageInputSectionProps = {
	label: string;
	firstLabel: string;
	firstValue: string;
	secondLabel: string;
	secondValue: string;
	onFirstChange: (value: string) => void;
	onSecondChange: (value: string) => void;
	type?: ImageOptionInputType;
};

function PairedImageInputSection({
	label,
	firstLabel,
	firstValue,
	secondLabel,
	secondValue,
	onFirstChange,
	onSecondChange,
	type,
}: PairedImageInputSectionProps) {
	return (
		<ImageInputOptionSection
			label={label}
			fields={[
				{
					fieldLabel: firstLabel,
					type,
					value: firstValue,
					onChange: onFirstChange,
				},
				{
					fieldLabel: secondLabel,
					type,
					value: secondValue,
					onChange: onSecondChange,
				},
			]}
		/>
	);
}

export function ImageOptionSection({
	label,
	options,
	currentValue,
	onSelect,
}: ComposerOptionSectionProps) {
	return (
		<OptionPanelOptionSection
			label={label}
			options={options}
			currentValue={currentValue}
			onSelect={onSelect}
			classNames={IMAGE_OPTION_SECTION_CLASS_NAMES}
			showDescription
		/>
	);
}

export type ImageOptionSectionListItem = Omit<
	OptionPanelOptionSectionListItem,
	"showDescription"
>;

export function ImageOptionSectionList({
	sections,
}: {
	sections: ImageOptionSectionListItem[];
}) {
	return (
		<OptionPanelOptionSectionList
			sections={sections.map((section) => ({
				...section,
				showDescription: true,
			}))}
			classNames={IMAGE_OPTION_SECTION_CLASS_NAMES}
		/>
	);
}

type ImageNumericOptionSectionProps = {
	label: string;
	firstLabel: string;
	firstValue: string;
	secondLabel: string;
	secondValue: string;
	onFirstChange: (value: string) => void;
	onSecondChange: (value: string) => void;
};

export function ImageNumericOptionSection({
	label,
	firstLabel,
	firstValue,
	secondLabel,
	secondValue,
	onFirstChange,
	onSecondChange,
}: ImageNumericOptionSectionProps) {
	return (
		<PairedImageInputSection
			label={label}
			firstLabel={firstLabel}
			firstValue={firstValue}
			secondLabel={secondLabel}
			secondValue={secondValue}
			onFirstChange={onFirstChange}
			onSecondChange={onSecondChange}
			type="number"
		/>
	);
}

type ImageSingleNumericOptionSectionProps = {
	label: string;
	fieldLabel: string;
	value: string;
	onChange: (value: string) => void;
};

export function ImageSingleNumericOptionSection({
	label,
	fieldLabel,
	value,
	onChange,
}: ImageSingleNumericOptionSectionProps) {
	return (
		<SingleImageInputSection
			label={label}
			fieldLabel={fieldLabel}
			value={value}
			onChange={onChange}
			type="number"
		/>
	);
}

type ImageSingleTextOptionSectionProps = {
	label: string;
	fieldLabel: string;
	value: string;
	onChange: (value: string) => void;
};

export function ImageSingleTextOptionSection({
	label,
	fieldLabel,
	value,
	onChange,
}: ImageSingleTextOptionSectionProps) {
	return (
		<SingleImageInputSection
			label={label}
			fieldLabel={fieldLabel}
			value={value}
			onChange={onChange}
			type="text"
			placeholder="vibes"
		/>
	);
}

type ImageTextOptionSectionProps = {
	label: string;
	firstLabel: string;
	firstValue: string;
	secondLabel: string;
	secondValue: string;
	onFirstChange: (value: string) => void;
	onSecondChange: (value: string) => void;
};

export function ImageTextOptionSection({
	label,
	firstLabel,
	firstValue,
	secondLabel,
	secondValue,
	onFirstChange,
	onSecondChange,
}: ImageTextOptionSectionProps) {
	return (
		<PairedImageInputSection
			label={label}
			firstLabel={firstLabel}
			firstValue={firstValue}
			secondLabel={secondLabel}
			secondValue={secondValue}
			onFirstChange={onFirstChange}
			onSecondChange={onSecondChange}
			type="text"
		/>
	);
}

type ImageTextAreaOptionSectionProps = {
	label: string;
	value: string;
	placeholder?: string;
	hint?: string;
	onChange: (value: string) => void;
};

export function ImageTextAreaOptionSection({
	label,
	value,
	placeholder = DEFAULT_LYRICS_PLACEHOLDER,
	hint,
	onChange,
}: ImageTextAreaOptionSectionProps) {
	return (
		<OptionPanelTextAreaSection
			label={label}
			value={value}
			onChange={onChange}
			classNames={IMAGE_OPTION_SECTION_CLASS_NAMES}
			textAreaClassName="composer-option-input"
			hint={hint}
			placeholder={placeholder}
			rows={5}
			stopClickPropagation
		/>
	);
}

export function ImageHintBlock({ children }: { children: ReactNode }) {
	return (
		<OptionPanelHintBlock className="image-options-hint">
			{children}
		</OptionPanelHintBlock>
	);
}
