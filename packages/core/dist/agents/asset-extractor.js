import{AssetCatalogSchema as k,emptyCatalog as x}from"../assets/types.js";import{AssetCatalogManager as d}from"../assets/catalog.js";import{createAgentRuntime as $}from"./base.js";import{parseAndValidate as S}from"./json-utils.js";export function createAssetExtractor(s){const a=$(s),n="asset-extractor";async function r(e,t){let o=[];e.existingCatalog&&(o=scanRoster(e.existingCatalog,e.chapterContent,e.chapter));const c=`\u4F60\u662F\u4E00\u4E2A\u521B\u610F\u5199\u4F5C\u5E73\u53F0\u7684\u8D44\u4EA7\u63D0\u53D6\u4EE3\u7406\u3002
\u4F60\u7684\u4EFB\u52A1\u662F\u4ECE\u7AE0\u8282\u5185\u5BB9\u4E2D\u63D0\u53D6**\u65B0\u7684**\u8D44\u4EA7\uFF08\u89D2\u8272\u3001\u573A\u666F\u3001\u9053\u5177\uFF09\u3002
\u53EA\u8F93\u51FA\u5408\u6CD5\u7684 JSON\uFF0C\u4E0D\u8981\u8F93\u51FA Markdown \u4EE3\u7801\u5757\u6216\u89E3\u91CA\u6587\u5B57\u3002

JSON \u683C\u5F0F\u5982\u4E0B\uFF1A
{
  "characters": [{ "id": "...", "kind": "character", "name": "...", "aliases": [...], "description": "...", "firstChapter": N, "lastChapter": N, "attributes": { ... }, "appearanceCount": 1 }],
  "scenes": [{ ... same shape, kind: "scene" ... }],
  "props": [{ ... same shape, kind: "prop" ... }]
}

\u63D0\u53D6\u89C4\u5219\uFF08\u4EC5\u9650\u5C1A\u672A\u767B\u8BB0\u7684\u65B0\u8D44\u4EA7\uFF09\uFF1A
- \u89D2\u8272\uFF1A\u63D0\u53D6\u6BCF\u4E2A\u6709\u540D\u4EBA\u7269\uFF0C\u5305\u62EC\u522B\u540D/\u6635\u79F0\u3001\u5916\u8C8C\u3001\u6027\u683C\u548C\u89D2\u8272\u5B9A\u4F4D\u3002
- \u573A\u666F\uFF1A\u63D0\u53D6\u4E0D\u540C\u7684\u5730\u70B9/\u73AF\u5883\u53CA\u5176\u63CF\u8FF0\u7279\u5F81\u3002
- \u9053\u5177\uFF1A\u63D0\u53D6\u5BF9\u5267\u60C5\u6709\u91CD\u8981\u4F5C\u7528\u7684\u5BF9\u8C61/\u7269\u54C1\u53CA\u5176\u5C5E\u6027\u3002
- \u6BCF\u4E2A\u8D44\u4EA7\u5FC5\u987B\u6709\u552F\u4E00\u7684 'id'\uFF08\u4F7F\u7528\u540D\u79F0\u7684 slug\uFF0C\u5982 'protagonist-li-ming'\uFF09\u3002
- 'firstChapter' \u548C 'lastChapter' \u8BBE\u4E3A\u5F53\u524D\u7AE0\u8282\u53F7\u3002
- 'appearanceCount' \u8BBE\u4E3A 1\u3002
- 'attributes' \u662F\u6241\u5E73\u7684\u952E\u503C\u5BF9\uFF08\u5982 {"age":"25","hair":"black"}\uFF09\u3002

\u89D2\u8272\u63CF\u8FF0\u786C\u7EA6\u675F\uFF1A
- \u6BCF\u4E2A\u89D2\u8272\u81F3\u5C11\u5305\u542B 8 \u4E2A\u5177\u4F53\u7EC6\u8282\u70B9\uFF08\u9762\u90E8\u3001\u53D1\u578B\u53D1\u8272\u3001\u80A4\u8D28\u3001\u670D\u88C5\u3001\u4F53\u6001\u7B49\uFF09
- \u4E0D\u540C\u89D2\u8272\u81F3\u5C11 3 \u4E2A\u5B57\u6BB5\u4E0D\u540C\uFF08\u5982\u53D1\u578B\u3001\u670D\u88C5\u3001\u80A4\u8272\u3001\u4F53\u6001\u3001\u6C14\u8D28\uFF09
- \u7981\u6B62\u5957\u8BDD\uFF1A\u5982\u300C\u9762\u90E8\u8F6E\u5ED3\u6E05\u6670\u300D\u300C\u53EF\u76F4\u63A5\u7528\u4E8E\u89D2\u8272\u8BBE\u5B9A\u53C2\u8003\u56FE\u300D\u7B49
- \u7981\u6B62\u628A\u955C\u5934\u672F\u8BED\u5F53\u89D2\u8272\u540D\uFF1APan/ECU/POV/OTS/Zoom \u7B49
- \u63A8\u8350\u4F7F\u7528\u683C\u5F0F\u9AA8\u67B6\uFF1A"\u5168\u8EAB\u89C6\u89D2\uFF0C\u540D\u53EB[\u89D2\u8272\u540D]\u7684[\u5E74\u9F84\u6BB5+\u6027\u522B]\uFF0C[\u6C14\u8D28\u5173\u952E\u8BCD]\uFF0C[\u9762\u90E8\u7EC6\u8282]\uFF0C[\u53D1\u578B\u53D1\u8272\u7EC6\u8282]\uFF0C[\u80A4\u8D28\u7EC6\u8282]\uFF0C\u8EAB\u7740[\u4E0A\u8EAB\u670D\u88C5+\u6750\u8D28]\uFF0C[\u4E0B\u8EAB\u670D\u88C5+\u6750\u8D28]\uFF0C\u811A\u7A7F[\u978B\u5C65]\uFF0C[\u4F53\u6001\u6216\u59FF\u52BF\u7279\u5F81]\u3002"

\u573A\u666F\u63CF\u8FF0\u786C\u7EA6\u675F\uFF1A
- \u9700\u5305\u542B\u7A7A\u95F4\u7ED3\u6784\u3001\u5149\u7EBF\u6765\u6E90\u3001\u73AF\u5883\u8D28\u611F\u3001\u5173\u952E\u9648\u8BBE

\u9053\u5177\u63CF\u8FF0\u786C\u7EA6\u675F\uFF1A
- \u9700\u5305\u542B\u5F62\u5236\u3001\u6750\u8D28\u3001\u7EB9\u7406/\u78E8\u635F\u3001\u529F\u80FD\u7279\u5F81`;let i=`## \u7B2C ${e.chapter} \u7AE0

${e.chapterContent}

\u4EC5\u63D0\u53D6\u65B0\u8D44\u4EA7\uFF08\u4E0D\u5305\u542B\u5DF2\u77E5\u5217\u8868\u4E2D\u5DF2\u6709\u7684\uFF09\uFF0C\u8F93\u51FA JSON \u5BF9\u8C61\u3002\u5C06 firstChapter \u548C lastChapter \u8BBE\u4E3A ${e.chapter}\u3002`;if(o.length>0){const f=u(o,!1);i+=`

## \u5DF2\u8BC6\u522B\u8D44\u4EA7\uFF08\u8BF7\u52FF\u91CD\u590D\u63D0\u53D6\uFF09
${f}

\u91CD\u8981\uFF1A\u4EE5\u4E0A\u8D44\u4EA7\u5DF2\u7531\u7CFB\u7EDF\u5728\u672C\u7AE0\u4E2D\u8BC6\u522B\u3002\u8BF7\u52FF\u5728\u8F93\u51FA\u4E2D\u5305\u542B\u5B83\u4EEC\u3002\u4EC5\u63D0\u53D6\u4E0D\u5728\u4E0A\u8FF0\u5217\u8868\u4E2D\u7684\u65B0\u8D44\u4EA7\u3002\u5982\u679C\u672C\u7AE0\u6240\u6709\u8D44\u4EA7\u5747\u5DF2\u8BC6\u522B\uFF0C\u8FD4\u56DE\u7A7A\u76EE\u5F55\uFF1A{"characters":[],"scenes":[],"props":[]}`}else if(e.existingCatalog&&(e.existingCatalog.characters.length>0||e.existingCatalog.scenes.length>0||e.existingCatalog.props.length>0)){const f=u([...e.existingCatalog.characters,...e.existingCatalog.scenes,...e.existingCatalog.props],!0);i+=`

## \u5DF2\u6709\u8D44\u4EA7\u76EE\u5F55\uFF08\u6765\u81EA\u524D\u5E8F\u7AE0\u8282\uFF09
${f}

\u4EE5\u4E0A\u8D44\u4EA7\u5DF2\u88AB\u8DDF\u8E2A\uFF0C\u8BF7\u52FF\u91CD\u590D\u63D0\u53D6\u3002\u4EC5\u63D0\u53D6\u4E0D\u5728\u5217\u8868\u4E2D\u7684\u65B0\u8D44\u4EA7\uFF0C\u4E3A\u5176\u751F\u6210\u65B0 'id' \u5E76\u5C06 'appearanceCount' \u8BBE\u4E3A 1\u3002\u5982\u679C\u672C\u7AE0\u6240\u6709\u8D44\u4EA7\u5747\u5728\u5217\u8868\u4E2D\uFF0C\u8FD4\u56DE\u7A7A\u76EE\u5F55\uFF1A{"characters":[],"scenes":[],"props":[]}`}const h=[{role:"system",content:c},{role:"user",content:i}];let l="",p;try{const f=await a.chat(h,t);l=f.content,p=f.usage;const m=S(f.content,k);if(m!==null){const C=d.normalizeCatalog(b(m));return{catalog:mergePhaseResults(o,C),rawResponse:l,degraded:!1,usage:p}}}catch(f){return g(o,l,f,p)}return g(o,l,void 0,p)}return{name:n,extract:r}}export function scanRoster(s,a,n){const r=[],e=[...s.characters,...s.scenes,...s.props],t=new Set;for(const c of e){const i=c.name.trim();i&&t.add(i);for(const h of c.aliases){const l=h.trim();l&&t.add(l)}}const o=[...t];for(const c of e){const i=[c.name,...c.aliases].filter(l=>{const p=l.trim();return p?p.length>=2?!0:/[\u4e00-\u9fff]/.test(p):!1});let h=!1;for(const l of i)if(containsName(a,l,o)){h=!0;break}h&&r.push({...c,lastChapter:n})}return r}export function containsName(s,a,n){const r=a.trim();if(!r)return!1;let e=0;for(;;){const t=s.indexOf(r,e);if(t===-1)return!1;if(!n.some(c=>c.length>r.length&&s.startsWith(c,t)))return!0;e=t+1}}export function mergePhaseResults(s,a){const n={characters:s.filter(t=>t.kind==="character"),scenes:s.filter(t=>t.kind==="scene"),props:s.filter(t=>t.kind==="prop")},r={characters:[...n.characters],scenes:[...n.scenes],props:[...n.props]},e=["characters","scenes","props"];for(const t of e)for(const o of a[t])n[t].some(i=>d.isMatch(o,i))||r[t].push(o);return r}function g(s,a,n,r){return s.length>0?{catalog:{characters:s.filter(e=>e.kind==="character"),scenes:s.filter(e=>e.kind==="scene"),props:s.filter(e=>e.kind==="prop")},rawResponse:a,degraded:!0,error:n instanceof Error?n.message:n?String(n):"JSON parse/schema validation failure",usage:r}:{catalog:x(),rawResponse:a,degraded:!0,error:n instanceof Error?n.message:n?String(n):"JSON parse/schema validation failure",usage:r}}function u(s,a){const n=[],r=[{label:"Characters",assets:s.filter(e=>e.kind==="character")},{label:"Scenes",assets:s.filter(e=>e.kind==="scene")},{label:"Props",assets:s.filter(e=>e.kind==="prop")}];for(const e of r)if(e.assets.length!==0){n.push(`### ${e.label}`);for(const t of e.assets){const o=t.aliases.length>0?` (aliases: ${t.aliases.join(", ")})`:"";if(a){const c=t.description?.trim()??"",i=c.length>0?` \u2014 desc: ${c.slice(0,50)}${c.length>50?"\u2026":""}`:"";n.push(`- [id:${t.id}] ${t.name}${o} \u2014 appearances: ${t.appearanceCount}, lastChapter: ${t.lastChapter}${i}`)}else n.push(`- [id:${t.id}] ${t.name}${o}`)}}return n.length>0?n.join(`
`):"(none)"}function b(s){return{characters:s.characters.map(a=>({...a,kind:"character"})),scenes:s.scenes.map(a=>({...a,kind:"scene"})),props:s.props.map(a=>({...a,kind:"prop"}))}}
