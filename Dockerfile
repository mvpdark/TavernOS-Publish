# TavernOS — Multi-agent AI novel writing system
# Production Docker image using pre-built artifacts
#
# This Dockerfile uses the pre-built, obfuscated server bundle and
# compiled frontend from the TavernOS-Publish repository.

FROM node:22-slim AS production
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/core/package.json ./packages/core/
COPY packages/studio/package.json ./packages/studio/
COPY packages/cli/package.json ./packages/cli/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy pre-built artifacts
# dist-server/ — obfuscated server bundle (esbuild + javascript-obfuscator)
COPY dist-server ./dist-server
# packages/studio/dist/ — built frontend (Vite)
COPY packages/studio/dist ./packages/studio/dist
# packages/core/dist/ — compiled core package
COPY packages/core/dist ./packages/core/dist
# packages/cli/dist/ — compiled CLI package
COPY packages/cli/dist ./packages/cli/dist

# Create data directory
RUN mkdir -p /data
ENV TAVERNOS_DATA_DIR=/data
ENV NODE_ENV=production
ENV PORT=17776
ENV HOST=0.0.0.0

# Expose studio server port
EXPOSE 17776

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+ (process.env.PORT||17776) +'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the studio server (obfuscated bundle)
CMD ["node", "dist-server/index.js"]
