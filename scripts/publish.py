#!/usr/bin/env python3
"""
TavernOS Publish Script
=======================
Builds and publishes the public distribution of TavernOS.

Strategy (Emby-like model):
- PUBLIC SOURCE: UI components (React/TSX), Electron shell, build configs,
  infrastructure (LLM client, storage, HTTP, types), i18n, Docker
- COMPILED JS: Core writing engine (prompts, agents, pipeline, narrative-engine,
  RAG, character-engine) shipped as compiled + minified JavaScript
- EXCLUDED: Tests, dev scripts, backup files, internal docs, temp files

Usage:
  python scripts/publish.py            # Build and stage for publish
  python scripts/publish.py --push     # Build, commit, and push to public repo
  python scripts/publish.py --no-build # Skip build, just stage existing dist/
"""
import os, sys, shutil, subprocess, argparse, json, re
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
PUBLISH_DIR = ROOT.parent / "TavernOS-Publish"

# ---------------------------------------------------------------------------
# Helper: check if a relative path should be in the public SOURCE tree
# ---------------------------------------------------------------------------
# These directories contain ONLY core IP and are excluded from public source
# Exception: agents/ contains base.ts, json-utils.ts, index.ts which ARE public.
CORE_SOURCE_DIRS = {
    "packages/core/src/prompts",
    "packages/core/src/pipeline",
    "packages/core/src/narrative",
    "packages/core/src/character-engine",
    "packages/core/src/rag",
    "packages/core/src/humanize",
    "packages/core/src/rules",
    "packages/core/src/scene",
    "packages/core/src/timeline",
    "packages/core/src/chat",
    "packages/core/src/deepgame",
    "packages/core/src/market",
    "packages/core/src/video",
    "packages/core/src/music",
    "packages/core/src/plus",
    "packages/studio/server/plus",
}

# Individual core source files excluded from public source
# Strategy: exclude directories wholesale (CORE_SOURCE_DIRS), then list individual
# core files in otherwise-public directories. Infrastructure files (base.ts, types.ts,
# index.ts, json-utils.ts, validator.ts, etc.) are NOT listed here and remain public.
CORE_SOURCE_FILES = {
    # --- Core agents (the writing brain) - ALL agents except base/json-utils/index ---
    "packages/core/src/agents/architect.ts",
    "packages/core/src/agents/writer.ts",
    "packages/core/src/agents/auditor.ts",
    "packages/core/src/agents/reviser.ts",
    "packages/core/src/agents/chapter-analyzer.ts",
    "packages/core/src/agents/asset-extractor.ts",
    "packages/core/src/agents/fact-extractor.ts",
    "packages/core/src/agents/fact-taxonomy.ts",
    "packages/core/src/agents/planner.ts",
    "packages/core/src/agents/storyboard.ts",
    "packages/core/src/agents/video-reviewer.ts",
    # --- Core state logic ---
    "packages/core/src/state/reducer.ts",
    "packages/core/src/state/projection.ts",
    "packages/core/src/state/version-control.ts",
    "packages/core/src/state/truth-files.ts",
    # --- Core asset logic ---
    "packages/core/src/assets/catalog.ts",
    "packages/core/src/assets/to-card.ts",
    # --- Style analysis (writing heuristics) ---
    "packages/core/src/style/style-guide.ts",
    "packages/core/src/style/style-fingerprint.ts",
    "packages/core/src/style/style-analyzer.ts",
    # --- Audit rules ---
    "packages/core/src/audit/hook-density.ts",
    "packages/core/src/audit/rule-auditor.ts",
    "packages/core/src/audit/chinese-numbers.ts",
    # --- Lorebook engine/matcher ---
    "packages/core/src/lorebook/engine.ts",
    "packages/core/src/lorebook/matcher.ts",
    # --- Studio server root files with core logic ---
    "packages/studio/server/chat-memory.ts",
    "packages/studio/server/vector-loader.ts",
    # --- Studio server routes with core pipeline logic ---
    "packages/studio/server/routes/create.ts",
    "packages/studio/server/routes/create-helpers.ts",
    "packages/studio/server/routes/create-assets.ts",
    "packages/studio/server/routes/create-save.ts",
    "packages/studio/server/routes/create-wordcount.ts",
    "packages/studio/server/routes/blueprint.ts",
    "packages/studio/server/routes/chat.ts",
    "packages/studio/server/routes/group-chat.ts",
    "packages/studio/server/routes/deepgame.ts",
    "packages/studio/server/routes/workshop.ts",
    "packages/studio/server/routes/style-library.ts",
    "packages/studio/server/routes/video.ts",
    "packages/studio/server/routes/video-helpers.ts",
    "packages/studio/server/routes/story.ts",
    "packages/studio/server/routes/plus.ts",
    "packages/studio/server/routes/personas.ts",
    # --- CLI write/revise/audit commands ---
    "packages/cli/src/commands/write.ts",
    "packages/cli/src/commands/revise.ts",
    "packages/cli/src/commands/audit.ts",
    "packages/cli/src/commands/pipeline-helpers.ts",
}

