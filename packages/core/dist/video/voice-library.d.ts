export type VoiceGender = "female" | "male" | "special";
export type VoiceCategory = string;
export interface VoiceProfile {
    readonly id: string;
    readonly name: string;
    readonly gender: VoiceGender;
    readonly ageRange: readonly [number, number];
    readonly category: string;
    readonly desc: string;
    readonly archetypes: readonly string[];
}
export interface MatchedVoice {
    profile: VoiceProfile;
    /** Chinese anchoring sentence ready for prompt injection. */
    anchorSentence: string;
}
export declare const ALL_VOICES: readonly VoiceProfile[];
export declare const VOICE_CATEGORIES: readonly string[];
export interface CharacterVoiceHints {
    gender?: "male" | "female" | string;
    age?: number | string;
    archetype?: string;
    role?: string;
    personality?: string;
}
/**
 * Auto-match a voice profile to a character based on gender/age/archetype hints.
 * Returns the best matching voice with a ready-to-use anchor sentence.
 */
export declare function matchVoice(hints: CharacterVoiceHints): MatchedVoice;
/**
 * Build a voice-anchoring sentence in Chinese that can be appended to a video
 * prompt. Format: "角色声音为[年龄范围][声线名]，[描述]。"
 */
export declare function buildAnchorSentence(profile: VoiceProfile): string;
/**
 * Build a short voice tag for English-language providers (Grok Imagine).
 * Returns an English description suitable for Grok voice prompts.
 */
export declare function buildEnglishVoiceTag(profile: VoiceProfile): string;
//# sourceMappingURL=voice-library.d.ts.map