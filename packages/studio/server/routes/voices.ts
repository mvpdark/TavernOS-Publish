// ---------------------------------------------------------------------------
// Voice management routes — MiniMax voice design/clone + Kling custom voices.
//
// Endpoints:
//   POST /api/voices/upload                  — Upload audio file (returns file_id)
//   POST /api/voices/minimax/design          — Design a voice from text prompt
//   POST /api/voices/minimax/clone           — Clone a voice from uploaded audio
//   POST /api/voices/kling/custom            — Create Kling custom voice
//   GET  /api/voices/kling/custom/:voiceId   — Query a Kling custom voice
//   GET  /api/voices/kling/official          — List Kling official voices
//   POST /api/voices/kling/delete            — Delete a Kling custom voice
//   GET  /api/voices/custom                  — List locally persisted custom voices
//   DELETE /api/voices/custom/:voiceId       — Delete a local custom voice record
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import { join, dirname } from "node:path";
import {
  createVoiceClient,
  VoiceDesignRequestSchema,
  VoiceCloneRequestSchema,
  KlingCustomVoiceRequestSchema,
  type CustomVoice,
} from "@tavernos/core";
import {
  loadSettings,
  readJson,
  writeJson,
  ensureDir,
  withFileLock,
  SETTINGS_FILE,
} from "../context.js";

/** Path to the local custom-voices registry. */
const CUSTOM_VOICES_FILE = join(dirname(SETTINGS_FILE), "custom-voices.json");

