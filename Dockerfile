# TavernOS — Multi-agent AI novel writing system
# Multi-stage Docker build with code obfuscation
#
# Build:  docker build -t tavernos:latest .
# Run:    docker run -p 3179:3179 -v tavernos-data:/data tavernos:latest

# --- Stage 1: Build & Obfuscate ---
FROM node:22-slim AS builder
WORKDIR /app

# Install build dependencies (including obfuscation tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config and package manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/core/package.json ./packages/core/
COPY packages/studio/package.json ./packages/studio/
COPY packages/cli/package.json ./packages/cli/

# Install all dependencies (including devDeps for build)
RUN pnpm install --no-frozen-lockfile || pnpm install

# Copy source code
COPY packages/ ./packages/
COPY electron/ ./electron/

# Build all packages (TypeScript compile + Vite frontend build)
RUN pnpm -r build || npm run build --workspace

# Bundle the server with esbuild
RUN node electron/build-server.cjs

# Obfuscate frontend assets and server bundle
# TAVERNOS_SKIP_OBFUSCATE=0 ensures obfuscation runs
RUN node electron/obfuscate-build.cjs /app

# --- Stage 2: Production ---
FROM node:22-slim AS production
WORKDIR /app

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY package.json pnpm-workspace.yaml ./

# Copy built packages (obfuscated)
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/studio/dist ./packages/studio/dist
COPY --from=builder /app/packages/studio/package.json ./packages/studio/
COPY --from=builder /app/packages/cli/dist ./packages/cli/dist
COPY --from=builder /app/packages/cli/package.json ./packages/cli/
COPY --from=builder /app/dist-server ./dist-server

# Install production dependencies only (for native modules like better-sqlite3)
RUN pnpm install --prod --no-frozen-lockfile || pnpm install --prod

# Create data directory
RUN mkdir -p /data
ENV TAVERNOS_DATA_DIR=/data
ENV NODE_ENV=production

# Expose studio server port
EXPOSE 3179

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3179/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the studio server (obfuscated ESM bundle)
CMD ["node", "dist-server/index.js"]
