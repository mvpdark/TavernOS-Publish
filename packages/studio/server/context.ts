// ---------------------------------------------------------------------------
// Shared server context: constants, types, and helper functions used across
// all route modules. Extracting these into a single module avoids circular
// dependencies and keeps route files focused on HTTP handling.
// ---------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import {
  createLLMClient,
  createImageGenClient,
  createTTSClient,
  createVideoGenClient,
  createWebDAVClient,
  createMusicClient,
  createLocalStorageClient,
  WebDAVStorageAdapter,
  providerRegistry,
  musicProviderRegistry,
  ImageGenConfigSchema,
  TTSConfigSchema,
  VideoGenConfigSchema,
  WebDAVConfigSchema,
  PlusConfigSchema,
  MusicGenConfigSchema,
  PersonaCardV2Schema,
  PersonaCardV3Schema,
  StorageModeSchema,
  LocalStorageConfigSchema,
  createEmbedder,
  type LLMConfig,
  type LLMClient,
  type AgentContext,
  type ImageGenConfig,
  type ImageGenClient,
  type TTSConfig,
  type TTSClient,
  type VideoGenConfig,
  type VideoGenClient,
  type WebDAVConfig,
  type PlusConfig,
  type MusicGenConfig,
  type SunoMusicClient,
  type PersonaCard,
  type Embedder,
  type EmbedderConfig,
  type StorageMode,
  type LocalStorageConfig,
  type StorageClient,
  encryptSecret,
  decryptSecret,
  encryptSecretFields,
  decryptSecretFields,
} from "@tavernos/core";
import type { SSEStreamingApi } from "hono/streaming";

// Re-export types used by route modules
export type { ImageGenConfig, TTSConfig, VideoGenConfig, WebDAVConfig, PlusConfig, EmbedderConfig, StorageMode, LocalStorageConfig, StorageClient } from "@tavernos/core";

// ---------------------------------------------------------------------------
// Appearance configuration (UI theme)
// ---------------------------------------------------------------------------

export type ThemeMode = "light" | "dark" | "auto";

export interface AppearanceConfig {
  mode: ThemeMode;
  preset: string;
  primaryColor: string;
  backgroundImage: string;
  customCss: string;
  fontSize: number;
  bubbleRadius: number;
}

// ---------------------------------------------------------------------------
// Per-provider credentials
// ---------------------------------------------------------------------------

/**
 * Stored credentials for a single provider. Most providers use `apiKey`;
 * OAuth providers (e.g. Grok) use `oauthToken` + `refreshToken`. All are
 * optional so a provider can hold whichever it needs.
 */
export interface ProviderCredential {
  apiKey?: string;
  oauthToken?: string;
  /** OAuth refresh token for automatic renewal (Grok). */
  refreshToken?: string;
  /** Access-token expiry as a unix timestamp in ms. */
  expiresAt?: number;
}

/** Map of service-id → stored credentials, so every provider can be logged
 *  in simultaneously rather than sharing one global key. */
export type ProviderCredentials = Record<string, ProviderCredential>;

// ---------------------------------------------------------------------------
// Data directory & file paths
// ---------------------------------------------------------------------------

export const DATA_DIR =
  process.env["TAVERNOS_DATA_DIR"] ?? join(homedir(), ".tavernos", "projects");
export const SETTINGS_FILE = join(homedir(), ".tavernos", "settings.json");

// ---------------------------------------------------------------------------
// Settings type
// ---------------------------------------------------------------------------

export interface AppSettings {
  service: string;
  model: string;
  apiKey: string;
  /** OAuth access token for OAuth-type providers (e.g., Grok SuperGrok). */
  oauthToken?: string;
  temperature: number;
  stream: boolean;
  baseUrl?: string;
  /** Optional image generation configuration. */
  imageConfig?: Partial<ImageGenConfig>;
  /** Optional TTS (text-to-speech) configuration. */
  ttsConfig?: Partial<TTSConfig>;
  /** Optional video generation configuration. */
  videoConfig?: Partial<VideoGenConfig>;
  /** Optional music generation configuration (Suno via yunwu). */
  musicConfig?: Partial<MusicGenConfig>;
  /** Optional appearance / UI theme configuration. */
  appearanceConfig?: AppearanceConfig;
  /** Per-agent model overrides for the writing pipeline. Keys are agent names. */
  agentModels?: Record<string, string>;
  /** Per-provider stored credentials, enabling multiple simultaneous logins. */
  providerCredentials?: ProviderCredentials;
  /** Optional WebDAV configuration for the Plus module asset upload. */
  webdavConfig?: Partial<WebDAVConfig>;
  /** Storage mode: "webdav" (remote) or "local" (filesystem). Defaults to "webdav". */
  storageMode?: StorageMode;
  /** Local storage configuration (used when storageMode === "local"). */
  localStorageConfig?: Partial<LocalStorageConfig>;
  /** Optional Plus module configuration (scheduled character generation). */
  plusConfig?: Partial<PlusConfig>;
  /** Optional embedder config for RAG vector retrieval (Phase B).
   *  Defaults to an OpenAI-compatible embedder using the main apiKey/baseUrl. */
  embedderConfig?: EmbedderConfig;
  /** Dynamically-fetched model lists per provider (from the provider's
   *  /models API endpoint using the user's own API key). When present,
   *  these override the hardcoded models in provider-bank.ts. */
  liveModels?: Record<string, Array<{ id: string; name?: string; contextWindow?: number }>>;
  /** Categorized live-fetched models for non-chat modalities.
   *  Keyed by providerId, each containing models of that category. */
  liveImageModels?: Record<string, Array<{ id: string; name?: string }>>;
  liveVideoModels?: Record<string, Array<{ id: string; name?: string }>>;
  liveTTSModels?: Record<string, Array<{ id: string; name?: string }>>;
}

