import type { ReactNode } from "react";
import { useState } from "react";

import {
	isComposerInteractiveTarget,
	stopComposerEvent,
} from "../composerInteractionHelpers";
import {
	getMusicStylePresets,
} from "../audioMusicModelCapabilities";
import { buildAudioMusicParameterOptionState } from "../audioMusicParameterOptionState";
import type {
	AudioComposerOptionKey,
	ImageComposerOptionKey,
	MusicComposerOptionKey,
	TextComposerOptionKey,
} from "../appComposerOptionUpdates";
import type {
	ImageModelCapability,
} from "../imageModelCapabilities";
import { buildImageReferencePresentationState } from "../imageReferencePresentation";
import { buildImageParameterOptionState } from "../imageParameterOptionState";
import {
	buildImageCustomDimensionSection,
	buildImageFormatAndControlSections,
	buildImageModeSections,
	buildImageNumericSections,
	buildImageSelectOptionSections,
} from "../imageOptionSections";
import {
	getModelDisplayLabel,
} from "../modelOptions";
import { getComposerUsageLabel } from "../modelUsagePresentation";
import {
	buildImageOptionsSummary,
	findPanelOptionLabel,
	formatImageQualityMetric,
	formatImageSpeedModeMetric,
	getDropdownCaret as caret,
} from "../parameterPanelPresentation";
import {
	REFERENCE_AUDIO_SLOT_PREFIX,
	REFERENCE_IMAGE_SLOT_PREFIX,
} from "../referenceAssetSlotPresentation";
import type {
	ComposerPreset,
	NodeType,
	OpenDropdown,
	ReferenceAssetSlotInputList,
} from "../canvas-types";
import {
	ImageOptionSectionList,
} from "./ComposerOptionSections";
import { AudioMusicOptionsPanel } from "./AudioMusicOptionPanel";
import { ComposerImageOptionsPanel } from "./ComposerImageOptionsPanel";
import { ComposerVoiceForm } from "./ComposerVoiceForm";
import { ComposerLocalStatus, ComposerSendButton } from "./ComposerSendControls";
import { ReferenceAssetSlots } from "./ReferenceAssetSlots";

