import type { ReactNode, WheelEvent } from "react";

import type { PanelOption } from "../parameterPanelPresentation";
import { getDropdownCaret as caret } from "../parameterPanelPresentation";
import { DEFAULT_LYRICS_PLACEHOLDER, TextControl } from "./TextControl";

export const DEFAULT_TEXTAREA_PLACEHOLDER = DEFAULT_LYRICS_PLACEHOLDER;

export function stopInspectorMenuWheel(event: WheelEvent<HTMLDivElement>) {
	event.stopPropagation();
}

export type ParamCardProps<MenuKey extends string> = {
	label: string;
	value: string;
	selectedValue?: string;
	menuKey: MenuKey;
	isOpen: boolean;
	options: PanelOption[];
	onToggle: (menuKey: MenuKey) => void;
	onSelect: (value: string) => void;
	className?: string;
	valueClassName?: string;
};

export type SelectParamField<MenuKey extends string> = {
	label: string;
	value: string;
	menuKey: MenuKey;
	options: PanelOption[];
	onSelect: (value: string) => void;
	selectedValue?: string;
	className?: string;
	valueClassName?: string;
};

export type SelectParamCardProps<MenuKey extends string> = {
	field: SelectParamField<MenuKey>;
	openMenu: MenuKey | null;
	onToggle: (menuKey: MenuKey) => void;
	onAfterSelect?: () => void;
};

export function SelectParamCard<MenuKey extends string>({
	field,
	openMenu,
	onToggle,
	onAfterSelect,
}: SelectParamCardProps<MenuKey>) {
	return (
		<ParamCard
			label={field.label}
			value={field.value}
			selectedValue={field.selectedValue}
			menuKey={field.menuKey}
			isOpen={openMenu === field.menuKey}
			options={field.options}
			onToggle={onToggle}
			onSelect={(value) => {
				field.onSelect(value);
				onAfterSelect?.();
			}}
			className={field.className}
			valueClassName={field.valueClassName}
		/>
	);
}

export type InputParamField = {
	id?: string;
	label: string;
	value?: string;
	placeholder?: string;
	inputMode?: "text" | "decimal" | "numeric";
	onChange: (value: string) => void;
};

export type TextareaParamField = {
	id?: string;
	label: string;
	value?: string;
	placeholder?: string;
	rows?: number;
	onChange: (value: string) => void;
};

export type ActionCardGroupProps = {
	label: string;
	options: PanelOption[];
	selectedValue?: string;
	onSelect: (value: string) => void;
};

export type ActionParamField = ActionCardGroupProps & {
	id?: string;
};

export type ActionParamCardProps = {
	field: ActionParamField;
};

export type InspectorMetricCardFrameProps = {
	label: string;
	children: ReactNode;
	className: string;
	isInteractive?: boolean;
	isOpen?: boolean;
};

export function InspectorMetricCardFrame({
	label,
	children,
	className,
	isInteractive = false,
	isOpen = false,
}: InspectorMetricCardFrameProps) {
	return (
		<div
			className={`inspector-panel__metric ${
				isInteractive ? "inspector-panel__metric--interactive" : ""
			} ${className} ${isOpen ? "is-menu-open" : ""}`.trim()}
		>
			{label ? <span>{label}</span> : null}
			{children}
		</div>
	);
}

export type InspectorPickerCardFrameProps = {
	label: string;
	children: ReactNode;
	className: string;
	pickerClassName: string;
	isOpen: boolean;
	useMetricStack?: boolean;
};

export function InspectorPickerCardFrame({
	label,
	children,
	className,
	pickerClassName,
	isOpen,
	useMetricStack = false,
}: InspectorPickerCardFrameProps) {
	const picker = <div className={pickerClassName}>{children}</div>;

	return (
		<InspectorMetricCardFrame
			label={label}
			className={className}
			isInteractive
			isOpen={isOpen}
		>
			{useMetricStack ? (
				<div className="inspector-panel__metric-stack">{picker}</div>
			) : (
				picker
			)}
		</InspectorMetricCardFrame>
	);
}

export type InspectorPickerTriggerProps = {
	value: string;
	isOpen: boolean;
	valueClassName?: string;
	rowClassName?: string;
	onToggle: () => void;
};

export function InspectorPickerTrigger({
	value,
	isOpen,
	valueClassName = "",
	rowClassName,
	onToggle,
}: InspectorPickerTriggerProps) {
	const content = (
		<>
			<strong className={`inspector-panel__picker-value ${valueClassName}`.trim()}>
				{value}
			</strong>
			<span className="inspector-panel__picker-caret">{caret(isOpen)}</span>
		</>
	);

	return (
		<button
			type="button"
			className="inspector-panel__picker-trigger inspector-panel__picker-trigger--bare"
			onClick={onToggle}
		>
			{rowClassName ? <div className={rowClassName}>{content}</div> : content}
		</button>
	);
}

