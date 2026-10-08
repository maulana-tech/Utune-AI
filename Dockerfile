FROM node:22-slim AS base

# Install system dependencies for Node, Python (scraper venv), and curl
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    curl wget gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm + PM2
RUN npm install -g pnpm pm2

WORKDIR /app

# Copy workspace manifests + all packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps ./apps

# Install all workspace dependencies (web is in the workspace but is NOT built/run here —
# it deploys to Vercel separately; we still install to keep lockfile resolution honest).
RUN pnpm install --frozen-lockfile

# Python venv for the worker scrapers (places_scraper.py, enrich_websites.py)
RUN cd apps/workers && \
    python3 -m venv .venv && \
    .venv/bin/pip install --no-cache-dir -r requirements.txt

# Build ONLY api + workers (and their workspace deps). apps/web builds on Vercel.
RUN pnpm turbo build --filter=api --filter=workers

# Copy PM2 ecosystem (api + workers only — see ecosystem.config.js)
COPY ecosystem.config.js ./

# Only expose the NestJS API port (workers have no public port)
EXPOSE 3001

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