// ---------------------------------------------------------------------------
// File-system helpers
// ---------------------------------------------------------------------------

/** Recursively create a directory if it does not exist. */
export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** Read and parse a JSON file, returning null on any I/O or parse error.
 *  When the file exists but contains invalid JSON, a backup copy is saved
 *  with a `.corrupt` suffix so the user can recover data manually. */
export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (err) {
    // If the file exists but JSON parsing failed, back up the corrupt file
    // so data isn't silently lost. Only attempt this for ENOENT-free errors.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      try {
        const backupPath = filePath + ".corrupt." + Date.now();
        await fs.copyFile(filePath, backupPath);
        console.warn(`[readJson] Corrupt JSON detected, backed up to ${backupPath}`);
      } catch {
        // Best-effort backup — ignore if it fails (e.g. file already gone)
      }
    }
    return null;
  }
}

/** Serialize data as pretty-printed JSON and write it to disk atomically.
 *  Writes to a temporary file first, then renames — prevents partial writes
 *  from corrupting the file if the process crashes mid-write. */
export async function writeJson(
  filePath: string,
  data: unknown,
): Promise<void> {
  const tmp = filePath + ".tmp";
  await ensureDir(dirname(filePath));
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  try {
    await fs.rename(tmp, filePath);
  } catch (err) {
    await fs.unlink(tmp).catch(() => {});
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Path-traversal guards
//
// User-controlled path segments (projectId, chapterId, filename, sessionId,
// characterFilename, …) are interpolated into filesystem paths via join().
// Without validation a malicious request could supply ".." or "/" to escape
// the data directory. These helpers reject any segment containing traversal
// sequences, separators, or absolute-path prefixes, throwing a ValidationError
// that the global error handler turns into a 400 response.
// ---------------------------------------------------------------------------

/**
 * Custom error class for user-input validation failures (e.g. invalid path
 * segments). The global onError handler checks for this type and returns a
 * 400 Bad Request instead of the default 500.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validate a project-id path segment. Rejects path-traversal attempts
 * ("..", "/", "\") and absolute-path prefixes (POSIX "/" or Windows drive
 * letters like "C:"). Returns the id unchanged when safe; throws otherwise.
 */
export function safeProjectId(id: string): string {
  if (
    !id ||
    id.includes("..") ||
    id.includes("/") ||
    id.includes("\\") ||
    /^(?:\/|[a-zA-Z]:)/.test(id)
  ) {
    throw new ValidationError("Invalid projectId");
  }
  return id;
}

/**
 * Validate a single filename path segment (chapterId, filename, sessionId,
 * characterFilename, …). Same traversal / absolute-path rules as
 * safeProjectId. Returns the name unchanged when safe; throws otherwise.
 */
export function safeFilename(name: string): string {
  if (
    !name ||
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\") ||
    /^(?:\/|[a-zA-Z]:)/.test(name)
  ) {
    throw new ValidationError("Invalid filename");
  }
  return name;
}

/**
 * Read a persona card from disk and validate it via Zod schemas.
 * Tries V3 first, then V2, then falls back to raw data for backward
 * compatibility with legacy or partially-valid cards.
 */
export async function readValidatedCard(
  filePath: string,
): Promise<PersonaCard | null> {
  const raw = await readJson<unknown>(filePath);
  if (raw === null) return null;
  const v3 = PersonaCardV3Schema.safeParse(raw);
  if (v3.success) return v3.data;
  const v2 = PersonaCardV2Schema.safeParse(raw);
  if (v2.success) return v2.data;
  // Fall back to raw data for backward compatibility
  return raw as PersonaCard;
}

// ---------------------------------------------------------------------------
// Character card & project-config helpers
//
// Shared utilities extracted from route modules (blueprint.ts, create.ts,
// create-helpers.ts) to avoid duplicated templates and parsing logic:
//   - buildCharacterCard: standard chara_card_v2 factory
//   - readProjectConfig: read a project's tavernos.json
//   - extractQuickReplies: parse <<<QUICK_REPLIES>>>...<<<QREND>>> blocks
// ---------------------------------------------------------------------------

/** Options for buildCharacterCard. Only `name` is required; every other
 *  field defaults to an empty string / array to match PersonaCardV2Schema. */
export interface CharacterCardOptions {
  name: string;
  description?: string;
  personality?: string;
  scenario?: string;
  firstMes?: string;
  mesExample?: string;
  creatorNotes?: string;
  tags?: string[];
  extensions?: Record<string, unknown>;
}

/**
 * Build a V2 character card object conforming to PersonaCardV2Schema.
 * Returns the standard chara_card_v2 structure with TavernOS defaults so
 * callers only supply the fields they actually have.
 *
 * Note: `character_book` is intentionally omitted. The schema declares it as
 * `z.object(...).optional()`, which accepts an object or `undefined` but
 * rejects `null` — emitting `null` would make `PersonaCardV2Schema.parse`
 * throw and silently break every auto-generated character card. Callers that
 * need a character book should attach one after building.
 */
export function buildCharacterCard(options: CharacterCardOptions): PersonaCard {
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: options.name,
      description: options.description ?? "",
      personality: options.personality ?? "",
      scenario: options.scenario ?? "",
      first_mes: options.firstMes ?? "",
      mes_example: options.mesExample ?? "",
      creator_notes: options.creatorNotes ?? "",
      system_prompt: "",
      post_history_instructions: "",
      alternate_greetings: [],
      tags: options.tags ?? [],
      creator: "TavernOS",
      character_version: "1.0",
      extensions: options.extensions ?? {},
    },
  };
}

