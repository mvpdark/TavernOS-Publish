// packages/core/src/character-engine/pace-director.ts
// PaceDirector — narrative pacing analysis engine.
//
// Analyses the scene composition of a chapter to compute tension,
// relaxation, rhythm, and ratios. Rhythm is determined by comparing the
// current chapter's tension against the previous chapter's, producing
// one of: rising, peak, falling, valley, flat.
//
// A Chinese-language recommendation string is generated to advise the
// author on pacing adjustments. All metrics are persisted in SQLite.
import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { analyzeHookDensity } from "../audit/hook-density.js";
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/**
 * Weight multipliers applied to scene intensity when computing chapter
 * tension. Conflict, action, and tragedy scenes contribute more heavily.
 */
const SCENE_TENSION_WEIGHT = {
    conflict: 1.5,
    tragedy: 1.4,
    action: 1.3,
    separation: 1.2,
    revelation: 1.1,
};
/** Scene types that contribute to relaxation. */
const RELAXING_SCENES = ["comedy", "tenderness", "transition"];
// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
/** Clamp a value to the inclusive [min, max] range. */
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
// ---------------------------------------------------------------------------
// PaceDirector
// ---------------------------------------------------------------------------
export class PaceDirector {
    db;
    constructor(dbPath) {
        mkdirSync(dirname(dbPath), { recursive: true });
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.initSchema();
    }
    // --- Schema ---
    initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS pace_metrics (
        chapter_index   INTEGER PRIMARY KEY,
        tension         REAL NOT NULL,
        relaxation      REAL NOT NULL,
        rhythm          TEXT NOT NULL DEFAULT 'flat',
        scene_count     INTEGER NOT NULL DEFAULT 0,
        dialogue_ratio  REAL NOT NULL DEFAULT 0,
        action_ratio    REAL NOT NULL DEFAULT 0,
        word_count      INTEGER NOT NULL DEFAULT 0,
        tension_trend   REAL NOT NULL DEFAULT 0,
        recommendation  TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS retention_metrics (
        chapter_index        INTEGER PRIMARY KEY,
        hook_density         REAL NOT NULL DEFAULT 0,
        cool_point_density   REAL NOT NULL DEFAULT 0,
        reader_fatigue       REAL NOT NULL DEFAULT 0,
        retention_power      REAL NOT NULL DEFAULT 50,
        engagement_score     REAL NOT NULL DEFAULT 0,
        cliffhanger_strength REAL NOT NULL DEFAULT 0,
        pacing_balance       REAL NOT NULL DEFAULT 0,
        recommendation       TEXT NOT NULL DEFAULT ''
      );
    `);
    }
    // --- Row mapping ---
    mapRow(row) {
        return {
            chapterIndex: row.chapter_index,
            tension: row.tension,
            relaxation: row.relaxation,
            rhythm: row.rhythm,
            sceneCount: row.scene_count,
            dialogueRatio: row.dialogue_ratio,
            actionRatio: row.action_ratio,
            wordCount: row.word_count,
            tensionTrend: row.tension_trend,
            recommendation: row.recommendation,
        };
    }
    // --- Persistence ---
    upsert(metrics) {
        this.db.prepare(`
      INSERT INTO pace_metrics
        (chapter_index, tension, relaxation, rhythm, scene_count,
         dialogue_ratio, action_ratio, word_count, tension_trend, recommendation)
      VALUES
        (@chapter_index, @tension, @relaxation, @rhythm, @scene_count,
         @dialogue_ratio, @action_ratio, @word_count, @tension_trend, @recommendation)
      ON CONFLICT(chapter_index) DO UPDATE SET
        tension        = @tension,
        relaxation     = @relaxation,
        rhythm         = @rhythm,
        scene_count    = @scene_count,
        dialogue_ratio = @dialogue_ratio,
        action_ratio   = @action_ratio,
        word_count     = @word_count,
        tension_trend  = @tension_trend,
        recommendation = @recommendation
    `).run({
            chapter_index: metrics.chapterIndex,
            tension: metrics.tension,
            relaxation: metrics.relaxation,
            rhythm: metrics.rhythm,
            scene_count: metrics.sceneCount,
            dialogue_ratio: metrics.dialogueRatio,
            action_ratio: metrics.actionRatio,
            word_count: metrics.wordCount,
            tension_trend: metrics.tensionTrend,
            recommendation: metrics.recommendation,
        });
    }
    // --- Retention row mapping ---
    mapRetentionRow(row) {
        return {
            chapterIndex: row.chapter_index,
            hookDensity: row.hook_density,
            coolPointDensity: row.cool_point_density,
            readerFatigue: row.reader_fatigue,
            retentionPower: row.retention_power,
            engagementScore: row.engagement_score,
            cliffhangerStrength: row.cliffhanger_strength,
            pacingBalance: row.pacing_balance,
            recommendation: row.recommendation,
        };
    }
    upsertRetention(metrics) {
        this.db.prepare(`
      INSERT INTO retention_metrics
        (chapter_index, hook_density, cool_point_density, reader_fatigue,
         retention_power, engagement_score, cliffhanger_strength,
         pacing_balance, recommendation)
      VALUES
        (@chapter_index, @hook_density, @cool_point_density, @reader_fatigue,
         @retention_power, @engagement_score, @cliffhanger_strength,
         @pacing_balance, @recommendation)
      ON CONFLICT(chapter_index) DO UPDATE SET
        hook_density         = @hook_density,
        cool_point_density   = @cool_point_density,
        reader_fatigue       = @reader_fatigue,
        retention_power      = @retention_power,
        engagement_score     = @engagement_score,
        cliffhanger_strength = @cliffhanger_strength,
        pacing_balance       = @pacing_balance,
        recommendation       = @recommendation
    `).run({
            chapter_index: metrics.chapterIndex,
            hook_density: metrics.hookDensity,
            cool_point_density: metrics.coolPointDensity,
            reader_fatigue: metrics.readerFatigue,
            retention_power: metrics.retentionPower,
            engagement_score: metrics.engagementScore,
            cliffhanger_strength: metrics.cliffhangerStrength,
            pacing_balance: metrics.pacingBalance,
            recommendation: metrics.recommendation,
        });
    }
    // --- Rhythm computation ---
    /**
     * Determine the rhythm label from the current tension and its trend
     * relative to the previous chapter.
     *
     * Priority (first match wins):
     *   1. rising  — tensionTrend > 0.15
     *   2. peak    — tension > 0.8 AND tensionTrend >= 0
     *   3. falling — tensionTrend < -0.15
     *   4. valley  — tension < 0.2 AND tensionTrend <= 0
     *   5. flat    — everything else
     */
    computeRhythm(tension, tensionTrend) {
        if (tensionTrend > 0.15)
            return "rising";
        if (tension > 0.8 && tensionTrend >= 0)
            return "peak";
        if (tensionTrend < -0.15)
            return "falling";
        if (tension < 0.2 && tensionTrend <= 0)
            return "valley";
        return "flat";
    }
    /**
     * Generate a Chinese recommendation string based on the current rhythm
     * and recent chapter history.
     *
     * Note: the "valley" rhythm inherently implies low tension (tension < 0.2),
     * so no separate tension check is needed for that branch.
     */
    computeRecommendation(rhythm) {
        if (rhythm === "valley") {
            return "节奏过于平缓，建议加入冲突或悬念提升张力";
        }
        if (rhythm === "peak") {
            return "张力已达顶峰，建议下章安排舒缓场景调节节奏";
        }
        if (rhythm === "rising") {
            // Check for 3+ consecutive rising chapters (including the current one).
            // getRecentMetrics is called before storing the current chapter, so
            // it returns only previously-stored chapters.
            const recent = this.getRecentMetrics(3);
            let consecutive = 1; // current chapter is rising
            for (let i = recent.length - 1; i >= 0; i--) {
                if (recent[i].rhythm === "rising") {
                    consecutive++;
                }
                else {
                    break;
                }
            }
            if (consecutive >= 3) {
                return "连续上升的张力，注意不要让读者疲劳";
            }
            return "";
        }
        if (rhythm === "flat") {
            return "节奏平淡，建议变化场景类型增加层次感";
        }
        // falling — no specific recommendation.
        return "";
    }
    // --- Public API ---
    /**
     * Analyse a chapter's scene composition and compute pacing metrics.
     *
     * @param chapterIndex The chapter being analysed.
     * @param scenes       The scene signals detected in this chapter.
     * @param wordCount    The total word count of the chapter.
     */
    analyze(chapterIndex, scenes, wordCount) {
        const sceneCount = scenes.length;
        // --- Tension: weighted average of scene intensities ---
        let tensionSum = 0;
        let weightSum = 0;
        let dialogueCount = 0;
        let actionCount = 0;
        let relaxingCount = 0;
        for (const scene of scenes) {
            const weight = SCENE_TENSION_WEIGHT[scene.type] ?? 1.0;
            tensionSum += scene.intensity * weight;
            weightSum += weight;
            if (scene.type === "dialogue")
                dialogueCount++;
            if (scene.type === "action")
                actionCount++;
            if (RELAXING_SCENES.includes(scene.type))
                relaxingCount++;
        }
        const tension = weightSum > 0 ? clamp(tensionSum / weightSum, 0, 1) : 0;
        // --- Relaxation: inverse of tension, boosted by relaxing scenes ---
        const relaxRatio = sceneCount > 0 ? relaxingCount / sceneCount : 0;
        const relaxation = clamp((1 - tension) * 0.7 + relaxRatio * 0.3, 0, 1);
        // --- Tension trend: compare to previous chapter ---
        const prev = this.getMetrics(chapterIndex - 1);
        const previousTension = prev?.tension ?? 0;
        const tensionTrend = clamp(tension - previousTension, -1, 1);
        // --- Rhythm ---
        const rhythm = this.computeRhythm(tension, tensionTrend);
        // --- Ratios ---
        const dialogueRatio = sceneCount > 0 ? dialogueCount / sceneCount : 0;
        const actionRatio = sceneCount > 0 ? actionCount / sceneCount : 0;
        // --- Recommendation ---
        const recommendation = this.computeRecommendation(rhythm);
        const metrics = {
            chapterIndex,
            tension,
            relaxation,
            rhythm,
            sceneCount,
            dialogueRatio,
            actionRatio,
            wordCount,
            tensionTrend,
            recommendation,
        };
        this.upsert(metrics);
        return metrics;
    }
    /** Retrieve metrics for a specific chapter. */
    getMetrics(chapterIndex) {
        const row = this.db.prepare("SELECT * FROM pace_metrics WHERE chapter_index = ?").get(chapterIndex);
        return row ? this.mapRow(row) : undefined;
    }
    /** Retrieve the most recent N chapters' metrics (ascending order). */
    getRecentMetrics(count) {
        const rows = this.db.prepare(`SELECT * FROM (
        SELECT * FROM pace_metrics ORDER BY chapter_index DESC LIMIT ?
      ) ORDER BY chapter_index ASC`).all(count);
        return rows.map(r => this.mapRow(r));
    }
    // --- Retention analysis ---
    /**
     * Analyse reader retention metrics for a chapter.
     * Combines hook density, cool-point density, pacing data, and historical
     * fatigue to compute a 追读力 (retention power) score.
     *
     * @param chapterIndex       The chapter being analysed.
     * @param hookDensity        Hook density score (0-1) from hook-density analyzer.
     * @param coolPointDensity   Cool-point density score (0-1).
     * @param cliffhangerStrength Chapter-end cliffhanger strength (0-1).
     */
    analyzeRetention(chapterIndex, hookDensity, coolPointDensity, cliffhangerStrength) {
        // --- engagementScore: weighted blend of hook, cool-point, cliffhanger ---
        const engagementScore = clamp(hookDensity * 0.35 + coolPointDensity * 0.45 + cliffhangerStrength * 0.20, 0, 1);
        // --- readerFatigue: derived from the recent 3 chapters' tension trend ---
        const recent3 = this.getRecentMetrics(3);
        // Count consecutive high-tension chapters from the most recent backwards.
        let consecutiveHigh = 0;
        for (let i = recent3.length - 1; i >= 0; i--) {
            if (recent3[i].tension > 0.7) {
                consecutiveHigh++;
            }
            else {
                break;
            }
        }
        const avgTension = recent3.length > 0
            ? recent3.reduce((s, m) => s + m.tension, 0) / recent3.length
            : 0;
        let readerFatigue;
        if (consecutiveHigh >= 3) {
            readerFatigue = 0.8;
        }
        else if (consecutiveHigh >= 2) {
            readerFatigue = 0.5;
        }
        else if (avgTension > 0.6) {
            readerFatigue = 0.4;
        }
        else {
            readerFatigue = 0.1;
        }
        // --- pacingBalance: derived from the recent 5 chapters' rhythm distribution ---
        const recent5 = this.getRecentMetrics(5);
        const rhythms = recent5.map(m => m.rhythm);
        const uniqueRhythms = new Set(rhythms);
        const flatCount = rhythms.filter(r => r === "flat").length;
        const flatRatio = rhythms.length > 0 ? flatCount / rhythms.length : 0;
        let pacingBalance;
        if (uniqueRhythms.size >= 2 && flatRatio < 0.5) {
            pacingBalance = 0.8;
        }
        else if (flatRatio > 0.6) {
            pacingBalance = 0.3;
        }
        else if (uniqueRhythms.size === 1) {
            pacingBalance = 0.2;
        }
        else {
            pacingBalance = 0.6;
        }
        // --- retentionPower: 0-100 composite score ---
        const baseScore = engagementScore * 60;
        const fatiguePenalty = readerFatigue * 25;
        const balanceBonus = pacingBalance * 15;
        const retentionPower = clamp(baseScore - fatiguePenalty + balanceBonus, 0, 100);
        // --- recommendation: Chinese advisory text ---
        const recommendation = this.computeRetentionRecommendation(retentionPower, readerFatigue, pacingBalance, cliffhangerStrength);
        const metrics = {
            chapterIndex,
            hookDensity: clamp(hookDensity, 0, 1),
            coolPointDensity: clamp(coolPointDensity, 0, 1),
            readerFatigue,
            retentionPower,
            engagementScore,
            cliffhangerStrength: clamp(cliffhangerStrength, 0, 1),
            pacingBalance,
            recommendation,
        };
        this.upsertRetention(metrics);
        return metrics;
    }
    /**
     * Analyse reader retention for a chapter by automatically running
     * hook-density analysis on the chapter content.
     *
     * This is a convenience wrapper that calls `analyzeHookDensity()` from the
     * audit module, then feeds the derived metrics into `analyzeRetention()`.
     *
     * Normalisation notes (per-1000-char densities -> 0-1 scores):
     *   - hookDensity:         result.hookDensity / 1000 * 3, clamped to 0-1
     *     (hookDensity is hooks-per-1000-chars; 3 per 1000 is high density)
     *   - coolPointDensity:    result.coolPointDensity / 1000 * 3, clamped to 0-1
     *   - cliffhangerStrength: count of cliffhanger hooks / 3, clamped to 0-1
     *
     * @param chapterIndex   The chapter being analysed.
     * @param chapterContent The chapter text content.
     * @param wordCount      Optional word count (auto-calculated if omitted).
     */
    analyzeRetentionFromText(chapterIndex, chapterContent, wordCount) {
        // Run the zero-LLM hook-density analyzer on the chapter text.
        const result = analyzeHookDensity(chapterContent, wordCount);
        // --- Normalise per-1000-char densities to 0-1 scores ---
        // hookDensity / coolPointDensity: 3 per 1000 chars = high density = 1.0
        const hookDensity = clamp(result.hookDensity / 1000 * 3, 0, 1);
        const coolPointDensity = clamp(result.coolPointDensity / 1000 * 3, 0, 1);
        // --- Cliffhanger strength: count cliffhanger-type hooks, normalise by 3 ---
        const cliffhangerCount = result.hooks.filter((h) => h.type === "cliffhanger").length;
        const cliffhangerStrength = clamp(cliffhangerCount / 3, 0, 1);
        return this.analyzeRetention(chapterIndex, hookDensity, coolPointDensity, cliffhangerStrength);
    }
    /**
     * Generate a Chinese recommendation string for retention metrics. Multiple
     * applicable conditions are joined with a Chinese semicolon.
     */
    computeRetentionRecommendation(retentionPower, readerFatigue, pacingBalance, cliffhangerStrength) {
        const parts = [];
        if (retentionPower < 40) {
            parts.push("追读力偏低，建议增加爽点和章末悬念");
        }
        if (readerFatigue > 0.6) {
            parts.push("读者疲劳度较高，建议安排舒缓过渡章节");
        }
        if (pacingBalance < 0.4) {
            parts.push("节奏单一，建议丰富场景类型和情绪层次");
        }
        if (cliffhangerStrength < 0.3) {
            parts.push("章末悬念不足，建议添加钩子提升追读意愿");
        }
        if (retentionPower > 80) {
            parts.push("追读力优秀，保持当前节奏和爽点密度");
        }
        return parts.join("；");
    }
    /** Retrieve retention metrics for a specific chapter. */
    getRetentionMetrics(chapterIndex) {
        const row = this.db.prepare("SELECT * FROM retention_metrics WHERE chapter_index = ?").get(chapterIndex);
        return row ? this.mapRetentionRow(row) : undefined;
    }
    /**
     * Build a retention dashboard aggregating metrics across recent chapters.
     *
     * @param recentCount Number of recent chapters to include (default 20).
     */
    getRetentionDashboard(recentCount = 20) {
        const rows = this.db.prepare(`SELECT * FROM (
        SELECT * FROM retention_metrics ORDER BY chapter_index DESC LIMIT ?
      ) ORDER BY chapter_index ASC`).all(recentCount);
        const chapterMetrics = rows.map(r => this.mapRetentionRow(r));
        const totalChapters = chapterMetrics.length;
        // --- Edge case: no data ---
        if (totalChapters === 0) {
            return {
                totalChapters: 0,
                averageRetention: 0,
                retentionTrend: "stable",
                fatigueWarning: false,
                weakestChapters: [],
                strongestChapters: [],
                overallRecommendation: "",
                chapterMetrics: [],
            };
        }
        // --- averageRetention ---
        const averageRetention = clamp(chapterMetrics.reduce((s, m) => s + m.retentionPower, 0) / totalChapters, 0, 100);
        // --- retentionTrend: compare first-half vs second-half averages ---
        const half = Math.floor(totalChapters / 2);
        let retentionTrend = "stable";
        if (half > 0 && totalChapters > 1) {
            const firstHalf = chapterMetrics.slice(0, half);
            const secondHalf = chapterMetrics.slice(half);
            const firstAvg = firstHalf.reduce((s, m) => s + m.retentionPower, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((s, m) => s + m.retentionPower, 0) / secondHalf.length;
            if (secondAvg > firstAvg + 5) {
                retentionTrend = "improving";
            }
            else if (secondAvg < firstAvg - 5) {
                retentionTrend = "declining";
            }
        }
        // --- fatigueWarning: average readerFatigue of the last 3 chapters ---
        const last3 = chapterMetrics.slice(-3);
        const avgFatigue = last3.length > 0
            ? last3.reduce((s, m) => s + m.readerFatigue, 0) / last3.length
            : 0;
        const fatigueWarning = avgFatigue > 0.5;
        // --- weakestChapters: 3 lowest retentionPower (ascending) ---
        const weakestChapters = [...chapterMetrics]
            .sort((a, b) => a.retentionPower - b.retentionPower)
            .slice(0, 3)
            .map(m => m.chapterIndex);
        // --- strongestChapters: 3 highest retentionPower (descending) ---
        const strongestChapters = [...chapterMetrics]
            .sort((a, b) => b.retentionPower - a.retentionPower)
            .slice(0, 3)
            .map(m => m.chapterIndex);
        // --- overallRecommendation ---
        const overallRecommendation = this.computeOverallRecommendation(averageRetention, avgFatigue, retentionTrend);
        return {
            totalChapters,
            averageRetention,
            retentionTrend,
            fatigueWarning,
            weakestChapters,
            strongestChapters,
            overallRecommendation,
            chapterMetrics,
        };
    }
    /**
     * Generate an aggregate Chinese recommendation for the retention dashboard.
     */
    computeOverallRecommendation(averageRetention, avgFatigue, trend) {
        const parts = [];
        if (averageRetention < 40) {
            parts.push("整体追读力偏低，需重点优化爽点密度和章末悬念");
        }
        else if (averageRetention > 80) {
            parts.push("整体追读力优秀，保持当前创作节奏");
        }
        if (avgFatigue > 0.5) {
            parts.push("近期读者疲劳度偏高，建议安排舒缓过渡章节");
        }
        if (trend === "declining") {
            parts.push("追读力呈下降趋势，建议检查近期章节的钩子和爽点配置");
        }
        else if (trend === "improving") {
            parts.push("追读力呈上升趋势，当前策略有效");
        }
        return parts.join("；");
    }
    // --- Multi-chapter tension curve analysis ---
    /**
     * Analyse the tension curve across multiple chapters.
     * Detects pacing patterns and identifies potential reader drop-off points.
     *
     * Loads pace_metrics and retention_metrics for the specified range,
     * computes aggregate statistics, classifies the overall pattern, and
     * produces a Chinese-language recommendation.
     *
     * @param startChapter First chapter index (inclusive).
     * @param endChapter   Last chapter index (inclusive).
     */
    analyzeTensionCurve(startChapter, endChapter) {
        // --- Load pace metrics for the specified range ---
        const paceRows = this.db.prepare(`SELECT * FROM pace_metrics
       WHERE chapter_index >= ? AND chapter_index <= ?
       ORDER BY chapter_index ASC`).all(startChapter, endChapter);
        // --- Load retention metrics for retentionPower enrichment ---
        const retentionRows = this.db.prepare(`SELECT * FROM retention_metrics
       WHERE chapter_index >= ? AND chapter_index <= ?
       ORDER BY chapter_index ASC`).all(startChapter, endChapter);
        // Build a lookup map for retention power by chapter index
        const retentionMap = new Map();
        for (const row of retentionRows) {
            retentionMap.set(row.chapter_index, row.retention_power);
        }
        // --- Build curve points ---
        const points = paceRows.map((row) => ({
            chapterIndex: row.chapter_index,
            tension: row.tension,
            relaxation: row.relaxation,
            rhythm: row.rhythm,
            retentionPower: retentionMap.get(row.chapter_index),
        }));
        // --- Edge case: no data in range ---
        if (points.length === 0) {
            return {
                points: [],
                averageTension: 0,
                volatility: 0,
                pattern: "flat",
                dropOffPoints: [],
                peakPoints: [],
                recommendation: "暂无章节数据，无法分析张力曲线",
            };
        }
        const tensions = points.map((p) => p.tension);
        const n = tensions.length;
        // --- averageTension ---
        const averageTension = tensions.reduce((sum, t) => sum + t, 0) / n;
        // --- volatility: population standard deviation of tension ---
        const variance = tensions.reduce((sum, t) => sum + Math.pow(t - averageTension, 2), 0) / n;
        const volatility = Math.sqrt(variance);
        // --- Linear regression slope (tension over chapter sequence) ---
        const xMean = (n - 1) / 2;
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (tensions[i] - averageTension);
            denominator += Math.pow(i - xMean, 2);
        }
        const slope = denominator !== 0 ? numerator / denominator : 0;
        // --- Adjacent tension differences and sign alternation ratio ---
        const diffs = [];
        for (let i = 1; i < n; i++) {
            diffs.push(tensions[i] - tensions[i - 1]);
        }
        let alternations = 0;
        for (let i = 1; i < diffs.length; i++) {
            if (diffs[i] * diffs[i - 1] < 0) {
                alternations++;
            }
        }
        const alternationRatio = diffs.length > 0 ? alternations / diffs.length : 0;
        // --- Count local extrema (peaks and valleys) ---
        let extrema = 0;
        for (let i = 1; i < n - 1; i++) {
            if ((tensions[i] > tensions[i - 1] && tensions[i] > tensions[i + 1]) ||
                (tensions[i] < tensions[i - 1] && tensions[i] < tensions[i + 1])) {
                extrema++;
            }
        }
        // --- Pattern detection (first match wins) ---
        let pattern;
        if (volatility > 0.25 && alternationRatio > 0.5) {
            pattern = "roller-coaster";
        }
        else if (slope > 0.05) {
            pattern = "ascending";
        }
        else if (slope < -0.05) {
            pattern = "descending";
        }
        else if (volatility < 0.1) {
            pattern = "flat";
        }
        else if (extrema >= 2 && volatility >= 0.15 && volatility <= 0.25) {
            pattern = "wave";
        }
        else {
            pattern = "flat";
        }
        // --- dropOffPoints: chapters where tension drops > 0.3 from previous ---
        const dropOffPoints = [];
        for (let i = 1; i < points.length; i++) {
            if (points[i - 1].tension - points[i].tension > 0.3) {
                dropOffPoints.push(points[i].chapterIndex);
            }
        }
        // --- peakPoints: chapters with tension > 0.8 ---
        const peakPoints = points
            .filter((p) => p.tension > 0.8)
            .map((p) => p.chapterIndex);
        // --- Chinese recommendation based on the detected pattern ---
        let recommendation;
        switch (pattern) {
            case "roller-coaster":
                recommendation = "张力曲线呈过山车式，节奏紧凑但注意防止读者疲劳";
                break;
            case "ascending":
                recommendation = "张力持续上升，建议在高峰后安排舒缓章节";
                break;
            case "descending":
                recommendation = "张力持续下降，可能流失读者，建议加入冲突或悬念";
                break;
            case "flat":
                recommendation = "张力过于平稳，建议增加起伏提升阅读兴趣";
                break;
            case "wave":
                recommendation = "张力呈波浪式，节奏把控良好";
                break;
        }
        return {
            points,
            averageTension,
            volatility,
            pattern,
            dropOffPoints,
            peakPoints,
            recommendation,
        };
    }
    /** Close the database connection. */
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=pace-director.js.map