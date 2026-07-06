// ---------------------------------------------------------------------------
// Confirmed Slot — a global library of character images that users have
// selected from the Plus module's 4-to-1 pick. These images are available
// for LLM-driven matching when writing novels.
//
// Key rules:
// - The confirmed slot is a GLOBAL library (shared across all novels).
// - Each novel maintains its own "used images" mapping independently.
// - Within a single novel, one confirmed image can only be bound to one character.
// - Two different novels can bind the same image independently.
// ---------------------------------------------------------------------------
import { z } from "zod";
/** A single entry in the confirmed slot — one selected character image. */
export const ConfirmedSlotEntrySchema = z.object({
    /** Unique ID (the original card filename without extension). */
    id: z.string().min(1),
    /** Character name from the Plus-generated card. */
    name: z.string(),
    /** Character description from the Plus-generated card. */
    description: z.string(),
    /** Role type: protagonist / supporting / NPC. */
    roleType: z.string().default(""),
    /** Gender: male / female / non-binary. */
    gender: z.string().default(""),
    /** Bot type: MID_JOURNEY (realistic) or NIJI_JOURNEY (anime). */
    botType: z.string().default("MID_JOURNEY"),
    /** Theme from Plus config when generated. */
    theme: z.string().default(""),
    /** Visual style from Plus config when generated. */
    style: z.string().default(""),
    /** The selected image URL (WebDAV). */
    imageUrl: z.string().url(),
    /** Original imagePrompt used for MJ generation. */
    imagePrompt: z.string().default(""),
    /** ISO timestamp when the entry was confirmed. */
    confirmedAt: z.string(),
});
/** Per-novel mapping record: which confirmed image is bound to which character. */
export const CharacterImageBindingSchema = z.object({
    /** The confirmed slot entry ID. */
    slotEntryId: z.string(),
    /** The image URL (for quick lookup without joining). */
    imageUrl: z.string().url(),
    /** The character name in the novel. */
    characterName: z.string(),
    /** The character card filename in the novel's characters/ folder. */
    characterFilename: z.string(),
    /** ISO timestamp when the binding was created. */
    boundAt: z.string(),
});
/** Per-novel binding state, stored at {DATA_DIR}/{projectId}/image-bindings.json. */
export const NovelBindingStateSchema = z.object({
    /** Project ID (novel ID). */
    projectId: z.string(),
    /** All bindings for this novel. */
    bindings: z.array(CharacterImageBindingSchema).default([]),
});
/** The global confirmed slot file, stored at {DATA_DIR}/confirmed-slot.json. */
export const ConfirmedSlotFileSchema = z.object({
    /** All confirmed entries. */
    entries: z.array(ConfirmedSlotEntrySchema).default([]),
});
//# sourceMappingURL=confirmed-slot.js.map