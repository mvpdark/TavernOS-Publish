// packages/cli/src/commands/init.ts
// `tavernos init <name>` — scaffold a new writing project.
import { join } from "node:path";
import { promises as fs } from "node:fs";
import { EMPTY_BLUEPRINT, providerRegistry, } from "@tavernos/core";
import { ensureDir, writeJson, CONFIG_FILE, BOOKS_DIR, PERSONAS_DIR, info, success, error, } from "../context.js";
/** Build a default LLMConfig for a new project. */
function buildDefaultLLM(opts) {
    const service = opts.service ?? "deepseek";
    const svc = providerRegistry.get(service);
    // Pick the first model from the service config, or use the explicit flag
    const model = opts.model ??
        svc?.models[0]?.id ??
        "deepseek-chat";
    const baseUrl = opts.baseUrl ?? svc?.baseUrl ?? "";
    const apiKey = opts.apiKey ?? "";
    const temperature = opts.temperature
        ? Number.parseFloat(opts.temperature)
        : 0.7;
    // Validate temperature: must be a number in [0, 2].
    if (Number.isNaN(temperature) || temperature < 0 || temperature > 2) {
        error("温度参数必须是 0 到 2 之间的数字");
        process.exit(1);
    }
    return {
        provider: svc?.provider ?? "openai",
        service,
        configSource: "env",
        baseUrl,
        apiKey,
        model,
        temperature,
        thinkingBudget: 0,
        apiFormat: svc?.apiFormat ?? "chat",
        stream: true,
    };
}
// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------
export function registerInitCommand(program) {
    program
        .command("init <name>")
        .description("初始化一个新的写作项目")
        .option("-s, --service <service>", "LLM 服务 (deepseek, openai, anthropic, ...)")
        .option("-m, --model <model>", "模型名称")
        .option("-k, --api-key <key>", "API 密钥")
        .option("-u, --base-url <url>", "自定义 API 地址")
        .option("-l, --language <lang>", "写作语言 (zh, en)", "zh")
        .option("-t, --temperature <temp>", "温度参数 (0-2)")
        .action(async (name, opts) => {
        await runInit(name, opts);
    });
}
// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------
async function runInit(name, opts) {
    const projectDir = join(process.cwd(), name);
    // Check if directory already exists
    try {
        await fs.access(projectDir);
        error(`目录已存在: ${projectDir}`);
        process.exit(1);
    }
    catch {
        // Directory does not exist — proceed
    }
    info(`正在创建项目: ${name}`);
    // Create directory structure
    await ensureDir(projectDir);
    await ensureDir(join(projectDir, BOOKS_DIR));
    await ensureDir(join(projectDir, PERSONAS_DIR));
    // Build project config
    const config = {
        name,
        version: "0.1.0",
        language: opts.language ?? "zh",
        // Work type / genre / blueprint — required by ProjectConfigSchema.
        // CLI init creates a plain long-form novel with an empty blueprint; the
        // Studio wizard collects richer blueprint data via the AI consultant chat.
        type: "long",
        genre: "",
        blueprint: EMPTY_BLUEPRINT,
        llm: buildDefaultLLM(opts),
        notify: [],
        foundation: { reviewRetries: 2 },
        writing: { reviewMode: "auto", reviewRetries: 1 },
    };
    await writeJson(join(projectDir, CONFIG_FILE), config);
    success(`项目已创建: ${projectDir}`);
    info("");
    info("配置文件: tavernos.json");
    info("目录结构:");
    info("  books/     — 书籍目录");
    info("  personas/  — 角色卡目录");
    info("");
    info("下一步:");
    info(`  cd ${name}`);
    info("  tavernos book create <标题>  — 创建第一本书");
}
//# sourceMappingURL=init.js.map