// Group chat orchestrator.
//
// Picks the next speaker according to the session's speaking order, builds
// the per-speaker LLM context from the conversation history + persona card,
// and calls the LLM to generate that character's reply. Supports streaming
// via the onChunk callback (mirrors the single-character chat route).
import { createCharacterMessage, } from "./session.js";
// ---------------------------------------------------------------------------
// Persona system prompt builder
// ---------------------------------------------------------------------------
/**
 * Build a system prompt string from a persona card.
 * Combines description, personality, scenario, and any custom system_prompt.
 */
export function buildPersonaSystemPrompt(card) {
    const parts = [];
    const d = card.data;
    if (d.description)
        parts.push(d.description);
    if (d.personality)
        parts.push(`性格: ${d.personality}`);
    if (d.scenario)
        parts.push(`场景: ${d.scenario}`);
    if (d.system_prompt)
        parts.push(d.system_prompt);
    return parts.join("\n\n");
}
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
/**
 * Create a group chat orchestrator.
 *
 * @param client    The LLM client used for generation.
 * @param model     The model id to call.
 * @param resolver  Function that resolves member ids to persona cards.
 */
export function createGroupChatOrchestrator(client, model, resolver) {
    return {
        async generateNext(session, options) {
            // 1. Determine the next speaker.
            const speakerId = session.nextSpeakerId();
            const speakerName = session.getMemberName(speakerId);
            // 2. Resolve the persona card.
            const card = await resolver(speakerId);
            if (!card) {
                throw new Error(`无法找到角色卡: ${speakerId}`);
            }
            // 3. Build the system prompt + conversation context.
            const systemPrompt = buildPersonaSystemPrompt(card);
            // 3.5. Enhance the system prompt with memory context (optional).
            // When a memory enhancer callback is provided, it can inject
            // FactVault/Lorebook/Story-state/Mood context into the prompt.
            const finalSystemPrompt = options?.enhanceSystemPrompt
                ? await options.enhanceSystemPrompt(speakerId, speakerName, systemPrompt)
                : systemPrompt;
            const messages = session.buildContext(speakerId, finalSystemPrompt);
            // 4. Call the LLM — build options as a single readonly object.
            const chatOptions = {
                ...(options?.onChunk ? { onChunk: options.onChunk } : {}),
                ...(options?.signal ? { signal: options.signal } : {}),
                ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
                ...(options?.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
            };
            const response = await client.chat(model, messages, chatOptions);
            // 5. Create the character message and commit it to the session.
            const message = createCharacterMessage(speakerId, speakerName, response.content.trim());
            session.commitMessage(message);
            // 6. Return the result with the updated session snapshot.
            return {
                message,
                session: session.toSnapshot(),
                usage: response.usage,
            };
        },
    };
}
//# sourceMappingURL=orchestrator.js.map