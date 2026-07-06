// Bridge function: convert Storyboard Shot[] to VideoClip[] using prompt-builder.
//
// This is the critical missing link between the storyboard agent (which produces
// rich Shot objects with actingAnchors/emotionLabel/voiceId) and the video
// pipeline (which needs VideoClip objects with assembled prompts).
import { buildVideoPrompt, detectPromptLanguage } from "./prompt-builder.js";
export function shotsToClips(shots, options) {
    // referenceAudioUrls is reserved for the generation-request stage (omni_reference),
    // not consumed during clip/prompt assembly, so it is intentionally not destructured.
    const { chapterId, config, referenceImageUrls = [] } = options;
    const language = detectPromptLanguage(config.model);
    return shots.map((shot, index) => {
        // Build the final video generation prompt from the Shot
        const built = buildVideoPrompt(shot, {
            model: config.model,
            language,
            referenceImageCount: referenceImageUrls.length,
        });
        const clip = {
            id: `clip-${chapterId}-${index + 1}`,
            chapterId,
            clipNumber: index + 1,
            prompt: built.prompt,
            status: "pending",
            generateConfig: config,
            createdAt: new Date().toISOString(),
            // V2 fields from Shot
            actingAnchors: shot.actingAnchors,
            emotionLabel: shot.emotionLabel,
            voiceId: shot.voiceId,
            voiceInstruction: shot.voiceInstruction,
            // Shot has no `id` field; derive a stable traceability id from sceneId + shotNumber.
            shotId: `${shot.sceneId}-shot-${shot.shotNumber}`,
        };
        return clip;
    });
}
//# sourceMappingURL=shots-to-clips.js.map