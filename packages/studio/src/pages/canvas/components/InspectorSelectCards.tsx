import type { PanelOption } from "../parameterPanelPresentation";
import type { StyleCategory, StylePreset } from "../canvas-types";
import {
	InspectorParamOptionPickerCard,
	InspectorParamPickerCard,
	PanelOptionMenuList,
} from "./InspectorBaseParamCards";

type StyleOptionSource = Pick<StyleCategory | StylePreset, "id" | "name">;

type StyleOptionMenuListProps = {
	className: string;
	items: StyleOptionSource[];
	selectedValue?: string;
	onSelect: (value: string) => void;
	onOptionHover?: (value: string) => void;
};

function getStyleOptions(items: StyleOptionSource[]): PanelOption[] {
	return items.map((item) => ({
		value: item.id,
		label: item.name,
	}));
}

function StyleOptionMenuList({
	className,
	items,
	selectedValue,
	onSelect,
	onOptionHover,
}: StyleOptionMenuListProps) {
	return (
		<PanelOptionMenuList
			className={className}
			options={getStyleOptions(items)}
			selectedValue={selectedValue}
			onSelect={onSelect}
			onOptionHover={onOptionHover}
		/>
	);
}

type StylePreviewProps = {
	preset?: StylePreset | null;
};

function StylePreview({ preset }: StylePreviewProps) {
	return (
		<div
			className={`inspector-panel__style-preview ${
				preset ? "is-visible" : ""
			}`.trim()}
		>
			{preset ? (
				<>
					<div
						className="inspector-panel__style-preview-cover"
						style={{ backgroundImage: preset.cover }}
					/>
					<div className="inspector-panel__style-preview-copy">
						<strong>{preset.name}</strong>
						<span>{preset.summary}</span>
					</div>
				</>
			) : null}
		</div>
	);
}

type StylePresetSubmenuProps = {
	presets: StylePreset[];
	selectedPresetId?: string | null;
	previewPreset?: StylePreset | null;
	onPresetHover: (presetId: string) => void;
	onPresetSelect: (presetId: string) => void;
};

function StylePresetSubmenu({
	presets,
	selectedPresetId,
	previewPreset,
	onPresetHover,
	onPresetSelect,
}: StylePresetSubmenuProps) {
	return (
		<div className="inspector-panel__style-submenu-shell">
			<StylePreview preset={previewPreset} />
			<StyleOptionMenuList
				className="inspector-panel__menu--style-child"
				items={presets}
				selectedValue={selectedPresetId ?? undefined}
				onSelect={onPresetSelect}
				onOptionHover={onPresetHover}
			/>
		</div>
	);
}

export type ModelSelectCardProps = {
	value: string;
	selectedValue?: string;
	isOpen: boolean;
	options: PanelOption[];
	onToggle: () => void;
	onSelect: (value: string) => void;
};

export function ModelSelectCard({
	value,
	selectedValue,
	isOpen,
	options,
	onToggle,
	onSelect,
}: ModelSelectCardProps) {
	return (
		<InspectorParamOptionPickerCard
			label="模型"
			value={value}
			isOpen={isOpen}
			className="inspector-panel__metric--model-card"
			valueClassName="inspector-panel__picker-value--compact"
			onToggle={onToggle}
			useMetricStack
			options={options}
			selectedValue={selectedValue}
			onSelect={onSelect}
			menuClassName="inspector-panel__menu--model"
		/>
	);
}

export type StyleSelectCardProps = {
	value: string;
	isOpen: boolean;
	categories: StyleCategory[];
	activeCategoryId: string | null;
	presets: StylePreset[];
	selectedPresetId?: string | null;
	previewPreset?: StylePreset | null;
	onToggle: () => void;
	onCategorySelect: (categoryId: string) => void;
	onPresetHover: (presetId: string) => void;
	onPresetSelect: (presetId: string) => void;
};

export function StyleSelectCard({
	value,
	isOpen,
	categories,
	activeCategoryId,
	presets,
	selectedPresetId,
	previewPreset,
	onToggle,
	onCategorySelect,
	onPresetHover,
	onPresetSelect,
}: StyleSelectCardProps) {
	return (
		<InspectorParamPickerCard
			label="风格"
			value={value}
			isOpen={isOpen}
			className="inspector-panel__metric--style-card"
			onToggle={onToggle}
			useMetricStack
		>
			<div className="inspector-panel__style-popup-shell">
				<StyleOptionMenuList
					className="inspector-panel__menu--style-parent"
					items={categories}
					selectedValue={activeCategoryId ?? undefined}
					onSelect={onCategorySelect}
				/>
				{activeCategoryId ? (
					<StylePresetSubmenu
						presets={presets}
						selectedPresetId={selectedPresetId}
						previewPreset={previewPreset}
						onPresetHover={onPresetHover}
						onPresetSelect={onPresetSelect}
					/>
				) : null}
			</div>
		</InspectorParamPickerCard>
	);
}
