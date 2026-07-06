import type { LLMClient } from "../llm/client.js";
import type { PersonaCard } from "../character/card.js";
import type { GroupChatTurnResult } from "./types.js";
import { GroupChatSessionManager } from "./session.js";
/**
 * Build a system prompt string from a persona card.
 * Combines description, personality, scenario, and any custom system_prompt.
 */
export declare function buildPersonaSystemPrompt(card: PersonaCard): string;
/**
 * A function that resolves a member id to its persona card.
 * Returns null when the card cannot be found (the orchestrator will skip
 * that member and advance to the next speaker).
 */
export type PersonaResolver = (memberId: string) => Promise<PersonaCard | null>;
export interface GenerateOptions {
    /** Streaming callback — invoked for every text delta. */
    onChunk?: (delta: string) => void;
    /** Abort signal for cancellation. */
    signal?: AbortSignal;
    /** Override the default temperature. */
    temperature?: number;
    /** Override the default max tokens. */
    maxTokens?: number;
    /** Optional callback to enhance the system prompt with memory context.
     *  Receives the speaker's member id, display name, and the base system
     *  prompt (from persona card). Returns the enhanced system prompt.
     *  Used by the group-chat route to inject FactVault/Lorebook/Story-state/Mood
     *  context per-speaker without coupling the core orchestrator to the
     *  studio memory loader. */
    enhanceSystemPrompt?: (speakerId: string, speakerName: string, basePrompt: string) => Promise<string>;
}
export interface GroupChatOrchestrator {
    /**
     * Generate the next character message in the group chat.
     *
     * Picks the next speaker, resolves their persona card, builds the LLM
     * context, calls the LLM, commits the message to the session, and
     * returns the result.
     *
     * @throws Error when there are no members or the persona card cannot be
     *   resolved for the next speaker.
     */
    generateNext(session: GroupChatSessionManager, options?: GenerateOptions): Promise<GroupChatTurnResult>;
}
/**
 * Create a group chat orchestrator.
 *
 * @param client    The LLM client used for generation.
 * @param model     The model id to call.
 * @param resolver  Function that resolves member ids to persona cards.
 */
export declare function createGroupChatOrchestrator(client: LLMClient, model: string, resolver: PersonaResolver): GroupChatOrchestrator;
//# sourceMappingURL=orchestrator.d.ts.map