// ---------------------------------------------------------------------------
// Project management routes: list, create, get, delete, and stats.
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import { promises as fs, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import {
  AssetCatalogManager,
  emptyCatalog,
  type AssetCatalog,
  loadTruthContext,
  loadStoryBible,
  createAssetExtractor,
} from "@tavernos/core";
import {
  DATA_DIR,
  ensureDir,
  readJson,
  writeJson,
  safeProjectId,
  loadSettings,
  createImageClientFromSettings,
  withFileLock,
  buildAgentContexts,
} from "../context";
import { taskManager } from "../task-manager";
import { syncProjectMeta, deleteProjectSyncByName, syncChapter } from "../sync/sync";
import { syncCharacterCards } from "../character-sync.js";
import { generateEpub } from "../epub-generator";

// ---------------------------------------------------------------------------
// Asset catalog file path helper
// ---------------------------------------------------------------------------

/** Path to the project's accumulated asset catalog JSON file. */
function assetCatalogPath(projectId: string): string {
  return join(DATA_DIR, projectId, "asset-catalog.json");
}

/** Valid asset kinds for the /assets/:kind endpoint. */
const VALID_KINDS = ["characters", "scenes", "props"] as const;
type AssetKindParam = (typeof VALID_KINDS)[number];

// ---------------------------------------------------------------------------
// Book cover prompt builder — structured, genre-adaptive.
// Research-based: follows the "atomic schema" pattern from awesome-gpt-image-2
// (subject → lighting → material → layout → constraints).
// ---------------------------------------------------------------------------

interface GenreStyle {
  artDirection: string;
  colorPalette: string;
  lighting: string;
  mood: string;
  composition: string;
}

/** Match genre string to a visual style profile. */
function matchGenreStyle(genre: string): GenreStyle {
  // Chinese genre keywords → English style mapping.
  if (/(悬疑|推理|惊悚|恐怖|thriller|mystery|horror)/i.test(genre)) {
    return {
      artDirection: "dark cinematic illustration, noir aesthetic, high-contrast shadows",
      colorPalette: "deep blacks, cold blues, muted golds, blood-red accents",
      lighting: "low-key chiaroscuro lighting, single dramatic light source, long shadows",
      mood: "tense, ominous, mysterious",
      composition: "off-center subject, negative space, dutch angle suggestion",
    };
  }
  if (/(言情|爱情|浪漫|romance)/i.test(genre)) {
    return {
      artDirection: "soft painterly illustration, romantic realism",
      colorPalette: "warm rose, soft cream, golden hour tones, muted teal",
      lighting: "warm diffused lighting, golden hour glow, soft bokeh",
      mood: "tender, intimate, longing",
      composition: "centered or symmetrical, soft focus edges, elegant curves",
    };
  }
  if (/(科幻|sci-?fi|赛博|future)/i.test(genre)) {
    return {
      artDirection: "digital matte painting, concept art, futuristic illustration",
      colorPalette: "neon cyan, deep purple, electric blue, metallic silver",
      lighting: "volumetric lighting, neon glow, lens flare, holographic reflections",
      mood: "awe-inspiring, cold, vast",
      composition: "wide-angle perspective, converging lines, scale contrast",
    };
  }
  if (/(奇幻|玄幻|仙侠|fantasy)/i.test(genre)) {
    return {
      artDirection: "epic fantasy illustration, oil painting style, rich textures",
      colorPalette: "emerald green, deep gold, royal purple, ancient bronze",
      lighting: "god rays through clouds, magical particles, warm rim light",
      mood: "mythic, grand, wondrous",
      composition: "heroic low angle, central focal point, sweeping landscape",
    };
  }
  if (/(历史|战争|军事|historical|war)/i.test(genre)) {
    return {
      artDirection: "historical realism painting, muted earthy tones",
      colorPalette: "sepia, dark olive, weathered bronze, dusty red",
      lighting: "overcast diffuse light, smoke-filled atmosphere, warm firelight",
      mood: "somber, epic, weighty",
      composition: "wide tableau, layered depth, architectural framing",
    };
  }
  if (/(都市|现代|现实|urban|contemporary)/i.test(genre)) {
    return {
      artDirection: "contemporary illustration, clean editorial style",
      colorPalette: "neutral grays, accent amber, deep navy, soft white",
      lighting: "natural daylight, urban neon reflections, soft window light",
      mood: " grounded, modern, introspective",
      composition: "rule of thirds, urban silhouette, minimal foreground",
    };
  }
  // Default: atmospheric literary fiction.
  return {
    artDirection: "literary fiction illustration, fine art painting style",
    colorPalette: "muted earth tones, soft amber, deep teal, warm ivory",
    lighting: "soft directional light, atmospheric haze, gentle gradation",
    mood: "evocative, atmospheric, contemplative",
    composition: "balanced composition, strong silhouette, elegant negative space",
  };
}

/** Extract a concise visual motif from selling points or premise. */
function extractVisualMotif(sellingPoints?: string, premise?: string): string {
  // Combine and take the first ~80 chars as visual inspiration.
  const source = (sellingPoints || premise || "").slice(0, 200);
  if (!source) return "";
  // Translate key visual cues — the image model handles mixed-language prompts
  // better when the descriptive body is in English. We keep the raw text as
  // narrative context and wrap it.
  return source;
}

/** Build the final structured prompt. */
function buildCoverPrompt(opts: {
  title: string;
  genre: string;
  protagonist?: string;
  premise?: string;
  visualMotif?: string;
  genreStyle: GenreStyle;
}): string {
  const parts: string[] = [];

  // 1. Art direction + format
  parts.push(
    `A professional novel book cover illustration. ${opts.genreStyle.artDirection}.`,
  );

  // 2. Subject — protagonist or scene from story data
  if (opts.protagonist) {
    parts.push(
      `Subject: a character suggesting "${opts.protagonist.slice(0, 120)}", rendered as a striking silhouette or half-figure integrated into the cover composition.`,
    );
  } else {
    parts.push(
      `Subject: an evocative symbolic scene representing the story's core conflict.`,
    );
  }

  // 3. Visual motif from story data
  if (opts.visualMotif) {
    parts.push(
      `Narrative context: ${opts.visualMotif.slice(0, 150)}`,
    );
  }

  // 4. Color, lighting, mood
  parts.push(
    `Color palette: ${opts.genreStyle.colorPalette}.`,
    `Lighting: ${opts.genreStyle.lighting}.`,
    `Mood: ${opts.genreStyle.mood}.`,
  );

  // 5. Composition + layout
  parts.push(
    `Composition: ${opts.genreStyle.composition}. Portrait orientation (3:4). The image should feel like a real published book cover — strong visual hierarchy, title-safe zone at top, clean areas for typography overlay.`,
  );

  // 6. Material / texture
  parts.push(
    `Texture: subtle paper grain, fine art print quality, no glossy 3D render look.`,
  );

  // 7. Constraints — strict no-text directive
  parts.push(
    `CRITICAL: Do NOT render any text, letters, titles, or typography on the image. The cover art must be text-free for later typography overlay. No watermarks, no signatures, no logos.`,
  );

  return parts.join("\n");
}

export function createProjectsRouter(): Hono {
  const router = new Hono();

  // List all projects
  router.get("/api/projects", async (c) => {
    try {
      await ensureDir(DATA_DIR);
      const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    // Skip non-directories and tombstone folders (.__trash_ prefix).
    const projectDirs = entries.filter(
      (e) => e.isDirectory() && !e.name.startsWith(".__trash_"),
    );

    // Batch-read all project configs in parallel (avoids sequential N+1 reads).
    const configs = await Promise.all(
      projectDirs.map((entry) =>
        readJson<{
          name: string;
          version: string;
          language?: string;
          type?: string;
          genre?: string;
          createdAt?: string;
          blueprint?: {
            premise?: string;
            protagonist?: string;
            sellingPoints?: string;
          };
          styleId?: string;
        }>(join(DATA_DIR, entry.name, "tavernos.json")),
      ),
    );

    const projects: unknown[] = [];
    for (let i = 0; i < projectDirs.length; i++) {
      const config = configs[i];
      if (config) {
        projects.push({ id: projectDirs[i].name, ...config, name: config.name ?? projectDirs[i].name });
      }
    }

    // Pagination support: optional ?page=1&limit=20 query params.
    // When params are absent, return all projects for backward compatibility.
    const pageRaw = c.req.query("page");
    const limitRaw = c.req.query("limit");
    if (pageRaw !== undefined || limitRaw !== undefined) {
      const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
      const limit = Math.max(1, parseInt(limitRaw ?? "20", 10) || 20);
      const total = projects.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const paged = projects.slice(start, start + limit);
      return c.json({ projects: paged, total, page, limit, totalPages });
    }

    return c.json({ projects });
    } catch (err) {
      console.error("[projects] GET /api/projects error:", err);
      return c.json({ error: "Failed to list projects", projects: [] }, 500 as 500);
    }
  });

  // Create a new project
  router.post("/api/projects", async (c) => {
    const body = await c.req.json<{
      name: string;
      language?: string;
      /** Project length category. "long" = long-form serial, "short" = short story. */
      type?: "long" | "short";
      /** Story genre (e.g. 奇幻, 科幻, 悬疑). Free-form string. */
      genre?: string;
    }>();
    // P1 fix: guard against undefined body.name to prevent TypeError on .toLowerCase()
    const projectId =
      (body.name || "")
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
        .replace(/^-|-$/g, "") || `project-${Date.now()}`;
    const projectDir = join(DATA_DIR, projectId);
    // P1 fix: check for existing project to prevent silent config overwrite
    const existingConfig = await readJson(join(projectDir, "tavernos.json"));
    if (existingConfig) {
      return c.json({ error: `Project "${body.name}" already exists` }, 409);
    }
    await ensureDir(projectDir);
    await ensureDir(join(projectDir, "characters"));
    await ensureDir(join(projectDir, "lorebook"));
    await ensureDir(join(projectDir, "story"));

    const config = {
      name: body.name,
      version: "0.1.0" as const,
      language: body.language ?? "zh",
      type: body.type ?? "long",
      genre: body.genre ?? "",
      coverUrl: "" as string, // 封面图 URL，创建后由前端触发生成
      createdAt: new Date().toISOString(),
    };
    await writeJson(join(projectDir, "tavernos.json"), config);
    // Mirror project metadata to WebDAV (creates the Novels/{name}/ folder).
    syncProjectMeta(projectId);
    return c.json({ id: projectId, ...config }, 201);
  });

  // Get a single project
  router.get("/api/projects/:projectId", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const config = await readJson(join(DATA_DIR, projectId, "tavernos.json"));
    if (!config) return c.json({ error: "Project not found" }, 404);
    return c.json({ id: projectId, ...config });
  });

  // Delete a project
  router.delete("/api/projects/:projectId", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const projectDir = join(DATA_DIR, projectId);
    const configPath = join(projectDir, "tavernos.json");

    // Capture the project name for WebDAV cleanup before any local removal.
    const config = await readJson<{ name?: string }>(configPath);

    // Best-effort recursive removal. On Windows, files can be briefly locked
    // by Defender real-time scanning or recently-opened handles, which makes
    // fs.rm either throw EBUSY/EPERM or — with force — silently skip locked
    // entries while reporting success. Use force + retries to ride out
    // transient locks.
    try {
      await fs.rm(projectDir, {
        recursive: true,
        force: true,
        maxRetries: 6,
        retryDelay: 250,
      });
    } catch (e) {
      console.error("[projects] rm failed:", e);
    }

    // If the directory survived (persistent lock), strip its tavernos.json so
    // it disappears from the project list immediately. A future create with
    // the same id will reclaim/overwrite the leftover folder.
    if (existsSync(projectDir)) {
      await fs.unlink(configPath).catch(() => {});
      // Rename to a tombstone folder so the original projectId path is gone.
      // rename() succeeds against read-only locks that block fs.rm on Windows
      // (it only rewrites the directory entry, not file contents). The
      // tombstone is cleaned up asynchronously and on next server start.
      const tombstone = join(DATA_DIR, `.__trash_${projectId}_${Date.now()}`);
      try {
        await fs.rename(projectDir, tombstone);
        void fs.rm(tombstone, { recursive: true, force: true, maxRetries: 6, retryDelay: 500 }).catch(() => {});
      } catch {
        // rename also blocked — leave the stripped folder; it's invisible to
        // the project list (no tavernos.json) and will be reclaimed on reuse.
      }
    }

    // WebDAV cleanup is best-effort. novelFolder falls back to the projectId
    // when tavernos.json is already gone, so a residual remote folder is
    // harmless and can be cleaned up manually later.
    void Promise.resolve(deleteProjectSyncByName(projectId, config?.name)).catch((e: unknown) => console.error("[projects] sync failed:", e));

    return c.json({ success: true });
  });

  // Bind/unbind a writing style to a project
  router.put("/api/projects/:projectId/style", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const configPath = join(DATA_DIR, projectId, "tavernos.json");
    const body = await c.req.json<{ styleId?: string | null }>();

    // Wrap read-modify-write in a file lock to prevent concurrent updates
    // from clobbering each other (e.g. two simultaneous style binds).
    return withFileLock(configPath, async () => {
      const config = await readJson<Record<string, unknown>>(configPath);
      if (!config) {
        return c.json({ error: "Project not found" }, 404);
      }
      if (body.styleId === null || body.styleId === undefined) {
        delete config.styleId;
      } else {
        config.styleId = body.styleId;
      }
      await writeJson(configPath, config);
      return c.json({ success: true, styleId: config.styleId ?? null });
    });
  });

  // Project statistics
  router.get("/api/projects/:projectId/stats", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const projectDir = join(DATA_DIR, projectId);

    const charDir = join(projectDir, "characters");
    const loreDir = join(projectDir, "lorebook");
    const storyDir = join(projectDir, "story");

    // Parallelize directory creation + listing for all 3 directories
    const [charFiles, loreFiles, storyFiles] = await Promise.all([
      ensureDir(charDir).then(() => fs.readdir(charDir)),
      ensureDir(loreDir).then(() => fs.readdir(loreDir)),
      ensureDir(storyDir).then(() => fs.readdir(storyDir)),
    ]);

    const charCount = charFiles.filter((f) => f.endsWith(".json")).length;
    const loreCount = loreFiles.filter((f) => f.endsWith(".json")).length;
    const chapterFiles = storyFiles.filter((f) => f.endsWith(".json"));

    // Parallelize chapter file reads for word count calculation
    const chapters = await Promise.all(
      chapterFiles.map((file) =>
        readJson<{ content?: string }>(join(storyDir, file)),
      ),
    );
    const totalWords = chapters.reduce(
      (sum, ch) => sum + (ch?.content?.length ?? 0),
      0,
    );

    return c.json({
      characters: charCount,
      loreEntries: loreCount,
      chapters: chapterFiles.length,
      totalWords,
    });
  });

  // -------------------------------------------------------------------------
  // Truth files (the novel's "absolute truth" layer)
  // -------------------------------------------------------------------------

  // Read the persisted truth files: story-bible.md, book-rules.md, and the
  // rendered story-state projection. Used by the UI to inspect world state,
  // hooks, and summaries accumulated across chapters.
  router.get("/api/projects/:projectId/truth", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const projectRoot = join(DATA_DIR, projectId);
    // P1 fix: wrap loadTruthContext in try/catch to return 500 instead of crashing
    try {
      const truth = await loadTruthContext(projectRoot);
      return c.json({
        storyBible: truth.storyBible,
        bookRules: truth.bookRules,
        currentState: truth.currentState,
        snapshot: truth.snapshot,
      });
    } catch (e) {
      return c.json({ error: `Failed to load truth context: ${e instanceof Error ? e.message : String(e)}` }, 500);
    }
  });

  // -------------------------------------------------------------------------
  // Asset catalog endpoints
  // -------------------------------------------------------------------------

  // Get the full asset catalog for a project
  router.get("/api/projects/:projectId/assets", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const raw = await readJson<unknown>(assetCatalogPath(projectId));
    if (!raw) {
      return c.json(emptyCatalog());
    }
    // raw is already parsed JSON (readJson does JSON.parse), but we need
    // to re-validate through the catalog manager for safety.
    // P1 fix: wrap parseCatalog in try/catch to return empty catalog on parse failure
    try {
      const catalog = AssetCatalogManager.parseCatalog(
        typeof raw === "string" ? raw : JSON.stringify(raw),
      );
      return c.json(catalog);
    } catch {
      return c.json(emptyCatalog());
    }
  });

  // Get assets filtered by kind (characters / scenes / props)
  router.get("/api/projects/:projectId/assets/:kind", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const kind = c.req.param("kind") as AssetKindParam;
    if (!VALID_KINDS.includes(kind)) {
      return c.json({ error: `Invalid kind. Must be one of: ${VALID_KINDS.join(", ")}` }, 400);
    }
    const raw = await readJson<unknown>(assetCatalogPath(projectId));
    if (!raw) {
      return c.json({ assets: [] });
    }
    // P1 fix: wrap parseCatalog in try/catch to return empty list on parse failure
    try {
      const catalog: AssetCatalog = AssetCatalogManager.parseCatalog(
        typeof raw === "string" ? raw : JSON.stringify(raw),
      );
      return c.json({ assets: catalog[kind] });
    } catch {
      return c.json({ assets: [] });
    }
  });

  // -------------------------------------------------------------------------
  // 封面图生成
  // -------------------------------------------------------------------------

  // POST /api/projects/:projectId/generate-cover — 为项目生成封面图
  router.post("/api/projects/:projectId/generate-cover", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const configPath = join(DATA_DIR, projectId, "tavernos.json");
    const config = await readJson<{
      name: string;
      genre?: string;
      type?: string;
      blueprint?: { premise?: string; protagonist?: string; sellingPoints?: string };
      coverUrl?: string;
    }>(configPath);
    if (!config) {
      return c.json({ error: "Project not found" }, 404);
    }

    // 构建封面图 prompt — 结构化模板，按类型自适应视觉风格
    const genre = (config.genre ?? "").toLowerCase();
    const blueprint = config.blueprint ?? {};
    const protagonist = blueprint.protagonist?.trim();
    const premise = blueprint.premise?.trim();
    const sellingPoints = blueprint.sellingPoints?.trim();

    // 按类型匹配视觉风格
    const genreStyle = matchGenreStyle(genre);

    // 从卖点中提取核心视觉意象
    const visualMotif = extractVisualMotif(sellingPoints, premise);

    // 构建英文结构化 prompt（避免中文书名导致文字渲染问题）
    const prompt = buildCoverPrompt({
      title: config.name,
      genre,
      protagonist,
      premise,
      visualMotif,
      genreStyle,
    });

    // Create background task — image generation takes time, must survive disconnect.
    const { id: taskId } = taskManager.create({
      type: "generate-cover",
      label: `封面: ${config.name}`,
      projectId,
    });

    // Run in background.
    (async () => {
      try {
        taskManager.setProgress(taskId, { message: "Generating cover..." });
        const client = await createImageClientFromSettings();
        const response = await client.generate({
          prompt,
          size: "portrait_4_3" as "1024x1792",
          n: 1,
        });

        const coverUrl = response.images[0]?.url;
        if (!coverUrl) throw new Error("Cover generation failed: no image returned");

        // Save coverUrl to tavernos.json under a file lock to prevent
        // concurrent config updates from clobbering each other.
        await withFileLock(configPath, async () => {
          const latestConfig = await readJson<Record<string, unknown>>(configPath);
          if (latestConfig) {
            latestConfig.coverUrl = coverUrl;
            await writeJson(configPath, latestConfig);
          }
        });

        taskManager.complete(taskId, { coverUrl });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[projects] generate-cover failed:", e);
        taskManager.fail(taskId, msg);
      }
    })();

    return c.json({ taskId, status: "running" });
  });

  // -------------------------------------------------------------------------
  // EPUB export — generate and download an EPUB 3.0 file of the full novel.
  // GET /api/projects/:projectId/export/epub
  // Returns the EPUB file as a download (application/epub+zip).
  // -------------------------------------------------------------------------

  router.get("/api/projects/:projectId/export/epub", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    try {
      const { buffer, filename } = await generateEpub(projectId);
      // Encode the filename for Content-Disposition using RFC 5987 encoding
      // so Chinese characters in the filename are handled correctly.
      const encodedFilename = encodeURIComponent(filename);
      return new Response(buffer as BodyInit, {
        headers: {
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
          "Cache-Control": "no-cache",
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Distinguish "not found" from other errors for appropriate status codes.
      if (msg.includes("not found") || msg.includes("No chapters")) {
        return c.json({ error: msg }, 404);
      }
      console.error("[projects] epub export failed:", e);
      return c.json({ error: `EPUB export failed: ${msg}` }, 500);
    }
  });

  // -------------------------------------------------------------------------
  // Upload novel — create a project from an uploaded text file (.txt / .md).
  // POST /api/projects/upload
  //
  // Accepts { name, content, language, type, genre } and:
  //   1. Creates the project (same structure as POST /api/projects)
  //   2. Writes the uploaded text as the first chapter
  //   3. Returns the project info
  // -------------------------------------------------------------------------
  router.post("/api/projects/upload", async (c) => {
    try {
      const body = await c.req.json<{
        name: string;
        content: string;
        language?: string;
        type?: "long" | "short";
        genre?: string;
      }>();

      if (!body.name?.trim()) {
        return c.json({ error: "Novel name is required" }, 400);
      }
      if (!body.content?.trim()) {
        return c.json({ error: "File content is empty" }, 400);
      }

      // Generate projectId (same slug logic as POST /api/projects)
      const projectId =
        (body.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
          .replace(/^-|-$/g, "") || `project-${Date.now()}`;
      const projectDir = join(DATA_DIR, projectId);

      // Check for existing project
      const existingConfig = await readJson(join(projectDir, "tavernos.json"));
      if (existingConfig) {
        return c.json({ error: `Project "${body.name}" already exists` }, 409);
      }

      // Create project directory structure
      await ensureDir(projectDir);
      await ensureDir(join(projectDir, "characters"));
      await ensureDir(join(projectDir, "lorebook"));
      await ensureDir(join(projectDir, "story"));

      const config = {
        name: body.name,
        version: "0.1.0" as const,
        language: body.language ?? "zh",
        type: body.type ?? "long",
        genre: body.genre ?? "",
        coverUrl: "" as string,
        createdAt: new Date().toISOString(),
      };
      await writeJson(join(projectDir, "tavernos.json"), config);

      // Write uploaded content as the first chapter
      const chapterId = `chapter-${Date.now()}-${randomUUID().slice(0, 8)}`;
      const nowIso = new Date().toISOString();
      const chapter = {
        id: chapterId,
        title: "第1章",
        content: body.content,
        order: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await writeJson(join(projectDir, "story", `${chapterId}.json`), chapter);
      syncChapter(projectId, chapterId);

      // Mirror project metadata to WebDAV
      syncProjectMeta(projectId);

      return c.json({ id: projectId, ...config }, 201);
    } catch (err) {
      console.error("[projects] POST /api/projects/upload error:", err);
      return c.json({ error: "Failed to upload novel" }, 500 as 500);
    }
  });

  // -------------------------------------------------------------------------
  // Extract assets — extract characters, scenes, and props from all chapters.
  // POST /api/projects/:projectId/extract-assets
  //
  // Reads all chapter files, combines the text, calls the AssetExtractor agent,
  // merges the result into asset-catalog.json, and syncs character cards.
  // -------------------------------------------------------------------------
  router.post("/api/projects/:projectId/extract-assets", async (c) => {
    const projectId = safeProjectId(c.req.param("projectId"));
    const projectDir = join(DATA_DIR, projectId);
    const storyDir = join(projectDir, "story");

    try {
      // 1. Read all chapter files
      await ensureDir(storyDir);
      const storyFiles = await fs.readdir(storyDir);
      const chapterFiles = storyFiles
        .filter((f) => f.endsWith(".json"))
        .sort();

      if (chapterFiles.length === 0) {
        return c.json({ error: "No chapters found to extract assets from" }, 400);
      }

      // 2. Read all chapters and combine into one text
      const chapters = await Promise.all(
        chapterFiles.map((file) =>
          readJson<{ order?: number; title?: string; content?: string }>(
            join(storyDir, file),
          ).catch(() => null),
        ),
      );

      // Sort by order for chronological text
      const validChapters = chapters
        .filter((ch): ch is { order: number; title: string; content: string } =>
          ch !== null && typeof ch.content === "string",
        )
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      if (validChapters.length === 0) {
        return c.json({ error: "No readable chapter content found" }, 400);
      }

      // Combine chapter contents with separators.
      // Truncate total text to ~40000 chars to stay within LLM context limits
      // and keep the extraction responsive (single LLM call).
      const MAX_CHARS = 40000;
      let combinedText = "";
      for (const ch of validChapters) {
        const segment = `### ${ch.title || `第${(ch.order ?? 0) + 1}章`}\n\n${ch.content}`;
        if (combinedText.length + segment.length > MAX_CHARS) {
          combinedText += segment.slice(0, MAX_CHARS - combinedText.length);
          break;
        }
        combinedText += segment + "\n\n";
      }

      // 3. Build agent context and create asset extractor
      const agentCtxs = await buildAgentContexts(projectDir, projectId);
      const assetCtx = agentCtxs.resolveOptional("asset-extractor") ?? agentCtxs.defaultCtx;
      const extractor = createAssetExtractor(assetCtx);

      // 4. Load existing catalog (if any) to pass as context
      const catalogPath = assetCatalogPath(projectId);
      const existingRaw = await readJson<unknown>(catalogPath);
      const existingText = existingRaw ? JSON.stringify(existingRaw) : "";
      const existingCatalog = existingText
        ? AssetCatalogManager.parseCatalog(existingText)
        : emptyCatalog();

      // 5. Extract assets (single call with combined text)
      const extractionResult = await extractor.extract(
        {
          chapterContent: combinedText,
          chapter: 1,
          existingCatalog,
        },
      );

      // 6. Merge with existing catalog
      const merged = AssetCatalogManager.mergeCatalog(existingCatalog, extractionResult);

      // 7. Write merged catalog to disk (under file lock)
      await withFileLock(catalogPath, async () => {
        await writeJson(
          catalogPath,
          JSON.parse(AssetCatalogManager.serializeCatalog(merged)),
        );
      });

      // 8. Sync character cards
      let syncedCards = 0;
      if (merged.characters.length > 0) {
        try {
          const storyBible = await loadStoryBible(projectDir);
          const syncResult = await syncCharacterCards(
            projectId,
            merged.characters,
            storyBible,
          );
          syncedCards = syncResult.created + syncResult.updated;
        } catch (syncErr) {
          console.warn(
            `[projects] Character card sync failed: ${
              syncErr instanceof Error ? syncErr.message : String(syncErr)
            }`,
          );
        }
      }

      return c.json({
        characters: merged.characters.length,
        scenes: merged.scenes.length,
        props: merged.props.length,
        syncedCards,
      });
    } catch (err) {
      console.error("[projects] POST extract-assets error:", err);
      return c.json(
        { error: `Failed to extract assets: ${err instanceof Error ? err.message : String(err)}` },
        500 as 500,
      );
    }
  });

  return router;
}
