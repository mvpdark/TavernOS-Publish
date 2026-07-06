import{z as r}from"zod";import{createAgentRuntime as R}from"../agents/base.js";import{parseAndValidate as A,parseJsonObject as j}from"../agents/json-utils.js";const L=5e3,_=3,x=.3,U=8e3,J=r.string().catch("unknown").transform(n=>{const e=n.trim().toLowerCase();return e==="male"||e==="\u7537"||e==="\u7537\u6027"||e==="\u7537\u4E3B"?"male":e==="female"||e==="\u5973"||e==="\u5973\u6027"||e==="\u5973\u4E3B"?"female":"unknown"}),X=r.string().catch("minor").transform(n=>{const e=n.trim().toLowerCase();return e==="key"||e==="\u5173\u952E"||e==="\u91CD\u8981"||e==="main"?"key":"minor"});export const ParsedCharacterSchema=r.object({name:r.string().min(1),gender:J,ageRange:r.string().optional(),role:r.string().default(""),personality:r.string().default(""),appearance:r.string().optional(),relationships:r.array(r.string()).default([])}),ParsedSceneSchema=r.object({name:r.string().min(1),location:r.string().default(""),timeOfDay:r.string().optional(),mood:r.string().optional(),description:r.string().optional()}),ParsedPropSchema=r.object({name:r.string().min(1),description:r.string().optional(),importance:X}),ParsedSceneBeatSchema=r.object({sceneNumber:r.number().int().min(1),title:r.string().min(1),characters:r.array(r.string()).default([]),scene:r.string().min(1),summary:r.string().min(1),emotion:r.string().optional(),estimatedDuration:r.number().int().min(1).optional()}),ParsedScriptSchema=r.object({title:r.string().optional(),characters:r.array(ParsedCharacterSchema).default([]),scenes:r.array(ParsedSceneSchema).default([]),props:r.array(ParsedPropSchema).default([]),beats:r.array(ParsedSceneBeatSchema).default([]),totalScenes:r.number().int().min(0).default(0),estimatedTotalDuration:r.number().int().min(0).optional()});const P=r.object({title:r.string().optional(),characters:r.array(ParsedCharacterSchema).default([]),scenes:r.array(ParsedSceneSchema).default([]),props:r.array(ParsedPropSchema).default([]),beats:r.array(ParsedSceneBeatSchema).default([])}),v=`\u4F60\u662F TavernOS \u77ED\u5267\u7CFB\u7EDF\u7684\u5267\u672C\u7ED3\u6784\u89E3\u6790\u4E13\u5BB6\u3002\u4F60\u7684\u4EFB\u52A1\u662F\u5C06\u7ED9\u5B9A\u7684\u5267\u672C/\u5C0F\u8BF4\u7247\u6BB5\u89E3\u6790\u4E3A\u7ED3\u6784\u5316 JSON \u6570\u636E\uFF0C\u63D0\u53D6\u89D2\u8272\u3001\u573A\u666F\u3001\u9053\u5177\u548C\u5206\u573A\u6982\u8981\uFF08beats\uFF09\u3002

\u3010\u8F93\u51FA\u8981\u6C42\u3011
- \u53EA\u8F93\u51FA\u4E00\u4E2A\u5408\u6CD5\u7684 JSON \u5BF9\u8C61\uFF0C\u7981\u6B62\u8F93\u51FA Markdown \u4EE3\u7801\u5757\u3001\u6CE8\u91CA\u6216\u4EFB\u4F55\u89E3\u91CA\u6587\u5B57\u3002
- \u6240\u6709\u5B57\u7B26\u4E32\u5B57\u6BB5\u4F7F\u7528\u4E2D\u6587\uFF08gender / importance \u9664\u5916\uFF0C\u4F7F\u7528\u6307\u5B9A\u82F1\u6587\u679A\u4E3E\u503C\uFF09\u3002

\u3010JSON \u7ED3\u6784\u3011
{
  "title": "\u5267\u672C\u6807\u9898\uFF08\u4EC5\u5F53\u672C\u7247\u6BB5\u80FD\u660E\u786E\u63A8\u65AD\u51FA\u6574\u4F53\u6807\u9898\u65F6\u586B\u5199\uFF0C\u5426\u5219\u7701\u7565\u6B64\u5B57\u6BB5\uFF09",
  "characters": [
    {
      "name": "\u89D2\u8272\u540D\uFF08\u5FC5\u586B\uFF09",
      "gender": "male | female | unknown",
      "ageRange": "\u5E74\u9F84\u6BB5\uFF0C\u5982 20-25 \u6216 \u5C11\u5E74\uFF08\u53EF\u9009\uFF09",
      "role": "\u89D2\u8272\u5B9A\u4F4D\uFF0C\u5982 \u7537\u4E3B/\u5973\u4E3B/\u53CD\u6D3E/\u914D\u89D2/\u8DEF\u4EBA",
      "personality": "\u6027\u683C\u63CF\u8FF0",
      "appearance": "\u5916\u8C8C\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09",
      "relationships": ["\u4E0EXX\u662F\u604B\u4EBA", "XX\u7684\u7236\u4EB2"]
    }
  ],
  "scenes": [
    {
      "name": "\u573A\u666F\u540D\uFF0C\u5982 \u96E8\u591C\u8857\u5934",
      "location": "\u5730\u70B9\uFF0C\u5982 \u5BA4\u5916\u8857\u9053/\u5BA4\u5185\u5BA2\u5385",
      "timeOfDay": "\u767D\u5929/\u591C\u665A/\u9EC4\u660F/\u6E05\u6668\uFF08\u53EF\u9009\uFF09",
      "mood": "\u6C1B\u56F4\uFF0C\u5982 \u7D27\u5F20/\u6E29\u99A8/\u538B\u6291\uFF08\u53EF\u9009\uFF09",
      "description": "\u573A\u666F\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09"
    }
  ],
  "props": [
    {
      "name": "\u9053\u5177\u540D",
      "description": "\u9053\u5177\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09",
      "importance": "key | minor"
    }
  ],
  "beats": [
    {
      "sceneNumber": 1,
      "title": "\u672C\u573A\u5C0F\u6807\u9898",
      "characters": ["\u51FA\u573A\u89D2\u8272\u540D"],
      "scene": "\u5BF9\u5E94\u573A\u666F\u540D\uFF08\u9700\u4E0E scenes \u4E2D\u7684 name \u5BF9\u5E94\uFF09",
      "summary": "\u672C\u573A\u6240\u53D1\u751F\u4E8B\u4EF6\u7684\u4E00\u53E5\u8BDD\u6458\u8981",
      "emotion": "\u60C5\u7EEA\u57FA\u8C03\uFF0C\u5982 \u60B2\u4F24/\u6124\u6012/\u91CA\u7136\uFF08\u53EF\u9009\uFF09",
      "estimatedDuration": 15
    }
  ]
}

\u3010\u63D0\u53D6\u89C4\u5219\u3011
1. \u89D2\u8272\uFF1A\u63D0\u53D6\u6240\u6709\u6709\u540D\u6216\u88AB\u53CD\u590D\u63D0\u53CA\u7684\u4EBA\u7269\u3002gender \u5FC5\u987B\u662F male/female/unknown\uFF08\u4E5F\u63A5\u53D7 \u7537/\u5973/\u7537\u6027/\u5973\u6027\uFF09\u3002
2. \u573A\u666F\uFF1A\u63D0\u53D6\u4E0D\u540C\u7684\u5730\u70B9/\u73AF\u5883\uFF0C\u6BCF\u4E2A\u72EC\u7ACB\u573A\u666F\u4E00\u4E2A\u6761\u76EE\uFF1B\u540C\u4E00\u5730\u70B9\u4E0D\u540C\u65F6\u6BB5\u53EF\u5408\u5E76\u6216\u62C6\u5206\uFF0C\u89C6\u5267\u60C5\u800C\u5B9A\u3002
3. \u9053\u5177\uFF1A\u63D0\u53D6\u5BF9\u5267\u60C5\u6709\u4F5C\u7528\u7684\u7269\u54C1\u3002\u63A8\u52A8\u5267\u60C5\u7684\u5173\u952E\u9053\u5177 importance=key\uFF0C\u666E\u901A\u9053\u5177 importance=minor\u3002
4. beats\uFF1A\u6309\u5267\u60C5\u65F6\u95F4\u987A\u5E8F\u62C6\u5206\u4E3A\u82E5\u5E72\u5206\u573A\u6982\u8981\u3002\u6BCF\u4E2A beat \u662F\u4E00\u4E2A\u8FDE\u7EED\u7684\u620F\u5267\u5355\u5143\uFF08\u540C\u4E00\u573A\u620F\u5185\u7684\u8FDE\u7EED\u52A8\u4F5C/\u5BF9\u8BDD\uFF09\u3002
   - sceneNumber \u4ECE 1 \u5F00\u59CB\u9012\u589E\uFF08\u4EC5\u9650\u672C\u7247\u6BB5\u5185\u7F16\u53F7\uFF09\u3002
   - estimatedDuration \u5355\u4F4D\u4E3A\u79D2\uFF0C\u77ED\u5267\u8282\u594F\u5FEB\uFF0C\u5355\u573A\u901A\u5E38 5-60 \u79D2\u3002
   - characters \u586B\u5199\u672C\u573A\u51FA\u573A\u7684\u89D2\u8272\u540D\uFF08\u9700\u4E0E characters \u4E2D\u7684 name \u5BF9\u5E94\uFF09\u3002
5. characters / scenes / props / beats \u6570\u7EC4\u53EF\u4E3A\u7A7A\uFF0C\u4F46\u5FC5\u987B\u5B58\u5728\u3002
6. \u672A\u63D0\u53CA\u7684\u53EF\u9009\u5B57\u6BB5\u8BF7\u7701\u7565\uFF0C\u4E0D\u8981\u7F16\u9020\uFF1B\u5FC5\u586B\u5B57\u6BB5\uFF08name / role \u7B49\uFF09\u4E0D\u53EF\u7701\u7565\u3002`;function F(n,e,t){return[`## \u5267\u672C\u7247\u6BB5 ${e+1} / ${t}`,"",n,"","---","\u8BF7\u5C06\u4E0A\u8FF0\u7247\u6BB5\u89E3\u6790\u4E3A JSON\u3002beats \u7684 sceneNumber \u4ECE 1 \u5F00\u59CB\uFF08\u4EC5\u9650\u672C\u7247\u6BB5\u5185\u7F16\u53F7\uFF09\u3002","\u53EA\u8F93\u51FA JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981\u8F93\u51FA Markdown \u4EE3\u7801\u5757\u6216\u89E3\u91CA\u3002"].join(`
`)}function B(n,e){const t=n.replace(/\r\n/g,`
`);if(t.length<=e)return[t];const o=t.split(/\n{2,}/),s=[];for(const c of o){if(c.length<=e){s.push(c);continue}const f=c.split(/\n/);let u="";for(const p of f)u.length===0?u=p:u.length+1+p.length<=e?u+=`
`+p:(s.push(u),u=p);u.length>0&&s.push(u)}const a=[];let i="";for(const c of s)i.length===0?i=c:i.length+2+c.length<=e?i+=`

`+c:(a.push(i),i=c);i.length>0&&a.push(i);const l=[];for(const c of a)for(const f of I(c,e))f.length>0&&l.push(f);return l}function I(n,e){if(n.length<=e)return[n];const t=[],o=Math.floor(e*.5);let s=0;for(;s<n.length;){let a=Math.min(s+e,n.length);if(a<n.length){let i=-1;for(let l=a-1;l>s+o;l--){const c=n[l];if(c==="\u3002"||c==="\uFF01"||c==="\uFF1F"||c==="!"||c==="?"||c===`
`){i=l;break}}i>0&&(a=i+1)}t.push(n.slice(s,a)),s=a}return t}async function K(n,e,t){const o=new Array(n.length);let s=0;async function a(){for(;;){const l=s++;if(l>=n.length)return;o[l]=await e(n[l],l)}}const i=Array.from({length:Math.min(Math.max(1,t),n.length)},()=>a());return await Promise.all(i),o}function S(n){return n.trim().replace(/\s+/g,"").toLowerCase()}function V(n){const e=new Set,t=[];for(const o of n){const s=o.trim().toLowerCase();s.length===0||e.has(s)||(e.add(s),t.push(o))}return t}function T(n,e){const t=n?.trim().length??0,o=e?.trim().length??0;if(!(t===0&&o===0))return t>=o?n??e:e??n}function Y(n,e){return{name:n.name||e.name,gender:n.gender!=="unknown"?n.gender:e.gender,ageRange:n.ageRange??e.ageRange,role:n.role||e.role,personality:n.personality||e.personality,appearance:n.appearance??e.appearance,relationships:V([...n.relationships??[],...e.relationships??[]])}}function $(n,e){return{name:n.name||e.name,location:n.location||e.location,timeOfDay:n.timeOfDay??e.timeOfDay,mood:n.mood??e.mood,description:T(n.description,e.description)}}function G(n,e){return{name:n.name||e.name,description:T(n.description,e.description),importance:n.importance==="key"||e.importance==="key"?"key":"minor"}}function H(n){const e=new Map;for(const t of n)for(const o of t){const s=S(o.name),a=e.get(s);e.set(s,a?Y(a,o):{...o})}return[...e.values()]}function W(n){const e=new Map;for(const t of n)for(const o of t){const s=S(o.name),a=e.get(s);e.set(s,a?$(a,o):{...o})}return[...e.values()]}function Z(n){const e=new Map;for(const t of n)for(const o of t){const s=S(o.name),a=e.get(s);e.set(s,a?G(a,o):{...o})}return[...e.values()]}function q(n){const e=[];for(const t of n)for(const o of t)e.push(o);return e.map((t,o)=>({...t,sceneNumber:o+1}))}function C(){return P.parse({})}function Q(){return{characters:[],scenes:[],props:[],beats:[],totalScenes:0}}function d(n,e){if(!Array.isArray(n))return[];const t=[];for(const o of n){const s=e.safeParse(o);s.success&&t.push(s.data)}return t}function z(n){const e=j(n);if(e===null||typeof e!="object")return C();const t=e;return{title:typeof t.title=="string"&&t.title.trim().length>0?t.title:void 0,characters:d(t.characters,ParsedCharacterSchema),scenes:d(t.scenes,ParsedSceneSchema),props:d(t.props,ParsedPropSchema),beats:d(t.beats,ParsedSceneBeatSchema)}}export class ScriptParser{runtime;constructor(e){this.runtime=R(e)}async parse(e,t){const o=Math.max(500,t?.maxChunkSize??L),s=Math.max(1,t?.concurrency??_),a=t?.temperature??x,i=t?.maxTokens??U,l=t?.signal,c=t?.onProgress,f=t?.onChunkError,u=(e??"").replace(/\r\n/g,`
`);if(u.trim().length===0)return Q();const p=B(u,o),y=p.length;c?.(0,y);let w=0;const g=await K(p,async(m,h)=>{try{if(l?.aborted)throw new Error("aborted");return await this.parseChunk(m,h,y,{temperature:a,maxTokens:i,signal:l})}catch(N){return f?.(h,N),C()}finally{w++,c?.(w,y)}},s),D=H(g.map(m=>m.characters)),M=W(g.map(m=>m.scenes)),O=Z(g.map(m=>m.props)),k=q(g.map(m=>m.beats)),E=g.map(m=>m.title).find(m=>typeof m=="string"&&m.trim().length>0),b=k.reduce((m,h)=>m+(h.estimatedDuration??0),0);return{title:E,characters:D,scenes:M,props:O,beats:k,totalScenes:k.length,estimatedTotalDuration:b>0?b:void 0}}async parseChunk(e,t,o,s){const a=[{role:"system",content:v},{role:"user",content:F(e,t,o)}],i=await this.runtime.chat(a,{temperature:s.temperature,maxTokens:s.maxTokens,signal:s.signal}),l=A(i.content,P);return l!==null?l:z(i.content)}}
