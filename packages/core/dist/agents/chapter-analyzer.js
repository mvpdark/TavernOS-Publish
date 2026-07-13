import{StoryStateDeltaSchema as l,PlotThreadSchema as N,NewThreadCandidateSchema as P}from"../models/story-state.js";import{createAgentRuntime as D}from"./base.js";import{parseAndValidate as A}from"./json-utils.js";import{buildTaxonomyText as z,coerceFact as F,parseFacts as T}from"./fact-taxonomy.js";const x=`\u4F60\u662F\u4E00\u4E2A\u7AE0\u8282\u5206\u6790\u667A\u80FD\u4F53\u3002\u4F60\u7684\u4EFB\u52A1\u662F\u540C\u65F6\u5B8C\u6210\u4E24\u9879\u5206\u6790\uFF0C\u5E76\u8F93\u51FA\u4E00\u4E2A JSON \u5BF9\u8C61\uFF1A
1. \u6545\u4E8B\u72B6\u6001\u589E\u91CF\uFF08delta\uFF09\u2014 \u7528\u4E8E\u66F4\u65B0\u5168\u5C40\u6545\u4E8B\u72B6\u6001
2. \u6545\u4E8B\u4E8B\u5B9E\u5217\u8868\uFF08facts\uFF09\u2014 \u7528\u4E8E\u52A8\u6001\u8BB0\u5FC6\u5E93

\u53EA\u8F93\u51FA\u6709\u6548\u7684 JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981\u4F7F\u7528 markdown \u4EE3\u7801\u5757\uFF0C\u4E0D\u8981\u6DFB\u52A0\u4EFB\u4F55\u89E3\u91CA\u6587\u5B57\u3002

\u8F93\u51FA\u683C\u5F0F\uFF1A
{
  "delta": { /* StoryStateDelta \u5BF9\u8C61 */ },
  "facts": [ /* ExtractedFact \u6570\u7EC4\uFF0C\u53EF\u4E3A\u7A7A */ ]
}

delta \u5B57\u6BB5\u8BF4\u660E\uFF08StoryStateDelta\uFF09\uFF1A
- chapter: \u5F53\u524D\u7AE0\u8282\u53F7
- currentStatePatch: \u5F53\u524D\u72B6\u6001\u8865\u4E01\u6570\u7EC4\uFF08subject/predicate/object \u4E09\u5143\u7EC4\uFF09
- hookOps: \u4F0F\u7B14\u64CD\u4F5C { upsert, mention, resolve, defer }
- newHookCandidates: \u65B0\u4F0F\u7B14\u5019\u9009
- chapterSummary: \u7AE0\u8282\u6458\u8981 { title, characters, events, stateChanges, hookActivity, mood, chapterType }
- subplotOps, emotionalArcOps, characterMatrixOps: \u53EF\u9009
- notes: \u5907\u6CE8

facts \u5B57\u6BB5\u8BF4\u660E\uFF08\u4E8B\u5B9E\u5206\u7C7B\u4F53\u7CFB\uFF0Cdomain \u548C category \u5FC5\u987B\u4F7F\u7528\u4E0B\u5217\u82F1\u6587\u503C\uFF09\uFF1A
${z()}

\u6BCF\u4E2A fact \u5BF9\u8C61\u5305\u542B\uFF1A
- domain: \u4E0A\u8FF0 6 \u4E2A\u57DF\u4E4B\u4E00
- category: \u4E0A\u8FF0\u7C7B\u522B\u4E4B\u4E00\uFF0C\u5FC5\u987B\u5C5E\u4E8E\u6240\u9009 domain
- label: \u7B80\u77ED\u6807\u7B7E
- content: \u5B8C\u6574\u7684\u4E8B\u5B9E\u9648\u8FF0
- weight: \u6570\u503C 0-100\uFF0C\u91CD\u8981\u6027
- certainty: \u6570\u503C 0-1\uFF0C\u786E\u4FE1\u5EA6
- triggers: \u5B57\u7B26\u4E32\u6570\u7EC4\uFF0C\u7528\u4E8E\u68C0\u7D22\u7684\u5173\u952E\u8BCD
- emotionalWeight: \u6570\u503C -1 \u5230 1\uFF0C\u60C5\u611F\u6743\u91CD

\u62BD\u53D6\u91CD\u70B9\uFF08facts\uFF09\uFF1A
- \u4EBA\u7269\u8EAB\u4EFD/\u6027\u683C/\u80FD\u529B/\u5173\u7CFB\u7684\u63ED\u793A\u4E0E\u53D8\u5316
- \u4E16\u754C\u89C2\u89C4\u5219\u7684\u63ED\u793A
- \u65B0\u5730\u70B9\u7684\u51FA\u73B0
- \u60C5\u8282\u4F0F\u7B14/\u60AC\u5FF5\u7684\u57CB\u8BBE
- \u65F6\u95F4\u7EBF\u91CC\u7A0B\u7891
- \u4E3B\u9898\u51B2\u7A81

\u53EA\u63D0\u53D6\u672C\u7AE0\u65B0\u51FA\u73B0\u6216\u6709\u663E\u8457\u53D8\u5316\u7684\u4E8B\u5B9E\uFF0C\u907F\u514D\u4E0E\u5DF2\u6709\u4E8B\u5B9E\u91CD\u590D\u3002\u82E5\u672C\u7AE0\u65E0\u53EF\u63D0\u53D6\u4E8B\u5B9E\uFF0Cfacts \u8F93\u51FA\u7A7A\u6570\u7EC4 []\u3002`;export function createChapterAnalyzer(O){const k=D(O),w="chapter-analyzer";async function $(n,b){const j=`## \u7B2C ${n.chapter} \u7AE0

${n.chapterContent}

## \u6545\u4E8B\u8BBE\u5B9A
${n.storyBible}

## \u5F53\u524D\u72B6\u6001
${n.currentState}

## \u6D3B\u8DC3\u4F0F\u7B14
${n.activeHooks}

## \u5DF2\u6709\u4E8B\u5B9E\u6458\u8981\uFF08\u907F\u514D\u91CD\u590D\uFF09
${n.existingFactsSummary}

\u8BF7\u540C\u65F6\u63D0\u53D6\u6545\u4E8B\u72B6\u6001\u589E\u91CF\uFF08delta\uFF09\u548C\u6545\u4E8B\u4E8B\u5B9E\u5217\u8868\uFF08facts\uFF09\uFF0C\u8F93\u51FA\u4E3A JSON \u5BF9\u8C61\u3002delta \u7684 chapter \u5B57\u6BB5\u5FC5\u987B\u4E3A ${n.chapter}\u3002`,C=[{role:"system",content:x},{role:"user",content:j}];let f=l.parse({chapter:n.chapter}),m=[],c=!0,p=!0,u;try{const i=await k.chat(C,b),g=i.content.trim();u=i.usage;try{const a=JSON.parse(g.replace(/```(?:json)?\s*/gi,"").replace(/```/g,""));if(a&&typeof a=="object"){if(a.delta&&typeof a.delta=="object"){const d=A(JSON.stringify(a.delta),l);if(d)f=d,c=!1;else{const e=typeof a.delta=="object"&&a.delta!==null?{...a.delta}:{},h=l.safeParse(e);if(!h.success){const t=h.error.issues.map(r=>`${r.path.join(".")}: ${r.message} (code=${r.code})`).slice(0,10);console.warn(`[chapter-analyzer] delta Zod errors: ${t.join("; ")}`)}e.chapter!==void 0&&typeof e.chapter=="string"&&(e.chapter=parseInt(e.chapter,10)),(e.chapter===void 0||isNaN(e.chapter))&&(e.chapter=n.chapter);const o=e.hookOps;if(o&&Array.isArray(o.upsert)&&(o.upsert=o.upsert.filter(t=>t&&typeof t=="object").map(t=>{const r={...t};for(const S of["startChapter","lastAdvancedChapter"])typeof r[S]=="string"&&(r[S]=parseInt(r[S],10));const y={\u5F00\u653E:"open",\u8FDB\u884C\u4E2D:"progressing",\u5EF6\u540E:"deferred",\u5DF2\u89E3\u51B3:"resolved",\u5B8C\u6210:"resolved",\u6682\u505C:"deferred"};return typeof r.status=="string"&&y[r.status]&&(r.status=y[r.status]),r}).filter(t=>N.safeParse(t).success)),!o||typeof o!="object")e.hookOps={upsert:[],mention:[],resolve:[],defer:[]};else for(const t of["upsert","mention","resolve","defer"])Array.isArray(o[t])||(o[t]=[]);Array.isArray(e.newHookCandidates)?e.newHookCandidates=e.newHookCandidates.filter(t=>t&&typeof t=="object").filter(t=>P.safeParse(t).success):e.newHookCandidates=[];const s=e.chapterSummary;if(s){typeof s.chapter=="string"&&(s.chapter=parseInt(s.chapter,10)),(s.chapter===void 0||isNaN(s.chapter))&&(s.chapter=n.chapter);for(const t of["characters","events","stateChanges","hookActivity","mood","chapterType","title"])Array.isArray(s[t])&&(s[t]=s[t].map(String).join(", "))}typeof e.notes=="string"&&(e.notes=[e.notes]),Array.isArray(e.currentStatePatch)&&delete e.currentStatePatch;for(const t of["subplotOps","emotionalArcOps","characterMatrixOps"])Array.isArray(e[t])||(e[t]=[]);const v=A(JSON.stringify(e),l);if(v)f=v,c=!1,console.warn("[chapter-analyzer] delta recovered after aggressive repair");else{const t=l.safeParse(e);if(!t.success){const r=t.error.issues.map(y=>`${y.path.join(".")}: ${y.message}`).slice(0,5);console.warn(`[chapter-analyzer] delta still invalid after repair: ${r.join("; ")}`)}console.warn("[chapter-analyzer] delta validation failed even after aggressive repair \u2014 falling back to minimal delta")}}}if(Array.isArray(a.facts)){const d=[];for(const e of a.facts){const h=F(e);h&&d.push(h)}m=d,p=!1}}}catch{}if(c){const a=A(g,l);a&&(f=a,c=!1)}if(p){const a=T(g);a!==null&&(m=a,p=!1)}c&&console.warn("[chapter-analyzer] delta validation failed \u2014 using minimal delta")}catch(i){return{delta:f,facts:m,deltaDegraded:c,factsDegraded:p,error:i instanceof Error?i.message:String(i),usage:u}}return{delta:f,facts:m,deltaDegraded:c,factsDegraded:p,usage:u}}return{name:w,analyze:$}}
