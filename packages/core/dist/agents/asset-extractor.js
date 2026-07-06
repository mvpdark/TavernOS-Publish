import{AssetCatalogSchema as d,emptyCatalog as h}from"../assets/types.js";import{createAgentRuntime as g}from"./base.js";import{parseAndValidate as u}from"./json-utils.js";export function createAssetExtractor(n){const t=g(n),o="asset-extractor";async function s(e,i){const c=`\u4F60\u662F\u4E00\u4E2A\u521B\u610F\u5199\u4F5C\u5E73\u53F0\u7684\u8D44\u4EA7\u63D0\u53D6\u4EE3\u7406\u3002
\u4F60\u7684\u4EFB\u52A1\u662F\u4ECE\u7AE0\u8282\u5185\u5BB9\u4E2D\u63D0\u53D6\u7ED3\u6784\u5316\u7684\u8D44\u4EA7\u76EE\u5F55\uFF08\u89D2\u8272\u3001\u573A\u666F\u3001\u9053\u5177\uFF09\u3002
\u53EA\u8F93\u51FA\u5408\u6CD5\u7684 JSON\uFF0C\u4E0D\u8981\u8F93\u51FA Markdown \u4EE3\u7801\u5757\u6216\u89E3\u91CA\u6587\u5B57\u3002

JSON \u683C\u5F0F\u5982\u4E0B\uFF1A
{
  "characters": [{ "id": "...", "kind": "character", "name": "...", "aliases": [...], "description": "...", "firstChapter": N, "lastChapter": N, "attributes": { ... }, "appearanceCount": N }],
  "scenes": [{ ... same shape, kind: "scene" ... }],
  "props": [{ ... same shape, kind: "prop" ... }]
}

\u63D0\u53D6\u89C4\u5219\uFF1A
- \u89D2\u8272\uFF1A\u63D0\u53D6\u6BCF\u4E2A\u6709\u540D\u4EBA\u7269\uFF0C\u5305\u62EC\u522B\u540D/\u6635\u79F0\u3001\u5916\u8C8C\u3001\u6027\u683C\u548C\u89D2\u8272\u5B9A\u4F4D\u3002
- \u573A\u666F\uFF1A\u63D0\u53D6\u4E0D\u540C\u7684\u5730\u70B9/\u73AF\u5883\u53CA\u5176\u63CF\u8FF0\u7279\u5F81\u3002
- \u9053\u5177\uFF1A\u63D0\u53D6\u5BF9\u5267\u60C5\u6709\u91CD\u8981\u4F5C\u7528\u7684\u5BF9\u8C61/\u7269\u54C1\u53CA\u5176\u5C5E\u6027\u3002
- \u6BCF\u4E2A\u8D44\u4EA7\u5FC5\u987B\u6709\u552F\u4E00\u7684 'id'\uFF08\u4F7F\u7528\u540D\u79F0\u7684 slug\uFF0C\u5982 'protagonist-li-ming'\uFF09\u3002
- 'firstChapter' \u548C 'lastChapter' \u8BBE\u4E3A\u5F53\u524D\u7AE0\u8282\u53F7\u3002
- \u65B0\u8D44\u4EA7 'appearanceCount' \u8BBE\u4E3A 1\u3002\u5DF2\u6709\u8D44\u4EA7\u7684 appearanceCount \u7531\u7CFB\u7EDF\u81EA\u52A8\u7D2F\u52A0\uFF0C\u65E0\u9700\u624B\u52A8\u8BA1\u7B97\uFF08\u76F4\u63A5\u8BBE\u4E3A 1 \u5373\u53EF\uFF0C\u7CFB\u7EDF\u4F1A\u6839\u636E\u5DF2\u6709\u76EE\u5F55\u5408\u5E76\u65F6\u81EA\u52A8+1\uFF09\u3002
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
- \u9700\u5305\u542B\u5F62\u5236\u3001\u6750\u8D28\u3001\u7EB9\u7406/\u78E8\u635F\u3001\u529F\u80FD\u7279\u5F81`;let p=`## Chapter ${e.chapter}

${e.chapterContent}

Extract the asset catalog as a JSON object. Set firstChapter and lastChapter to ${e.chapter}.`;if(e.existingCatalog){const a=C(e.existingCatalog);p+=`

## Existing Asset Catalog (from prior chapters)
${a}

For assets that already exist (matched by name or alias), reuse the same 'id'. Do NOT calculate or set appearanceCount for existing assets \u2014 the system automatically increments appearanceCount when merging (set it to 1 in your output; the merge logic will compute existing+1). For new assets, generate a new 'id' and set 'appearanceCount' to 1. Include ALL assets (both existing and new) in your output.`}const m=[{role:"system",content:c},{role:"user",content:p}];let r="";try{const a=await t.chat(m,i);r=a.content;const l=u(a.content,d);if(l!==null)return{catalog:f(l),rawResponse:r,degraded:!1}}catch(a){return{catalog:h(),rawResponse:r,degraded:!0,error:a instanceof Error?a.message:String(a)}}return{catalog:h(),rawResponse:r,degraded:!0}}return{name:o,extract:s}}function C(n){const t=[],o=[{label:"Characters",assets:n.characters},{label:"Scenes",assets:n.scenes},{label:"Props",assets:n.props}];for(const s of o)if(s.assets.length!==0){t.push(`### ${s.label}`);for(const e of s.assets){const i=e.aliases.length>0?` (aliases: ${e.aliases.join(", ")})`:"",c=e.description&&e.description.trim().length>0?` \u2014 desc: ${e.description.trim().slice(0,50)}${e.description.trim().length>50?"\u2026":""}`:"";t.push(`- [id:${e.id}] ${e.name}${i} \u2014 appearances: ${e.appearanceCount}, lastChapter: ${e.lastChapter}${c}`)}}return t.length>0?t.join(`
`):"(no existing assets)"}function f(n){return{characters:n.characters.map(t=>({...t,kind:"character"})),scenes:n.scenes.map(t=>({...t,kind:"scene"})),props:n.props.map(t=>({...t,kind:"prop"}))}}
