// ---------------------------------------------------------------------------
// Storage routes: storage mode switching, local storage config, file serving.
// ---------------------------------------------------------------------------

import { Hono, type Context } from "hono";
import { promises as fs } from "node:fs";
import { join, resolve, normalize, sep } from "node:path";
import { homedir } from "node:os";
import {
  createLocalStorageClient,
  LocalStorageConfigSchema,
  StorageModeSchema,
  type StorageMode,
  type LocalStorageConfig,
} from "@tavernos/core";
import { DATA_DIR, loadSettings, withSettingsLock } from "../context";

/** The subfolder structure to create when initializing local storage. */
const STORAGE_SUBFOLDERS = [
  "Novels",
  "Characters",
  "ConfirmedSlots",
  "ConfirmedSlots/three-views",
  "ConfirmedSlots/realistic",
  "ConfirmedSlots/realistic/male",
  "ConfirmedSlots/realistic/female",
  "ConfirmedSlots/anime",
  "ConfirmedSlots/anime/male",
  "ConfirmedSlots/anime/female",
];

export function createStorageRouter(): Hono {
  const router = new Hono();

  // -------------------------------------------------------------------------
  // GET /api/storage/config — current storage mode + configs (masked)
  // -------------------------------------------------------------------------
  router.get("/api/storage/config", async (c) => {
    const settings = await loadSettings();
    const mode: StorageMode = settings.storageMode ?? "webdav";

    const webdavConfig = settings.webdavConfig ?? {};
    const localStorageConfig = settings.localStorageConfig ?? {};

    return c.json({
      mode,
      webdav: {
        url: webdavConfig.url ?? "",
        username: webdavConfig.username ?? "",
        password: webdavConfig.password ? "***" : "",
        basePath: webdavConfig.basePath ?? "/TavernOS",
        configured: !!(webdavConfig.url && webdavConfig.username && webdavConfig.password),
      },
      local: {
        path: localStorageConfig.path ?? "",
        configured: !!(localStorageConfig.path),
      },
    });
  });

  // -------------------------------------------------------------------------
  // PUT /api/storage/mode — switch storage mode (webdav <-> local)
  // -------------------------------------------------------------------------
  router.put("/api/storage/mode", async (c) => {
    const body = await c.req.json<{ mode: StorageMode }>();
    const mode = StorageModeSchema.parse(body.mode);

    await withSettingsLock(async (lock) => {
      const existing = await lock.load();
      await lock.write({ ...existing, storageMode: mode });
    });

    return c.json({ success: true, mode });
  });

  // -------------------------------------------------------------------------
  // PUT /api/storage/local — save local storage path + create folder structure
  // -------------------------------------------------------------------------
  router.put("/api/storage/local", async (c) => {
    const body = await c.req.json<{ path: string }>();
    const path = body.path?.trim();

    if (!path) {
      return c.json({ success: false, error: "Path cannot be empty" }, 400);
    }

    // Resolve and validate the path.
    const resolvedPath = resolve(normalize(path));

    // Security: restrict local storage paths to DATA_DIR or ~/.tavernos/
    // to prevent writing to arbitrary filesystem locations.
    const allowedRoots = [
      resolve(normalize(DATA_DIR)),
      resolve(normalize(join(homedir(), ".tavernos"))),
    ];
    const isAllowed = allowedRoots.some(
      (root) => resolvedPath === root || resolvedPath.startsWith(root + sep),
    );
    if (!isAllowed) {
      return c.json({
        success: false,
        error: "Path must be inside the data directory or ~/.tavernos/",
      }, 400);
    }

    // Create the TavernOS root folder.
    try {
      await fs.mkdir(resolvedPath, { recursive: true });
    } catch (e) {
      return c.json({
        success: false,
        error: `无法创建目录: ${e instanceof Error ? e.message : String(e)}`,
      }, 400);
    }

    // Create all subfolders.
    const createdFolders: string[] = [];
    for (const sub of STORAGE_SUBFOLDERS) {
      const subPath = join(resolvedPath, sub);
      try {
        await fs.mkdir(subPath, { recursive: true });
        createdFolders.push(sub);
      } catch {
        // Non-fatal — some folders might fail on certain filesystems.
      }
    }

    // Save to settings.
    const config: LocalStorageConfig = LocalStorageConfigSchema.parse({ path: resolvedPath });
    await withSettingsLock(async (lock) => {
      const existing = await lock.load();
      await lock.write({
        ...existing,
        storageMode: "local",
        localStorageConfig: config,
      });
    });

    // Test the connection.
    const client = createLocalStorageClient(config);
    const testResult = await client.testConnection();

    return c.json({
      success: true,
      path: resolvedPath,
      folders: createdFolders,
      test: testResult,
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/storage/local/test — test local storage path writability
  // -------------------------------------------------------------------------
  router.post("/api/storage/local/test", async (c) => {
    const body = await c.req.json<{ path?: string }>();
    const settings = await loadSettings();
    const path = body.path ?? settings.localStorageConfig?.path ?? "";

    if (!path) {
      return c.json({ ok: false, message: "Local storage path cannot be empty" });
    }

    const config = LocalStorageConfigSchema.parse({ path });
    const client = createLocalStorageClient(config);
    const result = await Promise.race([
      client.testConnection(),
      new Promise<{ ok: false; message: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, message: "测试超时" }), 10000),
      ),
    ]);
    return c.json(result);
  });

  // -------------------------------------------------------------------------
  // GET /api/storage/local/browse — list available drives (Windows)
  // -------------------------------------------------------------------------
  router.get("/api/storage/local/browse", async (c) => {
    // On Windows, list available drive letters.
    const drives: string[] = [];
    if (process.platform === "win32") {
      for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i);
        const drivePath = `${letter}:\\`;
        try {
          await fs.access(drivePath);
          drives.push(drivePath);
        } catch {
          // Drive doesn't exist, skip.
        }
      }
    } else {
      // On Unix, return root.
      drives.push("/");
    }
    return c.json({ drives });
  });

  // -------------------------------------------------------------------------
  // GET /api/local-storage/file/* — serve a file from local storage to browser
  // -------------------------------------------------------------------------
  // The URL format is: /api/local-storage/file/{relativePath}
  router.get("/api/local-storage/file/*", async (c) => {
    return serveLocalFile(c);
  });

  return router;
}