# Files/dirs to always exclude (dev artifacts, secrets, etc.)
# Note: "dist/" is handled explicitly - compiled output is copied via shutil.copytree,
# not through the filtered source copy, so we don't list it here.
ALWAYS_EXCLUDE_PATTERNS = [
    ".env", ".env.local", ".env.*.local",
    "*.bak", "*.bak_*", "*.orig", "*.log",
    "*.tsbuildinfo",
    "node_modules", "release", ".vite", "coverage",
    "temp", ".tavernos",
    "test_*.mjs", "test_*.py",
    "*.db", "*.db-journal", "*.db-wal", "*.db-shm",
    ".DS_Store", "Thumbs.db",
    "__pycache__",
]


def is_core_source(rel_path: str) -> bool:
    """Return True if this file/dir is core IP (should NOT be in public source)."""
    rel = rel_path.replace("\\", "/")
    # Check core directories
    for d in CORE_SOURCE_DIRS:
        if rel == d or rel.startswith(d + "/"):
            return True
    # Check core files
    if rel in CORE_SOURCE_FILES:
        return True
    return False


def is_excluded(rel_path: str) -> bool:
    """Return True if this file should always be excluded."""
    rel = rel_path.replace("\\", "/")
    parts = rel.split("/")
    name = parts[-1]
    for pat in ALWAYS_EXCLUDE_PATTERNS:
        if pat.startswith("*."):
            if name.endswith(pat[1:]):
                return True
        elif "/" not in pat:
            # Single name: match any path component (dir name or file name)
            if pat in parts:
                return True
        elif rel == pat or rel.startswith(pat + "/"):
            return True
    return False


def should_include_in_source(rel_path: str) -> bool:
    """Determine if a path should be copied to public source tree."""
    if is_excluded(rel_path):
        return False
    if is_core_source(rel_path):
        return False
    return True


# ---------------------------------------------------------------------------
# Copy utilities
# ---------------------------------------------------------------------------
def copy_tree_filtered(src: Path, dst: Path, prefix: str = ""):
    """Copy directory tree, excluding core/excluded files.
    prefix: the path prefix (relative to ROOT) to prepend for filtering.
    e.g. copy_tree_filtered(core_src/"src", core_dst/"src", "packages/core/src")
    """
    if not src.exists():
        return
    for item in src.rglob("*"):
        rel = str(item.relative_to(src))
        full_rel = (prefix + "/" + rel).replace("\\", "/").lstrip("/")
        if not should_include_in_source(full_rel):
            continue
        target = dst / rel
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif item.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)


