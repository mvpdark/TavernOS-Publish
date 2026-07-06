import { z } from "zod";

// ---------------------------------------------------------------------------
// LLM Configuration
// ---------------------------------------------------------------------------

export const LLMProviderSchema = z.enum(["openai", "anthropic", "custom"]);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

export const LLMServiceEntrySchema = z.object({
  service: z.string().min(1),
  name: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
  temperature: z.number().min(0).max(2).optional(),
  apiFormat: z.enum(["chat", "responses", "messages"]).optional(),
  stream: z.boolean().optional(),
});
export type LLMServiceEntry = z.infer<typeof LLMServiceEntrySchema>;

export const LLMConfigSchema = z.object({
  provider: LLMProviderSchema,
  service: z.string().default("custom"),
  configSource: z.enum(["env", "studio"]).default("env"),
  baseUrl: z.string().url(),
  apiKey: z.string().default(""),
  /** OAuth access token — used when authType is "oauth" (e.g., Grok SuperGrok). */
  oauthToken: z.string().optional(),
  model: z.string().min(1),
  proxyUrl: z.string().url().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  thinkingBudget: z.number().int().min(0).default(0),
  extra: z.record(z.unknown()).optional(),
  headers: z.record(z.string()).optional(),
  apiFormat: z.enum(["chat", "responses", "messages"]).default("chat"),
  stream: z.boolean().default(true),
  services: z.array(LLMServiceEntrySchema).optional(),
  defaultModel: z.string().min(1).optional(),
});
export type LLMConfig = z.infer<typeof LLMConfigSchema>;

// ---------------------------------------------------------------------------
// Agent Model Override
// ---------------------------------------------------------------------------

export const AgentLLMOverrideSchema = z.object({
  model: z.string().min(1),
  provider: LLMProviderSchema.optional(),
  baseUrl: z.string().url().optional(),
  apiKeyEnv: z.string().optional(),
  stream: z.boolean().optional(),
});
export type AgentLLMOverride = z.infer<typeof AgentLLMOverrideSchema>;

// ---------------------------------------------------------------------------
// Writing & Quality Config
// ---------------------------------------------------------------------------

export const WritingConfigSchema = z.object({
  reviewRetries: z.number().int().min(0).max(10).default(1),
  reviewMode: z.enum(["auto", "manual"]).default("auto"),
});
export type WritingConfig = z.infer<typeof WritingConfigSchema>;

export const FoundationConfigSchema = z.object({
  reviewRetries: z.number().int().min(0).max(10).default(2),
});
export type FoundationConfig = z.infer<typeof FoundationConfigSchema>;

export const QualityGatesSchema = z.object({
  maxAuditRetries: z.number().int().min(0).max(10).default(2),
  pauseAfterConsecutiveFailures: z.number().int().min(1).default(3),
  retryTemperatureStep: z.number().min(0).max(0.5).default(0.1),
});
export type QualityGates = z.infer<typeof QualityGatesSchema>;

// ---------------------------------------------------------------------------
// Detection Config (AI-tells detection)
// ---------------------------------------------------------------------------

export const DetectionConfigSchema = z.object({
  provider: z.enum(["gptzero", "originality", "custom"]).default("custom"),
  apiUrl: z.string().url(),
  apiKeyEnv: z.string().min(1),
  threshold: z.number().min(0).max(1).default(0.5),
  enabled: z.boolean().default(false),
  autoRewrite: z.boolean().default(false),
  maxRetries: z.number().int().min(1).max(10).default(3),
});
export type DetectionConfig = z.infer<typeof DetectionConfigSchema>;

// ---------------------------------------------------------------------------
// Notification Config
// ---------------------------------------------------------------------------

export const NotifyChannelSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("webhook"),
    url: z.string().url(),
    secret: z.string().optional(),
    events: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("telegram"),
    botToken: z.string().min(1),
    chatId: z.string().min(1),
  }),
]);
export type NotifyChannel = z.infer<typeof NotifyChannelSchema>;