/** Shared handler: serve a file from local storage to the browser. */
async function serveLocalFile(c: Context): Promise<Response> {
  const settings = await loadSettings();
  const localConfig = settings.localStorageConfig;

  if (!localConfig?.path) {
    return c.json({ error: "Local storage not configured" }, 503);
  }

  // Extract the relative path from the URL.
  const url = new URL(c.req.url);
  const fullPath = url.pathname;
  // Remove the API prefix to get the relative path.
  const prefix = "/api/local-storage/file/";
  const relativePath = decodeURIComponent(fullPath.substring(prefix.length));

  if (!relativePath) {
    return c.json({ error: "No file path specified" }, 400);
  }

  // Resolve with path traversal guard.
  const rootPath = resolve(normalize(localConfig.path));
  const fullPathResolved = resolve(normalize(join(rootPath, relativePath)));

  if (!fullPathResolved.startsWith(rootPath + sep) && fullPathResolved !== rootPath) {
    return c.json({ error: "Path traversal detected" }, 403);
  }

  // Read and serve the file.
  try {
    const data = await fs.readFile(fullPathResolved);

    // Determine content type from file extension.
    const ext = fullPathResolved.split(".").pop()?.toLowerCase() ?? "";
    const contentTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      json: "application/json",
      md: "text/markdown",
      txt: "text/plain",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      wav: "audio/wav",
      m4a: "audio/mp4",
    };
    const contentType = contentTypes[ext] ?? "application/octet-stream";

    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return c.json({ error: "File not found" }, 404);
  }
}