def copy_file_if_public(src: Path, dst: Path, rel: str):
    """Copy a single file if it's public."""
    if not src.exists():
        print(f"  SKIP (not found): {rel}")
        return
    if should_include_in_source(rel):
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def run(cmd, cwd=None, label=""):
    """Run a command and print output on failure."""
    cmd_str = " ".join(cmd) if isinstance(cmd, list) else cmd
    print(f"  > {cmd_str}")
    # On Windows, use shell=True with string command for .cmd/.bat resolution
    r = subprocess.run(cmd_str if sys.platform == "win32" else cmd,
                       cwd=cwd, capture_output=True, text=True,
                       encoding="utf-8", errors="replace",
                       shell=(sys.platform == "win32"))
    if r.returncode != 0:
        print(f"  ERROR [{label}]: {r.stderr[-1500:]}")
        return False
    if r.stdout.strip():
        print(f"  {r.stdout.strip()[-300:]}")
    return True


def _run_cmd(cmd, cwd=None, capture=True):
    """Helper: run a command cross-platform."""
    cmd_str = " ".join(cmd) if isinstance(cmd, list) else cmd
    return subprocess.run(
        cmd_str if sys.platform == "win32" else cmd,
        cwd=cwd, capture_output=capture, text=capture,
        encoding="utf-8" if capture else None, errors="replace" if capture else None,
        shell=(sys.platform == "win32"),
    )


def build_all():
    """Build all packages: core, cli, studio server."""
    print("\n[1/5] Building @tavernos/core...")
    ok = run(["npx", "tsc", "-p", "packages/core/tsconfig.json"], cwd=str(ROOT), label="core-tsc")
    if not ok:
        sys.exit(1)
    # Copy prompts YAML to dist/ (needed at runtime)
    run(["node", "scripts/copy-prompts.mjs"], cwd=str(ROOT / "packages/core"), label="copy-prompts")
    print("  Core build done.")

    print("\n[2/5] Building @tavernos/cli...")
    run(["npx", "tsc", "-p", "packages/cli/tsconfig.json"], cwd=str(ROOT), label="cli-tsc")
    print("  CLI build done.")

    print("\n[3/5] Building studio server...")
    run(["npx", "tsc", "-p", "packages/studio/tsconfig.json"], cwd=str(ROOT), label="studio-tsc")
    print("  Studio server build done.")

    print("\n[4/5] Building studio frontend (Vite)...")
    run(
        ["npx", "vite", "build"],
        cwd=str(ROOT / "packages/studio"),
        label="vite-build",
    )
    print("  Frontend build done.")


# ---------------------------------------------------------------------------
# Minify compiled JS (lightweight protection - not unbreakable, but honest)
# ---------------------------------------------------------------------------
def minify_core_dist():
    """Minify core/dist JS files with esbuild (strips comments, renames locals)."""
    print("\n[5/5] Minifying compiled core JS...")
    core_dist = ROOT / "packages" / "core" / "dist"
    if not core_dist.exists():
        print("  WARNING: core/dist not found, skipping minification")
        return
    count = 0
    for js_file in core_dist.rglob("*.js"):
        rel = js_file.relative_to(core_dist)
        r = _run_cmd(
            ["npx", "esbuild", str(js_file), "--minify", "--outfile=" + str(js_file),
             "--platform=node", "--format=esm", "--legal-comments=none"],
            cwd=str(ROOT),
        )
        if r.returncode == 0:
            count += 1
        else:
            print(f"  WARN minify {rel}: {r.stderr[:200]}")
    print(f"  Minified {count} JS files in core/dist/")


