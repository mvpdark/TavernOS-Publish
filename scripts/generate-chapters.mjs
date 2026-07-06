/**
 * 独立章节生成脚本 - 直接调用StoryOrchestrator生成3章新内容
 * 用于验证Humanize优化效果
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 项目路径
const PROJECT_ROOT = "C:\\Users\\mvpdark\\.tavernos\\projects\\星陨之塔";

async function main() {
  // 动态导入core包
  const core = await import("@tavernos/core");
  const {
    StoryOrchestrator,
    createLLMClient,
    ProjectConfigSchema,
    loadPrompt,
  } = core;

  // 读取项目配置
  const fs = await import("node:fs/promises");
  const configPath = resolve(PROJECT_ROOT, "tavernos.json");
  const rawConfig = JSON.parse(await fs.readFile(configPath, "utf-8"));
  
  // 验证配置
  const parseResult = ProjectConfigSchema.safeParse(rawConfig);
  if (!parseResult.success) {
    console.error("配置验证失败:", parseResult.error.issues);
    process.exit(1);
  }
  const config = parseResult.data;
  
  console.log("═".repeat(60));
  console.log(`  书籍: ${config.name}`);
  console.log(`  类型: ${config.genre}`);
  console.log(`  语言: ${config.language}`);
  console.log("═".repeat(60));
  
  // 创建LLM客户端
  const llmConfig = config.llm;
  console.log(`\nLLM配置:`);
  console.log(`  Provider: ${llmConfig.provider}`);
  console.log(`  BaseURL: ${llmConfig.baseUrl}`);
  console.log(`  Model: ${llmConfig.defaultModel || llmConfig.model}`);
  console.log(`  Stream: ${llmConfig.stream}`);
  
  // 创建客户端
  const client = createLLMClient({
    apiKey: llmConfig.apiKey,
    baseUrl: llmConfig.baseUrl,
    model: llmConfig.defaultModel || llmConfig.model,
    stream: llmConfig.stream,
    provider: llmConfig.provider,
    apiFormat: llmConfig.apiFormat,
    temperature: llmConfig.temperature,
  });
  
  const model = llmConfig.defaultModel || llmConfig.model;
  
  // 读取已有章节，确定下一章编号
  const storyDir = resolve(PROJECT_ROOT, "story");
  const chapterFiles = (await fs.readdir(storyDir))
    .filter(f => f.startsWith("chapter-") && f.endsWith(".json"));
  
  console.log(`\n已有章节: ${chapterFiles.length} 章`);
  
  // 读取最后一章作为上下文
  let lastChapter = null;
  if (chapterFiles.length > 0) {
    const lastFile = chapterFiles[chapterFiles.length - 1];
    const lastData = JSON.parse(await fs.readFile(resolve(storyDir, lastFile), "utf-8"));
    lastChapter = lastData;
    console.log(`最后一章: 第${lastData.order}章 - ${lastData.title}`);
  }
  
  // 读取故事状态
  const statePath = resolve(PROJECT_ROOT, "story-state.json");
  let storyState = null;
  try {
    storyState = JSON.parse(await fs.readFile(statePath, "utf-8"));
    console.log(`故事状态: 已加载`);
  } catch {
    console.log(`故事状态: 未找到`);
  }
  
  // 读取故事圣经
  const biblePath = resolve(PROJECT_ROOT, "story-bible.md");
  let storyBible = "";
  try {
    storyBible = await fs.readFile(biblePath, "utf-8");
    console.log(`故事圣经: ${storyBible.length} 字符`);
  } catch {
    console.log(`故事圣经: 未找到`);
  }
  
  // 读取角色卡
  const charDir = resolve(PROJECT_ROOT, "characters");
  let characters = "";
  try {
    const charFiles = await fs.readdir(charDir);
    for (const f of charFiles) {
      if (f.endsWith(".json")) {
        const charData = JSON.parse(await fs.readFile(resolve(charDir, f), "utf-8"));
        characters += `### ${charData.name || f}\n${JSON.stringify(charData, null, 2).slice(0, 500)}\n\n`;
      }
    }
    console.log(`角色卡: ${charFiles.length} 个`);
  } catch {
    console.log(`角色卡: 未找到`);
  }
  
  // 构建Agent上下文
  const bookId = "星陨之塔";
  const agentCtx = {
    client,
    model,
    projectRoot: PROJECT_ROOT,
    bookId,
  };
  
  // 创建Orchestrator
  const orchestrator = new StoryOrchestrator(agentCtx);
  
  // 3章的大纲
  const outlines = [
    "林轩在第十三层试炼中发现星陨之塔的真相——塔并非试炼场，而是灵界收割器。玄叟的隐瞒被揭穿，林轩面临是否继续攀登的抉择。苏晚晴的家族咒印出现异常反应。",
    "林轩决定暂时退出星陨之塔，回到现实世界消化真相。然而塔的意志开始影响现实，云汐市出现异变。陆沉舟带来关于开塔派的新情报，三人关系面临考验。",
    "林轩重返星陨之塔第十四层，这次他带着对塔本质的新认知。第十四层的试炼不再是战斗，而是一场关于记忆与选择的考验。苏晚晴主动承受咒印反噬来帮助林轩。",
  ];
  
  const startChapter = (lastChapter?.order || 0) + 1;
  
  for (let i = 0; i < 3; i++) {
    const chapterNum = startChapter + i;
    console.log("\n" + "═".repeat(60));
    console.log(`  开始生成第 ${chapterNum} 章`);
    console.log(`  大纲: ${outlines[i].slice(0, 50)}...`);
    console.log("═".repeat(60));
    
    const startTime = Date.now();
    
    try {
      // 构建writer input
      const writerInput = {
        chapter: {
          number: chapterNum,
          title: `第${chapterNum}章`,
          outline: outlines[i],
        },
        storyBible: storyBible || "玄幻世界，星陨之塔99层试炼",
        currentState: storyState?.currentState || "",
        activeHooks: storyState?.activeHooks || "",
        chapterOutline: outlines[i],
        targetWords: 3000,
        minWords: 2000,
        language: "zh",
        genre: config.genre,
      };
      
      // 运行章节生成
      const result = await orchestrator.runChapter({
        writerInput,
        auditMode: "auto",
        storyContext: {
          storyBible: storyBible || "",
          currentState: storyState?.currentState || "",
          activeHooks: storyState?.activeHooks || "",
          chapterSummaries: "",
          genre: config.genre,
        },
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const narrative = result.revisedNarrative || result.narrative;
      const wordCount = narrative.replace(/[^\u4e00-\u9fff]/g, "").length;
      
      console.log(`\n✅ 第 ${chapterNum} 章生成完成 (${elapsed}s)`);
      console.log(`   字数: ${wordCount}`);
      console.log(`   降级: ${result.degraded ? "是" : "否"}`);
      console.log(`   审核问题: ${result.auditIssues?.length || 0} 个`);
      if (result.auditIssues?.length > 0) {
        for (const issue of result.auditIssues.slice(0, 5)) {
          console.log(`   - [${issue.severity}] ${issue.dimension}: ${issue.message?.slice(0, 60)}`);
        }
      }
      console.log(`   修订: ${result.revisedNarrative ? "是" : "否"}`);
      console.log(`   架构: ${result.architecture ? "是" : "否"}`);
      
      // 保存章节
      const chapterData = {
        order: chapterNum,
        title: `第${chapterNum}章`,
        content: narrative,
        status: result.degraded ? "state-degraded" : (result.auditIssues?.length === 0 ? "audit-passed" : "drafted"),
        bookId,
        intent: outlines[i],
        wordCount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auditIssues: result.auditIssues?.map(i => i.message) || [],
        lengthWarnings: [],
        isOptimizedVersion: true, // 标记为优化后版本
      };
      
      const chapterPath = resolve(storyDir, `chapter-opt-${chapterNum}-${Date.now()}.json`);
      await fs.writeFile(chapterPath, JSON.stringify(chapterData, null, 2), "utf-8");
      console.log(`   已保存: ${chapterPath}`);
      
      // 打印前500字预览
      console.log(`\n   📝 内容预览:`);
      console.log("   " + "─".repeat(56));
      const preview = narrative.slice(0, 500).replace(/\n/g, "\n   ");
      console.log("   " + preview);
      console.log("   " + "─".repeat(56));
      
      // AI腔检查
      const aiTerms = [
        "喉头发紧", "指节发白", "如潮水般", "心理活动如潮水",
        "深吸一口气", "银白丝线", "焦糊味", "化作灰烬",
        "悬念钩子", "章节钩子", "短句加速", "本章完",
        "faint", "马拉松"
      ];
      let aiHits = 0;
      const hitTerms = [];
      for (const term of aiTerms) {
        const count = narrative.split(term).length - 1;
        if (count > 0) {
          aiHits += count;
          hitTerms.push(`${term}(${count})`);
        }
      }
      console.log(`\n   🔍 AI腔检查: ${aiHits === 0 ? "✅ 未检测到AI标记词" : `⚠️ 发现 ${aiHits} 处: ${hitTerms.join(", ")}`}`);
      
    } catch (err) {
      console.error(`\n❌ 第 ${chapterNum} 章生成失败:`, err.message);
      console.error(err.stack?.slice(0, 500));
    }
  }
  
  console.log("\n" + "═".repeat(60));
  console.log("  生成完成！");
  console.log("═".repeat(60));
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
