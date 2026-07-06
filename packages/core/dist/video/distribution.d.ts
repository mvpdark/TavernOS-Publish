/**
 * Supported distribution platforms.
 *
 * Domestic platforms (抖音/快手/B站/小红书/视频号) plus overseas targets
 * (YouTube/TikTok) for going-global (出海) distribution.
 */
export type DistributionPlatform = "douyin" | "kuaishou" | "bilibili" | "xiaohongshu" | "weixin" | "youtube" | "tiktok";
/**
 * Lifecycle status of a publish request.
 *
 * - `draft`      : created but not yet submitted.
 * - `uploading`  : video binary is being uploaded to the platform.
 * - `processing` : platform is transcoding / reviewing the video.
 * - `published`  : video is live and publicly accessible.
 * - `failed`     : upload or publish step failed (see errorMessage).
 * - `scheduled`  : queued for timed release (scheduledTime in the future).
 */
export type PublishStatus = "draft" | "uploading" | "processing" | "published" | "failed" | "scheduled";
/**
 * A single publish request targeting one platform.
 *
 * `videoPath` is a local file path; the Publisher reads it from disk and
 * uploads the binary. Platform-specific params (douyin/bilibili/kuaishou)
 * are nested under the platform key to keep the common surface small.
 */
export interface PublishRequest {
    platform: DistributionPlatform;
    /** Local file path of the video to publish. */
    videoPath: string;
    /** Video title (subject to per-platform length limits). */
    title: string;
    /** Optional description / caption. */
    description?: string;
    /** Optional tags / hashtags (without leading #). */
    tags?: string[];
    /** Optional cover image path (required by some platforms — see PLATFORM_LIMITS). */
    coverImagePath?: string;
    /** Optional platform category id. */
    categoryId?: string;
    /** ISO-8601 timestamp for scheduled publishing (future). */
    scheduledTime?: string;
    /** Douyin-specific options. */
    douyin?: {
        /** POI (point-of-interest) location id. */
        poiId?: string;
        /** Challenge (挑战赛) ids. */
        challengeIds?: string[];
        /** Original-content declaration (原创声明). */
        original?: boolean;
    };
    /** Bilibili-specific options. */
    bilibili?: {
        /** 分区 id (tid), e.g. 95 = 数码. */
        tid?: number;
        /** 1 = 自制 (self-made), 2 = 转载 (repost). */
        copyright?: number;
        /** Source attribution when copyright === 2. */
        source?: string;
    };
    /** Kuaishou-specific options. */
    kuaishou?: {
        /** Cover type selector. */
        coverType?: number;
        /** Collection (合集) id. */
        collectionId?: string;
    };
}
/**
 * Result of a publish attempt for one platform.
 *
 * `rawData` preserves the platform's original response payload for
 * debugging and downstream processing.
 */
export interface PublishResult {
    platform: DistributionPlatform;
    status: PublishStatus;
    /** Video id returned by the platform (used for status polling). */
    platformVideoId?: string;
    /** Public URL of the published video (once `published`). */
    platformUrl?: string;
    /** ISO-8601 timestamp of when the video went live. */
    publishTime?: string;
    /** Error message when `status === "failed"`. */
    errorMessage?: string;
    /** Platform-returned raw payload (untyped). */
    rawData?: unknown;
}
/**
 * Per-platform configuration (credentials + limits).
 *
 * The limit fields mirror {@link PLATFORM_LIMITS} but are kept on the config
 * instance so a deployment can tighten them (e.g. enforce a smaller upload
 * ceiling) without mutating the shared constant.
 */
export interface PlatformConfig {
    platform: DistributionPlatform;
    enabled: boolean;
    /** OAuth access token (short-lived). */
    accessToken?: string;
    /** OAuth refresh token (long-lived, used to renew accessToken). */
    refreshToken?: string;
    /** ISO-8601 timestamp when accessToken expires. */
    tokenExpiresAt?: string;
    /** Platform open id / user id. */
    openId?: string;
    /** Base API URL (overridable for staging / proxies). */
    apiUrl?: string;
    maxTitleLength: number;
    maxDescriptionLength: number;
    maxVideoSizeMB: number;
    maxVideoDurationSec: number;
    supportedFormats: string[];
    requireCover: boolean;
}
/**
 * A batch publish task fanning out to multiple platforms.
 *
 * Created by {@link DistributionManager.publishToAll}; results are filled in
 * as each platform settles (Promise.allSettled).
 */
