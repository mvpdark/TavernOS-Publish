import { z } from "zod";
import { type AgentContext } from "../agents/base.js";
/** A character extracted from the script. */
export interface ParsedCharacter {
    /** Character name (canonical). */
    name: string;
    /** Biological sex / presented gender. */
    gender: "male" | "female" | "unknown";
    /** Age range, e.g. "20-25" or "少年". */
    ageRange?: string;
    /** Story role, e.g. "男主" / "女主" / "反派". */
    role: string;
    /** Personality description. */
    personality: string;
    /** Appearance description. */
    appearance?: string;
    /** Relationships to other characters. */
    relationships?: string[];
}
/** A scene/location extracted from the script. */
export interface ParsedScene {
    /** Scene name, e.g. "雨夜街头". */
    name: string;
    /** Location, e.g. "室外街道". */
    location: string;
    /** Time of day, e.g. "白天" / "夜晚" / "黄昏". */
    timeOfDay?: string;
    /** Mood / atmosphere. */
    mood?: string;
    /** Scene description. */
    description?: string;
}
/** A prop / item extracted from the script. */
export interface ParsedProp {
    /** Prop name. */
    name: string;
    /** Prop description. */
    description?: string;
    /** Whether this is a plot-critical or minor prop. */
    importance: "key" | "minor";
}
/** A single scene beat (分场概要) — one continuous dramatic unit. */
export interface ParsedSceneBeat {
    /** 1-based scene number (globally renumbered after merge). */
    sceneNumber: number;
    /** Short beat title. */
    title: string;
    /** Character names appearing in this beat. */
    characters: string[];
    /** Scene name this beat belongs to. */
    scene: string;
    /** One-sentence event summary. */
    summary: string;
    /** Emotional tone, e.g. "悲伤" / "愤怒". */
    emotion?: string;
    /** Estimated duration in seconds. */
    estimatedDuration?: number;
}
/** The fully parsed script. */
export interface ParsedScript {
    /** Script title (if inferrable). */
    title?: string;
    /** All characters (de-duplicated). */
    characters: ParsedCharacter[];
    /** All scenes (de-duplicated). */
    scenes: ParsedScene[];
    /** All props (de-duplicated). */
    props: ParsedProp[];
    /** All scene beats, in story order. */
    beats: ParsedSceneBeat[];
    /** Total number of scene beats. */
    totalScenes: number;
    /** Estimated total duration in seconds (sum of beat durations). */
    estimatedTotalDuration?: number;
}
export declare const ParsedCharacterSchema: z.ZodObject<{
    name: z.ZodString;
    gender: z.ZodEffects<z.ZodCatch<z.ZodString>, "unknown" | "male" | "female", unknown>;
    ageRange: z.ZodOptional<z.ZodString>;
    role: z.ZodDefault<z.ZodString>;
    personality: z.ZodDefault<z.ZodString>;
    appearance: z.ZodOptional<z.ZodString>;
    relationships: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    personality: string;
    role: string;
    gender: "unknown" | "male" | "female";
    relationships: string[];
    appearance?: string | undefined;
    ageRange?: string | undefined;
}, {
    name: string;
    personality?: string | undefined;
    role?: string | undefined;
    appearance?: string | undefined;
    gender?: unknown;
    ageRange?: string | undefined;
    relationships?: string[] | undefined;
}>;
export declare const ParsedSceneSchema: z.ZodObject<{
    name: z.ZodString;
    location: z.ZodDefault<z.ZodString>;
    timeOfDay: z.ZodOptional<z.ZodString>;
    mood: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    location: string;
    mood?: string | undefined;
    description?: string | undefined;
    timeOfDay?: string | undefined;
}, {
    name: string;
    mood?: string | undefined;
    location?: string | undefined;
    description?: string | undefined;
    timeOfDay?: string | undefined;
}>;
export declare const ParsedPropSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    importance: z.ZodEffects<z.ZodCatch<z.ZodString>, "key" | "minor", unknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    importance: "key" | "minor";
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    importance?: unknown;
}>;
export declare const ParsedSceneBeatSchema: z.ZodObject<{
    sceneNumber: z.ZodNumber;
    title: z.ZodString;
    characters: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    scene: z.ZodString;
    summary: z.ZodString;
    emotion: z.ZodOptional<z.ZodString>;
    estimatedDuration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title: string;
    characters: string[];
    summary: string;
    scene: string;
    sceneNumber: number;
    emotion?: string | undefined;
    estimatedDuration?: number | undefined;
}, {
    title: string;
    summary: string;
    scene: string;
    sceneNumber: number;
    characters?: string[] | undefined;
    emotion?: string | undefined;
    estimatedDuration?: number | undefined;
}>;
export declare const ParsedScriptSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    characters: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        gender: z.ZodEffects<z.ZodCatch<z.ZodString>, "unknown" | "male" | "female", unknown>;
        ageRange: z.ZodOptional<z.ZodString>;
        role: z.ZodDefault<z.ZodString>;
        personality: z.ZodDefault<z.ZodString>;
        appearance: z.ZodOptional<z.ZodString>;
        relationships: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        personality: string;
        role: string;
        gender: "unknown" | "male" | "female";
        relationships: string[];
        appearance?: string | undefined;
        ageRange?: string | undefined;
    }, {
        name: string;
        personality?: string | undefined;
        role?: string | undefined;
        appearance?: string | undefined;
        gender?: unknown;
        ageRange?: string | undefined;
        relationships?: string[] | undefined;
    }>, "many">>;
    scenes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        location: z.ZodDefault<z.ZodString>;
        timeOfDay: z.ZodOptional<z.ZodString>;
        mood: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        location: string;
        mood?: string | undefined;
        description?: string | undefined;
        timeOfDay?: string | undefined;
    }, {
        name: string;
        mood?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        timeOfDay?: string | undefined;
    }>, "many">>;
    props: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        importance: z.ZodEffects<z.ZodCatch<z.ZodString>, "key" | "minor", unknown>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        importance: "key" | "minor";
        description?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
        importance?: unknown;
    }>, "many">>;
    beats: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sceneNumber: z.ZodNumber;
        title: z.ZodString;
        characters: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        scene: z.ZodString;
        summary: z.ZodString;
        emotion: z.ZodOptional<z.ZodString>;
        estimatedDuration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        characters: string[];
        summary: string;
        scene: string;
        sceneNumber: number;
        emotion?: string | undefined;
        estimatedDuration?: number | undefined;
    }, {
        title: string;
        summary: string;
        scene: string;
        sceneNumber: number;
        characters?: string[] | undefined;
        emotion?: string | undefined;
        estimatedDuration?: number | undefined;
    }>, "many">>;
    totalScenes: z.ZodDefault<z.ZodNumber>;
    estimatedTotalDuration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    characters: {
        name: string;
        personality: string;
        role: string;
        gender: "unknown" | "male" | "female";
        relationships: string[];
        appearance?: string | undefined;
        ageRange?: string | undefined;
    }[];
    scenes: {
        name: string;
        location: string;
        mood?: string | undefined;
        description?: string | undefined;
        timeOfDay?: string | undefined;
    }[];
    props: {
        name: string;
        importance: "key" | "minor";
        description?: string | undefined;
    }[];
    totalScenes: number;
    beats: {
        title: string;
        characters: string[];
        summary: string;
        scene: string;
        sceneNumber: number;
        emotion?: string | undefined;
        estimatedDuration?: number | undefined;
    }[];
    title?: string | undefined;
    estimatedTotalDuration?: number | undefined;
}, {
    title?: string | undefined;
    characters?: {
        name: string;
        personality?: string | undefined;
        role?: string | undefined;
        appearance?: string | undefined;
        gender?: unknown;
        ageRange?: string | undefined;
        relationships?: string[] | undefined;
    }[] | undefined;
    scenes?: {
        name: string;
        mood?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        timeOfDay?: string | undefined;
    }[] | undefined;
    props?: {
        name: string;
        description?: string | undefined;
        importance?: unknown;
    }[] | undefined;
    totalScenes?: number | undefined;
    beats?: {
        title: string;
        summary: string;
        scene: string;
        sceneNumber: number;
        characters?: string[] | undefined;
        emotion?: string | undefined;
        estimatedDuration?: number | undefined;
    }[] | undefined;
    estimatedTotalDuration?: number | undefined;
}>;
/** Options for {@link ScriptParser.parse}. */
export interface ScriptParseOptions {
    /** Max characters per chunk (default 5000). */
    maxChunkSize?: number;
    /** Progress callback: (chunksCompleted, totalChunks). */
    onProgress?: (current: number, total: number) => void;
    /** Chunk parse concurrency (default 3). Set to 1 for strictly sequential. */
    concurrency?: number;
    /** Sampling temperature (default 0.3). */
    temperature?: number;
    /** Max output tokens per chunk (default 8000). */
    maxTokens?: number;
    /** Abort signal; aborted chunks are skipped. */
    signal?: AbortSignal;
    /** Called when a single chunk fails to parse (does not abort the run). */
    onChunkError?: (chunkIndex: number, error: unknown) => void;
}
/**
 * Intelligent script parser.
 *
 * Splits a long script (up to ~50k characters) into chunks, parses each chunk
 * via the LLM into characters / scenes / props / beats, then merges and
 * de-duplicates the results. A single chunk failure is non-fatal.
 *
 * @example
 * ```ts
 * const parser = new ScriptParser(ctx);
 * const result = await parser.parse(novelText, {
 *   onProgress: (cur, total) => console.log(`${cur}/${total}`),
 * });
 * ```
 */
export declare class ScriptParser {
    private readonly runtime;
    constructor(ctx: AgentContext);
    /**
     * Parse a full script into structured elements.
     *
     * @param script   The raw script / novel text.
     * @param options  Chunking, concurrency, progress, and abort options.
     * @returns        The merged {@link ParsedScript}.
     */
    parse(script: string, options?: ScriptParseOptions): Promise<ParsedScript>;
    /**
     * Parse a single chunk. Tries the strict schema first, then falls back to a
     * lenient per-element parse so one bad entry does not discard the chunk.
     */
    private parseChunk;
}
//# sourceMappingURL=script-parser.d.ts.map