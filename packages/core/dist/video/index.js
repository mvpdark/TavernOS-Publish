// Video generation module exports
export { VideoProviderSchema, VideoResolutionSchema, VideoAspectRatioSchema, VideoClipStatusSchema, VideoGenConfigSchema, VideoGenRequestSchema, VideoClipSchema, } from "./types.js";
export { VIDEO_PROVIDER_CONFIGS, VideoProviderRegistry, videoProviderRegistry, } from "./provider-registry.js";
export { isVideoStubEnabled, stubVideoGeneration } from "./stub.js";
export { VideoTaskPoller, parseTaskInfo, } from "./poller.js";
export { createVideoGenClient, extractVideoUrl, extractThumbnailUrl, extractDuration, extractTaskId, } from "./client.js";
// Jimeng direct connection (bypasses external Python service)
export { generateVideoViaJimengDirect, testJimengDirectConnection, } from "./jimeng-direct.js";
// Emotion-to-visual anchors (acting guidance for video generation)
export { detectEmotions, buildActingAnchors, getAnchors, EMOTION_LABELS, EMOTION_ANCHOR_MAP, } from "./emotion-anchors.js";
// Voice library (300+ voice profiles with dialect support + auto-matching)
export { matchVoice, ALL_VOICES, VOICE_CATEGORIES, buildAnchorSentence, } from "./voice-library.js";
// Prompt builder (assembles final video prompt from Shot: English visuals + Chinese acting + voice)
export { buildVideoPrompt, buildOmniPrompt, detectPromptLanguage, } from "./prompt-builder.js";
// Re-export video review types for pipeline convenience
export { VIDEO_REVIEW_DIMENSIONS, createVideoReviewer, } from "../agents/video-reviewer.js";
// EDL (Edit Decision List) module
export { TransitionTypeSchema, TransitionSchema, EDLClipSchema, EDLSchema, parseEDL, buildEDL, validateEDL, } from "./edl.js";
// Video composer (FFmpeg) module
export { VideoComposer, buildFilterGraph, parseFrameRate, DEFAULT_COMPOSE_CONFIG, } from "./composer.js";
// Frame-level quality checking (FFmpeg SSIM + auto-trim)
export { FrameQualityChecker, DEFAULT_FRAME_QUALITY_CONFIG, } from "./frame-quality.js";
// Smart transition selector (emotion → transition type)
export { EXTENDED_TRANSITION_TYPES, generateSmartTransitions, selectTransition, toXfadeFilter, toEDLTransition, DEFAULT_SMART_TRANSITION_CONFIG, } from "./smart-transitions.js";
// AutoCut intelligent editing engine (emotion curve → rhythm curve → edit plan)
export { generateAutoCutPlan, autocutPlanToEDL, DEFAULT_AUTOCUT_CONFIG, } from "./autocut.js";
// Audio rhythm analysis (Python librosa subprocess for beat detection)
export { AudioRhythmAnalyzer, DEFAULT_AUDIO_RHYTHM_CONFIG, } from "./audio-rhythm.js";
// Shot → VideoClip bridge (converts storyboard shots to video clips with assembled prompts)
export { shotsToClips, } from "./shots-to-clips.js";
// Video downloader (downloads remote CDN URLs to local files for FFmpeg)
export { VideoDownloader, DEFAULT_DOWNLOADER_CONFIG, } from "./video-downloader.js";
// Video pipeline orchestrator
export { VideoPipeline, } from "./pipeline.js";
// Named pipeline stages (9-stage agent architecture)
export { GenerationStage, DownloadStage, FrameCheckStage, ReviewStage, RerollStage, AutoCutStage, ComposeStage, LipSyncStage, OrchestrateStage, createPipelineStages, } from "./pipeline-stages.js";
export { DEFAULT_REVIEW_CONFIG, } from "./pipeline-types.js";
// JianYing (CapCut) draft file exporter
export { exportToJianyingDraft, exportToJianyingDraftFile, JianyingDraftExporter, } from "./jianying-exporter.js";
// Script parser (LLM-based 5万字 script auto-parsing: characters/scenes/props/beats)
export { ScriptParser, ParsedCharacterSchema, ParsedSceneSchema, ParsedPropSchema, ParsedSceneBeatSchema, ParsedScriptSchema, } from "./script-parser.js";
// Lip-sync module (multi-backend: Wav2Lip / SadTalker / MuseTalk / Seedance audio / Stub)
export { DEFAULT_LIPSYNC_CONFIGS, LipSyncManager, StubBackend, Wav2LipBackend, SadTalkerBackend, MuseTalkBackend, SeedanceAudioBackend, checkPythonEnv, checkModelFile, getVideoDuration, validateAudioFormat, } from "./lip-sync.js";
// Character asset library (character definitions, reference images, three-view, feature vectors)
export { CharacterLibrary, CharacterAssetSchema, CharacterReferenceImageSchema, CharacterReferenceImageTypeSchema, ThreeViewImagesSchema, CharacterAssetLibrarySchema, } from "./character-asset-library.js";
// Character consistency checker (feature-vector comparison + three-view/reference prompt generation)
export { CharacterConsistencyChecker, StubFaceEmbeddingProvider, DEFAULT_CONSISTENCY_CONFIG, } from "./character-consistency.js";
// Prompt template library (110+ curated templates across 12 short-drama categories)
export { PROMPT_CATEGORIES, PROMPT_TAGS, searchTemplates, getTemplateById, getTemplatesByCategory, getPopularTemplates, recommendTemplates, getRandomTemplates, getTemplateStats, } from "./prompt-templates.js";
// Prompt template enhancer (applies templates to generation prompts)
export { enhancePromptWithTemplate, getTemplateForShot, } from "./prompt-template-enhancer.js";
// Multi-model billing tracker (cost tracking per provider/model/operation)
export { BillingTracker, formatCost, getPricing, listAvailableModels, DEFAULT_PRICING_TABLE, DEFAULT_BILLING_CONFIG, BillingRecordSchema, ModelPricingSchema, CostSummarySchema, BillingConfigSchema, CurrencySchema, PricingTypeSchema, } from "./billing.js";
// Distribution manager (multi-platform publishing: Douyin/Kuaishou/Bilibili/etc.)
export { DistributionManager, DouyinPublisher, KuaishouPublisher, BilibiliPublisher, XiaohongshuPublisher, WeixinPublisher, YouTubePublisher, TikTokPublisher, BasePlatformPublisher, validateTitle, validateDescription, getPlatformName, getPlatformIcon, buildPlatformConfig, PLATFORM_LIMITS, PLATFORM_API_URLS, PLATFORM_NAMES, PLATFORM_ICONS, DEFAULT_DISTRIBUTION_CONFIG, } from "./distribution.js";
// Data flywheel (user-behavior telemetry → model recommendation engine)
export { DataFlywheel, DEFAULT_FLYWHEEL_CONFIG, BehaviorEventTypeSchema, BehaviorEventSchema, ModelPerformanceSchema, ModelRecommendationSchema, FlywheelConfigSchema, } from "./data-flywheel.js";
//# sourceMappingURL=index.js.map