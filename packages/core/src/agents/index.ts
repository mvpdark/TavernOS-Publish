// packages/core/src/agents/index.ts
// Multi-agent pipeline exports (factory/compose pattern)

export {
  createAgentRuntime,
  type AgentContext,
  type AgentChatOptions,
  type AgentRuntime,
} from "./base.js";
export { createOutlinePlanner, type OutlinePlanner, type ArchitectOutput } from "./architect.js";
export { createScribe, type Scribe, type ScribeInput, type ScribeOutput } from "./scribe.js";
export {
  createSentinel,
  type Sentinel,
  type SentinelInput,
  type SentinelIssue,
  type SentinelOutput,
  type SentinelOptions,
  styleIssueToSentinelIssue,
} from "./sentinel.js";
export {
  createPolisher,
  type Polisher,
  type PolisherOutput,
  type PolishedParagraph,
  splitIntoParagraphs,
  locateParagraph,
} from "./polisher.js";
export {
  createFactExtractor,
  type FactExtractor,
  type FactExtractorInput,
  type FactExtractorResult,
  type ExtractedFact,
} from "./fact-extractor.js";
export {
  createChapterAnalyzer,
  type ChapterAnalyzer,
  type ChapterAnalyzerInput,
  type ChapterAnalysisResult,
} from "./chapter-analyzer.js";
export {
  createConductor,
  type Conductor,
  type ConductorInput,
  type ConductedContext,
  findStaleThreads,
  formatPlotThreads,
  STALE_THREAD_THRESHOLD,
} from "./conductor.js";
export {
  createAssetExtractor,
  type AssetExtractor,
  type AssetExtractorInput,
} from "./asset-extractor.js";
export {
  createVideoReviewer,
  type VideoReviewer,
  type VideoReviewResult,
  type VideoReviewIssue,
  type VideoVerdict,
  type VideoGrade,
  VIDEO_REVIEW_DIMENSIONS,
} from "./video-reviewer.js";
export {
  createStoryboardAgent,
  type StoryboardAgent,
  type ShotReviewResult,
  type ShotReviewIssue,
  type StoryboardScript,
  type StoryboardScene,
  type Shot,
  type ShotList,
  type StoryboardAssetCatalog,
  ShotSchema,
  ShotListSchema,
  ShotAspectRatioSchema,
} from "./storyboard.js";
export {
  parseJsonObject,
  parseJsonArray,
  parseAndValidate,
  parseAndValidateArray,
  extractPromptMessages,
  parseSections,
} from "./json-utils.js";
