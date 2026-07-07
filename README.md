<p align="center">
  <img src="docs/assets/banner-ai.png" alt="TavernOS — Ink Circuit" width="100%"/>
</p>

<h1 align="center" style="color: #D4AF37;">TavernOS</h1>

<p align="center">
  <strong style="color: #D4AF37;">墨韵万象 · 智绘奇境</strong>
</p>

<p align="center">
  <em>AI Novel Writing Studio — Multi-Agent Narrative Engine</em>
</p>

<p align="center">
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/github/v/release/mvpdark/TavernOS-Publish?style=flat-square&color=D4AF37&label=%E7%89%88%E6%9C%AC" alt="Release"/>
  </a>
  <a href="https://github.com/mvpdark/TavernOS-Publish/stargazers">
    <img src="https://img.shields.io/github/stars/mvpdark/TavernOS-Publish?style=flat-square&color=D4AF37" alt="Stars"/>
  </a>
  <a href="https://github.com/mvpdark/TavernOS-Publish/network/members">
    <img src="https://img.shields.io/github/forks/mvpdark/TavernOS-Publish?style=flat-square&color=4A7C59" alt="Forks"/>
  </a>
  <a href="https://github.com/mvpdark/TavernOS-Publish/issues">
    <img src="https://img.shields.io/github/issues/mvpdark/TavernOS-Publish?style=flat-square&color=C0392B" alt="Issues"/>
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/mvpdark/TavernOS-Publish?style=flat-square&color=2C3E50" alt="License"/>
  </a>
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/github/downloads/mvpdark/TavernOS-Publish/total?style=flat-square&color=D4AF37" alt="Downloads"/>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-43-4A7C59?style=flat-square&logo=electron&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/Node.js-≥20-339933?style=flat-square&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/pnpm-11-F69220?style=flat-square&logo=pnpm&logoColor=white"/>
</p>

<br/>

> 「以墨为笔，以码为砚。九段 Agent 如九龙治水，共绘一卷。」

TavernOS is a desktop AI novel writing studio that fuses character cards, world-building, and a multi-agent narrative pipeline into a single creative environment. It features a 9-stage writing pipeline, a 13-module narrative engine, state-graph video generation, and a character interaction system — all wrapped in a cross-platform Electron desktop app.

<br/>

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 系统架构 · Architecture

<p align="center">
  <img src="docs/assets/architecture-ai.png" alt="System Architecture — Ink Circuit" width="95%"/>
</p>

<br/>

| Layer | Stage | Description |
|:---|:---|:---|
| **Input** · 输入 | Character Cards · 角色卡 | Persona definitions with bonds, moods, motives, inner voice |
| | World Building · 世界观 | Setting rules, geography, faction dynamics |
| | Story Bible · 故事圣经 | Plot outline, chapter beats, narrative arc |
| | Lorebook · 知识库 | Keyword-triggered world info with vector RAG retrieval |
| **Pipeline** · 流水线 | Architect · 架构师 | Chapter planning, scene breakdown, pacing analysis |
| | Writer · 执笔 | Content generation with style fingerprint and 9-layer context |
| | Auditor · 审核 | Continuity check, hook density, Chinese number formatting |
| | Reviser · 修订 | Targeted revision based on auditor feedback |
| | Asset Extractor · 资产提取 | Auto-extract characters/scenes/props with Fellegi-Sunter matching |
| **Output** · 输出 | Chapter · 章节 | Polished prose with dynamic word count (2K–8K per chapter) |
| | Video Pipeline · 视频流水线 | State graph: prompt → generate → review → reroll → compose |
| | Chat Engine · 对话引擎 | Character roleplay with personality models |
| | Export · 导出 | Multiple formats with style preservation |

<br/>

<details>
<summary>📖 Video Pipeline State Graph</summary>

<br/>

```
START → prompt_enhance → generate → download → frame_check
                                         ↓
                                      review → (pass / reroll / fail)
                                                   ↓        ↓        ↓
                                              post_process  reroll   fail → END
```

- 6 video providers supported (OpenAI, Yunwu, Seedance, etc.)
- Auto-reroll with LLM-generated improved prompts
- SSIM frame checking for quality control
- Character consistency check with face embedding
- Lip sync integration

</details>

<br/>

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 核心功能 · Core Features

| Module | Description |
|:---|:---|
| **Multi-Agent Writing** · 多智能体写作 | 5-stage pipeline with dedicated YAML prompts and independent error handling per agent |
| **Character Engine** · 角色引擎 | 7 sub-modules: bond tracker, mood engine, motive stack, inner voice, pace director, epiphany system |
| **Narrative Context** · 叙事上下文 | 9-layer memory: story bible, book rules, current state, active hooks, narrative context, lorebook, vector RAG, recent chapters, conversation summary |
| **Asset Extraction** · 资产提取 | Fellegi-Sunter probabilistic matching with 4-layer deduplication defense and auto-normalization |
| **Video Pipeline** · 视频流水线 | State graph engine with 9 stages, 6 providers, auto-reroll, character consistency, lip sync |
| **Lorebook Engine** · 知识库引擎 | Keyword-triggered injection with vector RAG (minScore=0.3, topK=3, maxTokens=1500) |
| **Chat System** · 对话系统 | Character roleplay with personality models, relationship tracking, multi-character group chat |
| **Style Fingerprint** · 风格指纹 | Linguistic feature extraction for consistent author voice across AI-generated chapters |
| **Desktop App** · 桌面应用 | Electron 43, NSIS installer, auto-update checking, cross-platform |