export interface PublishTask {
    /** Stable unique identifier (UUIDv4). */
    id: string;
    requests: PublishRequest[];
    results: PublishResult[];
    status: PublishStatus;
    /** ISO-8601 timestamp of task creation. */
    createdAt: string;
    /** ISO-8601 timestamp of task completion (all platforms settled). */
    completedAt?: string;
}
/**
 * Distribution-manager-level configuration.
 */
export interface DistributionConfig {
    platforms: PlatformConfig[];
    /** Whether `publishToAll` defaults to every configured platform. */
    publishAllByDefault: boolean;
    /** Per-upload timeout in milliseconds. */
    uploadTimeoutMs: number;
}
/**
 * Strategy interface implemented by each platform Publisher.
 *
 * A publisher encapsulates everything platform-specific: the upload flow,
 * the publish-task creation, status polling, and token refresh. The
 * {@link DistributionManager} delegates to publishers and stays agnostic of
 * the concrete platform wire format.
 */
export interface IPlatformPublisher {
    /** The platform this publisher handles. */
    readonly platform: DistributionPlatform;
    /** Whether the platform has been configured with valid credentials. */
    isConfigured(): boolean;
    /** Publish a video per the request, using the given platform config. */
    publish(request: PublishRequest, config: PlatformConfig): Promise<PublishResult>;
    /** Poll the publish status of a previously-created platform video. */
    getStatus(platformVideoId: string, config: PlatformConfig): Promise<PublishStatus>;
    /** Refresh the OAuth access token (stub — returns config unchanged). */
    refreshToken(config: PlatformConfig): Promise<PlatformConfig>;
}
/**
 * Hard per-platform limits (title/description length, max video size &
 * duration, supported formats, cover requirement).
 *
 * Researched from each platform's open-API documentation. Values are the
 * platform-side ceilings; deployments may enforce tighter limits via
 * {@link PlatformConfig}.
 */
export declare const PLATFORM_LIMITS: Record<DistributionPlatform, Omit<PlatformConfig, "platform" | "enabled" | "accessToken" | "refreshToken" | "tokenExpiresAt" | "openId" | "apiUrl">>;
/**
 * Default API base URLs per platform (overridable via {@link PlatformConfig.apiUrl}).
 */
export declare const PLATFORM_API_URLS: Record<DistributionPlatform, string>;
/**
 * Human-readable Chinese display names per platform.
 */
export declare const PLATFORM_NAMES: Record<DistributionPlatform, string>;
/**
 * Icon emoji per platform (for UI rendering).
 */
export declare const PLATFORM_ICONS: Record<DistributionPlatform, string>;
/**
 * Validate that a title fits the platform's length limit.
 *
 * @param platform Target platform.
 * @param title    The title to validate.
 * @returns `true` if the title length is within the platform ceiling.
 */
export declare function validateTitle(platform: DistributionPlatform, title: string): boolean;
/**
 * Validate that a description fits the platform's length limit.
 *
 * @param platform    Target platform.
 * @param desc        The description to validate.
 * @returns `true` if the description length is within the platform ceiling.
 */
export declare function validateDescription(platform: DistributionPlatform, desc: string): boolean;
/**
 * Get the Chinese display name of a platform.
 *
 * @param platform Target platform.
 * @returns Localised platform name (e.g. "抖音").
 */
export declare function getPlatformName(platform: DistributionPlatform): string;
/**
 * Get the icon emoji of a platform.
 *
 * @param platform Target platform.
 * @returns Icon emoji string (e.g. "🎵").
 */
export declare function getPlatformIcon(platform: DistributionPlatform): string;
/**
 * Shared base class for all platform publishers.
 *
 * Centralises the common publish lifecycle:
 *   1. Credential check (`isConfigured`).
 *   2. Request validation (title / description / cover / format).
 *   3. File-size validation against the platform ceiling.
 *   4. Delegation to the platform-specific `doPublish` hook.
 *
 * Concrete subclasses implement {@link BasePlatformPublisher.doPublish} and
 * {@link BasePlatformPublisher.doGetStatus}; token refresh defaults to a
 * no-op stub (returns config unchanged) since real OAuth wiring is owned by
 * a higher-level auth orchestrator.
 */
