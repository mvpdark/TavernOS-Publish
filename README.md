# TavernOS

> AI Novel Writing Studio - Craft immersive stories with a multi-agent AI writing pipeline.

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

## What is TavernOS?

TavernOS is a desktop application for AI-assisted novel writing. It features:

- **Character Management**: Detailed character cards, relationship tracking, personality systems
- **World Building**: Scene/location management, prop tracking, lorebook (encyclopedia)
- **AI Writing Pipeline**: Multi-agent system (Writer, Auditor, Reviser, Asset Extractor) for automated drafting and revision
- **Continuity Checking**: Automated fact extraction, timeline verification, hook tracking
- **Style Consistency**: Fingerprint-based style analysis to maintain author voice
- **Desktop App**: Electron-based native application for Windows/macOS/Linux

## Repository Notice

This repository is the **public distribution** of TavernOS. It contains:

| Component | Visibility |
|-----------|-----------|
| Frontend UI (React/Tailwind) | Full source |
| Electron shell | Full source |
| Infrastructure (LLM client, storage, types, i18n) | Full source |
| Core writing engine (agents, prompts, pipeline, narrative logic) | **Compiled/minified JS only** |

The core writing engine represents significant proprietary IP and is distributed in compiled form. Source code access is available to commercial licensees.

## Quick Start

```bash
# Install pnpm
npm install -g pnpm

# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build
```

## Configuration

Copy `.env.example` to `.env` and configure your LLM provider endpoints.

## License

Copyright (c) 2025 mvpdark. All rights reserved.

The UI, Electron shell, and infrastructure layers are released under GPL v3.
The core writing engine (compiled in `packages/core/dist/`) is proprietary software.
