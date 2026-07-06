// ---------------------------------------------------------------------------
// EPUB 3.0 generator — builds a valid EPUB file from project chapters.
//
// Uses ONLY Node.js built-in modules (zlib, crypto, fs, path). No external
// npm packages. The EPUB format is a ZIP archive with specific files:
//   mimetype                   — stored uncompressed (first entry, no extra)
//   META-INF/container.xml     — points to the OPF package file
//   OEBPS/content.opf          — package metadata + manifest + spine
//   OEBPS/nav.xhtml            — EPUB 3 navigation document (table of contents)
//   OEBPS/style.css            — Chinese-friendly typography stylesheet
//   OEBPS/cover.xhtml          — cover page with story-bible description
//   OEBPS/chapter-N.xhtml      — one XHTML file per chapter
// ---------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { deflateRaw } from "node:zlib";
import { randomUUID } from "node:crypto";
import { DATA_DIR, readJson, ensureDir } from "./context.js";

// ---------------------------------------------------------------------------
// Chapter & project types
// ---------------------------------------------------------------------------

interface ChapterData {
  id?: string;
  order: number;
  title: string;
  content: string;
  wordCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ProjectConfig {
  name: string;
  version?: string;
  language?: string;
  type?: string;
  genre?: string;
  createdAt?: string;
  coverUrl?: string;
  blueprint?: {
    premise?: string;
    protagonist?: string;
    sellingPoints?: string;
  };
}

export interface EpubResult {
  buffer: Uint8Array;
  filename: string;
}

// ---------------------------------------------------------------------------
// CRC32 — standard IEEE polynomial, table-driven.
// Required by the ZIP format for every entry's CRC-32 field.
// ---------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// ZIP builder — produces a valid ZIP archive from a list of entries.
//
// Entry order is preserved. The first entry (mimetype) is stored uncompressed
// with no extra-field data, as required by the EPUB specification. All other
// entries are deflated via zlib.deflateRawSync (raw DEFLATE, no zlib header).
// ---------------------------------------------------------------------------

interface ZipEntry {
  /** Path inside the archive, e.g. "OEBPS/chapter-1.xhtml". */
  filename: string;
  /** Raw file content as UTF-8 bytes. */
  data: Buffer;
  /** true = deflate (method 8); false = store (method 0). */
  compress: boolean;
}

/**
 * Encode a JS Date into the 16-bit MS-DOS date/time fields used by ZIP.
 * Returns { time, date } as unsigned 16-bit integers.
 * DOS date: bits 9-15 year-1980, bits 5-8 month, bits 0-4 day.
 * DOS time: bits 11-15 hours, bits 5-10 minutes, bits 0-4 seconds/2.
 */
function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const dateVal =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { time, date: dateVal };
}

async function buildZip(entries: ZipEntry[]): Promise<Buffer> {
  const { time, date: dosDate } = dosDateTime(new Date());
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const filenameBuf = Buffer.from(entry.filename, "utf8");
    const crc = crc32(entry.data);
    const uncompressedSize = entry.data.length;

    let compressedData: Buffer;
    let method: number;

    if (entry.compress && uncompressedSize > 0) {
      // Use async deflateRaw to avoid blocking the event loop (M20).
      const deflated = await new Promise<Buffer>((resolve, reject) => {
        deflateRaw(entry.data, (err, buf) => (err ? reject(err) : resolve(buf)));
      });
      // If deflation doesn't reduce size, fall back to stored.
      if (deflated.length < uncompressedSize) {
        compressedData = deflated;
        method = 8;
      } else {
        compressedData = entry.data;
        method = 0;
      }
    } else {
      compressedData = entry.data;
      method = 0;
    }

    const compressedSize = compressedData.length;

    // --- Local file header (30 bytes + filename) ---
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0); // local file header signature
    lfh.writeUInt16LE(20, 4); // version needed to extract (2.0)
    lfh.writeUInt16LE(0, 6); // general purpose bit flag (0 = no flags)
    lfh.writeUInt16LE(method, 8); // compression method
    lfh.writeUInt16LE(time, 10); // last mod file time
    lfh.writeUInt16LE(dosDate, 12); // last mod file date
    lfh.writeUInt32LE(crc, 14); // CRC-32
    lfh.writeUInt32LE(compressedSize, 18); // compressed size
    lfh.writeUInt32LE(uncompressedSize, 22); // uncompressed size
    lfh.writeUInt16LE(filenameBuf.length, 26); // file name length
    lfh.writeUInt16LE(0, 28); // extra field length (must be 0 for mimetype)

    localChunks.push(lfh, filenameBuf, compressedData);

    // --- Central directory file header (46 bytes + filename) ---
    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0); // central file header signature
    cdh.writeUInt16LE(20, 4); // version made by
    cdh.writeUInt16LE(20, 6); // version needed to extract
    cdh.writeUInt16LE(0, 8); // general purpose bit flag
    cdh.writeUInt16LE(method, 10); // compression method
    cdh.writeUInt16LE(time, 12); // last mod file time
    cdh.writeUInt16LE(dosDate, 14); // last mod file date
    cdh.writeUInt32LE(crc, 16); // CRC-32
    cdh.writeUInt32LE(compressedSize, 20); // compressed size
    cdh.writeUInt32LE(uncompressedSize, 24); // uncompressed size
    cdh.writeUInt16LE(filenameBuf.length, 28); // file name length
    cdh.writeUInt16LE(0, 30); // extra field length
    cdh.writeUInt16LE(0, 32); // file comment length
    cdh.writeUInt16LE(0, 34); // disk number start
    cdh.writeUInt16LE(0, 36); // internal file attributes
    cdh.writeUInt32LE(0, 38); // external file attributes
    cdh.writeUInt32LE(offset, 42); // relative offset of local header

    centralChunks.push(cdh, filenameBuf);

    offset += lfh.length + filenameBuf.length + compressedSize;
  }

  // --- End of central directory record (22 bytes) ---
  const centralData = Buffer.concat(centralChunks);
  const cdSize = centralData.length;
  const cdOffset = offset;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // end of central dir signature
  eocd.writeUInt16LE(0, 4); // number of this disk
  eocd.writeUInt16LE(0, 6); // disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8); // central directory entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // total central directory entries
  eocd.writeUInt32LE(cdSize, 12); // size of central directory
  eocd.writeUInt32LE(cdOffset, 16); // offset of central directory
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localChunks, centralData, eocd]);
}