export type InspectorPickerControlCardProps = {
	label: string;
	value: string;
	isOpen: boolean;
	className: string;
	pickerClassName: string;
	children?: ReactNode;
	valueClassName?: string;
	rowClassName?: string;
	useMetricStack?: boolean;
	onToggle: () => void;
	renderTrigger?: (props: {
		value: string;
		isOpen: boolean;
		onToggle: () => void;
	}) => ReactNode;
};

export function InspectorPickerControlCard({
	label,
	value,
	isOpen,
	className,
	pickerClassName,
	children,
	valueClassName,
	rowClassName,
	useMetricStack = false,
	onToggle,
	renderTrigger,
}: InspectorPickerControlCardProps) {
	return (
		<InspectorPickerCardFrame
			label={label}
			className={className}
			pickerClassName={pickerClassName}
			isOpen={isOpen}
			useMetricStack={useMetricStack}
		>
			{renderTrigger ? (
				renderTrigger({ value, isOpen, onToggle })
			) : (
				<InspectorPickerTrigger
					value={value}
					isOpen={isOpen}
					valueClassName={valueClassName}
					rowClassName={rowClassName}
					onToggle={onToggle}
				/>
			)}
			{isOpen ? children : null}
		</InspectorPickerCardFrame>
	);
}

export type InspectorParamPickerCardProps = Omit<
	InspectorPickerControlCardProps,
	"pickerClassName"
> & {
	pickerClassName?: string;
};

export function InspectorParamPickerCard({
	pickerClassName = "inspector-panel__param-picker",
	...props
}: InspectorParamPickerCardProps) {
	return <InspectorPickerControlCard {...props} pickerClassName={pickerClassName} />;
}

export type PanelOptionButtonProps = {
	children: ReactNode;
	className?: string;
	disabled?: boolean;
	isActive?: boolean;
	title?: string;
	variant?: "menu" | "action";
	onClick: () => void;
	onFocus?: () => void;
	onMouseEnter?: () => void;
};

export function PanelOptionButton({
	children,
	className = "",
	disabled = false,
	isActive = false,
	title,
	variant = "menu",
	onClick,
	onFocus,
	onMouseEnter,
}: PanelOptionButtonProps) {
	const baseClassName =
		variant === "action"
			? "inspector-panel__action-card"
			: "inspector-panel__menu-item";

	return (
		<button
			type="button"
			className={`${baseClassName} ${isActive ? "is-active" : ""} ${className}`.trim()}
			disabled={disabled}
			onMouseEnter={onMouseEnter}
			onFocus={onFocus}
			onClick={() => {
				if (!disabled) onClick();
			}}
			title={title}
		>
			{children}
		</button>
	);
}

export type PanelOptionListProps = {
	options: PanelOption[];
	selectedValue?: string;
	variant?: PanelOptionButtonProps["variant"];
	onSelect: (value: string) => void;
	onOptionHover?: (value: string) => void;
	renderOption?: (option: PanelOption) => ReactNode;
};

export function PanelOptionList({
	options,
	selectedValue,
	variant = "menu",
	onSelect,
	onOptionHover,
	renderOption = (option) => option.label,
}: PanelOptionListProps) {
	return (
		<>
			{options.map((option) => (
				<PanelOptionButton
					key={option.value}
					variant={variant}
					disabled={option.disabled}
					isActive={option.value === selectedValue}
					title={option.description}
					onClick={() => onSelect(option.value)}
					onMouseEnter={
						onOptionHover ? () => onOptionHover(option.value) : undefined
					}
					onFocus={onOptionHover ? () => onOptionHover(option.value) : undefined}
				>
					{renderOption(option)}
				</PanelOptionButton>
			))}
		</>
	);
}

export type PanelOptionSurfaceProps = {
	children?: ReactNode;
	className?: string;
	baseClassName: string;
};

export function PanelOptionSurface({
	children,
	className = "",
	baseClassName,
}: PanelOptionSurfaceProps) {
	return (
		<div
			className={`${baseClassName} ${className}`.trim()}
			onWheelCapture={stopInspectorMenuWheel}
		>
			{children}
		</div>
	);
}

export type PanelOptionCollectionProps = PanelOptionListProps & {
	children?: ReactNode;
	className?: string;
	baseClassName: string;
};

export function PanelOptionCollection({
	children,
	className = "",
	baseClassName,
	options,
	selectedValue,
	onSelect,
	onOptionHover,
	renderOption,
	variant,
}: PanelOptionCollectionProps) {
	return (
		<PanelOptionSurface baseClassName={baseClassName} className={className}>
			{children}
			<PanelOptionList
				options={options}
				selectedValue={selectedValue}
				variant={variant}
				onSelect={onSelect}
				onOptionHover={onOptionHover}
				renderOption={renderOption}
			/>
		</PanelOptionSurface>
	);
}

