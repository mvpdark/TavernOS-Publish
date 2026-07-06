import N from"better-sqlite3";import{dirname as M}from"node:path";import{mkdirSync as A}from"node:fs";import{SCENE_IMPULSE as O}from"../scene/types.js";function s(n,e,t){return Math.max(e,Math.min(t,n))}function m(n){return Math.max(.1,1-Math.abs(n)/120)}function b(n,e){return Math.abs(n)>80&&e!==0&&Math.sign(e)!==Math.sign(n)?e*.5:e}function S(n){let e=2166136261;for(let t=0;t<n.length;t++)e^=n.charCodeAt(t),e=e*16777619>>>0;return e}function g(n,e){return((n>>>e*8&255)/255-.5)*3}const L=30,I=-30;function R(n,e,t,i){const o=e>L,r=e<I,c=i<I,a=i>L,l=n<I,u=n>L,f=t<I,d=t>L;return o&&c?t>=0?"furious":"fearful":l&&f?"withdrawn":u&&d?"smitten":o&&a?"defiant":r&&f?"serene":u&&r?"tender":o&&l?"wounded":"composed"}export class MoodEngine{db;constructor(e){A(M(e),{recursive:!0}),this.db=new N(e),this.db.pragma("journal_mode = WAL"),this.initSchema()}initSchema(){this.db.exec(`
      CREATE TABLE IF NOT EXISTS mood_vectors (
        character_id   TEXT PRIMARY KEY,
        affection      REAL NOT NULL,
        tension        REAL NOT NULL,
        energy         REAL NOT NULL,
        control        REAL NOT NULL,
        label          TEXT NOT NULL,
        locked         INTEGER NOT NULL DEFAULT 0,
        updated_at     TEXT NOT NULL,
        chapter_index  INTEGER NOT NULL DEFAULT 0
      );
    `)}mapRow(e){return{characterId:e.character_id,affection:e.affection,tension:e.tension,energy:e.energy,control:e.control,label:e.label,locked:e.locked!==0,updatedAt:e.updated_at,chapterIndex:e.chapter_index}}upsert(e){this.db.prepare(`
      INSERT INTO mood_vectors
        (character_id, affection, tension, energy, control, label, locked, updated_at, chapter_index)
      VALUES
        (@character_id, @affection, @tension, @energy, @control, @label, @locked, @updated_at, @chapter_index)
      ON CONFLICT(character_id) DO UPDATE SET
        affection     = @affection,
        tension       = @tension,
        energy        = @energy,
        control       = @control,
        label         = @label,
        locked        = @locked,
        updated_at    = @updated_at,
        chapter_index = @chapter_index
    `).run({character_id:e.characterId,affection:e.affection,tension:e.tension,energy:e.energy,control:e.control,label:e.label,locked:e.locked?1:0,updated_at:e.updatedAt,chapter_index:e.chapterIndex})}defaultVector(e){return{characterId:e,affection:0,tension:0,energy:0,control:0,label:"composed",locked:!1,updatedAt:new Date().toISOString(),chapterIndex:0}}shift(e){const t=this.getMood(e.characterId)??this.defaultVector(e.characterId),i=O[e.sceneType];if(!i)throw new Error(`Invalid sceneType: ${e.sceneType}`);let o=i.affection*e.sceneIntensity,r=i.tension*e.sceneIntensity,c=i.energy*e.sceneIntensity,a=i.control*e.sceneIntensity;const l=1+e.bondModifier;o*=l,r*=l,c*=l,a*=l,o*=m(t.affection),r*=m(t.tension),c*=m(t.energy),a*=m(t.control),o=s(o,-10,10),r=s(r,-10,10),c=s(c,-10,10),a=s(a,-10,10),o>0&&(o*=1-t.tension*.01),o=b(t.affection,o),r=b(t.tension,r),c=b(t.energy,c),a=b(t.control,a);const u=e.bondModifier>.15?"warm":e.bondModifier<-.15?"hostile":"neutral";u==="warm"?o*=1.15:u==="hostile"&&(o*=.7);const f=.03;let d=t.affection*(1-f)+o,h=t.tension*(1-f)+r,p=t.energy*(1-f)+c,E=t.control*(1-f)+a;const T=S(`${e.characterId}:${e.chapterIndex}:${e.sceneIndex}`);d+=g(T,0),h+=g(T,1),p+=g(T,2),E+=g(T,3),d=s(d,-100,100),h=s(h,-100,100),p=s(p,-100,100),E=s(E,-100,100);const _=R(d,h,p,E),x=Math.abs(d)>80||Math.abs(h)>80||Math.abs(p)>80||Math.abs(E)>80,y={characterId:e.characterId,affection:d,tension:h,energy:p,control:E,label:_,locked:x,updatedAt:new Date().toISOString(),chapterIndex:e.chapterIndex};return this.upsert(y),y}getMood(e){const t=this.db.prepare("SELECT * FROM mood_vectors WHERE character_id = ?").get(e);return t?this.mapRow(t):void 0}getAllMoods(){return this.db.prepare("SELECT * FROM mood_vectors").all().map(t=>this.mapRow(t))}close(){this.db.close()}}
