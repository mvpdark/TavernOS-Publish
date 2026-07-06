import f from"better-sqlite3";import{dirname as m}from"node:path";import{mkdirSync as T}from"node:fs";import{randomUUID as l}from"node:crypto";const N=["furious","fearful","wounded","withdrawn"],L=["tender","serene","smitten"];function y(d,e,r){return Math.max(e,Math.min(r,d))}export class EpiphanyDetector{db;constructor(e){T(m(e),{recursive:!0}),this.db=new f(e),this.db.pragma("journal_mode = WAL"),this.initSchema()}initSchema(){this.db.exec(`
      CREATE TABLE IF NOT EXISTS epiphany_signals (
        id            TEXT PRIMARY KEY,
        character_id  TEXT NOT NULL,
        chapter_index INTEGER NOT NULL,
        type          TEXT NOT NULL,
        intensity     REAL NOT NULL,
        trigger_scene TEXT NOT NULL,
        before_mood   TEXT NOT NULL,
        after_mood    TEXT NOT NULL,
        description   TEXT NOT NULL,
        created_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_epiphany_character ON epiphany_signals(character_id);
      CREATE INDEX IF NOT EXISTS idx_epiphany_chapter  ON epiphany_signals(chapter_index);
    `)}mapRow(e){return{id:e.id,characterId:e.character_id,chapterIndex:e.chapter_index,type:e.type,intensity:e.intensity,triggerScene:e.trigger_scene,beforeMood:e.before_mood,afterMood:e.after_mood,description:e.description,createdAt:e.created_at}}insertOne(e){this.db.prepare(`
      INSERT INTO epiphany_signals
        (id, character_id, chapter_index, type, intensity,
         trigger_scene, before_mood, after_mood, description, created_at)
      VALUES
        (@id, @character_id, @chapter_index, @type, @intensity,
         @trigger_scene, @before_mood, @after_mood, @description, @created_at)
    `).run({id:e.id,character_id:e.characterId,chapter_index:e.chapterIndex,type:e.type,intensity:e.intensity,trigger_scene:e.triggerScene,before_mood:e.beforeMood,after_mood:e.afterMood,description:e.description,created_at:e.createdAt})}createSignal(e,r,t,i,o,c,s,n){const a={id:l(),characterId:e,chapterIndex:r,type:t,intensity:y(i,0,1),triggerScene:o,beforeMood:c,afterMood:s,description:n,createdAt:new Date().toISOString()};return this.insertOne(a),a}check(e,r,t,i,o,c,s){if(!t)return null;const n=t.label,a=r.label;if(N.includes(n)&&L.includes(a)&&o>.7)return this.createSignal(e,c,"emotional_breakthrough",o,s,n,a,"\u60C5\u611F\u7A81\u7834\uFF1A\u4ECE\u8D1F\u9762\u60C5\u7EEA\u4E2D\u6323\u8131\uFF0C\u8FCE\u6765\u79EF\u6781\u8F6C\u53D8");const _=Math.abs(r.control-t.control);if(_>30&&i==="revelation")return this.createSignal(e,c,"perspective_shift",_/100,s,n,a,"\u89C6\u89D2\u8F6C\u53D8\uFF1A\u8BA4\u77E5\u683C\u5C40\u53D1\u751F\u91CD\u5927\u8C03\u6574");if(t.energy<-20&&r.energy>30&&(i==="conflict"||i==="tragedy")){const E=r.energy-t.energy;return this.createSignal(e,c,"resolve_awakened",E/100,s,n,a,"\u51B3\u5FC3\u89C9\u9192\uFF1A\u4ECE\u4F4E\u6C89\u4E2D\u632F\u4F5C\uFF0C\u71C3\u8D77\u6218\u6597\u610F\u5FD7")}const h=Math.abs(r.affection-t.affection);if(h>25&&(i==="reunion"||i==="tenderness"))return this.createSignal(e,c,"bond_catalyst",h/100,s,n,a,"\u7F81\u7ECA\u50AC\u5316\uFF1A\u60C5\u611F\u8FDE\u63A5\u663E\u8457\u52A0\u6DF1");const p=t.tension-r.tension;return p>35&&(i==="tenderness"||i==="reunion")?this.createSignal(e,c,"trauma_release",p/100,s,n,a,"\u521B\u4F24\u91CA\u653E\uFF1A\u957F\u671F\u7D27\u7EF7\u7684\u795E\u7ECF\u7EC8\u4E8E\u677E\u5F1B"):null}getByCharacter(e){return this.db.prepare("SELECT * FROM epiphany_signals WHERE character_id = ? ORDER BY chapter_index ASC").all(e).map(t=>this.mapRow(t))}getByChapter(e){return this.db.prepare("SELECT * FROM epiphany_signals WHERE chapter_index = ? ORDER BY created_at ASC").all(e).map(t=>this.mapRow(t))}close(){this.db.close()}}
