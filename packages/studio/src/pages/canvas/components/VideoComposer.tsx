import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import {
	isComposerInteractiveTarget,
	stopComposerEvent,
} from "../composerInteractionHelpers";
import type {
	ComposerPreset,
	OpenDropdown,
	ReferenceAssetSlotInputList,
} from "../canvas-types";
import type { VideoComposerOptionKey } from "../appComposerOptionUpdates";
import {
	getVideoModeOption,
	type VideoGenerationModeId,
	type VideoModelCapability,
} from "../videoModelCapabilities";
import { buildVideoParameterOptionState } from "../videoParameterOptionState";
import {
	getModelDisplayLabel,
} from "../modelOptions";
import { getComposerUsageLabel } from "../modelUsagePresentation";
import {
	getDropdownCaret as caret,
	findPanelOptionLabel,
} from "../parameterPanelPresentation";
import {
	buildVideoReferenceSlotState,
} from "../referenceAssetSlotPresentation";
import { ComposerLocalStatus, ComposerSendButton } from "./ComposerSendControls";
import { ReferenceAssetSlots } from "./ReferenceAssetSlots";
import { VideoOptionsDropdown } from "./VideoOptionSections";

type VideoComposerProps = {
	composer: ComposerPreset;
	isSending?: boolean;
	capability: VideoModelCapability;
	referenceAssets: ReferenceAssetSlotInputList;
	canAddReferenceAsset: boolean;
	recommendedMode: VideoGenerationModeId | null;
	modelOptions: string[];
	openDropdown: OpenDropdown;
	floating?: boolean;
	styleControl?: ReactNode;
	onPromptChange: (prompt: string) => void;
	onToggleDropdown: (dropdown: Exclude<OpenDropdown, null>) => void;
	onCloseDropdown: () => void;
	onSwitchModel: (model: string) => void;
	onUpdateVideoOption: (
		key: VideoComposerOptionKey,
		value: string,
	) => void;
	onUploadReferenceAsset: (slotIndex: number) => void;
	onSend?: () => void;
};

