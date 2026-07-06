import { z } from "zod";
/** A single entry in the confirmed slot — one selected character image. */
export declare const ConfirmedSlotEntrySchema: z.ZodObject<{
    /** Unique ID (the original card filename without extension). */
    id: z.ZodString;
    /** Character name from the Plus-generated card. */
    name: z.ZodString;
    /** Character description from the Plus-generated card. */
    description: z.ZodString;
    /** Role type: protagonist / supporting / NPC. */
    roleType: z.ZodDefault<z.ZodString>;
    /** Gender: male / female / non-binary. */
    gender: z.ZodDefault<z.ZodString>;
    /** Bot type: MID_JOURNEY (realistic) or NIJI_JOURNEY (anime). */
    botType: z.ZodDefault<z.ZodString>;
    /** Theme from Plus config when generated. */
    theme: z.ZodDefault<z.ZodString>;
    /** Visual style from Plus config when generated. */
    style: z.ZodDefault<z.ZodString>;
    /** The selected image URL (WebDAV). */
    imageUrl: z.ZodString;
    /** Original imagePrompt used for MJ generation. */
    imagePrompt: z.ZodDefault<z.ZodString>;
    /** ISO timestamp when the entry was confirmed. */
    confirmedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    theme: string;
    style: string;
    gender: string;
    imageUrl: string;
    botType: string;
    roleType: string;
    imagePrompt: string;
    confirmedAt: string;
}, {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    confirmedAt: string;
    theme?: string | undefined;
    style?: string | undefined;
    gender?: string | undefined;
    botType?: string | undefined;
    roleType?: string | undefined;
    imagePrompt?: string | undefined;
}>;
export type ConfirmedSlotEntry = z.infer<typeof ConfirmedSlotEntrySchema>;
/** Per-novel mapping record: which confirmed image is bound to which character. */
export declare const CharacterImageBindingSchema: z.ZodObject<{
    /** The confirmed slot entry ID. */
    slotEntryId: z.ZodString;
    /** The image URL (for quick lookup without joining). */
    imageUrl: z.ZodString;
    /** The character name in the novel. */
    characterName: z.ZodString;
    /** The character card filename in the novel's characters/ folder. */
    characterFilename: z.ZodString;
    /** ISO timestamp when the binding was created. */
    boundAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    imageUrl: string;
    slotEntryId: string;
    characterName: string;
    characterFilename: string;
    boundAt: string;
}, {
    imageUrl: string;
    slotEntryId: string;
    characterName: string;
    characterFilename: string;
    boundAt: string;
}>;
export type CharacterImageBinding = z.infer<typeof CharacterImageBindingSchema>;
/** Per-novel binding state, stored at {DATA_DIR}/{projectId}/image-bindings.json. */
export declare const NovelBindingStateSchema: z.ZodObject<{
    /** Project ID (novel ID). */
    projectId: z.ZodString;
    /** All bindings for this novel. */
    bindings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** The confirmed slot entry ID. */
        slotEntryId: z.ZodString;
        /** The image URL (for quick lookup without joining). */
        imageUrl: z.ZodString;
        /** The character name in the novel. */
        characterName: z.ZodString;
        /** The character card filename in the novel's characters/ folder. */
        characterFilename: z.ZodString;
        /** ISO timestamp when the binding was created. */
        boundAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        imageUrl: string;
        slotEntryId: string;
        characterName: string;
        characterFilename: string;
        boundAt: string;
    }, {
        imageUrl: string;
        slotEntryId: string;
        characterName: string;
        characterFilename: string;
        boundAt: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    bindings: {
        imageUrl: string;
        slotEntryId: string;
        characterName: string;
        characterFilename: string;
        boundAt: string;
    }[];
}, {
    projectId: string;
    bindings?: {
        imageUrl: string;
        slotEntryId: string;
        characterName: string;
        characterFilename: string;
        boundAt: string;
    }[] | undefined;
}>;
export type NovelBindingState = z.infer<typeof NovelBindingStateSchema>;
/** The global confirmed slot file, stored at {DATA_DIR}/confirmed-slot.json. */
export declare const ConfirmedSlotFileSchema: z.ZodObject<{
    /** All confirmed entries. */
    entries: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Unique ID (the original card filename without extension). */
        id: z.ZodString;
        /** Character name from the Plus-generated card. */
        name: z.ZodString;
        /** Character description from the Plus-generated card. */
        description: z.ZodString;
        /** Role type: protagonist / supporting / NPC. */
        roleType: z.ZodDefault<z.ZodString>;
        /** Gender: male / female / non-binary. */
        gender: z.ZodDefault<z.ZodString>;
        /** Bot type: MID_JOURNEY (realistic) or NIJI_JOURNEY (anime). */
        botType: z.ZodDefault<z.ZodString>;
        /** Theme from Plus config when generated. */
        theme: z.ZodDefault<z.ZodString>;
        /** Visual style from Plus config when generated. */
        style: z.ZodDefault<z.ZodString>;
        /** The selected image URL (WebDAV). */
        imageUrl: z.ZodString;
        /** Original imagePrompt used for MJ generation. */
        imagePrompt: z.ZodDefault<z.ZodString>;
        /** ISO timestamp when the entry was confirmed. */
        confirmedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
        theme: string;
        style: string;
        gender: string;
        imageUrl: string;
        botType: string;
        roleType: string;
        imagePrompt: string;
        confirmedAt: string;
    }, {
        id: string;
        name: string;
        description: string;
        imageUrl: string;
        confirmedAt: string;
        theme?: string | undefined;
        style?: string | undefined;
        gender?: string | undefined;
        botType?: string | undefined;
        roleType?: string | undefined;
        imagePrompt?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    entries: {
        id: string;
        name: string;
        description: string;
        theme: string;
        style: string;
        gender: string;
        imageUrl: string;
        botType: string;
        roleType: string;
        imagePrompt: string;
        confirmedAt: string;
    }[];
}, {
    entries?: {
        id: string;
        name: string;
        description: string;
        imageUrl: string;
        confirmedAt: string;
        theme?: string | undefined;
        style?: string | undefined;
        gender?: string | undefined;
        botType?: string | undefined;
        roleType?: string | undefined;
        imagePrompt?: string | undefined;
    }[] | undefined;
}>;
export type ConfirmedSlotFile = z.infer<typeof ConfirmedSlotFileSchema>;
//# sourceMappingURL=confirmed-slot.d.ts.map