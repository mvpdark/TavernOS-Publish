// ---------------------------------------------------------------------------
// Lorebook entry CRUD routes + scan config.
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  LoreEntrySchema,
  LoreScanConfigSchema,
  type LoreEntry,
  type LoreScanConfig,
} from "@tavernos/core";
import { DATA_DIR, ensureDir, readJson, writeJson, safeProjectId, safeFilename } from "../context";
import { syncProp, deletePropSync } from "../sync/sync";

const CONFIG_FILE = "lorebook-config.json";

const DEFAULT_CONFIG: LoreScanConfig = {
  recursionEnabled: false,
  maxRecursionSteps: 0,
  scanDepth: 2,
  recursionDepth: 1,
  budgetPercentage: 25,
  budgetCap: 0,
  minActivations: 0,
  sortFn: "order",
};

export function createLorebookRouter(): Hono {
  const router = new Hono();

  // Get lorebook scan config
  router.get("/api/projects/:projectId/lorebook/config", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const loreDir = join(DATA_DIR, projectId, "lorebook");
    await ensureDir(loreDir);
    const raw = await readJson<unknown>(join(loreDir, CONFIG_FILE));
    if (raw === null) return c.json(DEFAULT_CONFIG);
    // Validate loaded config via Zod schema, fall back to defaults
    const parsed = LoreScanConfigSchema.safeParse(raw);
    return c.json(parsed.success ? parsed.data : DEFAULT_CONFIG);
  });

  // Save lorebook scan config
  router.put("/api/projects/:projectId/lorebook/config", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const body = await c.req.json<Record<string, unknown>>();
    const loreDir = join(DATA_DIR, projectId, "lorebook");
    await ensureDir(loreDir);

    // Validate config via Zod schema (handles defaults, clamping, and type coercion)
    const parsed = LoreScanConfigSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: `Invalid configuration: ${parsed.error.message}` }, 400);
    }
    const config = parsed.data;

    await writeJson(join(loreDir, CONFIG_FILE), config);
    syncProp(projectId, CONFIG_FILE);
    return c.json(config);
  });

  // List all lorebook entries
  router.get("/api/projects/:projectId/lorebook", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const loreDir = join(DATA_DIR, projectId, "lorebook");
    await ensureDir(loreDir);
    const files = await fs.readdir(loreDir);

    // Parallelize file reads for all entry files
    const entryFiles = files.filter((f) => f.endsWith(".json") && f !== CONFIG_FILE);
    const raws = await Promise.all(
      entryFiles.map((file) => readJson<unknown>(join(loreDir, file))),
    );

    const entries: (LoreEntry & { filename: string })[] = [];
    for (let i = 0; i < entryFiles.length; i++) {
      const raw = raws[i];
      if (raw === null) continue;
      // Validate entry via Zod schema, skip invalid entries
      const parsed = LoreEntrySchema.safeParse(raw);
      if (parsed.success) {
        entries.push({ filename: entryFiles[i], ...parsed.data });
      }
    }
    return c.json({ entries });
  });

  // Create a new lorebook entry
  router.post("/api/projects/:projectId/lorebook", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const body = await c.req.json<Record<string, unknown>>();
    const uid = (body["uid"] as number) ?? Date.now();
    const filename = `entry-${uid}.json`;
    const loreDir = join(DATA_DIR, projectId, "lorebook");
    await ensureDir(loreDir);

    // Ensure uid is present, then validate entry via Zod schema (applies defaults)
    const entry = LoreEntrySchema.parse({ ...body, uid });

    await writeJson(join(loreDir, filename), entry);
    syncProp(projectId, filename);
    return c.json({ filename, ...entry }, 201);
  });

  // Update an existing lorebook entry
  router.put("/api/projects/:projectId/lorebook/:filename", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const filename = safeFilename(c.req.param("filename"));
    const body = await c.req.json<Record<string, unknown>>();
    const loreDir = join(DATA_DIR, projectId, "lorebook");

    // Read existing entry to preserve uid if not provided
    const existing = await readJson<Record<string, unknown>>(join(loreDir, filename));
    const uid = (body["uid"] as number) ?? (existing?.["uid"] as number) ?? Date.now();

    const entry = LoreEntrySchema.parse({ ...body, uid });
    await writeJson(join(loreDir, filename), entry);
    syncProp(projectId, filename);
    return c.json({ filename, ...entry });
  });

  // Delete a lorebook entry
  router.delete("/api/projects/:projectId/lorebook/:filename", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const filename = safeFilename(c.req.param("filename"));
    const filePath = join(DATA_DIR, projectId, "lorebook", filename);
    try {
      await fs.unlink(filePath);
      deletePropSync(projectId, filename);
      return c.json({ success: true });
    } catch {
      return c.json({ error: "Entry not found" }, 404);
    }
  });

  return router;
}
