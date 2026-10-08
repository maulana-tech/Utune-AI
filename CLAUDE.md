# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B2B business finder and CRM platform — targets companies across industries (construction, oil & gas, brands, …), not just local SMEs. Global lead scraping through a fallback chain of sources (Google Places first, keyless OpenStreetMap/Wikidata last), stored in Postgres and worked as a filterable lead table + pipeline. AI analysis exists but is **opt-in per lead**, never automatic. See `CONTEXT.md` for full product context.

## Architecture

**Monorepo structure** (pnpm workspaces + Turborepo):

```
apps/
  web/          Next.js 15 App Router + Zustand
  api/          NestJS 11 REST API + BullMQ queue bridge
  workers/      BullMQ workers + node-cron schedulers + Python scrapers
packages/
  db/           Drizzle ORM + node-postgres pool
  shared/       Zod schemas, env validation, shared types
  ai/           Multi-provider LLM layer + agents/swarm (via Vercel AI SDK)
  ui/           React components (cva + tailwind-merge)
  eslint-config/     (shell package)
  typescript-config/ Strict TypeScript base config
```

**Key architectural decisions:**
- API is a thin queue bridge — controllers validate and push jobs to BullMQ, no long-running work in request handlers
- Workers run in separate process from API, spawn Python scraper via child_process
- All tenant data scoped to `workspaceId` — multi-tenant via single Postgres DB with row-level isolation
- **Scraping never triggers AI.** `scrape.worker.ts` only writes lead rows; the lead-scoring pipeline runs only when someone calls `POST /leads/:id/analyze`. Do not re-add per-lead queueing to the scrape worker — it was removed on purpose to keep token cost at zero for large scrapes.
- **No map.** MapLibre/react-map-gl were removed; `/dashboard` is a filterable, sortable leads table (`features/leads/LeadsTable.tsx`) with a detail side panel. Lead selection lives in `features/leads/store.ts`
- **No API-side auth.** NestJS has no guards; `workspaceId` arrives as a query param / body field and is trusted. Auth is enforced only in `apps/web/src/middleware.ts` (Supabase session → redirect `/dashboard/*` to `/login`). Do not assume the API is protected.

## Commands

**Package manager:** pnpm only (locked to 9.15.0). Never use npm/yarn.

```bash
# Development
pnpm install                # Install all workspace deps
pnpm dev                    # Run all 3 apps concurrently (Turbo)
pnpm dev:web                # Next.js dev server only
pnpm dev:api                # NestJS with watch mode
pnpm dev:workers            # Worker with tsx watch mode

# Build & validation
pnpm build                  # Build all apps (Turbo)
pnpm typecheck              # TypeScript validation across workspaces
pnpm lint                   # ESLint across workspaces

# Database (all via --filter @repo/db)
pnpm db:generate            # Generate Drizzle migrations
pnpm db:migrate             # Apply migrations
pnpm --filter @repo/db push # Push schema straight to DB (what's actually used — no migrations dir exists)
pnpm db:studio              # Launch Drizzle Studio
pnpm db:seed                # Run seed script

# Ops scripts (root, run via tsx + dotenv)
pnpm db:verify              # Sanity-check tables/rows
pnpm db:cleanup-dupes       # scripts/cleanup-duplicate-workspaces.ts
pnpm db:cleanup-orphaned    # scripts/cleanup-orphaned-workspaces.ts
pnpm db:migrate-orphaned    # scripts/migrate-orphaned-data.ts
pnpm redis:test             # Verify REDIS_URL connectivity
pnpm redis:monitor          # scripts/monitor-redis.sh
pnpm scraper:test           # scripts/test-email-scraping.ts
```

`pnpm test` / `pnpm test:e2e` exist as Turbo passthroughs but **no test files exist** — they are no-ops.

**Pre-commit checklist:** `pnpm typecheck && pnpm lint && pnpm build`

## Environment Setup

