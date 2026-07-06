// ---------------------------------------------------------------------------
// Global search route — searches across chapter titles/content, character
// names/descriptions, and lorebook entries for all (or a single) project.
// Uses simple case-insensitive substring matching for performance — no
// full-text index required.
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  DATA_DIR,
  ensureDir,
  readJson,
  readValidatedCard,
  safeProjectId,
} from "../context";

/** Maximum number of results returned per category. */
const MAX_RESULTS_PER_CATEGORY = 20;

/** Snippet length in characters (first N chars of matched content). */
const SNIPPET_LENGTH = 100;

/** A single search hit. */
interface SearchResult {
  type: "chapter" | "character" | "lorebook";
  projectId: string;
  title: string;
  snippet: string;
  url: string;
}

/** Grouped search response. */
interface SearchResponse {
  chapters: SearchResult[];
  characters: SearchResult[];
  lorebook: SearchResult[];
}

/** Collapse whitespace and truncate to N characters with an ellipsis. */
function makeSnippet(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= SNIPPET_LENGTH) return clean;
  return clean.slice(0, SNIPPET_LENGTH) + "\u2026";
}

/** Case-insensitive substring test. */
function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * List all valid project ids — directories under DATA_DIR that contain a
 * tavernos.json config file. Skips tombstone folders (.__trash_*) and
 * internal staging directories (leading underscore).
 */
async function listProjectIds(): Promise<string[]> {
  await ensureDir(DATA_DIR);
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".__trash_")) continue;
    if (entry.name.startsWith("_")) continue;
    const config = await readJson<unknown>(
      join(DATA_DIR, entry.name, "tavernos.json"),
    );
    if (config) ids.push(entry.name);
  }
  return ids;
}

/** Search chapter titles and content in a single project. */
async function searchChapters(
  projectId: string,
  query: string,
): Promise<SearchResult[]> {
  const storyDir = join(DATA_DIR, projectId, "story");
  let files: string[];
  try {
    files = await fs.readdir(storyDir);
  } catch {
    return [];
  }
  const chapterFiles = files.filter((f) => f.endsWith(".json"));
  const raws = await Promise.all(
    chapterFiles.map((f) => readJson<Record<string, unknown>>(join(storyDir, f))),
  );
  const results: SearchResult[] = [];
  for (let i = 0; i < chapterFiles.length; i++) {
    const ch = raws[i];
    if (!ch) continue;
    const title = String(ch["title"] ?? "");
    const content = String(ch["content"] ?? "");
    if (matches(title, query) || matches(content, query)) {
      results.push({
        type: "chapter",
        projectId,
        title: title || "\u65e0\u6807\u9898\u7ae0\u8282",
        snippet: makeSnippet(content || title),
        url: "/write/editor",
      });
      if (results.length >= MAX_RESULTS_PER_CATEGORY) break;
    }
  }
  return results;
}

/** Search character names, descriptions, and personalities in a project. */
async function searchCharacters(
  projectId: string,
  query: string,
): Promise<SearchResult[]> {
  const charDir = join(DATA_DIR, projectId, "characters");
  let files: string[];
  try {
    files = await fs.readdir(charDir);
  } catch {
    return [];
  }
  const cardFiles = files.filter((f) => f.endsWith(".json"));
  const cards = await Promise.all(
    cardFiles.map((f) => readValidatedCard(join(charDir, f))),
  );
  const results: SearchResult[] = [];
  for (let i = 0; i < cardFiles.length; i++) {
    const card = cards[i];
    if (!card) continue;
    const name = String(card.data.name ?? "");
    const description = String(card.data.description ?? "");
    const personality = String(card.data.personality ?? "");
    const haystack = `${name} ${description} ${personality}`;
    if (matches(haystack, query)) {
      results.push({
        type: "character",
        projectId,
        title: name || "\u672a\u547d\u540d\u89d2\u8272",
        snippet: makeSnippet(description || personality || name),
        url: "/characters/chat",
      });
      if (results.length >= MAX_RESULTS_PER_CATEGORY) break;
    }
  }
  return results;
}

/** Search lorebook keys, comments, and content in a project. */
async function searchLorebook(
  projectId: string,
  query: string,
): Promise<SearchResult[]> {
  const loreDir = join(DATA_DIR, projectId, "lorebook");
  let files: string[];
  try {
    files = await fs.readdir(loreDir);
  } catch {
    return [];
  }
  const entryFiles = files.filter(
    (f) => f.endsWith(".json") && f !== "lorebook-config.json",
  );
  const raws = await Promise.all(
    entryFiles.map((f) => readJson<Record<string, unknown>>(join(loreDir, f))),
  );
  const results: SearchResult[] = [];
  for (let i = 0; i < entryFiles.length; i++) {
    const entry = raws[i];
    if (!entry) continue;
    const comment = String(entry["comment"] ?? "");
    const content = String(entry["content"] ?? "");
    const keys = Array.isArray(entry["key"])
      ? (entry["key"] as string[]).join(" ")
      : "";
    const haystack = `${comment} ${content} ${keys}`;
    if (matches(haystack, query)) {
      results.push({
        type: "lorebook",
        projectId,
        title: comment || keys || "\u672a\u547d\u540d\u6761\u76ee",
        snippet: makeSnippet(content || comment || keys),
        url: "/world/lorebook",
      });
      if (results.length >= MAX_RESULTS_PER_CATEGORY) break;
    }
  }
  return results;
}

export function createSearchRouter(): Hono {
  const router = new Hono();

  // GET /api/search?q=<query>&projectId=<optional>
  router.get("/api/search", async (c) => {
    const query = c.req.query("q")?.trim() ?? "";
    const projectIdParam = c.req.query("projectId")?.trim();

    // Empty query — return empty results immediately.
    if (!query) {
      const empty: SearchResponse = { chapters: [], characters: [], lorebook: [] };
      return c.json(empty);
    }

    // Determine which projects to search.
    let projectIds: string[];
    if (projectIdParam) {
      // Validate the projectId path segment to prevent traversal.
      try {
        safeProjectId(projectIdParam);
      } catch {
        return c.json({ error: "Invalid projectId" }, 400);
      }
      projectIds = [projectIdParam];
    } else {
      projectIds = await listProjectIds();
    }

    // Search all target projects in parallel, then flatten per category.
    const [chapterResults, characterResults, lorebookResults] =
      await Promise.all([
        Promise.all(projectIds.map((pid) => searchChapters(pid, query))).then(
          (r) => r.flat(),
        ),
        Promise.all(projectIds.map((pid) => searchCharacters(pid, query))).then(
          (r) => r.flat(),
        ),
        Promise.all(projectIds.map((pid) => searchLorebook(pid, query))).then(
          (r) => r.flat(),
        ),
      ]);

    const response: SearchResponse = {
      chapters: chapterResults.slice(0, MAX_RESULTS_PER_CATEGORY),
      characters: characterResults.slice(0, MAX_RESULTS_PER_CATEGORY),
      lorebook: lorebookResults.slice(0, MAX_RESULTS_PER_CATEGORY),
    };
    return c.json(response);
  });

  return router;
}