// Dropdown pill: click to open a dropdown menu, select an option
function DropdownPill({
	label,
	options,
	currentValue,
	getOptionLabel,
	getOptionValue,
	isActive,
	onSelect,
	onToggle,
}: {
	label: string;
	options: readonly { value: string; label: string }[];
	currentValue: string;
	getOptionLabel?: (v: string) => string;
	getOptionValue?: (v: string) => string;
	isActive: boolean;
	onSelect: (value: string) => void;
	onToggle: () => void;
}) {
	const displayLabel = getOptionLabel ? getOptionLabel(currentValue) : label;
	return (
		<div className="pill-dropdown-wrapper">
			<button
				type="button"
				className={`composer-meta--video-pill ${isActive ? "is-active" : ""}`}
				onPointerDown={(event) => event.stopPropagation()}
				onClick={(event) => {
					event.stopPropagation();
					onToggle();
				}}
			>
				<span>{displayLabel}</span>
				<span className="pill-caret">{isActive ? "▴" : "▾"}</span>
			</button>
			{isActive ? (
				<div
					className="pill-dropdown-menu"
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => event.stopPropagation()}
					onWheel={(event) => event.stopPropagation()}
					onWheelCapture={(event) => event.stopPropagation()}
				>
					{options.map((opt) => {
						const val = getOptionValue ? getOptionValue(opt.value) : opt.value;
						const lbl = getOptionLabel ? getOptionLabel(opt.value) : opt.label;
						const isSelected = val === currentValue;
						return (
							<button
								key={opt.value}
								type="button"
								className={`pill-dropdown-menu__item ${isSelected ? "is-selected" : ""}`}
								onClick={(event) => {
									event.stopPropagation();
									onSelect(opt.value);
								}}
							>
								{lbl}
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

export function VideoComposer({
	composer,
	isSending,
	capability,
	referenceAssets,
	canAddReferenceAsset,
	recommendedMode,
	modelOptions,
	openDropdown,
	floating = false,
	styleControl,
	onPromptChange,
	onToggleDropdown,
	onCloseDropdown,
	onSwitchModel,
	onUpdateVideoOption,
	onUploadReferenceAsset,
	onSend,
}: VideoComposerProps) {
	const composerModelDisplayLabel = getModelDisplayLabel(composer.model);
	const videoOptionState = buildVideoParameterOptionState({ composer, capability });
	const {
		currentMode,
	} = videoOptionState;
	const suggestionMode = recommendedMode
		? getVideoModeOption(composer.model, recommendedMode, composer)
		: null;
	const isVideoOptionsOpen = openDropdown === "videoOptions";
	const [shouldRenderVideoOptions, setShouldRenderVideoOptions] =
		useState(isVideoOptionsOpen);
	const [isVideoOptionsClosing, setIsVideoOptionsClosing] = useState(false);
	const [openPillDropdown, setOpenPillDropdown] = useState<string | null>(null);
	const referenceSlotState = buildVideoReferenceSlotState(
		currentMode?.id ?? capability.defaultMode,
		referenceAssets,
		currentMode?.maxReferenceImages ?? 0,
		canAddReferenceAsset,
	);
	const maxReferenceImages = currentMode?.maxReferenceImages ?? 0;
	const referenceAssetCount = referenceSlotState.referenceCount;
	const shouldHighlightMode = Boolean(
		suggestionMode &&
			suggestionMode.id !== currentMode?.id &&
			referenceAssetCount >= 2,
	);
	const slotLabels = referenceSlotState.labels;
	const usageLabel = getComposerUsageLabel("video", composer);
	const controlsReadonly = false;

	// Individual parameter values for pills
	const modeLabel = currentMode?.label ?? "";
	const tierValue = composer.videoTier ?? capability.defaultTier ?? "";
	const tierOptions = capability.tiers ?? [];
	const tierLabel = findPanelOptionLabel(videoOptionState.tierOptions, tierValue, tierValue);

	const qualityValue = composer.videoQuality ?? capability.defaultQuality ?? "";
	const qualityOptions = capability.qualities ?? [];
	const qualityLabel = findPanelOptionLabel(videoOptionState.qualityOptions, qualityValue, qualityValue);

	const versionValue = composer.videoVersion ?? capability.defaultVersion ?? "";
	const versionOptions = capability.versions ?? [];
	const versionLabel = findPanelOptionLabel(videoOptionState.versionOptions, versionValue, versionValue);

	const aspectRatioValue = composer.aspectRatio ?? capability.defaultAspectRatio ?? "";
	const aspectRatioOptions = capability.aspectRatios ?? [];
	const aspectRatioLabel = findPanelOptionLabel(videoOptionState.aspectRatioOptions, aspectRatioValue, aspectRatioValue);

	const resolutionValue = composer.resolution ?? capability.defaultResolution ?? "";
	const resolutionOptions = capability.resolutions ?? [];
	const resolutionLabel = findPanelOptionLabel(videoOptionState.resolutionOptions, resolutionValue, resolutionValue);

	const durationValue = composer.duration ?? capability.displayOnlyDuration ?? capability.defaultDuration ?? "";
	const durationOptions = capability.durations ?? [];
	const durationLabel = findPanelOptionLabel(videoOptionState.durationOptions, durationValue, durationValue);

	// Mode options for cycling
	const modeOptions = (capability.modes ?? []).map((m) => m.id);
	const modeId = currentMode?.id ?? capability.defaultMode ?? "";

	function handleComposerPointerDown(
		event: React.PointerEvent<HTMLDivElement>,
	) {
		stopComposerEvent(event);
		if (!openDropdown) return;
		if (isComposerInteractiveTarget(event.target, [".video-options-panel"])) {
			return;
		}
		onCloseDropdown();
	}

	useEffect(() => {
		if (isVideoOptionsOpen) {
			setShouldRenderVideoOptions(true);
			setIsVideoOptionsClosing(false);
			return;
		}

		if (!shouldRenderVideoOptions) return;
		setIsVideoOptionsClosing(true);
		const closeTimer = window.setTimeout(() => {
			setShouldRenderVideoOptions(false);
			setIsVideoOptionsClosing(false);
		}, 180);
		return () => window.clearTimeout(closeTimer);
	}, [isVideoOptionsOpen, shouldRenderVideoOptions]);

	return (
		<div
			className={`composer composer--video ${floating ? "floating-composer composer--floating" : ""}`}
			onPointerDown={handleComposerPointerDown}
		>
			{maxReferenceImages > 0 ? (
				<ReferenceAssetSlots
					labels={slotLabels}
					referenceAssets={referenceAssets}
					canAddReferenceAsset={canAddReferenceAsset}
					onUploadReferenceAsset={onUploadReferenceAsset}
				/>
			) : null}

			<textarea
				className={`composer__input ${floating ? "composer__input--floating" : ""} composer__textarea`}
				value={composer.prompt}
				placeholder={composer.placeholder}
				onChange={(event) => onPromptChange(event.target.value)}
			/>

			<ComposerLocalStatus isSending={isSending} />

			<div
				className={`composer__footer ${floating ? "composer__footer--floating" : ""}`}
			>
				<div className="composer__actions composer__actions--left composer__actions--video-left">
					<div className="model-switcher">
						<button
							type="button"
							className={`model-pill ${floating ? "model-pill--floating" : ""} ${controlsReadonly ? "model-pill--readonly" : ""}`}
							onClick={() => onToggleDropdown("model")}
						>
							<span className="model-pill__icon">✦</span>
							<span>{composerModelDisplayLabel}</span>
							<span className="model-pill__caret">
								{caret(openDropdown === "model")}
							</span>
						</button>
						{openDropdown === "model" ? (
							<div className="model-menu" onWheelCapture={stopComposerEvent} onPointerDown={stopComposerEvent}>
								{modelOptions.map((model) => (
									<button
										key={model}
										type="button"
										onClick={() => onSwitchModel(model)}
									>
										{model}
									</button>
								))}
							</div>
						) : null}
					</div>

					{/* MiniMax Hailuo 2.3 quality shortcut */}
				{((capability.tiers?.length ?? 0) > 0) && composerModelDisplayLabel.includes("MiniMax Hailuo") ? (
					<DropdownPill
						label={tierLabel}
						options={videoOptionState.tierOptions}
						currentValue={tierValue}
						isActive={openPillDropdown === "tier-shortcut"}
						onSelect={(v) => { onUpdateVideoOption("videoTier", v); setOpenPillDropdown(null); }}
						onToggle={() => setOpenPillDropdown(openPillDropdown === "tier-shortcut" ? null : "tier-shortcut")}
					/>
				) : null}

				{/* Individual parameter pills — split with dropdown menus */}
				<div className="inline-dropdown video-inline-dropdown video-pills-split">
					{modeOptions.length > 1 ? (
						<DropdownPill
							label={modeLabel}
							options={videoOptionState.modeOptions}
							currentValue={modeId}
							isActive={openPillDropdown === "mode"}
							onSelect={(v) => { onUpdateVideoOption("videoGenerationMode", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "mode" ? null : "mode")}
						/>
					) : null}

					{tierOptions.length > 1 ? (
						<DropdownPill
							label={tierLabel}
							options={videoOptionState.tierOptions}
							currentValue={tierValue}
							isActive={openPillDropdown === "tier"}
							onSelect={(v) => { onUpdateVideoOption("videoTier", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "tier" ? null : "tier")}
						/>
					) : null}

					{qualityOptions.length > 1 ? (
						<DropdownPill
							label={qualityLabel}
							options={videoOptionState.qualityOptions}
							currentValue={qualityValue}
							isActive={openPillDropdown === "quality"}
							onSelect={(v) => { onUpdateVideoOption("videoQuality", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "quality" ? null : "quality")}
						/>
					) : null}

					{versionOptions.length > 1 ? (
						<DropdownPill
							label={versionLabel}
							options={videoOptionState.versionOptions}
							currentValue={versionValue}
							isActive={openPillDropdown === "version"}
							onSelect={(v) => { onUpdateVideoOption("videoVersion", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "version" ? null : "version")}
						/>
					) : null}

					{aspectRatioOptions.length > 1 ? (
						<DropdownPill
							label={aspectRatioLabel}
							options={videoOptionState.aspectRatioOptions}
							currentValue={aspectRatioValue}
							isActive={openPillDropdown === "ratio"}
							onSelect={(v) => { onUpdateVideoOption("aspectRatio", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "ratio" ? null : "ratio")}
						/>
					) : null}

					{resolutionOptions.length > 1 ? (
						<DropdownPill
							label={resolutionLabel}
							options={videoOptionState.resolutionOptions}
							currentValue={resolutionValue}
							isActive={openPillDropdown === "res"}
							onSelect={(v) => { onUpdateVideoOption("resolution", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "res" ? null : "res")}
						/>
					) : null}

					{durationOptions.length > 1 ? (
						<DropdownPill
							label={durationLabel}
							options={videoOptionState.durationOptions}
							currentValue={durationValue}
							isActive={openPillDropdown === "dur"}
							onSelect={(v) => { onUpdateVideoOption("duration", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "dur" ? null : "dur")}
						/>
					) : null}

					{/* Advanced options dropdown (seed, etc.) */}
						<button
							type="button"
							className={`composer-meta composer-meta--button composer-meta--video ${shouldHighlightMode ? "composer-meta--video-suggested" : ""}`}
							onPointerDown={(event) => event.stopPropagation()}
							onClick={(event) => {
								event.stopPropagation();
								onToggleDropdown("videoOptions");
							}}
						>
							<span className="model-pill__caret">
								{caret(openDropdown === "videoOptions")}
							</span>
						</button>
						{shouldRenderVideoOptions ? (
							<VideoOptionsDropdown
								optionState={videoOptionState}
								seed={composer.seed ?? ""}
								isClosing={isVideoOptionsClosing}
								shouldHighlightMode={shouldHighlightMode}
								suggestionModeLabel={suggestionMode?.label}
								onUpdateVideoOption={onUpdateVideoOption}
							/>
						) : null}
					</div>
				</div>

				<div
					className={`composer__actions composer__actions--right ${floating ? "composer__actions--floating" : ""}`}
				>
					{styleControl ?? <span className="composer-meta composer-meta--readonly">风格</span>}
					<div className="credit-pill">{usageLabel}</div>
					<ComposerSendButton isSending={isSending} onSend={onSend} />
				</div>
			</div>
		</div>
	);
}
