// Group chat session manager.
//
// Maintains multi-character conversation state, speaking order, and builds
// per-speaker LLM context. Each character sees its own prior messages as
// assistant turns and other characters' messages as attributed user turns.
// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------
let idCounter = 0;
/** Generate a unique session id (deterministic prefix + counter + random). */
export function generateSessionId() {
    idCounter += 1;
    return `gc-${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}
// ---------------------------------------------------------------------------
// Factory: create a new session from config
// ---------------------------------------------------------------------------
/**
 * Create a new group chat session.
 * @param config  Group chat configuration (members, order, turnInterval, scenario).
 * @param memberNames  Display names keyed by member id.
 * @param id  Optional explicit session id (auto-generated when omitted).
 */
export function createGroupChatSession(config, memberNames, id) {
    // Ensure every member has a display name; fall back to the id itself.
    const resolvedNames = {};
    for (const memberId of config.memberIds) {
        resolvedNames[memberId] = memberNames[memberId] ?? memberId;
    }
    return {
        id: id ?? generateSessionId(),
        config,
        memberNames: resolvedNames,
        messages: [],
        currentTurnIndex: 0,
        currentTurnCount: 0,
        turnCount: 0,
    };
}
// ---------------------------------------------------------------------------
// Session manager (mutable wrapper around the serializable snapshot)
// ---------------------------------------------------------------------------
/**
 * Factory: create a session manager from a serializable snapshot.
 * Mirrors the createXxxClient factory pattern used across the codebase.
 */
export function createGroupChatSessionManager(session) {
    return new GroupChatSessionManager(session);
}
export class GroupChatSessionManager {
    state;
    constructor(session) {
        // Deep-copy messages array to avoid external mutation.
        this.state = { ...session, messages: [...session.messages] };
    }
    // --- Read-only accessors ---
    get id() {
        return this.state.id;
    }
    get config() {
        return this.state.config;
    }
    get messages() {
        return this.state.messages;
    }
    get memberIds() {
        return this.state.config.memberIds;
    }
    get turnCount() {
        return this.state.turnCount;
    }
    get currentSpeakerId() {
        return this.state.lastSpeakerId;
    }
    /** Resolve the display name for a member id. */
    getMemberName(memberId) {
        return this.state.memberNames[memberId] ?? memberId;
    }
    // --- Turn management ---
    /**
     * Return the member id of the character that should speak next.
     * Does NOT mutate state — call commitMessage() after the message is generated.
     */
    nextSpeakerId() {
        const { config } = this.state;
        const memberCount = config.memberIds.length;
        if (memberCount === 0) {
            throw new Error("Group chat has no members");
        }
        // Random order: pick a random member, avoiding the last speaker when possible.
        if (config.order === "random") {
            if (memberCount === 1)
                return config.memberIds[0];
            const candidates = config.memberIds.filter((id) => id !== this.state.lastSpeakerId);
            const pool = candidates.length > 0 ? candidates : [...config.memberIds];
            return pool[Math.floor(Math.random() * pool.length)];
        }
        // fixed / round-robin: the current speaker continues until their turn
        // interval is exhausted, then the next member in sequence takes over.
        if (this.state.currentTurnCount < config.turnInterval) {
            return config.memberIds[this.state.currentTurnIndex % memberCount];
        }
        const nextIndex = this.nextIndexAfterExhaustion();
        return config.memberIds[nextIndex];
    }
    /**
     * Compute the next speaker index when the current speaker has exhausted
     * their turn interval. For round-robin, the cycle start rotates forward
     * after each full rotation so the "first" speaker changes each cycle.
     */
    nextIndexAfterExhaustion() {
        const { config } = this.state;
        const memberCount = config.memberIds.length;
        const baseNext = (this.state.currentTurnIndex + 1) % memberCount;
        if (config.order === "round-robin" && baseNext === 0) {
            // Just completed a full cycle — rotate the start by one position.
            const fullCycles = Math.floor(this.state.turnCount / (memberCount * config.turnInterval));
            return fullCycles % memberCount;
        }
        return baseNext;
    }
    /**
     * Add a message to the session and advance the turn state.
     *
     * - User messages (role="user") are recorded but do NOT advance the
     *   speaking order — they represent human interjections.
     * - Character messages (role="character") advance the turn counter and
     *   may trigger a speaker change when the turn interval is exhausted.
     */
    commitMessage(message) {
        // User interjections: record without affecting speaking order.
        if (message.role === "user") {
            this.state = {
                ...this.state,
                messages: [...this.state.messages, message],
            };
            return;
        }
        const { config } = this.state;
        const memberCount = config.memberIds.length;
        const speakerId = message.memberId;
        // Determine if this speaker is the expected continuation or a new speaker.
        const expected = this.nextSpeakerId();
        const isContinuation = speakerId === expected;
        let nextIndex;
        let nextCount;
        if (isContinuation) {
            nextCount = this.state.currentTurnCount + 1;
            nextIndex = this.state.currentTurnIndex;
            if (nextCount >= config.turnInterval) {
                // Turn interval exhausted — advance to next speaker.
                nextCount = 0;
                nextIndex = this.nextIndexAfterExhaustion();
            }
        }
        else {
            // A different character spoke (e.g. random pick or manual override).
            const idx = config.memberIds.indexOf(speakerId);
            nextIndex = idx >= 0 ? idx : this.state.currentTurnIndex;
            nextCount = 1;
            if (nextCount >= config.turnInterval) {
                nextCount = 0;
                nextIndex = (nextIndex + 1) % memberCount;
            }
        }
        this.state = {
            ...this.state,
            messages: [...this.state.messages, message],
            currentTurnIndex: nextIndex,
            currentTurnCount: nextCount,
            turnCount: this.state.turnCount + 1,
            lastSpeakerId: speakerId,
        };
    }
    // --- Context building ---
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
    buildContext(speakerId, systemPrompt) {
        const speakerName = this.getMemberName(speakerId);
        const messages = [];
        // System prompt: persona + scenario + group chat framing.
        const systemParts = [];
        if (systemPrompt)
            systemParts.push(systemPrompt);
        if (this.state.config.scenario) {
            systemParts.push(`【场景】${this.state.config.scenario}`);
        }
        systemParts.push(`【群聊模式】你正在参与一场多人对话。请以「${speakerName}」的身份发言，保持角色性格与语气一致。其他参与者的发言会以 [名字]: 的形式呈现。`);
        messages.push({ role: "system", content: systemParts.join("\n\n") });
        // Conversation history: own messages → assistant, others → attributed user.
        for (const msg of this.state.messages) {
            if (msg.memberId === speakerId && msg.role === "character") {
                messages.push({ role: "assistant", content: msg.content });
            }
            else {
                messages.push({
                    role: "user",
                    content: `[${msg.memberName}]: ${msg.content}`,
                });
            }
        }
        return messages;
    }
    // --- Serialization ---
    /** Return a deep-copied serializable snapshot of the session. */
    toSnapshot() {
        return {
            ...this.state,
            config: { ...this.state.config, memberIds: [...this.state.config.memberIds] },
            memberNames: { ...this.state.memberNames },
            messages: this.state.messages.map((m) => ({ ...m })),
        };
    }
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Create a character message. */
export function createCharacterMessage(memberId, memberName, content, timestamp = Date.now()) {
    return { memberId, memberName, role: "character", content, timestamp };
}
/** Create a user (human) message. */
export function createUserMessage(content, memberName = "用户", timestamp = Date.now()) {
    return { memberId: "__user__", memberName, role: "user", content, timestamp };
}
//# sourceMappingURL=session.js.map