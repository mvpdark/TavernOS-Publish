import{getTemplateById as p,recommendTemplates as m}from"./prompt-templates.js";export function enhancePromptWithTemplate(t){if(!t.templateId)return t.clip.prompt;const e=p(t.templateId);if(!e)return t.clip.prompt;const r=[t.clip.prompt];return e.visualPrompt&&!t.clip.prompt.includes(e.visualPrompt)&&r.push(e.visualPrompt),e.actingPrompt&&r.push(`\u8868\u6F14\u6307\u5BFC: ${e.actingPrompt}`),r.join(`

`)}export function getTemplateForShot(t){return m({emotion:t.emotion,sceneType:t.sceneType,characterCount:t.characterCount})[0]}