# ---------------------------------------------------------------------------
# Stage public files
# ---------------------------------------------------------------------------
def stage_public():
    """Copy all public files to PUBLISH_DIR."""
    print("\n--- Staging public files ---")
    # Clean publish dir (preserve .git)
    if PUBLISH_DIR.exists():
        for item in PUBLISH_DIR.iterdir():
            if item.name == ".git":
                continue
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
            else:
                item.unlink()
    PUBLISH_DIR.mkdir(parents=True, exist_ok=True)

    # --- Root files ---
    root_public_files = [
        "package.json", "pnpm-workspace.yaml", "tsconfig.base.json",
        "tsconfig.server.json", ".npmrc", ".gitignore", ".dockerignore",
        "Dockerfile", "docker-compose.yml", ".env.example",
    ]
    for f in root_public_files:
        copy_file_if_public(ROOT / f, PUBLISH_DIR / f, f)

    # --- Root directories ---
    for d, prefix in [("build", "build"), ("electron", "electron"), ("scripts", "scripts")]:
        src = ROOT / d
        if src.exists():
            copy_tree_filtered(src, PUBLISH_DIR / d, prefix=prefix)

    # docs/ - copy only if they're user-facing
    docs_src = ROOT / "docs"
    if docs_src.exists():
        (PUBLISH_DIR / "docs").mkdir(parents=True, exist_ok=True)
        for f in docs_src.glob("*.html"):
            shutil.copy2(f, PUBLISH_DIR / "docs" / f.name)

    # --- Packages ---
    # Core: infrastructure source (types, LLM client, storage, etc.) + compiled dist/
    core_src = ROOT / "packages" / "core"
    core_dst = PUBLISH_DIR / "packages" / "core"
    # Copy all source EXCEPT core IP files
    if (core_src / "src").exists():
        copy_tree_filtered(core_src / "src", core_dst / "src", prefix="packages/core/src")
    # Copy package.json, tsconfig.json
    for f in ["package.json", "tsconfig.json"]:
        copy_file_if_public(core_src / f, core_dst / f, f"packages/core/{f}")
    # Copy compiled dist/ (minified JS + YAML prompts)
    core_dist_src = core_src / "dist"
    core_dist_dst = core_dst / "dist"
    if core_dist_src.exists():
        shutil.copytree(core_dist_src, core_dist_dst, dirs_exist_ok=True)
        print(f"  Copied core/dist/ (compiled engine)")

    # Studio: full UI source + compiled server dist/ + compiled frontend dist/
    studio_src = ROOT / "packages" / "studio"
    studio_dst = PUBLISH_DIR / "packages" / "studio"
    # Copy src/ (UI components, hooks, lib, pages) - filtered
    if (studio_src / "src").exists():
        copy_tree_filtered(studio_src / "src", studio_dst / "src", prefix="packages/studio/src")
    # Copy server/ - filtered (CRUD routes are public, pipeline routes are NOT)
    if (studio_src / "server").exists():
        copy_tree_filtered(studio_src / "server", studio_dst / "server", prefix="packages/studio/server")
    # Copy config files
    for f in ["package.json", "tsconfig.json", "vite.config.ts", "index.html"]:
        copy_file_if_public(studio_src / f, studio_dst / f, f"packages/studio/{f}")
    # Copy root CSS
    for f in ["index.css", "App.css"]:
        if (studio_src / f).exists():
            copy_file_if_public(studio_src / f, studio_dst / f, f"packages/studio/{f}")
    # Copy compiled dist-server/
    ds_src = studio_src / "dist-server"
    ds_dst = studio_dst / "dist-server"
    if ds_src.exists():
        shutil.copytree(ds_src, ds_dst, dirs_exist_ok=True)
        print("  Copied studio/dist-server/")
    # Copy compiled frontend dist/
    fe_src = studio_src / "dist"
    fe_dst = studio_dst / "dist"
    if fe_src.exists():
        shutil.copytree(fe_src, fe_dst, dirs_exist_ok=True)
        print("  Copied studio/dist/ (frontend)")

    # CLI: public command source + compiled dist/
    cli_src = ROOT / "packages" / "cli"
    cli_dst = PUBLISH_DIR / "packages" / "cli"
    if (cli_src / "src").exists():
        copy_tree_filtered(cli_src / "src", cli_dst / "src", prefix="packages/cli/src")
    for f in ["package.json", "tsconfig.json"]:
        copy_file_if_public(cli_src / f, cli_dst / f, f"packages/cli/{f}")
    cli_dist_src = cli_src / "dist"
    cli_dist_dst = cli_dst / "dist"
    if cli_dist_src.exists():
        shutil.copytree(cli_dist_src, cli_dist_dst, dirs_exist_ok=True)
        print("  Copied cli/dist/")

    # --- Public README ---
    readme = """# TavernOS

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
"""
    (PUBLISH_DIR / "README.md").write_text(readme, encoding="utf-8")

    # --- LICENSE file ---
    mit = """GNU General Public License v3.0

This project's UI, Electron shell, and infrastructure components are licensed under GPL v3.
The core writing engine (packages/core/dist/) is proprietary and distributed in compiled form only.

See https://www.gnu.org/licenses/gpl-3.0.html for the full GPL v3 license text.
"""
    (PUBLISH_DIR / "LICENSE").write_text(mit, encoding="utf-8")

    # Count
    file_count = sum(1 for x in PUBLISH_DIR.rglob("*") if x.is_file() and ".git" not in str(x))
    dir_count = sum(1 for x in PUBLISH_DIR.rglob("*") if x.is_dir() and ".git" not in str(x))
    print(f"\nStaged: {file_count} files in {dir_count} directories at {PUBLISH_DIR}")


