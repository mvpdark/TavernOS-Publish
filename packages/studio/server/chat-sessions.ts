// ---------------------------------------------------------------------------
// Chat session persistence — JSON-file backed storage for single-character
// chat sessions.
//
// Each session is stored as a single JSON file at:
//   {DATA_DIR}/{projectId}/chats/{characterFilename}/{sessionId}.json
//
// All writes go through `withFileLock` + `writeJson` (atomic temp+rename) so
// concurrent requests for the same session are serialized and never produce
// a partially-written file.
//
// `loadSession` and `deleteSession` only know the `sessionId`, not the
// `characterFilename`, so they scan every `chats/*/` subdirectory to locate
// the matching file.
// ---------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DATA_DIR, withFileLock, writeJson } from "./context.js";

// ---------------------------------------------------------------------------
// Public types (backend-owned — not imported from the frontend)
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  swipes: string[];
  swipeIndex: number;
  timestamp: number;
  parentId: string | null;
  edited?: boolean;
  isStreaming?: boolean;
  metadata?: {
    tokenUsage?: { prompt: number; completion: number; total: number };
    model?: string;
  };
}

export interface ChatSession {
  id: string;
  projectId: string;
  characterFilename: string;
  characterName: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  /** Author's Note — a user-authored directive injected into the LLM context
   *  at the position defined by `authorNoteDepth`. Empty by default. */
  authorNote?: string;
  /** Insertion depth (0 = after the last message, N = before the Nth-to-last
   *  message). Default 4, matching SillyTavern's convention. */
  authorNoteDepth?: number;
}

export interface ChatSessionMeta {
  id: string;
  characterFilename: string;
  characterName: string;
  title: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Root directory holding every chat session for a project. */
function chatsRoot(projectId: string): string {
  return join(DATA_DIR, projectId, "chats");
}

/** Directory holding sessions for a specific character within a project. */
function characterDir(projectId: string, characterFilename: string): string {
  return join(chatsRoot(projectId), characterFilename);
}

/** Full path to a single session file. */
function sessionPath(projectId: string, characterFilename: string, sessionId: string): string {
  return join(characterDir(projectId, characterFilename), `${sessionId}.json`);
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * List all sessions for a character, returning metadata only (no messages).
 * Results are sorted by `updatedAt` descending (most recent first).
 * Returns an empty array when the directory does not exist yet.
 */
export async function listSessions(
  projectId: string,
  characterFilename: string,
): Promise<ChatSessionMeta[]> {
  const dir = characterDir(projectId, characterFilename);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const metas: ChatSessionMeta[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const filePath = join(dir, entry);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const session = JSON.parse(raw) as ChatSession;
      metas.push({
        id: session.id,
        characterFilename: session.characterFilename,
        characterName: session.characterName,
        title: session.title,
        messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      });
    } catch {
      // Skip unreadable / corrupt session files rather than failing the list.
    }
  }

  metas.sort((a, b) => b.updatedAt - a.updatedAt);
  return metas;
}

/**
 * Load a single session by id. Because `characterFilename` is unknown, this
 * scans every character subdirectory under `chats/` for the file named
 * `{sessionId}.json`.
 * Returns null when the session does not exist.
 */
export async function loadSession(
  projectId: string,
  sessionId: string,
): Promise<ChatSession | null> {
  const root = chatsRoot(projectId);
  let subdirs: string[];
  try {
    subdirs = await fs.readdir(root);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }

  // Parallel: probe every character subdirectory for the session file at once.
  // A corrupt/missing file in one subdir must not break the lookup.
  const target = `${sessionId}.json`;
  const candidates = subdirs.map((subdir) => join(root, subdir, target));
  const results = await Promise.all(
    candidates.map((c) =>
      fs.readFile(c, "utf8").then((raw) => JSON.parse(raw) as ChatSession).catch(() => null),
    ),
  );
  return results.find((r) => r !== null) ?? null;
}

/**
 * Persist a session atomically. The `updatedAt` field is refreshed on every
 * write. The write is serialized per file path via `withFileLock` to prevent
 * concurrent writers from interleaving.
 */
export async function saveSession(session: ChatSession): Promise<void> {
  const filePath = sessionPath(
    session.projectId,
    session.characterFilename,
    session.id,
  );
  session.updatedAt = Date.now();
  await withFileLock(filePath, () => writeJson(filePath, session));
}

/**
 * Delete a session file by id. Scans every character subdirectory under
 * `chats/` to locate the file because `characterFilename` is unknown.
 * Idempotent — does not throw if the session is already gone.
 */
export async function deleteSession(
  projectId: string,
  sessionId: string,
): Promise<void> {
  const root = chatsRoot(projectId);
  let subdirs: string[];
  try {
    subdirs = await fs.readdir(root);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }

  // Parallel: attempt deletion in every character subdirectory at once.
  // Session ids are unique UUIDs so at most one file exists; ENOENT is
  // expected for all other subdirs and is silently ignored. Idempotent.
  const target = `${sessionId}.json`;
  const candidates = subdirs.map((subdir) => join(root, subdir, target));
  await Promise.all(
    candidates.map(async (candidate) => {
      try {
        await fs.rm(candidate, { force: false });
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
    }),
  );
}

/** Generate a new random session id. */
export function createSessionId(): string {
  return randomUUID();
}