export declare abstract class BasePlatformPublisher implements IPlatformPublisher {
    /** The platform handled by this publisher. */
    abstract readonly platform: DistributionPlatform;
    /** The platform config bound to this publisher instance. */
    protected readonly config: PlatformConfig;
    /** Per-upload timeout in milliseconds. */
    protected readonly timeoutMs: number;
    constructor(config: PlatformConfig, timeoutMs: number);
    /** Whether the bound config carries the minimum required credentials. */
    isConfigured(): boolean;
    /**
     * Platform-specific publish implementation (upload + create task).
     *
     * Implementations receive the already-validated request and the video
     * buffer; they must return a {@link PublishResult}.
     */
    protected abstract doPublish(request: PublishRequest, videoBuffer: Buffer<ArrayBuffer>, config: PlatformConfig): Promise<PublishResult>;
    /** Platform-specific status poll. */
    protected abstract doGetStatus(platformVideoId: string, config: PlatformConfig): Promise<PublishStatus>;
    /** {@inheritDoc IPlatformPublisher.publish} */
    publish(request: PublishRequest, config: PlatformConfig): Promise<PublishResult>;
    /** {@inheritDoc IPlatformPublisher.getStatus} */
    getStatus(platformVideoId: string, config: PlatformConfig): Promise<PublishStatus>;
    /**
     * Default token refresh — no-op stub.
     *
     * Real OAuth refresh must be implemented by an auth orchestrator that has
     * access to the client secret; this returns the config unchanged.
     */
    refreshToken(config: PlatformConfig): Promise<PlatformConfig>;
}
/**
 * Publisher for 抖音 (Douyin) via the ByteDance open platform.
 *
 * Publish flow (developer.toutiao.com):
 *   1. POST /api/v1/video/upload/  — upload video binary (multipart).
 *   2. POST /api/v1/video/create/  — create a publish task with title/desc.
 *   3. GET  /api/v1/video/status/  — poll publish status by item_id.
 *
 * Auth: `access_token` + `open_id` query params (OAuth2 from partner.open-douyin.com).
 */
export declare class DouyinPublisher extends BasePlatformPublisher {
    readonly platform: DistributionPlatform;
    protected doPublish(request: PublishRequest, videoBuffer: Buffer<ArrayBuffer>, config: PlatformConfig): Promise<PublishResult>;
    protected doGetStatus(platformVideoId: string, config: PlatformConfig): Promise<PublishStatus>;
}
/**
 * Publisher for 快手 (Kuaishou) via the Kuaishou open platform.
 *
 * Publish flow (open.kuaishou.com):
 *   1. POST /openapi/photo/upload   — upload video binary (multipart).
 *   2. POST /openapi/photo/publish  — publish with caption / cover / schedule.
 *   3. GET  /openapi/photo/info     — poll publish status by photo_id.
 *
 * Auth: `access_token` query param + `open_id` (OAuth2 from open.kuaishou.com).
 */
export declare class KuaishouPublisher extends BasePlatformPublisher {
    readonly platform: DistributionPlatform;
    protected doPublish(request: PublishRequest, videoBuffer: Buffer<ArrayBuffer>, config: PlatformConfig): Promise<PublishResult>;
    protected doGetStatus(platformVideoId: string, config: PlatformConfig): Promise<PublishStatus>;
}
/**
 * Publisher for 哔哩哔哩 (Bilibili) video submission.
 *
 * Publish flow (api.bilibili.com) — B站投稿分片上传:
 *   1. POST /x/preupload             — pre-upload, get upos uri / auth / endpoints.
 *   2. POST {uposHost}/upload/v1/{uri}  — upload file in <= 10MB chunks.
 *   3. POST {uposHost}/upload/v1/{uri}?parts=...  — merge parts (合片).
 *   4. POST /x/web/dm/web/upload      — upload cover (when required).
 *   5. POST /x/web-interface/submit   — submit the submission (tid/copyright/title/desc).
 *
 * Auth: `access_token` cookie / `SESSDATA` (login session). The config
 * `accessToken` field carries the SESSDATA value; `apiUrl` may point to a
 * proxy.
 */
