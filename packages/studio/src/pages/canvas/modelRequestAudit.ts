export type ModelRequestAuditStatus = "attempt" | "success" | "failed";

export type ModelRequestAuditEntry = {
	 id: string;
	 timestamp: number;
	 endpoint: string;
	 method: string;
	 model: string;
	 nodeType: string;
	 flow: string;
	 nodeId?: string;
	 status: ModelRequestAuditStatus;
	 requestScopeId?: string;
	 error?: string;
	 details?: Record<string, string | number | boolean | null | undefined>;
};

const MODEL_REQUEST_AUDIT_STORAGE_KEY = "kaka:model-request-audit:v1";
const MODEL_REQUEST_AUDIT_MAX_ENTRIES = 300;

function readStorage<T>(key: string, fallback: T): T {
	if (typeof window === "undefined") return fallback;
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function writeStorage<T>(key: string, value: T) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// ignore
	}
}

function sanitizeModel(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function buildAuditId() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readEntries() {
	return readStorage<ModelRequestAuditEntry[]>(
		MODEL_REQUEST_AUDIT_STORAGE_KEY,
		[],
	);
}

function writeEntries(entries: ModelRequestAuditEntry[]) {
	writeStorage(MODEL_REQUEST_AUDIT_STORAGE_KEY, entries);
}

function normalizeFlow(flow: unknown) {
	return typeof flow === "string" && flow.trim() ? flow.trim() : "unknown";
}

function normalizeMethod(method: unknown) {
	return typeof method === "string" && method.trim() ? method.trim() : "POST";
}

function normalizeEndpoint(endpoint: unknown) {
	return typeof endpoint === "string" && endpoint.trim() ? endpoint.trim() : "";
}

function normalizeNodeType(nodeType: unknown) {
	return typeof nodeType === "string" && nodeType.trim() ? nodeType.trim() : "unknown";
}

function normalizeDetails(value: unknown): Record<string, string | number | boolean | null | undefined> | undefined {
	if (!value || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;
	const output: Record<string, string | number | boolean | null | undefined> = {};
	for (const [key, raw] of Object.entries(record)) {
		if (
			typeof key !== "string" ||
			typeof raw === "undefined" ||
			typeof raw === "symbol"
		) {
			continue;
		}
		if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" || raw === null) {
			output[key] = raw;
		}
	}
	return output;
}

export function appendModelRequestAudit(entry: {
	endpoint: string;
	method?: string;
	nodeType: string;
	model: string;
	flow?: string;
	nodeId?: string;
	requestScopeId?: string;
	status?: ModelRequestAuditStatus;
	error?: string;
	details?: Record<string, string | number | boolean | null | undefined>;
}) {
	const model = sanitizeModel(entry.model);
	if (!model) return null;
	const nextId = buildAuditId();
	const nextEntry: ModelRequestAuditEntry = {
		id: nextId,
		timestamp: Date.now(),
		endpoint: normalizeEndpoint(entry.endpoint),
		method: normalizeMethod(entry.method),
		model,
		nodeType: normalizeNodeType(entry.nodeType),
		flow: normalizeFlow(entry.flow),
		nodeId: sanitizeModel(entry.nodeId),
		requestScopeId: sanitizeModel(entry.requestScopeId),
		status: entry.status ?? "attempt",
		error: sanitizeModel(entry.error),
		details: normalizeDetails(entry.details),
	};
	const entries = readEntries().filter((item) => item.id !== nextId);
	entries.push(nextEntry);
	if (entries.length > MODEL_REQUEST_AUDIT_MAX_ENTRIES) {
		entries.splice(0, entries.length - MODEL_REQUEST_AUDIT_MAX_ENTRIES);
	}
	writeEntries(entries);
	return nextId;
}

export function patchModelRequestAuditStatus(id: string | null, status: ModelRequestAuditStatus, error?: string) {
	if (!id) return;
	const entries = readEntries();
	const index = entries.findIndex((entry) => entry.id === id);
	if (index < 0) return;
	entries[index] = {
		...entries[index],
		status,
		error: sanitizeModel(error) || entries[index].error,
	};
	writeEntries(entries);
}

export function getModelRequestAudits(withinMinutes = 10) {
	const now = Date.now();
	const windowMs = withinMinutes > 0 ? withinMinutes * 60 * 1000 : 0;
	const earliest = windowMs > 0 ? now - windowMs : 0;
	const entries = readEntries().filter((entry) => entry.timestamp >= earliest);
	return entries.sort((a, b) => b.timestamp - a.timestamp);
}

export function getRecentVideoModelRequestAudits(withinMinutes = 10) {
	return getModelRequestAudits(withinMinutes).filter((entry) => entry.nodeType === "video");
}

export function clearModelRequestAudits() {
	writeStorage(MODEL_REQUEST_AUDIT_STORAGE_KEY, []);
}