export type PanelOptionsMenuProps = Omit<
	PanelOptionCollectionProps,
	"baseClassName" | "variant"
>;

export type PanelOptionMenuSurfaceProps = {
	children: ReactNode;
	className?: string;
};

export function PanelOptionMenuSurface({
	children,
	className = "",
}: PanelOptionMenuSurfaceProps) {
	return (
		<PanelOptionSurface
			baseClassName="inspector-panel__menu inspector-panel__menu--wide"
			className={className}
		>
			{children}
		</PanelOptionSurface>
	);
}

export type PanelOptionMenuListProps = PanelOptionsMenuProps;

export function PanelOptionMenuList({
	children,
	options,
	selectedValue,
	onSelect,
	className = "",
	onOptionHover,
	renderOption,
}: PanelOptionMenuListProps) {
	return (
		<PanelOptionCollection
			baseClassName="inspector-panel__menu inspector-panel__menu--wide"
			className={className}
			options={options}
			selectedValue={selectedValue}
			onSelect={onSelect}
			onOptionHover={onOptionHover}
			renderOption={renderOption}
		>
			{children}
		</PanelOptionCollection>
	);
}

export function PanelOptionsMenu({
	children,
	options,
	selectedValue,
	onSelect,
	className = "",
	onOptionHover,
	renderOption,
}: PanelOptionsMenuProps) {
	return (
		<PanelOptionMenuList
			options={options}
			selectedValue={selectedValue}
			onSelect={onSelect}
			className={className}
			onOptionHover={onOptionHover}
			renderOption={renderOption}
		>
			{children}
		</PanelOptionMenuList>
	);
}

export type InspectorParamOptionPickerCardProps = Omit<
	InspectorParamPickerCardProps,
	"children"
> & {
	options: PanelOption[];
	selectedValue?: string;
	menuClassName?: string;
	menuChildren?: ReactNode;
	onSelect: (value: string) => void;
	onOptionHover?: (value: string) => void;
	renderOption?: (option: PanelOption) => ReactNode;
};

export function InspectorParamOptionPickerCard({
	options,
	selectedValue,
	menuClassName = "",
	menuChildren,
	onSelect,
	onOptionHover,
	renderOption,
	...pickerProps
}: InspectorParamOptionPickerCardProps) {
	return (
		<InspectorParamPickerCard {...pickerProps}>
			<PanelOptionsMenu
				options={options}
				selectedValue={selectedValue}
				onSelect={onSelect}
				className={menuClassName}
				onOptionHover={onOptionHover}
				renderOption={renderOption}
			>
				{menuChildren}
			</PanelOptionsMenu>
		</InspectorParamPickerCard>
	);
}

export function ActionCardGroup({
	label,
	options,
	selectedValue,
	onSelect,
}: ActionCardGroupProps) {
	return (
		<InspectorMetricCardFrame
			label={label}
			className="inspector-panel__metric--action-group"
		>
			<PanelOptionCollection
				baseClassName="inspector-panel__action-grid"
				options={options}
				selectedValue={selectedValue}
				variant="action"
				onSelect={onSelect}
				renderOption={(option) => (
					<>
						<strong>{option.label}</strong>
						{option.description ? <small>{option.description}</small> : null}
					</>
				)}
			/>
		</InspectorMetricCardFrame>
	);
}

export function ActionParamCard({ field }: ActionParamCardProps) {
	return (
		<ActionCardGroup
			label={field.label}
			options={field.options}
			selectedValue={field.selectedValue}
			onSelect={field.onSelect}
		/>
	);
}

export type RatioCardProps = {
	value: string;
	selectedValue?: string;
	isOpen: boolean;
	options: PanelOption[];
	onToggle: () => void;
	onSelect: (value: string) => void;
};

export function RatioCard({
	value,
	selectedValue,
	isOpen,
	options,
	onToggle,
	onSelect,
}: RatioCardProps) {
	return (
		<InspectorPickerControlCard
			label="比例"
			value={value}
			isOpen={isOpen}
			className="inspector-panel__metric--ratio-card"
			pickerClassName="inspector-panel__ratio-picker"
			onToggle={onToggle}
			renderTrigger={({
				value: triggerValue,
				isOpen: isTriggerOpen,
				onToggle: handleToggle,
			}) => (
				<button
					type="button"
					className="inspector-panel__ratio-trigger"
					onClick={handleToggle}
				>
					<span className="inspector-panel__ratio-value">{triggerValue}</span>
					<span className="inspector-panel__ratio-caret">{caret(isTriggerOpen)}</span>
				</button>
			)}
		>
			<PanelOptionsMenu
				options={options}
				selectedValue={selectedValue ?? value}
				onSelect={onSelect}
			/>
		</InspectorPickerControlCard>
	);
}

