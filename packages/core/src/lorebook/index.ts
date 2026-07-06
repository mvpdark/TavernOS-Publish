// Lorebook module exports

export {
  SelectiveLogicSchema,
  InsertionPositionSchema,
  MessageRoleSchema,
  LoreEntrySchema,
  LoreScanConfigSchema,
  ScanStateSchema,
  type SelectiveLogic,
  type InsertionPosition,
  type MessageRole,
  type LoreEntry,
  type LoreScanConfig,
  type ScanState,
  type LoreScanResult,
  type ActivationChainEntry,
} from "./types.js";

export {
  matchKeys,
  checkPrimaryKeys,
  checkSecondaryLogic,
  checkEntryMatch,
  type MatchOptions,
} from "./matcher.js";

export {
  LoreEngine,
  type ScanInput,
} from "./engine.js";