/**
 * Shape of a project's tavernos.json config file.
 * Fields are all optional since projects may have partial configs.
 */
export interface ProjectConfig {
  title?: string;
  description?: string;
  genre?: string;
  style?: string;
  chapterCount?: number;
  targetWords?: number;
  model?: string;
  service?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Read a project's tavernos.json config file. Returns the parsed JSON or null
 * when the file is missing. Delegates to readJson so a corrupt file is backed
 * up with a `.corrupt.*` suffix rather than silently swallowed.
 */
export async function readProjectConfig(projectRoot: string): Promise<ProjectConfig | null> {
  return readJson<ProjectConfig>(join(projectRoot, "tavernos.json"));
}

/**
 * Extract quick-reply options from a text block delimited by
 * <<<QUICK_REPLIES>>> and <<<QREND>>>. The block content is normally a JSON
 * array of strings (e.g. ["选项A","选项B"]); non-JSON content falls back to
 * newline-splitting. Entries are trimmed, empties dropped, capped at 8.
 * Returns [] when no valid block is present.
 */
export function extractQuickReplies(text: string): string[] {
  const match = text.match(/<<<QUICK_REPLIES>>>([\s\S]*?)<<<QREND>>>/);
  if (!match) return [];
  const raw = match[1].trim();
  // Preferred format: JSON array of strings.
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((s) => String(s).trim())
        .filter((s) => s)
        .slice(0, 8);
    }
  } catch {
    // Not JSON — fall back to line-based splitting below.
  }
  // Fallback: newline-separated plain-text options.
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s)
    .slice(0, 8);
}

// ---------------------------------------------------------------------------
// Process-internal locks (mutexes)
//
// Two flavors:
//   1. withFileLock(path, fn)   — serializes a critical section per file path.
//     Used to protect read-modify-write cycles on shared JSON files
//     (asset-catalog.json, story-state.json) so concurrent requests can't
//     lose updates by interleaving reads and writes.
//   2. withSettingsLock(fn)     — a dedicated mutex for settings.json. The
//     public loadSettings / writeSettingsAtomic each acquire it, serializing
//     all settings I/O. For a true atomic read-modify-write, call
//     withSettingsLock and use the unlocked helpers it provides.
// ---------------------------------------------------------------------------

/** No-op used to keep a promise chain alive regardless of settlement. */
function noop(): void {}

const fileLocks = new Map<string, Promise<unknown>>();