export function ParamCard<MenuKey extends string>({
	label,
	value,
	selectedValue,
	menuKey,
	isOpen,
	options,
	onToggle,
	onSelect,
	className = "",
	valueClassName = "",
}: ParamCardProps<MenuKey>) {
	return (
		<InspectorParamOptionPickerCard
			label={label}
			value={value}
			isOpen={isOpen}
			className={`inspector-panel__metric--param-card ${className}`.trim()}
			valueClassName={valueClassName}
			rowClassName="inspector-panel__param-card-row"
			onToggle={() => onToggle(menuKey)}
			options={options}
			selectedValue={selectedValue ?? value}
			onSelect={onSelect}
		/>
	);
}

export type InputParamCardProps = {
	label: string;
	value?: string;
	placeholder?: string;
	inputMode?: "text" | "decimal" | "numeric";
	onChange: (value: string) => void;
};

type TextareaParamCardPropsBase = {
	label: string;
	value?: string;
	placeholder?: string;
	rows?: number;
	onChange: (value: string) => void;
};

export type InspectorLabeledTextControlProps =
	| {
			label: string;
			control: "input";
			className?: string;
			labelClassName?: string;
			inputClassName: string;
			value?: string;
			placeholder?: string;
			inputMode?: "text" | "decimal" | "numeric";
			onChange: (value: string) => void;
	  }
	| {
			label: string;
			control: "textarea";
			className?: string;
			labelClassName?: string;
			inputClassName: string;
			value?: string;
			placeholder?: string;
			rows?: number;
			onChange: (value: string) => void;
	  };

export function InspectorLabeledTextControl(props: InspectorLabeledTextControlProps) {
	const labelClassName = props.labelClassName;

	return (
		<label className={props.className || undefined}>
			<span className={labelClassName}>{props.label}</span>
			{props.control === "textarea" ? (
				<TextControl
					control="textarea"
					className={props.inputClassName}
					value={props.value ?? ""}
					placeholder={props.placeholder}
					rows={props.rows}
					onChange={props.onChange}
				/>
			) : (
				<TextControl
					control="input"
					className={props.inputClassName}
					value={props.value ?? ""}
					placeholder={props.placeholder}
					inputMode={props.inputMode ?? "text"}
					onChange={props.onChange}
				/>
			)}
		</label>
	);
}

type InspectorTextControlParamCardProps =
	| (InputParamCardProps & {
			control: "input";
	  })
	| (TextareaParamCardPropsBase & {
			control: "textarea";
	  });

function getInspectorTextInputClassName(control: InspectorTextControlParamCardProps["control"]) {
	return control === "textarea"
		? "inspector-panel__text-input inspector-panel__textarea-input"
		: "inspector-panel__text-input";
}

function InspectorTextControlParamCard(props: InspectorTextControlParamCardProps) {
	const isTextArea = props.control === "textarea";
	const placeholder =
		props.placeholder ?? (isTextArea ? DEFAULT_TEXTAREA_PLACEHOLDER : "auto");
	const cardClassName = `inspector-panel__metric inspector-panel__metric--param-card inspector-panel__metric--input-card ${
		isTextArea ? "inspector-panel__metric--textarea-card" : ""
	}`.trim();
	const inputClassName = getInspectorTextInputClassName(props.control);

	return (
		<InspectorLabeledTextControl
			control={props.control}
			label={props.label}
			className={cardClassName}
			inputClassName={inputClassName}
			value={props.value}
			placeholder={placeholder}
			onChange={props.onChange}
			{...(isTextArea
				? { rows: props.rows }
				: { inputMode: props.inputMode ?? "text" })}
		/>
	);
}

export function InputParamCard({
	label,
	value,
	placeholder = "auto",
	inputMode = "text",
	onChange,
}: InputParamCardProps) {
	return (
		<InspectorTextControlParamCard
			control="input"
			label={label}
			value={value}
			placeholder={placeholder}
			inputMode={inputMode}
			onChange={onChange}
		/>
	);
}

export type TextareaParamCardProps = TextareaParamCardPropsBase;

export function TextareaParamCard({
	label,
	value,
	placeholder = DEFAULT_TEXTAREA_PLACEHOLDER,
	rows,
	onChange,
}: TextareaParamCardProps) {
	return (
		<InspectorTextControlParamCard
			control="textarea"
			label={label}
			value={value}
			placeholder={placeholder}
			rows={rows}
			onChange={onChange}
		/>
	);
}
