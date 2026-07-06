// ---------------------------------------------------------------------------
// TTS route: text-to-speech config + speech synthesis endpoints.
//
// Endpoints:
//   GET  /api/tts/config                          — TTS config (apiKey masked) + providers
//   PUT  /api/tts/config                          — save TTS config
//   POST /api/projects/:id/tts/synthesize         — synthesize speech from text, returns audio binary
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import { join, dirname } from "node:path";
import { ttsProviderRegistry, TTSRequestSchema, providerRegistry, type CustomVoice } from "@tavernos/core";
import {
  type AppSettings,
  type TTSConfig,
  loadSettings,
  createTTSClientFromSettings,
  DATA_DIR,
  readValidatedCard,
  safeProjectId,
  safeFilename,
  withSettingsLock,
  readJson,
  SETTINGS_FILE,
} from "../context";

/** Path to the local custom-voices registry (same dir as settings.json). */
const CUSTOM_VOICES_FILE = join(dirname(SETTINGS_FILE), "custom-voices.json");

/** Mapping from CustomVoice.provider to TTS provider IDs. */
const VOICE_PROVIDER_MAP: Record<string, string> = {
  minimax: "yunwu-minimax",
  kling: "yunwu-kling",
};

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createTTSRouter(): Hono {
  const router = new Hono();

  // --- Get TTS config (apiKey masked) + available providers ---
  router.get("/api/tts/config", async (c) => {
    const settings = await loadSettings();
    const cfg = settings.ttsConfig ?? {};
    const providers = ttsProviderRegistry.list().map((p) => ({
      id: p.id,
      name: p.name,
      apiKeyOptional: p.apiKeyOptional ?? false,
      models: p.models.map((m) => ({ id: m.id, name: m.name })),
      voices: p.voices.map((v) => ({ id: v.id, name: v.name })),
      baseUrl: p.baseUrl,
    }));

    // Merge live-fetched TTS models from LLM providers (e.g. yunwu).
    const liveTTSModels = settings.liveTTSModels ?? {};
    for (const [providerId, models] of Object.entries(liveTTSModels)) {
      if (models.length === 0) continue;
      const existing = providers.find((p) => p.id === providerId);
      if (existing) {
        const seen = new Set(existing.models.map((m) => m.id));
        for (const m of models) {
          if (!seen.has(m.id)) existing.models.push({ id: m.id, name: m.name ?? "Unknown" });
        }
      } else {
        const llmProvider = providerRegistry.get(providerId);
        const llmCred = settings.providerCredentials?.[providerId];
        if (llmProvider && (llmCred?.apiKey || llmCred?.oauthToken)) {
          providers.push({
            id: providerId,
            name: llmProvider.name,
            apiKeyOptional: false,
            models: models.map((m) => ({ id: m.id, name: m.name ?? "Unknown" })),
            voices: [],
            baseUrl: llmProvider.baseUrl,
          });
        }
      }
    }

    // Merge locally persisted custom voices (from design/clone) into the
    // corresponding provider's voice list so they appear in the UI dropdown.
    const customVoices = (await readJson<CustomVoice[]>(CUSTOM_VOICES_FILE)) ?? [];
    for (const cv of customVoices) {
      const ttsProviderId = VOICE_PROVIDER_MAP[cv.provider];
      if (!ttsProviderId) continue;
      const tp = providers.find((p) => p.id === ttsProviderId);
      if (!tp) continue;
      const seen = new Set(tp.voices.map((v) => v.id));
      if (!seen.has(cv.voiceId)) {
        const label = cv.source === "design" ? `🎨 ${cv.name}` : `🎤 ${cv.name}`;
        tp.voices.push({ id: cv.voiceId, name: label });
      }
    }

    return c.json({
      config: {
        ...cfg,
        apiKey: cfg.apiKey ? "***" : "",
      },
      providers,
    });
  });

  // --- Save TTS config (merge into settings.ttsConfig) ---
  router.put("/api/tts/config", async (c) => {
    const body = await c.req.json<Partial<TTSConfig>>();
    // Atomic read-merge-write under the settings mutex.
    await withSettingsLock(async (lock) => {
      const existing = await lock.load();

      // Preserve existing apiKey when the client sends the mask placeholder
      const apiKey =
        body.apiKey && body.apiKey !== "***"
          ? body.apiKey
          : existing.ttsConfig?.apiKey ?? "";

      const ttsConfig: Partial<TTSConfig> = {
        ...body,
        apiKey,
      };

      const updated: AppSettings = {
        ...existing,
        ttsConfig,
      };
      await lock.write(updated);
    });
    return c.json({ success: true });
  });

  // --- Synthesize speech from text ---
  // Supports optional `characterFilename` to look up per-character voice settings.
  router.post("/api/projects/:projectId/tts/synthesize", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const raw = await c.req.json();

    // If characterFilename is provided, try to load per-character voice config
    let characterVoice: { provider?: string; voiceId?: string; speed?: number } | undefined;
    if (raw.characterFilename) {
      const characterFilename = safeFilename(raw.characterFilename);
      const card = await readValidatedCard(
        join(DATA_DIR, projectId, "characters", characterFilename),
      );
      const ext = card?.data?.extensions as Record<string, unknown> | undefined;
      const tavernosExt = ext?.["tavernos"] as Record<string, unknown> | undefined;
      const voiceCfg = tavernosExt?.["voice"] as Record<string, unknown> | undefined;
      if (voiceCfg && voiceCfg.enabled === true) {
        characterVoice = {
          provider: voiceCfg.provider as string | undefined,
          voiceId: voiceCfg.voiceId as string | undefined,
          speed: voiceCfg.speed as number | undefined,
        };
      }
    }

    // Merge character voice override into the request
    const mergedRequest = {
      ...raw,
      voice: characterVoice?.voiceId ?? raw.voice,
      speed: characterVoice?.speed ?? raw.speed,
    };

    const parseResult = TTSRequestSchema.safeParse(mergedRequest);

    if (!parseResult.success) {
      return c.json({ error: "Invalid request parameters", details: parseResult.error.issues }, 400);
    }

    // If character has a provider override, use it instead of the global config.
    // For character dialogue (characterFilename present), default to speech-2.8-turbo
    // unless the user has explicitly configured a different model.
    let client;
    try {
      if (characterVoice?.provider) {
        const settings = await loadSettings();
        const ttsConfig = settings.ttsConfig ?? {};
        // When the provider is overridden by the character voice config,
        // the global model may not be valid for that provider (e.g. "tts-1"
        // is OpenAI-only, but yunwu-minimax needs "speech-2.8-turbo").
        // Check if the configured model is supported by the target provider;
        // if not, fall back to the provider's first registered model.
        const providerEntry = ttsProviderRegistry.get(characterVoice.provider);
        const providerModelIds = providerEntry?.models.map((m) => m.id) ?? [];
        const modelIsValid = ttsConfig.model && providerModelIds.includes(ttsConfig.model);
        const characterModel = modelIsValid
          ? ttsConfig.model
          : (providerEntry?.models[0]?.id ?? ttsConfig.model ?? "speech-2.8-turbo");
        client = await createTTSClientFromSettings({
          ...ttsConfig,
          provider: characterVoice.provider,
          model: characterModel,
        } as Partial<TTSConfig>);
      } else {
        const settings = await loadSettings();
        const ttsConfig = settings.ttsConfig ?? {};
        // For character dialogue, use speech-2.8-turbo as default model
        // (faster, cheaper, good quality for conversational speech).
        const dialogueModel = raw.characterFilename
          ? (ttsConfig.model || "speech-2.8-turbo")
          : ttsConfig.model;
        client = await createTTSClientFromSettings({
          ...ttsConfig,
          model: dialogueModel,
        } as Partial<TTSConfig>);
      }
    } catch (e) {
      console.error("[tts] config error:", e);
      return c.json({ error: "TTS configuration error" }, 500);
    }

    try {
      const response = await client.synthesize(parseResult.data);

      // Return the raw audio bytes with the correct content type
      const ab = new ArrayBuffer(response.audio.byteLength);
      new Uint8Array(ab).set(response.audio);
      return new Response(ab, {
        status: 200,
        headers: {
          "Content-Type": response.contentType,
          "Content-Length": String(response.audio.length),
          "X-Audio-Format": response.format,
        },
      });
    } catch (e) {
      console.error("[tts] synthesize failed:", e);
      return c.json({ error: "TTS synthesis failed, please check server logs" }, 500);
    }
  });

  return router;
}
