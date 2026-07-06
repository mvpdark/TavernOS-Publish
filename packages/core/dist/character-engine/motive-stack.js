import a from"better-sqlite3";import{dirname as s}from"node:path";import{mkdirSync as i}from"node:fs";import{randomUUID as d}from"node:crypto";export class MotiveStack{db;constructor(t){i(s(t),{recursive:!0}),this.db=new a(t),this.db.pragma("journal_mode = WAL"),this.initSchema()}initSchema(){this.db.exec(`
      CREATE TABLE IF NOT EXISTS motives (
        id                 TEXT PRIMARY KEY,
        character_id       TEXT NOT NULL,
        description        TEXT NOT NULL,
        priority           REAL NOT NULL DEFAULT 50,
        status             TEXT NOT NULL DEFAULT 'active',
        source             TEXT NOT NULL DEFAULT 'internal',
        chapter_origin     INTEGER NOT NULL DEFAULT 0,
        chapter_resolved   INTEGER,
        related_characters TEXT NOT NULL DEFAULT '[]',
        created_at         TEXT NOT NULL,
        updated_at         TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_motives_character ON motives(character_id);
      CREATE INDEX IF NOT EXISTS idx_motives_status   ON motives(character_id, status);
    `)}mapRow(t){return{id:t.id,characterId:t.character_id,description:t.description,priority:t.priority,status:t.status,source:t.source,chapterOrigin:t.chapter_origin,chapterResolved:t.chapter_resolved??void 0,relatedCharacters:JSON.parse(t.related_characters),createdAt:t.created_at,updatedAt:t.updated_at}}insertOne(t){this.db.prepare(`
      INSERT INTO motives
        (id, character_id, description, priority, status, source,
         chapter_origin, chapter_resolved, related_characters, created_at, updated_at)
      VALUES
        (@id, @character_id, @description, @priority, @status, @source,
         @chapter_origin, @chapter_resolved, @related_characters, @created_at, @updated_at)
    `).run({id:t.id,character_id:t.characterId,description:t.description,priority:t.priority,status:t.status,source:t.source,chapter_origin:t.chapterOrigin,chapter_resolved:t.chapterResolved??null,related_characters:JSON.stringify(t.relatedCharacters),created_at:t.createdAt,updated_at:t.updatedAt})}push(t){const e=new Date().toISOString(),r={...t,status:t.status??"active",source:t.source??"internal",relatedCharacters:t.relatedCharacters??[],id:d(),createdAt:e,updatedAt:e};return this.insertOne(r),r}resolve(t,e){this.db.prepare(`UPDATE motives
         SET status = 'satisfied', chapter_resolved = @chapter_resolved, updated_at = @updated_at
       WHERE id = @id`).run({id:t,chapter_resolved:e,updated_at:new Date().toISOString()})}abandon(t){this.db.prepare("UPDATE motives SET status = 'abandoned', updated_at = @updated_at WHERE id = @id").run({id:t,updated_at:new Date().toISOString()})}suppress(t){this.db.prepare("UPDATE motives SET status = 'suppressed', updated_at = @updated_at WHERE id = @id").run({id:t,updated_at:new Date().toISOString()})}getActive(t){return this.db.prepare(`SELECT * FROM motives
        WHERE character_id = ? AND status = 'active'
        ORDER BY priority DESC`).all(t).map(r=>this.mapRow(r))}getAll(t){return this.db.prepare(`SELECT * FROM motives
        WHERE character_id = ?
        ORDER BY priority DESC`).all(t).map(r=>this.mapRow(r))}getTopMotive(t){const e=this.db.prepare(`SELECT * FROM motives
        WHERE character_id = ? AND status = 'active'
        ORDER BY priority DESC
        LIMIT 1`).all(t);return e.length>0?this.mapRow(e[0]):void 0}close(){this.db.close()}}