1. Copy `.env.example` to `.env` at repo root
2. Required variables:
   - `DATABASE_URL` — Supabase Postgres connection string
   - `REDIS_URL` — Upstash Redis URL (or local Redis)
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NVIDIA_API_KEY` — default AI provider
3. Optional: `GOOGLE_API_KEY`, `SUMOPOD_API_KEY`, `ANTHROPIC_API_KEY` (extra AI providers), `AI_FAST_MODEL` / `AI_STANDARD_MODEL` / `AI_HEAVY_MODEL` (tier overrides), `EMAIL_PROVIDER` + Resend or SumoPod SMTP vars, `ALLOWED_ORIGINS` / `ALLOW_VERCEL_PREVIEWS` (API CORS allow-list, see `apps/api/src/main.ts`)

Dev commands for API and workers load `.env` via `dotenv -e ../../.env`.

API dev runs `nest start --watch --exec "node --import tsx"`: tsc compiles (Nest DI needs `emitDecoratorMetadata`, which plain `tsx watch` drops — every injected service becomes `undefined`), and the tsx loader resolves `@repo/ai`/`@repo/shared`, which export raw `.ts`. Plain `node dist/main.js` (`start:prod`) fails for the same reason.

Env validation schema exists in `packages/shared/src/env.ts` but is not yet wired into app startup.

## Database & Schema

**Stack:** PostgreSQL (Supabase) + Drizzle ORM (`drizzle-orm/node-postgres`)

**Connection:** Pooled via `pg.Pool` in `packages/db/src/index.ts`

**Schema location:** `packages/db/src/schema/`

Current tables:
- `workspaces` — tenant container
- `users` — workspace members with roles
- `leads` — business records (name, address, lat/lng, category, pipeline stage, `source`)
- `jobs` — scrape job queue metadata
- `ai_insights` — AI-generated sales analysis per lead
- `lead_scores` — final aggregated scores from lead-scoring pipeline
- `agent_logs` — reasoning trace for the lead-scoring pipeline (nullable FK to leadId; `handoffFrom` + `parallelGroup` for swarm observability)
- `swarm_runs` — 1 row per swarm workflow execution (executionId, workflowName, entryAgent, totalSteps, status; nullable FK to leadId)
- `lead_notes` — free-text CRM notes per lead
- `scrape_schedules` — recurring scrape configs (isActive, intervalMinutes, lastRunAt, retryCount/maxRetries) driven by the cron scheduler
- `email_templates`, `email_sequences`, `email_outreach` — outreach templates, multi-step sequences + enrollments, and per-email send/track rows (`resendEmailId`, `status`, `scheduledFor`)

**No migrations directory exists.** Schema changes reach the DB via `drizzle-kit push`, not generated SQL migrations.

**Important:** All UUIDs use `uuid().defaultRandom()` (UUID v4). Foreign keys enforce referential integrity. Every tenant table has `workspaceId` column.

**PostGIS note:** Lat/lng currently stored as `doublePrecision` — PostGIS geometry columns not yet implemented.

## AI Layer (Multi-Agent Architecture)

**Providers** (`packages/ai/src/provider.ts`) — all through Vercel AI SDK:
- NVIDIA NIM (always on, the default) — OpenAI-compatible
- Google (Gemini/Gemma via OpenAI-compatible endpoint), SumoPod, Anthropic — each only constructed when its API key is set, otherwise `null`

**Model tiers** — import from `@repo/ai` as `models.fast` / `models.standard` / `models.heavy` (aliases: `fastModel`, `defaultModel`, `heavyModel`). Defaults are `meta/llama-3.1-8b-instruct` (fast) and `meta/llama-3.1-70b-instruct` (standard + heavy). Override per tier with `AI_FAST_MODEL` / `AI_STANDARD_MODEL` / `AI_HEAVY_MODEL` using `provider:model` syntax (`google:gemma-...`, `sumopod:gpt-4o`, `anthropic:...`); a bare name resolves to NVIDIA.

**Fallback:** `generateTextWithFallback` / `generateObjectWithFallback` (`packages/ai/src/fallback.ts`) retry on the 8B NVIDIA model, but **only** for transient errors (500/503/timeout/ECONNRESET) — prompt and schema-validation errors rethrow. Prefer these over calling `generateText`/`generateObject` directly in agents.

**One multi-agent pipeline plus a Swarm runtime — both log to `agent_logs` for reasoning transparency.**

### A. Lead-scoring pipeline — sequential, context-passing

4 agents work in sequence, each receiving the accumulated context from previous steps:

1. **Extractor Agent** → Extracts structured business data
2. **Finance Agent** → Receives extractor context, analyzes financial health
3. **Marketing Agent** → Receives extractor + finance context, determines messaging fit
4. **Strategy Agent** → Synthesizes ALL previous agents, provides final recommendation

Key files:
- `packages/ai/src/orchestrator.ts` — `runMultiAgentWorkflow(input)`
- `packages/ai/src/agents/{extractor,finance,marketing,strategy}.ts`
- `packages/db/src/schema/lead_scores.ts` — final aggregated scores per lead

Workflow (on-demand only — nothing queues this automatically):
```
POST /leads/:id/analyze → orchestrated-ai-queue → Orchestrator:
  Step 1: Extractor → Step 2: Finance → Step 3: Marketing → Step 4: Strategy
