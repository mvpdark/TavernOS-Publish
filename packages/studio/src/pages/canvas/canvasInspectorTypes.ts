export type CanvasInspectorMenuKey =
	| "model"
	| "style"
	| "imageVersion"
	| "imageMidjourneyAction"
	| "imageQuality"
	| "imageSpeedMode"
	| "imageSize"
	| "imageResolution"
	| "imageAspectRatio"
	| "imageOutputFormat"
	| "imageBackground"
	| "imageWatermark"
	| "imagePromptExtend"
	| "imageQuantity"
	| "textMode"
	| "videoMode"
	| "videoAspectRatio"
	| "videoResolution"
	| "videoDuration"
	| "videoQuality"
	| "videoVersion"
	| "voiceCatalog"
	| "audioTier"
	| "musicAction"
	| "musicVersion"
	| "musicStyleCategory"
	| "musicStylePreset"
	| "musicInstrumental"
	| "musicLyricsOptimizer"
	| "musicWatermark"
	| "shotSize"
	| "shotAngle"
	| "shotRatio";

export type CanvasInspectorShotOptions = {
	sizes: readonly string[];
	angles: readonly string[];
	ratios: readonly string[];
};
