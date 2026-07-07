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
  <strong>墨韻万象 · 知絵奇境</strong>
</p>

<p align="center">
  <em>AI 小説創作スタジオ — マルチエージェント叙事エンジン</em>
</p>

<p align="center">
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/github/v/release/mvpdark/TavernOS-Publish?style=flat-square&color=D4AF37&label=バージョン" alt="Release"/>
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

> 「墨を筆とし、コードを硯とす。九段のエージェント、九龍の如く水を治め、一巻を共に描く。」

TavernOS はデスクトップ向け AI 小説創作スタジオであり、キャラクターカード、世界観構築、マルチエージェント叙事パイプラインを一つの創作環境に統合しています。9 段階の執筆パイプライン、13 モジュールの叙事エンジン、状態図ベースの動画生成、キャラクター対話システムを備え、すべてがクロスプラットフォームの Electron デスクトップアプリとしてパッケージ化されています。

## 目次

- [システムアーキテクチャ](#システムアーキテクチャ)
- [コア機能](#コア機能)
- [クイックスタート](#クイックスタート)
- [技術スタック](#技術スタック)
- [リポジトリ構造](#リポジトリ構造)
- [ダウンロード](#ダウンロード)
- [ライセンス](#ライセンス)

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## システムアーキテクチャ

<p align="center">
  <img src="docs/assets/architecture-ai.png" alt="TavernOS Interface" width="95%"/>
</p>

| レイヤー | フェーズ | 説明 |
|:---|:---|:---|
| **入力** | キャラクターカード Character Cards | キャラクター定義：絆、感情、動機、内なる独白 |
| | 世界観構築 World Building | 設定ルール、地理、陣営ダイナミクス |
| | ストーリーバイブル Story Bible | 大綱、章のビート、叙事アーク |
| | ロアブック Lorebook | キーワードトリガー + ベクトル RAG 検索 |
| **パイプライン** | アーキテクト Architect | 章の計画、シーン分割、テンポ分析 |
| | 筆写人 Scribe | スタイル指紋 + 9 層コンテキスト注入による生成 |
| | 検査官 Sentinel | 連続性チェック、フック密度、中国語数字フォーマット |
| | 磨師 Polisher | 検査フィードバックに基づく的確な改訂 |
| | アセット抽出 Asset Extractor | キャラクター / シーン / 小道具の自動抽出 + Fellegi-Sunter マッチングによる重複排除 |
| **出力** | 章 Chapter | 動的文字数（2K〜8K / 章）、双方向制御 95%〜115% |
| | ビデオパイプライン Video Pipeline | 状態図：プロンプト → 生成 → 監査 → 再生成 → 合成 |
| | チャットエンジン Chat Engine | ロールプレイ + パーソナリティモデル + 関係性追跡 |
| | エクスポート Export | 多形式エクスポート + スタイル維持 |

<details>
<summary>📖 ビデオパイプライン状態図</summary>

```
START → prompt_enhance → generate → download → frame_check
                                         ↓
                                      review → (pass / reroll / fail)
                                                   ↓        ↓        ↓
                                              post_process  reroll   fail → END
```

- 6 社の動画生成プロバイダーに対応（OpenAI、Yunwu、Seedance など）
- LLM によるプロンプト自動生成・改善 + 再生成
- SSIM フレーム検出による品質管理
- キャラクター一貫性チェック（顔特徴量埋め込み）
- リップシンク統合

</details>

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## コア機能

| モジュール | 説明 |
|:---|:---|
| **マルチエージェント執筆** | 5 段階パイプライン、各エージェントは独立した YAML プロンプト + 独立したエラーハンドリングを備える |
| **キャラクターエンジン** | 7 サブモジュール：絆追跡、感情エンジン、動機スタック、内なる独白、テンポ指揮、エピファニーシステム |
| **叙事コンテキスト** | 9 層メモリ：ストーリーバイブル、ルール、現在状態、アクティブフック、叙事コンテキスト、ロアブック、ベクトル RAG、直近の章、対話要約 |
| **アセット抽出** | Fellegi-Sunter 確率マッチング + 4 層重複排除防御 + 自動正規化 |
| **ビデオパイプライン** | 状態図エンジン、9 段階、6 社プロバイダー、自動再生成、キャラクター一貫性、リップシンク |
| **ロアブックエンジン** | キーワードトリガー注入 + ベクトル RAG（minScore=0.3, topK=3, maxTokens=1500） |
| **対話システム** | ロールプレイ + パーソナリティモデル + 関係性追跡 + 多人グループチャット |
| **スタイル指紋** | 言語特徴量抽出、AI 生成章の著者声の一貫性を確保 |
| **デスクトップアプリ** | Electron 43、NSIS インストーラー、自動更新チェック、クロスプラットフォーム |

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## クイックスタート

### インストール

```bash
npm install -g pnpm
git clone https://github.com/mvpdark/TavernOS-Publish.git
cd TavernOS-Publish
pnpm install
```

### 設定

```bash
cp .env.example .env
# .env を編集して LLM プロバイダーを設定：
# TAVERNOS_LLM_PROVIDER=custom
# TAVERNOS_LLM_BASE_URL=https://api.openai.com/v1
# TAVERNOS_LLM_API_KEY=sk-...
# TAVERNOS_LLM_MODEL=gpt-4o
```

<details>
<summary>🔧 対応 LLM プロバイダー</summary>

| プロバイダー | Base URL | 説明 |
|:---|:---|:---|
| OpenAI | `https://api.openai.com/v1` | GPT-4o, GPT-4o-mini |
| Moonshot / Kimi | `https://api.moonshot.cn/v1` | moonshot-v1 シリーズ |
| Zhipu / GLM | `https://open.bigmodel.cn/api/paas/v4` | glm-4 シリーズ |
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat, deepseek-coder |
| Yunwu | `https://api.yunwu.ai/v1` | マルチモデルプロキシ |
| Grok | OAuth + PKCE | xAI 自動トークン更新 |
| OpenRouter | `https://openrouter.ai/api/v1` | 100+ モデル |
| Ollama | `http://localhost:11434/v1` | ローカルモデル |

</details>

### 実行

```bash
pnpm dev              # 開発モード
pnpm electron:dev     # Electron デスクトップアプリ
pnpm build            # フルビルド
```

### Docker

```bash
docker-compose up -d  # または：docker build -t tavernos .
```

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 技術スタック

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

| レイヤー | 技術 |
|:---|:---|
| **言語** | TypeScript（ESM, Zod バリデーション） |
| **フロントエンド** | React 19, Tailwind CSS, Vite 7 |
| **デスクトップ** | Electron 43, NSIS インストーラー |
| **バックエンド** | Hono（サーバー）, esbuild（バンドル） |
| **データベース** | better-sqlite3 |
| **AI/ML** | マルチプロバイダー LLM 抽象レイヤー, ベクトル RAG |
| **動画** | FFmpeg, StateGraph パイプライン, 6 社プロバイダー |
| **ビルド** | pnpm workspaces, RC4 難読化によるコア IP 保護 |

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## リポジトリ構造

> [!IMPORTANT]
> 本リポジトリは TavernOS の**公開配布版**です。コア執筆エンジンは独自の知的財産権を保護するため、コンパイル済み形式で配布されています。

| コンポーネント | 可視性 | パス |
|:---|:---|:---|
| フロントエンド UI（React/Tailwind） | **完全ソース** | `packages/studio/` |
| Electron シェル | **完全ソース** | `electron/` |
| インフラ（LLM、ストレージ、型） | **完全ソース** | `packages/core/src/` |
| CLI ツール | **完全ソース** | `packages/cli/` |
| コア執筆エンジン | **コンパイル JS** | `packages/core/dist/` |
| サーバー（API ルート、RAG） | **コンパイル JS** | `dist-server/index.js` |
| Docker 設定 | **完全ソース** | `Dockerfile`, `docker-compose.yml` |

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## ダウンロード

<p align="center">
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/badge/Windows-ダウンロード-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Download for Windows"/>
  </a>
  <br/>
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/badge/macOS_(Intel)-ダウンロード-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download for macOS Intel"/>
  </a>
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/badge/macOS_(Apple_Silicon)-ダウンロード-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download for macOS ARM"/>
  </a>
  <br/>
  <a href="https://github.com/mvpdark/TavernOS-Publish/pkgs/container/tavernos">
    <img src="https://img.shields.io/badge/Docker-プル-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Pull Docker Image"/>
  </a>
</p>

> [Releases](https://github.com/mvpdark/TavernOS-Publish/releases) からダウンロード：
> - **Windows**: `TavernOS-Setup-x.x.x-x64.exe`
> - **macOS (Intel)**: `TavernOS-x.x.x-x64.dmg`
> - **macOS (Apple Silicon)**: `TavernOS-x.x.x-arm64.dmg`
>
> Docker: `docker pull ghcr.io/mvpdark/tavernos:latest`

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## ライセンス

Copyright © 2026 mvpdark. All rights reserved.

| コンポーネント | ライセンス |
|:---|:---|
| フロントエンド、Electron、インフラ | **GPL v3** |
| コア執筆エンジン | **専有** |

詳細は [LICENSE](LICENSE) を参照してください。

<p align="center">
  <img src="docs/assets/seal-ai.png" alt="TavernOS Seal" width="100"/>
</p>

<p align="center">
  <sub><i>TavernOS</i></sub><br/>
  <sub><i>墨を筆とし、コードを硯とす</i></sub>
</p>