export declare class BilibiliPublisher extends BasePlatformPublisher {
    readonly platform: DistributionPlatform;
    /** B站分片大小上限 (10MB). */
    private static readonly CHUNK_SIZE;
    protected doPublish(request: PublishRequest, videoBuffer: Buffer<ArrayBuffer>, config: PlatformConfig): Promise<PublishResult>;
    protected doGetStatus(platformVideoId: string, config: PlatformConfig): Promise<PublishStatus>;
}
/**
 * Publisher for 小红书 (Xiaohongshu / RED) via the open platform.
 *
 * Publish flow (open.xiaohongshu.com):
 *   1. POST /api/v1/video/upload  — upload video binary (multipart).
 *   2. POST /api/v1/note/publish — publish a video note with title/desc/cover.
 *   3. GET  /api/v1/note/info    — poll publish status by note_id.
 *
 * Auth: `access_token` query param (OAuth2 with app key/secret).
 *
 * NOTE: 小红书 requires a cover image (see PLATFORM_LIMITS.xiaohongshu.requireCover).
 */
export declare class XiaohongshuPublisher extends BasePlatformPublisher {
    readonly platform: DistributionPlatform;
    protected doPublish(request: PublishRequest, videoBuffer: Buffer<ArrayBuffer>, config: PlatformConfig): Promise<PublishResult>;
    protected doGetStatus(platformVideoId: string, config: PlatformConfig): Promise<PublishStatus>;
}
/**
 * Publisher for 微信视频号 (WeChat Channels) via the WeChat open API.
 *
 * Publish flow (api.weixin.qq.com):
 *   1. POST /cgi-bin/material/add_material?type=video  — upload video (multipart).
 *   2. POST /wxa/api/channels/publish                  — publish to Channels.
 *   3. GET  /wxa/api/channels/get                      — poll status by video_id.
 *
 * Auth: `access_token` query param (OAuth2 client-credential or login token).
 */
export declare class WeixinPublisher extends BasePlatformPublisher {
    readonly platform: DistributionPlatform;
    protected doPublish(request: PublishRequest, videoBuffer: Buffer<ArrayBuffer>, config: PlatformConfig): Promise<PublishResult>;
    protected doGetStatus(platformVideoId: string, config: PlatformConfig): Promise<PublishStatus>;
}
/**
 * Publisher for YouTube via the YouTube Data API v3.
 *
 * Publish flow (googleapis.com) — resumable upload:
 *   1. POST /upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
 *        — initiate a resumable session, obtain the upload Location URL.
 *   2. PUT  {locationUrl}  — stream the video binary in a single PUT.
 *   3. GET  /youtube/v3/videos?id={id}&part=status  — poll upload status.
 *
 * Auth: OAuth2 `Bearer` access token (from Google Cloud console).
 */
export declare class YouTubePublisher extends BasePlatformPublisher {
    readonly platform: DistributionPlatform;
    protected doPublish(request: PublishRequest, videoBuffer: Buffer<ArrayBuffer>, config: PlatformConfig): Promise<PublishResult>;
    protected doGetStatus(platformVideoId: string, config: PlatformConfig): Promise<PublishStatus>;
}
/**
 * Publisher for TikTok via the Content Posting API.
 *
 * Publish flow (open.tiktokapis.com) — direct file upload:
 *   1. POST /v2/post/publish/video/init/  — initialise a direct-file upload,
 *        receive an upload URL.
 *   2. PUT  {uploadUrl}  — upload the video binary (chunked transfer).
 *   3. POST /v2/post/publish/video/complete/  — finalise & publish.
 *   4. GET  /v2/post/publish/status/fetch/    — poll publish status.
 *
 * Auth: OAuth2 `Bearer` access token (Content Posting API scope).
 */
export declare class TikTokPublisher extends BasePlatformPublisher {
    readonly platform: DistributionPlatform;
    protected doPublish(request: PublishRequest, videoBuffer: Buffer<ArrayBuffer>, config: PlatformConfig): Promise<PublishResult>;
    protected doGetStatus(platformVideoId: string, config: PlatformConfig): Promise<PublishStatus>;
}
/**
 * Build the default {@link PlatformConfig} for a platform by merging the
 * shared {@link PLATFORM_LIMITS} with the given overrides.
 *
 * @param platform      Target platform.
 * @param overrides     Partial credentials / limits to overlay.
 * @returns A complete PlatformConfig (enabled defaults to false).
 */