// ---------------------------------------------------------------------------
// XML / HTML helpers
// ---------------------------------------------------------------------------

/** Escape special XML characters in text content. */
function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convert a plain-text content string (paragraphs separated by \n) into
 XHTML <p> elements. Empty lines are skipped. Each non-empty line becomes
 * a <p> with proper text-indent for Chinese readability.
 */
function contentToParagraphs(content: string): string {
  const lines = content.split(/\r?\n/);
  const paragraphs = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => `    <p>${xmlEscape(line.trim())}</p>`);
  return paragraphs.join("\n");
}

/**
 * Convert a simple markdown string (from story-bible.md) to basic HTML.
 * Handles # / ## / ### headings and paragraphs. This is intentionally
 * minimal — the story bible is a plain markdown file with headings and
 * text, not complex formatting.
 */
function markdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const htmlParts: string[] = [];
  let inParagraph = false;

  const closeParagraph = (): void => {
    if (inParagraph) {
      htmlParts.push("</p>");
      inParagraph = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    // Heading detection
    const h1 = line.match(/^#\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);

    if (h1) {
      closeParagraph();
      htmlParts.push(`<h1>${xmlEscape(h1[1]!)}</h1>`);
    } else if (h2) {
      closeParagraph();
      htmlParts.push(`<h2>${xmlEscape(h2[1]!)}</h2>`);
    } else if (h3) {
      closeParagraph();
      htmlParts.push(`<h3>${xmlEscape(h3[1]!)}</h3>`);
    } else if (line.trim() === "") {
      closeParagraph();
    } else {
      if (!inParagraph) {
        htmlParts.push("<p>");
        inParagraph = true;
      }
      htmlParts.push(xmlEscape(line.trim()));
    }
  }
  closeParagraph();
  return htmlParts.join("\n");
}

// ---------------------------------------------------------------------------
// EPUB content file generators
// ---------------------------------------------------------------------------

const EPUB_CSS = `@charset "utf-8";
/* Chinese-friendly typography: serif fonts, comfortable line-height,
   first-line indent for paragraphs. Falls back through common CJK
   serif families available on most EPUB readers. */
body {
  font-family: "Noto Serif CJK SC", "Source Han Serif SC", "Source Han Serif CN",
    "Songti SC", "STSong", "SimSun", "Microsoft YaHei", serif;
  line-height: 1.8;
  margin: 5% 8%;
  text-align: justify;
  word-break: normal;
  overflow-wrap: break-word;
  color: #1a1a1a;
}
p {
  text-indent: 2em;
  margin: 0 0 0.5em 0;
}
h1 {
  font-size: 1.6em;
  font-weight: bold;
  text-align: center;
  text-indent: 0;
  margin: 2em 0 1.5em 0;
}
h2 {
  font-size: 1.3em;
  font-weight: bold;
  text-indent: 0;
  margin: 1.5em 0 1em 0;
}
h3 {
  font-size: 1.1em;
  font-weight: bold;
  text-indent: 0;
  margin: 1.2em 0 0.8em 0;
}
.cover-title {
  font-size: 2.2em;
  font-weight: bold;
  text-align: center;
  text-indent: 0;
  margin: 3em 0 0.5em 0;
  letter-spacing: 0.1em;
}
.cover-subtitle {
  font-size: 1.1em;
  text-align: center;
  text-indent: 0;
  margin: 0 0 3em 0;
  color: #666;
}
.description {
  margin-top: 2em;
}
.description p {
  text-indent: 2em;
}
.description h1, .description h2, .description h3 {
  text-indent: 0;
}
`;

/** Generate META-INF/container.xml */
function generateContainerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;
}

