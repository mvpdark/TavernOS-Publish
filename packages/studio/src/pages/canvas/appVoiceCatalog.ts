import { persistStorageJson, STORAGE_KEYS } from "./canvasPersistence";

export type VoiceCatalogItem = {
	displayName: string;
	voiceId: string;
	provider?: string;
	source?: string;
};

export type VoiceCatalogStorage = {
	voices?: VoiceCatalogItem[];
	updatedAt?: number;
};

export function collectVoiceCatalogItems(value: unknown, provider: string = "minimax"): VoiceCatalogItem[] {
	const results: VoiceCatalogItem[] = [];
	const seen = new WeakSet<object>();
	function visit(item: unknown) {
		if (typeof item === "string") {
			item.split(/\r?\n/).forEach((line) => {
				const match = line.match(/^\s*-\s*([^:：]+)[:：]\s*(.+?)\s*$/);
				if (!match) return;
				const voiceId = match[1]?.trim();
				const displayName = match[2]?.trim();
				if (!voiceId) return;
				results.push({
					displayName: displayName || voiceId,
					voiceId,
					provider,
					source: "official",
				});
			});
			return;
		}
		if (!item || typeof item !== "object") return;
		if (seen.has(item)) return;
		seen.add(item);
		if (Array.isArray(item)) {
			item.forEach(visit);
			return;
		}
		const record = item as Record<string, unknown>;
		const voiceId = ["voice_id", "voiceId", "id"].map((key) => record[key]).find((entry) => typeof entry === "string" && entry.trim());
		if (typeof voiceId === "string") {
			const displayName = ["voice_name", "voiceName", "name", "display_name"].map((key) => record[key]).find((entry) => typeof entry === "string" && entry.trim());
			results.push({
				displayName: typeof displayName === "string" ? displayName : voiceId,
				voiceId,
				provider,
				source: "official",
			});
		}
		Object.values(record).forEach(visit);
	}
	visit(value);
	return results;
}

export function persistVoiceCatalog(voices: VoiceCatalogItem[]) {
	persistStorageJson(STORAGE_KEYS.voiceCatalog, {
		voices,
		updatedAt: Date.now(),
	} satisfies VoiceCatalogStorage);
}