export declare function buildPlatformConfig(platform: DistributionPlatform, overrides?: Partial<Omit<PlatformConfig, "platform">>): PlatformConfig;
/** Default {@link DistributionConfig} with every platform disabled. */
export declare const DEFAULT_DISTRIBUTION_CONFIG: DistributionConfig;
/**
 * Orchestrates multi-platform video distribution.
 *
 * Responsibilities:
 *   - Register publishers (built-in or custom) keyed by platform.
 *   - Validate video params (size / duration / format) against platform limits.
 *   - Publish to a single platform (`publishTo`) or fan out to many
 *     platforms in parallel (`publishToAll` via `Promise.allSettled`).
 *   - Poll publish status for a previously-created platform video.
 *   - Expose the list of configured (credential-bearing) platforms.
 *
 * Each publisher is optional: a platform is only registered when its
 * {@link PlatformConfig.enabled} is `true`, so deployments opt into exactly
 * the platforms they have credentials for.
 */
export declare class DistributionManager {
    private readonly publishers;
    private readonly configs;
    private readonly uploadTimeoutMs;
    private readonly publishAllByDefault;
    /**
     * @param config Distribution-level config. Each enabled platform entry
     *   instantiates its built-in publisher automatically.
     */
    constructor(config: DistributionConfig);
    /**
     * Instantiate and register the built-in publisher for a platform config.
     *
     * No-op when no factory exists for the platform (custom publishers must be
     * registered explicitly via {@link registerPublisher}).
     */
    private registerBuiltInPublisher;
    /**
     * Register a custom publisher (overrides any built-in for the same platform).
     *
     * @param publisher The publisher instance to register.
     */
    registerPublisher(publisher: IPlatformPublisher): void;
    /**
     * Publish a video to a single platform.
     *
     * @param request Publish request (must specify `platform`).
     * @returns The publish result for that platform.
     * @throws when no publisher is registered for the requested platform.
     */
    publishTo(request: PublishRequest): Promise<PublishResult>;
    /**
     * Publish a video to multiple platforms in parallel.
     *
     * Uses `Promise.allSettled` so a single platform failure does not abort
     * the others; every platform result (success or failure) is recorded in
     * the returned {@link PublishTask}.
     *
     * @param videoPath  Local video file path.
     * @param title      Video title.
     * @param options    Optional description / tags / cover / target platforms /
     *                   scheduled time. When `platforms` is omitted, publishes
     *                   to every configured (enabled) platform.
     * @returns A PublishTask aggregating all platform results.
     */
    publishToAll(videoPath: string, title: string, options?: {
        description?: string;
        tags?: string[];
        platforms?: DistributionPlatform[];
        coverImagePath?: string;
        scheduledTime?: string;
    }): Promise<PublishTask>;
    /**
     * Poll the publish status of a previously-created platform video.
     *
     * @param platform       Target platform.
     * @param platformVideoId The video id returned by {@link publishTo}.
     * @returns The current {@link PublishStatus}.
     */
    getStatus(platform: DistributionPlatform, platformVideoId: string): Promise<PublishStatus>;
    /**
     * List the platforms that have been registered (enabled + credential-bearing).
     *
     * @returns Array of configured platform ids.
     */
    listConfiguredPlatforms(): DistributionPlatform[];
    /**
     * Get the full {@link PlatformConfig} for a platform.
     *
     * @param platform Target platform.
     * @returns The platform config (throws if missing).
     */
    getPlatformLimits(platform: DistributionPlatform): PlatformConfig;
    /**
     * Validate video parameters against a platform's hard limits.
     *
     * @param platform Target platform.
     * @param params   `{ sizeMB, durationSec, format }` of the video.
     * @returns `{ valid, errors }` — `errors` is empty when valid.
     */
    validateVideo(platform: DistributionPlatform, params: {
        sizeMB: number;
        durationSec: number;
        format: string;
    }): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=distribution.d.ts.map