/**
 * Serialize a critical section keyed by file path. Concurrent calls with the
 * same path run strictly one-after-another (in arrival order); the returned
 * promise resolves/rejects with `fn`'s result.
 *
 * NOTE: This lock is NON-REENTRANT. The callback `fn` must not call
 * withFileLock on the same filePath — doing so would self-deadlock because
 * the inner call waits for the outer lock to release, which cannot happen
 * until `fn` returns. Concurrent calls from independent async contexts are
 * safely serialized via the promise chain below: each caller awaits the
 * previous section's completion (success or failure) before running.
 */
export function withFileLock<T>(
  filePath: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = fileLocks.get(filePath) ?? Promise.resolve();
  // Run fn whether the previous section resolved or rejected.
  const next = prev.then(fn, fn);
  // Keep the chain alive even if fn rejects, so later waiters still proceed.
  fileLocks.set(filePath, next.then(noop, noop));
  return next;
}

// Settings mutex: a single promise chain serializing all settings file access.
let settingsChain: Promise<unknown> = Promise.resolve();

/** Acquire the settings mutex for the duration of `fn` (non-reentrant). */
function runSettingsLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = settingsChain.then(fn, fn);
  settingsChain = next.then(noop, noop);
  return next;
}

/** Unlocked helpers handed to a withSettingsLock callback. Calling the public
 *  loadSettings / writeSettingsAtomic inside the callback would deadlock. */
export interface SettingsLock {
  load(): Promise<AppSettings>;
  write(settings: AppSettings): Promise<void>;
}

/**
 * Run a read-modify-write critical section on settings atomically. The
 * callback receives unlocked load/write helpers; the settings mutex is held
 * for the whole duration so no other settings read or write can interleave.
 */
export function withSettingsLock<T>(
  fn: (lock: SettingsLock) => Promise<T>,
): Promise<T> {
  return runSettingsLock(() => fn({ load: readSettingsRaw, write: writeSettingsRaw }));
}

// ---------------------------------------------------------------------------
// Settings & LLM helpers
// ---------------------------------------------------------------------------

/** Load application settings from disk, applying defaults for missing fields.
 *  Serialized via the settings mutex. */
export async function loadSettings(): Promise<AppSettings> {
  return runSettingsLock(readSettingsRaw);
}

/** Unlocked settings read — only safe inside withSettingsLock. */
async function readSettingsRaw(): Promise<AppSettings> {
  const raw = await readJson<Partial<AppSettings>>(SETTINGS_FILE);
  // Decrypt sensitive fields (apiKey, oauthToken, providerCredentials, etc.)
  const decryptedApiKey = decryptSecret(raw?.apiKey);
  const decryptedProviderCredentials = raw?.providerCredentials
    ? decryptSecretFields(raw.providerCredentials)
    : undefined;
  return {
    service: raw?.service ?? "deepseek",
    model: raw?.model ?? "deepseek-chat",
    apiKey: decryptedApiKey,
    oauthToken: raw?.oauthToken ? decryptSecret(raw.oauthToken) : undefined,
    temperature: raw?.temperature ?? 0.7,
    stream: raw?.stream ?? true,
    baseUrl: raw?.baseUrl,
    imageConfig: raw?.imageConfig ? decryptSecretFields(raw.imageConfig) : undefined,
    ttsConfig: raw?.ttsConfig ? decryptSecretFields(raw.ttsConfig) : undefined,
    videoConfig: raw?.videoConfig ? decryptSecretFields(raw.videoConfig) : undefined,
    musicConfig: raw?.musicConfig ? decryptSecretFields(raw.musicConfig) : undefined,
    appearanceConfig: raw?.appearanceConfig,
    agentModels: raw?.agentModels,
    providerCredentials: decryptedProviderCredentials,
    webdavConfig: raw?.webdavConfig ? decryptSecretFields(raw.webdavConfig) : undefined,
    storageMode: raw?.storageMode,
    localStorageConfig: raw?.localStorageConfig,
    plusConfig: raw?.plusConfig,
    embedderConfig: raw?.embedderConfig,
    liveModels: raw?.liveModels ?? {},
    liveImageModels: raw?.liveImageModels ?? {},
    liveVideoModels: raw?.liveVideoModels ?? {},
    liveTTSModels: raw?.liveTTSModels ?? {},
  };
}

/**
 * Atomically persist settings to disk. Writes to a temporary file first,
 * then renames it over the real file (fs.rename is atomic on POSIX and on
 * Windows when both paths are on the same volume). This avoids the race
 * condition where a concurrent reader could observe a half-written file.
 * Serialized via the settings mutex.
 */
export async function writeSettingsAtomic(settings: AppSettings): Promise<void> {
  return runSettingsLock(() => writeSettingsRaw(settings));
}

