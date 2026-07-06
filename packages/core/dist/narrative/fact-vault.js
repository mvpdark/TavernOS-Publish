import u from"better-sqlite3";import{join as E}from"node:path";import{mkdirSync as m,writeFileSync as N}from"node:fs";import{randomUUID as y}from"node:crypto";import{metaOf as g}from"./story-domains.js";const R=.6,T=20,h=70;export class FactVault{db;dataDir;jsonPath;constructor(t){this.dataDir=E(t,".."),m(this.dataDir,{recursive:!0}),this.jsonPath=E(this.dataDir,"story-facts.json"),this.db=new u(t),this.db.pragma("journal_mode = WAL"),this.db.pragma("foreign_keys = ON"),this.initSchema()}initSchema(){this.db.exec(`
      CREATE TABLE IF NOT EXISTS story_facts (
        id                  TEXT PRIMARY KEY,
        domain              TEXT NOT NULL,
        category            TEXT NOT NULL,
        label               TEXT NOT NULL,
        content             TEXT NOT NULL,
        weight              REAL NOT NULL DEFAULT 50,
        certainty           REAL NOT NULL DEFAULT 0.7,
        tier                TEXT NOT NULL DEFAULT 'ambient',
        status              TEXT NOT NULL DEFAULT 'active',
        triggers            TEXT NOT NULL DEFAULT '[]',
        emotional_weight    REAL NOT NULL DEFAULT 0,
        narrative_relevance REAL NOT NULL DEFAULT 0.5,
        chapter_origin      INTEGER NOT NULL DEFAULT 0,
        derived_from        TEXT,
        created_at          TEXT NOT NULL,
        updated_at          TEXT NOT NULL,
        access_count        INTEGER NOT NULL DEFAULT 0,
        last_access_at      TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_facts_domain   ON story_facts(domain);
      CREATE INDEX IF NOT EXISTS idx_facts_category ON story_facts(category);
      CREATE INDEX IF NOT EXISTS idx_facts_tier     ON story_facts(tier) WHERE status = 'active';
      CREATE INDEX IF NOT EXISTS idx_facts_status   ON story_facts(status);

      -- FTS5 virtual table for full-text search.
      -- trigram tokenizer: extracts overlapping 3-character sequences,
      -- which works well for CJK text (each char = 1 codepoint, so a 3-char
      -- trigram captures meaningful Chinese substrings).
      CREATE VIRTUAL TABLE IF NOT EXISTS story_facts_fts USING fts5(
        label, content,
        content='story_facts',
        content_rowid='rowid',
        tokenize='trigram'
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON story_facts BEGIN
        INSERT INTO story_facts_fts(rowid, label, content)
        VALUES (new.rowid, new.label, new.content);
      END;
      CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON story_facts BEGIN
        INSERT INTO story_facts_fts(story_facts_fts, rowid, label, content)
        VALUES ('delete', old.rowid, old.label, old.content);
      END;
      CREATE TRIGGER IF NOT EXISTS facts_au AFTER UPDATE ON story_facts BEGIN
        INSERT INTO story_facts_fts(story_facts_fts, rowid, label, content)
        VALUES ('delete', old.rowid, old.label, old.content);
        INSERT INTO story_facts_fts(rowid, label, content)
        VALUES (new.rowid, new.label, new.content);
      END;
    `)}mapRow(t){return{id:t.id,domain:t.domain,category:t.category,label:t.label,content:t.content,weight:t.weight,certainty:t.certainty,tier:t.tier,status:t.status,triggers:JSON.parse(t.triggers),emotionalWeight:t.emotional_weight,narrativeRelevance:t.narrative_relevance,chapterOrigin:t.chapter_origin,derivedFrom:t.derived_from?JSON.parse(t.derived_from):void 0,createdAt:t.created_at,updatedAt:t.updated_at,accessCount:t.access_count,lastAccessAt:t.last_access_at??void 0}}addFact(t){const e=new Date().toISOString(),s=this.findSimilar(t.category,t.label,t.content);if(s){const o={weight:Math.max(s.weight,t.weight??50)+2,certainty:Math.max(s.certainty,t.certainty??.7),triggers:[...new Set([...s.triggers,...t.triggers??[]])],content:t.content.length>s.content.length?t.content:s.content,emotionalWeight:(t.emotionalWeight??0)!==0?t.emotionalWeight:s.emotionalWeight,updatedAt:e};o.weight>=h&&(o.tier="pinned"),this.updateOne(s.id,o);const r=this.getById(s.id);return this.enforcePinnedLimit(),{fact:r,isNew:!1,mergedWith:s.id}}const a=g(t.category),i=t.weight??a.defaultWeight,n={id:y(),domain:t.domain,category:t.category,label:t.label,content:t.content,weight:i,certainty:t.certainty??a.defaultCertainty,tier:i>=h?"pinned":t.tier??"ambient",status:t.status??"active",triggers:t.triggers??[],emotionalWeight:t.emotionalWeight??0,narrativeRelevance:t.narrativeRelevance??a.narrativeRelevance,chapterOrigin:t.chapterOrigin??0,derivedFrom:t.derivedFrom,createdAt:e,updatedAt:e,accessCount:0};return this.insertOne(n),this.enforcePinnedLimit(),{fact:n,isNew:!0}}getById(t){const e=this.db.prepare("SELECT * FROM story_facts WHERE id = ?").get(t);return e?this.mapRow(e):void 0}getActive(){return this.db.prepare("SELECT * FROM story_facts WHERE status = 'active'").all().map(e=>this.mapRow(e))}getPinned(){return this.db.prepare("SELECT * FROM story_facts WHERE status = 'active' AND tier = 'pinned' ORDER BY weight DESC").all().map(e=>this.mapRow(e))}searchByTriggers(t){const e=t.toLowerCase();return this.getActive().filter(a=>a.triggers.some(i=>e.includes(i.toLowerCase())))}searchByFts(t,e=10){const s=t.replace(/["'*]/g,"").trim();if(s.length<3)return[];const a=[];for(let r=0;r<=s.length-3;r++)a.push(`"${s.slice(r,r+3)}"`);const n=[...new Set(a)].join(" OR ");return this.db.prepare(`
      SELECT f.* FROM story_facts f
      JOIN story_facts_fts fts ON f.rowid = fts.rowid
      WHERE story_facts_fts MATCH ? AND f.status = 'active'
      ORDER BY rank
      LIMIT ?
    `).all(n,e).map(r=>this.mapRow(r))}getByDomain(t){return this.db.prepare("SELECT * FROM story_facts WHERE domain = ? AND status = 'active' ORDER BY weight DESC").all(t).map(s=>this.mapRow(s))}markAccessed(t){this.db.prepare("UPDATE story_facts SET access_count = access_count + 1, last_access_at = ? WHERE id = ?").run(new Date().toISOString(),t)}markAccessedBatch(t){if(t.length===0)return;const e=t.map(()=>"?").join(", "),s=new Date().toISOString();this.db.prepare(`UPDATE story_facts SET access_count = access_count + 1, last_access_at = ? WHERE id IN (${e})`).run(s,...t)}archive(t){this.db.prepare("UPDATE story_facts SET status = 'archived' WHERE id = ?").run(t)}void(t){this.db.prepare("UPDATE story_facts SET status = 'voided' WHERE id = ?").run(t)}scoreRelevance(t,e){const s=g(t.category),a=Math.max(0,e-t.chapterOrigin),i=Math.exp(-s.decayLambda*a);let n=t.weight*i*t.narrativeRelevance*(1+Math.abs(t.emotionalWeight)*.5);return e-t.chapterOrigin<=3&&(n*=1.5),n}exportJson(){const e=this.db.prepare("SELECT * FROM story_facts ORDER BY created_at").all().map(s=>this.mapRow(s));return N(this.jsonPath,JSON.stringify(e,null,2),"utf-8"),e}close(){try{this.exportJson()}catch{}finally{this.db.close()}}insertOne(t){this.db.prepare(`
      INSERT INTO story_facts
        (id, domain, category, label, content, weight, certainty, tier, status,
         triggers, emotional_weight, narrative_relevance, chapter_origin,
         derived_from, created_at, updated_at, access_count, last_access_at)
      VALUES
        (@id, @domain, @category, @label, @content, @weight, @certainty, @tier, @status,
         @triggers, @emotional_weight, @narrative_relevance, @chapter_origin,
         @derived_from, @created_at, @updated_at, @access_count, @last_access_at)
    `).run({id:t.id,domain:t.domain,category:t.category,label:t.label,content:t.content,weight:t.weight,certainty:t.certainty,tier:t.tier,status:t.status,triggers:JSON.stringify(t.triggers),emotional_weight:t.emotionalWeight,narrative_relevance:t.narrativeRelevance,chapter_origin:t.chapterOrigin,derived_from:t.derivedFrom?JSON.stringify(t.derivedFrom):null,created_at:t.createdAt,updated_at:t.updatedAt,access_count:t.accessCount,last_access_at:t.lastAccessAt??null})}updateOne(t,e){const s=[],a={id:t};e.weight!==void 0&&(s.push("weight = @weight"),a.weight=e.weight),e.certainty!==void 0&&(s.push("certainty = @certainty"),a.certainty=e.certainty),e.tier!==void 0&&(s.push("tier = @tier"),a.tier=e.tier),e.triggers!==void 0&&(s.push("triggers = @triggers"),a.triggers=JSON.stringify(e.triggers)),e.content!==void 0&&(s.push("content = @content"),a.content=e.content),e.emotionalWeight!==void 0&&(s.push("emotional_weight = @emotional_weight"),a.emotional_weight=e.emotionalWeight),e.updatedAt!==void 0&&(s.push("updated_at = @updated_at"),a.updated_at=e.updatedAt),e.status!==void 0&&(s.push("status = @status"),a.status=e.status),s.length!==0&&this.db.prepare(`UPDATE story_facts SET ${s.join(", ")} WHERE id = @id`).run(a)}findSimilar(t,e,s){const a=this.db.prepare("SELECT * FROM story_facts WHERE category = ? AND label = ? AND status = 'active' LIMIT 1").get(t,e);if(a)return this.mapRow(a);const i=this.db.prepare("SELECT * FROM story_facts WHERE category = ? AND status = 'active' LIMIT 200").all(t),n=_(e+s);let o=null;for(const r of i){const d=this.mapRow(r),f=_(d.label+d.content),l=O(n,f);l>=R&&(!o||l>o.sim)&&(o={fact:d,sim:l})}return o?.fact}enforcePinnedLimit(){const t=this.getPinned();if(t.length<=T)return;const e=t.sort((s,a)=>s.weight-a.weight).slice(0,t.length-T);for(const s of e)this.updateOne(s.id,{tier:"ambient"})}}function _(c){return new Set(c.toLowerCase().split(""))}function O(c,t){if(c.size===0&&t.size===0)return 0;let e=0;for(const s of c)t.has(s)&&e++;return e/(c.size+t.size-e)}
