import h from"better-sqlite3";import{dirname as l}from"node:path";import{mkdirSync as d}from"node:fs";import{randomUUID as _}from"node:crypto";import{TimelineAnchorSchema as f}from"./types.js";const E=f.omit({id:!0,createdAt:!0}),T=new Set(["\u7684\u4E8B","\u7684\u4E00","\u4E86\u4E00","\u662F\u4E00","\u5728\u4E00","\u4ED6\u4E00","\u5979\u4E00","\u4E0D\u4E00","\u8FD9\u4E00","\u90A3\u4E00","\u5C31\u662F","\u4E0D\u662F","\u6CA1\u6709","\u53EF\u4EE5","\u8FD9\u6837","\u90A3\u6837","\u600E\u4E48","\u4EC0\u4E48","\u56E0\u4E3A","\u6240\u4EE5","\u5982\u679C","\u867D\u7136","\u4F46\u662F","\u53EF\u662F","\u4E0D\u8FC7","\u8FD8\u662F","\u5DF2\u7ECF","\u7136\u540E","\u63A5\u7740","\u968F\u540E","\u540E\u6765","\u7EC8\u4E8E","\u6700\u540E","\u9996\u5148","\u7A81\u7136","\u5FFD\u7136","\u6B64\u523B","\u6B64\u65F6","\u73B0\u5728","\u4EE5\u524D","\u4EE5\u540E","\u4E4B\u524D","\u4E4B\u540E","\u4E4B\u4E2D","\u4E4B\u95F4","\u4E4B\u4E0A","\u4E4B\u4E0B","\u5230\u4E86","\u8D70\u4E86","\u6765\u4E86","\u53BB\u4E86","\u56DE\u4E86","\u770B\u4E86","\u60F3\u4E86","\u8BF4\u4E86","\u505A\u4E86","\u6210\u4E86","\u53D8\u4E86","\u65F6\u5019","\u5730\u65B9","\u4E1C\u897F","\u4E8B\u60C5","\u4E00\u4E2A","\u4E00\u6837","\u4E00\u4E0B","\u4E00\u8D77","\u4E00\u5B9A","\u4E00\u70B9","\u8FD9\u4E2A","\u90A3\u4E2A","\u5C31\u5728","\u5C31\u8981","\u5C31\u4F1A","\u8FD8\u6709","\u8FD8\u5728","\u8FD8\u8981"]);export class TimelineSense{db;closed=!1;constructor(e){const t=l(e);d(t,{recursive:!0}),this.db=new h(e),this.db.pragma("journal_mode = WAL"),this.db.pragma("foreign_keys = ON"),this.initSchema()}initSchema(){this.db.exec(`
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
    `)}mapAnchorRow(e){return{id:e.id,chapterIndex:e.chapter_index,label:e.label,inStoryTime:e.in_story_time??void 0,characters:JSON.parse(e.characters),location:e.location??void 0,anchorType:e.anchor_type,significance:e.significance,createdAt:e.created_at}}mapAppearanceRow(e){return{character:e.character,firstChapter:e.first_chapter,lastChapter:e.last_chapter,totalChapters:e.total_chapters,gapChapters:e.gap_chapters,chapterList:JSON.parse(e.chapter_list)}}addAnchor(e){const t=E.parse(e),c=_(),n=new Date().toISOString();return this.db.prepare(`
        INSERT INTO timeline_anchors
          (id, chapter_index, label, in_story_time, characters, location,
           anchor_type, significance, created_at)
        VALUES
          (@id, @chapter_index, @label, @in_story_time, @characters, @location,
           @anchor_type, @significance, @created_at)
      `).run({id:c,chapter_index:t.chapterIndex,label:t.label,in_story_time:t.inStoryTime??null,characters:JSON.stringify(t.characters),location:t.location??null,anchor_type:t.anchorType,significance:t.significance,created_at:n}),{...t,id:c,createdAt:n}}getRecentAnchors(e){return this.db.prepare(`
        SELECT * FROM timeline_anchors
        ORDER BY chapter_index DESC, created_at DESC
        LIMIT ?
      `).all(e).map(c=>this.mapAnchorRow(c))}getAnchorsByChapter(e,t){return this.db.prepare(`
        SELECT * FROM timeline_anchors
        WHERE chapter_index BETWEEN ? AND ?
        ORDER BY chapter_index ASC, created_at ASC
      `).all(e,t).map(n=>this.mapAnchorRow(n))}recordAppearance(e,t){const c=this.db.prepare("SELECT * FROM character_appearances WHERE character = ?").get(e),n=new Date().toISOString();if(c){const s=JSON.parse(c.chapter_list);if(s.includes(t))return;const i=t-c.last_chapter;s.push(t),this.db.prepare(`
          UPDATE character_appearances
          SET last_chapter   = @last_chapter,
              total_chapters = @total_chapters,
              gap_chapters   = @gap_chapters,
              chapter_list   = @chapter_list,
              updated_at     = @updated_at
          WHERE character    = @character
        `).run({character:e,last_chapter:t,total_chapters:c.total_chapters+1,gap_chapters:i,chapter_list:JSON.stringify(s),updated_at:n})}else this.db.prepare(`
          INSERT INTO character_appearances
            (character, first_chapter, last_chapter, total_chapters,
             gap_chapters, chapter_list, updated_at)
          VALUES
            (@character, @first_chapter, @last_chapter, @total_chapters,
             @gap_chapters, @chapter_list, @updated_at)
        `).run({character:e,first_chapter:t,last_chapter:t,total_chapters:1,gap_chapters:0,chapter_list:JSON.stringify([t]),updated_at:n})}getAppearance(e){const t=this.db.prepare("SELECT * FROM character_appearances WHERE character = ?").get(e);return t?this.mapAppearanceRow(t):void 0}getTemporalContext(e){const t=this.getRecentAnchors(5),c=this.detectRecurringPatterns(),n=this.getChapterDensity(e),s=new Map,i=this.getAllAppearances();for(const a of i)s.set(a.character,Math.max(0,e-a.lastChapter));return{currentChapter:e,recentAnchors:t,recurringPatterns:c,timeSinceLastAppearance:s,chapterDensity:n}}getChapterDensity(e){const t=this.db.prepare("SELECT significance FROM timeline_anchors WHERE chapter_index = ?").all(e);if(t.length===0)return 0;const c=Math.min(.6,t.length*.15),n=t.reduce((i,a)=>i+a.significance,0),s=Math.min(.4,n*.1);return Math.min(1,c+s)}detectRecurringPatterns(){const e=this.getAllAnchors(),t=[],c=new Map;for(const a of e){const r=[...a.characters].sort();for(let o=0;o<r.length;o++)for(let u=o+1;u<r.length;u++){const p=`${r[o]} + ${r[u]}`;c.set(p,(c.get(p)??0)+1)}}for(const[a,r]of c)r>=2&&t.push(`\u89D2\u8272\u5171\u73B0: ${a} (${r}\u6B21)`);const n=new Map;for(const a of e)a.location&&n.set(a.location,(n.get(a.location)??0)+1);for(const[a,r]of n)r>=2&&t.push(`\u91CD\u590D\u5730\u70B9: ${a} (${r}\u6B21)`);const s=new Map;for(const a of e)s.set(a.anchorType,(s.get(a.anchorType)??0)+1);for(const[a,r]of s)r>=3&&t.push(`\u4E8B\u4EF6\u7C7B\u578B\u805A\u96C6: ${a} (${r}\u6B21)`);const i=new Map;for(const a of e){const r=a.label,o=new Set;for(let u=0;u<=r.length-2;u++){const p=r.slice(u,u+2);/^[\u4e00-\u9fff]{2}$/.test(p)&&!T.has(p)&&o.add(p)}for(const u of o)i.set(u,(i.get(u)??0)+1)}for(const[a,r]of i)r>=2&&t.push(`\u91CD\u590D\u4E3B\u9898: ${a} (${r}\u6B21)`);return t}close(){this.closed||(this.closed=!0,this.db.close())}getAllAnchors(){return this.db.prepare("SELECT * FROM timeline_anchors ORDER BY chapter_index ASC, created_at ASC").all().map(t=>this.mapAnchorRow(t))}getAllAppearances(){return this.db.prepare("SELECT * FROM character_appearances ORDER BY last_chapter DESC").all().map(t=>this.mapAppearanceRow(t))}}
