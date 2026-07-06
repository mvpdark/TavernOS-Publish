import D from"better-sqlite3";import{dirname as S}from"node:path";import{mkdirSync as C}from"node:fs";import{analyzeHookDensity as U}from"../audit/hook-density.js";const w={conflict:1.5,tragedy:1.4,action:1.3,separation:1.2,revelation:1.1},F=["comedy","tenderness","transition"];function m(O,e,o){return Math.max(e,Math.min(o,O))}export class PaceDirector{db;constructor(e){C(S(e),{recursive:!0}),this.db=new D(e),this.db.pragma("journal_mode = WAL"),this.initSchema()}initSchema(){this.db.exec(`
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
    `)}mapRow(e){return{chapterIndex:e.chapter_index,tension:e.tension,relaxation:e.relaxation,rhythm:e.rhythm,sceneCount:e.scene_count,dialogueRatio:e.dialogue_ratio,actionRatio:e.action_ratio,wordCount:e.word_count,tensionTrend:e.tension_trend,recommendation:e.recommendation}}upsert(e){this.db.prepare(`
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
    `).run({chapter_index:e.chapterIndex,tension:e.tension,relaxation:e.relaxation,rhythm:e.rhythm,scene_count:e.sceneCount,dialogue_ratio:e.dialogueRatio,action_ratio:e.actionRatio,word_count:e.wordCount,tension_trend:e.tensionTrend,recommendation:e.recommendation})}mapRetentionRow(e){return{chapterIndex:e.chapter_index,hookDensity:e.hook_density,coolPointDensity:e.cool_point_density,readerFatigue:e.reader_fatigue,retentionPower:e.retention_power,engagementScore:e.engagement_score,cliffhangerStrength:e.cliffhanger_strength,pacingBalance:e.pacing_balance,recommendation:e.recommendation}}upsertRetention(e){this.db.prepare(`
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
    `).run({chapter_index:e.chapterIndex,hook_density:e.hookDensity,cool_point_density:e.coolPointDensity,reader_fatigue:e.readerFatigue,retention_power:e.retentionPower,engagement_score:e.engagementScore,cliffhanger_strength:e.cliffhangerStrength,pacing_balance:e.pacingBalance,recommendation:e.recommendation})}computeRhythm(e,o){return o>.15?"rising":e>.8&&o>=0?"peak":o<-.15?"falling":e<.2&&o<=0?"valley":"flat"}computeRecommendation(e){if(e==="valley")return"\u8282\u594F\u8FC7\u4E8E\u5E73\u7F13\uFF0C\u5EFA\u8BAE\u52A0\u5165\u51B2\u7A81\u6216\u60AC\u5FF5\u63D0\u5347\u5F20\u529B";if(e==="peak")return"\u5F20\u529B\u5DF2\u8FBE\u9876\u5CF0\uFF0C\u5EFA\u8BAE\u4E0B\u7AE0\u5B89\u6392\u8212\u7F13\u573A\u666F\u8C03\u8282\u8282\u594F";if(e==="rising"){const o=this.getRecentMetrics(3);let r=1;for(let n=o.length-1;n>=0&&o[n].rhythm==="rising";n--)r++;return r>=3?"\u8FDE\u7EED\u4E0A\u5347\u7684\u5F20\u529B\uFF0C\u6CE8\u610F\u4E0D\u8981\u8BA9\u8BFB\u8005\u75B2\u52B3":""}return e==="flat"?"\u8282\u594F\u5E73\u6DE1\uFF0C\u5EFA\u8BAE\u53D8\u5316\u573A\u666F\u7C7B\u578B\u589E\u52A0\u5C42\u6B21\u611F":""}analyze(e,o,r){const n=o.length;let l=0,c=0,i=0,d=0,h=0;for(const E of o){const _=w[E.type]??1;l+=E.intensity*_,c+=_,E.type==="dialogue"&&i++,E.type==="action"&&d++,F.includes(E.type)&&h++}const R=c>0?m(l/c,0,1):0,p=n>0?h/n:0,T=m((1-R)*.7+p*.3,0,1),a=this.getMetrics(e-1)?.tension??0,s=m(R-a,-1,1),g=this.computeRhythm(R,s),L=n>0?i/n:0,y=n>0?d/n:0,f=this.computeRecommendation(g),u={chapterIndex:e,tension:R,relaxation:T,rhythm:g,sceneCount:n,dialogueRatio:L,actionRatio:y,wordCount:r,tensionTrend:s,recommendation:f};return this.upsert(u),u}getMetrics(e){const o=this.db.prepare("SELECT * FROM pace_metrics WHERE chapter_index = ?").get(e);return o?this.mapRow(o):void 0}getRecentMetrics(e){return this.db.prepare(`SELECT * FROM (
        SELECT * FROM pace_metrics ORDER BY chapter_index DESC LIMIT ?
      ) ORDER BY chapter_index ASC`).all(e).map(r=>this.mapRow(r))}analyzeRetention(e,o,r,n){const l=m(o*.35+r*.45+n*.2,0,1),c=this.getRecentMetrics(3);let i=0;for(let _=c.length-1;_>=0&&c[_].tension>.7;_--)i++;const d=c.length>0?c.reduce((_,x)=>_+x.tension,0)/c.length:0;let h;i>=3?h=.8:i>=2?h=.5:d>.6?h=.4:h=.1;const p=this.getRecentMetrics(5).map(_=>_.rhythm),T=new Set(p),N=p.filter(_=>_==="flat").length,a=p.length>0?N/p.length:0;let s;T.size>=2&&a<.5?s=.8:a>.6?s=.3:T.size===1?s=.2:s=.6;const g=l*60,L=h*25,y=s*15,f=m(g-L+y,0,100),u=this.computeRetentionRecommendation(f,h,s,n),E={chapterIndex:e,hookDensity:m(o,0,1),coolPointDensity:m(r,0,1),readerFatigue:h,retentionPower:f,engagementScore:l,cliffhangerStrength:m(n,0,1),pacingBalance:s,recommendation:u};return this.upsertRetention(E),E}analyzeRetentionFromText(e,o,r){const n=U(o,r),l=m(n.hookDensity/1e3*3,0,1),c=m(n.coolPointDensity/1e3*3,0,1),i=n.hooks.filter(h=>h.type==="cliffhanger").length,d=m(i/3,0,1);return this.analyzeRetention(e,l,c,d)}computeRetentionRecommendation(e,o,r,n){const l=[];return e<40&&l.push("\u8FFD\u8BFB\u529B\u504F\u4F4E\uFF0C\u5EFA\u8BAE\u589E\u52A0\u723D\u70B9\u548C\u7AE0\u672B\u60AC\u5FF5"),o>.6&&l.push("\u8BFB\u8005\u75B2\u52B3\u5EA6\u8F83\u9AD8\uFF0C\u5EFA\u8BAE\u5B89\u6392\u8212\u7F13\u8FC7\u6E21\u7AE0\u8282"),r<.4&&l.push("\u8282\u594F\u5355\u4E00\uFF0C\u5EFA\u8BAE\u4E30\u5BCC\u573A\u666F\u7C7B\u578B\u548C\u60C5\u7EEA\u5C42\u6B21"),n<.3&&l.push("\u7AE0\u672B\u60AC\u5FF5\u4E0D\u8DB3\uFF0C\u5EFA\u8BAE\u6DFB\u52A0\u94A9\u5B50\u63D0\u5347\u8FFD\u8BFB\u610F\u613F"),e>80&&l.push("\u8FFD\u8BFB\u529B\u4F18\u79C0\uFF0C\u4FDD\u6301\u5F53\u524D\u8282\u594F\u548C\u723D\u70B9\u5BC6\u5EA6"),l.join("\uFF1B")}getRetentionMetrics(e){const o=this.db.prepare("SELECT * FROM retention_metrics WHERE chapter_index = ?").get(e);return o?this.mapRetentionRow(o):void 0}getRetentionDashboard(e=20){const r=this.db.prepare(`SELECT * FROM (
        SELECT * FROM retention_metrics ORDER BY chapter_index DESC LIMIT ?
      ) ORDER BY chapter_index ASC`).all(e).map(a=>this.mapRetentionRow(a)),n=r.length;if(n===0)return{totalChapters:0,averageRetention:0,retentionTrend:"stable",fatigueWarning:!1,weakestChapters:[],strongestChapters:[],overallRecommendation:"",chapterMetrics:[]};const l=m(r.reduce((a,s)=>a+s.retentionPower,0)/n,0,100),c=Math.floor(n/2);let i="stable";if(c>0&&n>1){const a=r.slice(0,c),s=r.slice(c),g=a.reduce((y,f)=>y+f.retentionPower,0)/a.length,L=s.reduce((y,f)=>y+f.retentionPower,0)/s.length;L>g+5?i="improving":L<g-5&&(i="declining")}const d=r.slice(-3),h=d.length>0?d.reduce((a,s)=>a+s.readerFatigue,0)/d.length:0,R=h>.5,p=[...r].sort((a,s)=>a.retentionPower-s.retentionPower).slice(0,3).map(a=>a.chapterIndex),T=[...r].sort((a,s)=>s.retentionPower-a.retentionPower).slice(0,3).map(a=>a.chapterIndex),N=this.computeOverallRecommendation(l,h,i);return{totalChapters:n,averageRetention:l,retentionTrend:i,fatigueWarning:R,weakestChapters:p,strongestChapters:T,overallRecommendation:N,chapterMetrics:r}}computeOverallRecommendation(e,o,r){const n=[];return e<40?n.push("\u6574\u4F53\u8FFD\u8BFB\u529B\u504F\u4F4E\uFF0C\u9700\u91CD\u70B9\u4F18\u5316\u723D\u70B9\u5BC6\u5EA6\u548C\u7AE0\u672B\u60AC\u5FF5"):e>80&&n.push("\u6574\u4F53\u8FFD\u8BFB\u529B\u4F18\u79C0\uFF0C\u4FDD\u6301\u5F53\u524D\u521B\u4F5C\u8282\u594F"),o>.5&&n.push("\u8FD1\u671F\u8BFB\u8005\u75B2\u52B3\u5EA6\u504F\u9AD8\uFF0C\u5EFA\u8BAE\u5B89\u6392\u8212\u7F13\u8FC7\u6E21\u7AE0\u8282"),r==="declining"?n.push("\u8FFD\u8BFB\u529B\u5448\u4E0B\u964D\u8D8B\u52BF\uFF0C\u5EFA\u8BAE\u68C0\u67E5\u8FD1\u671F\u7AE0\u8282\u7684\u94A9\u5B50\u548C\u723D\u70B9\u914D\u7F6E"):r==="improving"&&n.push("\u8FFD\u8BFB\u529B\u5448\u4E0A\u5347\u8D8B\u52BF\uFF0C\u5F53\u524D\u7B56\u7565\u6709\u6548"),n.join("\uFF1B")}analyzeTensionCurve(e,o){const r=this.db.prepare(`SELECT * FROM pace_metrics
       WHERE chapter_index >= ? AND chapter_index <= ?
       ORDER BY chapter_index ASC`).all(e,o),n=this.db.prepare(`SELECT * FROM retention_metrics
       WHERE chapter_index >= ? AND chapter_index <= ?
       ORDER BY chapter_index ASC`).all(e,o),l=new Map;for(const t of n)l.set(t.chapter_index,t.retention_power);const c=r.map(t=>({chapterIndex:t.chapter_index,tension:t.tension,relaxation:t.relaxation,rhythm:t.rhythm,retentionPower:l.get(t.chapter_index)}));if(c.length===0)return{points:[],averageTension:0,volatility:0,pattern:"flat",dropOffPoints:[],peakPoints:[],recommendation:"\u6682\u65E0\u7AE0\u8282\u6570\u636E\uFF0C\u65E0\u6CD5\u5206\u6790\u5F20\u529B\u66F2\u7EBF"};const i=c.map(t=>t.tension),d=i.length,h=i.reduce((t,A)=>t+A,0)/d,R=i.reduce((t,A)=>t+Math.pow(A-h,2),0)/d,p=Math.sqrt(R),T=(d-1)/2;let N=0,a=0;for(let t=0;t<d;t++)N+=(t-T)*(i[t]-h),a+=Math.pow(t-T,2);const s=a!==0?N/a:0,g=[];for(let t=1;t<d;t++)g.push(i[t]-i[t-1]);let L=0;for(let t=1;t<g.length;t++)g[t]*g[t-1]<0&&L++;const y=g.length>0?L/g.length:0;let f=0;for(let t=1;t<d-1;t++)(i[t]>i[t-1]&&i[t]>i[t+1]||i[t]<i[t-1]&&i[t]<i[t+1])&&f++;let u;p>.25&&y>.5?u="roller-coaster":s>.05?u="ascending":s<-.05?u="descending":p<.1?u="flat":f>=2&&p>=.15&&p<=.25?u="wave":u="flat";const E=[];for(let t=1;t<c.length;t++)c[t-1].tension-c[t].tension>.3&&E.push(c[t].chapterIndex);const _=c.filter(t=>t.tension>.8).map(t=>t.chapterIndex);let x;switch(u){case"roller-coaster":x="\u5F20\u529B\u66F2\u7EBF\u5448\u8FC7\u5C71\u8F66\u5F0F\uFF0C\u8282\u594F\u7D27\u51D1\u4F46\u6CE8\u610F\u9632\u6B62\u8BFB\u8005\u75B2\u52B3";break;case"ascending":x="\u5F20\u529B\u6301\u7EED\u4E0A\u5347\uFF0C\u5EFA\u8BAE\u5728\u9AD8\u5CF0\u540E\u5B89\u6392\u8212\u7F13\u7AE0\u8282";break;case"descending":x="\u5F20\u529B\u6301\u7EED\u4E0B\u964D\uFF0C\u53EF\u80FD\u6D41\u5931\u8BFB\u8005\uFF0C\u5EFA\u8BAE\u52A0\u5165\u51B2\u7A81\u6216\u60AC\u5FF5";break;case"flat":x="\u5F20\u529B\u8FC7\u4E8E\u5E73\u7A33\uFF0C\u5EFA\u8BAE\u589E\u52A0\u8D77\u4F0F\u63D0\u5347\u9605\u8BFB\u5174\u8DA3";break;case"wave":x="\u5F20\u529B\u5448\u6CE2\u6D6A\u5F0F\uFF0C\u8282\u594F\u628A\u63A7\u826F\u597D";break}return{points:c,averageTension:h,volatility:p,pattern:u,dropOffPoints:E,peakPoints:_,recommendation:x}}close(){this.db.close()}}
