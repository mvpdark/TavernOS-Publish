import type { ReactNode } from "react";

import { stopComposerEvent } from "../composerInteractionHelpers";
import type { PanelOption } from "../parameterPanelPresentation";
import { normalizePanelOption } from "../parameterPanelPresentation";
import { TextControl } from "./TextControl";

export type OptionPanelSectionClassNames = {
	section: string;
	head: string;
	label: string;
	hint?: string;
	grid: string;
	gridWide?: string;
	chip: string;
	active?: string;
};

export type OptionPanelTextControlSectionClassNames = Pick<
	OptionPanelSectionClassNames,
	"section" | "head" | "label" | "hint"
>;

export type OptionPanelOption = string | PanelOption;

export type OptionPanelOptionSectionProps = {
	label: string;
	options: OptionPanelOption[];
	currentValue: string;
	onSelect: (value: string) => void;
	classNames: OptionPanelSectionClassNames;
	wide?: boolean;
	hint?: string;
	showDescription?: boolean;
};

export type OptionPanelOptionSectionListItem = {
	key?: string;
	label: string;
	options: OptionPanelOption[];
	currentValue: string;
	onSelect: (value: string) => void;
	wide?: boolean;
	hint?: string;
	showDescription?: boolean;
};

export type OptionPanelOptionSectionListProps = {
	sections: OptionPanelOptionSectionListItem[];
	classNames: OptionPanelSectionClassNames;
	defaultShowDescription?: boolean;
};

export type OptionPanelInputFieldConfig = {
	fieldLabel?: string;
	type?: "number" | "text";
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	inputMode?: "text" | "decimal" | "numeric";
	key?: string;
};

export type OptionPanelInputGridProps = {
	fields: OptionPanelInputFieldConfig[];
	gridClassName: string;
	fieldClassName: string;
	inputClassName: string;
	defaultPlaceholder?: string;
	stopClickPropagation?: boolean;
};

export type OptionPanelInputGridSectionProps = OptionPanelInputGridProps & {
	label: string;
	classNames: OptionPanelTextControlSectionClassNames;
	hint?: string;
};

export type OptionPanelInputSectionProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	classNames: OptionPanelTextControlSectionClassNames;
	inputClassName: string;
	hint?: string;
	placeholder?: string;
	inputMode?: "text" | "decimal" | "numeric";
	type?: "number" | "text";
	stopClickPropagation?: boolean;
};

export type OptionPanelTextAreaSectionProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	classNames: OptionPanelTextControlSectionClassNames;
	textAreaClassName: string;
	hint?: string;
	placeholder?: string;
	rows?: number;
	stopClickPropagation?: boolean;
};

type OptionPanelTextControlProps =
	| {
			control: "input";
			className: string;
			value: string;
			onChange: (value: string) => void;
			placeholder?: string;
			inputMode?: "text" | "decimal" | "numeric";
			type?: "number" | "text";
			stopClickPropagation?: boolean;
	  }
	| {
			control: "textarea";
			className: string;
			value: string;
			onChange: (value: string) => void;
			placeholder?: string;
			rows?: number;
			stopClickPropagation?: boolean;
	  };

type OptionPanelTextControlSectionProps =
	| (OptionPanelInputSectionProps & {
			control: "input";
	  })
	| (OptionPanelTextAreaSectionProps & {
			control: "textarea";
	  });

function joinClassNames(...classNames: Array<string | false | undefined>) {
	return classNames.filter(Boolean).join(" ");
}

function OptionPanelTextControl(props: OptionPanelTextControlProps) {
	const sharedProps = {
		className: props.className,
		value: props.value,
		placeholder: props.placeholder,
		onChange: props.onChange,
		onPointerDown: stopComposerEvent,
		onClick: props.stopClickPropagation ? stopComposerEvent : undefined,
	};

	return props.control === "textarea" ? (
		<TextControl control="textarea" {...sharedProps} rows={props.rows} />
	) : (
		<TextControl
			control="input"
			{...sharedProps}
			type={props.type}
			inputMode={props.inputMode}
		/>
	);
}

export function OptionPanelSectionFrame({
	label,
	hint,
	classNames,
	children,
}: {
	label: string;
	hint?: string;
	classNames: OptionPanelTextControlSectionClassNames;
	children: ReactNode;
}) {
	return (
		<section className={classNames.section}>
			<div className={classNames.head}>
				<span className={classNames.label}>{label}</span>
				{hint && classNames.hint ? (
					<span className={classNames.hint}>{hint}</span>
				) : null}
			</div>
			{children}
		</section>
	);
}

