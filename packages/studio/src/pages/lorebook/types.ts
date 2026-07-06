export type SelectiveLogic = "AND_ANY" | "AND_ALL" | "NOT_ALL" | "NOT_ANY";

// Re-export shared DeleteResponse for backward compatibility
export type { DeleteResponse } from "../../shared/types.js";

export interface LoreEntry {
  filename: string;
  uid?: number;
  key: string[];
  keysecondary?: string[];
  comment?: string;
  content?: string;
  constant?: boolean;
  selective?: boolean;
  selectiveLogic?: SelectiveLogic;
  order?: number;
}

export interface EntriesResponse {
  entries: LoreEntry[];
}

export interface ScanConfig {
  recursionDepth: number;
  scanDepth: number;
  budgetPercentage: number;
}

export interface EntryForm {
  key: string;
  keysecondary: string;
  comment: string;
  content: string;
  constant: boolean;
  selectiveLogic: SelectiveLogic;
  order: number;
}

export const EMPTY_FORM: EntryForm = {
  key: "",
  keysecondary: "",
  comment: "",
  content: "",
  constant: false,
  selectiveLogic: "AND_ANY",
  order: 100,
};

export const LOGIC_OPTIONS: SelectiveLogic[] = [
  "AND_ANY",
  "AND_ALL",
  "NOT_ALL",
  "NOT_ANY",
];

export const parseKeys = (s: string): string[] =>
  s.split(",").map((k) => k.trim()).filter(Boolean);

export const truncate = (s: string, n = 60): string =>
  s.length > n ? s.slice(0, n) + "…" : s;
