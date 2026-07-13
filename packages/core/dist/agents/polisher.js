import{createAgentRuntime as w,toErrorMessage as I}from"./base.js";export function splitIntoParagraphs(s){return s?s.replace(/\r\n/g,`
`).split(/\n{2,}/).map(r=>r.trim()).filter(r=>r.length>0):[]}export function locateParagraph(s,i){if(!i||s.length===0)return-1;const r=i.match(/(\d+)/g);if(r){const u=parseInt(r[r.length-1],10)-1;if(u>=0&&u<s.length)return u}for(let a=0;a<s.length;a++)if(s[a].includes(i))return a;return-1}const R=3;async function A(s,i,r){const a=new Array(s.length);let u=0;async function T(){for(;u<s.length;){const c=u++;a[c]=await r(s[c])}}const o=Math.max(1,Math.min(i,s.length));return await Promise.all(Array.from({length:o},()=>T())),a}export function createPolisher(s){const i=w(s),r="polisher";async function a(o,c,d){const m="You are a revision editor. Your task is to fix the identified issues in the paragraph while preserving the story's core narrative, style, and voice. Address each issue carefully and output only the revised paragraph.",g=c.map((t,f)=>`${f+1}. [${t.severity}] ${t.dimension}: ${t.message} (location: ${t.location}, repairScope: ${t.repairScope})`).join(`
`),p=`## Paragraph to Revise

${o}

## Issues to Fix

${g}

Please revise the paragraph to address all the listed issues. Output only the revised paragraph.`,v=[{role:"system",content:m},{role:"user",content:p}],l=await i.chat(v,d);return{content:l.content,usage:l.usage}}async function u(o,c,d){const m="You are a revision editor. Your task is to fix the identified issues in the chapter content while preserving the story's core narrative, style, and voice. Address each issue carefully and output only the revised chapter content.",g=c.map((t,f)=>`${f+1}. [${t.severity}] ${t.dimension}: ${t.message} (location: ${t.location}, repairScope: ${t.repairScope})`).join(`
`),p=`## Chapter Content

${o}

## Issues to Fix

${g}

Please revise the chapter content to address all the listed issues. Output only the revised content.`,v=[{role:"system",content:m},{role:"user",content:p}],l=await i.chat(v,d);return{content:l.content,usage:l.usage}}async function T(o,c){if(o.auditIssues.length===0)return{revisedContent:o.chapterContent,appliedFixes:[],revisedParagraphs:[]};const d=splitIntoParagraphs(o.chapterContent),m=[],g=new Map,p=[];for(const e of o.auditIssues)if(e.scope==="paragraph"){const n=locateParagraph(d,e.location);if(n>=0){const h=g.get(n);h?h.push(e):g.set(n,[e])}else p.push(e)}else p.push(e);const v=[...d];let l=0,t=0,f=0,$=!1;const k=Array.from(g.entries()),P=(await A(k,R,async([e,n])=>{const h=d[e];try{const{content:y,usage:x}=await a(h,n,c);return x&&($=!0,l+=x.promptTokens,t+=x.completionTokens,f+=x.totalTokens),{paraIndex:e,originalText:h,revisedText:y,location:n[0].location}}catch(y){return console.warn(`[polisher] Paragraph ${e+1} revision failed \u2014 ${I(y)}. Keeping original text.`),null}})).filter(e=>e!==null).sort((e,n)=>e.paraIndex-n.paraIndex);for(const{paraIndex:e,originalText:n,revisedText:h,location:y}of P)v[e]=h,m.push({location:y,originalText:n,revisedText:h});let C=v.join(`

`);if(p.length>0){const{content:e,usage:n}=await u(C,p,c);n&&($=!0,l+=n.promptTokens,t+=n.completionTokens,f+=n.totalTokens),C=e}return{revisedContent:C,appliedFixes:o.auditIssues.map(e=>e.message),revisedParagraphs:m,usage:$?{promptTokens:l,completionTokens:t,totalTokens:f}:void 0}}return{name:r,revise:T}}