export function OptionPanelOptionSection({
	label,
	options,
	currentValue,
	onSelect,
	classNames,
	wide = false,
	hint,
	showDescription = false,
}: OptionPanelOptionSectionProps) {
	const activeClassName = classNames.active ?? "is-active";
	const panelOptions = options.map(normalizePanelOption);

	return (
		<OptionPanelSectionFrame label={label} hint={hint} classNames={classNames}>
			<div className={joinClassNames(classNames.grid, wide && classNames.gridWide)}>
				{panelOptions.map((option) => {
					const isActive = currentValue === option.value;
					return (
						<button
							key={option.value}
							className={joinClassNames(
								classNames.chip,
								isActive && activeClassName,
							)}
							type="button"
							disabled={option.disabled}
							title={option.description}
							onPointerDown={stopComposerEvent}
							onClick={(event) => {
								event.stopPropagation();
								onSelect(option.value);
							}}
						>
							<span>{option.label}</span>
							{showDescription && option.description ? (
								<small>{option.description}</small>
							) : null}
						</button>
					);
				})}
			</div>
		</OptionPanelSectionFrame>
	);
}

export function OptionPanelOptionSectionList({
	sections,
	classNames,
	defaultShowDescription = false,
}: OptionPanelOptionSectionListProps) {
	return (
		<>
			{sections
				.filter((section) => section.options.length)
				.map((section) => (
					<OptionPanelOptionSection
						key={section.key ?? section.label}
						label={section.label}
						options={section.options}
						currentValue={section.currentValue}
						onSelect={section.onSelect}
						classNames={classNames}
						wide={section.wide}
						hint={section.hint}
						showDescription={
							section.showDescription ?? defaultShowDescription
						}
					/>
				))}
		</>
	);
}

export function OptionPanelInputGrid({
	fields,
	gridClassName,
	fieldClassName,
	inputClassName,
	defaultPlaceholder = "auto",
	stopClickPropagation = false,
}: OptionPanelInputGridProps) {
	return (
		<div className={gridClassName}>
			{fields.map((field) => (
				<label
					key={field.key ?? field.fieldLabel ?? field.value}
					className={fieldClassName}
				>
					{field.fieldLabel ? <span>{field.fieldLabel}</span> : null}
					<OptionPanelTextControl
						control="input"
						className={inputClassName}
						type={field.type ?? "text"}
						value={field.value}
						inputMode={field.inputMode}
						placeholder={field.placeholder ?? defaultPlaceholder}
						onChange={field.onChange}
						stopClickPropagation={stopClickPropagation}
					/>
				</label>
			))}
		</div>
	);
}

export function OptionPanelInputGridSection({
	label,
	classNames,
	hint,
	fields,
	gridClassName,
	fieldClassName,
	inputClassName,
	defaultPlaceholder,
	stopClickPropagation,
}: OptionPanelInputGridSectionProps) {
	return (
		<OptionPanelSectionFrame label={label} hint={hint} classNames={classNames}>
			<OptionPanelInputGrid
				fields={fields}
				gridClassName={gridClassName}
				fieldClassName={fieldClassName}
				inputClassName={inputClassName}
				defaultPlaceholder={defaultPlaceholder}
				stopClickPropagation={stopClickPropagation}
			/>
		</OptionPanelSectionFrame>
	);
}

export function OptionPanelInputSection({
	label,
	value,
	onChange,
	classNames,
	inputClassName,
	hint,
	placeholder = "",
	inputMode = "text",
	type = "text",
	stopClickPropagation = false,
}: OptionPanelInputSectionProps) {
	return (
		<OptionPanelTextControlSection
			control="input"
			label={label}
			value={value}
			onChange={onChange}
			classNames={classNames}
			inputClassName={inputClassName}
			hint={hint}
			placeholder={placeholder}
			inputMode={inputMode}
			type={type}
			stopClickPropagation={stopClickPropagation}
		/>
	);
}

export function OptionPanelTextAreaSection({
	label,
	value,
	onChange,
	classNames,
	textAreaClassName,
	hint,
	placeholder = "",
	rows = 5,
	stopClickPropagation = false,
}: OptionPanelTextAreaSectionProps) {
	return (
		<OptionPanelTextControlSection
			control="textarea"
			label={label}
			value={value}
			onChange={onChange}
			classNames={classNames}
			textAreaClassName={textAreaClassName}
			hint={hint}
			placeholder={placeholder}
			rows={rows}
			stopClickPropagation={stopClickPropagation}
		/>
	);
}

function OptionPanelTextControlSection(props: OptionPanelTextControlSectionProps) {
	const controlProps: OptionPanelTextControlProps =
		props.control === "textarea"
			? {
					control: "textarea",
					className: props.textAreaClassName,
					value: props.value,
					placeholder: props.placeholder,
					rows: props.rows,
					onChange: props.onChange,
					stopClickPropagation: props.stopClickPropagation,
			  }
			: {
					control: "input",
					className: props.inputClassName,
					type: props.type,
					value: props.value,
					placeholder: props.placeholder,
					inputMode: props.inputMode,
					onChange: props.onChange,
					stopClickPropagation: props.stopClickPropagation,
			  };

	return (
		<OptionPanelSectionFrame
			label={props.label}
			hint={props.hint}
			classNames={props.classNames}
		>
			<OptionPanelTextControl {...controlProps} />
		</OptionPanelSectionFrame>
	);
}

export function OptionPanelHintBlock({
	children,
	className,
}: {
	children: ReactNode;
	className: string;
}) {
	return <div className={className}>{children}</div>;
}
