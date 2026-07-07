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
  <strong>묵운만상 · 지회기경</strong>
</p>

<p align="center">
  <em>AI 소설 창작 스튜디오 — 멀티 에이전트 서사 엔진</em>
</p>

<p align="center">
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/github/v/release/mvpdark/TavernOS-Publish?style=flat-square&color=D4AF37&label=버전" alt="Release"/>
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

> 「먹을 붓으로, 코드를 벼루로. 구단 에이전트 구룡치수, 한 권을 함께 그리노라.」

TavernOS는 데스크톱 기반 AI 소설 창작 스튜디오로, 캐릭터 카드, 세계관 구축, 그리고 멀티 에이전트 서사 파이프라인을 하나의 통합된 창작 환경으로 융합합니다. 9단계 라이팅 파이프라인, 13개 모듈 서사 엔진, 상태 그래프 기반 비디오 생성 및 캐릭터 대화 시스템을 포함하며, 모두 크로스 플랫폼 Electron 데스크톱 애플리케이션으로 패키징되어 있습니다.

## 목차

- [시스템 아키텍처](#시스템-아키텍처)
- [핵심 기능](#핵심-기능)
- [빠른 시작](#빠른-시작)
- [기술 스택](#기술-스택)
- [저장소 구조](#저장소-구조)
- [다운로드](#다운로드)
- [라이선스](#라이선스)

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 시스템 아키텍처

<p align="center">
  <img src="docs/assets/architecture-ai.png" alt="TavernOS Interface" width="95%"/>
</p>

| 레이어 | 단계 | 설명 |
|:---|:---|:---|
| **입력** | 캐릭터 카드 Character Cards | 캐릭터 정의: 유대감, 감정, 동기, 내면 독백 |
| | 세계관 구축 World Building | 설정 규칙, 지리, 세력 역학 |
| | 스토리 바이블 Story Bible | 개요, 챕터 비트, 서사 호 |
| | 로어북 Lorebook | 키워드 트리거 + 벡터 RAG 검색 |
| **파이프라인** | 아키텍트 Architect | 챕터 기획, 장면 분할, 페이스 분석 |
| | 라이터 Writer | 스타일 지문 + 9계층 컨텍스트 주입 생성 |
| | 감사 Auditor | 연속성 검사, 훅 밀도, 한자 숫자 포맷 |
| | 수정 Reviser | 감사 피드백 기반 정밀 수정 |
| | 에셋 추출 Asset Extractor | 캐릭터/장면/소품 자동 추출 + Fellegi-Sunter 매칭 중복 제거 |
| **출력** | 챕터 Chapter | 동적 글자 수 (2K–8K/챕터), 양방향 제어 95%–115% |
| | 비디오 파이프라인 Video Pipeline | 상태 그래프: 프롬프트 → 생성 → 감사 → 재생성 → 합성 |
| | 채팅 엔진 Chat Engine | 롤플레이 + 인격 모델 + 관계 추적 |
| | 내보내기 Export | 다중 포맷 내보내기 + 스타일 유지 |

<details>
<summary>📖 비디오 파이프라인 상태 그래프</summary>

```
START → prompt_enhance → generate → download → frame_check
                                         ↓
                                      review → (pass / reroll / fail)
                                                   ↓        ↓        ↓
                                              post_process  reroll   fail → END
```

- 6개 비디오 생성 공급자 지원 (OpenAI, 윈우, Seedance 등)
- LLM 자동 개선 프롬프트 + 재생성
- SSIM 프레임 검출 품질 관리
- 캐릭터 일관성 검사 (안면 임베딩)
- 립싱크 통합

</details>

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 핵심 기능

| 모듈 | 설명 |
|:---|:---|
| **멀티 에이전트 라이팅** | 5단계 파이프라인, 각 에이전트별 독립 YAML 프롬프트 + 독립 에러 처리 |
| **캐릭터 엔진** | 7개 서브모듈: 유대감 추적, 감정 엔진, 동기 스택, 내면 독백, 페이스 지시, 깨달음 시스템 |
| **서사 컨텍스트** | 9계층 메모리: 스토리 바이블, 규칙, 현재 상태, 활성 훅, 서사 컨텍스트, 로어북, 벡터 RAG, 최근 챕터, 대화 요약 |
| **에셋 추출** | Fellegi-Sunter 확률 매칭 + 4계층 중복 제거 방어 + 자동 정규화 |
| **비디오 파이프라인** | 상태 그래프 엔진, 9단계, 6개 공급자, 자동 재생성, 캐릭터 일관성, 립싱크 |
| **로어북 엔진** | 키워드 트리거 주입 + 벡터 RAG (minScore=0.3, topK=3, maxTokens=1500) |
| **대화 시스템** | 롤플레이 + 인격 모델 + 관계 추적 + 다중 인원 그룹채팅 |
| **스타일 지문** | 언어 특성 추출, AI 생성 챕터의 작가 목소리 일관성 보장 |
| **데스크톱 앱** | Electron 43, NSIS 설치기, 자동 업데이트 확인, 크로스 플랫폼 |

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 빠른 시작

### 설치

```bash
npm install -g pnpm
git clone https://github.com/mvpdark/TavernOS-Publish.git
cd TavernOS-Publish
pnpm install
```

### 구성

```bash
cp .env.example .env
# .env 편집하여 LLM 프로바이더 구성:
# TAVERNOS_LLM_PROVIDER=custom
# TAVERNOS_LLM_BASE_URL=https://api.openai.com/v1
# TAVERNOS_LLM_API_KEY=sk-...
# TAVERNOS_LLM_MODEL=gpt-4o
```

<details>
<summary>🔧 지원되는 LLM 프로바이더</summary>

| 프로바이더 | Base URL | 설명 |
|:---|:---|:---|
| OpenAI | `https://api.openai.com/v1` | GPT-4o, GPT-4o-mini |
| 문샷 / Kimi | `https://api.moonshot.cn/v1` | moonshot-v1 시리즈 |
| 지푸 / GLM | `https://open.bigmodel.cn/api/paas/v4` | glm-4 시리즈 |
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat, deepseek-coder |
| 윈우 Yunwu | `https://api.yunwu.ai/v1` | 다중 모델 프록시 |
| Grok | OAuth + PKCE | xAI 자동 토큰 갱신 |
| OpenRouter | `https://openrouter.ai/api/v1` | 100+ 모델 |
| Ollama | `http://localhost:11434/v1` | 로컬 모델 |

</details>

### 실행

```bash
pnpm dev              # 개발 모드
pnpm electron:dev     # Electron 데스크톱 앱
pnpm build            # 전체 빌드
```

### Docker

```bash
docker-compose up -d  # 또는: docker build -t tavernos .
```

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 기술 스택

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

| 레이어 | 기술 |
|:---|:---|
| **언어** | TypeScript (ESM, Zod 검증) |
| **프론트엔드** | React 19, Tailwind CSS, Vite 7 |
| **데스크톱** | Electron 43, NSIS 설치기 |
| **백엔드** | Hono (서버), esbuild (번들링) |
| **데이터베이스** | better-sqlite3 |
| **AI/ML** | 멀티 프로바이더 LLM 추상화 계층, 벡터 RAG |
| **비디오** | FFmpeg, StateGraph 파이프라인, 6개 공급자 |
| **빌드** | pnpm 워크스페이스, RC4 난독화로 핵심 IP 보호 |

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 저장소 구조

> [!IMPORTANT]
> 이 저장소는 TavernOS의 **공개 배포판**입니다. 핵심 라이팅 엔진은 독점 지식재산권을 보호하기 위해 컴파일된 형태로 배포됩니다.

| 구성 요소 | 가시성 | 경로 |
|:---|:---|:---|
| 프론트엔드 UI (React/Tailwind) | **전체 소스** | `packages/studio/` |
| Electron 셸 | **전체 소스** | `electron/` |
| 인프라 (LLM, 스토리지, 타입) | **전체 소스** | `packages/core/src/` |
| CLI 도구 | **전체 소스** | `packages/cli/` |
| 핵심 라이팅 엔진 | **컴파일 JS** | `packages/core/dist/` |
| 서버 (API 라우트, RAG) | **컴파일 JS** | `dist-server/index.js` |
| Docker 구성 | **전체 소스** | `Dockerfile`, `docker-compose.yml` |

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 다운로드

<p align="center">
  <a href="https://github.com/mvpdark/TavernOS-Publish/releases">
    <img src="https://img.shields.io/badge/Windows-다운로드-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Download for Windows"/>
  </a>
</p>

> [Releases](https://github.com/mvpdark/TavernOS-Publish/releases)에서 `TavernOS-Setup-x.x.x-x64.exe`를 다운로드하세요. 자동 업데이트 확인이 내장되어 있습니다.

<p align="center">
  <img src="docs/assets/divider.png" alt="—" width="600"/>
</p>

## 라이선스

Copyright © 2026 mvpdark. All rights reserved.

| 구성 요소 | 라이선스 |
|:---|:---|
| 프론트엔드, Electron, 인프라 | **GPL v3** |
| 핵심 라이팅 엔진 | **독점** |

자세한 내용은 [LICENSE](LICENSE)를 참조하세요.

<p align="center">
  <img src="docs/assets/seal-ai.png" alt="TavernOS Seal" width="100"/>
</p>

<p align="center">
  <sub><i>TavernOS</i></sub><br/>
  <sub><i>먹을 붓으로, 코드를 벼루로</i></sub>
</p>