/** Unlocked settings write — only safe inside withSettingsLock. */
async function writeSettingsRaw(settings: AppSettings): Promise<void> {
  // Encrypt sensitive fields before writing to disk.  The encrypted object
  // is typed as Record<string, unknown> because encrypted fields are no
  // longer strings — they are EncryptedBlob objects ({__enc, v, i, t}).
  const encrypted: Record<string, unknown> = {
    ...settings,
    apiKey: encryptSecret(settings.apiKey),
    oauthToken: settings.oauthToken ? encryptSecret(settings.oauthToken) : undefined,
    imageConfig: settings.imageConfig ? encryptSecretFields(settings.imageConfig) : undefined,
    ttsConfig: settings.ttsConfig ? encryptSecretFields(settings.ttsConfig) : undefined,
    videoConfig: settings.videoConfig ? encryptSecretFields(settings.videoConfig) : undefined,
    musicConfig: settings.musicConfig ? encryptSecretFields(settings.musicConfig) : undefined,
    providerCredentials: settings.providerCredentials
      ? encryptSecretFields(settings.providerCredentials)
      : undefined,
    webdavConfig: settings.webdavConfig ? encryptSecretFields(settings.webdavConfig) : undefined,
  };
  const tmp = SETTINGS_FILE + ".tmp";
  await ensureDir(dirname(SETTINGS_FILE));
  await fs.writeFile(tmp, JSON.stringify(encrypted, null, 2), "utf8");
  try {
    await fs.rename(tmp, SETTINGS_FILE);
  } catch (err) {
    // rename failed — best-effort cleanup of the leftover temp file so it
    // does not linger on disk after a crash/error.
    await fs.unlink(tmp).catch(() => {});
    throw err;
  }
}

/**
 * Remove a leftover settings .tmp file from a previous run that crashed
 * between writing the temp file and renaming it. Safe to call at startup;
 * silently no-ops when no temp file exists.
 */
export async function cleanupStaleSettingsTmp(): Promise<void> {
  await fs.unlink(SETTINGS_FILE + ".tmp").catch(() => {});
}

/**
 * Remove leftover tombstone folders (.__trash_*) from project deletions whose
 * final async rm was blocked by a Windows file lock. Best-effort: any
 * still-locked tombstone is left for the next start.
 */
export async function cleanupTrashDirs(): Promise<void> {
  await ensureDir(DATA_DIR);
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((e) => e.isDirectory() && e.name.startsWith(".__trash_"))
      .map((e) =>
        fs.rm(join(DATA_DIR, e.name), { recursive: true, force: true }).catch(() => {}),
      ),
  );
}

/** Build an LLM client from persisted user settings. */
export async function createLLMFromSettings(): Promise<{ client: LLMClient; model: string }> {
  const settings = await loadSettings();
  const serviceConfig = providerRegistry.get(settings.service);
  // Resolve credentials: prefer the per-provider store, fall back to the
  // legacy global apiKey/oauthToken so existing setups keep working.
  const cred = settings.providerCredentials?.[settings.service];
  const apiKey = cred?.apiKey || settings.apiKey;
  let oauthToken = cred?.oauthToken || settings.oauthToken;

  // Proactively refresh an OAuth token that is about to expire (Grok).
  if (serviceConfig?.authType === "oauth" && cred?.refreshToken) {
    const refreshed = await maybeRefreshOAuthToken(settings.service, cred);
    if (refreshed) oauthToken = refreshed;
  }

  const config = {
    provider: serviceConfig?.provider ?? "openai",
    service: settings.service,
    configSource: "studio" as const,
    baseUrl: settings.baseUrl ?? serviceConfig?.baseUrl ?? "",
    apiKey,
    oauthToken,
    model: settings.model,
    temperature: settings.temperature,
    thinkingBudget: 0,
    apiFormat: serviceConfig?.apiFormat ?? ("chat" as const),
    stream: settings.stream,
  } as unknown as LLMConfig;
  return { client: createLLMClient(config), model: settings.model };
}

/**
 * Create an embedder for RAG vector retrieval from app settings.
 *
 * Resolution order:
 *  1. If `settings.embedderConfig` is present and type="stub" → StubEmbedder
 *     (offline, deterministic — useful when no embedding API is available).
 *  2. If `settings.embedderConfig` is present and type="openai" → OpenAIEmbedder
 *     using its apiKey/baseUrl, falling back to the main settings' apiKey/baseUrl.
 *  3. If no embedderConfig → default to OpenAI-compatible embedder using the
 *     main apiKey/baseUrl + text-embedding-3-small, so RAG works out-of-the-box
 *     with the user's existing yunwu/OpenAI provider config.
 *  4. If no apiKey is available at all → StubEmbedder (RAG still runs, just
 *     keyword-like rather than semantic).
 */