→ Logs to agent_logs → Writes to lead_scores
```

### B. Swarm runtime — dynamic handoff architecture

`packages/ai/src/swarm/` replaces the hardcoded orchestrator above. It enables dynamic routing (agents decide who runs next), parallel fan-out, per-agent tool use, and per-agent model selection.

Key abstractions:
- `Swarm` class (`run-loop.ts`) — main execution loop; calls `generateObject`, reads `_handoff`/`_parallel`/`_toolCall` control fields, routes accordingly
- `AgentRegistry` (`registry.ts`) — global registry; agents self-register with name, instructions, Zod schema, handoff targets, tools, and model
- `withHandoff` (`handoff.ts`) — injects `_handoff: { nextAgent, contextToPass, reason } | null` into any Zod schema for routing
- `withToolCall` (`run-loop.ts`) — injects `_toolCall: { toolName, params } | null`; only added when agent declares tools and tool budget not exhausted
- `SwarmContext` (`types.ts`) — shared mutable context (executionId, agentOutputs Map, tokenUsage, iterationCount)

**Routing modes (run-loop handles all three):**
1. **Sequential handoff** — agent emits `_handoff.nextAgent`; run-loop routes there, passing optional `contextToPass`
2. **Parallel fan-out** — coordinator emits `_parallel: { agents, groupKey, nextAfterAll }`; run-loop executes all agents via `Promise.all`, stores results under `groupKey` in accumulated context, then routes to `nextAfterAll`
3. **Tool sub-loop** — agent emits `_toolCall`; run-loop executes the tool, merges result into `_tool_results`, re-runs the agent (up to `agent.maxIterations ?? 3` times), then proceeds

**Observability fields on every step:**
- `handoffFrom` — which agent handed off to this one (enables full trace reconstruction)
- `parallelGroup` — set for agents run inside a parallel fan-out group

Swarm agents live in `packages/ai/src/swarm/agents/*.swarm.ts`. Coordinator agents for parallel workflows:
- `coordinator.swarm.ts` — lead-scoring coordinator (routes to extractor entry)

Swarm workflows in `packages/ai/src/swarm/workflows/*.workflow.ts`:
- `lead-scoring.workflow.ts` → `runLeadScoringSwarm(input)`

`MAX_SWARM_ITERATIONS` in `types.ts` guards against infinite loops.

Toggle via `USE_SWARM_AGENTS=true` env var — the worker falls back to the legacy orchestrator when unset.

**DB observability (written per-run when swarm is active):**
- `swarm_runs` table — 1 row per workflow run (executionId, workflowName, entryAgent, totalSteps, status, nullable FK to leadId)
- `agent_logs.handoffFrom` — which agent handed off to this one
- `agent_logs.parallelGroup` — set for parallel fan-out agents

See `docs/swarm-ai-plan.md` for full migration plan and multi-model strategy (8B/70B/405B tiers).

See `COMPETITION.md` for the lead-scoring architecture explanation.

## Queue Architecture

**Stack:** BullMQ + Redis (ioredis)

**Queues:**
- `scrape-map` — triggers Python scraper for lead extraction
- `orchestrated-ai-queue` — runs lead-scoring multi-agent pipeline

**Workers** (`apps/workers/src/queues/`):
- `scrape.worker.ts` — spawns Python scraper, writes leads to DB
- `ai.worker.ts` — runs AI agents per lead, writes `ai_insights`
- `orchestrated-ai.worker.ts` — runs lead-scoring pipeline

**Cron schedulers** (`apps/workers/src/cron/`, started from `apps/workers/src/index.ts` alongside the queue workers — both run in the single `workers` process):
- `scrape-scheduler.ts` — every 15 min, picks **at most 1 due** `scrape_schedules` row and pushes it to `scrape-map` (deliberate throttle; don't "fix" it into a batch loop without thinking about scraper load)
- `email-scheduler.ts` — every 15 min, sends due `email_outreach` rows (`status='draft'` and `scheduledFor <= now`) and advances email sequence enrollments, over SumoPod SMTP via nodemailer

**Flow:**
1. `POST /jobs/scrape` (`{ workspaceId, query, limit, country?, source? }`) → API pushes to `scrape-map`
2. Worker resolves `source` through `LEAD_SOURCES` and runs it
3. Leads without contacts get their website crawled (`sources/enrich.ts`), then the worker writes them to DB
4. Leads land in the table at `/dashboard` — no AI is queued

### Lead sources (pluggable)

`apps/workers/src/sources/` is the registry every scrape job dispatches through — the worker itself knows nothing about any specific source:

- `types.ts` — `RawLead` (what a source returns) + `ScrapeRequest` (query, limit, country, workspaceId)
- `places.ts` — Google Places via the Python scraper (`GOOGLE_MAPS_API_KEY`)
- `apollo.ts` — Apollo company search through **Composio** (`APOLLO_ORGANIZATION_SEARCH`), needs `COMPOSIO_API_KEY` + an active Apollo connection in that Composio project. The Composio user id is `COMPOSIO_USER_ID` if set, else looked up from the active connections (dashboard/playground connections get ids like `pg-test-…`). **Apollo's Free plan blocks this endpoint (403 `API_INACCESSIBLE`)** — needs a paid Apollo plan
- `apify.ts` — Apify hosted actors, one sync HTTP call (`APIFY_TOKEN`, optional `APIFY_ACTOR_ID`; defaults to `compass/crawler-google-places`)
- `firecrawl.ts` — Firecrawl `/v2/search` + markdown, contacts pulled by regex, no LLM (`FIRECRAWL_API_KEY`). Drops listing pages (`isListingPage`: LinkedIn/Wikipedia/directories, "Top 5…"/"companies in…" titles); phones only from `tel:`, a "Tel/Telp:" label, or `+`-international format
- `outscraper.ts`, `serpapi.ts` — Google Maps data via paid APIs (`OUTSCRAPER_API_KEY`, `SERPAPI_API_KEY`)
- `foursquare.ts`, `here.ts`, `tomtom.ts`, `yelp.ts` — POI APIs (`FOURSQUARE_API_KEY` service key on the new `places-api.foursquare.com` host, `HERE_API_KEY`, `TOMTOM_API_KEY`, `YELP_API_KEY`)
- `overpass.ts` — keyless OpenStreetMap by **tag** inside a geocoded bbox ("dentist in bali"); public instances with fallback, `OVERPASS_URL` pins one
- `osm.ts` — keyless OpenStreetMap by **name** via Nominatim; also exports `geocode()` used by `overpass`/`here`
- `wikidata.ts` — keyless **B2B company** finder: companies by industry (P452) + country, nearly always with a website, no phone/email. Industry ids resolved via `wbsearchentities`, then one SPARQL query. The country is resolved to its item (`ID` → `wd:Q252`, cached) first — a `wdt:P297 "ID"` join inside the main query made WDQS take 30-40s and time out. Coverage is small (~20 Indonesian construction companies)
- `industries.ts` — B2B vocabulary (construction, oil & gas, mining, logistics, FMCG brands, …, with Indonesian aliases like `kontraktor`, `migas`, `sawit`) → Wikidata industry terms + OSM tags. `industryOf(what)` is also how `auto` decides a query is B2B
- `auto.ts` + `AUTO_CHAIN` in `index.ts` — the **default source**. Tries every source whose key is set in order (places → apollo* → outscraper → serpapi → apify → foursquare → here → tomtom → yelp → wikidata* → firecrawl → overpass → osm; *only for B2B queries — Wikidata sits before Firecrawl because web search returns listicles for "X companies in Y"), collecting until `limit` is reached (each source is asked only for what is still missing; duplicates across sources dropped by normalised name / website host — `dedupeKeys`), moving on when one throws or returns 0; leads are tagged with the source that actually hit (`RawLead.source`), so `leads.source` is never `'auto'`
- `reddit.ts` (Composio `REDDIT_SEARCH_ACROSS_SUBREDDITS`) and `social-apify.ts` (`twitter`, `threads`, `linkedin` via Apify actors `apidojo/tweet-scraper`, `futurizerush/meta-threads-scraper`, `harvestapi/linkedin-post-search`; override with `APIFY_<PLATFORM>_ACTOR`) — **social intent leads**: posts where someone states a need ("butuh jasa bikin aplikasi"). Lead = post author, `mapsUrl` = post link, `website` = author profile, post body in `leads.post_text` / `posted_at`. `social` runs every configured platform in parallel (`runAll` + `SOCIAL_STEPS`), splitting the limit and interleaving. Never part of `AUTO_CHAIN` (different kind of lead) and never website-enriched. **No intent filtering** — keyword search returns sellers' ads as often as buyers ("yang butuh jasa …, DM kami"); a regex filter was tried and dropped as too crude, the user triages manually. `intent.ts` only widens the search with buyer phrasings (`buyerQueries`: cari / rekomendasi / ada yang bisa …). Reddit via Composio needs `restrict_sr: true` (false = always empty), returns flat `{ posts: [...] }`, and only an `AND` of the need's words stays on topic. X goes through Apify because Composio has no managed X credentials; Reddit's keyless `.json` endpoints answer 403
- `composio.ts` — `composioExecute()` shared by Apollo and Reddit: resolves the Composio user id from the toolkit's active connection and surfaces the provider error hidden in the SDK's `cause`
- `index.ts` — `LEAD_SOURCES` map + `getLeadSource(name)`

**BYOK (per-workspace keys):** Settings → API keys saves a workspace's own source keys to `workspace_api_keys` (AES-256-GCM via `SECRETS_KEY`; helpers + the `BYOK_KEYS` allow-list in `packages/db/src/secrets.ts`). The scrape worker builds `env = { ...process.env, ...getWorkspaceKeys(workspaceId) }` and passes it as `ScrapeRequest.env` — **sources must read keys from `req.env`, never `process.env`**. Only names in `BYOK_KEYS` can be overridden; infra (`CAMOFOX_URL`, `OVERPASS_URL`, DB/Redis) stays server-only. Plaintext keys never reach the client (Settings shows the last 4 chars).

**Adding a source:** one file exporting a `LeadSourceFn`, one entry in `LEAD_SOURCES`, one value in `LeadSourceNameSchema` (`packages/shared/src/jobs.ts`), an option in `SOURCES` in `Topbar.tsx`, and a step in `AUTO_CHAIN` if it should be part of the fallback.

Notes:
- `@composio/core` is **ESM-only** and `apps/workers` compiles to CommonJS, so it is loaded with `await import(...)` inside `apollo.ts`. A static import fails to compile (TS1479).
- Composio's own **LinkedIn toolkit has no company/people search** (posts, comments and ads only). Apollo is the searchable LinkedIn-derived database — do not go looking for a `LINKEDIN_SEARCH` tool.
- `leads.mapsUrl` holds the source link for every source (a Google Maps URL for `places`, a LinkedIn company URL for `apollo`). <!-- ponytail: legacy column name, rename if a third source makes it confusing -->
- `apps/workers/src/sources/{apollo,sources,chain}.check.ts` — assert-based checks for the response parsing and the `auto` chain: `pnpm --filter workers exec tsx src/sources/<file>.ts`

**Python scrapers** (`apps/workers/src/python/`) — venv at `apps/workers/.venv/`, worker calls `.venv/bin/python` directly:
- `places_scraper.py` — **what `scrape.worker.ts` actually spawns.** Google Places API based (needs `GOOGLE_MAPS_API_KEY`), enriches with phone/website/email/WhatsApp
- `enrich_websites.py` — reuses `places_scraper.enrich_from_website` (https-first, contact paths incl. `/en/contact-us`, emails + WhatsApp + phones from `tel:` links and "Telp:" text). Follows the site's own contact links before guessing paths, retries without cert verification on broken SSL chains. Called by `sources/enrich.ts` from the scrape worker for every non-`places` lead with a website but no email, so website-only sources (Wikidata, Apollo, OSM) still reach the Contacts page. `enrich.ts` then runs optional layers on sites still empty, cheapest first: a self-hosted [camofox-browser](https://github.com/jo-inc/camofox-browser) (`CAMOFOX_URL`, free; reads the accessibility snapshot + only `mailto:`/`tel:` hrefs — other link URLs carry digit runs that parse as phones), Firecrawl `/v2/scrape` (JS rendering, `FIRECRAWL_ENRICH_MAX`) and ScrapeGraphAI **v2** `/api/extract` at `v2-api.scrapegraphai.com` (`SGAI_API_KEY`, `SGAI_ENRICH_MAX`; the v1 `api.scrapegraphai.com` host is deprecated and fails the TLS handshake). ScrapeGraph's LLM runs on their side — our token cost for scraping stays zero
- `maps_scraper.py` — legacy `scrapling` headless-browser scraper, superseded by `places_scraper.py`

## Frontend (Next.js)

**Framework:** Next.js 15 App Router, React 19, Tailwind v4

**State:** Zustand for the selected-lead bus (`apps/web/src/features/leads/store.ts`); everything else is local component state.

**Routes:**
- Marketing landing: `/` and `/start` — route group `(marketing)` (Cofounder brand, smooth-scroll via Lenis)
- Dashboard app — route group `(app)`: `/dashboard` (leads table + detail panel), `pipelines`, `contacts` (follow-up templates → WhatsApp/email/copy, logs to `lead_notes` with author `follow-up`; templates live in `email_templates`; a built-in Indonesian + English library of 12 B2B template types in `features/contacts/library.ts` — new workspaces are seeded with `LIBRARY_STARTERS`, the rest are added or edited-then-added from the Library panel. Keep template copy plain: no emoji, em dashes or filler), `scrapes`, `scrape-schedules`, `query` (NL→SQL assistant), `history`, `settings`
- Auth: `/login` — route group `(auth)`; `/auth/callback` route handler
- Next route handlers: `/api/leads/[id]/stage`, `/api/webhooks/resend` (Resend delivery/open/click events)

**Feature folders:** `apps/web/src/features/{leads,dashboard,scrape,assistant,contacts}` — colocate feature UI + store there, not under `app/`.

**Auth:** Supabase Auth via `@supabase/supabase-js` + `@supabase/ssr`. `apps/web/src/middleware.ts` refreshes the session and gates `/dashboard/*` — this is the **only** auth enforcement in the stack.

## Email Outreach

**One mailer for everything:** `packages/db/src/mailer.ts` (`deliverEmail`, `sendAndRecord`, `sendDueEmails`), used by the API (`email/mail.service.ts`), the worker's `cron/email-scheduler.ts`, and the web Contacts page (`sendLeadEmail` server action). `EMAIL_PROVIDER` picks the transport:
- **`gmail`** (default) — the workspace's Gmail via Composio REST (`GMAIL_SEND_EMAIL`, `COMPOSIO_API_KEY`, BYOK-able). Sends as the connected Gmail address; no tracking; ~500/day Gmail limit
- **`resend`** — `RESEND_API_KEY` + `RESEND_FROM_EMAIL` on a verified domain (both BYOK-able). Delivery/open/click webhooks land on `apps/web/src/app/api/webhooks/resend/route.ts`; `email/email.service.ts` now only holds that webhook bookkeeping, matched on `email_outreach.resendEmailId` (which stores every provider's message id)
- **`smtp`** (alias `sumopod`) — SumoPod SMTP via nodemailer (`SUMOPOD_SMTP_*`, `SUMOPOD_FROM_EMAIL`)

Every email is sent as **designed HTML + a text/plain part**: `packages/db/src/email-html.ts` turns a template's plain-text body into a table-based, inline-styled layout in the style of site-using.vercel.app (cream page, serif headline with `_italic_`, mono `::label`, numbered `- items`, orange `[Button]({{cta_url}})`). Brand comes from `EMAIL_BRAND_*` / `EMAIL_CTA_URL` (falls back to the workspace name); a body that already is HTML is sent as-is. The same renderer powers the Contacts preview (`@repo/db/email-html` entry — pure, no DB import, safe in client bundles). Check: `pnpm --filter @repo/db exec tsx src/email-html.check.ts`.

Every send is recorded in `email_outreach` (draft when `scheduledFor` is set, then queued → sent/failed). Keys are resolved per workspace (`process.env` + `getWorkspaceKeys`).

`EmailModule` is **not** registered in `app.module.ts`; it reaches the HTTP layer through `LeadsModule` (`POST /leads/:id/email` drafts with the cold-email agent, `POST /leads/:id/send-email` sends). Templates and sequences have their own controllers (`templates.controller.ts`, `sequences.controller.ts`) — reachable only if their module is wired in, so check before assuming an endpoint is live.

## Natural-language query (Assistant)

`POST /assistant/chat` → `assistant.service.ts` calls `generateLeadsSearchSql` (`packages/ai/src/agents/sql-search.ts`) to turn a question into SQL over `leads`, executes it with `db.execute(sql.raw(...))`, then summarizes the rows with an LLM. UI: `/dashboard/query`. **Generated SQL is executed** — any change here is a SQL-injection surface; keep the guardrails in `sql-search.ts` and the validation in `assistant.service.ts` intact.

Other standalone agents in `packages/ai/src/agents/`: `cold-email.ts` (outreach drafts), `smart-sales.ts`, `sql-search.ts` — these are called directly from API services, not through an orchestrator.

## Code Conventions

- **Files:** kebab-case
- **Components:** PascalCase filename matches export name
- **Imports:** node built-ins → external → workspace packages → relative
- **Workspace packages:** Reference as `workspace:*` (e.g., `@repo/db`, `@repo/shared`)
- **No `any`** — use `unknown` and narrow with type guards
- **No default exports** in packages; apps use them where frameworks require (Next.js pages, NestJS modules)
- **No lodash** — use native JS/TS methods
- **No moment** — use native `Intl` for date formatting
- **UI components:** Use `class-variance-authority` + `clsx` + `tailwind-merge` (from `@repo/ui`)

## Deployment (SumoPod PaaS)

Single Docker container runs all 3 apps via PM2 (`ecosystem.config.js`):
- `web` — Next.js on port 3000
- `api` — NestJS on port 3001
- `workers` — BullMQ worker (no port)

Dockerfile installs Node 22 + Python 3 + venv for scraper.

**Actual CI/CD** (`.github/workflows/ci-cd.yml`): on push to `main`, builds `api`/`workers`/`@repo/db`, then SSHes to a VPS (`VPS_HOST`/`VPS_USERNAME`/`VPS_SSH_KEY` secrets) to `git pull`, `pnpm install`, `pnpm turbo build --filter=api --filter=workers`, `pm2 restart all`. The web app deploys separately on Vercel (`vercel.json` builds from the repo root). Note the CI **does not run typecheck, lint, or the web build** — run the pre-commit checklist locally.

See `DEPLOY.md` for the Vercel + SumoPod walkthrough (predates the VPS pipeline; treat the workflow file as the source of truth).

## Not Yet Implemented

**Do not assume these exist:**
- Tests (no Vitest/Playwright/Supertest files; `pnpm test` is a no-op Turbo passthrough)
- NestJS auth guards or `@Public()` decorator — every API endpoint is open, `workspaceId` is client-supplied
- `nestjs-zod` for DTO validation
- `@nestjs/throttler` rate limiting
- `next-intl` i18n
- `react-hook-form`
- TanStack Query
- PostGIS geometry columns
- Soft-delete (`deletedAt` columns)
- Shared ESLint config (package is empty)
- Drizzle migrations directory (schema is pushed with `drizzle-kit push`)
- RSC/CSR separation patterns
- E2E tests

## Common Pitfalls

- When adding a BullMQ queue, register it in **both** NestJS module (`@nestjs/bullmq`) and add worker in `apps/workers/`
- Python scraper path resolved at runtime — don't move `apps/workers/src/python/` without updating worker spawn call
- Workspace package imports must use `exports` map — e.g., `@repo/shared`, `@repo/shared/env`, `@repo/shared/errors` (no deep path imports)
- `.env` loaded from repo root for API/workers — verify `dotenv -e ../../.env` wrapper exists in package.json scripts
- A new NestJS module must be added to `app.module.ts` `imports` or its controller's routes never mount (see `EmailModule`, which only rides along via `LeadsModule`)
- `packages/db` builds to `dist/` and is imported via `main`/`exports` — run its build (or `pnpm build`) after schema edits before API/workers pick them up
- Adding a schema file means also exporting it from `packages/db/src/schema/all.ts`

## Marketing Landing (Cofounder brand)

The Cofounder marketing site is folded into `apps/web` under the `(marketing)` route group:

- `apps/web/src/app/(marketing)/page.tsx` — home (`/`)
- `apps/web/src/app/(marketing)/start/page.tsx` — `/start` long-form chapter page
- `apps/web/src/app/(marketing)/layout.tsx` — mounts `LenisProvider` and preconnects to Google Fonts (Inter, JetBrains Mono, Lora)
- `apps/web/src/components/landing/` — `HeroScene`, `SkyScene`, `RocketScene`, `TopNav`, `LenisProvider`

`TopNav.tsx` references `/build`, `/sell`, `/scale` which are not yet implemented (404s by design — placeholders for future chapters).

**Styling note:** landing relies heavily on CSS gradients (sky scenes, chapter covers). The dashboard's "ban all gradients" rule from `globals.css` is scoped to the `.brutalist` class, which is applied on the `(app)/dashboard/` wrapper. Do not remove the `brutalist` class on the dashboard layout, and do not re-globalize the gradient ban.

## Related Docs

- `docs/tech-stack.md` — authoritative tech-stack reference (libraries, services, tools by layer)
- `docs/roadmap.md` — hackathon roadmap (5 features A-E with file touchpoints + time estimates)
- `docs/swarm-ai-plan.md` — full Swarm migration plan: multi-model strategy, per-phase implementation steps, risk/mitigation
- `CONTEXT.md` — full product vision and feature roadmap
- `AGENTS.md` — detailed technical guidance for AI agents (overlaps with this file, but includes more granular notes)
- `DEPLOY.md` — Vercel + SumoPod split deploy walkthrough (Indonesian)
- `docs/email-scraping.md`, `docs/EMAIL-SENDING-PLAN.md`, `docs/RESEND-SETUP.md` — email enrichment + outreach details
- `docs/scraping-cron-plan.md` — scrape scheduler design
- `docs/redis-migration.md` / `REDIS-MIGRATION.md` — Upstash → self-hosted Redis notes

**Doc drift warning:** this repo has ~18 root-level Markdown files, many written before the current code (`AGENTS.md` still calls the repo "an early-stage scaffold"). When a doc and the code disagree, the code wins.
