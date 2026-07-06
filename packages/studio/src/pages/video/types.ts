// Video page shared type definitions.

import type { SavedClip } from "../../shared/types.js";
import type { VideoReviewResult, ComposeResult } from "@tavernos/core";

// Re-export shared types so existing imports from video/types still work.
export type { SavedClip, VideoReviewResult, ComposeResult };

export interface ClipsResponse {
  clips: SavedClip[];
}

export interface ReviewResponse {
  review: VideoReviewResult;
}

/** SSE event with optional i18n messageKey for language-aware status messages. */
export interface SseEvent {
  type: "status" | "progress" | "done" | "error";
  /** Human-readable message (legacy, untranslated). */
  message?: string;
  /** i18n key for translation on the frontend (preferred over message). */
  messageKey?: string;
  /** Interpolation params for the i18n key. */
  messageParams?: Record<string, unknown>;
  error?: string;
}

export interface ComposeSseEvent extends SseEvent {
  current?: number;
  total?: number;
  result?: ComposeResult;
}

/** SSE event streamed by POST /videos/pipeline (generate → review → reroll → compose). */
export type PipelineSseEvent =
  | {
      type: "status";
      message?: string;
      messageKey?: string;
      messageParams?: Record<string, unknown>;
    }
  | {
      type: "clip_generated";
      clipId?: string;
      clipNumber?: number;
      attempt?: number;
      videoUrl?: string;
    }
  | {
      type: "clip_reviewed";
      clipId?: string;
      clipNumber?: number;
      verdict?: string;
      score?: number;
      attempt?: number;
    }
  | {
      type: "clip_failed";
      clipId?: string;
      clipNumber?: number;
      error?: string;
    }
  | {
      type: "compose_progress";
      message?: string;
    }
  | {
      type: "done";
      success?: boolean;
      totalClips?: number;
      passedClips?: number;
      failedClips?: number;
      composeResult?: ComposeResult;
      outputPath?: string;
      errors?: string[];
    }
  | {
      type: "error";
      message?: string;
      messageKey?: string;
      error?: string;
    }
  | { type: "lip_sync_applied"; clipId: string; clipNumber: number; success: boolean }
  | { type: "consistency_checked"; clipId: string; clipNumber: number; score: number; passed: boolean };

export interface GenerateSseEvent extends SseEvent {
  clip?: SavedClip;
}