export function createVoicesRouter(): Hono {
  const router = new Hono();

  /**
   * Build a voice client from the current TTS settings (shared API key).
   *
   * The voice client builds vendor-specific paths itself — MiniMax uses
   * `/minimax/v1/…`, Kling uses `/kling/v1/…` — so it needs the API root
   * WITHOUT a trailing version segment. The TTS config `baseUrl` for
   * OpenAI-pattern providers (e.g. "yunwu") ends with `/v1`, which would
   * produce broken URLs like `…/v1/minimax/v1/voice_design`. We strip a
   * trailing `/v1` (or `/v1beta`) so every sub-provider resolves against the
   * correct root, regardless of which TTS provider is currently active.
   */
  async function getVoiceClient() {
    const settings = await loadSettings();
    const ttsConfig = settings.ttsConfig ?? {};
    const apiKey = ttsConfig.apiKey ?? settings.apiKey ?? "";
    const rawBaseUrl = ttsConfig.baseUrl ?? "https://yunwu.ai";
    const baseUrl = rawBaseUrl.replace(/\/v1(?:beta)?\/?$/i, "") || rawBaseUrl;
    return createVoiceClient({ apiKey, baseUrl });
  }

  // -----------------------------------------------------------------------
  // Local custom-voice persistence helpers
  // -----------------------------------------------------------------------

  /** Load all locally persisted custom voices. Returns [] on any error. */
  async function loadCustomVoices(): Promise<CustomVoice[]> {
    return (await readJson<CustomVoice[]>(CUSTOM_VOICES_FILE)) ?? [];
  }

  /** Atomically save the full custom-voice list (under a file lock). */
  async function saveCustomVoices(voices: CustomVoice[]): Promise<void> {
    await withFileLock(CUSTOM_VOICES_FILE, async () => {
      await ensureDir(dirname(CUSTOM_VOICES_FILE));
      await writeJson(CUSTOM_VOICES_FILE, voices);
    });
  }

  /** Append (or update by voiceId) a custom voice record.
   *  The entire read-modify-write cycle is inside the file lock to prevent
   *  concurrent design/clone requests from overwriting each other's voices. */
  async function upsertCustomVoice(voice: CustomVoice): Promise<void> {
    await withFileLock(CUSTOM_VOICES_FILE, async () => {
      const voices = (await readJson<CustomVoice[]>(CUSTOM_VOICES_FILE)) ?? [];
      const idx = voices.findIndex((v) => v.voiceId === voice.voiceId);
      if (idx >= 0) {
        voices[idx] = voice;
      } else {
        voices.push(voice);
      }
      await ensureDir(dirname(CUSTOM_VOICES_FILE));
      await writeJson(CUSTOM_VOICES_FILE, voices);
    });
  }

  // -----------------------------------------------------------------------
  // Audio upload (step 1 of MiniMax voice clone)
  // -----------------------------------------------------------------------

  router.post("/api/voices/upload", async (c) => {
    try {
      const body = await c.req.parseBody();
      const file = body["file"];
      const purpose = (body["purpose"] as string) || "voice_clone";

      if (!(file instanceof File)) {
        return c.json({ error: "Missing audio file" }, 400);
      }

      // Validate audio format
      const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/m4a", "audio/wav", "audio/x-wav", "audio/wave"];
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const allowedExts = ["mp3", "m4a", "wav"];
      if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
        return c.json({ error: "Unsupported audio format, please upload mp3/m4a/wav" }, 400);
      }

      // 20MB limit
      if (file.size > 20 * 1024 * 1024) {
        return c.json({ error: "Audio file cannot exceed 20MB" }, 400);
      }

      const audioBuffer = await file.arrayBuffer();
      const client = await getVoiceClient();
      const result = await client.uploadAudio(audioBuffer, file.name, purpose);
      return c.json(result);
    } catch (e) {
      console.error("[voices] upload failed:", e);
      return c.json({ error: "Audio upload failed, please check server logs" }, 500);
    }
  });

  // -----------------------------------------------------------------------
  // MiniMax: Design a voice from a text prompt
  // -----------------------------------------------------------------------

  router.post("/api/voices/minimax/design", async (c) => {
    const body = await c.req.json();
    const parseResult = VoiceDesignRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({ error: "Invalid request parameters", details: parseResult.error.issues }, 400);
    }
    try {
      const client = await getVoiceClient();
      const result = await client.designVoice(parseResult.data);

      // Auto-persist the designed voice into the local registry
      const name = (body["name"] as string) || parseResult.data.prompt.slice(0, 20) || result.voiceId;
      await upsertCustomVoice({
        voiceId: result.voiceId,
        name,
        provider: "minimax",
        source: "design",
        prompt: parseResult.data.prompt,
        createdAt: new Date().toISOString(),
      });

      return c.json(result);
    } catch (e) {
      console.error("[voices] design failed:", e);
      return c.json({ error: "Voice design failed, please check server logs" }, 500);
    }
  });

  // -----------------------------------------------------------------------
  // MiniMax: Clone a voice from an uploaded audio file
  // -----------------------------------------------------------------------

  router.post("/api/voices/minimax/clone", async (c) => {
    const body = await c.req.json();
    const parseResult = VoiceCloneRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({ error: "Invalid request parameters", details: parseResult.error.issues }, 400);
    }
    try {
      const client = await getVoiceClient();
      const result = await client.cloneVoice(parseResult.data);

      // Auto-persist the cloned voice into the local registry
      const name = (body["name"] as string) || `克隆音色_${result.voiceId.slice(0, 8)}`;
      await upsertCustomVoice({
        voiceId: result.voiceId,
        name,
        provider: "minimax",
        source: "clone",
        prompt: (body["description"] as string) || "",
        createdAt: new Date().toISOString(),
      });

      return c.json(result);
    } catch (e) {
      console.error("[voices] clone failed:", e);
      return c.json({ error: "Voice cloning failed, please check server logs" }, 500);
    }
  });

  // -----------------------------------------------------------------------
  // Kling: Create a custom voice
  // -----------------------------------------------------------------------

  router.post("/api/voices/kling/custom", async (c) => {
    const body = await c.req.json();
    const parseResult = KlingCustomVoiceRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({ error: "Invalid request parameters", details: parseResult.error.issues }, 400);
    }
    try {
      const client = await getVoiceClient();
      const result = await client.createKlingVoice(parseResult.data);
      return c.json(result);
    } catch (e) {
      console.error("[voices] kling custom failed:", e);
      return c.json({ error: "Kling custom voice creation failed, please check server logs" }, 500);
    }
  });

  // -----------------------------------------------------------------------
  // Kling: Query a single custom voice
  // -----------------------------------------------------------------------

  router.get("/api/voices/kling/custom/:voiceId", async (c) => {
    const voiceId = c.req.param("voiceId");
    try {
      const client = await getVoiceClient();
      const result = await client.queryKlingVoice(voiceId);
      return c.json(result);
    } catch (e) {
      console.error("[voices] kling query failed:", e);
      return c.json({ error: "Failed to query voices, please check server logs" }, 500);
    }
  });

  // -----------------------------------------------------------------------
  // Kling: List official voices
  // -----------------------------------------------------------------------

  router.get("/api/voices/kling/official", async (c) => {
    try {
      const client = await getVoiceClient();
      const result = await client.listKlingOfficialVoices();
      return c.json(result);
    } catch (e) {
      console.error("[voices] kling official list failed:", e);
      return c.json({ error: "Failed to fetch official voice list, please check server logs" }, 500);
    }
  });

  // -----------------------------------------------------------------------
  // Kling: Delete a custom voice
  // -----------------------------------------------------------------------

  router.post("/api/voices/kling/delete", async (c) => {
    const body = await c.req.json<{ voice_id: string }>();
    if (!body.voice_id) {
      return c.json({ error: "Missing voice_id parameter" }, 400);
    }
    try {
      const client = await getVoiceClient();
      const result = await client.deleteKlingVoice(body.voice_id);
      return c.json(result);
    } catch (e) {
      console.error("[voices] kling delete failed:", e);
      return c.json({ error: "Failed to delete voice, please check server logs" }, 500);
    }
  });

  // -----------------------------------------------------------------------
  // Local custom-voice registry: list & delete
  // -----------------------------------------------------------------------

  router.get("/api/voices/custom", async (c) => {
    try {
      const voices = await loadCustomVoices();
      return c.json({ voices });
    } catch (e) {
      console.error("[voices] list custom failed:", e);
      return c.json({ error: "Failed to fetch custom voice list" }, 500);
    }
  });

  router.delete("/api/voices/custom/:voiceId", async (c) => {
    const voiceId = c.req.param("voiceId");
    try {
      let deletedCount = 0;
      await withFileLock(CUSTOM_VOICES_FILE, async () => {
        const voices = (await readJson<CustomVoice[]>(CUSTOM_VOICES_FILE)) ?? [];
        const filtered = voices.filter((v) => v.voiceId !== voiceId);
        deletedCount = voices.length - filtered.length;
        if (deletedCount > 0) {
          await writeJson(CUSTOM_VOICES_FILE, filtered);
        }
      });
      return c.json({ success: true, deleted: deletedCount });
    } catch (e) {
      console.error("[voices] delete custom failed:", e);
      return c.json({ error: "Failed to delete custom voice" }, 500);
    }
  });

  return router;
}
