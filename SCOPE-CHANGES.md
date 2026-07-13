# SCOPE CHANGES

> Summary of features removed from original planning
> Date: 2026-07-13
> Reason: Focus on core value prop (lead generation CRM)

---

## 🎯 New Focus

**Before:** B2B CRM + Finance Simulator + Market Analysis  
**After:** Pure Lead Generation CRM (Map-first)

**Core Value Prop:** "Google Maps + Apollo.io + HubSpot, but mapped and AI-native"

---

## ❌ Removed Features

### 1. Finance Simulator (Entire Module)

**What was planned:**
- Transaction tracking system
- Cashflow forecasting (monthly projections)
- Multi-stakeholder AI simulation:
  - Owner perspective agent
  - Supplier perspective agent  
  - Customer perspective agent
  - Bank/lender perspective agent
  - Synthesizer agent (reconciles all views)
- Parallel agent orchestration
- Finance dashboard widgets
- `/finance/simulations` API endpoints
- Finance-specific database tables:
  - `simulations`
  - `transactions`
  - `finance_scenarios`

**Why removed:**
- Not core to lead generation use case
- Adds 2+ weeks development time
- Complicates product positioning
- Target users (sales reps, agencies) don't need financial forecasting
- Finance tools already exist (QuickBooks, Wave, etc.)

**Code affected:**
- `packages/ai/src/agents/finance.ts` (lead scoring agent - KEEP)
- `packages/ai/src/agents/finance-sim/*` (simulator agents - REMOVE)
- `packages/ai/src/finance-orchestrator.ts` (REMOVE)
- `apps/api/src/finance/` module (REMOVE)
- `apps/workers/src/queues/finance-simulation.worker.ts` (REMOVE)
- `packages/db/src/schema/simulations.ts` (REMOVE)
- `packages/db/src/schema/transactions.ts` (REMOVE)

---

### 2. Market Analysis Module

**What was planned:**
- SWOT analysis generator
- Competitive landscape mapping
- Market trend prediction
- Industry benchmarking
- Market analysis AI agents:
  - Industry analyst
  - Competitor analyst
  - Trend forecaster
  - Risk assessor
  - Synthesizer
- `/market/analyses` API endpoints
- `market_analyses` database table

**Why removed:**
- Overlaps with AI lead insights (weaknesses, opportunities already covered)
- Better served by dedicated market research tools
- Not actionable for day-to-day lead management
- Would require extensive data integrations (news APIs, industry databases)

**Code affected:**
- `packages/ai/src/agents/market-analysis/*` (REMOVE)
- `apps/api/src/market/` module (REMOVE)
- `packages/db/src/schema/market_analyses.ts` (REMOVE)

---

### 3. Advanced AI Orchestration (Swarm Architecture)

**What was planned:**
- Dynamic agent handoff (coordinators delegate to specialist agents)
- Swarm runtime for complex multi-step workflows
- Agent registry system
- `finance-simulation.workflow.ts`
- `market-analysis.workflow.ts`

**Why removed:**
- Over-engineered for lead scoring use case
- Simple sequential pipeline is sufficient (extractor → sales insights)
- Adds unnecessary complexity
- Hard to debug/maintain

**What we keep:**
- Sequential agent pipeline for lead enrichment:
  1. Extractor (basic data extraction)
  2. Review analyzer (sentiment + summary)
  3. Sales insights (weaknesses, opportunities)
- Single orchestrator (no swarm/handoff)

**Code affected:**
- `packages/ai/src/swarm/` directory (REMOVE)
- `packages/ai/src/*-coordinator.ts` agents (REMOVE)
- Keep: `packages/ai/src/orchestrator.ts` (simple sequential only)

---

## ✅ What Stays (Refined Scope)

### Lead Management CRM
- **Business Finder:** Scrape businesses from Google Maps
- **Lead Table View:** Sortable, filterable data table
- **Lead Detail View:** Editable fields, notes, activity timeline
- **Pipeline Kanban:** Drag-drop stages (New → Contacted → Qualified → Closed)
- **Map View:** MapLibre GL JS with clustering, filters, route planning
- **AI Enrichment:** Review summary, sales insights
- **Team Management:** Workspaces, users, territory assignment
- **Scraping Jobs:** Track scraping progress, view results

### AI Agents (Simplified)
- **Extractor:** Parse raw business data
- **Review Analyzer:** Sentiment + summary from Google reviews
- **Sales Insights:** Generate weaknesses, opportunities, cold email hooks
- *(No finance, no market, no swarm)*

### Database Schema (Cleaned)
- `leads` — Core business records
- `ai_insights` — AI-generated summaries
- `jobs` — Scraping job tracking
- `workspaces` — Multi-tenant
- `users` — Team members
- `territories` — (Optional) Geographic zones
- ~~`simulations`~~ (REMOVED)
- ~~`transactions`~~ (REMOVED)
- ~~`market_analyses`~~ (REMOVED)

---

## 📊 Impact Assessment

### Development Timeline
- **Before:** 4-5 weeks (CRM + finance + market)
- **After:** 3 weeks (pure CRM)
- **Time saved:** 1-2 weeks

### Codebase Complexity
- **Before:** 8 AI agents, 3 orchestrators, 12 database tables
- **After:** 3 AI agents, 1 orchestrator, 6 database tables
- **Reduction:** ~50% less code to maintain

### Product Clarity
- **Before:** "CRM + finance tool + market analyzer" (confusing positioning)
- **After:** "Map-first lead generation CRM" (clear value prop)

### Infrastructure Cost
- **Before:** Heavier AI usage (4+ agents per lead, finance simulations)
- **After:** Lighter AI usage (2-3 agents per lead)
- **Estimated savings:** ~60% less AI API costs

---

## 🔄 Migration Notes

### For Existing Codebase

If any finance/market code already exists in the repo:

1. **Move to archive branch:**
   ```bash
   git checkout -b archive/finance-features
   git add packages/ai/src/agents/finance-sim/
   git add apps/api/src/finance/
   git commit -m "Archive finance simulator features"
   git push origin archive/finance-features
   ```

2. **Remove from main:**
   ```bash
   git checkout main
   rm -rf packages/ai/src/agents/finance-sim/
   rm -rf apps/api/src/finance/
   rm -rf packages/db/src/schema/simulations.ts
   git commit -m "Remove finance simulator from scope"
   ```

3. **Update documentation:**
   - [x] PLANNING-SCOPE.md updated (finance features removed)
   - [ ] AGENTS.md needs update (remove finance agent references)
   - [ ] ARCHITECTURE.md needs update (remove finance orchestration)
   - [ ] CONTEXT.md already correct (never mentioned finance simulator)

---

## 🚀 Next Steps

1. **Review & approve** this scope change
2. **Clean up existing code** (if any finance/market modules exist)
3. **Update AGENTS.md** and **ARCHITECTURE.md** to reflect new scope
4. **Start implementation** per PLANNING-SCOPE.md (Week 1: UI Foundation)

---

## 📝 Future Considerations

Finance and market analysis features are **not permanently removed**. They could be:

- **Phase 2 features** (post-MVP, if user demand exists)
- **Separate product** ("Vonsel Finance" spin-off)
- **Partner integrations** (connect to QuickBooks, Xero, etc.)

For MVP → **focus on what makes us different: map-first lead generation.**

---

**Document Status:** Final  
**Last Updated:** 2026-07-13  
**Approved by:** Engineering Lead (pending)
