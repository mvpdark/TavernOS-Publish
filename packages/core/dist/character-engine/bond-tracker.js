import p from"better-sqlite3";import{dirname as d}from"node:path";import{mkdirSync as u}from"node:fs";function a(s,t,r){return Math.max(t,Math.min(r,s))}function h(s,t){const[r,n]=[s,t].sort();return`${r}\0${n}`}export class BondTracker{db;constructor(t){u(d(t),{recursive:!0}),this.db=new p(t),this.db.pragma("journal_mode = WAL"),this.initSchema()}initSchema(){this.db.exec(`
      CREATE TABLE IF NOT EXISTS bond_states (
        pair_key                 TEXT PRIMARY KEY,
        phase                    TEXT NOT NULL DEFAULT 'stranger',
        trust                    REAL NOT NULL DEFAULT 30,
        tensions                 REAL NOT NULL DEFAULT 0,
        warmth                   REAL NOT NULL DEFAULT 0,
        mood                     TEXT NOT NULL DEFAULT 'neutral',
        positive_streak          INTEGER NOT NULL DEFAULT 0,
        shared_scenes            INTEGER NOT NULL DEFAULT 0,
        last_interaction_chapter INTEGER NOT NULL DEFAULT 0,
        history                  TEXT NOT NULL DEFAULT '[]',
        updated_at               TEXT NOT NULL
      );
    `)}mapRow(t){return{pairKey:t.pair_key,phase:t.phase,trust:t.trust,tensions:t.tensions,warmth:t.warmth,mood:t.mood,positiveStreak:t.positive_streak,sharedScenes:t.shared_scenes,lastInteractionChapter:t.last_interaction_chapter,history:JSON.parse(t.history),updatedAt:t.updated_at}}upsert(t){this.db.prepare(`
      INSERT INTO bond_states
        (pair_key, phase, trust, tensions, warmth, mood,
         positive_streak, shared_scenes, last_interaction_chapter, history, updated_at)
      VALUES
        (@pair_key, @phase, @trust, @tensions, @warmth, @mood,
         @positive_streak, @shared_scenes, @last_interaction_chapter, @history, @updated_at)
      ON CONFLICT(pair_key) DO UPDATE SET
        phase                    = @phase,
        trust                    = @trust,
        tensions                 = @tensions,
        warmth                   = @warmth,
        mood                     = @mood,
        positive_streak          = @positive_streak,
        shared_scenes            = @shared_scenes,
        last_interaction_chapter = @last_interaction_chapter,
        history                  = @history,
        updated_at               = @updated_at
    `).run({pair_key:t.pairKey,phase:t.phase,trust:t.trust,tensions:t.tensions,warmth:t.warmth,mood:t.mood,positive_streak:t.positiveStreak,shared_scenes:t.sharedScenes,last_interaction_chapter:t.lastInteractionChapter,history:JSON.stringify(t.history),updated_at:t.updatedAt})}initialState(t){return{pairKey:t,phase:"stranger",trust:30,tensions:0,warmth:0,mood:"neutral",positiveStreak:0,sharedScenes:0,lastInteractionChapter:0,history:[],updatedAt:new Date().toISOString()}}computeNextPhase(t){const r=t.phase;if(r==="enemy")return t.tensions<50?"rival":"enemy";if(r==="rival")return t.tensions>=70?"enemy":t.trust>=60&&t.tensions<30?"ally":"rival";if(t.tensions>=70)return"enemy";if(t.tensions>=50&&r!=="lover"&&r!=="family")return"rival";if(r==="mentor"||r==="family")return r;switch(r){case"stranger":return t.trust>=20?"acquaintance":"stranger";case"acquaintance":return t.trust>=40&&t.positiveStreak>=3?"ally":"acquaintance";case"ally":return t.trust>=65&&t.positiveStreak>=5?"confidant":"ally";case"confidant":return t.trust>=80&&t.warmth>=.5&&t.positiveStreak>=7?"lover":"confidant";case"lover":return"lover";default:return r}}recordInteraction(t){const r=h(t.characterA,t.characterB);let e=this.getBondByPairKey(r)??this.initialState(r);t.isPositive?(e.trust+=5+t.intensity*10,e.tensions-=2+t.intensity*5,e.warmth=a(e.warmth+.1,-1,1),e.positiveStreak++):(e.trust-=5+t.intensity*15,e.tensions+=3+t.intensity*8,e.warmth=a(e.warmth-.15,-1,1),e.positiveStreak=0),e.trust=a(e.trust,0,100),e.tensions=a(e.tensions,0,100),e.mood=e.warmth>.3?"warm":e.warmth<-.3?"hostile":"neutral",e.sharedScenes++,e.lastInteractionChapter=t.chapterIndex;const o=e.phase,i=this.computeNextPhase(e);return i!==o&&(e.history.push({chapter:t.chapterIndex,fromPhase:o,toPhase:i,reason:t.description}),e.phase=i),e.updatedAt=new Date().toISOString(),this.upsert(e),e}getBondByPairKey(t){const r=this.db.prepare("SELECT * FROM bond_states WHERE pair_key = ?").get(t);return r?this.mapRow(r):void 0}getBond(t,r){return this.getBondByPairKey(h(t,r))}getAllBonds(){return this.db.prepare("SELECT * FROM bond_states").all().map(r=>this.mapRow(r))}getBondsForCharacter(t){return this.getAllBonds().filter(r=>r.pairKey.split("\0").includes(t))}close(){this.db.close()}}
