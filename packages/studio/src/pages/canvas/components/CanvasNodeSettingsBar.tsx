import type {
	NodeType,
	ComposerPreset,
	NodeStyleRef,
	StyleLibraryState,
	CanvasNode,
} from "../canvas-types";
import { buildCanvasInspectorOptionState } from "../canvasInspectorOptionState";
import { countReferenceAssets } from "../referenceAssetUtils";
import {
	findPanelOptionLabel,
	formatNodeMetric,
	formatImageQualityMetric,
	formatImageAutoMetric,
	formatImageSpeedModeMetric,
} from "../parameterPanelPresentation";
import { getModelDisplayLabel } from "../modelOptions";

// --- Types ---

type PillConfig = {
	key: string;
	label: string;
	value: string;
	onClick: () => void;
};

export type CanvasNodeSettingsBarProps = {
	nodeId: string;
	nodeType: NodeType;
	composer: ComposerPreset | undefined;
	asset?: CanvasNode["asset"];
	style: NodeStyleRef | undefined;
	styleLibrary: StyleLibraryState;
	modelOptions: string[];
	onUpdateNodeOption: (
		nodeId: string,
		nodeType: NodeType,
		key: string,
		value: string,
	) => void;
	onCycleStyle: (nodeId: string, presetId: string) => void;
};

// --- Cycle helper ---
function cycleValue<T>(current: T, options: T[]): T {
	if (options.length <= 1) return current;
	const idx = options.indexOf(current);
	if (idx === -1) return options[0];
	return options[(idx + 1) % options.length];
}

