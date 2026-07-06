// packages/core/src/timeline/types.ts
// Timeline awareness — type definitions for temporal tracking.
//
// The timeline sense module tracks when events happen relative to the
// narrative's internal clock (chapters, in-story time) and provides
// temporal recall ("the last time this character appeared was chapter 7").
import { z } from "zod";
// ---------------------------------------------------------------------------
// Timeline Anchor — a temporal marker for a story event
// ---------------------------------------------------------------------------
export const TimelineAnchorSchema = z.object({
    id: z.string(),
    chapterIndex: z.number().int().min(0),
    label: z.string(), // 简短描述 (e.g. "杨过断臂")
    inStoryTime: z.string().optional(), // 故事内时间 (e.g. "第三年冬")
    characters: z.array(z.string()).default([]),
    location: z.string().optional(),
    anchorType: z.enum(["event", "milestone", "flashback", "flashforward", "timeskip"]).default("event"),
    significance: z.number().min(0).max(1).default(0.5),
    createdAt: z.string(),
});
//# sourceMappingURL=types.js.map