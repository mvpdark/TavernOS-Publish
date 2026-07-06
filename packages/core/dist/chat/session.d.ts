import type { LLMMessage } from "../llm/types.js";
import type { GroupChatConfig, GroupChatMessage, GroupChatSession } from "./types.js";
/** Generate a unique session id (deterministic prefix + counter + random). */
export declare function generateSessionId(): string;
/**
 * Create a new group chat session.
 * @param config  Group chat configuration (members, order, turnInterval, scenario).
 * @param memberNames  Display names keyed by member id.
 * @param id  Optional explicit session id (auto-generated when omitted).
 */
export declare function createGroupChatSession(config: GroupChatConfig, memberNames: Record<string, string>, id?: string): GroupChatSession;
/**
 * Factory: create a session manager from a serializable snapshot.
 * Mirrors the createXxxClient factory pattern used across the codebase.
 */
export declare function createGroupChatSessionManager(session: GroupChatSession): GroupChatSessionManager;
export declare class GroupChatSessionManager {
    private state;
    constructor(session: GroupChatSession);
    get id(): string;
    get config(): GroupChatConfig;
    get messages(): readonly GroupChatMessage[];
    get memberIds(): readonly string[];
    get turnCount(): number;
    get currentSpeakerId(): string | undefined;
    /** Resolve the display name for a member id. */
    getMemberName(memberId: string): string;
    /**
     * Return the member id of the character that should speak next.
     * Does NOT mutate state — call commitMessage() after the message is generated.
     */
    nextSpeakerId(): string;
    /**
     * Compute the next speaker index when the current speaker has exhausted
     * their turn interval. For round-robin, the cycle start rotates forward
     * after each full rotation so the "first" speaker changes each cycle.
     */
    private nextIndexAfterExhaustion;
    /**
     * Add a message to the session and advance the turn state.
     *
     * - User messages (role="user") are recorded but do NOT advance the
     *   speaking order — they represent human interjections.
     * - Character messages (role="character") advance the turn counter and
     *   may trigger a speaker change when the turn interval is exhausted.
     */
    commitMessage(message: GroupChatMessage): void;
    /**
     * Build the LLM message array for a speaker.
     *
     * The speaker's own prior messages become assistant turns; all other
     * messages (from other characters or the user) become user turns
     * attributed with the speaker's display name.
     *
     * @param speakerId    The member id of the character about to speak.
     * @param systemPrompt The persona system prompt (description, personality, etc.).
     */
    buildContext(speakerId: string, systemPrompt: string): LLMMessage[];
    /** Return a deep-copied serializable snapshot of the session. */
    toSnapshot(): GroupChatSession;
}
/** Create a character message. */
export declare function createCharacterMessage(memberId: string, memberName: string, content: string, timestamp?: number): GroupChatMessage;
/** Create a user (human) message. */
export declare function createUserMessage(content: string, memberName?: string, timestamp?: number): GroupChatMessage;
//# sourceMappingURL=session.d.ts.map