import { stopComposerEvent } from "../composerInteractionHelpers";
import type { VideoComposerOptionKey } from "../appComposerOptionUpdates";
import type { PanelOption } from "../parameterPanelPresentation";
import {
	buildVideoOptionSections,
	buildVideoSeedInputSection,
	getVideoPartialCapabilityHint,
} from "../videoOptionSections";
import type { VideoParameterOptionState } from "../videoParameterOptionState";
import {
	OptionPanelHintBlock,
	OptionPanelInputSection,
	OptionPanelOptionSectionList,
	type OptionPanelSectionClassNames,
} from "./OptionPanelSections";

export type VideoOptionSectionProps = {
	label: string;
	options: PanelOption[];
	currentValue: string;
	onSelect: (value: string) => void;
	wide?: boolean;
	hint?: string;
};

export type VideoOptionsDropdownProps = {
	optionState: VideoParameterOptionState;
	seed: string;
	isClosing: boolean;
	shouldHighlightMode: boolean;
	suggestionModeLabel?: string;
	onUpdateVideoOption: (key: VideoComposerOptionKey, value: string) => void;
};

type VideoInputOptionSectionProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	inputMode?: "text" | "decimal" | "numeric";
};

const VIDEO_OPTION_SECTION_CLASS_NAMES: OptionPanelSectionClassNames = {
	section: "video-options-section",
	head: "video-options-section__head",
	label: "video-options-section__label",
	hint: "video-options-section__hint",
	grid: "video-option-grid",
	gridWide: "video-option-grid--wide",
	chip: "video-option-chip",
	active: "is-active",
};

function VideoHintBlock({ children }: { children: string }) {
	return (
		<OptionPanelHintBlock className="video-options-hint">
			{children}
		</OptionPanelHintBlock>
	);
}

function VideoInputOptionSection({
	label,
	value,
	onChange,
	placeholder,
	inputMode,
}: VideoInputOptionSectionProps) {
	return (
		<OptionPanelInputSection
			label={label}
			value={value}
			placeholder={placeholder}
			inputMode={inputMode}
			onChange={onChange}
			classNames={VIDEO_OPTION_SECTION_CLASS_NAMES}
			inputClassName="video-option-input"
		/>
	);
}

export function VideoOptionSection({
	label,
	options,
	currentValue,
	onSelect,
	wide = false,
	hint,
}: VideoOptionSectionProps) {
	return (
		<OptionPanelOptionSectionList
			sections={[
				{
					label,
					options,
					currentValue,
					onSelect,
					wide,
					hint,
				},
			]}
			classNames={VIDEO_OPTION_SECTION_CLASS_NAMES}
		/>
	);
}

export function VideoOptionsDropdown({
	optionState,
	seed,
	isClosing,
	shouldHighlightMode,
	suggestionModeLabel,
	onUpdateVideoOption,
}: VideoOptionsDropdownProps) {
	const optionSections = buildVideoOptionSections({
		optionState,
		shouldHighlightMode,
		suggestionModeLabel,
		onUpdateVideoOption,
	});
	const seedSection = buildVideoSeedInputSection({
		optionState,
		seed,
		onUpdateVideoOption,
	});
	const partialCapabilityHint = getVideoPartialCapabilityHint(optionState);

	return (
		<div
			className={`video-options-panel ${isClosing ? "is-closing" : "is-open"}`}
			onPointerDown={stopComposerEvent}
			onWheelCapture={stopComposerEvent}
		>
			<OptionPanelOptionSectionList
				sections={optionSections}
				classNames={VIDEO_OPTION_SECTION_CLASS_NAMES}
			/>
			{seedSection ? (
				<VideoInputOptionSection
					label={seedSection.label}
					value={seedSection.value}
					placeholder={seedSection.placeholder}
					inputMode={seedSection.inputMode}
					onChange={seedSection.onChange}
				/>
			) : null}
			{partialCapabilityHint ? <VideoHintBlock>{partialCapabilityHint}</VideoHintBlock> : null}
		</div>
	);
}
