// Midjourney async client for the yunwu midjourney-proxy API.
//
// MJ generation is asynchronous: submit an imagine task, then poll the task
// status until SUCCESS/FAILURE. This mirrors the flow verified against the
// live yunwu API:
//   POST {base}/mj/submit/imagine  → { code:1, result:"<taskId>" }
//   GET  {base}/mj/task/{id}/fetch → { status:"SUCCESS", imageUrl:"..." }
import { normalizeApiUrl, buildHeaders, throwApiError } from "../shared/http.js";
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createMJClient(config) {
    const base = (config.baseUrl || "").replace(/\/+$/, "");
    function url(endpoint) {
        return normalizeApiUrl(base, endpoint);
    }
    return {
        async submitImagine(prompt, options = {}) {
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
            const data = (await res.json());
            if (data.code !== 1 || !data.result) {
                throw new Error(`MJ submit failed: ${data.description ?? JSON.stringify(data)}`);
            }
            return data.result;
        },
        async fetchTask(taskId) {
            const res = await fetch(url(`/mj/task/${taskId}/fetch`), {
                headers: buildHeaders(config.apiKey, { json: false }),
            });
            if (!res.ok) {
                await throwApiError(res, "MJ fetch");
            }
            // External API response — the assertions below are intentional (the MJ
            // proxy returns loosely-typed JSON that we coerce into MJTask).
            const data = (await res.json());
            const VALID_STATUSES = ["NOT_START", "SUBMITTED", "IN_PROGRESS", "SUCCESS", "FAILURE"];
            const rawStatus = typeof data["status"] === "string" ? data["status"] : "UNKNOWN";
            const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : "UNKNOWN";
            return {
                id: String(data["id"] ?? taskId),
                action: data["action"],
                status,
                progress: data["progress"],
                imageUrl: data["imageUrl"],
                prompt: data["prompt"],
                failReason: data["failReason"],
            };
        },
        async waitForCompletion(taskId, onProgress, timeoutMs) {
            const intervalMs = 5000;
            const maxAttempts = timeoutMs ? Math.ceil(timeoutMs / intervalMs) : 72; // default 72 × 5s = 6 min
            for (let i = 1; i <= maxAttempts; i++) {
                const task = await this.fetchTask(taskId);
                if (onProgress)
                    onProgress(task);
                if (task.status === "SUCCESS")
                    return task;
                if (task.status === "FAILURE") {
                    throw new Error(`MJ task failed: ${task.failReason ?? "unknown reason"}`);
                }
                await new Promise((r) => setTimeout(r, intervalMs));
            }
            throw new Error(`MJ task ${taskId} timed out after ${maxAttempts * intervalMs / 1000}s`);
        },
    };
}
//# sourceMappingURL=mj-client.js.map