import { z } from "zod";
export declare const LLMProviderSchema: z.ZodEnum<["openai", "anthropic", "custom"]>;
export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export declare const LLMServiceEntrySchema: z.ZodObject<{
    service: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    apiFormat: z.ZodOptional<z.ZodEnum<["chat", "responses", "messages"]>>;
    stream: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    service: string;
    name?: string | undefined;
    baseUrl?: string | undefined;
    temperature?: number | undefined;
    apiFormat?: "chat" | "responses" | "messages" | undefined;
    stream?: boolean | undefined;
}, {
    service: string;
    name?: string | undefined;
    baseUrl?: string | undefined;
    temperature?: number | undefined;
    apiFormat?: "chat" | "responses" | "messages" | undefined;
    stream?: boolean | undefined;
}>;
export type LLMServiceEntry = z.infer<typeof LLMServiceEntrySchema>;
export declare const LLMConfigSchema: z.ZodObject<{
    provider: z.ZodEnum<["openai", "anthropic", "custom"]>;
    service: z.ZodDefault<z.ZodString>;
    configSource: z.ZodDefault<z.ZodEnum<["env", "studio"]>>;
    baseUrl: z.ZodString;
    apiKey: z.ZodDefault<z.ZodString>;
    /** OAuth access token — used when authType is "oauth" (e.g., Grok SuperGrok). */
    oauthToken: z.ZodOptional<z.ZodString>;
    model: z.ZodString;
    proxyUrl: z.ZodOptional<z.ZodString>;
    temperature: z.ZodDefault<z.ZodNumber>;
    thinkingBudget: z.ZodDefault<z.ZodNumber>;
    extra: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    apiFormat: z.ZodDefault<z.ZodEnum<["chat", "responses", "messages"]>>;
    stream: z.ZodDefault<z.ZodBoolean>;
    services: z.ZodOptional<z.ZodArray<z.ZodObject<{
        service: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        baseUrl: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        apiFormat: z.ZodOptional<z.ZodEnum<["chat", "responses", "messages"]>>;
        stream: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        service: string;
        name?: string | undefined;
        baseUrl?: string | undefined;
        temperature?: number | undefined;
        apiFormat?: "chat" | "responses" | "messages" | undefined;
        stream?: boolean | undefined;
    }, {
        service: string;
        name?: string | undefined;
        baseUrl?: string | undefined;
        temperature?: number | undefined;
        apiFormat?: "chat" | "responses" | "messages" | undefined;
        stream?: boolean | undefined;
    }>, "many">>;
    defaultModel: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    service: string;
    baseUrl: string;
    temperature: number;
    apiFormat: "chat" | "responses" | "messages";
    stream: boolean;
    provider: "openai" | "anthropic" | "custom";
    configSource: "env" | "studio";
    apiKey: string;
    model: string;
    thinkingBudget: number;
    oauthToken?: string | undefined;
    proxyUrl?: string | undefined;
    extra?: Record<string, unknown> | undefined;
    headers?: Record<string, string> | undefined;
    services?: {
        service: string;
        name?: string | undefined;
        baseUrl?: string | undefined;
        temperature?: number | undefined;
        apiFormat?: "chat" | "responses" | "messages" | undefined;
        stream?: boolean | undefined;
    }[] | undefined;
    defaultModel?: string | undefined;
}, {
    baseUrl: string;
    provider: "openai" | "anthropic" | "custom";
    model: string;
    service?: string | undefined;
    temperature?: number | undefined;
    apiFormat?: "chat" | "responses" | "messages" | undefined;
    stream?: boolean | undefined;
    configSource?: "env" | "studio" | undefined;
    apiKey?: string | undefined;
    oauthToken?: string | undefined;
    proxyUrl?: string | undefined;
    thinkingBudget?: number | undefined;
    extra?: Record<string, unknown> | undefined;
    headers?: Record<string, string> | undefined;
    services?: {
        service: string;
        name?: string | undefined;
        baseUrl?: string | undefined;
        temperature?: number | undefined;
        apiFormat?: "chat" | "responses" | "messages" | undefined;
        stream?: boolean | undefined;
    }[] | undefined;
    defaultModel?: string | undefined;
}>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export declare const AgentLLMOverrideSchema: z.ZodObject<{
    model: z.ZodString;
    provider: z.ZodOptional<z.ZodEnum<["openai", "anthropic", "custom"]>>;
    baseUrl: z.ZodOptional<z.ZodString>;
    apiKeyEnv: z.ZodOptional<z.ZodString>;
    stream: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    model: string;
    baseUrl?: string | undefined;
    stream?: boolean | undefined;
    provider?: "openai" | "anthropic" | "custom" | undefined;
    apiKeyEnv?: string | undefined;
}, {
    model: string;
    baseUrl?: string | undefined;
    stream?: boolean | undefined;
    provider?: "openai" | "anthropic" | "custom" | undefined;
    apiKeyEnv?: string | undefined;
}>;
export type AgentLLMOverride = z.infer<typeof AgentLLMOverrideSchema>;
export declare const WritingConfigSchema: z.ZodObject<{
    reviewRetries: z.ZodDefault<z.ZodNumber>;
    reviewMode: z.ZodDefault<z.ZodEnum<["auto", "manual"]>>;
}, "strip", z.ZodTypeAny, {
    reviewMode: "auto" | "manual";
    reviewRetries: number;
}, {
    reviewMode?: "auto" | "manual" | undefined;
    reviewRetries?: number | undefined;
}>;
export type WritingConfig = z.infer<typeof WritingConfigSchema>;
export declare const FoundationConfigSchema: z.ZodObject<{
    reviewRetries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reviewRetries: number;
}, {
    reviewRetries?: number | undefined;
}>;
export type FoundationConfig = z.infer<typeof FoundationConfigSchema>;
export declare const QualityGatesSchema: z.ZodObject<{
    maxAuditRetries: z.ZodDefault<z.ZodNumber>;
    pauseAfterConsecutiveFailures: z.ZodDefault<z.ZodNumber>;
    retryTemperatureStep: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxAuditRetries: number;
    pauseAfterConsecutiveFailures: number;
    retryTemperatureStep: number;
}, {
    maxAuditRetries?: number | undefined;
    pauseAfterConsecutiveFailures?: number | undefined;
    retryTemperatureStep?: number | undefined;
}>;
export type QualityGates = z.infer<typeof QualityGatesSchema>;
export declare const DetectionConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["gptzero", "originality", "custom"]>>;
    apiUrl: z.ZodString;
    apiKeyEnv: z.ZodString;
    threshold: z.ZodDefault<z.ZodNumber>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    autoRewrite: z.ZodDefault<z.ZodBoolean>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    provider: "custom" | "gptzero" | "originality";
    apiKeyEnv: string;
    apiUrl: string;
    threshold: number;
    enabled: boolean;
    autoRewrite: boolean;
    maxRetries: number;
}, {
    apiKeyEnv: string;
    apiUrl: string;
    provider?: "custom" | "gptzero" | "originality" | undefined;
    threshold?: number | undefined;
    enabled?: boolean | undefined;
    autoRewrite?: boolean | undefined;
    maxRetries?: number | undefined;
}>;
export type DetectionConfig = z.infer<typeof DetectionConfigSchema>;
export declare const NotifyChannelSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"webhook">;
    url: z.ZodString;
    secret: z.ZodOptional<z.ZodString>;
    events: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "webhook";
    url: string;
    events: string[];
    secret?: string | undefined;
}, {
    type: "webhook";
    url: string;
    secret?: string | undefined;
    events?: string[] | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"telegram">;
    botToken: z.ZodString;
    chatId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "telegram";
    botToken: string;
    chatId: string;
}, {
    type: "telegram";
    botToken: string;
    chatId: string;
}>]>;
export type NotifyChannel = z.infer<typeof NotifyChannelSchema>;
/** Target publishing platform — each has distinct tone, pacing, word-count
 *  expectations, and signing thresholds (see PLATFORM_PRESETS). */
