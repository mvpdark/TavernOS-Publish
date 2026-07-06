import { type PersonaCardV1, type PersonaCardV2, type PersonaCardV3 } from "./types.js";
export type PersonaCard = PersonaCardV2 | PersonaCardV3;
/**
 * Parse a character card JSON string. Tries V3 → V2 → V1 (upgrades to V2).
 */
export declare function parseCard(json: string): PersonaCard;
/**
 * Serialize a character card to JSON string.
 */
export declare function serializeCard(card: PersonaCard): string;
/**
 * Upgrade a V1 character card (flat structure) to V2 format.
 */
export declare function upgradeV1toV2(v1: PersonaCardV1): PersonaCardV2;
//# sourceMappingURL=card.d.ts.map