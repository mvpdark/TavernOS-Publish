// WebDAV auto-sync service.
//
// Mirrors local TavernOS data to a structured WebDAV layout:
//   TavernOS/
//   ├── Novels/{novel}/Chapters/{chapterId}.json
//   ├── Novels/{novel}/Characters/{filename}
//   ├── Novels/{novel}/Scenes/{storyboard|shots|assets/...}
//   ├── Novels/{novel}/Props/{lorebook entries + config}
//   ├── Videos/{novel}/{chapterId}-{clipNumber}.mp4
//   ├── Images/{novel}/{Characters|Scenes|Items|Storyboard|Plot}/{file}
//   ├── Audios/{Music|Ambient|SFX|Voices}/{category}/{file}
//   └── Characters/{filename}            ← global library (Plus-generated)
//
// All public functions are fire-and-forget: routes call them without awaiting
// so the user's write response is never delayed by a slow WebDAV upload.
// Uploads are debounced per target (1s) so rapid edits (e.g. the editor
// auto-save) coalesce into a single upload. Deletions run immediately.
// Every call no-ops silently when WebDAV is not configured.

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { DATA_DIR, readJson, createStorageClientFromSettings, safeProjectId, safeFilename } from "../context.js";
import type { StorageClient } from "@tavernos/core";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Build an ASCII-safe folder name for a novel.
 *
 * The user explicitly wants English folder names to avoid garbled characters
 * on the WebDAV server (Tianyi Cloud Drive). We therefore slug the novel name
 * to ASCII; if the name is non-ASCII (e.g. Chinese), we fall back to a slug of
 * the projectId, and finally to a short hash. The real display name is always
 * preserved in `project.json` inside the folder for identification.
 */
function safeFolderName(name: string, projectId: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const byName = slug(name);
  if (byName && /^[a-z0-9-]+$/.test(byName)) return byName;
  const byId = slug(projectId);
  if (byId && /^[a-z0-9-]+$/.test(byId)) return byId;
  // Last resort: a stable short hash derived from the projectId.
  let h = 0;
  for (let i = 0; i < projectId.length; i++) {
    h = (h * 31 + projectId.charCodeAt(i)) | 0;
  }
  return `novel-${Math.abs(h).toString(36)}`;
}

/** Resolve the WebDAV folder name for a project (reads tavernos.json). */
async function novelFolder(projectId: string): Promise<string> {
  const meta = await readJson<{ name?: string }>(
    join(DATA_DIR, projectId, "tavernos.json"),
  );
  return safeFolderName(meta?.name ?? projectId, projectId);
}

/**
 * Public helper: resolve the ASCII-safe folder name for a novel project.
 * Used by other modules (three-view-service, video routes, etc.) to build
 * storage paths like `Images/{novelFolder}/Characters/...`.
 */
export async function getNovelFolder(projectId: string): Promise<string> {
  return novelFolder(projectId);
}

/** Get a configured storage client (WebDAV or Local), or null when not set up. */
async function getClient(): Promise<StorageClient | null> {
  const client = await createStorageClientFromSettings();
  return client.configured ? client : null;
}

