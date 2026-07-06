import E from"better-sqlite3";import{z as _}from"zod";export const LinkEdgeTypeSchema=_.enum(["causal","temporal","character","thematic","contradiction"]);const d=_.object({from_fact_id:_.string(),to_fact_id:_.string(),type:LinkEdgeTypeSchema,weight:_.number(),created_at:_.string()}),h=1,T=20;export class LinkGraph{db;constructor(t){this.db=new E(t),this.db.pragma("journal_mode = WAL"),this.db.pragma("foreign_keys = ON"),this.initSchema()}initSchema(){this.db.exec(`
      CREATE TABLE IF NOT EXISTS fact_links (
        from_fact_id  TEXT NOT NULL,
        to_fact_id    TEXT NOT NULL,
        type          TEXT NOT NULL,
        weight        REAL NOT NULL DEFAULT 1,
        created_at    TEXT NOT NULL,
        PRIMARY KEY (from_fact_id, to_fact_id, type)
      );

      CREATE INDEX IF NOT EXISTS idx_links_from ON fact_links(from_fact_id);
      CREATE INDEX IF NOT EXISTS idx_links_to   ON fact_links(to_fact_id);
    `)}mapRow(t){return{fromFactId:t.from_fact_id,toFactId:t.to_fact_id,type:t.type,weight:t.weight,createdAt:t.created_at}}addEdge(t,e,i,o){const c=new Date().toISOString();this.db.prepare(`
      INSERT INTO fact_links (from_fact_id, to_fact_id, type, weight, created_at)
      VALUES (@from_fact_id, @to_fact_id, @type, @weight, @created_at)
      ON CONFLICT(from_fact_id, to_fact_id, type) DO UPDATE SET
        weight = MAX(excluded.weight, fact_links.weight)
    `).run({from_fact_id:t,to_fact_id:e,type:i,weight:o,created_at:c})}removeEdge(t,e){this.db.prepare(`
      DELETE FROM fact_links
      WHERE (from_fact_id = @a AND to_fact_id = @b)
         OR (from_fact_id = @b AND to_fact_id = @a)
    `).run({a:t,b:e})}getNeighbors(t,e=h){return e<=1?this.db.prepare(`
        SELECT * FROM fact_links
        WHERE from_fact_id = ? OR to_fact_id = ?
        ORDER BY weight DESC
      `).all(t,t).map(o=>this.mapRow(d.parse(o))):this.getNeighbors(t,1)}getEdges(t){return this.db.prepare(`
      SELECT * FROM fact_links
      WHERE from_fact_id = ? OR to_fact_id = ?
      ORDER BY weight DESC
    `).all(t,t).map(i=>this.mapRow(d.parse(i)))}diffuse(t,e=T){if(t.length===0)return[];const i=t.map(()=>"?").join(", "),o=this.db.prepare(`
      SELECT * FROM fact_links
      WHERE from_fact_id IN (${i}) OR to_fact_id IN (${i})
      ORDER BY weight DESC
    `).all(...t,...t),c=new Set(t),n=new Map;for(const r of o){const a=this.mapRow(d.parse(r));let s=null;if(c.has(a.fromFactId)?c.has(a.toFactId)||(s=a.toFactId):s=a.fromFactId,s===null)continue;const f=n.get(s)??-1/0;a.weight>f&&n.set(s,a.weight)}return[...n.entries()].sort((r,a)=>a[1]!==r[1]?a[1]-r[1]:r[0].localeCompare(a[0])).slice(0,e).map(([r])=>r)}getStats(){const t=this.db.prepare("SELECT COUNT(*) AS count FROM fact_links").get(),e=this.db.prepare(`
      SELECT COUNT(DISTINCT fact_id) AS count FROM (
        SELECT from_fact_id AS fact_id FROM fact_links
        UNION
        SELECT to_fact_id AS fact_id FROM fact_links
      )
    `).get(),i=t.count,o=e.count,c=o>0?i*2/o:0;return{totalEdges:i,totalNodes:o,avgDegree:c}}close(){this.db.close()}}
