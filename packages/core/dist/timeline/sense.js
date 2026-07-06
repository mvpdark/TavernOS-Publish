// packages/core/src/timeline/sense.ts
// TimelineSense — persistent temporal tracking for the narrative.
//
// Tracks when events happen relative to the narrative's internal clock
// (chapters, in-story time) and provides temporal recall such as "the last
// time this character appeared was chapter 7".
//
// Storage: SQLite via better-sqlite3 (WAL journal mode).
//   • timeline_anchors       — temporal markers for story events
//   • character_appearances  — per-character chapter appearance records
//
// All SQL columns use snake_case; all TypeScript fields use camelCase.
// Row mapping is handled by private mapXxxRow() methods.
import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { TimelineAnchorSchema, } from "./types.js";
// ---------------------------------------------------------------------------
// Input schema — anchor without server-generated fields
// ---------------------------------------------------------------------------
const AnchorInputSchema = TimelineAnchorSchema.omit({
    id: true,
    createdAt: true,
});
// ---------------------------------------------------------------------------
// Common bigram stopwords for pattern detection
// ---------------------------------------------------------------------------
const BIGRAM_STOPWORDS = new Set([
    "\u7684\u4e8b", "\u7684\u4e00", "\u4e86\u4e00", "\u662f\u4e00", // 的事|的一|了一|是一
    "\u5728\u4e00", "\u4ed6\u4e00", "\u5979\u4e00", "\u4e0d\u4e00", // 在一|他一|她一|不一
    "\u8fd9\u4e00", "\u90a3\u4e00", "\u5c31\u662f", "\u4e0d\u662f", // 这一|那一|就是|不是
    "\u6ca1\u6709", "\u53ef\u4ee5", "\u8fd9\u6837", "\u90a3\u6837", // 没有|可以|这样|那样
    "\u600e\u4e48", "\u4ec0\u4e48", "\u56e0\u4e3a", "\u6240\u4ee5", // 怎么|什么|因为|所以
    "\u5982\u679c", "\u867d\u7136", "\u4f46\u662f", "\u53ef\u662f", // 如果|虽然|但是|可是
    "\u4e0d\u8fc7", "\u8fd8\u662f", "\u5df2\u7ecf", "\u7136\u540e", // 不过|还是|已经|然后
    "\u63a5\u7740", "\u968f\u540e", "\u540e\u6765", "\u7ec8\u4e8e", // 接着|随后|后来|终于
    "\u6700\u540e", "\u9996\u5148", "\u7a81\u7136", "\u5ffd\u7136", // 最后|首先|突然|忽然
    "\u6b64\u523b", "\u6b64\u65f6", "\u73b0\u5728", "\u4ee5\u524d", // 此刻|此时|现在|以前
    "\u4ee5\u540e", "\u4e4b\u524d", "\u4e4b\u540e", "\u4e4b\u4e2d", // 以后|之前|之后|之中
    "\u4e4b\u95f4", "\u4e4b\u4e0a", "\u4e4b\u4e0b", "\u5230\u4e86", // 之间|之上|之下|到了
    "\u8d70\u4e86", "\u6765\u4e86", "\u53bb\u4e86", "\u56de\u4e86", // 走了|来了|去了|回了
    "\u770b\u4e86", "\u60f3\u4e86", "\u8bf4\u4e86", "\u505a\u4e86", // 看了|想了|说了|做了
    "\u6210\u4e86", "\u53d8\u4e86", "\u65f6\u5019", "\u5730\u65b9", // 成了|变了|时候|地方
    "\u4e1c\u897f", "\u4e8b\u60c5", "\u4e00\u4e2a", "\u4e00\u6837", // 东西|事情|一个|一样
    "\u4e00\u4e0b", "\u4e00\u8d77", "\u4e00\u5b9a", "\u4e00\u70b9", // 一下|一起|一定|一点
    "\u8fd9\u4e2a", "\u90a3\u4e2a", "\u5c31\u5728", "\u5c31\u8981", // 这个|那个|就在|就要
    "\u5c31\u4f1a", "\u8fd8\u6709", "\u8fd8\u5728", "\u8fd8\u8981", // 就会|还有|还在|还要
]);
// ---------------------------------------------------------------------------
// TimelineSense
// ---------------------------------------------------------------------------
export class TimelineSense {
    db;
    closed = false;
    constructor(dbPath) {
        // Ensure the parent directory exists.
        const dir = dirname(dbPath);
        mkdirSync(dir, { recursive: true });
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this.initSchema();
    }
    // -------------------------------------------------------------------------
    // Schema initialisation
    // -------------------------------------------------------------------------
    initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS timeline_anchors (
        id             TEXT PRIMARY KEY,
        chapter_index  INTEGER NOT NULL,
        label          TEXT NOT NULL,
        in_story_time  TEXT,
        characters     TEXT NOT NULL DEFAULT '[]',
        location       TEXT,
        anchor_type    TEXT NOT NULL DEFAULT 'event',
        significance   REAL NOT NULL DEFAULT 0.5,
        created_at     TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_anchors_chapter ON timeline_anchors(chapter_index);
      CREATE INDEX IF NOT EXISTS idx_anchors_type    ON timeline_anchors(anchor_type);

      CREATE TABLE IF NOT EXISTS character_appearances (
        character      TEXT PRIMARY KEY,
        first_chapter  INTEGER NOT NULL,
        last_chapter   INTEGER NOT NULL,
        total_chapters INTEGER NOT NULL DEFAULT 1,
        gap_chapters   INTEGER NOT NULL DEFAULT 0,
        chapter_list   TEXT NOT NULL DEFAULT '[]',
        updated_at     TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_appearances_last_chapter ON character_appearances(last_chapter);
    `);
    }
    // -------------------------------------------------------------------------
    // Row mapping (snake_case SQL ↔ camelCase TypeScript)
    // -------------------------------------------------------------------------
    mapAnchorRow(row) {
        return {
            id: row.id,
            chapterIndex: row.chapter_index,
            label: row.label,
            inStoryTime: row.in_story_time ?? undefined,
            characters: JSON.parse(row.characters),
            location: row.location ?? undefined,
            anchorType: row.anchor_type,
            significance: row.significance,
            createdAt: row.created_at,
        };
    }
    mapAppearanceRow(row) {
        return {
            character: row.character,
            firstChapter: row.first_chapter,
            lastChapter: row.last_chapter,
            totalChapters: row.total_chapters,
            gapChapters: row.gap_chapters,
            chapterList: JSON.parse(row.chapter_list),
        };
    }
    // -------------------------------------------------------------------------
    // Public API — Anchor operations
    // -------------------------------------------------------------------------
    /**
     * Add a timeline anchor.
     *
     * @param input Anchor data without `id` and `createdAt` (server-generated).
     * @returns     The fully-formed TimelineAnchor with id and createdAt.
     */
    addAnchor(input) {
        // Validate input with Zod (fills defaults for optional fields).
        const validated = AnchorInputSchema.parse(input);
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        this.db
            .prepare(`
        INSERT INTO timeline_anchors
          (id, chapter_index, label, in_story_time, characters, location,
           anchor_type, significance, created_at)
        VALUES
          (@id, @chapter_index, @label, @in_story_time, @characters, @location,
           @anchor_type, @significance, @created_at)
      `)
            .run({
            id,
            chapter_index: validated.chapterIndex,
            label: validated.label,
            in_story_time: validated.inStoryTime ?? null,
            characters: JSON.stringify(validated.characters),
            location: validated.location ?? null,
            anchor_type: validated.anchorType,
            significance: validated.significance,
            created_at: createdAt,
        });
        return {
            ...validated,
            id,
            createdAt,
        };
    }
    /**
     * Get the most recent N anchors, ordered by chapter (descending) then
     * creation time (descending).
     */
    getRecentAnchors(count) {
        const rows = this.db
            .prepare(`
        SELECT * FROM timeline_anchors
        ORDER BY chapter_index DESC, created_at DESC
        LIMIT ?
      `)
            .all(count);
        return rows.map((r) => this.mapAnchorRow(r));
    }
    /**
     * Get all anchors whose chapter_index falls within [from, to] (inclusive).
     */
    getAnchorsByChapter(from, to) {
        const rows = this.db
            .prepare(`
        SELECT * FROM timeline_anchors
        WHERE chapter_index BETWEEN ? AND ?
        ORDER BY chapter_index ASC, created_at ASC
      `)
            .all(from, to);
        return rows.map((r) => this.mapAnchorRow(r));
    }
    // -------------------------------------------------------------------------
    // Public API — Character appearance operations
    // -------------------------------------------------------------------------
    /**
     * Record that a character appeared in a given chapter.
     * If the character is seen in the same chapter twice, the duplicate is
     * silently ignored.
     */
    recordAppearance(character, chapterIndex) {
        const existing = this.db
            .prepare("SELECT * FROM character_appearances WHERE character = ?")
            .get(character);
        const now = new Date().toISOString();
        if (existing) {
            const chapterList = JSON.parse(existing.chapter_list);
            // Ignore duplicate appearances in the same chapter.
            if (chapterList.includes(chapterIndex))
                return;
            const gap = chapterIndex - existing.last_chapter;
            chapterList.push(chapterIndex);
            this.db
                .prepare(`
          UPDATE character_appearances
          SET last_chapter   = @last_chapter,
              total_chapters = @total_chapters,
              gap_chapters   = @gap_chapters,
              chapter_list   = @chapter_list,
              updated_at     = @updated_at
          WHERE character    = @character
        `)
                .run({
                character,
                last_chapter: chapterIndex,
                total_chapters: existing.total_chapters + 1,
                gap_chapters: gap,
                chapter_list: JSON.stringify(chapterList),
                updated_at: now,
            });
        }
        else {
            this.db
                .prepare(`
          INSERT INTO character_appearances
            (character, first_chapter, last_chapter, total_chapters,
             gap_chapters, chapter_list, updated_at)
          VALUES
            (@character, @first_chapter, @last_chapter, @total_chapters,
             @gap_chapters, @chapter_list, @updated_at)
        `)
                .run({
                character,
                first_chapter: chapterIndex,
                last_chapter: chapterIndex,
                total_chapters: 1,
                gap_chapters: 0,
                chapter_list: JSON.stringify([chapterIndex]),
                updated_at: now,
            });
        }
    }
    /**
     * Get the appearance record for a specific character.
     */
    getAppearance(character) {
        const row = this.db
            .prepare("SELECT * FROM character_appearances WHERE character = ?")
            .get(character);
        return row ? this.mapAppearanceRow(row) : undefined;
    }
    // -------------------------------------------------------------------------
    // Public API — Temporal context & analysis
    // -------------------------------------------------------------------------
    /**
     * Build a full temporal context for the given chapter.
     *
     * Includes the 5 most recent anchors, recurring patterns, time-since-last-
     * appearance for every tracked character, and the current chapter's event
     * density.
     */
    getTemporalContext(currentChapter) {
        const recentAnchors = this.getRecentAnchors(5);
        const recurringPatterns = this.detectRecurringPatterns();
        const chapterDensity = this.getChapterDensity(currentChapter);
        // Build time-since-last-appearance map for all tracked characters.
        const timeSinceLastAppearance = new Map();
        const allAppearances = this.getAllAppearances();
        for (const record of allAppearances) {
            timeSinceLastAppearance.set(record.character, Math.max(0, currentChapter - record.lastChapter));
        }
        return {
            currentChapter,
            recentAnchors,
            recurringPatterns,
            timeSinceLastAppearance,
            chapterDensity,
        };
    }
    /**
     * Compute the event density (0-1) for a given chapter.
     *
     * Combines a count-based contribution (up to 0.6) with a significance-
     * weighted contribution (up to 0.4). A chapter with 4+ high-significance
     * events will approach 1.0.
     */
    getChapterDensity(chapterIndex) {
        const rows = this.db
            .prepare("SELECT significance FROM timeline_anchors WHERE chapter_index = ?")
            .all(chapterIndex);
        if (rows.length === 0)
            return 0;
        // Count contribution: each event adds 0.15, capped at 0.6 (4+ events).
        const countPart = Math.min(0.6, rows.length * 0.15);
        // Significance contribution: sum of significance × 0.1, capped at 0.4.
        const totalSignificance = rows.reduce((sum, r) => sum + r.significance, 0);
        const sigPart = Math.min(0.4, totalSignificance * 0.1);
        return Math.min(1, countPart + sigPart);
    }
    /**
     * Detect repeating patterns across all timeline anchors.
     *
     * Returns human-readable pattern strings for:
     *   1. Character co-occurrences (pairs appearing together in 2+ anchors)
     *   2. Recurring locations (appearing in 2+ anchors)
     *   3. Anchor-type clustering (types appearing in 3+ anchors)
     *   4. Recurring label keywords (2-grams appearing in 2+ labels)
     */
    detectRecurringPatterns() {
        const allAnchors = this.getAllAnchors();
        const patterns = [];
        // --- 1. Character co-occurrence ---
        const pairFreq = new Map();
        for (const anchor of allAnchors) {
            const sorted = [...anchor.characters].sort();
            for (let i = 0; i < sorted.length; i++) {
                for (let j = i + 1; j < sorted.length; j++) {
                    const pair = `${sorted[i]} + ${sorted[j]}`;
                    pairFreq.set(pair, (pairFreq.get(pair) ?? 0) + 1);
                }
            }
        }
        for (const [pair, freq] of pairFreq) {
            if (freq >= 2) {
                patterns.push(`\u89d2\u8272\u5171\u73b0: ${pair} (${freq}\u6b21)`); // 角色共现: ... (N次)
            }
        }
        // --- 2. Recurring locations ---
        const locFreq = new Map();
        for (const anchor of allAnchors) {
            if (anchor.location) {
                locFreq.set(anchor.location, (locFreq.get(anchor.location) ?? 0) + 1);
            }
        }
        for (const [loc, freq] of locFreq) {
            if (freq >= 2) {
                patterns.push(`\u91cd\u590d\u5730\u70b9: ${loc} (${freq}\u6b21)`); // 重复地点: ... (N次)
            }
        }
        // --- 3. Anchor-type clustering ---
        const typeFreq = new Map();
        for (const anchor of allAnchors) {
            typeFreq.set(anchor.anchorType, (typeFreq.get(anchor.anchorType) ?? 0) + 1);
        }
        for (const [type, freq] of typeFreq) {
            if (freq >= 3) {
                patterns.push(`\u4e8b\u4ef6\u7c7b\u578b\u805a\u96c6: ${type} (${freq}\u6b21)`); // 事件类型聚集: ... (N次)
            }
        }
        // --- 4. Recurring label keywords (2-gram analysis) ---
        const termFreq = new Map();
        for (const anchor of allAnchors) {
            const label = anchor.label;
            const seen = new Set();
            // Extract all 2-character CJK substrings.
            for (let i = 0; i <= label.length - 2; i++) {
                const gram = label.slice(i, i + 2);
                if (/^[\u4e00-\u9fff]{2}$/.test(gram) && !BIGRAM_STOPWORDS.has(gram)) {
                    seen.add(gram);
                }
            }
            for (const gram of seen) {
                termFreq.set(gram, (termFreq.get(gram) ?? 0) + 1);
            }
        }
        for (const [gram, freq] of termFreq) {
            if (freq >= 2) {
                patterns.push(`\u91cd\u590d\u4e3b\u9898: ${gram} (${freq}\u6b21)`); // 重复主题: ... (N次)
            }
        }
        return patterns;
    }
    // -------------------------------------------------------------------------
    // Public API — lifecycle
    // -------------------------------------------------------------------------
    /** Close the database connection. Safe to call multiple times. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.db.close();
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    /** Retrieve all anchors ordered by chapter then creation time. */
    getAllAnchors() {
        const rows = this.db
            .prepare("SELECT * FROM timeline_anchors ORDER BY chapter_index ASC, created_at ASC")
            .all();
        return rows.map((r) => this.mapAnchorRow(r));
    }
    /** Retrieve all appearance records ordered by last chapter (descending). */
    getAllAppearances() {
        const rows = this.db
            .prepare("SELECT * FROM character_appearances ORDER BY last_chapter DESC")
            .all();
        return rows.map((r) => this.mapAppearanceRow(r));
    }
}
//# sourceMappingURL=sense.js.map