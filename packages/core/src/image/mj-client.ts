// Async image generation client for the yunwu midjourney-proxy API.
//
// "Midjourney" is a trademark of Midjourney, Inc. This client communicates
// with a third-party proxy service (yunwu midjourney-proxy) and is not
// affiliated with or endorsed by Midjourney, Inc.
//
// Image generation is asynchronous: submit an imagine task, then poll the task
// status until SUCCESS/FAILURE. This mirrors the flow verified against the
// live yunwu API:
//   POST {base}/mj/submit/imagine  → { code:1, result:"<taskId>" }
//   GET  {base}/mj/task/{id}/fetch → { status:"SUCCESS", imageUrl:"..." }

import { normalizeApiUrl, buildHeaders, throwApiError } from "../shared/http.js";

// ---------------------------------------------------------------------------
// Config & task types
// ---------------------------------------------------------------------------

export interface MJConfig {
  /** API key (Bearer token). */
  readonly apiKey: string;
  /** Server root URL, e.g. https://yunwu.ai (no /v1). */
  readonly baseUrl: string;
}

export type MJBotType = "MID_JOURNEY" | "NIJI_JOURNEY";

export type MJTaskStatus =
  | "NOT_START"
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "SUCCESS"
  | "FAILURE"
  | "UNKNOWN";

export interface MJTask {
  readonly id: string;
  readonly action?: string;
  readonly status: MJTaskStatus;
  readonly progress?: string;
  readonly imageUrl?: string;
  readonly prompt?: string;
  readonly failReason?: string;
}

export interface MJSubmitOptions {
  /** "MID_JOURNEY" (realistic, default) or "NIJI_JOURNEY" (anime). */
  readonly botType?: MJBotType;
  /** Optional state passed through to the task. */
  readonly state?: string;
  /** Optional callback URL for async notification (unused — we poll). */
  readonly notifyHook?: string;
}

// ---------------------------------------------------------------------------
// MJClient interface
// ---------------------------------------------------------------------------

export interface MJClient {
  /** Submit an imagine task; returns the task id. */
  submitImagine(prompt: string, options?: MJSubmitOptions): Promise<string>;
  /** Fetch the current status of a task. */
  fetchTask(taskId: string): Promise<MJTask>;
  /** Poll until the task reaches a terminal state; returns the final task. */
  waitForCompletion(
    taskId: string,
    onProgress?: (task: MJTask) => void,
    timeoutMs?: number,
  ): Promise<MJTask>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMJClient(config: MJConfig): MJClient {
  const base = (config.baseUrl || "").replace(/\/+$/, "");

  function url(endpoint: string): string {
    return normalizeApiUrl(base, endpoint);
  }

  return {
    async submitImagine(prompt: string, options: MJSubmitOptions = {}): Promise<string> {
      const res = await fetch(url("/mj/submit/imagine"), {
        method: "POST",
        headers: buildHeaders(config.apiKey),
        body: JSON.stringify({
          prompt,
          botType: options.botType ?? "MID_JOURNEY",
          base64Array: [],
          notifyHook: options.notifyHook ?? "",
          state: options.state ?? "",
        }),
      });
      if (!res.ok) {
        await throwApiError(res, "MJ submit");
      }
      const data = (await res.json()) as { code?: number; description?: string; result?: string };
      if (data.code !== 1 || !data.result) {
        throw new Error(`MJ submit failed: ${data.description ?? JSON.stringify(data)}`);
      }
      return data.result;
    },

    async fetchTask(taskId: string): Promise<MJTask> {
      const res = await fetch(url(`/mj/task/${taskId}/fetch`), {
        headers: buildHeaders(config.apiKey, { json: false }),
      });
      if (!res.ok) {
        await throwApiError(res, "MJ fetch");
      }
      // External API response — the assertions below are intentional (the MJ
      // proxy returns loosely-typed JSON that we coerce into MJTask).
      const data = (await res.json()) as Record<string, unknown>;
      const VALID_STATUSES: readonly string[] = ["NOT_START", "SUBMITTED", "IN_PROGRESS", "SUCCESS", "FAILURE"];
      const rawStatus = typeof data["status"] === "string" ? data["status"] : "UNKNOWN";
      const status: MJTaskStatus = VALID_STATUSES.includes(rawStatus) ? (rawStatus as MJTaskStatus) : "UNKNOWN";
      return {
        id: String(data["id"] ?? taskId),
        action: data["action"] as string | undefined,
        status,
        progress: data["progress"] as string | undefined,
        imageUrl: data["imageUrl"] as string | undefined,
        prompt: data["prompt"] as string | undefined,
        failReason: data["failReason"] as string | undefined,
      };
    },

    async waitForCompletion(
      taskId: string,
      onProgress?: (task: MJTask) => void,
      timeoutMs?: number,
    ): Promise<MJTask> {
      const intervalMs = 5000;
      const maxAttempts = timeoutMs ? Math.ceil(timeoutMs / intervalMs) : 72; // default 72 × 5s = 6 min
      for (let i = 1; i <= maxAttempts; i++) {
        const task = await this.fetchTask(taskId);
        if (onProgress) onProgress(task);
        if (task.status === "SUCCESS") return task;
        if (task.status === "FAILURE") {
          throw new Error(`MJ task failed: ${task.failReason ?? "unknown reason"}`);
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      throw new Error(`MJ task ${taskId} timed out after ${maxAttempts * intervalMs / 1000}s`);
    },
  };
}
