// packages/core/src/pipeline/index.ts
export { StoryOrchestrator, type PipelineInput, type ChapterResult, stripChapterSummaries } from "./runner.js";

export {
  InjectionPolicy,
  type InjectionContext,
  type AssembledPrompt,
  type PromptSection,
} from "./injection-policy.js";

export {
  NarrativeEngine,
  type PreWriteParams,
  type PreWriteContext,
  type PostWriteParams,
  type PostWriteResult,
} from "./narrative-engine.js";
