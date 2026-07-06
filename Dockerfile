# TavernOS — Multi-agent AI novel writing system
# Multi-stage build for minimal production image

# --- Stage 1: Build ---
FROM node:22-slim AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY Tavern/packages/core/package.json ./Tavern/packages/core/
COPY Tavern/packages/studio/package.json ./Tavern/packages/studio/
COPY Tavern/packages/cli/package.json ./Tavern/packages/cli/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source
COPY Tavern/ ./Tavern/

# Build all packages
RUN pnpm run build || npm run build --workspace

# --- Stage 2: Production ---
FROM node:22-slim AS production
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built packages
COPY --from=builder /app/package.json pnpm-workspace.yaml ./
COPY --from=builder /app/Tavern/ ./Tavern/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Create data directory
RUN mkdir -p /data
ENV TAVERNOS_DATA_DIR=/data

# Expose studio server port
EXPOSE 3179

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3179/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the studio server
CMD ["node", "Tavern/packages/studio/dist/index.js"]