# ---------------------------------------------------------------------------
# Git
# ---------------------------------------------------------------------------
def git_setup():
    """Initialize git in publish dir if needed."""
    git_dir = PUBLISH_DIR / ".git"
    if not git_dir.exists():
        _run_cmd(["git", "init"], cwd=str(PUBLISH_DIR))
        _run_cmd(
            ["git", "remote", "add", "origin", "https://github.com/mvpdark/TavernOS-Publish.git"],
            cwd=str(PUBLISH_DIR),
        )
        _run_cmd(["git", "checkout", "-b", "main"], cwd=str(PUBLISH_DIR))
        print("Git initialized with remote origin -> TavernOS-Publish")
    else:
        print("Git already initialized.")


def git_push(message: str):
    """Commit and push to public repo."""
    print(f"\nCommitting: {message}")
    _run_cmd(["git", "add", "-A"], cwd=str(PUBLISH_DIR))
    r = _run_cmd(["git", "status", "--short"], cwd=str(PUBLISH_DIR))
    if not r.stdout.strip():
        print("No changes to publish.")
        return
    print(r.stdout[:2000])
    _run_cmd(["git", "commit", "-m", message], cwd=str(PUBLISH_DIR))
    # Try to pull first if remote exists
    _run_cmd(["git", "pull", "origin", "main", "--allow-unrelated-histories", "--no-rebase"],
             cwd=str(PUBLISH_DIR))
    pr = _run_cmd(["git", "push", "-u", "origin", "main", "--force"], cwd=str(PUBLISH_DIR))
    if pr.returncode != 0:
        print(f"Push stderr: {pr.stderr[-500:]}")
    else:
        print("Pushed to https://github.com/mvpdark/TavernOS-Publish")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Publish TavernOS to public repo")
    parser.add_argument("--push", action="store_true", help="Push after staging")
    parser.add_argument("--no-build", action="store_true", help="Skip build step")
    parser.add_argument("--no-minify", action="store_true", help="Skip JS minification")
    parser.add_argument("-m", "--message", default="Public distribution update", help="Commit message")
    args = parser.parse_args()

    print("=" * 60)
    print("TavernOS Public Publisher")
    print("=" * 60)
    print(f"  Source:  {ROOT}")
    print(f"  Publish: {PUBLISH_DIR}")

    if not args.no_build:
        build_all()
    else:
        print("\nSkipping build (--no-build).")

    if not args.no_minify and not args.no_build:
        minify_core_dist()

    stage_public()
    git_setup()

    if args.push:
        git_push(args.message)
    else:
        print(f"\nDone! Files staged in {PUBLISH_DIR}")
        print("Review the staged files, then run with --push to commit and push.")


if __name__ == "__main__":
    main()
