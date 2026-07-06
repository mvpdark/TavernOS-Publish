import{createAgentRuntime as C,toErrorMessage as w}from"./base.js";export function splitIntoParagraphs(t){return t?t.replace(/\r\n/g,`
`).split(/\n{2,}/).map(s=>s.trim()).filter(s=>s.length>0):[]}export function locateParagraph(t,i){if(!i||t.length===0)return-1;const s=i.match(/(\d+)/g);if(s){const l=parseInt(s[s.length-1],10)-1;if(l>=0&&l<t.length)return l}for(let o=0;o<t.length;o++)if(t[o].includes(i))return o;return-1}const I=3;async function P(t,i,s){const o=new Array(t.length);let l=0;async function y(){for(;l<t.length;){const c=l++;o[c]=await s(t[c])}}const r=Math.max(1,Math.min(i,t.length));return await Promise.all(Array.from({length:r},()=>y())),o}export function createEditorAgent(t){const i=C(t),s="reviser";async function o(r,c,h){const g="You are a revision editor. Your task is to fix the identified issues in the paragraph while preserving the story's core narrative, style, and voice. Address each issue carefully and output only the revised paragraph.",d=c.map((n,v)=>`${v+1}. [${n.severity}] ${n.dimension}: ${n.message} (location: ${n.location}, repairScope: ${n.repairScope})`).join(`
`),u=`## Paragraph to Revise

${r}

## Issues to Fix

${d}

Please revise the paragraph to address all the listed issues. Output only the revised paragraph.`,f=[{role:"system",content:g},{role:"user",content:u}];return(await i.chat(f,h)).content}async function l(r,c,h){const g="You are a revision editor. Your task is to fix the identified issues in the chapter content while preserving the story's core narrative, style, and voice. Address each issue carefully and output only the revised chapter content.",d=c.map((n,v)=>`${v+1}. [${n.severity}] ${n.dimension}: ${n.message} (location: ${n.location}, repairScope: ${n.repairScope})`).join(`
`),u=`## Chapter Content

${r}

## Issues to Fix

${d}

Please revise the chapter content to address all the listed issues. Output only the revised content.`,f=[{role:"system",content:g},{role:"user",content:u}];return(await i.chat(f,h)).content}async function y(r,c){if(r.auditIssues.length===0)return{revisedContent:r.chapterContent,appliedFixes:[],revisedParagraphs:[]};const h=splitIntoParagraphs(r.chapterContent),g=[],d=new Map,u=[];for(const e of r.auditIssues)if(e.scope==="paragraph"){const a=locateParagraph(h,e.location);if(a>=0){const p=d.get(a);p?p.push(e):d.set(a,[e])}else u.push(e)}else u.push(e);const f=[...h],x=Array.from(d.entries()),v=(await P(x,I,async([e,a])=>{const p=h[e];try{const m=await o(p,a,c);return{paraIndex:e,originalText:p,revisedText:m,location:a[0].location}}catch(m){return console.warn(`[reviser] Paragraph ${e+1} revision failed \u2014 ${w(m)}. Keeping original text.`),null}})).filter(e=>e!==null).sort((e,a)=>e.paraIndex-a.paraIndex);for(const{paraIndex:e,originalText:a,revisedText:p,location:m}of v)f[e]=p,g.push({location:m,originalText:a,revisedText:p});let $=f.join(`

`);return u.length>0&&($=await l($,u,c)),{revisedContent:$,appliedFixes:r.auditIssues.map(e=>e.message),revisedParagraphs:g}}return{name:s,revise:y}}
