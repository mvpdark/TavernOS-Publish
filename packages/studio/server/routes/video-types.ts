// ---------------------------------------------------------------------------
// Video route type definitions: request bodies + persisted clip record.
//
// Pure contracts module — no runtime logic, no side-effects.
// Imported by video.ts (router) and video-helpers.ts (business logic).
// ---------------------------------------------------------------------------

import type {
  VideoClip,
  Transition,
  ComposeConfig,
} from "@tavernos/core";
import type { SavedClip } from "../../src/shared/types";

// Re-export SavedClip so existing imports from video-types still work.
export type { SavedClip };

/** POST /videos/generate request body. */
export interface GenerateBody {
  prompt: string;
  referenceImageUrl?: string;
  /** Multiple reference image URLs for omni_reference mode (up to 9). */
  referenceImageUrls?: string[];
  /** Reference audio URLs for omni_reference mode (up to 3, MP3/WAV). */
  referenceAudioUrls?: string[];
  duration?: number;
  model?: string;
  chapterId?: number;
  clipNumber?: number;
}

/** POST /videos/review request body. */
export interface ReviewBody {
  clip: VideoClip;
  scriptContext: string;
  referenceImages?: string[];
  /** When provided, the review result is persisted to the clip's JSON file. */
  clipId?: string;
}

/** POST /videos/compose request body. */
export interface ComposeBody {
  clips: VideoClip[];
  transitions?: Transition[];
  /** Ignored by the backend for security — the server always generates a safe output path. */
  outputPath?: string;
  config?: Partial<ComposeConfig>;
}

/** POST /videos/parse-script request body. */
export interface ParseScriptBody {
  script: string;
  maxChunkSize?: number;
}

/** POST /videos/export-jianying request body. */
export interface ExportJianyingBody {
  clips: VideoClip[];
  /** Ignored by the backend for security — the server always generates a safe output path. */
  outputPath?: string;
  includeSubtitles?: boolean;
}

// ---------------------------------------------------------------------------
// Character management types
// ---------------------------------------------------------------------------

/** POST /projects/:projectId/characters request body — create a new character. */
export interface CreateCharacterBody {
  name: string;
  gender: "male" | "female";
  ageRange?: string;
  role: string;
  appearance?: string;
  personality?: string;
  clothing?: string;
  referenceImages?: Array<{ url: string; type: string; label?: string }>;
}

/** POST /projects/:projectId/characters/:id/generate-three-view request body. */
export interface GenerateThreeViewBody {
  characterId: string;
}

// ---------------------------------------------------------------------------
// Prompt template query types
// ---------------------------------------------------------------------------

/** GET /projects/:projectId/videos/prompt-templates query parameters. */
export interface PromptTemplateQuery {
  category?: string;
  tag?: string;
  keyword?: string;
  limit?: number;
  sort?: "popular" | "rating" | "newest";
}

// ---------------------------------------------------------------------------
// Lip sync types
// ---------------------------------------------------------------------------

/** POST /projects/:projectId/videos/lip-sync request body. */
export interface LipSyncBody {
  videoUrl: string;
  videoLocalPath?: string;
  audioUrl: string;
  audioLocalPath?: string;
  characterImage?: string;
  provider?: string;
  /** Ignored by the backend for security — the server always generates a safe output path. */
  outputPath?: string;
}

// ---------------------------------------------------------------------------
// Billing query types
// ---------------------------------------------------------------------------

/** GET /videos/billing/summary query. */
export interface BillingSummaryQuery {
  startDate?: string;
  endDate?: string;
  groupBy?: "provider" | "operation" | "date";
}