<br/>

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 快速开始 · Quick Start

### Install

```bash
npm install -g pnpm
git clone https://github.com/mvpdark/TavernOS-Publish.git
cd TavernOS-Publish
pnpm install
```

### Configure

```bash
cp .env.example .env
# Edit .env with your LLM provider:
# TAVERNOS_LLM_PROVIDER=custom
# TAVERNOS_LLM_BASE_URL=https://api.openai.com/v1
# TAVERNOS_LLM_API_KEY=sk-...
# TAVERNOS_LLM_MODEL=gpt-4o
```

<details>
<summary>🔧 Supported LLM Providers</summary>

<br/>

| Provider | Base URL | Note |
|:---|:---|:---|
| OpenAI | `https://api.openai.com/v1` | GPT-4o, GPT-4o-mini |
| Moonshot / Kimi | `https://api.moonshot.cn/v1` | moonshot-v1 series |
| Zhipu / GLM | `https://open.bigmodel.cn/api/paas/v4` | glm-4 series |
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat, deepseek-coder |
| Yunwu | `https://api.yunwu.ai/v1` | Multi-model proxy |
| Grok | OAuth + PKCE | xAI with auto-refresh |
| OpenRouter | `https://openrouter.ai/api/v1` | 100+ models |
| Ollama | `http://localhost:11434/v1` | Local models |

</details>

### Run

```bash
pnpm dev              # Development mode
pnpm electron:dev     # Electron desktop app
pnpm build            # Build everything
```

### Docker

```bash
docker-compose up -d  # Or: docker build -t tavernos .
```

<br/>

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 技术栈 · Tech Stack

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" height="36" alt="TypeScript"/>
  <img width="12"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" height="36" alt="React"/>
  <img width="12"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/electron/electron-original.svg" height="36" alt="Electron"/>
  <img width="12"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" height="36" alt="Node.js"/>
  <img width="12"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" height="36" alt="Vite"/>
  <img width="12"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" height="36" alt="Docker"/>
  <img width="12"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg" height="36" alt="SQLite"/>
  <img width="12"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pnpm/pnpm-original.svg" height="36" alt="pnpm"/>
</p>

<br/>

| Layer | Technology |
|:---|:---|
| **Language** | TypeScript (ESM, Zod validation) |
| **Frontend** | React 19, Tailwind CSS, Vite 7 |
| **Desktop** | Electron 43, NSIS installer |
| **Backend** | Hono (server), esbuild (bundler) |
| **Database** | better-sqlite3 |
| **AI/ML** | Multi-provider LLM abstraction, Vector RAG |
| **Video** | FFmpeg, StateGraph pipeline, 6 providers |
| **Build** | pnpm workspaces, RC4 obfuscation for core IP |

<br/>

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 仓库结构 · Repository

> [!IMPORTANT]
> This is the **public distribution** of TavernOS. The core writing engine is distributed in compiled form to protect proprietary IP.

| Component | Visibility | Path |
|:---|:---|:---|
| Frontend UI (React/Tailwind) | **Full source** | `packages/studio/` |
| Electron shell | **Full source** | `electron/` |
| Infrastructure (LLM, storage, types) | **Full source** | `packages/core/src/` |
| CLI tools | **Full source** | `packages/cli/` |
| Core writing engine | **Compiled JS** | `packages/core/dist/` |
| Server (API routes, RAG) | **Compiled JS** | `dist-server/index.js` |
| Docker configs | **Full source** | `Dockerfile`, `docker-compose.yml` |

<br/>

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 下载 · Download

<p align="center">
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/badge/Windows-Download-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Download for Windows"/>
  </a>
</p>

> Download `TavernOS-Setup-x.x.x-x64.exe` from [Releases](https://github.com/mvpdark/TavernOS-Publish/releases). Auto-update checking is built in.

<br/>

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 许可证 · License

Copyright © 2026 mvpdark. All rights reserved.

| Component | License |
|:---|:---|
| Frontend, Electron, Infrastructure | **GPL v3** |
| Core writing engine | **Proprietary** |

See [LICENSE](LICENSE) for details.

<br/>

<p align="center">
  <img src="docs/assets/seal-ai.png" alt="TavernOS Seal" width="100"/>
</p>

<p align="center">
  <sub><i>酒馆系统 · TavernOS</i></sub><br/>
  <sub><i>以墨为笔，以码为砚</i></sub>
</p>
