# PLANNING-SCOPE.md

> Build Twenty-inspired CRM UI into existing Next.js app
> Project: B2B Business Finder & Mapped CRM (Lead Management Focus)
> Date: 2026-07-13
> **Scope:** Pure CRM for lead management - Finance simulator removed

---

## Executive Summary (Revised)

**Goal:** Build a polished CRM UI directly into our existing Next.js app (`apps/web/`), inspired by Twenty's design system, focused purely on **lead management** (finding, enriching, mapping, pipeline management).

**Approach:** Build from scratch with shadcn/ui using Twenty as design reference. Connect to our existing NestJS backend (not Twenty's backend).

**Timeline:** 3 weeks (1 week UI foundation, 1 week CRM features, 1 week map integration)

**Key Benefit:** No separate Twenty deployment, full control over UI/UX, laser-focused on lead generation use case.

**Out of Scope:** Finance simulator, market analysis, transaction management (removed to focus on core value prop).

---

## Architecture (Revised)

### Current State

```
apps/web/          Next.js 15 (minimal scaffold, no CRM UI yet)
apps/api/          NestJS (REST + BullMQ)
apps/workers/      Python scraper + AI lead enrichment agents
packages/db/       Drizzle schema (leads, jobs, ai_insights, workspaces, users)
packages/ai/       AI agents for lead enrichment (extractor, reviews, sales insights)
```

### Target State

```
apps/web/
  ├── app/
  │   ├── (marketing)/
  │   │   └── page.tsx                    # Landing page (existing)
  │   └── (app)/
  │       └── dashboard/
  │           ├── page.tsx                # Overview (NEW: Twenty-style)
  │           ├── leads/
  │           │   ├── page.tsx            # Table view (NEW)
  │           │   ├── [id]/page.tsx       # Lead detail (NEW)
  │           │   └── kanban/page.tsx     # Pipeline kanban (NEW)
  │           ├── map/
  │           │   └── page.tsx            # Map view (CUSTOM)
  │           ├── jobs/page.tsx           # Scraping jobs (NEW)
  │           └── settings/page.tsx       # Settings (NEW)
  │
  ├── components/
  │   ├── crm/                            # Twenty-inspired components
  │   │   ├── data-table/
  │   │   │   ├── data-table.tsx          # Reusable table with filters
  │   │   │   ├── columns.tsx             # Column definitions
  │   │   │   └── toolbar.tsx             # Filters, search, views
  │   │   ├── kanban/
  │   │   │   ├── board.tsx               # Kanban board
  │   │   │   ├── column.tsx              # Stage column
  │   │   │   └── card.tsx                # Lead card
  │   │   ├── detail-panel/
  │   │   │   ├── panel.tsx               # Slide-over panel
  │   │   │   ├── tabs.tsx                # Activity, Notes, AI
  │   │   │   └── fields.tsx              # Editable fields
  │   │   └── command-menu/
  │   │       └── command.tsx             # Cmd+K quick actions
  │   └── map/                            # Custom map components
  │       ├── map-container.tsx
  │       ├── marker-cluster.tsx
  │       └── route-planner.tsx
  │
  └── lib/
      └── api/                            # API client (fetch to NestJS)
          ├── leads.ts                    # Lead CRUD + filters
          ├── jobs.ts                     # Scraping jobs
          └── workspaces.ts               # Workspace/team management
```

**Data flow:**
- User searches businesses → Next.js UI → NestJS API → BullMQ (scrape job)
- Python scraper → Results → DB (leads table)
- AI agents enrich leads (reviews summary, sales insights) → ai_insights table
- Next.js UI → Read enriched leads → Display in table/kanban/map views

**No Twenty backend involved!** Pure CRM for **lead generation and management**.

---

## Three Implementation Approaches

### Option A: Fork Twenty Frontend Components ⚠️

**How:** Clone Twenty repo, extract React components, adapt to our API.

**Pros:**
- Get Twenty's exact UI/UX
- Components are battle-tested

**Cons:**
- Twenty components tightly coupled to their GraphQL API
- Massive refactoring needed (~2000+ lines to adapt)
- Hard to maintain (Twenty updates won't apply easily)
- License: AGPL (requires releasing our code if we modify)

**Verdict:** ❌ **Not recommended** (too much work, legal complexity)

---

### Option B: Use shadcn/ui + TanStack Table (Inspired by Twenty) ✅

**How:** Build CRM UI from scratch using shadcn/ui components, use Twenty as design reference.

**Pros:**
- Full control, no coupling to Twenty
- shadcn/ui already used by Twenty internally
- MIT license (no restrictions)
- Easy to customize
- Integrates perfectly with Next.js 15

**Cons:**
- Have to build components ourselves (~1-2 weeks)
- Won't be 100% identical to Twenty UI

**Verdict:** ✅ **RECOMMENDED** (best balance of quality and control)

**Stack:**
```json
{
  "dependencies": {
    "@tanstack/react-table": "^8.11.0",    // Table with sorting, filtering
    "@tanstack/react-query": "^5.17.0",    // Data fetching
    "@dnd-kit/core": "^6.1.0",             // Drag-drop for kanban
    "cmdk": "^0.2.0",                      // Command menu (Cmd+K)
    "vaul": "^0.9.0",                      // Drawer/sheet for detail panel
    "recharts": "^2.10.0",                 // Charts for dashboard
    "date-fns": "^3.0.0",                  // Date formatting
    "zod": "^3.22.0",                      // Schema validation (already have)
    "react-hook-form": "^7.49.0"           // Forms
  }
}
```

---

### Option C: Hybrid - Use Twenty Cloud + Embed via iframe 🤔

**How:** Deploy Twenty separately, embed certain views via iframe.

**Pros:**
- Zero UI development
- Get Twenty updates automatically

**Cons:**
- Iframe = poor UX (no deep integration)
- Still need custom map view
- Duplicate auth, data sync issues

**Verdict:** ❌ **Not suitable** (defeats purpose of unified UX)

---

## Chosen Approach: Option B (shadcn/ui + Twenty Design Reference)

We'll build CRM UI components from scratch using **shadcn/ui**, styled to match Twenty's design system.

---

## Technical Specification

### 1. Design System (Twenty-inspired)

**Colors (extract from Twenty):**
```css
/* apps/web/app/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --primary: 218 70% 50%;          /* Twenty blue */
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 218 70% 50%;
  --accent-foreground: 0 0% 9%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 218 70% 50%;
  --radius: 0.5rem;
}
```

**Typography:**
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

### 2. Core Components to Build

#### A. Data Table (for Leads, Jobs)

**File:** `components/crm/data-table/data-table.tsx`

**Features:**
- Column sorting (click header)
- Multi-column filtering (AND/OR logic)
- Search (name, address, email)
- Column visibility toggle
- Row selection (checkbox)
- Pagination
- Saved views (dropdown to switch filters)

**Base:** TanStack Table + shadcn/ui Table component

**Example usage:**
```tsx
<DataTable
  columns={leadsColumns}
  data={leads}
  filterableColumns={['stage', 'rating', 'category']}
  searchableColumns={['name', 'address']}
  onRowClick={(lead) => openDetailPanel(lead)}
/>
```

#### B. Kanban Board (for Pipeline)

**File:** `components/crm/kanban/board.tsx`

**Features:**
- Drag-drop cards between stages
- Stage columns (New → Contacted → Qualified → Closed)
- Card shows: name, address, rating, assigned rep
- Click card → open detail panel
- "Add lead" button per stage

**Base:** @dnd-kit/core + custom styling

**Example:**
```tsx
<KanbanBoard
  stages={['new', 'contacted', 'qualified', 'closed']}
  leads={leads}
  onDragEnd={(leadId, newStage) => updateLeadStage(leadId, newStage)}
  onCardClick={(lead) => openDetailPanel(lead)}
/>
```

#### C. Detail Panel (Slide-over)

**File:** `components/crm/detail-panel/panel.tsx`

**Features:**
- Slide from right (like Twenty)
- Tabs: Overview, Activity, Notes, AI Insights
- Editable fields (click to edit)
- Action buttons: Call, Email, Schedule, Mark stage
- Close on Escape key

**Base:** Vaul drawer (or shadcn/ui Sheet)

**Example:**
```tsx
<DetailPanel lead={selectedLead} isOpen={isPanelOpen} onClose={closePanel}>
  <DetailTabs>
    <Tab name="Overview">
      <EditableField label="Name" value={lead.name} onSave={...} />
      <EditableField label="Phone" value={lead.phone} type="phone" />
      {/* ... */}
    </Tab>
    <Tab name="AI Insights">
      <AIInsightCard insights={lead.aiInsights} />
    </Tab>
  </DetailTabs>
</DetailPanel>
```

#### D. Command Menu (Cmd+K)

**File:** `components/crm/command-menu/command.tsx`

**Features:**
- Quick search leads (by name)
- Quick actions: "Create lead", "Start scraping job", "Open map"
- Navigation: "Go to Dashboard", "Go to Settings"
- Recent items

**Base:** cmdk library

**Example:**
```tsx
<Command>
  <CommandInput placeholder="Search or run a command..." />
  <CommandList>
    <CommandGroup heading="Quick Actions">
      <CommandItem onSelect={() => navigate('/dashboard/leads/new')}>
        Create Lead
      </CommandItem>
    </CommandGroup>
    <CommandGroup heading="Recent Leads">
      {recentLeads.map(lead => (
        <CommandItem key={lead.id} onSelect={() => openLead(lead.id)}>
          {lead.name}
        </CommandItem>
      ))}
    </CommandGroup>
  </CommandList>
</Command>
```

### 3. Map View (Custom - Unchanged from Original Plan)

**File:** `app/(app)/dashboard/map/page.tsx`

**Features:**
- MapLibre GL JS with OpenFreeMap tiles
- Markers for all leads (lat/lng from DB)
- Clustering for dense areas (supercluster)
- Filter panel: rating, stage, category, assigned rep
- Click marker → mini popup with lead summary + "View details" button
- Multi-select mode → route planning
- Territory polygons (if Territory feature exists)

**No changes** from original PLANNING-SCOPE.md map spec.

---

## Implementation Phases (Revised)

### Phase 1: UI Foundation (Week 1)

**Goal:** Setup shadcn/ui, build core reusable components.

#### Tasks

**Day 1: Setup**
- [ ] Install shadcn/ui: `pnpm dlx shadcn-ui@latest init`
- [ ] Add components: `table`, `sheet`, `dialog`, `command`, `button`, `input`, `select`
- [ ] Configure Tailwind with Twenty-inspired colors
- [ ] Setup TanStack Query for data fetching

**Day 2-3: Data Table**
- [ ] Create `components/crm/data-table/` structure
- [ ] Build DataTable component with TanStack Table
- [ ] Add column sorting, filtering, search
- [ ] Add column visibility toggle
- [ ] Test with mock lead data

**Day 4: Detail Panel**
- [ ] Create `components/crm/detail-panel/`
- [ ] Build slide-over panel with Vaul
- [ ] Add tabs (Overview, Activity, Notes, AI)
- [ ] Editable fields (click-to-edit inline)

**Day 5: Command Menu + Layout**
- [ ] Build command menu (Cmd+K)
- [ ] Create dashboard layout:
  - Sidebar navigation
  - Top bar (workspace switcher, search, user menu)
  - Breadcrumbs
- [ ] Test navigation flow

**Success Criteria:**
- ✅ Data table shows 50 leads with sorting/filtering
- ✅ Detail panel opens on row click
- ✅ Cmd+K search works
- ✅ Layout matches Twenty's general structure

---

### Phase 2: CRM Features (Week 2)

**Goal:** Build all CRM pages, connect to NestJS API.

#### Day 1-2: Leads Pages

**Table View** (`app/(app)/dashboard/leads/page.tsx`):
```tsx
export default async function LeadsPage() {
  const leads = await fetchLeads(); // Server Component fetch from NestJS

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Button onClick={() => navigate('/dashboard/leads/new')}>
          + New Lead
        </Button>
      </div>
      <DataTable
        columns={leadsColumns}
        data={leads}
        filterableColumns={['stage', 'rating', 'category']}
      />
    </div>
  );
}
```

**Lead Detail** (`app/(app)/dashboard/leads/[id]/page.tsx`):
- Full-page view (alternative to slide-over)
- All fields visible + editable
- Activity timeline (calls, emails, notes)
- AI insights section

**Tasks:**
- [ ] Create leads table page
- [ ] Create lead detail page
- [ ] Add "Create lead" form
- [ ] Wire up to NestJS `/api/leads` endpoints
- [ ] Test CRUD operations

#### Day 3: Kanban Pipeline

**File:** `app/(app)/dashboard/leads/kanban/page.tsx`

**Tasks:**
- [ ] Build kanban board component
- [ ] Fetch leads grouped by stage
- [ ] Implement drag-drop to update stage
- [ ] Add "Quick add lead" button per column
- [ ] Persist stage changes to DB

#### Day 4: Jobs (Scraping) Page

**File:** `app/(app)/dashboard/jobs/page.tsx`

**Features:**
- Table showing all scraping jobs (from DB `jobs` table)
- Columns: ID, query, status, result count, created date
- "Create new job" button → form with:
  - Country/city selector
  - Business type (category)
  - Enrichment options (emails, reviews, AI insights)
- Job detail: shows progress, results, errors

**Tasks:**
- [ ] Create jobs table page
- [ ] Create "New job" form
- [ ] Wire to `POST /api/jobs/scrape`
- [ ] Add real-time status updates (polling or WebSocket)

#### Day 5: Dashboard Overview

**File:** `app/(app)/dashboard/page.tsx`

**Widgets (Lead-focused only):**
- Total leads (number)
- Leads by stage (pie chart: New, Contacted, Qualified, Closed)
- Recent scraping jobs (table: status, count, date)
- Top leads by rating (mini table: 5★ businesses)
- Map preview (small embedded map showing last 20 leads)
- AI enrichment status (% of leads with AI insights)

**Tasks:**
- [ ] Create dashboard page
- [ ] Add recharts for lead pipeline chart
- [ ] Fetch aggregated data from NestJS (`GET /api/stats/dashboard`)
- [ ] Make widgets clickable (navigate to filtered views)

**Success Criteria:**
- ✅ Full CRUD for leads working
- ✅ Kanban drag-drop updates DB
- ✅ Scraping job creation triggers workers
- ✅ Dashboard shows real lead data (no finance/market widgets)

---

### Phase 3: Map Integration (Week 3)

**Goal:** Build custom map view, integrate with CRM.

#### Day 1-2: Map Foundation

**Tasks:**
- [ ] Create `app/(app)/dashboard/map/page.tsx`
- [ ] Initialize MapLibre GL JS
- [ ] Fetch leads with lat/lng from NestJS API
- [ ] Render markers for all leads
- [ ] Add popup on marker click (name, address, rating)

#### Day 3: Map Filters & Clustering

**Tasks:**
- [ ] Build filter panel (sidebar):
  - Rating slider (1-5★)
  - Stage checkboxes
  - Category multi-select
  - Assigned rep dropdown
- [ ] Implement clustering with supercluster
- [ ] Update markers when filters change

#### Day 4: Route Planning

**Tasks:**
- [ ] Add multi-select mode (shift+click markers)
- [ ] "Plan Route" button appears when 2+ selected
- [ ] Call routing API (OSRM or MapLibre Directions)
- [ ] Render route polyline on map
- [ ] Show turn-by-turn list in sidebar
- [ ] "Export to Google Maps" link

#### Day 5: Territory Overlay (Optional)

**Tasks:**
- [ ] Add Territory management page (`/dashboard/territories`)
- [ ] Draw polygon tool on map (MapLibre Draw plugin)
- [ ] Save territories to DB
- [ ] Render territory polygons on map
- [ ] Color-code by assigned rep

**Success Criteria:**
- ✅ Map shows 100+ leads with clustering
- ✅ Filters work (rating, stage, etc.)
- ✅ Route planning generates optimal route
- ✅ Click marker → detail panel opens
- ✅ Map view feels like native part of CRM (not separate tool)

---

## Data Schema (No Changes)

We keep the existing Drizzle schema in `packages/db/src/schema/`:

```typescript
// packages/db/src/schema/leads.ts
export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  rating: doublePrecision('rating'),
  reviewCount: integer('review_count'),
  category: text('category'), // "restaurant", "dentist", "lawyer", etc.
  stage: text('stage').default('new'), // new | contacted | qualified | closed
  assignedTo: uuid('assigned_to').references(() => users.id),
  placeId: text('place_id'), // Google Maps Place ID (unique)
  jobId: uuid('job_id').references(() => jobs.id), // Which scraping job created this
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// packages/db/src/schema/ai_insights.ts (existing)
export const aiInsights = pgTable('ai_insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  leadId: uuid('lead_id').references(() => leads.id).notNull(),
  summary: text('summary'), // AI-generated review summary
  weaknesses: text('weaknesses'), // Detected pain points
  opportunities: text('opportunities'), // Sales angles
  sentimentScore: doublePrecision('sentiment_score'), // -1 to 1
  createdAt: timestamp('created_at').defaultNow(),
});

// packages/db/src/schema/territories.ts (Phase 3 - optional)
export const territories = pgTable('territories', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
  name: text('name').notNull(),
  polygon: text('polygon'), // GeoJSON string
  assignedTo: uuid('assigned_to').references(() => users.id),
  color: text('color').default('#3B82F6'),
  createdAt: timestamp('created_at').defaultNow(),
});

// packages/db/src/schema/jobs.ts (existing)
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
  query: text('query').notNull(), // "restaurants in Jakarta"
  status: text('status').default('pending'), // pending | running | completed | failed
  resultCount: integer('result_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});
```

**Key Tables:**
- `leads` — Core business records from scraping
- `ai_insights` — AI-generated summaries (1:1 with leads)
- `jobs` — Scraping job queue tracking
- `workspaces` — Multi-tenant isolation
- `users` — Team members (assigned to leads/territories)
- `territories` — (Optional) Geographic zones for reps

**Removed from scope:** `simulations`, `transactions`, `market_analyses` (finance features).

---

## API Integration

### NestJS Endpoints (existing + new)

```typescript
// apps/api/src/leads/leads.controller.ts

@Controller('leads')
export class LeadsController {
  // Existing
  @Get()
  async findAll(@Query() filters: LeadFilterDto) {
    return this.leadsService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  // New
  @Post()
  async create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.leadsService.delete(id);
  }

  @Patch(':id/stage')
  async updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.leadsService.updateStage(id, dto.stage);
  }
}
```

### Next.js API Client

```typescript
// apps/web/lib/api/leads.ts
import { env } from '@repo/shared/env';

const API_URL = env.API_URL || 'http://localhost:3001';

export async function getLeads(filters?: LeadFilters) {
  const params = new URLSearchParams(filters as any);
  const res = await fetch(`${API_URL}/leads?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
}

export async function getLead(id: string) {
  const res = await fetch(`${API_URL}/leads/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch lead');
  return res.json();
}

export async function updateLeadStage(id: string, stage: string) {
  const res = await fetch(`${API_URL}/leads/${id}/stage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) throw new Error('Failed to update stage');
  return res.json();
}

function getToken() {
  // Get from cookies or session (Supabase auth)
  return 'token';
}
```

---

## Scope Changes (Finance Features Removed)

### What's IN Scope (Lead Management CRM)

✅ **Business Finder**
- Search businesses by location + category
- Python scraper (Google Maps data)
- Bulk import to CRM (up to 1000 leads/job)

✅ **CRM Core**
- Lead table view (sortable, filterable)
- Lead detail view (editable fields)
- Pipeline kanban (drag-drop stages)
- Notes & activity timeline
- Assign leads to team members

✅ **Map View**
- MapLibre GL JS with clustering
- Filter by rating/stage/category
- Territory overlay (zones for reps)
- Route planning (multi-stop optimization)

✅ **AI Lead Enrichment**
- Review summary (sentiment analysis)
- Sales insights (weaknesses, opportunities)
- Smart cold email generation (Phase 2)

✅ **Team Management**
- Workspaces (multi-tenant)
- User roles (owner, manager, rep)
- Territory assignment

### What's OUT of Scope

❌ **Finance Simulator** (removed)
- Transaction tracking
- Cashflow forecasting
- Multi-stakeholder simulation
- Finance agents (owner/supplier/customer/bank)

❌ **Market Analysis** (removed)
- SWOT analysis
- Competitive landscape
- Market trend prediction

❌ **Advanced Workflows** (deferred to Phase 2)
- Email campaigns
- Calendar sync
- Voice transcription
- Automation triggers

**Focus:** We're building a **pure lead generation CRM**, not a finance tool. This aligns with CONTEXT.md's core value prop: "Google Maps + Apollo.io, but mapped."

---

## Timeline Summary (Focused Scope)

### Week 1: UI Foundation
- shadcn/ui setup + Twenty-inspired design system
- Data table component (TanStack Table)
- Detail panel (slide-over)
- Command menu (Cmd+K)
- Dashboard layout (sidebar + top bar)

### Week 2: CRM Features
- Leads CRUD pages (table + detail)
- Kanban pipeline (drag-drop stages)
- Jobs (scraping) page + form
- Dashboard overview (lead-focused widgets)
- API integration (NestJS endpoints)

### Week 3: Map Integration
- Map rendering (MapLibre GL JS)
- Clustering & filters (rating, stage, category)
- Route planning (OSRM integration)
- Territory overlay (draw polygons)

**Total:** 3 weeks (faster without finance/market features)
**Saved:** ~1-2 weeks by removing finance simulator scope

---

## Resource Requirements

### Team
- 1 full-stack developer (you) - 3 weeks full-time

### Infrastructure
- **No additional services** (same VPS, no Twenty container)
- Cost: $0 extra (existing stack)

### Dependencies (New)
```bash
pnpm add @tanstack/react-table @tanstack/react-query
pnpm add @dnd-kit/core @dnd-kit/sortable
pnpm add cmdk vaul recharts
pnpm add react-hook-form date-fns
pnpm add maplibre-gl @turf/turf supercluster
```

---

## Success Metrics

### Week 1
- [ ] Data table works with 100 leads
- [ ] Detail panel opens smoothly
- [ ] Layout feels like modern CRM

### Week 2
- [ ] Can create/edit/delete leads via UI
- [ ] Kanban drag-drop updates DB
- [ ] Scraping job triggers workers successfully

### Week 3
- [ ] Map renders 500+ leads with clustering
- [ ] Route planning generates valid route
- [ ] Full workflow: search → scrape → view on map → manage pipeline

### Overall (Lead CRM Focus)
- [ ] **Development velocity:** 3 weeks for full CRM (vs 4-5 weeks with finance features)
- [ ] **Feature completeness:** 100% of lead management MVP done
- [ ] **UX Quality:** Matches Twenty's polish (based on tester feedback)
- [ ] **No scope creep:** Zero finance/market features built
- [ ] **No vendor lock-in:** 100% our code, MIT licensed dependencies

---

## Open Questions

### 1. Should we copy Twenty's exact design?
**Options:**
- A) Match Twenty 1:1 (colors, spacing, layout)
- B) Inspired by Twenty but with our brand colors

**Recommendation:** **Option B** - Use Twenty's structure/UX patterns but customize colors to match your brand. This gives polish without looking like a clone.

### 2. Real-time updates for scraping progress?
**Options:**
- A) Polling (every 5s refresh job status)
- B) WebSocket (real-time push from NestJS)

**Recommendation:** **Option A** for MVP (simpler), upgrade to Option B in Phase 2 if needed.

### 3. Mobile responsive?
**Question:** Should CRM work well on mobile or desktop-only?

**Recommendation:** Desktop-first for MVP (CRM power users use desktop). Make responsive in Phase 2 post-launch.

---

## Next Steps

1. **Approve this revised plan**
2. **Start Week 1, Day 1:**
   ```bash
   cd apps/web
   pnpm dlx shadcn-ui@latest init
   pnpm add @tanstack/react-table @tanstack/react-query
   ```
3. **I can scaffold:**
   - [ ] `components/crm/data-table/` boilerplate
   - [ ] Dashboard layout with sidebar
   - [ ] Sample leads API endpoint in NestJS

Want me to proceed with scaffolding? 🚀

---

**Document Status:** V2 (Revised approach - built-in UI)  
**Last Updated:** 2026-07-13  
**Owner:** Engineering Team