// ---------------------------------------------------------------------------
// Project Blueprint (creation wizard data)
//
// Collected via the AI consultant chat on the Blueprint page. Drives the
// architect agent's story-bible generation so platform tone, golden-finger
// type, and pacing are baked into the premise/world/plot from the start.
// ---------------------------------------------------------------------------

/** Target publishing platform — each has distinct tone, pacing, word-count
 *  expectations, and signing thresholds (see PLATFORM_PRESETS). */
export const BlueprintPlatformSchema = z.enum([
  "fanqie", // 番茄小说 — short-attention, 10w-word debut, completion-rate driven
  "qidian", // 起点中文网 — long-tail paid, 3w-word signing, hardest前期
  "jjwxc",  // 晋江文学城 — female-frequency ceiling, hardest signing
  "feilu",  // 飞卢 — same-universe/快爽文, 12w-word 上架, daily 10k
  "qimao",  // 七猫 — 全勤保底, 都市/重生/赘婿
  "other",  // 其他/未定
]);
export type BlueprintPlatform = z.infer<typeof BlueprintPlatformSchema>;

export const BlueprintSchema = z.object({
  /** Target publishing platform. */
  platform: BlueprintPlatformSchema.default("other"),
  /** Channel: male-frequency (男频) or female-frequency (女频). */
  channel: z.enum(["male", "female", ""]).default(""),
  /** Genre, e.g. 玄幻 / 都市 / 科幻 / 言情. */
  genre: z.string().default(""),
  /** A successful novel to benchmark against (对标作品). */
  referenceBook: z.string().default(""),
  /** Golden-finger / cheat type, e.g. 系统流 / 重生 / 穿越 / 签到 / 模拟器. */
  goldenFinger: z.string().default(""),
  /** Core selling point / 爽点 — the single biggest draw. */
  sellingPoint: z.string().default(""),
  /** Protagonist setup: identity, personality, goal. */
  protagonist: z.string().default(""),
  /** World-building tone / baseline. */
  worldTone: z.string().default(""),
  /** Expected plot direction: opening, development, climax arc. */
  plotDirection: z.string().default(""),
  /** Target total word count (e.g. 1000000 for 100万字). */
  wordCount: z.number().int().min(0).default(0),
  /** Update cadence, e.g. 日更4000 / 日更万字. */
  updateFrequency: z.string().default(""),
  /** Wizard status: drafting (in progress) or confirmed (ready to generate). */
  status: z.enum(["drafting", "confirmed"]).default("drafting"),
});
export type Blueprint = z.infer<typeof BlueprintSchema>;

export const EMPTY_BLUEPRINT: Blueprint = BlueprintSchema.parse({});

// ---------------------------------------------------------------------------
// Project Config (top-level tavernos.json)
// ---------------------------------------------------------------------------

export const ProjectConfigSchema = z.object({
  name: z.string().min(1),
  version: z.literal("0.1.0"),
  language: z.enum(["zh", "en"]).default("zh"),
  /** Work type: long-form novel ("long") or short story ("short"). */
  type: z.enum(["long", "short"]).default("long"),
  /** Story genre (free-form, kept for backward compat with the Library modal). */
  genre: z.string().default(""),
  /** Creation-wizard blueprint collected via the AI consultant chat. */
  blueprint: BlueprintSchema.default(EMPTY_BLUEPRINT),
  llm: LLMConfigSchema,
  notify: z.array(NotifyChannelSchema).default([]),
  detection: DetectionConfigSchema.optional(),
  foundation: FoundationConfigSchema.default({ reviewRetries: 2 }),
  writing: WritingConfigSchema.default({ reviewRetries: 1, reviewMode: "auto" }),
  modelOverrides: z.record(z.string(), z.union([z.string(), AgentLLMOverrideSchema])).optional(),
});
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