/** Read a local file as a Buffer, returning null if it doesn't exist. */
async function readLocalFile(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Debounce (uploads only)
// ---------------------------------------------------------------------------

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Coalesce rapid calls into a single delayed execution.
 * The same key within `ms` resets the timer, so only the last call runs.
 */
function debounce(key: string, ms: number, fn: () => Promise<void>): void {
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    debounceTimers.delete(key);
    fn().catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[sync] ${key} failed: ${msg}`);
    });
  }, ms);
  debounceTimers.set(key, timer);
}

// ---------------------------------------------------------------------------
// Chapters  →  Novels/{novel}/Chapters/
// ---------------------------------------------------------------------------

/** Sync a single chapter to WebDAV (debounced). */
export function syncChapter(projectId: string, chapterId: string): void {
  debounce(`chapter:${projectId}:${chapterId}`, 1000, async () => {
    safeProjectId(projectId);
    safeFilename(chapterId);
    const client = await getClient();
    if (!client) return;
    const folder = await novelFolder(projectId);
    const buf = await readLocalFile(
      join(DATA_DIR, projectId, "story", `${chapterId}.json`),
    );
    if (!buf) return;
    await client.uploadFile(
      `Novels/${folder}/Chapters/${chapterId}.json`,
      buf,
      "application/json",
    );
  });
}

/** Delete a chapter from WebDAV (immediate). */
export function deleteChapterSync(projectId: string, chapterId: string): void {
  void (async () => {
    try {
      safeProjectId(projectId);
      safeFilename(chapterId);
      const client = await getClient();
      if (!client) return;
      const folder = await novelFolder(projectId);
      await client
        .deletePath(`Novels/${folder}/Chapters/${chapterId}.json`)
        .catch(() => {});
    } catch (e) {
      console.error("[sync] deleteChapterSync failed:", e);
    }
  })();
}

// ---------------------------------------------------------------------------
// Characters  →  Novels/{novel}/Characters/  OR  Characters/ (Plus library)
// ---------------------------------------------------------------------------

/** Sync a character card. Plus-generated cards go to the global library. */
export function syncCharacter(projectId: string, filename: string): void {
  debounce(`character:${projectId}:${filename}`, 1000, async () => {
    safeProjectId(projectId);
    safeFilename(filename);
    const client = await getClient();
    if (!client) return;
    const local = join(DATA_DIR, projectId, "characters", filename);
    const buf = await readLocalFile(local);
    if (!buf) return;
    // Route Plus-generated characters to the global Characters/ library;
    // everything else to the novel's Characters/ folder.
    const card = await readJson<{
      data?: { extensions?: { tavernos?: { plusGenerated?: boolean } } };
    }>(local);
    const isPlus = card?.data?.extensions?.tavernos?.plusGenerated === true;
    if (isPlus) {
      await client.uploadFile(`Characters/${filename}`, buf, "application/json");
    } else {
      const folder = await novelFolder(projectId);
      await client.uploadFile(
        `Novels/${folder}/Characters/${filename}`,
        buf,
        "application/json",
      );
    }
  });
}

/** Delete a character from WebDAV (tries both locations; immediate). */
export function deleteCharacterSync(projectId: string, filename: string): void {
  void (async () => {
    try {
      safeProjectId(projectId);
      safeFilename(filename);
      const client = await getClient();
      if (!client) return;
      const folder = await novelFolder(projectId);
      await client.deletePath(`Characters/${filename}`).catch(() => {});
      await client
        .deletePath(`Novels/${folder}/Characters/${filename}`)
        .catch(() => {});
    } catch (e) {
      console.error("[sync] deleteCharacterSync failed:", e);
    }
  })();
}

// ---------------------------------------------------------------------------
// Scenes  →  Novels/{novel}/Scenes/  (workshop storyboards, shots, assets)
// ---------------------------------------------------------------------------

/** Sync a workshop file (storyboard-*.json / shots-*.json) to Scenes/. */
export function syncScene(projectId: string, fileName: string): void {
  debounce(`scene:${projectId}:${fileName}`, 1000, async () => {
    safeProjectId(projectId);
    safeFilename(fileName);
    const client = await getClient();
    if (!client) return;
    const folder = await novelFolder(projectId);
    const buf = await readLocalFile(
      join(DATA_DIR, projectId, "workshop", fileName),
    );
    if (!buf) return;
    await client.uploadFile(
      `Novels/${folder}/Scenes/${fileName}`,
      buf,
      "application/json",
    );
  });
}

/** Sync a workshop asset file (workshop/assets/*) to Scenes/assets/. */
export function syncSceneAsset(projectId: string, fileName: string): void {
  debounce(`scene-asset:${projectId}:${fileName}`, 1000, async () => {
    safeProjectId(projectId);
    safeFilename(fileName);
    const client = await getClient();
    if (!client) return;
    const folder = await novelFolder(projectId);
    const buf = await readLocalFile(
      join(DATA_DIR, projectId, "workshop", "assets", fileName),
    );
    if (!buf) return;
    await client.uploadFile(
      `Novels/${folder}/Scenes/assets/${fileName}`,
      buf,
      "application/json",
    );
  });
}

// ---------------------------------------------------------------------------
// Props  →  Novels/{novel}/Props/  (lorebook entries + config)
// ---------------------------------------------------------------------------

/** Sync a lorebook entry or config file to Props/. */
export function syncProp(projectId: string, filename: string): void {
  debounce(`prop:${projectId}:${filename}`, 1000, async () => {
    safeProjectId(projectId);
    safeFilename(filename);
    const client = await getClient();
    if (!client) return;
    const folder = await novelFolder(projectId);
    const buf = await readLocalFile(
      join(DATA_DIR, projectId, "lorebook", filename),
    );
    if (!buf) return;
    await client.uploadFile(
      `Novels/${folder}/Props/${filename}`,
      buf,
      "application/json",
    );
  });
}

/** Delete a lorebook entry from WebDAV (immediate). */
export function deletePropSync(projectId: string, filename: string): void {
  void (async () => {
    try {
      safeProjectId(projectId);
      safeFilename(filename);
      const client = await getClient();
      if (!client) return;
      const folder = await novelFolder(projectId);
      await client
        .deletePath(`Novels/${folder}/Props/${filename}`)
        .catch(() => {});
    } catch (e) {
      console.error("[sync] deletePropSync failed:", e);
    }
  })();
}

// ---------------------------------------------------------------------------
// Project meta  →  Novels/{novel}/project.json
// ---------------------------------------------------------------------------

/** Sync project metadata (tavernos.json) to Novels/{novel}/project.json. */
export function syncProjectMeta(projectId: string): void {
  debounce(`meta:${projectId}`, 1000, async () => {
    safeProjectId(projectId);
    const client = await getClient();
    if (!client) return;
    const folder = await novelFolder(projectId);
    const buf = await readLocalFile(join(DATA_DIR, projectId, "tavernos.json"));
    if (!buf) return;
    await client.uploadFile(
      `Novels/${folder}/project.json`,
      buf,
      "application/json",
    );
  });
}

/** Delete an entire project folder from WebDAV (immediate). */
export function deleteProjectSync(projectId: string): void {
  void (async () => {
    try {
      safeProjectId(projectId);
      const client = await getClient();
      if (!client) return;
      const folder = await novelFolder(projectId);
      await client.deletePath(`Novels/${folder}`).catch(() => {});
    } catch (e) {
      console.error("[sync] deleteProjectSync failed:", e);
    }
  })();
}

/**
 * Delete a project's WebDAV folder using a pre-captured project name.
 *
 * Unlike {@link deleteProjectSync}, this does not re-read tavernos.json —
 * which is important when the caller has already started removing the local
 * project directory. When `name` is omitted it falls back to the projectId.
 */
export function deleteProjectSyncByName(projectId: string, name?: string): void {
  void (async () => {
    try {
      safeProjectId(projectId);
      const client = await getClient();
      if (!client) return;
      const folder = safeFolderName(name ?? projectId, projectId);
      await client.deletePath(`Novels/${folder}`).catch(() => {});
    } catch (e) {
      console.error("[sync] deleteProjectSyncByName failed:", e);
    }
  })();
}

// ---------------------------------------------------------------------------
// Videos  →  Videos/{novel}/{chapterId}-{clipNumber}.mp4
// ---------------------------------------------------------------------------

/**
 * Sync a composed video file to Videos/{novel}/{fileName}.
 *
 * Videos are stored at the TavernOS root level (not under Novels/) because
 * they are large binary assets that the user wants to browse independently
 * of the novel's text data. The novel name is used as a sub-folder so videos
 * from different novels don't mix.
 *
 * @param projectId - Project identifier
 * @param fileName  - Video file name (e.g. "1-1.mp4", "full-1.mp4")
 */
export function syncVideo(projectId: string, fileName: string): void {
  // Videos can be large; upload immediately (no debounce) so the user sees
  // the file appear in WebDAV as soon as composition finishes.
  void (async () => {
    safeProjectId(projectId);
    safeFilename(fileName);
    const client = await getClient();
    if (!client) return;
    const folder = await novelFolder(projectId);
    const buf = await readLocalFile(join(DATA_DIR, projectId, "videos", fileName));
    if (!buf) return;
    await client.uploadFile(
      `Videos/${folder}/${fileName}`,
      buf,
      "video/mp4",
    );
  })();
}

/** Delete a synced video from WebDAV. */
export function deleteVideoSync(projectId: string, fileName: string): void {
  void (async () => {
    safeProjectId(projectId);
    safeFilename(fileName);
    const client = await getClient();
    if (!client) return;
    const folder = await novelFolder(projectId);
    await client.deletePath(`Videos/${folder}/${fileName}`).catch(() => {});
  })();
}

// ---------------------------------------------------------------------------
// Images  →  Images/{novel}/{Characters|Scenes|Items|Storyboard|Plot}/{file}
// ---------------------------------------------------------------------------

/** Image sub-categories under each novel's Images folder. */
export type ImageCategory = "Characters" | "Scenes" | "Items" | "Storyboard" | "Plot";

/**
 * Sync an image file to Images/{novel}/{category}/{fileName}.
 *
 * Images are stored at the TavernOS root level (like Videos) with the novel
 * name as a sub-folder. Inside each novel, images are organized by category:
 *   - Characters: character three-view sheets and avatars
 *   - Scenes: scene/background images
 *   - Items: item/prop images
 *   - Storyboard: storyboard frames
 *   - Plot: plot/key-moment illustrations
 *
 * @param projectId - Project identifier
 * @param category  - Image category (Characters, Scenes, Items, Storyboard, Plot)
 * @param fileName  - Image file name (e.g. "hero-three-view.png")
 * @param mimeType  - MIME type (e.g. "image/png")
 */
export function syncImage(
  projectId: string,
  category: ImageCategory,
  fileName: string,
  mimeType: string = "image/png",
): void {
  void (async () => {
    safeProjectId(projectId);
    safeFilename(fileName);
    const client = await getClient();
    if (!client) return;
    const folder = await novelFolder(projectId);
    // Try common local paths where images might be stored
    const localPaths = [
      join(DATA_DIR, projectId, "images", fileName),
      join(DATA_DIR, projectId, "characters", fileName),
    ];
    let buf: Buffer | null = null;
    for (const p of localPaths) {
      buf = await readLocalFile(p);
      if (buf) break;
    }
    if (!buf) return;
    await client.uploadFile(
      `Images/${folder}/${category}/${fileName}`,
      buf,
      mimeType,
    );
  })();
}

/** Delete a synced image from WebDAV. */
export function deleteImageSync(
  projectId: string,
  category: ImageCategory,
  fileName: string,
): void {
  void (async () => {
    safeProjectId(projectId);
    safeFilename(fileName);
    const client = await getClient();
    if (!client) return;
    const folder = await novelFolder(projectId);
    await client.deletePath(`Images/${folder}/${category}/${fileName}`).catch(() => {});
  })();
}

// ---------------------------------------------------------------------------
// Audios  →  Audios/{Music|Ambient|SFX|Voices}/{category}/{fileName}
// ---------------------------------------------------------------------------

/** Audio asset kinds (top-level folders under Audios/). */
export type AudioKind = "Music" | "Ambient" | "SFX" | "Voices";

/**
 * Sync an audio file to Audios/{kind}/{category}/{fileName}.
 *
 * Audio assets are global (not per-novel) because they are reused across
 * projects — a BGM track or ambient sound can serve multiple novels.
 *
 * @param kind     - Audio kind: Music, Ambient, SFX, Voices
 * @param category - Sub-category (e.g. "epic", "nature", "male/deep")
 * @param fileName - Audio file name (e.g. "rain-night.mp3")
 * @param mimeType - MIME type (e.g. "audio/mpeg")
 * @param localPath - Absolute local file path to read from
 */
export function syncAudio(
  kind: AudioKind,
  category: string,
  fileName: string,
  mimeType: string,
  localPath: string,
): void {
  void (async () => {
    safeFilename(fileName);
    // Sanitize category path segments
    const cleanCategory = category
      .split("/")
      .map((s) => s.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, ""))
      .filter(Boolean)
      .join("/");
    const client = await getClient();
    if (!client) return;
    const buf = await readLocalFile(localPath);
    if (!buf) return;
    const remotePath = cleanCategory
      ? `Audios/${kind}/${cleanCategory}/${fileName}`
      : `Audios/${kind}/${fileName}`;
    await client.uploadFile(remotePath, buf, mimeType);
  })();
}

/** Delete a synced audio file from WebDAV. */
export function deleteAudioSync(
  kind: AudioKind,
  category: string,
  fileName: string,
): void {
  void (async () => {
    safeFilename(fileName);
    const cleanCategory = category
      .split("/")
      .map((s) => s.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, ""))
      .filter(Boolean)
      .join("/");
    const client = await getClient();
    if (!client) return;
    const remotePath = cleanCategory
      ? `Audios/${kind}/${cleanCategory}/${fileName}`
      : `Audios/${kind}/${fileName}`;
    await client.deletePath(remotePath).catch(() => {});
  })();
}

// ---------------------------------------------------------------------------
// Truth files  →  Novels/{novel}/{story-state.json, story-bible.md, book-rules.md}
// ---------------------------------------------------------------------------

/**
 * Sync a truth file (story-state.json / story-bible.md / book-rules.md) to the
 * novel root. These are the novel's "absolute truth" — world state, story
 * bible, and creation rules — kept in sync so the WebDAV mirror is complete.
 */
export function syncTruthFile(projectId: string, fileName: string): void {
  debounce(`truth:${projectId}:${fileName}`, 1000, async () => {
    safeProjectId(projectId);
    safeFilename(fileName);
    const client = await getClient();
    if (!client) return;
    const folder = await novelFolder(projectId);
    const buf = await readLocalFile(join(DATA_DIR, projectId, fileName));
    if (!buf) return;
    const mime = fileName.endsWith(".json")
      ? "application/json"
      : "text/markdown";
    await client.uploadFile(`Novels/${folder}/${fileName}`, buf, mime);
  });
}

// ---------------------------------------------------------------------------
// Full resync (manual fallback: upload everything for a project)
// ---------------------------------------------------------------------------

export interface ResyncResult {
  readonly projectId: string;
  readonly folder: string;
  readonly uploaded: number;
  readonly errors: string[];
}

/**
 * Upload every local file of a project to WebDAV in one shot.
 * Used by the manual "resync" endpoint to backfill existing data that was
 * created before auto-sync was enabled.
 */
export async function resyncProject(projectId: string): Promise<ResyncResult> {
  safeProjectId(projectId);
  const client = await getClient();
  const folder = await novelFolder(projectId);
  const errors: string[] = [];
  if (!client) {
    return { projectId, folder, uploaded: 0, errors: ["存储未配置"] };
  }

  let uploaded = 0;
  const root = join(DATA_DIR, projectId);

  // project.json
  const metaBuf = await readLocalFile(join(root, "tavernos.json"));
  if (metaBuf) {
    try {
      await client.uploadFile(`Novels/${folder}/project.json`, metaBuf, "application/json");
      uploaded++;
    } catch (e) {
      console.error(`[sync] resync project.json failed:`, e);
      errors.push("project.json: 同步失败");
    }
  }

  // Truth files (story-state.json, story-bible.md, book-rules.md) at novel root.
  for (const tf of ["story-state.json", "story-bible.md", "book-rules.md"]) {
    const buf = await readLocalFile(join(root, tf));
    if (!buf) continue;
    try {
      const mime = tf.endsWith(".json") ? "application/json" : "text/markdown";
      await client.uploadFile(`Novels/${folder}/${tf}`, buf, mime);
      uploaded++;
    } catch (e) {
      console.error(`[sync] resync ${tf} failed:`, e);
      errors.push(`${tf}: 同步失败`);
    }
  }

  // Helper to upload a directory of JSON files.
  const uploadDir = async (
    localSub: string,
    remoteSub: string,
  ): Promise<void> => {
    const dir = join(root, localSub);
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      return; // directory doesn't exist yet
    }
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const buf = await readLocalFile(join(dir, file));
      if (!buf) continue;
      try {
        await client.uploadFile(`Novels/${folder}/${remoteSub}/${file}`, buf, "application/json");
        uploaded++;
      } catch (e) {
        console.error(`[sync] resync ${remoteSub}/${file} failed:`, e);
        errors.push(`${remoteSub}/${file}: 同步失败`);
      }
    }
  };

  await uploadDir("story", "Chapters");
  // Characters: route Plus-generated to global Characters/
  const charDir = join(root, "characters");
  try {
    for (const file of await fs.readdir(charDir)) {
      if (!file.endsWith(".json")) continue;
      const buf = await readLocalFile(join(charDir, file));
      if (!buf) continue;
      const card = await readJson<{
        data?: { extensions?: { tavernos?: { plusGenerated?: boolean } } };
      }>(join(charDir, file));
      const isPlus = card?.data?.extensions?.tavernos?.plusGenerated === true;
      const remote = isPlus ? `Characters/${file}` : `Novels/${folder}/Characters/${file}`;
      try {
        await client.uploadFile(remote, buf, "application/json");
        uploaded++;
      } catch (e) {
        console.error(`[sync] resync Characters/${file} failed:`, e);
        errors.push(`Characters/${file}: 同步失败`);
      }
    }
  } catch {
    // no characters dir
  }
  await uploadDir("lorebook", "Props");
  // Scenes: workshop root files + assets/
  await uploadDir("workshop", "Scenes");
  try {
    const assetsDir = join(root, "workshop", "assets");
    for (const file of await fs.readdir(assetsDir)) {
      if (!file.endsWith(".json")) continue;
      const buf = await readLocalFile(join(assetsDir, file));
      if (!buf) continue;
      try {
        await client.uploadFile(`Novels/${folder}/Scenes/assets/${file}`, buf, "application/json");
        uploaded++;
      } catch (e) {
        console.error(`[sync] resync Scenes/assets/${file} failed:`, e);
        errors.push(`Scenes/assets/${file}: 同步失败`);
      }
    }
  } catch {
    // no assets dir
  }

  return { projectId, folder, uploaded, errors };
}