// --- Build pills based on node type and dynamic option state ---
function buildPills(props: CanvasNodeSettingsBarProps): PillConfig[] {
	const {
		nodeId,
		nodeType,
		composer,
		asset,
		style,
		styleLibrary,
		modelOptions,
		onUpdateNodeOption,
	} = props;
	const pills: PillConfig[] = [];
	if (!composer) return pills;

	const isImageLikeNode = nodeType === "image" || nodeType === "editor";
	const isVideoNode = nodeType === "video";
	const isAudioNode = nodeType === "audio";
	const isMusicNode = nodeType === "music";

	// Build dynamic option state from model capabilities
	const referenceCount = countReferenceAssets(
		composer.referenceAssets ?? [],
	);
	const optionState = buildCanvasInspectorOptionState({
		composer,
		asset,
		referenceCount,
		isImageLikeNode,
		isVideoNode,
		isAudioNode,
		isMusicNode,
	});

	const updateOption = (key: string, value: string) => {
		onUpdateNodeOption(nodeId, nodeType, key, value);
	};

	// --- Model pill (all types except character/scene) ---
	if (
		nodeType !== "character" &&
		nodeType !== "scene" &&
		modelOptions.length > 0
	) {
		const currentModel =
			modelOptions.find((m) => m === composer.model) ?? modelOptions[0];
		pills.push({
			key: "model",
			label: "",
			value: getModelDisplayLabel(currentModel),
			onClick: () => {
				const next = cycleValue(currentModel, modelOptions);
				updateOption("model", next);
			},
		});
	}

	// --- Type-specific parameter pills ---
	switch (nodeType) {
		case "text": {
			// Mode pill (only for GPT-5.5)
			if (getModelDisplayLabel(composer.model).trim() === "GPT-5.5") {
				const textModes = ["standard", "xhigh"];
				const currentMode = composer.textMode ?? "standard";
				pills.push({
					key: "textMode",
					label: "",
					value: currentMode === "xhigh" ? "高级" : "标准",
					onClick: () => {
						const next = cycleValue(currentMode, textModes);
						updateOption("textMode", next);
					},
				});
			}
			break;
		}

		case "image":
		case "editor": {
			// Version (mode)
			if (optionState.imageVersionOptions.length > 0) {
				const currentVersion = composer.version ?? "";
				pills.push({
					key: "version",
					label: "",
					value: findPanelOptionLabel(
						optionState.imageVersionOptions,
						currentVersion,
						"默认",
					),
					onClick: () => {
						const opts = optionState.imageVersionOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentVersion, opts);
						updateOption("version", next);
					},
				});
			}
			// Speed mode
			if (optionState.imageSpeedModeOptions.length > 0) {
				const currentSpeed = composer.speedMode ?? "";
				pills.push({
					key: "speedMode",
					label: "",
					value: formatImageSpeedModeMetric(currentSpeed),
					onClick: () => {
						const opts = optionState.imageSpeedModeOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentSpeed, opts);
						updateOption("speedMode", next);
					},
				});
			}
			// Aspect ratio
			if (
				!optionState.isMidjourneyImageLayout &&
				optionState.imageAspectRatioOptions.length > 0
			) {
				const currentRatio = composer.aspectRatio ?? "";
				pills.push({
					key: "aspectRatio",
					label: "",
					value: formatImageAutoMetric(currentRatio),
					onClick: () => {
						const opts = optionState.imageAspectRatioOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentRatio, opts);
						updateOption("aspectRatio", next);
					},
				});
			}
			// Resolution
			if (optionState.imageResolutionOptions.length > 0) {
				const currentRes = composer.resolution ?? "";
				pills.push({
					key: "resolution",
					label: "",
					value: formatImageAutoMetric(currentRes),
					onClick: () => {
						const opts = optionState.imageResolutionOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentRes, opts);
						updateOption("resolution", next);
					},
				});
			}
			// Quantity
			if (optionState.imageQuantityOptions.length > 0) {
				const currentQty = composer.quantity ?? "";
				pills.push({
					key: "quantity",
					label: "",
					value: formatNodeMetric(currentQty),
					onClick: () => {
						const opts = optionState.imageQuantityOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentQty, opts);
						updateOption("quantity", next);
					},
				});
			}
			// Quality
			if (optionState.imageQualityOptions.length > 0) {
				const currentQuality = composer.quality ?? "";
				pills.push({
					key: "quality",
					label: "",
					value: formatImageQualityMetric(currentQuality),
					onClick: () => {
						const opts = optionState.imageQualityOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentQuality, opts);
						updateOption("quality", next);
					},
				});
			}
			break;
		}

		case "video": {
			// Mode (videoGenerationMode)
			if (optionState.videoMode) {
				const currentMode =
					composer.videoGenerationMode ??
					optionState.videoCapability?.defaultMode ??
					optionState.videoMode.id;
				pills.push({
					key: "videoMode",
					label: "",
					value: optionState.videoMode.label,
					onClick: () => {
						const opts = optionState.videoModeOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentMode, opts);
						updateOption("videoGenerationMode", next);
					},
				});
			}
			// Aspect ratio
			if (optionState.videoAspectRatioOptions.length > 0) {
				const currentRatio =
					composer.aspectRatio ??
					optionState.videoCapability?.defaultAspectRatio ??
					"";
				pills.push({
					key: "aspectRatio",
					label: "",
					value: findPanelOptionLabel(
						optionState.videoAspectRatioOptions,
						currentRatio,
						currentRatio,
					),
					onClick: () => {
						const opts = optionState.videoAspectRatioOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentRatio, opts);
						updateOption("aspectRatio", next);
					},
				});
			}
			// Resolution
			if (optionState.videoResolutionOptions.length > 0) {
				const currentRes =
					composer.resolution ??
					optionState.videoCapability?.defaultResolution ??
					"";
				pills.push({
					key: "resolution",
					label: "",
					value: findPanelOptionLabel(
						optionState.videoResolutionOptions,
						currentRes,
						currentRes,
					),
					onClick: () => {
						const opts = optionState.videoResolutionOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentRes, opts);
						updateOption("resolution", next);
					},
				});
			}
			// Duration
			if (optionState.videoDurationOptions.length > 0) {
				const currentDur =
					composer.duration ?? optionState.videoDurationValue ?? "";
				pills.push({
					key: "duration",
					label: "",
					value: findPanelOptionLabel(
						optionState.videoDurationOptions,
						currentDur,
						currentDur,
					),
					onClick: () => {
						const opts = optionState.videoDurationOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentDur, opts);
						updateOption("duration", next);
					},
				});
			}
			// Quality
			if (optionState.videoCapability?.qualities?.length) {
				const currentQuality =
					composer.videoQuality ??
					optionState.videoCapability?.defaultQuality ??
					"";
				pills.push({
					key: "videoQuality",
					label: "",
					value: findPanelOptionLabel(
						optionState.videoQualityOptions,
						currentQuality,
						currentQuality,
					),
					onClick: () => {
						const opts = optionState.videoQualityOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentQuality, opts);
						updateOption("videoQuality", next);
					},
				});
			}
			// Version
			if (optionState.videoCapability?.versions?.length) {
				const currentVersion =
					composer.videoVersion ??
					optionState.videoCapability?.defaultVersion ??
					"";
				pills.push({
					key: "videoVersion",
					label: "",
					value: findPanelOptionLabel(
						optionState.videoVersionOptions,
						currentVersion,
						currentVersion,
					),
					onClick: () => {
						const opts = optionState.videoVersionOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentVersion, opts);
						updateOption("videoVersion", next);
					},
				});
			}
			break;
		}

		case "audio": {
			// Tier (mode)
			if (optionState.audioTierOptions.length > 0) {
				const currentTier = composer.audioTier ?? "standard";
				pills.push({
					key: "audioTier",
					label: "",
					value: findPanelOptionLabel(
						optionState.audioTierOptions,
						currentTier,
						currentTier,
					),
					onClick: () => {
						const opts = optionState.audioTierOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentTier, opts);
						updateOption("audioTier", next);
					},
				});
			}
			break;
		}

		case "music": {
			// Action
			if (optionState.musicActionOptions.length > 0) {
				const currentAction = composer.musicAction ?? "generate";
				pills.push({
					key: "musicAction",
					label: "",
					value: findPanelOptionLabel(
						optionState.musicActionOptions,
						currentAction,
						currentAction,
					),
					onClick: () => {
						const opts = optionState.musicActionOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentAction, opts);
						updateOption("musicAction", next);
					},
				});
			}
			// Version
			if (optionState.musicVersionOptions.length > 0) {
				const currentVersion = composer.musicVersion ?? "";
				pills.push({
					key: "musicVersion",
					label: "",
					value: findPanelOptionLabel(
						optionState.musicVersionOptions,
						currentVersion,
						currentVersion,
					),
					onClick: () => {
						const opts = optionState.musicVersionOptions.map(
							(o) => o.value,
						);
						const next = cycleValue(currentVersion, opts);
						updateOption("musicVersion", next);
					},
				});
			}
			break;
		}

		case "shot":
		case "character":
		case "scene":
			break;
	}

	// --- Style pill (all media types with style presets) ---
	if (styleLibrary?.presets?.length > 0) {
		const presetIds = styleLibrary.presets.map((p) => p.id);
		const presetNames: Record<string, string> = {};
		styleLibrary.presets.forEach((p) => {
			presetNames[p.id] = p.name;
		});
		const currentStyleId = style?.presetId ?? presetIds[0];
		const currentStyleName = presetNames[currentStyleId] ?? "默认";
		pills.push({
			key: "style",
			label: "",
			value: currentStyleName,
			onClick: () => {
				const next = cycleValue(currentStyleId, presetIds);
				props.onCycleStyle(nodeId, next);
			},
		});
	}

	return pills;
}

// --- Component ---
export function CanvasNodeSettingsBar(props: CanvasNodeSettingsBarProps) {
	const pills = buildPills(props);
	if (pills.length === 0) return null;

	return (
		<div
			className="canvas-node__settings-bar"
			onClick={(e) => e.stopPropagation()}
		>
			{pills.map((pill) => (
				<button
					key={pill.key}
					type="button"
					className="canvas-node__settings-pill"
					onClick={(e) => {
						e.stopPropagation();
						pill.onClick();
					}}
					title={pill.value}
				>
					{pill.label ? (
						<span className="canvas-node__settings-pill-label">
							{pill.label}
						</span>
					) : null}
					<span className="canvas-node__settings-pill-value">
						{pill.value}
					</span>
				</button>
			))}
		</div>
	);
}
