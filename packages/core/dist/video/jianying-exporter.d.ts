import { z } from "zod";
import type { VideoClip } from "./types.js";
import type { Transition } from "./edl.js";
/** Time range in microseconds (start + duration). */
declare const TimeRangeSchema: z.ZodObject<{
    start: z.ZodNumber;
    duration: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    duration: number;
    start: number;
}, {
    duration: number;
    start: number;
}>;
/** Transform properties for a segment clip (position, scale). */
declare const ClipTransformSchema: z.ZodObject<{
    x: z.ZodDefault<z.ZodNumber>;
    y: z.ZodDefault<z.ZodNumber>;
    scale: z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x?: number | undefined;
        y?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    scale: {
        x: number;
        y: number;
    };
}, {
    scale: {
        x?: number | undefined;
        y?: number | undefined;
    };
    x?: number | undefined;
    y?: number | undefined;
}>;
/** Clip properties (alpha, rotation, transform). */
declare const ClipSchema: z.ZodObject<{
    alpha: z.ZodDefault<z.ZodNumber>;
    rotation: z.ZodDefault<z.ZodNumber>;
    transform: z.ZodDefault<z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
        scale: z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x?: number | undefined;
            y?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        scale: {
            x: number;
            y: number;
        };
    }, {
        scale: {
            x?: number | undefined;
            y?: number | undefined;
        };
        x?: number | undefined;
        y?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    transform: {
        x: number;
        y: number;
        scale: {
            x: number;
            y: number;
        };
    };
    alpha: number;
    rotation: number;
}, {
    transform?: {
        scale: {
            x?: number | undefined;
            y?: number | undefined;
        };
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    alpha?: number | undefined;
    rotation?: number | undefined;
}>;
/** Video material — references a video file with metadata. */
declare const VideoMaterialSchema: z.ZodObject<{
    id: z.ZodString;
    path: z.ZodString;
    duration: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fps: z.ZodNumber;
    type: z.ZodDefault<z.ZodLiteral<"video">>;
    create_time: z.ZodNumber;
    import_time: z.ZodNumber;
    md5: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    type: "video";
    id: string;
    duration: number;
    md5: string;
    width: number;
    height: number;
    fps: number;
    create_time: number;
    import_time: number;
}, {
    path: string;
    id: string;
    duration: number;
    width: number;
    height: number;
    fps: number;
    create_time: number;
    import_time: number;
    type?: "video" | undefined;
    md5?: string | undefined;
}>;
/** Audio material — references an audio file with metadata. */
declare const AudioMaterialSchema: z.ZodObject<{
    id: z.ZodString;
    path: z.ZodString;
    duration: z.ZodNumber;
    type: z.ZodDefault<z.ZodLiteral<"audio">>;
    create_time: z.ZodNumber;
    import_time: z.ZodNumber;
    md5: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    type: "audio";
    id: string;
    duration: number;
    md5: string;
    create_time: number;
    import_time: number;
}, {
    path: string;
    id: string;
    duration: number;
    create_time: number;
    import_time: number;
    type?: "audio" | undefined;
    md5?: string | undefined;
}>;
/** Text material — subtitle/text content with styling. */
declare const TextMaterialSchema: z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    text_url: z.ZodDefault<z.ZodString>;
    duration: z.ZodNumber;
    type: z.ZodDefault<z.ZodLiteral<"text">>;
    text_size: z.ZodDefault<z.ZodNumber>;
    text_color: z.ZodDefault<z.ZodString>;
    text_alpha: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "text";
    id: string;
    content: string;
    duration: number;
    text_url: string;
    text_size: number;
    text_color: string;
    text_alpha: number;
}, {
    id: string;
    content: string;
    duration: number;
    type?: "text" | undefined;
    text_url?: string | undefined;
    text_size?: number | undefined;
    text_color?: string | undefined;
    text_alpha?: number | undefined;
}>;
/** Transition material — defines a transition effect between segments. */
declare const TransitionMaterialSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodDefault<z.ZodLiteral<"transition">>;
    name: z.ZodString;
    duration: z.ZodNumber;
    transition_type: z.ZodString;
    param: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "transition";
    id: string;
    name: string;
    duration: number;
    transition_type: string;
    param: Record<string, any>;
}, {
    id: string;
    name: string;
    duration: number;
    transition_type: string;
    type?: "transition" | undefined;
    param?: Record<string, any> | undefined;
}>;
/** Materials collection — all media assets referenced by tracks. */
declare const DraftMaterialsSchema: z.ZodObject<{
    videos: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        path: z.ZodString;
        duration: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
        fps: z.ZodNumber;
        type: z.ZodDefault<z.ZodLiteral<"video">>;
        create_time: z.ZodNumber;
        import_time: z.ZodNumber;
        md5: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        type: "video";
        id: string;
        duration: number;
        md5: string;
        width: number;
        height: number;
        fps: number;
        create_time: number;
        import_time: number;
    }, {
        path: string;
        id: string;
        duration: number;
        width: number;
        height: number;
        fps: number;
        create_time: number;
        import_time: number;
        type?: "video" | undefined;
        md5?: string | undefined;
    }>, "many">>;
    audios: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        path: z.ZodString;
        duration: z.ZodNumber;
        type: z.ZodDefault<z.ZodLiteral<"audio">>;
        create_time: z.ZodNumber;
        import_time: z.ZodNumber;
        md5: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        type: "audio";
        id: string;
        duration: number;
        md5: string;
        create_time: number;
        import_time: number;
    }, {
        path: string;
        id: string;
        duration: number;
        create_time: number;
        import_time: number;
        type?: "audio" | undefined;
        md5?: string | undefined;
    }>, "many">>;
    texts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        content: z.ZodString;
        text_url: z.ZodDefault<z.ZodString>;
        duration: z.ZodNumber;
        type: z.ZodDefault<z.ZodLiteral<"text">>;
        text_size: z.ZodDefault<z.ZodNumber>;
        text_color: z.ZodDefault<z.ZodString>;
        text_alpha: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "text";
        id: string;
        content: string;
        duration: number;
        text_url: string;
        text_size: number;
        text_color: string;
        text_alpha: number;
    }, {
        id: string;
        content: string;
        duration: number;
        type?: "text" | undefined;
        text_url?: string | undefined;
        text_size?: number | undefined;
        text_color?: string | undefined;
        text_alpha?: number | undefined;
    }>, "many">>;
    transitions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodDefault<z.ZodLiteral<"transition">>;
        name: z.ZodString;
        duration: z.ZodNumber;
        transition_type: z.ZodString;
        param: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "transition";
        id: string;
        name: string;
        duration: number;
        transition_type: string;
        param: Record<string, any>;
    }, {
        id: string;
        name: string;
        duration: number;
        transition_type: string;
        type?: "transition" | undefined;
        param?: Record<string, any> | undefined;
    }>, "many">>;
    stickers: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    effects: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    audio_effects: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    video_effects: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    speeds: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    animations: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    audio_fades: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    masks: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    canvases: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
}, "strip", z.ZodTypeAny, {
    transitions: {
        type: "transition";
        id: string;
        name: string;
        duration: number;
        transition_type: string;
        param: Record<string, any>;
    }[];
    videos: {
        path: string;
        type: "video";
        id: string;
        duration: number;
        md5: string;
        width: number;
        height: number;
        fps: number;
        create_time: number;
        import_time: number;
    }[];
    audios: {
        path: string;
        type: "audio";
        id: string;
        duration: number;
        md5: string;
        create_time: number;
        import_time: number;
    }[];
    texts: {
        type: "text";
        id: string;
        content: string;
        duration: number;
        text_url: string;
        text_size: number;
        text_color: string;
        text_alpha: number;
    }[];
    stickers: any[];
    effects: any[];
    audio_effects: any[];
    video_effects: any[];
    speeds: any[];
    animations: any[];
    audio_fades: any[];
    masks: any[];
    canvases: any[];
}, {
    transitions?: {
        id: string;
        name: string;
        duration: number;
        transition_type: string;
        type?: "transition" | undefined;
        param?: Record<string, any> | undefined;
    }[] | undefined;
    videos?: {
        path: string;
        id: string;
        duration: number;
        width: number;
        height: number;
        fps: number;
        create_time: number;
        import_time: number;
        type?: "video" | undefined;
        md5?: string | undefined;
    }[] | undefined;
    audios?: {
        path: string;
        id: string;
        duration: number;
        create_time: number;
        import_time: number;
        type?: "audio" | undefined;
        md5?: string | undefined;
    }[] | undefined;
    texts?: {
        id: string;
        content: string;
        duration: number;
        type?: "text" | undefined;
        text_url?: string | undefined;
        text_size?: number | undefined;
        text_color?: string | undefined;
        text_alpha?: number | undefined;
    }[] | undefined;
    stickers?: any[] | undefined;
    effects?: any[] | undefined;
    audio_effects?: any[] | undefined;
    video_effects?: any[] | undefined;
    speeds?: any[] | undefined;
    animations?: any[] | undefined;
    audio_fades?: any[] | undefined;
    masks?: any[] | undefined;
    canvases?: any[] | undefined;
}>;
/** Segment — a clip instance on a track referencing a material. */
declare const DraftSegmentSchema: z.ZodObject<{
    id: z.ZodString;
    material_id: z.ZodString;
    target_timerange: z.ZodObject<{
        start: z.ZodNumber;
        duration: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        start: number;
    }, {
        duration: number;
        start: number;
    }>;
    source_timerange: z.ZodOptional<z.ZodObject<{
        start: z.ZodNumber;
        duration: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        start: number;
    }, {
        duration: number;
        start: number;
    }>>;
    speed: z.ZodDefault<z.ZodNumber>;
    volume: z.ZodDefault<z.ZodNumber>;
    clip: z.ZodOptional<z.ZodObject<{
        alpha: z.ZodDefault<z.ZodNumber>;
        rotation: z.ZodDefault<z.ZodNumber>;
        transform: z.ZodDefault<z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
            scale: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x?: number | undefined;
                y?: number | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            scale: {
                x: number;
                y: number;
            };
        }, {
            scale: {
                x?: number | undefined;
                y?: number | undefined;
            };
            x?: number | undefined;
            y?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        transform: {
            x: number;
            y: number;
            scale: {
                x: number;
                y: number;
            };
        };
        alpha: number;
        rotation: number;
    }, {
        transform?: {
            scale: {
                x?: number | undefined;
                y?: number | undefined;
            };
            x?: number | undefined;
            y?: number | undefined;
        } | undefined;
        alpha?: number | undefined;
        rotation?: number | undefined;
    }>>;
    animations: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    effects: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    filters: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    transition: z.ZodDefault<z.ZodUnion<[z.ZodNull, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodDefault<z.ZodLiteral<"transition">>;
        name: z.ZodString;
        duration: z.ZodNumber;
        transition_type: z.ZodString;
        param: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "transition";
        id: string;
        name: string;
        duration: number;
        transition_type: string;
        param: Record<string, any>;
    }, {
        id: string;
        name: string;
        duration: number;
        transition_type: string;
        type?: "transition" | undefined;
        param?: Record<string, any> | undefined;
    }>]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    speed: number;
    transition: {
        type: "transition";
        id: string;
        name: string;
        duration: number;
        transition_type: string;
        param: Record<string, any>;
    } | null;
    volume: number;
    effects: any[];
    animations: any[];
    material_id: string;
    target_timerange: {
        duration: number;
        start: number;
    };
    filters: any[];
    clip?: {
        transform: {
            x: number;
            y: number;
            scale: {
                x: number;
                y: number;
            };
        };
        alpha: number;
        rotation: number;
    } | undefined;
    source_timerange?: {
        duration: number;
        start: number;
    } | undefined;
}, {
    id: string;
    material_id: string;
    target_timerange: {
        duration: number;
        start: number;
    };
    speed?: number | undefined;
    clip?: {
        transform?: {
            scale: {
                x?: number | undefined;
                y?: number | undefined;
            };
            x?: number | undefined;
            y?: number | undefined;
        } | undefined;
        alpha?: number | undefined;
        rotation?: number | undefined;
    } | undefined;
    transition?: {
        id: string;
        name: string;
        duration: number;
        transition_type: string;
        type?: "transition" | undefined;
        param?: Record<string, any> | undefined;
    } | null | undefined;
    volume?: number | undefined;
    effects?: any[] | undefined;
    animations?: any[] | undefined;
    source_timerange?: {
        duration: number;
        start: number;
    } | undefined;
    filters?: any[] | undefined;
}>;
/** Track — a timeline layer containing segments of the same type. */
declare const DraftTrackSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["video", "audio", "text", "sticker"]>;
    name: z.ZodString;
    render_index: z.ZodNumber;
    mute: z.ZodDefault<z.ZodBoolean>;
    segments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        material_id: z.ZodString;
        target_timerange: z.ZodObject<{
            start: z.ZodNumber;
            duration: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            duration: number;
            start: number;
        }, {
            duration: number;
            start: number;
        }>;
        source_timerange: z.ZodOptional<z.ZodObject<{
            start: z.ZodNumber;
            duration: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            duration: number;
            start: number;
        }, {
            duration: number;
            start: number;
        }>>;
        speed: z.ZodDefault<z.ZodNumber>;
        volume: z.ZodDefault<z.ZodNumber>;
        clip: z.ZodOptional<z.ZodObject<{
            alpha: z.ZodDefault<z.ZodNumber>;
            rotation: z.ZodDefault<z.ZodNumber>;
            transform: z.ZodDefault<z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                scale: z.ZodObject<{
                    x: z.ZodDefault<z.ZodNumber>;
                    y: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x?: number | undefined;
                    y?: number | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
                scale: {
                    x: number;
                    y: number;
                };
            }, {
                scale: {
                    x?: number | undefined;
                    y?: number | undefined;
                };
                x?: number | undefined;
                y?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            transform: {
                x: number;
                y: number;
                scale: {
                    x: number;
                    y: number;
                };
            };
            alpha: number;
            rotation: number;
        }, {
            transform?: {
                scale: {
                    x?: number | undefined;
                    y?: number | undefined;
                };
                x?: number | undefined;
                y?: number | undefined;
            } | undefined;
            alpha?: number | undefined;
            rotation?: number | undefined;
        }>>;
        animations: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        effects: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        filters: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        transition: z.ZodDefault<z.ZodUnion<[z.ZodNull, z.ZodObject<{
            id: z.ZodString;
            type: z.ZodDefault<z.ZodLiteral<"transition">>;
            name: z.ZodString;
            duration: z.ZodNumber;
            transition_type: z.ZodString;
            param: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            type: "transition";
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            param: Record<string, any>;
        }, {
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            type?: "transition" | undefined;
            param?: Record<string, any> | undefined;
        }>]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        speed: number;
        transition: {
            type: "transition";
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            param: Record<string, any>;
        } | null;
        volume: number;
        effects: any[];
        animations: any[];
        material_id: string;
        target_timerange: {
            duration: number;
            start: number;
        };
        filters: any[];
        clip?: {
            transform: {
                x: number;
                y: number;
                scale: {
                    x: number;
                    y: number;
                };
            };
            alpha: number;
            rotation: number;
        } | undefined;
        source_timerange?: {
            duration: number;
            start: number;
        } | undefined;
    }, {
        id: string;
        material_id: string;
        target_timerange: {
            duration: number;
            start: number;
        };
        speed?: number | undefined;
        clip?: {
            transform?: {
                scale: {
                    x?: number | undefined;
                    y?: number | undefined;
                };
                x?: number | undefined;
                y?: number | undefined;
            } | undefined;
            alpha?: number | undefined;
            rotation?: number | undefined;
        } | undefined;
        transition?: {
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            type?: "transition" | undefined;
            param?: Record<string, any> | undefined;
        } | null | undefined;
        volume?: number | undefined;
        effects?: any[] | undefined;
        animations?: any[] | undefined;
        source_timerange?: {
            duration: number;
            start: number;
        } | undefined;
        filters?: any[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "text" | "audio" | "video" | "sticker";
    id: string;
    name: string;
    render_index: number;
    mute: boolean;
    segments: {
        id: string;
        speed: number;
        transition: {
            type: "transition";
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            param: Record<string, any>;
        } | null;
        volume: number;
        effects: any[];
        animations: any[];
        material_id: string;
        target_timerange: {
            duration: number;
            start: number;
        };
        filters: any[];
        clip?: {
            transform: {
                x: number;
                y: number;
                scale: {
                    x: number;
                    y: number;
                };
            };
            alpha: number;
            rotation: number;
        } | undefined;
        source_timerange?: {
            duration: number;
            start: number;
        } | undefined;
    }[];
}, {
    type: "text" | "audio" | "video" | "sticker";
    id: string;
    name: string;
    render_index: number;
    mute?: boolean | undefined;
    segments?: {
        id: string;
        material_id: string;
        target_timerange: {
            duration: number;
            start: number;
        };
        speed?: number | undefined;
        clip?: {
            transform?: {
                scale: {
                    x?: number | undefined;
                    y?: number | undefined;
                };
                x?: number | undefined;
                y?: number | undefined;
            } | undefined;
            alpha?: number | undefined;
            rotation?: number | undefined;
        } | undefined;
        transition?: {
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            type?: "transition" | undefined;
            param?: Record<string, any> | undefined;
        } | null | undefined;
        volume?: number | undefined;
        effects?: any[] | undefined;
        animations?: any[] | undefined;
        source_timerange?: {
            duration: number;
            start: number;
        } | undefined;
        filters?: any[] | undefined;
    }[] | undefined;
}>;
/** Canvas configuration — resolution, aspect ratio, frame rate. */
declare const CanvasConfigSchema: z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
    ratio: z.ZodString;
    fps: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    ratio: string;
    width: number;
    height: number;
    fps: number;
}, {
    ratio: string;
    width: number;
    height: number;
    fps: number;
}>;
/** Draft project — top-level .draft file structure. */
declare const DraftProjectSchema: z.ZodObject<{
    id: z.ZodString;
    canvas_config: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
        ratio: z.ZodString;
        fps: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        ratio: string;
        width: number;
        height: number;
        fps: number;
    }, {
        ratio: string;
        width: number;
        height: number;
        fps: number;
    }>;
    duration: z.ZodNumber;
    materials: z.ZodObject<{
        videos: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            path: z.ZodString;
            duration: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
            fps: z.ZodNumber;
            type: z.ZodDefault<z.ZodLiteral<"video">>;
            create_time: z.ZodNumber;
            import_time: z.ZodNumber;
            md5: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            type: "video";
            id: string;
            duration: number;
            md5: string;
            width: number;
            height: number;
            fps: number;
            create_time: number;
            import_time: number;
        }, {
            path: string;
            id: string;
            duration: number;
            width: number;
            height: number;
            fps: number;
            create_time: number;
            import_time: number;
            type?: "video" | undefined;
            md5?: string | undefined;
        }>, "many">>;
        audios: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            path: z.ZodString;
            duration: z.ZodNumber;
            type: z.ZodDefault<z.ZodLiteral<"audio">>;
            create_time: z.ZodNumber;
            import_time: z.ZodNumber;
            md5: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            type: "audio";
            id: string;
            duration: number;
            md5: string;
            create_time: number;
            import_time: number;
        }, {
            path: string;
            id: string;
            duration: number;
            create_time: number;
            import_time: number;
            type?: "audio" | undefined;
            md5?: string | undefined;
        }>, "many">>;
        texts: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            content: z.ZodString;
            text_url: z.ZodDefault<z.ZodString>;
            duration: z.ZodNumber;
            type: z.ZodDefault<z.ZodLiteral<"text">>;
            text_size: z.ZodDefault<z.ZodNumber>;
            text_color: z.ZodDefault<z.ZodString>;
            text_alpha: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type: "text";
            id: string;
            content: string;
            duration: number;
            text_url: string;
            text_size: number;
            text_color: string;
            text_alpha: number;
        }, {
            id: string;
            content: string;
            duration: number;
            type?: "text" | undefined;
            text_url?: string | undefined;
            text_size?: number | undefined;
            text_color?: string | undefined;
            text_alpha?: number | undefined;
        }>, "many">>;
        transitions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodDefault<z.ZodLiteral<"transition">>;
            name: z.ZodString;
            duration: z.ZodNumber;
            transition_type: z.ZodString;
            param: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            type: "transition";
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            param: Record<string, any>;
        }, {
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            type?: "transition" | undefined;
            param?: Record<string, any> | undefined;
        }>, "many">>;
        stickers: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        effects: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        audio_effects: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        video_effects: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        speeds: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        animations: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        audio_fades: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        masks: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        canvases: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        transitions: {
            type: "transition";
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            param: Record<string, any>;
        }[];
        videos: {
            path: string;
            type: "video";
            id: string;
            duration: number;
            md5: string;
            width: number;
            height: number;
            fps: number;
            create_time: number;
            import_time: number;
        }[];
        audios: {
            path: string;
            type: "audio";
            id: string;
            duration: number;
            md5: string;
            create_time: number;
            import_time: number;
        }[];
        texts: {
            type: "text";
            id: string;
            content: string;
            duration: number;
            text_url: string;
            text_size: number;
            text_color: string;
            text_alpha: number;
        }[];
        stickers: any[];
        effects: any[];
        audio_effects: any[];
        video_effects: any[];
        speeds: any[];
        animations: any[];
        audio_fades: any[];
        masks: any[];
        canvases: any[];
    }, {
        transitions?: {
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            type?: "transition" | undefined;
            param?: Record<string, any> | undefined;
        }[] | undefined;
        videos?: {
            path: string;
            id: string;
            duration: number;
            width: number;
            height: number;
            fps: number;
            create_time: number;
            import_time: number;
            type?: "video" | undefined;
            md5?: string | undefined;
        }[] | undefined;
        audios?: {
            path: string;
            id: string;
            duration: number;
            create_time: number;
            import_time: number;
            type?: "audio" | undefined;
            md5?: string | undefined;
        }[] | undefined;
        texts?: {
            id: string;
            content: string;
            duration: number;
            type?: "text" | undefined;
            text_url?: string | undefined;
            text_size?: number | undefined;
            text_color?: string | undefined;
            text_alpha?: number | undefined;
        }[] | undefined;
        stickers?: any[] | undefined;
        effects?: any[] | undefined;
        audio_effects?: any[] | undefined;
        video_effects?: any[] | undefined;
        speeds?: any[] | undefined;
        animations?: any[] | undefined;
        audio_fades?: any[] | undefined;
        masks?: any[] | undefined;
        canvases?: any[] | undefined;
    }>;
    tracks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["video", "audio", "text", "sticker"]>;
        name: z.ZodString;
        render_index: z.ZodNumber;
        mute: z.ZodDefault<z.ZodBoolean>;
        segments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            material_id: z.ZodString;
            target_timerange: z.ZodObject<{
                start: z.ZodNumber;
                duration: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                duration: number;
                start: number;
            }, {
                duration: number;
                start: number;
            }>;
            source_timerange: z.ZodOptional<z.ZodObject<{
                start: z.ZodNumber;
                duration: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                duration: number;
                start: number;
            }, {
                duration: number;
                start: number;
            }>>;
            speed: z.ZodDefault<z.ZodNumber>;
            volume: z.ZodDefault<z.ZodNumber>;
            clip: z.ZodOptional<z.ZodObject<{
                alpha: z.ZodDefault<z.ZodNumber>;
                rotation: z.ZodDefault<z.ZodNumber>;
                transform: z.ZodDefault<z.ZodObject<{
                    x: z.ZodDefault<z.ZodNumber>;
                    y: z.ZodDefault<z.ZodNumber>;
                    scale: z.ZodObject<{
                        x: z.ZodDefault<z.ZodNumber>;
                        y: z.ZodDefault<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x?: number | undefined;
                        y?: number | undefined;
                    }>;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                    scale: {
                        x: number;
                        y: number;
                    };
                }, {
                    scale: {
                        x?: number | undefined;
                        y?: number | undefined;
                    };
                    x?: number | undefined;
                    y?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                transform: {
                    x: number;
                    y: number;
                    scale: {
                        x: number;
                        y: number;
                    };
                };
                alpha: number;
                rotation: number;
            }, {
                transform?: {
                    scale: {
                        x?: number | undefined;
                        y?: number | undefined;
                    };
                    x?: number | undefined;
                    y?: number | undefined;
                } | undefined;
                alpha?: number | undefined;
                rotation?: number | undefined;
            }>>;
            animations: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
            effects: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
            filters: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
            transition: z.ZodDefault<z.ZodUnion<[z.ZodNull, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodDefault<z.ZodLiteral<"transition">>;
                name: z.ZodString;
                duration: z.ZodNumber;
                transition_type: z.ZodString;
                param: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                type: "transition";
                id: string;
                name: string;
                duration: number;
                transition_type: string;
                param: Record<string, any>;
            }, {
                id: string;
                name: string;
                duration: number;
                transition_type: string;
                type?: "transition" | undefined;
                param?: Record<string, any> | undefined;
            }>]>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            speed: number;
            transition: {
                type: "transition";
                id: string;
                name: string;
                duration: number;
                transition_type: string;
                param: Record<string, any>;
            } | null;
            volume: number;
            effects: any[];
            animations: any[];
            material_id: string;
            target_timerange: {
                duration: number;
                start: number;
            };
            filters: any[];
            clip?: {
                transform: {
                    x: number;
                    y: number;
                    scale: {
                        x: number;
                        y: number;
                    };
                };
                alpha: number;
                rotation: number;
            } | undefined;
            source_timerange?: {
                duration: number;
                start: number;
            } | undefined;
        }, {
            id: string;
            material_id: string;
            target_timerange: {
                duration: number;
                start: number;
            };
            speed?: number | undefined;
            clip?: {
                transform?: {
                    scale: {
                        x?: number | undefined;
                        y?: number | undefined;
                    };
                    x?: number | undefined;
                    y?: number | undefined;
                } | undefined;
                alpha?: number | undefined;
                rotation?: number | undefined;
            } | undefined;
            transition?: {
                id: string;
                name: string;
                duration: number;
                transition_type: string;
                type?: "transition" | undefined;
                param?: Record<string, any> | undefined;
            } | null | undefined;
            volume?: number | undefined;
            effects?: any[] | undefined;
            animations?: any[] | undefined;
            source_timerange?: {
                duration: number;
                start: number;
            } | undefined;
            filters?: any[] | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "audio" | "video" | "sticker";
        id: string;
        name: string;
        render_index: number;
        mute: boolean;
        segments: {
            id: string;
            speed: number;
            transition: {
                type: "transition";
                id: string;
                name: string;
                duration: number;
                transition_type: string;
                param: Record<string, any>;
            } | null;
            volume: number;
            effects: any[];
            animations: any[];
            material_id: string;
            target_timerange: {
                duration: number;
                start: number;
            };
            filters: any[];
            clip?: {
                transform: {
                    x: number;
                    y: number;
                    scale: {
                        x: number;
                        y: number;
                    };
                };
                alpha: number;
                rotation: number;
            } | undefined;
            source_timerange?: {
                duration: number;
                start: number;
            } | undefined;
        }[];
    }, {
        type: "text" | "audio" | "video" | "sticker";
        id: string;
        name: string;
        render_index: number;
        mute?: boolean | undefined;
        segments?: {
            id: string;
            material_id: string;
            target_timerange: {
                duration: number;
                start: number;
            };
            speed?: number | undefined;
            clip?: {
                transform?: {
                    scale: {
                        x?: number | undefined;
                        y?: number | undefined;
                    };
                    x?: number | undefined;
                    y?: number | undefined;
                } | undefined;
                alpha?: number | undefined;
                rotation?: number | undefined;
            } | undefined;
            transition?: {
                id: string;
                name: string;
                duration: number;
                transition_type: string;
                type?: "transition" | undefined;
                param?: Record<string, any> | undefined;
            } | null | undefined;
            volume?: number | undefined;
            effects?: any[] | undefined;
            animations?: any[] | undefined;
            source_timerange?: {
                duration: number;
                start: number;
            } | undefined;
            filters?: any[] | undefined;
        }[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    duration: number;
    canvas_config: {
        ratio: string;
        width: number;
        height: number;
        fps: number;
    };
    materials: {
        transitions: {
            type: "transition";
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            param: Record<string, any>;
        }[];
        videos: {
            path: string;
            type: "video";
            id: string;
            duration: number;
            md5: string;
            width: number;
            height: number;
            fps: number;
            create_time: number;
            import_time: number;
        }[];
        audios: {
            path: string;
            type: "audio";
            id: string;
            duration: number;
            md5: string;
            create_time: number;
            import_time: number;
        }[];
        texts: {
            type: "text";
            id: string;
            content: string;
            duration: number;
            text_url: string;
            text_size: number;
            text_color: string;
            text_alpha: number;
        }[];
        stickers: any[];
        effects: any[];
        audio_effects: any[];
        video_effects: any[];
        speeds: any[];
        animations: any[];
        audio_fades: any[];
        masks: any[];
        canvases: any[];
    };
    tracks: {
        type: "text" | "audio" | "video" | "sticker";
        id: string;
        name: string;
        render_index: number;
        mute: boolean;
        segments: {
            id: string;
            speed: number;
            transition: {
                type: "transition";
                id: string;
                name: string;
                duration: number;
                transition_type: string;
                param: Record<string, any>;
            } | null;
            volume: number;
            effects: any[];
            animations: any[];
            material_id: string;
            target_timerange: {
                duration: number;
                start: number;
            };
            filters: any[];
            clip?: {
                transform: {
                    x: number;
                    y: number;
                    scale: {
                        x: number;
                        y: number;
                    };
                };
                alpha: number;
                rotation: number;
            } | undefined;
            source_timerange?: {
                duration: number;
                start: number;
            } | undefined;
        }[];
    }[];
}, {
    id: string;
    duration: number;
    canvas_config: {
        ratio: string;
        width: number;
        height: number;
        fps: number;
    };
    materials: {
        transitions?: {
            id: string;
            name: string;
            duration: number;
            transition_type: string;
            type?: "transition" | undefined;
            param?: Record<string, any> | undefined;
        }[] | undefined;
        videos?: {
            path: string;
            id: string;
            duration: number;
            width: number;
            height: number;
            fps: number;
            create_time: number;
            import_time: number;
            type?: "video" | undefined;
            md5?: string | undefined;
        }[] | undefined;
        audios?: {
            path: string;
            id: string;
            duration: number;
            create_time: number;
            import_time: number;
            type?: "audio" | undefined;
            md5?: string | undefined;
        }[] | undefined;
        texts?: {
            id: string;
            content: string;
            duration: number;
            type?: "text" | undefined;
            text_url?: string | undefined;
            text_size?: number | undefined;
            text_color?: string | undefined;
            text_alpha?: number | undefined;
        }[] | undefined;
        stickers?: any[] | undefined;
        effects?: any[] | undefined;
        audio_effects?: any[] | undefined;
        video_effects?: any[] | undefined;
        speeds?: any[] | undefined;
        animations?: any[] | undefined;
        audio_fades?: any[] | undefined;
        masks?: any[] | undefined;
        canvases?: any[] | undefined;
    };
    tracks: {
        type: "text" | "audio" | "video" | "sticker";
        id: string;
        name: string;
        render_index: number;
        mute?: boolean | undefined;
        segments?: {
            id: string;
            material_id: string;
            target_timerange: {
                duration: number;
                start: number;
            };
            speed?: number | undefined;
            clip?: {
                transform?: {
                    scale: {
                        x?: number | undefined;
                        y?: number | undefined;
                    };
                    x?: number | undefined;
                    y?: number | undefined;
                } | undefined;
                alpha?: number | undefined;
                rotation?: number | undefined;
            } | undefined;
            transition?: {
                id: string;
                name: string;
                duration: number;
                transition_type: string;
                type?: "transition" | undefined;
                param?: Record<string, any> | undefined;
            } | null | undefined;
            volume?: number | undefined;
            effects?: any[] | undefined;
            animations?: any[] | undefined;
            source_timerange?: {
                duration: number;
                start: number;
            } | undefined;
            filters?: any[] | undefined;
        }[] | undefined;
    }[];
}>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type DraftClipTransform = z.infer<typeof ClipTransformSchema>;
export type DraftClip = z.infer<typeof ClipSchema>;
export type DraftVideoMaterial = z.infer<typeof VideoMaterialSchema>;
export type DraftAudioMaterial = z.infer<typeof AudioMaterialSchema>;
export type DraftTextMaterial = z.infer<typeof TextMaterialSchema>;
export type DraftTransitionMaterial = z.infer<typeof TransitionMaterialSchema>;
export type DraftMaterials = z.infer<typeof DraftMaterialsSchema>;
export type DraftSegment = z.infer<typeof DraftSegmentSchema>;
export type DraftTrack = z.infer<typeof DraftTrackSchema>;
export type DraftCanvasConfig = z.infer<typeof CanvasConfigSchema>;
export type DraftProject = z.infer<typeof DraftProjectSchema>;
export interface JianyingExportOptions {
    /** Video clips to export (must have videoUrl or localPath). */
    clips: VideoClip[];
    /** Output file path for the .draft file. */
    outputPath: string;
    /** Frame rate (default: 30). */
    fps?: number;
    /** Canvas width in pixels (default: 1920). */
    width?: number;
    /** Canvas height in pixels (default: 1080). */
    height?: number;
    /** Whether to include a subtitle text track (default: true). */
    includeSubtitles?: boolean;
    /** Transitions between clips (from EDL). */
    transitions?: Transition[];
}
/**
 * Convert an array of VideoClips into a JianYing .draft JSON string.
 *
 * Creates a draft project with:
 *   - A video track containing all clips as segments (with trim via source_timerange)
 *   - An audio track mirroring the video segments (audio from video files)
 *   - A text track with subtitles (if includeSubtitles is enabled)
 *   - Transition effects mapped from EDL transitions (cut -> none, crossfade -> 叠化, fade -> 淡入淡出)
 *
 * The output JSON can be written to a .draft file and opened in JianYing/CapCut.
 *
 * @param options - Export configuration (clips, output path, dimensions, etc.)
 * @returns The draft project as a JSON string.
 * @throws If no clips are provided or clips lack video sources.
 */
export declare function exportToJianyingDraft(options: JianyingExportOptions): string;
/**
 * Export VideoClips to a JianYing .draft file on disk.
 *
 * Creates the output directory if it doesn't exist, then writes the draft JSON.
 *
 * @param options - Export configuration (clips, output path, dimensions, etc.)
 * @returns The output file path.
 * @throws If writing fails or clips are invalid.
 */
export declare function exportToJianyingDraftFile(options: JianyingExportOptions): Promise<string>;
/**
 * Object-oriented wrapper for JianYing draft export.
 *
 * Provides a fluent interface for configuring and exporting a JianYing draft
 * from VideoClips.
 *
 * @example
 * ```typescript
 * const exporter = new JianyingDraftExporter("/output/project.draft");
 * const json = exporter
 *   .setClips(clips)
 *   .setTransitions(transitions)
 *   .setCanvas(1920, 1080, 30)
 *   .setSubtitles(true)
 *   .export();
 * await exporter.exportToFile();
 * ```
 */
export declare class JianyingDraftExporter {
    private clips;
    private readonly outputPath;
    private fps;
    private width;
    private height;
    private includeSubtitles;
    private transitions;
    /**
     * Create a new exporter.
     * @param outputPath - The output .draft file path.
     */
    constructor(outputPath: string);
    /**
     * Set the video clips to export.
     * @param clips - Array of VideoClips.
     * @returns This exporter for chaining.
     */
    setClips(clips: VideoClip[]): this;
    /**
     * Set transitions between clips.
     * @param transitions - Array of EDL transitions.
     * @returns This exporter for chaining.
     */
    setTransitions(transitions: Transition[]): this;
    /**
     * Set canvas dimensions and frame rate.
     * @param width - Canvas width in pixels.
     * @param height - Canvas height in pixels.
     * @param fps - Frame rate.
     * @returns This exporter for chaining.
     */
    setCanvas(width: number, height: number, fps: number): this;
    /**
     * Enable or disable subtitle text track.
     * @param enabled - Whether to include subtitles.
     * @returns This exporter for chaining.
     */
    setSubtitles(enabled: boolean): this;
    /**
     * Export to a JSON string.
     * @returns The draft project as a JSON string.
     */
    export(): string;
    /**
     * Export to a file on disk.
     * @returns The output file path.
     */
    exportToFile(): Promise<string>;
}
export {};
//# sourceMappingURL=jianying-exporter.d.ts.map