// Dropdown pill: click to open a dropdown menu, select an option
function DropdownPill({
	label,
	options,
	currentValue,
	isActive,
	onSelect,
	onToggle,
}: {
	label: string;
	options: readonly { value: string; label: string }[];
	currentValue: string;
	isActive: boolean;
	onSelect: (value: string) => void;
	onToggle: () => void;
}) {
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
				<span>{label}</span>
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
						const isSelected = opt.value === currentValue;
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
								{opt.label}
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

type ComposerProps = {
	type: NodeType;
	composer: ComposerPreset;
	isSending?: boolean;
	styleControl?: ReactNode;
	promptPrefix?: string;
	referenceAssets?: ReferenceAssetSlotInputList;
	canAddReferenceAsset?: boolean;
	imageModelCapability?: ImageModelCapability | null;
	modelOptions: string[];
	imageRatios: string[];
	imageResolutions: string[];
	openDropdown: OpenDropdown;
	floating?: boolean;
	onPromptChange: (type: NodeType, prompt: string) => void;
	onToggleDropdown: (dropdown: Exclude<OpenDropdown, null>) => void;
	onCloseDropdown: () => void;
	onSwitchModel: (model: string) => void;
	onUpdateImageOption: (key: ImageComposerOptionKey, value: string | boolean) => void;
	onUpdateTextOption?: (key: TextComposerOptionKey, value: string) => void;
	onUpdateAudioOption?: (key: AudioComposerOptionKey, value: string) => void;
	onUpdateMusicOption?: (key: MusicComposerOptionKey, value: string) => void;
	onUploadReferenceAsset?: (slotIndex: number) => void;
	onSend?: () => void;
};

export function Composer({
	type,
	composer,
	isSending,
	promptPrefix,
	referenceAssets = [],
	canAddReferenceAsset = true,
	imageModelCapability = null,
	styleControl,
	modelOptions,
	imageRatios,
	imageResolutions,
	openDropdown,
	floating = false,
	onPromptChange,
	onToggleDropdown,
	onCloseDropdown,
	onSwitchModel,
	onUpdateImageOption,
	onUpdateTextOption,
	onUpdateAudioOption,
	onUpdateMusicOption,
	onUploadReferenceAsset,
	onSend,
}: ComposerProps) {
	const displayPrompt = promptPrefix ? `${promptPrefix}${composer.prompt}` : composer.prompt;
	const composerModelDisplayLabel = getModelDisplayLabel(composer.model);
	const showTextModeOptions = type === "text" && composerModelDisplayLabel.trim() === "GPT-5.5";
	const imageReferenceState = buildImageReferencePresentationState({
		type,
		composer,
		capability: imageModelCapability,
		referenceAssets,
		canAddReferenceAsset,
	});
	const imageReferenceCount = imageReferenceState.referenceCount;
	const imageOptionState = buildImageParameterOptionState({
		composer,
		capability: imageModelCapability,
		referenceCount: imageReferenceCount,
		fallbackAspectRatios: imageRatios,
		fallbackResolutions: imageResolutions,
	});
	const imageSummary = buildImageOptionsSummary(
		composer,
		imageModelCapability,
		imageReferenceCount,
		imageReferenceState.thinkingDisabled,
	);
	const usageLabel = getComposerUsageLabel(type, composer);
	const audioMusicParameterOptionState = buildAudioMusicParameterOptionState({
		composer,
		type,
	});
	const {
		musicStyleGroups,
		musicStylePresetOptions,
		musicStyleSummary,
	} = audioMusicParameterOptionState;
	const audioVoiceMode = composer.audioVoiceMode ?? "tts";
	const controlsReadonly = false;
	const [openPillDropdown, setOpenPillDropdown] = useState<string | null>(null);
	const imageReferenceSlotLabels = imageReferenceState.slotLabels;
	const imagePrimaryHints = imageReferenceState.primaryHints;
	const imageThinkingDisabled = imageReferenceState.thinkingDisabled;
	const imageSelectOptionSections = buildImageSelectOptionSections({
		composer,
		capability: imageModelCapability,
		optionState: imageOptionState,
		onUpdateImageOption,
	});
	const imageCustomDimensionSection = buildImageCustomDimensionSection({
		composer,
		capability: imageModelCapability,
		onUpdateImageOption,
	});
	const imageFormatAndControlSections = buildImageFormatAndControlSections({
		composer,
		optionState: imageOptionState,
		onUpdateImageOption,
	});
	const imageNumericSections = buildImageNumericSections({
		composer,
		capability: imageModelCapability,
		onUpdateImageOption,
	});
	const imageModeSections = buildImageModeSections({
		composer,
		capability: imageModelCapability,
		thinkingDisabled: imageThinkingDisabled,
		onUpdateImageOption,
	});

	function handleComposerPointerDown(event: React.PointerEvent<HTMLDivElement>) {
		stopComposerEvent(event);
		if (!openDropdown) return;
		if (
			isComposerInteractiveTarget(event.target, [
				".inline-menu",
				".image-options-panel",
				".composer-option-input",
			])
		) {
			return;
		}
		onCloseDropdown();
	}

	return (
		<div
			className={`composer composer--${type} ${floating ? "floating-composer composer--floating" : ""}`}
			onPointerDown={handleComposerPointerDown}
		>
			{((type === "image" || type === "editor") && imageReferenceSlotLabels.length) ||
			(type === "music" && composer.musicAction === "upload") ? (
				<>
					<ReferenceAssetSlots
					labels={type === "music" ? [REFERENCE_AUDIO_SLOT_PREFIX] : imageReferenceSlotLabels}
					referenceAssets={referenceAssets}
					canAddReferenceAsset={canAddReferenceAsset}
					titlePrefix={type === "music" ? REFERENCE_AUDIO_SLOT_PREFIX : REFERENCE_IMAGE_SLOT_PREFIX}
					onUploadReferenceAsset={onUploadReferenceAsset}
				/>
				{imagePrimaryHints.length > 0 ? (
					<div className="composer-inline-hints">
						{imagePrimaryHints.map((hint) => (
							<div key={hint} className="composer-inline-hint composer-inline-hint--warning">
								{hint}
							</div>
						))}
					</div>
				) : null}
				</>
			) : null}

			{type === "audio" && audioVoiceMode !== "tts" ? (
				<ComposerVoiceForm
					composer={composer}
					mode={audioVoiceMode}
					isSending={isSending}
					floating={floating}
					onUpdateAudioOption={onUpdateAudioOption}
					onSend={onSend}
				/>
			) : (
				<textarea
					className={`composer__input ${floating ? "composer__input--floating" : ""} composer__textarea`}
					value={displayPrompt}
					placeholder={composer.placeholder}
					onChange={(event) => {
						const nextValue =
							promptPrefix && event.target.value.startsWith(promptPrefix)
								? event.target.value.slice(promptPrefix.length)
								: event.target.value;
						onPromptChange(type, nextValue);
					}}
				/>
			)}

			<ComposerLocalStatus isSending={isSending} />

			<div className={`composer__footer ${floating ? "composer__footer--floating" : ""}`}>
				<div className="composer__actions composer__actions--left">
					<div className="model-switcher">
						<button
							type="button"
							className={`model-pill ${floating ? "model-pill--floating" : ""} ${controlsReadonly ? "model-pill--readonly" : ""}`}
							disabled={controlsReadonly}
							onClick={() => {
								if (!controlsReadonly) onToggleDropdown("model");
							}}
						>
							<span>{composerModelDisplayLabel}</span>
							{controlsReadonly ? null : <span className="model-pill__caret">{caret(openDropdown === "model")}</span>}
						</button>
						{!controlsReadonly && openDropdown === "model" ? (
							<div className="model-menu" onWheelCapture={stopComposerEvent} onPointerDown={stopComposerEvent}>
								{modelOptions.map((model) => (
									<button key={model} type="button" onClick={() => onSwitchModel(model)}>
										{model}
									</button>
								))}
							</div>
						) : null}
					</div>

					{showTextModeOptions && onUpdateTextOption ? (
					<div className="inline-dropdown image-inline-dropdown video-pills-split">
						<DropdownPill
							label={composer.textMode === "xhigh" ? "高级" : "标准"}
							options={[
								{ value: "standard", label: "标准" },
								{ value: "xhigh", label: "高级 xhigh" },
							]}
							currentValue={composer.textMode ?? "standard"}
							isActive={openPillDropdown === "textmode"}
							onSelect={(v) => { onUpdateTextOption("textMode", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "textmode" ? null : "textmode")}
						/>
					</div>
				) : null}

					{type === "image" ? (
				<div className="inline-dropdown image-inline-dropdown video-pills-split">
					{/* Split image parameters into individual dropdown pills */}
					{imageOptionState.imageVersionOptions.length > 1 ? (
						<DropdownPill
							label={findPanelOptionLabel(imageOptionState.imageVersionOptions, composer.version ?? "", composer.version ?? "")}
							options={imageOptionState.imageVersionOptions}
							currentValue={composer.version ?? ""}
							isActive={openPillDropdown === "imgver"}
							onSelect={(v) => { onUpdateImageOption("version", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "imgver" ? null : "imgver")}
						/>
					) : null}

					{imageOptionState.imageSpeedModeOptions.length > 1 ? (
						<DropdownPill
							label={formatImageSpeedModeMetric(composer.speedMode ?? "")}
							options={imageOptionState.imageSpeedModeOptions}
							currentValue={composer.speedMode ?? ""}
							isActive={openPillDropdown === "imgspeed"}
							onSelect={(v) => { onUpdateImageOption("speedMode", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "imgspeed" ? null : "imgspeed")}
						/>
					) : null}

					{imageOptionState.imageAspectRatioOptions.length > 1 ? (
						<DropdownPill
							label={findPanelOptionLabel(imageOptionState.imageAspectRatioOptions, composer.aspectRatio ?? "", composer.aspectRatio ?? "")}
							options={imageOptionState.imageAspectRatioOptions}
							currentValue={composer.aspectRatio ?? ""}
							isActive={openPillDropdown === "imgratio"}
							onSelect={(v) => { onUpdateImageOption("aspectRatio", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "imgratio" ? null : "imgratio")}
						/>
					) : null}

					{imageOptionState.imageResolutionOptions.length > 1 ? (
						<DropdownPill
							label={findPanelOptionLabel(imageOptionState.imageResolutionOptions, composer.resolution ?? "", composer.resolution ?? "")}
							options={imageOptionState.imageResolutionOptions}
							currentValue={composer.resolution ?? ""}
							isActive={openPillDropdown === "imgres"}
							onSelect={(v) => { onUpdateImageOption("resolution", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "imgres" ? null : "imgres")}
						/>
					) : null}

					{imageOptionState.imageQuantityOptions.length > 1 ? (
						<DropdownPill
							label={`${composer.quantity ?? "1"}张`}
							options={imageOptionState.imageQuantityOptions.map(o => ({ value: o.value, label: `${o.label}张` }))}
							currentValue={composer.quantity ?? "1"}
							isActive={openPillDropdown === "imgqty"}
							onSelect={(v) => { onUpdateImageOption("quantity", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "imgqty" ? null : "imgqty")}
						/>
					) : null}

					{imageOptionState.imageQualityOptions.length > 1 ? (
						<DropdownPill
							label={formatImageQualityMetric(composer.quality ?? "")}
							options={imageOptionState.imageQualityOptions.map(o => ({ value: o.value, label: formatImageQualityMetric(o.value) }))}
							currentValue={composer.quality ?? ""}
							isActive={openPillDropdown === "imgqual"}
							onSelect={(v) => { onUpdateImageOption("quality", v); setOpenPillDropdown(null); }}
							onToggle={() => setOpenPillDropdown(openPillDropdown === "imgqual" ? null : "imgqual")}
						/>
					) : null}

					{/* Advanced options dropdown */}
						<button
							type="button"
							className="composer-meta composer-meta--button composer-meta--image-options"
							onClick={() => onToggleDropdown("imageOptions")}
						>
							<span className="model-pill__caret">{caret(openDropdown === "imageOptions")}</span>
						</button>
						{openDropdown === "imageOptions" ? (
							<div className="image-options-panel" onPointerDown={stopComposerEvent} onWheelCapture={stopComposerEvent}>
							<ComposerImageOptionsPanel
								imageSummary={imageSummary}
								imagePrimaryHints={imagePrimaryHints}
								imageSelectOptionSections={imageSelectOptionSections}
								imageCustomDimensionSection={imageCustomDimensionSection}
								imageFormatAndControlSections={imageFormatAndControlSections}
								imageNumericSections={imageNumericSections}
								imageModeSections={imageModeSections}
							/>
							</div>
						) : null}
					</div>
				) : null}

					{type === "music" ? (
						<div className={`inline-dropdown music-style-inline-dropdown ${controlsReadonly ? "image-inline-dropdown--readonly" : ""}`}>
							<button
								type="button"
								className={`composer-meta composer-meta--button composer-meta--image-options composer-meta--music-style ${controlsReadonly ? "composer-meta--readonly" : ""}`}
								disabled={controlsReadonly}
								onClick={() => {
									if (!controlsReadonly) onToggleDropdown("musicStyleOptions");
								}}
							>
								<span className="composer-meta__label">音乐风格</span>
								<strong>{musicStyleSummary}</strong>
								{controlsReadonly ? null : <span className="model-pill__caret">{caret(openDropdown === "musicStyleOptions")}</span>}
							</button>
							{!controlsReadonly && openDropdown === "musicStyleOptions" ? (
								<div className="image-options-panel music-style-panel" onPointerDown={stopComposerEvent} onWheelCapture={stopComposerEvent}>
									<div className="image-options-panel__summary">
										<span className="image-options-panel__eyebrow">Suno Style of Music</span>
										<strong>{musicStyleSummary}</strong>
										<p>按 Suno Custom Mode 的 Styles 思路拆成主风格和子风格。</p>
									</div>
									<ImageOptionSectionList
										sections={[
											{
												label: "主风格",
												options: musicStyleGroups,
												currentValue: composer.musicStyleCategory ?? "",
												onSelect: (value) => {
													const nextPreset = getMusicStylePresets(composer.model, value)[0]?.value ?? "";
													onUpdateMusicOption?.("musicStyleCategory", value);
													if (nextPreset) onUpdateMusicOption?.("musicStylePreset", nextPreset);
												},
											},
											{
												label: "子风格",
												options: musicStylePresetOptions,
												currentValue: composer.musicStylePreset ?? "",
												onSelect: (value) => onUpdateMusicOption?.("musicStylePreset", value),
											},
										]}
									/>
								</div>
							) : null}
						</div>
					) : null}

					{type === "audio" || type === "music" ? (
					<div className="inline-dropdown image-inline-dropdown video-pills-split">
						{/* Audio tier pill */}
						{type === "audio" && audioMusicParameterOptionState.audioTierOptions.length > 1 ? (
							<DropdownPill
								label={audioMusicParameterOptionState.audioTierOptions.find(o => o.value === (composer.audioTier ?? ""))?.label ?? composer.audioTier ?? ""}
								options={audioMusicParameterOptionState.audioTierOptions}
								currentValue={composer.audioTier ?? ""}
								isActive={openPillDropdown === "audtier"}
								onSelect={(v) => { onUpdateAudioOption?.("audioTier", v); setOpenPillDropdown(null); }}
								onToggle={() => setOpenPillDropdown(openPillDropdown === "audtier" ? null : "audtier")}
							/>
						) : null}

						{/* Music action pill */}
						{type === "music" && audioMusicParameterOptionState.musicActionOptions.length > 1 ? (
							<DropdownPill
								label={audioMusicParameterOptionState.musicActionOptions.find(o => o.value === (composer.musicAction ?? ""))?.label ?? composer.musicAction ?? ""}
								options={audioMusicParameterOptionState.musicActionOptions}
								currentValue={composer.musicAction ?? ""}
								isActive={openPillDropdown === "musact"}
								onSelect={(v) => { onUpdateMusicOption?.("musicAction", v); setOpenPillDropdown(null); }}
								onToggle={() => setOpenPillDropdown(openPillDropdown === "musact" ? null : "musact")}
							/>
						) : null}

						{/* Music version pill */}
						{type === "music" && audioMusicParameterOptionState.musicVersionOptions.length > 1 ? (
							<DropdownPill
								label={audioMusicParameterOptionState.musicVersionOptions.find(o => o.value === (composer.musicVersion ?? ""))?.label ?? composer.musicVersion ?? ""}
								options={audioMusicParameterOptionState.musicVersionOptions}
								currentValue={composer.musicVersion ?? ""}
								isActive={openPillDropdown === "musver"}
								onSelect={(v) => { onUpdateMusicOption?.("musicVersion", v); setOpenPillDropdown(null); }}
								onToggle={() => setOpenPillDropdown(openPillDropdown === "musver" ? null : "musver")}
							/>
						) : null}

						{/* Music output format pill */}
						{type === "music" && audioMusicParameterOptionState.musicOutputFormatOptions.length > 1 ? (
							<DropdownPill
								label={audioMusicParameterOptionState.musicOutputFormatOptions.find(o => o.value === (composer.musicOutputFormat ?? ""))?.label ?? composer.musicOutputFormat ?? ""}
								options={audioMusicParameterOptionState.musicOutputFormatOptions}
								currentValue={composer.musicOutputFormat ?? ""}
								isActive={openPillDropdown === "musfmt"}
								onSelect={(v) => { onUpdateMusicOption?.("musicOutputFormat", v); setOpenPillDropdown(null); }}
								onToggle={() => setOpenPillDropdown(openPillDropdown === "musfmt" ? null : "musfmt")}
							/>
						) : null}

						{/* Music sample rate pill */}
						{type === "music" && audioMusicParameterOptionState.musicSampleRateOptions.length > 1 ? (
							<DropdownPill
								label={audioMusicParameterOptionState.musicSampleRateOptions.find(o => o.value === (composer.musicSampleRate ?? ""))?.label ?? composer.musicSampleRate ?? ""}
								options={audioMusicParameterOptionState.musicSampleRateOptions}
								currentValue={composer.musicSampleRate ?? ""}
								isActive={openPillDropdown === "mussr"}
								onSelect={(v) => { onUpdateMusicOption?.("musicSampleRate", v); setOpenPillDropdown(null); }}
								onToggle={() => setOpenPillDropdown(openPillDropdown === "mussr" ? null : "mussr")}
							/>
						) : null}

						{/* Music bitrate pill */}
						{type === "music" && audioMusicParameterOptionState.musicBitrateOptions.length > 1 ? (
							<DropdownPill
								label={audioMusicParameterOptionState.musicBitrateOptions.find(o => o.value === (composer.musicBitrate ?? ""))?.label ?? composer.musicBitrate ?? ""}
								options={audioMusicParameterOptionState.musicBitrateOptions}
								currentValue={composer.musicBitrate ?? ""}
								isActive={openPillDropdown === "musbr"}
								onSelect={(v) => { onUpdateMusicOption?.("musicBitrate", v); setOpenPillDropdown(null); }}
								onToggle={() => setOpenPillDropdown(openPillDropdown === "musbr" ? null : "musbr")}
							/>
						) : null}

						{/* Music audio format pill */}
						{type === "music" && audioMusicParameterOptionState.musicAudioFormatOptions.length > 1 ? (
							<DropdownPill
								label={audioMusicParameterOptionState.musicAudioFormatOptions.find(o => o.value === (composer.musicAudioFormat ?? ""))?.label ?? composer.musicAudioFormat ?? ""}
								options={audioMusicParameterOptionState.musicAudioFormatOptions}
								currentValue={composer.musicAudioFormat ?? ""}
								isActive={openPillDropdown === "musaf"}
								onSelect={(v) => { onUpdateMusicOption?.("musicAudioFormat", v); setOpenPillDropdown(null); }}
								onToggle={() => setOpenPillDropdown(openPillDropdown === "musaf" ? null : "musaf")}
							/>
						) : null}

						{/* Advanced options dropdown */}
						<button
							type="button"
							className="composer-meta composer-meta--button composer-meta--image-options"
							onClick={() => onToggleDropdown("audioMusicOptions")}
						>
							<span className="model-pill__caret">{caret(openDropdown === "audioMusicOptions")}</span>
						</button>
						{openDropdown === "audioMusicOptions" ? (
							<div className="image-options-panel" onPointerDown={stopComposerEvent} onWheelCapture={stopComposerEvent}>
								<AudioMusicOptionsPanel
									type={type}
									composer={composer}
									optionState={audioMusicParameterOptionState}
									onUpdateAudioOption={onUpdateAudioOption}
									onUpdateMusicOption={onUpdateMusicOption}
								/>
							</div>
						) : null}
					</div>
				) : null}

					{type === "music"
						? composer.meta.map((item) => (
								<span key={item} className="composer-meta">
									{item}
								</span>
							))
						: null}
				</div>

				<div className={`composer__actions composer__actions--right ${floating ? "composer__actions--floating" : ""}`}>
					{type === "audio" || type === "music" ? null : (styleControl ?? <span className="composer-meta composer-meta--readonly">风格</span>)}
					<div className="credit-pill">{usageLabel}</div>
					<ComposerSendButton isSending={isSending} onSend={onSend} />
				</div>
			</div>
		</div>
	);
}

type EmptyComposerProps = {
	composer: ComposerPreset;
	type: NodeType;
	onPromptChange: (type: NodeType, prompt: string) => void;
};

export function EmptyComposer({ composer, type, onPromptChange }: EmptyComposerProps) {
	return (
		<div className="composer composer--empty" onPointerDown={stopComposerEvent}>
			<textarea
				className="composer__input composer__textarea"
				value={composer.prompt}
				placeholder={composer.placeholder}
				onChange={(event) => onPromptChange(type, event.target.value)}
			/>
		</div>
	);
}
