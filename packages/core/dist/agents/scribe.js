import{loadPrompt as g}from"../prompts/loader.js";import{createAgentRuntime as y}from"./base.js";import{extractPromptMessages as h}from"./json-utils.js";const U={fast:"\u5FEB\u8282\u594F\u6A21\u5F0F\uFF1A\u52A0\u901F\u5267\u60C5\u63A8\u8FDB\uFF0C\u51CF\u5C11\u73AF\u5883\u63CF\u5199\u548C\u5185\u5FC3\u72EC\u767D\uFF0C\u591A\u7528\u77ED\u53E5\u548C\u52A8\u4F5C\u63CF\u5199\uFF0C\u6BCF\u5E55\u5FC5\u6709\u51B2\u7A81\u6216\u8F6C\u6298\uFF0C\u9002\u5408\u9AD8\u6F6E\u7AE0\u8282\u548C\u6218\u6597\u573A\u666F\u3002",slow:"\u6162\u8282\u594F\u6A21\u5F0F\uFF1A\u6CE8\u91CD\u6C1B\u56F4\u8425\u9020\u548C\u611F\u5B98\u7EC6\u8282\uFF0C\u5927\u91CF\u73AF\u5883\u63CF\u5199\u548C\u5FC3\u7406\u6D3B\u52A8\uFF0C\u8282\u594F\u8212\u7F13\u6C89\u6D78\uFF0C\u9002\u5408\u8FC7\u6E21\u7AE0\u8282\u548C\u60C5\u611F\u94FA\u57AB\u3002",memory:"\u56DE\u5FC6\u6A21\u5F0F\uFF1A\u4EE5\u95EA\u56DE\u4E3A\u6838\u5FC3\u53D9\u4E8B\u624B\u6CD5\uFF0C\u8FC7\u53BB\u4E0E\u73B0\u5728\u4EA4\u7EC7\uFF0C\u6CE8\u91CD\u65F6\u95F4\u7EBF\u7684\u6A21\u7CCA\u611F\u4E0E\u60C5\u611F\u7684\u5C42\u5C42\u9012\u8FDB\uFF0C\u9002\u5408\u89D2\u8272\u80CC\u666F\u63ED\u793A\u3002",emotion:"\u60C5\u611F\u6A21\u5F0F\uFF1A\u805A\u7126\u89D2\u8272\u5185\u5FC3\u4E16\u754C\uFF0C\u5F3A\u5316\u60C5\u611F\u5F20\u529B\u548C\u4EBA\u9645\u51B2\u7A81\uFF0C\u5BF9\u8BDD\u5BCC\u6709\u6F5C\u53F0\u8BCD\uFF0C\u9002\u5408\u5173\u7CFB\u8F6C\u6298\u548C\u9AD8\u60C5\u611F\u6D53\u5EA6\u573A\u666F\u3002",dialogue:"\u5BF9\u8BDD\u9A71\u52A8\u6A21\u5F0F\uFF1A\u4EE5\u89D2\u8272\u5BF9\u8BDD\u4E3A\u4E3B\u8981\u53D9\u4E8B\u624B\u6BB5\uFF0C\u51CF\u5C11\u65C1\u767D\u53D9\u8FF0\uFF0C\u901A\u8FC7\u5BF9\u8BDD\u63A8\u8FDB\u5267\u60C5\u548C\u63ED\u793A\u6027\u683C\uFF0C\u9002\u5408\u793E\u4EA4\u573A\u666F\u548C\u5BC6\u5BA4\u63A8\u7406\u3002",suspense:"\u60AC\u7591\u6A21\u5F0F\uFF1A\u57CB\u8BBE\u4F0F\u7B14\u548C\u7EBF\u7D22\uFF0C\u63A7\u5236\u4FE1\u606F\u91CA\u653E\u8282\u594F\uFF0C\u8425\u9020\u672A\u77E5\u548C\u7D27\u5F20\u611F\uFF0C\u9002\u5408\u8C1C\u9898\u7AE0\u8282\u548C\u53CD\u8F6C\u94FA\u57AB\u3002"};export function createScribe(u,k){const S=y(u),T=k?y(k):null,d="scribe";async function E(e,c){const m=e.minWords??1500,f=e.targetWords??2e3,n=8e3,r={styleProfile:Math.floor(n*.15),lorebook:Math.floor(n*.15),vectorContext:Math.floor(n*.25),narrativeContext:6e3,conversationSummary:Math.floor(n*.1),authorNote:Math.floor(n*.05),genreRules:Math.floor(n*.05),assetRoster:Math.floor(n*.05)},o=(s,a)=>a<=0?"":s.length<=a?s:s.slice(0,a-1)+"\u2026";let t=e.storyBible;if(e.styleProfile&&(t+=`

${o(e.styleProfile,r.styleProfile)}`),e.lorebook&&(t+=`

\u3010\u76F8\u5173\u4E16\u754C\u89C2\u8BCD\u6761\uFF08\u6309\u5173\u952E\u8BCD\u89E6\u53D1\u6CE8\u5165\uFF09\u3011
${o(e.lorebook,r.lorebook)}`),e.vectorContext&&(t+=`

\u3010\u76F8\u5173\u524D\u6587\u7247\u6BB5\uFF08\u5411\u91CF\u68C0\u7D22\u53EC\u56DE\uFF09\u3011
${o(e.vectorContext,r.vectorContext)}`),e.narrativeContext&&(t+=`

${o(e.narrativeContext,r.narrativeContext)}`),e.conversationSummary&&(t+=`

\u3010\u4F5C\u8005\u8FD1\u671F\u521B\u4F5C\u610F\u56FE\uFF08\u4ECE\u5BF9\u8BDD\u4E2D\u63D0\u53D6\uFF09\u3011
${o(e.conversationSummary,r.conversationSummary)}`),e.authorNote&&e.authorNote.trim()&&(t+=`

\u3010\u4F5C\u8005\u6279\u6CE8\uFF08\u4EC5\u5F71\u54CD\u672C\u7AE0\uFF0C\u4E0D\u6301\u4E45\u5316\uFF09\u3011
${o(e.authorNote.trim(),r.authorNote)}`),e.writingPreset&&e.writingPreset!=="default"){const s=U[e.writingPreset];s&&(t+=`

\u3010\u53D9\u4E8B\u8282\u594F\u6307\u5F15\u3011
${s}`)}if(e.genreRules&&e.genreRules.trim()&&(t+=`

\u3010\u521B\u4F5C\u89C4\u5219\u3011
${o(e.genreRules.trim(),r.genreRules)}`),e.assetRoster&&e.assetRoster.trim()&&(t+=`

\u3010\u5DF2\u767B\u8BB0\u8D44\u4EA7\u540D\u518C\u3011
${o(e.assetRoster.trim(),r.assetRoster)}`),T){const s=await g("scribe-skeleton",{chapter:String(e.chapter),storyBible:t,currentState:e.currentState,activeHooks:e.activeHooks,chapterOutline:e.chapterOutline,minWords:String(m),targetWords:String(f)}),{system:a,user:N}=h(s),W=[{role:"system",content:a},{role:"user",content:N}],l=await T.chat(W,c),v=l.content.trim();if(c?.signal?.aborted)throw new DOMException("aborted","AbortError");const C=await g("scribe-flesh",{chapter:String(e.chapter),storyBible:t,currentState:e.currentState,activeHooks:e.activeHooks,chapterOutline:e.chapterOutline,skeleton:v,minWords:String(m),targetWords:String(f)}),{system:O,user:x}=h(C),$=[{role:"system",content:O},{role:"user",content:x}],i=await S.chat($,c),G={promptTokens:(l.usage?.promptTokens??0)+(i.usage?.promptTokens??0),completionTokens:(l.usage?.completionTokens??0)+(i.usage?.completionTokens??0),totalTokens:(l.usage?.totalTokens??0)+(i.usage?.totalTokens??0)};return{narrative:i.content.trim(),skeleton:v,usage:G}}const b=await g("scribe",{chapter:String(e.chapter),storyBible:t,currentState:e.currentState,activeHooks:e.activeHooks,chapterOutline:e.chapterOutline,minWords:String(m),targetWords:String(f)}),{system:w,user:P}=h(b),M=[{role:"system",content:w},{role:"user",content:P}],R=await S.chat(M,c);return{narrative:R.content.trim(),usage:R.usage}}return{name:d,generate:E}}