/** Generate OEBPS/content.opf — the package document with metadata, manifest, spine. */
function generateContentOpf(params: {
  uuid: string;
  title: string;
  author: string;
  language: string;
  date: string;
  modified: string;
  chapterCount: number;
}): string {
  const { uuid, title, author, language, date, modified, chapterCount } = params;

  // Manifest items
  const manifestItems: string[] = [
    `    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `    <item id="css" href="style.css" media-type="text/css"/>`,
    `    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
  ];
  for (let i = 1; i <= chapterCount; i++) {
    manifestItems.push(
      `    <item id="chapter-${i}" href="chapter-${i}.xhtml" media-type="application/xhtml+xml"/>`,
    );
  }

  // Spine — cover first, then nav (non-linear), then chapters in order
  const spineItems: string[] = [
    `    <itemref idref="cover"/>`,
    `    <itemref idref="nav" linear="no"/>`,
  ];
  for (let i = 1; i <= chapterCount; i++) {
    spineItems.push(`    <itemref idref="chapter-${i}"/>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${xmlEscape(title)}</dc:title>
    <dc:language>${xmlEscape(language)}</dc:language>
    <dc:creator>${xmlEscape(author)}</dc:creator>
    <dc:date>${date}</dc:date>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
${manifestItems.join("\n")}
  </manifest>
  <spine>
${spineItems.join("\n")}
  </spine>
</package>
`;
}

/** Generate OEBPS/nav.xhtml — the EPUB 3 navigation document (table of contents). */
function generateNavXhtml(params: {
  title: string;
  language: string;
  chapters: ChapterData[];
}): string {
  const { title, language, chapters } = params;

  const tocItems = chapters.map(
    (ch, i) =>
      `      <li><a href="chapter-${i + 1}.xhtml">${xmlEscape(ch.title || `第${i + 1}章`)}</a></li>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xmlEscape(language)}" xml:lang="${xmlEscape(language)}">
<head>
  <meta charset="utf-8"/>
  <title>${xmlEscape(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>
      <li><a href="cover.xhtml">${xmlEscape(title)}</a></li>
${tocItems.join("\n")}
    </ol>
  </nav>
</body>
</html>
`;
}

/** Generate OEBPS/cover.xhtml — cover page with book title and story-bible description. */
function generateCoverXhtml(params: {
  title: string;
  author: string;
  language: string;
  genre: string;
  descriptionHtml: string;
}): string {
  const { title, author, language, genre, descriptionHtml } = params;

  const subtitleParts: string[] = [];
  if (genre) subtitleParts.push(xmlEscape(genre));
  subtitleParts.push(xmlEscape(author));

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${xmlEscape(language)}" xml:lang="${xmlEscape(language)}">
<head>
  <meta charset="utf-8"/>
  <title>${xmlEscape(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="cover-title">${xmlEscape(title)}</div>
  <div class="cover-subtitle">${subtitleParts.join(" · ")}</div>
  <div class="description">
${descriptionHtml}
  </div>
</body>
</html>
`;
}

/** Generate OEBPS/chapter-N.xhtml — one XHTML file per chapter. */
function generateChapterXhtml(params: {
  chapterNumber: number;
  title: string;
  language: string;
  content: string;
}): string {
  const { chapterNumber, title, language, content } = params;
  const displayTitle = title || `第${chapterNumber}章`;
  const paragraphs = contentToParagraphs(content);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${xmlEscape(language)}" xml:lang="${xmlEscape(language)}">
<head>
  <meta charset="utf-8"/>
  <title>${xmlEscape(displayTitle)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${xmlEscape(displayTitle)}</h1>
${paragraphs}
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Chapter loading
// ---------------------------------------------------------------------------

/**
 * Load and sort all chapters for a project from the story directory.
 * Reads every chapter-*.json file, parses it, and sorts by the `order` field.
 * Chapters missing required fields are skipped gracefully.
 */
async function loadChapters(projectId: string): Promise<ChapterData[]> {
  const storyDir = join(DATA_DIR, projectId, "story");
  await ensureDir(storyDir);
  const files = await fs.readdir(storyDir);

  // Filter to chapter JSON files — match the chapter-*.json naming convention
  // used by the story CRUD routes, but also accept any .json that has an
  // "order" field for robustness.
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const rawChapters = await Promise.all(
    jsonFiles.map((file) => readJson<ChapterData>(join(storyDir, file))),
  );

  const chapters: ChapterData[] = [];
  for (const ch of rawChapters) {
    if (ch && typeof ch.order === "number" && typeof ch.content === "string") {
      chapters.push({
        order: ch.order,
        title: typeof ch.title === "string" ? ch.title : "",
        content: ch.content,
        wordCount: ch.wordCount,
        id: ch.id,
        createdAt: ch.createdAt,
        updatedAt: ch.updatedAt,
      });
    }
  }

  // Sort by order ascending
  chapters.sort((a, b) => a.order - b.order);

  return chapters;
}

/**
 * Load the story-bible.md content for a project.
 * Checks the project root first (where loadStoryBible from @tavernos/core
 * reads it), then falls back to the story/ subdirectory for robustness.
 */
async function loadStoryBible(projectId: string): Promise<string> {
  const projectDir = join(DATA_DIR, projectId);

  // Primary location: project root (matches @tavernos/core loadStoryBible)
  try {
    return await fs.readFile(join(projectDir, "story-bible.md"), "utf8");
  } catch {
    // Fall through to secondary location
  }

  // Secondary location: story/ subdirectory (per task spec)
  try {
    return await fs.readFile(join(projectDir, "story", "story-bible.md"), "utf8");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate a complete EPUB 3.0 file for a TavernOS project.
 *
 * Reads chapter data from `~/.tavernos/projects/{projectId}/story/chapter-*.json`,
 * the story bible from the project root, and project metadata from tavernos.json.
 * Returns a Buffer containing the valid EPUB file.
 *
 * @throws Error if the project is not found or has no chapters.
 */
export async function generateEpub(projectId: string): Promise<EpubResult> {
  // --- Load project config ---
  const config = await readJson<ProjectConfig>(
    join(DATA_DIR, projectId, "tavernos.json"),
  );
  if (!config) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // --- Load chapters ---
  const chapters = await loadChapters(projectId);
  if (chapters.length === 0) {
    throw new Error("No chapters found. Write some chapters before exporting.");
  }

  // --- Load story bible (for cover page description) ---
  const storyBible = await loadStoryBible(projectId);

  // --- Determine metadata ---
  // Fall back to projectId (directory name) for the title, matching the
  // behaviour of the GET /api/projects endpoint.
  const title = config.name || projectId || "Untitled";
  const author = "TavernOS";
  const language = config.language || "zh";
  const date =
    config.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const genre = config.genre || "";
  const uuid = randomUUID();

  // --- Generate content files ---
  const descriptionHtml = storyBible.trim()
    ? markdownToHtml(storyBible)
    : "<p>（暂无故事简介）</p>";

  const containerXml = generateContainerXml();
  const contentOpf = generateContentOpf({
    uuid,
    title,
    author,
    language,
    date,
    modified,
    chapterCount: chapters.length,
  });
  const navXhtml = generateNavXhtml({ title, language, chapters });
  const coverXhtml = generateCoverXhtml({
    title,
    author,
    language,
    genre,
    descriptionHtml,
  });

  // --- Build ZIP entries ---
  // CRITICAL: mimetype must be the first entry, stored uncompressed,
  // with no extra field data. This is required by the EPUB specification.
  const entries: ZipEntry[] = [
    {
      filename: "mimetype",
      data: Buffer.from("application/epub+zip", "utf8"),
      compress: false, // stored, not deflated
    },
    {
      filename: "META-INF/container.xml",
      data: Buffer.from(containerXml, "utf8"),
      compress: true,
    },
    {
      filename: "OEBPS/content.opf",
      data: Buffer.from(contentOpf, "utf8"),
      compress: true,
    },
    {
      filename: "OEBPS/nav.xhtml",
      data: Buffer.from(navXhtml, "utf8"),
      compress: true,
    },
    {
      filename: "OEBPS/style.css",
      data: Buffer.from(EPUB_CSS, "utf8"),
      compress: true,
    },
    {
      filename: "OEBPS/cover.xhtml",
      data: Buffer.from(coverXhtml, "utf8"),
      compress: true,
    },
  ];

  // Add one XHTML file per chapter (1-indexed in the manifest/spine)
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]!;
    const chapterXhtml = generateChapterXhtml({
      chapterNumber: i + 1,
      title: ch.title,
      language,
      content: ch.content,
    });
    entries.push({
      filename: `OEBPS/chapter-${i + 1}.xhtml`,
      data: Buffer.from(chapterXhtml, "utf8"),
      compress: true,
    });
  }

  // --- Build the ZIP archive ---
  const buffer = await buildZip(entries);

  // --- Build a safe filename ---
  const safeName = title
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100) || "export";
  const filename = `${safeName}.epub`;

  return { buffer, filename };
}
