export interface MJConfig {
    /** API key (Bearer token). */
    readonly apiKey: string;
    /** Server root URL, e.g. https://yunwu.ai (no /v1). */
    readonly baseUrl: string;
}
export type MJBotType = "MID_JOURNEY" | "NIJI_JOURNEY";
export type MJTaskStatus = "NOT_START" | "SUBMITTED" | "IN_PROGRESS" | "SUCCESS" | "FAILURE" | "UNKNOWN";
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
export interface MJClient {
    /** Submit an imagine task; returns the task id. */
    submitImagine(prompt: string, options?: MJSubmitOptions): Promise<string>;
    /** Fetch the current status of a task. */
    fetchTask(taskId: string): Promise<MJTask>;
    /** Poll until the task reaches a terminal state; returns the final task. */
    waitForCompletion(taskId: string, onProgress?: (task: MJTask) => void, timeoutMs?: number): Promise<MJTask>;
}
export declare function createMJClient(config: MJConfig): MJClient;
//# sourceMappingURL=mj-client.d.ts.map