export declare const BlueprintPlatformSchema: z.ZodEnum<["fanqie", "qidian", "jjwxc", "feilu", "qimao", "other"]>;
export type BlueprintPlatform = z.infer<typeof BlueprintPlatformSchema>;
export declare const BlueprintSchema: z.ZodObject<{
    /** Target publishing platform. */
    platform: z.ZodDefault<z.ZodEnum<["fanqie", "qidian", "jjwxc", "feilu", "qimao", "other"]>>;
    /** Channel: male-frequency (男频) or female-frequency (女频). */
    channel: z.ZodDefault<z.ZodEnum<["male", "female", ""]>>;
    /** Genre, e.g. 玄幻 / 都市 / 科幻 / 言情. */
    genre: z.ZodDefault<z.ZodString>;
    /** A successful novel to benchmark against (对标作品). */
    referenceBook: z.ZodDefault<z.ZodString>;
    /** Golden-finger / cheat type, e.g. 系统流 / 重生 / 穿越 / 签到 / 模拟器. */
    goldenFinger: z.ZodDefault<z.ZodString>;
    /** Core selling point / 爽点 — the single biggest draw. */
    sellingPoint: z.ZodDefault<z.ZodString>;
    /** Protagonist setup: identity, personality, goal. */
    protagonist: z.ZodDefault<z.ZodString>;
    /** World-building tone / baseline. */
    worldTone: z.ZodDefault<z.ZodString>;
    /** Expected plot direction: opening, development, climax arc. */
    plotDirection: z.ZodDefault<z.ZodString>;
    /** Target total word count (e.g. 1000000 for 100万字). */
    wordCount: z.ZodDefault<z.ZodNumber>;
    /** Update cadence, e.g. 日更4000 / 日更万字. */
    updateFrequency: z.ZodDefault<z.ZodString>;
    /** Wizard status: drafting (in progress) or confirmed (ready to generate). */
    status: z.ZodDefault<z.ZodEnum<["drafting", "confirmed"]>>;
}, "strip", z.ZodTypeAny, {
    status: "drafting" | "confirmed";
    platform: "feilu" | "qidian" | "other" | "fanqie" | "jjwxc" | "qimao";
    genre: string;
    wordCount: number;
    channel: "" | "male" | "female";
    referenceBook: string;
    goldenFinger: string;
    sellingPoint: string;
    protagonist: string;
    worldTone: string;
    plotDirection: string;
    updateFrequency: string;
}, {
    status?: "drafting" | "confirmed" | undefined;
    platform?: "feilu" | "qidian" | "other" | "fanqie" | "jjwxc" | "qimao" | undefined;
    genre?: string | undefined;
    wordCount?: number | undefined;
    channel?: "" | "male" | "female" | undefined;
    referenceBook?: string | undefined;
    goldenFinger?: string | undefined;
    sellingPoint?: string | undefined;
    protagonist?: string | undefined;
    worldTone?: string | undefined;
    plotDirection?: string | undefined;
    updateFrequency?: string | undefined;
}>;
export type Blueprint = z.infer<typeof BlueprintSchema>;
export declare const EMPTY_BLUEPRINT: Blueprint;
export declare const ProjectConfigSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodLiteral<"0.1.0">;
    language: z.ZodDefault<z.ZodEnum<["zh", "en"]>>;
    /** Work type: long-form novel ("long") or short story ("short"). */
    type: z.ZodDefault<z.ZodEnum<["long", "short"]>>;
    /** Story genre (free-form, kept for backward compat with the Library modal). */
    genre: z.ZodDefault<z.ZodString>;
    /** Creation-wizard blueprint collected via the AI consultant chat. */
    blueprint: z.ZodDefault<z.ZodObject<{
        /** Target publishing platform. */
        platform: z.ZodDefault<z.ZodEnum<["fanqie", "qidian", "jjwxc", "feilu", "qimao", "other"]>>;
        /** Channel: male-frequency (男频) or female-frequency (女频). */
        channel: z.ZodDefault<z.ZodEnum<["male", "female", ""]>>;
        /** Genre, e.g. 玄幻 / 都市 / 科幻 / 言情. */
        genre: z.ZodDefault<z.ZodString>;
        /** A successful novel to benchmark against (对标作品). */
        referenceBook: z.ZodDefault<z.ZodString>;
        /** Golden-finger / cheat type, e.g. 系统流 / 重生 / 穿越 / 签到 / 模拟器. */
        goldenFinger: z.ZodDefault<z.ZodString>;
        /** Core selling point / 爽点 — the single biggest draw. */
        sellingPoint: z.ZodDefault<z.ZodString>;
        /** Protagonist setup: identity, personality, goal. */
        protagonist: z.ZodDefault<z.ZodString>;
        /** World-building tone / baseline. */
        worldTone: z.ZodDefault<z.ZodString>;
        /** Expected plot direction: opening, development, climax arc. */
        plotDirection: z.ZodDefault<z.ZodString>;
        /** Target total word count (e.g. 1000000 for 100万字). */
        wordCount: z.ZodDefault<z.ZodNumber>;
        /** Update cadence, e.g. 日更4000 / 日更万字. */
        updateFrequency: z.ZodDefault<z.ZodString>;
        /** Wizard status: drafting (in progress) or confirmed (ready to generate). */
        status: z.ZodDefault<z.ZodEnum<["drafting", "confirmed"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "drafting" | "confirmed";
        platform: "feilu" | "qidian" | "other" | "fanqie" | "jjwxc" | "qimao";
        genre: string;
        wordCount: number;
        channel: "" | "male" | "female";
        referenceBook: string;
        goldenFinger: string;
        sellingPoint: string;
        protagonist: string;
        worldTone: string;
        plotDirection: string;
        updateFrequency: string;
    }, {
        status?: "drafting" | "confirmed" | undefined;
        platform?: "feilu" | "qidian" | "other" | "fanqie" | "jjwxc" | "qimao" | undefined;
        genre?: string | undefined;
        wordCount?: number | undefined;
        channel?: "" | "male" | "female" | undefined;
        referenceBook?: string | undefined;
        goldenFinger?: string | undefined;
        sellingPoint?: string | undefined;
        protagonist?: string | undefined;
        worldTone?: string | undefined;
        plotDirection?: string | undefined;
        updateFrequency?: string | undefined;
    }>>;
    llm: z.ZodObject<{
        provider: z.ZodEnum<["openai", "anthropic", "custom"]>;
        service: z.ZodDefault<z.ZodString>;
        configSource: z.ZodDefault<z.ZodEnum<["env", "studio"]>>;
        baseUrl: z.ZodString;
        apiKey: z.ZodDefault<z.ZodString>;
        /** OAuth access token — used when authType is "oauth" (e.g., Grok SuperGrok). */
        oauthToken: z.ZodOptional<z.ZodString>;
        model: z.ZodString;
        proxyUrl: z.ZodOptional<z.ZodString>;
        temperature: z.ZodDefault<z.ZodNumber>;
        thinkingBudget: z.ZodDefault<z.ZodNumber>;
        extra: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        apiFormat: z.ZodDefault<z.ZodEnum<["chat", "responses", "messages"]>>;
        stream: z.ZodDefault<z.ZodBoolean>;
        services: z.ZodOptional<z.ZodArray<z.ZodObject<{
            service: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            baseUrl: z.ZodOptional<z.ZodString>;
            temperature: z.ZodOptional<z.ZodNumber>;
            apiFormat: z.ZodOptional<z.ZodEnum<["chat", "responses", "messages"]>>;
            stream: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            service: string;
            name?: string | undefined;
            baseUrl?: string | undefined;
            temperature?: number | undefined;
            apiFormat?: "chat" | "responses" | "messages" | undefined;
            stream?: boolean | undefined;
        }, {
            service: string;
            name?: string | undefined;
            baseUrl?: string | undefined;
            temperature?: number | undefined;
            apiFormat?: "chat" | "responses" | "messages" | undefined;
            stream?: boolean | undefined;
        }>, "many">>;
        defaultModel: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        service: string;
        baseUrl: string;
        temperature: number;
        apiFormat: "chat" | "responses" | "messages";
        stream: boolean;
        provider: "openai" | "anthropic" | "custom";
        configSource: "env" | "studio";
        apiKey: string;
        model: string;
        thinkingBudget: number;
        oauthToken?: string | undefined;
        proxyUrl?: string | undefined;
        extra?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
        services?: {
            service: string;
            name?: string | undefined;
            baseUrl?: string | undefined;
            temperature?: number | undefined;
            apiFormat?: "chat" | "responses" | "messages" | undefined;
            stream?: boolean | undefined;
        }[] | undefined;
        defaultModel?: string | undefined;
    }, {
        baseUrl: string;
        provider: "openai" | "anthropic" | "custom";
        model: string;
        service?: string | undefined;
        temperature?: number | undefined;
        apiFormat?: "chat" | "responses" | "messages" | undefined;
        stream?: boolean | undefined;
        configSource?: "env" | "studio" | undefined;
        apiKey?: string | undefined;
        oauthToken?: string | undefined;
        proxyUrl?: string | undefined;
        thinkingBudget?: number | undefined;
        extra?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
        services?: {
            service: string;
            name?: string | undefined;
            baseUrl?: string | undefined;
            temperature?: number | undefined;
            apiFormat?: "chat" | "responses" | "messages" | undefined;
            stream?: boolean | undefined;
        }[] | undefined;
        defaultModel?: string | undefined;
    }>;
    notify: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"webhook">;
        url: z.ZodString;
        secret: z.ZodOptional<z.ZodString>;
        events: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "webhook";
        url: string;
        events: string[];
        secret?: string | undefined;
    }, {
        type: "webhook";
        url: string;
        secret?: string | undefined;
        events?: string[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"telegram">;
        botToken: z.ZodString;
        chatId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "telegram";
        botToken: string;
        chatId: string;
    }, {
        type: "telegram";
        botToken: string;
        chatId: string;
    }>]>, "many">>;
    detection: z.ZodOptional<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["gptzero", "originality", "custom"]>>;
        apiUrl: z.ZodString;
        apiKeyEnv: z.ZodString;
        threshold: z.ZodDefault<z.ZodNumber>;
        enabled: z.ZodDefault<z.ZodBoolean>;
        autoRewrite: z.ZodDefault<z.ZodBoolean>;
        maxRetries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        provider: "custom" | "gptzero" | "originality";
        apiKeyEnv: string;
        apiUrl: string;
        threshold: number;
        enabled: boolean;
        autoRewrite: boolean;
        maxRetries: number;
    }, {
        apiKeyEnv: string;
        apiUrl: string;
        provider?: "custom" | "gptzero" | "originality" | undefined;
        threshold?: number | undefined;
        enabled?: boolean | undefined;
        autoRewrite?: boolean | undefined;
        maxRetries?: number | undefined;
    }>>;
    foundation: z.ZodDefault<z.ZodObject<{
        reviewRetries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        reviewRetries: number;
    }, {
        reviewRetries?: number | undefined;
    }>>;
    writing: z.ZodDefault<z.ZodObject<{
        reviewRetries: z.ZodDefault<z.ZodNumber>;
        reviewMode: z.ZodDefault<z.ZodEnum<["auto", "manual"]>>;
    }, "strip", z.ZodTypeAny, {
        reviewMode: "auto" | "manual";
        reviewRetries: number;
    }, {
        reviewMode?: "auto" | "manual" | undefined;
        reviewRetries?: number | undefined;
    }>>;
    modelOverrides: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodObject<{
        model: z.ZodString;
        provider: z.ZodOptional<z.ZodEnum<["openai", "anthropic", "custom"]>>;
        baseUrl: z.ZodOptional<z.ZodString>;
        apiKeyEnv: z.ZodOptional<z.ZodString>;
        stream: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        model: string;
        baseUrl?: string | undefined;
        stream?: boolean | undefined;
        provider?: "openai" | "anthropic" | "custom" | undefined;
        apiKeyEnv?: string | undefined;
    }, {
        model: string;
        baseUrl?: string | undefined;
        stream?: boolean | undefined;
        provider?: "openai" | "anthropic" | "custom" | undefined;
        apiKeyEnv?: string | undefined;
    }>]>>>;
}, "strip", z.ZodTypeAny, {
    type: "long" | "short";
    genre: string;
    language: "zh" | "en";
    writing: {
        reviewMode: "auto" | "manual";
        reviewRetries: number;
    };
    name: string;
    version: "0.1.0";
    blueprint: {
        status: "drafting" | "confirmed";
        platform: "feilu" | "qidian" | "other" | "fanqie" | "jjwxc" | "qimao";
        genre: string;
        wordCount: number;
        channel: "" | "male" | "female";
        referenceBook: string;
        goldenFinger: string;
        sellingPoint: string;
        protagonist: string;
        worldTone: string;
        plotDirection: string;
        updateFrequency: string;
    };
    llm: {
        service: string;
        baseUrl: string;
        temperature: number;
        apiFormat: "chat" | "responses" | "messages";
        stream: boolean;
        provider: "openai" | "anthropic" | "custom";
        configSource: "env" | "studio";
        apiKey: string;
        model: string;
        thinkingBudget: number;
        oauthToken?: string | undefined;
        proxyUrl?: string | undefined;
        extra?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
        services?: {
            service: string;
            name?: string | undefined;
            baseUrl?: string | undefined;
            temperature?: number | undefined;
            apiFormat?: "chat" | "responses" | "messages" | undefined;
            stream?: boolean | undefined;
        }[] | undefined;
        defaultModel?: string | undefined;
    };
    notify: ({
        type: "webhook";
        url: string;
        events: string[];
        secret?: string | undefined;
    } | {
        type: "telegram";
        botToken: string;
        chatId: string;
    })[];
    foundation: {
        reviewRetries: number;
    };
    detection?: {
        provider: "custom" | "gptzero" | "originality";
        apiKeyEnv: string;
        apiUrl: string;
        threshold: number;
        enabled: boolean;
        autoRewrite: boolean;
        maxRetries: number;
    } | undefined;
    modelOverrides?: Record<string, string | {
        model: string;
        baseUrl?: string | undefined;
        stream?: boolean | undefined;
        provider?: "openai" | "anthropic" | "custom" | undefined;
        apiKeyEnv?: string | undefined;
    }> | undefined;
}, {
    name: string;
    version: "0.1.0";
    llm: {
        baseUrl: string;
        provider: "openai" | "anthropic" | "custom";
        model: string;
        service?: string | undefined;
        temperature?: number | undefined;
        apiFormat?: "chat" | "responses" | "messages" | undefined;
        stream?: boolean | undefined;
        configSource?: "env" | "studio" | undefined;
        apiKey?: string | undefined;
        oauthToken?: string | undefined;
        proxyUrl?: string | undefined;
        thinkingBudget?: number | undefined;
        extra?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
        services?: {
            service: string;
            name?: string | undefined;
            baseUrl?: string | undefined;
            temperature?: number | undefined;
            apiFormat?: "chat" | "responses" | "messages" | undefined;
            stream?: boolean | undefined;
        }[] | undefined;
        defaultModel?: string | undefined;
    };
    type?: "long" | "short" | undefined;
    genre?: string | undefined;
    language?: "zh" | "en" | undefined;
    writing?: {
        reviewMode?: "auto" | "manual" | undefined;
        reviewRetries?: number | undefined;
    } | undefined;
    blueprint?: {
        status?: "drafting" | "confirmed" | undefined;
        platform?: "feilu" | "qidian" | "other" | "fanqie" | "jjwxc" | "qimao" | undefined;
        genre?: string | undefined;
        wordCount?: number | undefined;
        channel?: "" | "male" | "female" | undefined;
        referenceBook?: string | undefined;
        goldenFinger?: string | undefined;
        sellingPoint?: string | undefined;
        protagonist?: string | undefined;
        worldTone?: string | undefined;
        plotDirection?: string | undefined;
        updateFrequency?: string | undefined;
    } | undefined;
    notify?: ({
        type: "webhook";
        url: string;
        secret?: string | undefined;
        events?: string[] | undefined;
    } | {
        type: "telegram";
        botToken: string;
        chatId: string;
    })[] | undefined;
    detection?: {
        apiKeyEnv: string;
        apiUrl: string;
        provider?: "custom" | "gptzero" | "originality" | undefined;
        threshold?: number | undefined;
        enabled?: boolean | undefined;
        autoRewrite?: boolean | undefined;
        maxRetries?: number | undefined;
    } | undefined;
    foundation?: {
        reviewRetries?: number | undefined;
    } | undefined;
    modelOverrides?: Record<string, string | {
        model: string;
        baseUrl?: string | undefined;
        stream?: boolean | undefined;
        provider?: "openai" | "anthropic" | "custom" | undefined;
        apiKeyEnv?: string | undefined;
    }> | undefined;
}>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
//# sourceMappingURL=project.d.ts.map