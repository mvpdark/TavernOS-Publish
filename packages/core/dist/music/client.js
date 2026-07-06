// Music generation client — Suno via yunwu.ai proxy API.
//
// Flow:
//   1. POST /suno/submit/music  → submit task, get { code, data: task_id }
//   2. GET  /suno/fetch/:task_id → poll until status === SUCCESS / FAILURE
//   3. Parse data[] array into GeneratedMusic[]
// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export class MusicGenError extends Error {
    status;
    body;
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = "MusicGenError";
    }
}
// ---------------------------------------------------------------------------
// SunoMusicClient
// ---------------------------------------------------------------------------
export class SunoMusicClient {
    baseUrl;
    apiKey;
    model;
    defaultInstrumental;
    static POLL_INTERVAL_MS = 5_000;
    static MAX_POLL_MS = 180_000; // 3 分钟
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/+$/, "");
        this.apiKey = config.apiKey;
        this.model = config.model;
        this.defaultInstrumental = config.instrumental;
        if (!this.apiKey) {
            throw new MusicGenError("Music API key is required");
        }
    }
    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------
    async generate(req) {
        const instrumental = req.instrumental ?? this.defaultInstrumental;
        // Step 1: Build request body per yunwu Suno API field mapping
        const body = {
            mv: this.model,
            make_instrumental: instrumental,
        };
        // Style → tags (comma-separated)
        if (req.style) {
            body.tags = req.style;
        }
        // Title
        if (req.title) {
            body.title = req.title;
        }
        // Prompt mode: descriptionPrompt → gpt_description_prompt (inspiration mode)
        //              prompt/lyrics → prompt (custom/lyrics mode)
        // These two are mutually exclusive per API docs.
        if (req.descriptionPrompt) {
            // 灵感模式：自然语言描述
            body.gpt_description_prompt = req.descriptionPrompt;
        }
        else {
            // 自定义模式：歌词/提示词
            // lyrics 字段兼容旧API，会合并到 prompt 中
            let finalPrompt = req.prompt ?? "";
            if (req.lyrics) {
                finalPrompt = finalPrompt ? `${finalPrompt}\n\n${req.lyrics}` : req.lyrics;
            }
            if (finalPrompt) {
                body.prompt = finalPrompt;
            }
        }
        // Step 2: Submit music generation task
        const submitRes = await this.fetchJson("/suno/submit/music", "POST", body);
        if (submitRes.code !== "success") {
            throw new MusicGenError(`Music generation submission failed: ${submitRes.message ?? submitRes.code ?? "unknown error"}`, undefined, submitRes);
        }
        const taskId = submitRes.data;
        if (!taskId) {
            throw new MusicGenError("No task ID returned from music generation submission", undefined, submitRes);
        }
        // Step 3: Poll for completion
        const result = await this.pollTask(taskId);
        // Step 4: Parse response into GeneratedMusic[]
        const music = this.parseMusicResponse(result);
        return { music, taskId };
    }
    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------
    async pollTask(taskId) {
        const start = Date.now();
        while (Date.now() - start < SunoMusicClient.MAX_POLL_MS) {
            await this.sleep(SunoMusicClient.POLL_INTERVAL_MS);
            const res = await this.fetchJson(`/suno/fetch/${taskId}`, "GET");
            switch (res.status) {
                case "SUCCESS":
                    return res;
                case "FAILURE":
                    throw new MusicGenError(`Music generation failed: ${res.failReason ?? "unknown error"}`, undefined, res);
                case "NOT_START":
                case "SUBMITTED":
                case "QUEUED":
                case "IN_PROGRESS":
                    // Still pending/processing, continue polling
                    break;
                default:
                    // Unknown status — treat as pending and keep polling
                    break;
            }
        }
        throw new MusicGenError(`Music generation timed out after ${SunoMusicClient.MAX_POLL_MS / 1000}s (task: ${taskId})`);
    }
    parseMusicResponse(res) {
        const clips = res.data;
        if (!Array.isArray(clips) || clips.length === 0) {
            throw new MusicGenError("Music generation completed but no clip data returned", undefined, res);
        }
        const results = [];
        for (const clip of clips) {
            if (!clip.audio_url) {
                // Skip clips without audio (shouldn't normally happen on SUCCESS)
                continue;
            }
            results.push({
                clipId: clip.id,
                audioUrl: clip.audio_url,
                videoUrl: clip.video_url || undefined,
                imageUrl: clip.image_url || undefined,
                title: clip.title,
                lyrics: clip.lyric,
                model: clip.model ?? this.model,
                duration: clip.duration,
            });
        }
        if (results.length === 0) {
            throw new MusicGenError("Music generation completed but no audio URL found", undefined, res);
        }
        return results;
    }
    async fetchJson(path, method, body) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
        };
        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new MusicGenError(`Music API error ${res.status}: ${text.slice(0, 200)}`, res.status, text);
        }
        return res.json();
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createMusicClient(config) {
    return new SunoMusicClient(config);
}
//# sourceMappingURL=client.js.map