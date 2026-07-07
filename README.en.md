<p align="center">
  <a href="README.md">简体中文</a> · 
  <a href="README.en.md">English</a> · 
  <a href="README.ja.md">日本語</a> · 
  <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  <img src="docs/assets/banner-ai.png" alt="TavernOS — Ink Circuit" width="100%"/>
</p>

<h1 align="center">TavernOS</h1>

<p align="center">
  <strong>Ink Meets Circuit · Stories Come Alive</strong>
</p>

<p align="center">
  <em>AI Novel Writing Studio — Multi-Agent Narrative Engine</em>
</p>

<p align="center">
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/github/v/release/mvpdark/TavernOS-Publish?style=flat-square&color=D4AF37&label=Version" alt="Release"/>
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

---

> "Ink as brush, code as inkstone. Nine Agents flow like nine dragons, painting a single scroll."

TavernOS is a desktop AI novel writing studio that fuses character cards, world building, and a multi-agent narrative pipeline into a single creative environment. It ships with a 9-stage writing pipeline, a 13-module narrative engine, state-graph video generation, and a character chat system — all packaged in a cross-platform Electron desktop application.

## Table of Contents

- [Architecture](#architecture)
- [Core Features](#core-features)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Download](#download)
- [License](#license)

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## Architecture

<p align="center">
  <img src="docs/assets/architecture-ai.png" alt="TavernOS Interface" width="95%"/>
</p>

| Layer | Stage | Description |
|:---|:---|:---|
| **Input** | Character Cards | Character definitions: bonds, emotions, motivations, inner monologue |
| | World Building | Setting rules, geography, faction dynamics |
| | Story Bible | Outline, chapter beats, narrative arcs |
| | Lorebook | Keyword triggers + vector RAG retrieval |
| **Pipeline** | Architect | Chapter planning, scene splitting, pacing analysis |
| | Scribe | Style fingerprint + 9-layer context injection generation |
| | Sentinel | Continuity checks, hook density, Chinese number formatting |
| | Polisher | Targeted revision based on sentinel feedback |
| | Asset Extractor | Auto-extract characters/scenes/props + Fellegi-Sunter matching dedup |
| **Output** | Chapter | Dynamic word count (2K–8K/chapter), bidirectional control 95%–115% |
| | Video Pipeline | State graph: prompt → generate → review → reroll → compose |
| | Chat Engine | Roleplay + persona model + relationship tracking |
| | Export | Multi-format export + style preservation |

<details>
<summary>📖 Video Pipeline State Graph</summary>

```
START → prompt_enhance → generate → download → frame_check
                                         ↓
                                      review → (pass / reroll / fail)
                                                   ↓        ↓        ↓
                                              post_process  reroll   fail → END
```

- Supports 6 video generation providers (OpenAI, Yunwu, Seedance, etc.)
- LLM auto-generates improved prompts + rerolls
- SSIM frame detection quality control
- Character consistency checks (face embeddings)
- Lip-sync integration

</details>

---

## Core Features

| Module | Description |
|:---|:---|
| **Multi-Agent Writing** | 5-stage pipeline, each Agent with independent YAML prompts + independent error handling |
| **Character Engine** | 7 submodules: bond tracking, emotion engine, motivation stack, inner monologue, pacing guidance, epiphany system |
| **Narrative Context** | 9-layer memory: story bible, rules, current state, active hooks, narrative context, lorebook, vector RAG, recent chapters, dialogue summaries |
| **Asset Extraction** | Fellegi-Sunter probabilistic matching + 4-layer dedup defense + auto-normalization |
| **Video Pipeline** | State graph engine, 9 stages, 6 providers, auto reroll, character consistency, lip-sync |
| **Lorebook Engine** | Keyword trigger injection + vector RAG (minScore=0.3, topK=3, maxTokens=1500) |
| **Chat System** | Roleplay + persona model + relationship tracking + multi-character group chat |
| **Style Fingerprint** | Linguistic feature extraction, ensuring author voice consistency across AI-generated chapters |
| **Desktop App** | Electron 43, NSIS installer, auto-update checks, cross-platform |

---

## Quick Start

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
# Edit .env to configure the LLM provider:
# TAVERNOS_LLM_PROVIDER=custom
# TAVERNOS_LLM_BASE_URL=https://api.openai.com/v1
# TAVERNOS_LLM_API_KEY=sk-...
# TAVERNOS_LLM_MODEL=gpt-4o
```

<details>
<summary>🔧 Supported LLM Providers</summary>

| Provider | Base URL | Notes |
|:---|:---|:---|
| OpenAI | `https://api.openai.com/v1` | GPT-4o, GPT-4o-mini |
| Moonshot / Kimi | `https://api.moonshot.cn/v1` | moonshot-v1 series |
| Zhipu / GLM | `https://open.bigmodel.cn/api/paas/v4` | glm-4 series |
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat, deepseek-coder |
| Yunwu | `https://api.yunwu.ai/v1` | Multi-model proxy |
| Grok | OAuth + PKCE | xAI auto-refresh token |
| OpenRouter | `https://openrouter.ai/api/v1` | 100+ models |
| Ollama | `http://localhost:11434/v1` | Local models |

</details>

### Run

```bash
pnpm dev              # Development mode
pnpm electron:dev     # Electron desktop app
pnpm build            # Full build
```

### Docker

```bash
docker-compose up -d  # Or: docker build -t tavernos .
```

---

## Tech Stack

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

| Layer | Technology |
|:---|:---|
| **Language** | TypeScript (ESM, Zod validation) |
| **Frontend** | React 19, Tailwind CSS, Vite 7 |
| **Desktop** | Electron 43, NSIS installer |
| **Backend** | Hono (server), esbuild (bundling) |
| **Database** | better-sqlite3 |
| **AI/ML** | Multi-provider LLM abstraction layer, vector RAG |
| **Video** | FFmpeg, StateGraph pipeline, 6 providers |
| **Build** | pnpm workspaces, RC4 obfuscation to protect core IP |

---

## Repository Structure

> [!IMPORTANT]
> This repository is the **public release** of TavernOS. The core writing engine is distributed in compiled form to protect proprietary intellectual property.

| Component | Visibility | Path |
|:---|:---|:---|
| Frontend UI (React/Tailwind) | **Full source** | `packages/studio/` |
| Electron shell | **Full source** | `electron/` |
| Infrastructure (LLM, storage, types) | **Full source** | `packages/core/src/` |
| CLI tools | **Full source** | `packages/cli/` |
| Core writing engine | **Compiled JS** | `packages/core/dist/` |
| Server (API routes, RAG) | **Compiled JS** | `dist-server/index.js` |
| Docker configuration | **Full source** | `Dockerfile`, `docker-compose.yml` |

---

## Download

<p align="center">
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/badge/Windows-Download-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Download for Windows"/>
  </a>
  <br/>
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/badge/macOS_(Intel)-Download-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download for macOS Intel"/>
  </a>
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/badge/macOS_(Apple_Silicon)-Download-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download for macOS ARM"/>
  </a>
  <br/>
  <a href="https://github.com/mvpdark/TavernOS-Publish/pkgs/container/tavernos">
    <img src="https://img.shields.io/badge/Docker-Pull-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Pull Docker Image"/>
  </a>
</p>

> Download from [Releases](https://github.com/mvpdark/TavernOS-Publish/releases):
> - **Windows**: `TavernOS-Setup-x.x.x-x64.exe`
> - **macOS (Intel)**: `TavernOS-x.x.x-x64.dmg`
> - **macOS (Apple Silicon)**: `TavernOS-x.x.x-arm64.dmg`
>
> Docker: `docker pull ghcr.io/mvpdark/tavernos:latest`

---

## License

Copyright © 2026 mvpdark. All rights reserved.

| Component | License |
|:---|:---|
| Frontend, Electron, Infrastructure | **GPL v3** |
| Core writing engine | **Proprietary** |

See [LICENSE](LICENSE) for details.

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

<p align="center">
  <img src="docs/assets/seal-ai.png" alt="TavernOS Seal" width="100"/>
</p>

<p align="center">
  <sub><i>TavernOS · Where ink meets circuit</i></sub>
</p>
