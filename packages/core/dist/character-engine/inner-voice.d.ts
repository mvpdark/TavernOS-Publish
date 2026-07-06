import type { MoodVector, InnerVoiceBlock } from "./types.js";
export declare class InnerVoice {
    /**
     * Generate an inner monologue block for a character.
     *
     * The template is selected deterministically via FNV-1a hash of
     * (characterId + chapterIndex), ensuring reproducibility.
     * Intensity is derived from the strongest mood dimension (0–1).
     *
     * @param characterId  The character generating the monologue.
     * @param mood         The character's current mood vector.
     * @param bondContext  Contextual bond descriptions to weave into the text.
     * @param chapterIndex The current chapter index (for deterministic selection).
     */
    generate(characterId: string, mood: MoodVector, bondContext: string[], chapterIndex: number): InnerVoiceBlock;
}
//# sourceMappingURL=inner-voice.d.ts.map