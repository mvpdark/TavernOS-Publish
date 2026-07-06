// packages/core/src/character/card.ts
import { PersonaCardV1Schema, PersonaCardV2Schema, PersonaCardV3Schema, } from "./types.js";
/**
 * Parse a character card JSON string. Tries V3 → V2 → V1 (upgrades to V2).
 */
export function parseCard(json) {
    const raw = JSON.parse(json);
    // Try V3 first
    const v3Result = PersonaCardV3Schema.safeParse(raw);
    if (v3Result.success) {
        return v3Result.data;
    }
    // Try V2
    const v2Result = PersonaCardV2Schema.safeParse(raw);
    if (v2Result.success) {
        return v2Result.data;
    }
    // Try V1 (upgrade to V2)
    const v1Result = PersonaCardV1Schema.safeParse(raw);
    if (v1Result.success) {
        return upgradeV1toV2(v1Result.data);
    }
    throw new Error(`Failed to parse character card: V3 error=${v3Result.error.message}; V2 error=${v2Result.error.message}; V1 error=${v1Result.error.message}`);
}
/**
 * Serialize a character card to JSON string.
 */
export function serializeCard(card) {
    return JSON.stringify(card, null, 2);
}
/**
 * Upgrade a V1 character card (flat structure) to V2 format.
 */
export function upgradeV1toV2(v1) {
    return {
        spec: "chara_card_v2",
        spec_version: "2.0",
        data: {
            name: v1.name,
            description: v1.description,
            personality: v1.personality,
            scenario: v1.scenario,
            first_mes: v1.first_mes,
            mes_example: v1.mes_example,
            creator_notes: "",
            character_version: "",
            system_prompt: "",
            post_history_instructions: "",
            tags: v1.tags,
            creator: "",
            alternate_greetings: [],
            extensions: {},
        },
    };
}
//# sourceMappingURL=card.js.map