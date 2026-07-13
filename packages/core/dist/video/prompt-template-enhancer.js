import{getTemplateById as p,recommendTemplates as m}from"./prompt-templates.js";export function enhancePromptWithTemplate(e){if(!e.templateId)return e.clip.prompt;const t=p(e.templateId);if(!t)return e.clip.prompt;const r=[e.clip.prompt];return t.visualPrompt&&!e.clip.prompt.includes(t.visualPrompt)&&r.push(t.visualPrompt),t.actingPrompt&&r.push(`\u8868\u6F14\u6307\u5BFC: ${t.actingPrompt}`),r.join(`

`)}export function getTemplateForShot(e){return m({emotion:e.emotion,sceneType:e.sceneType,characterCount:e.characterCount,shotType:e.shotType,cameraMovement:e.cameraMovement})[0]}
