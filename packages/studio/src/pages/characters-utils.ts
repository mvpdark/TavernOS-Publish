import type { PersonaData, CharacterVoice } from "../shared/types.js";
import type { ConfirmedSlotEntry } from "@tavernos/core";

// Re-export ConfirmedSlotEntry so existing imports from characters-utils still work.
export type { ConfirmedSlotEntry };

// ---------------------------------------------------------------------------
// Shared types (used by Characters.tsx and ConfirmedSlotNavigator.tsx)
// ---------------------------------------------------------------------------

export interface SlotViewState {
  entered: boolean;
  mode: string | null;
  gender: string | null;
  role: string | null;
}

export interface PendingCharacter {
  filename: string;
  projectId: string;
  name: string;
  avatar: string;
  allImages: string[];
}

// ---------------------------------------------------------------------------
// Form / voice defaults
// ---------------------------------------------------------------------------

export const EMPTY_FORM: PersonaData = {
  name: "",
  description: "",
  personality: "",
  scenario: "",
  first_mes: "",
};

export const EMPTY_VOICE: CharacterVoice = { enabled: false };
export const DEFAULT_PREVIEW_TEXT = "夜深了，古屋里只有他一人。窗外传来若有若无的脚步声。";

export const VOICE_PROVIDERS = [
  { id: "yunwu", name: "云雾 OpenAI TTS", hasDesign: false },
  { id: "yunwu-minimax", name: "云雾 Minimax TTS", hasDesign: true },
  { id: "yunwu-kling", name: "云雾 Kling TTS", hasDesign: false },
  { id: "yunwu-tongyi", name: "云雾 通义 TTS", hasDesign: false },
  { id: "yunwu-vidu", name: "云雾 VIDU TTS", hasDesign: false },
];

export { coverColor } from "../lib/theme.js";
