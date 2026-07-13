<div align="center">
  <img src="apps/web/src/logo.png" alt="utune Agent" width="120" />
</div>

# utune Agent — Multi-Agent B2B Intelligence System

Collaborative AI system dengan 4+ specialized agents untuk scraping, scoring, dan menganalisis prospek B2B — **live production** dengan data real dari Google Maps.

[![Status](https://img.shields.io/badge/Status-Live-success)](https://utune-ai.vercel.app)
[![Leads](https://img.shields.io/badge/Leads-45-blue)](https://utune-ai.vercel.app)

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Vercel (Edge)                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Next.js 15 App Router                                      │   │
│  │  • Landing: /  /start  /login                               │   │
│  │  • Dashboard: /dashboard/* (leads, finance, market, reports)│   │
│  └──────────────┬──────────────────────────────────────────────┘   │
│                 │ Server Components (pooler :6543)                 │
└─────────────────┼──────────────────────────────────────────────────┘
                  │ HTTP (CORS)
┌─────────────────▼──────────────────────────────────────────────────┐
│                VPS — Ubuntu 24.04 (Cloudeka Jakarta)               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  PM2 Process Manager                                        │   │
│  │  ┌──────────────────────┐  ┌────────────────────────────┐   │   │
│  │  │  API (NestJS 11)     │  │  Workers (BullMQ)          │   │   │
│  │  │  :3001               │  │  ┌──────────────────────┐  │   │   │
│  │  │  • /jobs/scrape      │  │  │ Scrape Worker        │  │   │   │
│  │  │  • /leads/*          │  │  │ (Python scrapling)   │  │   │   │
│  │  │  • /scrape-schedules │  │  ├──────────────────────┤  │   │   │
│  │  │  • /assistant/chat   │  │  │ OrchestratedAI       │  │   │   │
│  │  └──────────────────────┘  │  │ (4 agents pipeline)  │  │   │   │
│  │                             │  ├──────────────────────┤  │   │   │
│  │                             │  │ FinanceSim           │  │   │   │
│  │                             │  │ (5 agents parallel)  │  │   │   │
│  │                             │  ├──────────────────────┤  │   │   │
│  │                             │  │ MarketAnalysis       │  │   │   │
│  │                             │  │ (5 agents parallel)  │  │   │   │
│  │                             │  ├──────────────────────┤  │   │   │
│  │                             │  │ MarketScrape         │  │   │   │
│  │                             │  ├──────────────────────┤  │   │   │
│  │                             │  │ Cron Scheduler       │  │   │   │
│  │                             │  │ (tick setiap 15min)  │  │   │   │
│  │                             │  └──────────────────────┘  │   │   │
│  │                             └────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Python Virtual Env (.venv)                                 │   │
│  │  • maps_scraper.py (Google Maps via scrapling + Playwright) │   │
│  │  • market_scraper.py (industry market data)                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
        │ 5432 direct              │ Redis (BullMQ)         │ NVIDIA NIM
        ▼                          ▼                        ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  Supabase    │          │  Upstash     │          │  NVIDIA NIM  │
│  Postgres    │          │  Redis       │          │  LLM APIs    │
│  15 tables   │          │  Queue       │          │  9 agents    │
└──────────────┘          └──────────────┘          └──────────────┘
```

---

## Fitur

### Scraping Otomatis (Google Maps)
| Fitur | Detail |
|---|---|
| **Python scraper** | scrapling + Playwright (headless Chromium) |
| **Data yang diambil** | Nama, alamat, phone, website, lat/lng, maps_url |
| **Cron scheduler** | Tick tiap 15 menit, proses jadwal scrape bergantian |
| **Schedules aktif** | 13 kategori: F&B, Kecantikan, Pendidikan, Otomotif, dll |

### Multi-Agent AI Pipeline
| Agent | Peran |
|---|---|
| **Extractor** | Parse data mentah → structured fields |
| **Finance** | Analisis budget capacity + financial health |
| **Marketing** | Messaging fit + pain points |
| **Strategy** | Sintesis semua agent → final recommendation |
| **Owner/Supplier/Customer/Bank** | Finance simulation (paralel, 4 stakeholder) |
| **Competitor/Trend/Risk/Demand** | Market analysis (paralel, 4 angle) |

### Database (Postgres — 15 tables)
`workspaces`, `users`, `leads`, `jobs`, `scrape_schedules`, `ai_insights`, `lead_scores`, `agent_logs`, `simulations`, `swarm_runs`, `market_analyses`, `market_data`, `market_reports`, `transactions`, `agent_logs`

---

## Bukti Sistem Berjalan

### 🔴 Live Production

| Endpoint | URL | Status |
|---|---|---|
| Frontend | https://utune-ai.vercel.app | ✅ 200 |
| API | http://43.129.54.139:3001 | ✅ Online |
| Worker | PM2 — 2 processes | ✅ 24m+ uptime |

### 📊 Database — 45 Leads Tersimpan

```
Pipeline: Prospecting (45)
┌─────────────────────────────────────────────────┐
│ salon kecantikan jakarta    ████████████████  28 │
│ coffee shop jakarta         ███                5 │
│ Bakery                      ▏                  1 │
│ Laundry                     ▏                  1 │
│ Beauty Service              ▏                  1 │
│ Auto Service                ▏                  1 │
│ Furniture Retail            ▏                  1 │
│ ... (7 more categories)                          │
└─────────────────────────────────────────────────┘
```

**3 leads terbaru:**
| Nama | Kategori | Koordinat |
|---|---|---|
| TOMORO COFFEE - Halte Bundaran HI | coffee shop jakarta | -6.1939, 106.8230 |
| % Arabica Jakarta Plaza Indonesia | coffee shop jakarta | -6.1930, 106.8213 |
| Harlan+Holden | coffee shop jakarta | -6.1935, 106.8219 |

### ⏰ Cron Scheduler — 13 Schedule Aktif

| Kategori | Query | Interval | Status |
|---|---|---|---|
| F&B | restaurant jakarta | 60 menit | ✅ Active |
| Kopi & Minuman | coffee shop jakarta | 720 menit | ✅ Active |
| Kecantikan | salon kecantikan jakarta | 720 menit | ✅ Running |
| Kuliner | warung makan jakarta | 720 menit | ✅ Active |
| Kesehatan | klinik jakarta | 720 menit | ✅ Active |
| Ritel Pakaian | toko baju jakarta | 1440 menit | ✅ Active |
| Percetakan | percetakan jakarta | 1440 menit | ✅ Active |
| Logistik | jasa pengiriman jakarta | 1440 menit | ✅ Active |
| Teknologi | service laptop jakarta | 1440 menit | ✅ Active |
| Pendidikan | bimbel jakarta | 1440 menit | ✅ Active |
| Otomotif | bengkel motor jakarta | 1440 menit | ✅ Active |
| Properti | agen properti jakarta | 2880 menit | ✅ Active |
| Furnitur & Dekor | toko furnitur jakarta | 2880 menit | ✅ Active |

### 🧪 Test Flow (End-to-End)

```bash
# 1. Trigger scrape via API
curl -X POST http://43.129.54.139:3001/jobs/scrape \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"a1b2c3d4-...","query":"coffee shop jakarta","limit":5}'
# → {"jobId":"11"}

# 2. Worker pickup & scrape Google Maps
# → [Scrape] Starting scrape: query="coffee shop jakarta" limit=5
# → [Scrape] Scraped 5 results for "coffee shop jakarta"
# → [Scrape] Job 11 completed

# 3. Data masuk ke DB (leads table)
curl http://43.129.54.139:3001/leads?workspaceId=a1b2c3d4-...
# → [45 leads terdaftar]
```

### 🖥️ PM2 Status (VPS)

```
┌────┬──────────┬────────┬──────┬───────────┬──────────┐
│ id │ name     │ uptime │ ↺    │ status    │ mem      │
├────┼──────────┼────────┼──────┼───────────┼──────────┤
│ 0  │ api      │ 24m    │ 0    │ online    │ 11.8mb   │
│ 1  │ workers  │ 11m    │ 2    │ online    │ 52.6mb   │
└────┴──────────┴────────┴──────┴───────────┴──────────┘
```

---

## Tech Stack

| Layer | Technology | Status |
|---|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind v4, MapLibre GL | ✅ Live |
| **API** | NestJS 11 (REST), BullMQ queues, tsx runtime | ✅ Live |
| **Workers** | 5 BullMQ workers + cron scheduler | ✅ Live |
| **Scraper** | Python 3.12, scrapling, Playwright (headless Chromium) | ✅ Live |
| **Database** | PostgreSQL 15 (Supabase), Drizzle ORM | ✅ Connected |
| **Queue** | Redis + BullMQ (Upstash) | ✅ Connected |
| **AI/LLM** | NVIDIA NIM (Llama 3.1 70B + 8B), Vercel AI SDK | ✅ Configured |
| **Auth** | Supabase Auth (JWT) | ✅ Integrated |
| **Orchestration** | Swarm AI (v2 — replaces legacy orchestrators) | ✅ Ready |

---

## Deployment

| Platform | Berisi | Biaya |
|---|---|---|
| **Vercel** (Hobby) | Next.js frontend | Gratis |
| **VPS** (SumoPod — Cloudeka Jakarta) | NestJS API + BullMQ workers + Python scraper | Rp 75.000/bln |
| **Supabase** (Free) | PostgreSQL + Auth | Gratis |
| **Upstash** (Free) | Redis (BullMQ queue) | Gratis |
| **NVIDIA NIM** | LLM inference (9 agents) | Gratis (dev quota) |

Detail: [DEPLOY.md](./DEPLOY.md)

---

## Quick Start (Local Dev)

```bash
git clone [repo-url]
cd utune-agent
pnpm install
cp .env.example .env  # isi DATABASE_URL, REDIS_URL, NVIDIA_API_KEY
pnpm dev              # turbo: web (3000) + api (3001) + workers
```

---

## Project Structure

```
utune-agent/
├── apps/
│   ├── web/          Next.js 15 App Router (frontend)
│   ├── api/          NestJS 11 REST API + BullMQ queue bridge
│   └── workers/      BullMQ workers + Python scraper + cron
├── packages/
│   ├── ai/           AI agents (NVIDIA NIM via Vercel AI SDK)
│   ├── db/           Drizzle schema + client (node-postgres)
│   ├── shared/       Zod schemas, env validation, shared types
│   └── ui/           React component primitives
├── Dockerfile        Production container (api + workers)
├── ecosystem.config.js  PM2 config
└── vercel.json       Vercel deployment config
```

---

## Dokumentasi

- [DEPLOY.md](./DEPLOY.md) — Deployment guide (Vercel + VPS)
- [COMPETITION.md](./COMPETITION.md) — Submission document
- [CONTEXT.md](./CONTEXT.md) — Product vision
- [AGENTS.md](./AGENTS.md) — AI assistant guide

## Qhomemart AI Agent Challanges
