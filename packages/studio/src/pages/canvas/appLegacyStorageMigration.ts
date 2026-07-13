import {
	LEGACY_STORAGE_KEYS,
	STORAGE_KEYS,
	STORAGE_MIGRATION_MARKER_KEY,
} from "./canvasPersistence";

export type TapViewportStorage = {
	state?: {
		viewports?: Record<string, { x: number; y: number; zoom: number }>;
	};
	version?: number;
};
export type TapModelPrefsStorage = {
	lastUsedModels?: Partial<
		Record<"text" | "image" | "video" | "audio" | "music", string>
	>;
	modelConfigs?: Record<
		string,
		Record<string, string | number | boolean | undefined>
	>;
	_meta?: { version?: number; updatedAt?: number };
};
export type TapNoticesStorage = Record<
	string,
	{ dismissed?: boolean; expiresAt?: string }
>;
export type TapTutorialTipsStorage = {
	state?: {
		tips?: Record<string, { dismissCount?: number; neverShow?: boolean }>;
	};
	version?: number;
};
export type MiniMaxTokenPlanStorage = {
	rawText?: string;
	updatedAt?: number;
};

const LEGACY_MODEL_VALUE_MIGRATIONS = {
	"tapnow-image-turbo": "kakashow-image-turbo",
} as const;

export function migrateLegacyModelPrefs(value: TapModelPrefsStorage) {
	let changed = false;
	const next = JSON.parse(JSON.stringify(value ?? {})) as TapModelPrefsStorage;
	const entries = Object.entries(LEGACY_MODEL_VALUE_MIGRATIONS) as Array<
		[string, string]
	>;
	type ModelPrefsKey = keyof NonNullable<
		TapModelPrefsStorage["lastUsedModels"]
	>;

	if (next.lastUsedModels) {
		(Object.keys(next.lastUsedModels) as ModelPrefsKey[]).forEach((type) => {
			const current = next.lastUsedModels?.[type];
			const migrated = current
				? LEGACY_MODEL_VALUE_MIGRATIONS[
						current as keyof typeof LEGACY_MODEL_VALUE_MIGRATIONS
					]
				: undefined;
			if (migrated && next.lastUsedModels) {
				next.lastUsedModels[type] = migrated;
				changed = true;
			}
		});
	}

	if (next.modelConfigs) {
		entries.forEach(([legacyValue, nextValue]) => {
			if (next.modelConfigs?.[legacyValue]) {
				next.modelConfigs[nextValue] = next.modelConfigs[legacyValue];
				delete next.modelConfigs[legacyValue];
				changed = true;
			}
		});
	}

	return changed ? next : value;
}

let hasRunLegacyStorageMigration = false;

export function migrateLegacyStorage() {
	if (typeof window === "undefined" || hasRunLegacyStorageMigration) return;
	const getItem = (storageKey: string) => {
		try {
			return window.localStorage.getItem(storageKey);
		} catch {
			return null;
		}
	};
	const setItem = (storageKey: string, value: string) => {
		try {
			window.localStorage.setItem(storageKey, value);
			return true;
		} catch {
			return false;
		}
	};
	const removeItem = (storageKey: string) => {
		try {
			window.localStorage.removeItem(storageKey);
		} catch {
			/* ignore */
		}
	};

	if (getItem(STORAGE_MIGRATION_MARKER_KEY) === "1") {
		hasRunLegacyStorageMigration = true;
		return;
	}
	hasRunLegacyStorageMigration = true;

	const migrationReport: string[] = [];

	const migrateStringKey = (legacyKey: string, nextKey: string) => {
		const nextValue = getItem(nextKey);
		const legacyValue = getItem(legacyKey);
		let migrated = false;
		if (legacyValue !== null && nextValue === null) {
			migrated = setItem(nextKey, legacyValue);
		}
		if (legacyValue !== null) {
			removeItem(legacyKey);
			migrationReport.push(
				`${legacyKey} -> ${nextKey}${migrated ? "" : " (removed legacy only)"}`,
			);
		}
	};

	const migrateJsonKey = <T,>(
		legacyKey: string,
		nextKey: string,
		transform?: (value: T) => T,
	) => {
		const nextRaw = getItem(nextKey);
		const legacyRaw = getItem(legacyKey);
		let migrated = false;

		if (legacyRaw !== null && nextRaw === null) {
			try {
				const parsed = JSON.parse(legacyRaw) as T;
				const nextValue = transform ? transform(parsed) : parsed;
				migrated = setItem(nextKey, JSON.stringify(nextValue));
			} catch {
				migrated = setItem(nextKey, legacyRaw);
			}
		}

		if (nextRaw !== null && transform) {
			try {
				const parsed = JSON.parse(nextRaw) as T;
				const transformed = transform(parsed);
				if (JSON.stringify(transformed) !== nextRaw) {
					migrated = setItem(nextKey, JSON.stringify(transformed)) || migrated;
				}
			} catch {
				// Keep current value if it's not valid JSON.
			}
		}

		if (legacyRaw !== null) {
			removeItem(legacyKey);
			migrationReport.push(
				`${legacyKey} -> ${nextKey}${migrated ? "" : " (removed legacy only)"}`,
			);
		}
	};

	migrateJsonKey<TapViewportStorage>(
		LEGACY_STORAGE_KEYS.viewport,
		STORAGE_KEYS.viewport,
	);
	migrateJsonKey<TapModelPrefsStorage>(
		LEGACY_STORAGE_KEYS.modelPrefs,
		STORAGE_KEYS.modelPrefs,
		migrateLegacyModelPrefs,
	);
	migrateStringKey(LEGACY_STORAGE_KEYS.language, STORAGE_KEYS.language);
	migrateJsonKey<TapNoticesStorage>(
		LEGACY_STORAGE_KEYS.notices,
		STORAGE_KEYS.notices,
	);
	migrateJsonKey<TapTutorialTipsStorage>(
		LEGACY_STORAGE_KEYS.tips,
		STORAGE_KEYS.tips,
	);

	if (migrationReport.length) {
		console.info(
			"[kakashow] Legacy storage migration completed:",
			migrationReport.join("; "),
		);
	}
	setItem(STORAGE_MIGRATION_MARKER_KEY, "1");
}