export function createEmbedderFromSettings(settings: AppSettings): Embedder {
  const cfg = settings.embedderConfig;
  // Explicit stub → always stub.
  if (cfg?.type === "stub") {
    return createEmbedder({ type: "stub", model: "stub", dimensions: cfg.dimensions ?? 64 });
  }
  // OpenAI-compatible (explicit config or default).
  const apiKey = cfg?.apiKey || settings.apiKey || "";
  const baseUrl = cfg?.baseUrl || settings.baseUrl || "";
  const model = cfg?.model || "text-embedding-3-small";
  const dimensions = cfg?.dimensions ?? 1536;
  if (!apiKey) {
    // No credentials — fall back to stub so RAG never hard-fails.
    return createEmbedder({ type: "stub", model: "stub", dimensions: 64 });
  }
  return createEmbedder({ type: "openai", model, dimensions, apiKey, baseUrl });
}

/**
 * Refresh an expired (or soon-to-expire) OAuth access token for a provider.
 * Returns the new access token on success, or null if no refresh was needed /
 * the refresh failed. Mutates the persisted settings on success.
 */
export async function maybeRefreshOAuthToken(
  serviceId: string,
  cred: ProviderCredential,
): Promise<string | null> {
  const serviceConfig = providerRegistry.get(serviceId);
  const oauth = serviceConfig?.oauth;
  if (!oauth?.tokenEndpoint || !cred.refreshToken) return null;
  // Only refresh when within 5 minutes of expiry (or already expired).
  // If oauthToken is falsy (undefined), skip the expiry check and proceed to
  // refresh immediately — returning null here would cause callers to lose the
  // token they expected.
  const now = Date.now();
  if (cred.oauthToken && cred.expiresAt && cred.expiresAt - now > 5 * 60 * 1000) {
    return cred.oauthToken;
  }
  try {
    const res = await fetch(oauth.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: cred.refreshToken,
        client_id: oauth.clientId ?? "b1a00492-073a-47ea-816f-4c329264a828",
      }).toString(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const tok = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!tok.access_token) return null;
    // Persist the refreshed credentials atomically (read-modify-write under
    // the settings mutex so a concurrent config write can't be clobbered).
    await withSettingsLock(async (lock) => {
      const settings = await lock.load();
      const creds = { ...(settings.providerCredentials ?? {}) };
      const prev = creds[serviceId] ?? {};
      creds[serviceId] = {
        ...prev,
        oauthToken: tok.access_token,
        refreshToken: tok.refresh_token ?? prev.refreshToken ?? cred.refreshToken,
        expiresAt: tok.expires_in ? now + tok.expires_in * 1000 : undefined,
      };
      await lock.write({ ...settings, providerCredentials: creds });
    });
    return tok.access_token;
  } catch (e) {
    console.warn(`[oauth] token refresh failed for ${serviceId}:`, e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Per-agent client resolution — enables multi-provider division of labor.
//
// agentModels entries may be either "service:model" (e.g. "moonshot:kimi-k2.5")
// or a bare model id (resolved to its owning service, falling back to the
// active service). This lets each agent run on a different provider, e.g.
// Kimi for the chapter skeleton and Claude for emotional fleshing-out.
// ---------------------------------------------------------------------------

/**
 * Build an LLM client for an arbitrary service using its stored credentials.
 * Used when an agent needs to run on a different provider than the active one.
 */
export async function createLLMClientForService(
  serviceId: string,
): Promise<{ client: LLMClient; model: string } | null> {
  const settings = await loadSettings();
  const serviceConfig = providerRegistry.get(serviceId);
  if (!serviceConfig) return null;
  const cred = settings.providerCredentials?.[serviceId];
  const apiKey = cred?.apiKey || settings.apiKey;
  let oauthToken = cred?.oauthToken || settings.oauthToken;
  // Refresh an expiring OAuth token (Grok) before building the client.
  if (serviceConfig.authType === "oauth" && cred?.refreshToken) {
    const refreshed = await maybeRefreshOAuthToken(serviceId, cred);
    if (refreshed) oauthToken = refreshed;
  }
  // Resolve the auth token via the registry (handles OAuth env vars).
  const authToken = serviceConfig.authType === "oauth"
    ? oauthToken || apiKey
    : apiKey;
  if (!authToken && !serviceConfig.apiKeyOptional) return null;
  // Use the first model from the service config as a placeholder.
  // The actual model is passed to client.chat() at call time by the
  // caller (resolveAgentModel passes modelId separately). We just need
  // a valid model id here so createLLMClient's model validation passes.
  const placeholderModel = serviceConfig.models[0]?.id ?? "";
  const config = {
    provider: serviceConfig.provider ?? "openai",
    service: serviceId,
    configSource: "studio" as const,
    baseUrl: serviceConfig.baseUrl,
    apiKey: authToken,
    oauthToken,
    model: placeholderModel,
    temperature: 0.7,
    thinkingBudget: 0,
    apiFormat: serviceConfig.apiFormat ?? ("chat" as const),
    stream: settings.stream,
  } as unknown as LLMConfig;
  return { client: createLLMClient(config), model: placeholderModel };
}

/**
 * Resolve an agent's model spec ("service:model" or bare model id) into a
 * concrete {client, model} pair. Returns null when the agent should fall back
 * to the default context (no override configured).
 */
export async function resolveAgentModel(
  spec: string | undefined,
): Promise<{ client: LLMClient; model: string; service: string } | null> {
  if (!spec) return null;
  const colonIdx = spec.indexOf(":");
  let serviceId: string;
  let modelId: string;
  if (colonIdx > 0) {
    serviceId = spec.slice(0, colonIdx);
    modelId = spec.slice(colonIdx + 1);
  } else {
    // Bare model id: find the service that owns it.
    modelId = spec;
    const svc = providerRegistry.findServiceForModel(modelId);
    if (!svc) return null;
    serviceId = svc.id;
  }
  const built = await createLLMClientForService(serviceId);
  if (!built) return null;
  return { client: built.client, model: modelId, service: serviceId };
}

/** Build an image generation client from persisted user settings. */
export async function createImageClientFromSettings(): Promise<ImageGenClient> {
  const settings = await loadSettings();
  const config = ImageGenConfigSchema.parse(settings.imageConfig ?? {});
  return createImageGenClient(config);
}

/** Build a TTS client from persisted user settings. */
export async function createTTSClientFromSettings(override?: Partial<TTSConfig>): Promise<TTSClient> {
  const settings = await loadSettings();
  const config = TTSConfigSchema.parse({ ...settings.ttsConfig, ...override });
  return createTTSClient(config);
}

/** Build a video generation client from persisted user settings. */
export async function createVideoClientFromSettings(): Promise<VideoGenClient> {
  const settings = await loadSettings();
  const config = VideoGenConfigSchema.parse(settings.videoConfig ?? {});
  return createVideoGenClient(config);
}

/**
 * Build a unified StorageClient from persisted user settings.
 * Returns a WebDAV-backed or Local-filesystem-backed client depending on storageMode.
 */
export async function createStorageClientFromSettings(): Promise<StorageClient> {
  const settings = await loadSettings();
  const mode = settings.storageMode ?? "webdav";

  if (mode === "local") {
    const config = LocalStorageConfigSchema.parse(settings.localStorageConfig ?? {});
    return createLocalStorageClient(config);
  }

  // Default: WebDAV
  const config = WebDAVConfigSchema.parse(settings.webdavConfig ?? {});
  const webdavClient = createWebDAVClient(config);
  return new WebDAVStorageAdapter(webdavClient, config);
}

/** Resolve the Plus config from persisted user settings with defaults applied. */
export async function loadPlusConfig(): Promise<PlusConfig> {
  const settings = await loadSettings();
  return PlusConfigSchema.parse(settings.plusConfig ?? {});
}

/** Build a music generation client from persisted user settings. */
export async function createMusicClientFromSettings(): Promise<SunoMusicClient> {
  const settings = await loadSettings();
  // 如果 musicConfig 没有配置 apiKey，尝试复用 yunwu 的 LLM apiKey
  const rawMusic = settings.musicConfig ?? {};
  const config = MusicGenConfigSchema.parse({
    ...rawMusic,
    apiKey: rawMusic.apiKey || settings.apiKey || "",
    baseUrl: rawMusic.baseUrl || (settings.service === "yunwu" ? settings.baseUrl : undefined) || "https://yunwu.ai",
  });
  return createMusicClient(config);
}

// ---------------------------------------------------------------------------
// Agent context builder — shared across pipeline/short/create routes.
//
// Encapsulates the 6-step agent context resolution: create the default LLM
// client, load agentModels from settings, resolve each spec, build the
// agentContexts Map + modelOverrides Record, fall back to bare model ids,
// and create the default AgentContext. Callers get a resolve/resolveOptional
// pair so they can pick the right context per agent without duplicating the
// wiring logic.
// ---------------------------------------------------------------------------

export interface AgentContextsResult {
  readonly defaultCtx: AgentContext;
  readonly agentContexts: ReadonlyMap<string, AgentContext>;
  readonly modelOverrides: Readonly<Record<string, string>>;
  /** Whether any per-agent model override was configured (or xMode forced). */
  readonly hasCustomModels: boolean;
  /** The project root path the contexts were built with. */
  readonly projectRoot: string;
  /** Resolve an agent's context: per-agent override > default. */
  resolve(agentName: string): AgentContext;
  /** Like resolve() but returns undefined when the agent has no override. */
  resolveOptional(agentName: string): AgentContext | undefined;
}

/**
 * Build the default AgentContext plus per-agent context overrides from
 * persisted settings (agentModels). Each agentModels entry may be a
 * "service:model" spec (e.g. "moonshot:kimi-k2.5") or a bare model id.
 * Specs that resolve successfully get a dedicated LLM client; bare model
 * ids that fail to resolve fall back to a model-only override on the shared
 * default client.
 */
export async function buildAgentContexts(
  projectRoot: string,
  bookId: string,
  xMode: boolean = false,
): Promise<AgentContextsResult> {
  // Step 1: default LLM client + model from the active provider.
  const { client, model } = await createLLMFromSettings();

  // Step 2: load per-agent model overrides from settings.
  const settings = await loadSettings();

  // X mode: override ALL agents to use Grok 4.3 (mirrors create-helpers).
  // This forces every pipeline agent onto a single high-capability model
  // regardless of the user's per-agent configuration.
  const GROK_SPEC = "grok:grok-4.3";
  const agentModels = xMode
    ? {
        writer: GROK_SPEC,
        writerSkeleton: GROK_SPEC,
        auditor: GROK_SPEC,
        reviser: GROK_SPEC,
        consolidator: GROK_SPEC,
        consultant: GROK_SPEC,
      }
    : (settings.agentModels ?? {});

  // Steps 3-5: resolve each spec into either a dedicated AgentContext or a
  // model-only override on the shared default client.
  const agentContexts = new Map<string, AgentContext>();
  const modelOverrides: Record<string, string> = {};
  for (const [agentName, spec] of Object.entries(agentModels)) {
    if (!spec) continue;
    const resolved = await resolveAgentModel(spec);
    if (resolved) {
      agentContexts.set(agentName, {
        client: resolved.client,
        model: resolved.model,
        projectRoot,
        bookId,
      });
    } else if (spec.indexOf(":") <= 0) {
      // Bare model id: use as a model-only override on the shared client.
      modelOverrides[agentName] = spec;
    }
    // "service:model" specs that failed to resolve are silently skipped;
    // the agent falls back to the default context.
  }

  // Step 6: create the default AgentContext.
  const defaultCtx: AgentContext = {
    client,
    model,
    projectRoot,
    bookId,
  };

  /** Resolve an agent's context: per-agent override > model-only override > default. */
  const resolve = (agentName: string): AgentContext => {
    const perAgent = agentContexts.get(agentName);
    if (perAgent) return perAgent;
    const override = modelOverrides[agentName];
    if (override) return { ...defaultCtx, model: override };
    return defaultCtx;
  };

  /** Like resolve() but returns undefined when the agent has no override. */
  const resolveOptional = (agentName: string): AgentContext | undefined => {
    return agentContexts.get(agentName);
  };

  const hasCustomModels =
    agentContexts.size > 0 || Object.keys(modelOverrides).length > 0;

  return { defaultCtx, agentContexts, modelOverrides, hasCustomModels, projectRoot, resolve, resolveOptional };
}

// ---------------------------------------------------------------------------
// SSE helper — eliminates duplicated stream boilerplate across route modules.
//
// Every SSE route (pipeline/short/create/blueprint) repeats the same ~15 lines:
// a streamClosed flag, an AbortController, an onAbort listener, and a
// best-effort send() that swallows write errors. createSSEHelper wraps that
// into a reusable object.
// ---------------------------------------------------------------------------

export interface SSEHelper {
  /** Send a JSON event to the client. No-op after stream is closed. */
  send: (data: unknown) => Promise<void>;
  /** Whether the client has disconnected. */
  readonly closed: boolean;
  /** AbortController linked to the stream lifecycle. */
  readonly signal: AbortSignal;
}

/**
 * Create an SSE helper that encapsulates the stream-closed flag, an
 * AbortController wired to stream.onAbort, and a best-effort send() that
 * swallows write errors (flipping the closed flag on failure).
 */
export function createSSEHelper(stream: SSEStreamingApi): SSEHelper {
  let streamClosed = false;
  const controller = new AbortController();
  stream.onAbort(() => {
    streamClosed = true;
    controller.abort();
  });

  const send = async (data: unknown): Promise<void> => {
    if (streamClosed) return;
    try {
      await stream.writeSSE({ data: JSON.stringify(data) });
    } catch {
      streamClosed = true;
    }
  };

  return {
    send,
    get closed() {
      return streamClosed;
    },
    get signal() {
      return controller.signal;
    },
  };
}
