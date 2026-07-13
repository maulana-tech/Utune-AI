# PLANNING-SCOPE.md

> Task-Based Project Plan: B2B Lead Generation CRM (SaaS)
> Product: Map-first CRM for field sales teams
> Timeline: 5 weeks MVP
> Updated: 2026-07-13

---

## 🎯 Project Goals

**Primary Goal:** Launch SaaS product with 50 beta users by Week 6

**Core Features:**
- Multi-tenant auth & workspaces
- Business scraper (Google Maps data)
- Lead management (table, kanban, detail views)
- Map view with clustering
- Social media enrichment (Instagram, Facebook, TikTok)
- Subscription billing (Stripe)
- AI lead insights

---

## 📅 5-Week Sprint Plan

### **Week 1: Foundation & Auth** (Days 1-5)
**Goal:** Users can sign up, create workspace, see empty dashboard

### **Week 2: Scraping & Data** (Days 6-10)
**Goal:** Users can scrape businesses, view in table

### **Week 3: CRM Core** (Days 11-15)
**Goal:** Pipeline management, lead detail, AI enrichment

### **Week 4: Map & Social** (Days 16-20)
**Goal:** Map view, social media discovery

### **Week 5: Billing & Polish** (Days 21-25)
**Goal:** Payment integration, onboarding, beta launch

---

## Week 1: Foundation & Auth (Days 1-5)

### **Day 1: Setup & Design System**

#### Tasks:

**1.1 Project Setup**
- [ ] Install shadcn/ui in `apps/web`
  ```bash
  cd apps/web
  pnpm dlx shadcn-ui@latest init
  ```
- [ ] Add shadcn components: `button`, `input`, `card`, `dialog`, `dropdown-menu`, `sheet`, `table`
- [ ] Configure Tailwind with Twenty-inspired colors (see appendix)
- [ ] Setup `next-themes` for dark mode support

**Time:** 2 hours  
**Acceptance:** Design system documented in `/components/ui/README.md`

---

**1.2 Database Schema (Auth)**
- [ ] Create `packages/db/src/schema/auth.ts`
- [ ] Add tables: `users`, `workspaces`, `workspace_memberships`
- [ ] Add fields to `workspaces`:
  - `plan` (free/starter/pro/business)
  - `stripeCustomerId`, `stripeSubscriptionId`
  - `trialEndsAt`, `subscriptionStatus`
  - `leadsCount`, `monthlyScrapingQuota`, `monthlyScrapingUsed`
- [ ] Run migration: `pnpm db:generate && pnpm db:migrate`

**Time:** 2 hours  
**Acceptance:** Tables visible in `pnpm db:studio`

---

**1.3 Supabase Auth Setup**
- [ ] Create Supabase project (or use existing)
- [ ] Get API keys → add to `.env`
  ```
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...
  ```
- [ ] Create `lib/supabase/client.ts` (browser)
- [ ] Create `lib/supabase/server.ts` (server components)
- [ ] Setup auth middleware (`middleware.ts`)

**Time:** 1 hour  
**Acceptance:** Auth client works in console

---

**1.4 Sign Up Page**
- [ ] Create `app/(auth)/signup/page.tsx`
- [ ] Form: Email, Password, "Create Account" button
- [ ] On submit → Supabase signup
- [ ] Send email verification link
- [ ] Show loading state during signup
- [ ] Error handling (email exists, weak password)

**Time:** 3 hours  
**Acceptance:** Can create account, receive verification email

---

### **Day 2: Auth Flow & Workspace**

**2.1 Login Page**
- [ ] Create `app/(auth)/login/page.tsx`
- [ ] Form: Email, Password, "Remember me" checkbox
- [ ] "Forgot password?" link
- [ ] On submit → Supabase login
- [ ] Redirect to `/dashboard` on success
- [ ] Error handling (wrong password, email not verified)

**Time:** 2 hours  
**Acceptance:** Can login, redirected to dashboard

---

**2.2 Email Verification**
- [ ] Create `app/(auth)/verify-email/page.tsx`
- [ ] Show "Check your email" message after signup
- [ ] Handle verification token from email link
- [ ] Mark user as verified in DB
- [ ] Redirect to onboarding

**Time:** 1 hour  
**Acceptance:** Email verification works end-to-end

---

**2.3 Workspace Creation (Auto)**
- [ ] Create `apps/api/src/workspaces/workspaces.service.ts`
- [ ] Method: `createWorkspace(userId: string)`
  - Generate unique slug from email
  - Set default plan: `free`
  - Set trial: 7 days from now
  - Set quota: 15 scrapes/month
- [ ] Call from signup flow (after user created)
- [ ] Create workspace membership (role: owner)

**Time:** 2 hours  
**Acceptance:** New user auto-gets workspace in DB

---

**2.4 Dashboard Layout**
- [ ] Create `app/(app)/dashboard/layout.tsx`
- [ ] Sidebar navigation:
  - Dashboard (overview)
  - Leads
  - Map
  - Jobs
  - Settings
- [ ] Top bar:
  - Workspace switcher dropdown
  - Search (Cmd+K)
  - User menu (avatar, logout)
- [ ] Mobile responsive (hamburger menu)

**Time:** 4 hours  
**Acceptance:** Layout renders, sidebar links work

---

### **Day 3: Workspace Management**

**3.1 Workspace Switcher**
- [ ] Create `components/workspace-switcher.tsx`
- [ ] Dropdown shows all workspaces user is member of
- [ ] Display: workspace name + role badge
- [ ] "Create Workspace" button
- [ ] Switch workspace → update URL + reload data
- [ ] Store current workspace in cookie

**Time:** 3 hours  
**Acceptance:** Can switch between workspaces

---

**3.2 Create Workspace Dialog**
- [ ] Create dialog component
- [ ] Form: Workspace name
- [ ] On submit → POST `/api/workspaces`
- [ ] Auto-switch to new workspace after creation
- [ ] Close dialog

**Time:** 2 hours  
**Acceptance:** Can create multiple workspaces

---

**3.3 Settings Page (Basic)**
- [ ] Create `app/(app)/dashboard/settings/page.tsx`
- [ ] Tabs: General, Members, Billing
- [ ] General tab:
  - Workspace name (editable)
  - Workspace slug (read-only)
  - Delete workspace button (confirm dialog)
- [ ] Update workspace → PATCH `/api/workspaces/:id`

**Time:** 2 hours  
**Acceptance:** Can rename workspace

---

**3.4 API Client Setup**
- [ ] Create `lib/api/client.ts` (base fetch wrapper)
- [ ] Add auth headers (Supabase token)
- [ ] Add workspace header (`X-Workspace-ID`)
- [ ] Error handling (401, 403, 500)
- [ ] Create `lib/api/workspaces.ts` (typed methods)

**Time:** 1 hour  
**Acceptance:** API client documented

---

### **Day 4: Empty States & Onboarding**

**4.1 Dashboard Overview Page**
- [ ] Create `app/(app)/dashboard/page.tsx`
- [ ] Empty state (no leads yet):
  - Hero illustration
  - "Welcome to YourCRM!"
  - CTA: "Find Your First Leads"
- [ ] Stats widgets (when data exists):
  - Total leads
  - Leads by stage (pie chart)
  - Recent scraping jobs

**Time:** 3 hours  
**Acceptance:** Dashboard renders with empty state

---

**4.2 Onboarding Flow (Optional)**
- [ ] Create `app/(app)/onboarding/page.tsx`
- [ ] Step 1: "What industry?" (restaurant, retail, etc.)
- [ ] Step 2: "Company size?" (solo, 2-10, 11-50)
- [ ] Step 3: "Use case?" (field sales, cold email)
- [ ] Save to `workspaces.onboardingCompleted`
- [ ] Redirect to dashboard
- [ ] Skip option (dismiss onboarding)

**Time:** 3 hours  
**Acceptance:** Onboarding saves data to DB

---

**4.3 Command Menu (Cmd+K)**
- [ ] Install `cmdk` package
- [ ] Create `components/command-menu.tsx`
- [ ] Keyboard shortcut: Cmd/Ctrl + K
- [ ] Search leads (by name)
- [ ] Quick actions: "Create lead", "Start scraping job"
- [ ] Navigation: "Go to Dashboard", "Go to Settings"

**Time:** 2 hours  
**Acceptance:** Cmd+K opens, can search & navigate

---

### **Day 5: Testing & Documentation**

**5.1 Auth Flow Testing**
- [ ] Test: Sign up → verify email → login
- [ ] Test: Login → redirect to dashboard
- [ ] Test: Logout → redirect to login
- [ ] Test: Protected route access (without auth → login)
- [ ] Test: Workspace switcher (multi-workspace user)

**Time:** 2 hours  
**Acceptance:** All auth flows work

---

**5.2 Week 1 Documentation**
- [ ] Update `README.md` with setup instructions
- [ ] Document env variables needed
- [ ] Screenshot of dashboard layout
- [ ] List of completed features

**Time:** 1 hour  
**Acceptance:** Another dev can run project

---

**Week 1 Deliverable:**
✅ Users can sign up, verify email, login  
✅ Auto-create workspace on signup  
✅ Dashboard layout with sidebar  
✅ Workspace switcher  
✅ Empty state (ready for data)

---

## Week 2: Scraping & Data (Days 6-10)

### **Day 6: Database Schema (Leads)**

**6.1 Lead Schema**
- [ ] Create `packages/db/src/schema/leads.ts`
- [ ] Fields:
  ```typescript
  - id, workspaceId, name, address
  - latitude, longitude, placeId
  - phone, email, website
  - category, rating, reviewCount
  - stage (new/contacted/qualified/closed)
  - assignedTo (user FK)
  - jobId (scraping job FK)
  - createdAt, updatedAt
  ```
- [ ] Add indexes: `workspaceId`, `stage`, `assignedTo`
- [ ] Run migration

**Time:** 1 hour  
**Acceptance:** Leads table in DB

---

**6.2 Jobs Schema**
- [ ] Create `packages/db/src/schema/jobs.ts`
- [ ] Fields:
  ```typescript
  - id, workspaceId, query
  - status (pending/running/completed/failed)
  - resultCount, errorMessage
  - createdAt, completedAt
  ```
- [ ] Run migration

**Time:** 30 min  
**Acceptance:** Jobs table in DB

---

**6.3 API Endpoints (Leads)**
- [ ] Create `apps/api/src/leads/leads.controller.ts`
- [ ] `GET /leads` (filtered by workspaceId)
  - Query params: `stage`, `category`, `rating`, `assignedTo`
  - Sort: `createdAt`, `rating`, `name`
  - Pagination: `limit`, `offset`
- [ ] `GET /leads/:id`
- [ ] `POST /leads` (manual lead creation)
- [ ] `PATCH /leads/:id`
- [ ] `DELETE /leads/:id`
- [ ] `PATCH /leads/:id/stage` (quick stage update)

**Time:** 4 hours  
**Acceptance:** All endpoints work in Postman

---

### **Day 7: Business Scraper Integration**

**7.1 Jobs API**
- [ ] Create `apps/api/src/jobs/jobs.controller.ts`
- [ ] `POST /jobs/scrape`
  - Body: `{ query: string, category: string, location: object }`
  - Validate: workspace quota not exceeded
  - Create job record (status: pending)
  - Push to BullMQ `scrape-map` queue
  - Return job ID
- [ ] `GET /jobs` (list all jobs for workspace)
- [ ] `GET /jobs/:id` (single job + results)

**Time:** 3 hours  
**Acceptance:** Job creation works, pushes to queue

---

**7.2 Scraper Worker (Connect Existing)**
- [ ] Update `apps/workers/src/processors/scrape.processor.ts`
- [ ] After Python scraper completes:
  - Save each business to `leads` table
  - Set `jobId` FK
  - Set initial `stage` = 'new'
  - Increment `workspace.leadsCount`
  - Increment `workspace.monthlyScrapingUsed`
- [ ] Update job status to 'completed'
- [ ] Set `job.resultCount`

**Time:** 2 hours  
**Acceptance:** Scraping creates leads in DB

---

**7.3 Quota Enforcement**
- [ ] Check quota in `POST /jobs/scrape`:
  ```typescript
  if (workspace.monthlyScrapingUsed >= workspace.monthlyScrapingQuota) {
    throw new ForbiddenException('Monthly quota exceeded');
  }
  ```
- [ ] Check lead cap:
  ```typescript
  const limit = { free: 50, starter: 200, pro: 800, business: 2000 };
  if (workspace.leadsCount >= limit[workspace.plan]) {
    throw new ForbiddenException('Lead limit reached. Upgrade plan.');
  }
  ```

**Time:** 1 hour  
**Acceptance:** Quota blocks scraping when exceeded

---

### **Day 8: Leads Table View**

**8.1 Install TanStack Table**
- [ ] Install `@tanstack/react-table`, `@tanstack/react-query`
- [ ] Create `lib/api/leads.ts` (client-side fetch)
- [ ] Setup React Query provider

**Time:** 30 min  
**Acceptance:** Packages installed

---

**8.2 Data Table Component**
- [ ] Create `components/crm/data-table/data-table.tsx`
- [ ] Create `components/crm/data-table/columns.tsx`
  - Columns: Checkbox, Name, Address, Rating, Stage, Assigned, Actions
- [ ] Create `components/crm/data-table/toolbar.tsx`
  - Search by name/address
  - Filter by stage (dropdown)
  - Filter by rating (slider 1-5★)
  - Filter by category (multi-select)
- [ ] Pagination (10/25/50/100 per page)
- [ ] Row click → open detail panel

**Time:** 6 hours  
**Acceptance:** Table shows leads with filters

---

### **Day 9: Leads Page**

**9.1 Leads List Page**
- [ ] Create `app/(app)/dashboard/leads/page.tsx`
- [ ] Fetch leads via React Query
- [ ] Render `<DataTable />` component
- [ ] "New Lead" button (top right)
- [ ] Loading skeleton
- [ ] Empty state (no leads): "Run your first scraping job"

**Time:** 2 hours  
**Acceptance:** Leads page renders table

---

**9.2 Create Lead Dialog**
- [ ] Create `components/crm/create-lead-dialog.tsx`
- [ ] Form fields: Name, Address, Phone, Email, Website, Category
- [ ] Geocode address → get lat/lng (Google Geocoding API or Nominatim)
- [ ] On submit → POST `/api/leads`
- [ ] Refresh table after creation

**Time:** 3 hours  
**Acceptance:** Can manually add lead

---

**9.3 Bulk Actions**
- [ ] Select multiple leads (checkbox column)
- [ ] Bulk actions toolbar appears when >0 selected
- [ ] Actions:
  - Assign to rep (dropdown)
  - Change stage (dropdown)
  - Delete (with confirm)
- [ ] Show count: "3 leads selected"

**Time:** 2 hours  
**Acceptance:** Bulk stage change works

---

### **Day 10: Jobs Page**

**10.1 Jobs Table**
- [ ] Create `app/(app)/dashboard/jobs/page.tsx`
- [ ] Table columns: ID, Query, Status, Results, Created
- [ ] Status badge (pending=gray, running=blue, completed=green, failed=red)
- [ ] Click row → expand results (list of leads created)

**Time:** 2 hours  
**Acceptance:** Jobs history visible

---

**10.2 Create Scraping Job Form**
- [ ] "New Scraping Job" button
- [ ] Dialog form:
  - Query (e.g., "restaurants")
  - Location (City dropdown: Jakarta, Surabaya, Bali, etc.)
  - Category (dropdown: restaurant, retail, clinic, etc.)
- [ ] On submit → POST `/api/jobs/scrape`
- [ ] Show job ID + "Processing..." message
- [ ] Polling: Check job status every 5s until completed

**Time:** 3 hours  
**Acceptance:** Scraping job creates leads

---

**10.3 Quota Display**
- [ ] Show in top bar (or sidebar):
  ```
  📊 15/25 scrapes used this month
  💾 47/200 leads stored
  ```
- [ ] Warning when close to limit (80%)
- [ ] Block "New Job" button when quota exceeded

**Time:** 1 hour  
**Acceptance:** Quota visible, enforced

---

**Week 2 Deliverable:**
✅ Database schema for leads + jobs  
✅ Scraping integration working  
✅ Leads table view with filters  
✅ Manual lead creation  
✅ Jobs history page  
✅ Quota enforcement

---

## Week 3: CRM Core (Days 11-15)

### **Day 11: Lead Detail View**

**11.1 Detail Panel (Slide-over)**
- [ ] Install `vaul` (drawer library)
- [ ] Create `components/crm/detail-panel/panel.tsx`
- [ ] Slide from right (overlay)
- [ ] Close on: X button, Escape key, click outside
- [ ] Loading state when fetching lead

**Time:** 2 hours  
**Acceptance:** Panel opens/closes smoothly

---

**11.2 Lead Overview Tab**
- [ ] Create `components/crm/detail-panel/overview-tab.tsx`
- [ ] Display fields (editable on click):
  - Name (text input)
  - Address (text input)
  - Phone (tel input with click-to-call)
  - Email (email input)
  - Website (link, opens in new tab)
  - Category (select)
  - Rating (star display)
- [ ] Inline edit: Click field → input appears → Save/Cancel buttons
- [ ] On save → PATCH `/api/leads/:id`

**Time:** 4 hours  
**Acceptance:** Can edit fields inline

---

**11.3 Activity Tab**
- [ ] Create `components/crm/detail-panel/activity-tab.tsx`
- [ ] Timeline view (vertical):
  - Lead created (timestamp)
  - Stage changed (from → to)
  - Assigned to rep (user avatar)
  - Note added (text + author)
- [ ] "Add Note" button → textarea → save
- [ ] Store in `activities` table (polymorphic)

**Time:** 3 hours  
**Acceptance:** Activity timeline renders

---

### **Day 12: Pipeline Kanban**

**12.1 Install DnD Kit**
- [ ] Install `@dnd-kit/core`, `@dnd-kit/sortable`
- [ ] Create `components/crm/kanban/board.tsx`

**Time:** 30 min  
**Acceptance:** Package installed

---

**12.2 Kanban Board**
- [ ] Create `app/(app)/dashboard/leads/kanban/page.tsx`
- [ ] 4 columns: New, Contacted, Qualified, Closed
- [ ] Fetch leads grouped by stage
- [ ] Render cards in each column
- [ ] Card shows: Name, Address, Rating, Assigned avatar
- [ ] Click card → open detail panel

**Time:** 4 hours  
**Acceptance:** Kanban renders with data

---

**12.3 Drag-Drop Stage Change**
- [ ] Enable drag-drop between columns
- [ ] On drop → PATCH `/api/leads/:id/stage`
- [ ] Optimistic update (UI changes immediately)
- [ ] Revert if API fails
- [ ] Show toast: "Lead moved to Contacted"

**Time:** 3 hours  
**Acceptance:** Drag-drop updates stage

---

### **Day 13: AI Enrichment**

**13.1 AI Insights Schema**
- [ ] Create `packages/db/src/schema/ai_insights.ts`
- [ ] Fields:
  ```typescript
  - id, leadId
  - summary (review summary)
  - weaknesses (pain points detected)
  - opportunities (sales angles)
  - sentimentScore (-1 to 1)
  - createdAt
  ```
- [ ] Run migration

**Time:** 30 min  
**Acceptance:** Table in DB

---

**13.2 AI Enrichment API**
- [ ] Create `apps/api/src/ai/ai.controller.ts`
- [ ] `POST /ai/enrich/:leadId`
  - Fetch lead from DB
  - Call existing AI agents (extractor, review analyzer)
  - Save to `ai_insights` table
  - Return insights
- [ ] `GET /ai/insights/:leadId`

**Time:** 2 hours  
**Acceptance:** Endpoint triggers AI agents

---

**13.3 AI Insights Tab (Lead Detail)**
- [ ] Create `components/crm/detail-panel/ai-tab.tsx`
- [ ] Show loading when enriching
- [ ] Display:
  - Review summary (card)
  - Weaknesses (bullet list)
  - Opportunities (bullet list)
  - Sentiment score (gauge widget)
- [ ] "Refresh Insights" button

**Time:** 3 hours  
**Acceptance:** AI insights visible in panel

---

**13.4 Bulk AI Enrichment**
- [ ] In leads table, bulk actions:
  - "Enrich with AI" button (when leads selected)
- [ ] POST `/api/ai/enrich/bulk` (batch)
- [ ] Queue each lead in BullMQ
- [ ] Show progress: "5/10 completed"

**Time:** 2 hours  
**Acceptance:** Bulk enrichment works

---

### **Day 14: Team Management**

**14.1 Members Settings Page**
- [ ] Create `app/(app)/dashboard/settings/members/page.tsx`
- [ ] Table: Email, Role, Status, Actions
- [ ] "Invite Member" button

**Time:** 2 hours  
**Acceptance:** Members list renders

---

**14.2 Team Invites**
- [ ] Create `workspace_invitations` table:
  ```typescript
  - id, workspaceId, email, role
  - token (UUID), status (pending/accepted)
  - expiresAt (7 days)
  ```
- [ ] POST `/api/workspaces/:id/invites`
  - Generate invite token
  - Send email with magic link
  - Link format: `/accept-invite?token=xxx`
- [ ] `GET /accept-invite?token=xxx`
  - Verify token not expired
  - Create user if doesn't exist
  - Create workspace membership
  - Mark invite as accepted

**Time:** 4 hours  
**Acceptance:** Invite flow works end-to-end

---

**14.3 Role-Based Access**
- [ ] Define roles: Owner, Manager, Rep
- [ ] Permissions:
  - Owner: Full access, billing, delete workspace
  - Manager: Manage leads, invite reps, view all leads
  - Rep: View/edit only assigned leads
- [ ] Create guard: `@UseGuards(WorkspaceGuard)`
- [ ] In `GET /leads`, filter by role:
  ```typescript
  if (role === 'rep') {
    query.where('assignedTo', userId);
  }
  ```

**Time:** 3 hours  
**Acceptance:** Rep only sees assigned leads

---

### **Day 15: Dashboard Widgets**

**15.1 Stats Widgets**
- [ ] Create `GET /api/stats/dashboard`
  - Total leads count
  - Leads by stage (group by)
  - Recent jobs (last 5)
  - Top leads by rating
- [ ] Create widgets on dashboard page:
  - Total leads (number card)
  - Pipeline chart (pie/donut chart with recharts)
  - Recent jobs (mini table)
  - Top leads (mini table with ⭐)

**Time:** 4 hours  
**Acceptance:** Dashboard shows real data

---

**15.2 Empty State Improvements**
- [ ] If no leads: Show "Import first leads" CTA
- [ ] If no jobs: Show "Start scraping" button
- [ ] If no team members: Show "Invite team" button

**Time:** 1 hour  
**Acceptance:** Empty states guide user

---

**Week 3 Deliverable:**
✅ Lead detail panel with tabs  
✅ Kanban drag-drop pipeline  
✅ AI enrichment integration  
✅ Team invites + role-based access  
✅ Dashboard with stats widgets

---

## Week 4: Map & Social (Days 16-20)

### **Day 16: Map Foundation**

**16.1 Install MapLibre**
- [ ] Install `maplibre-gl`, `@turf/turf`, `supercluster`
- [ ] Add MapLibre CSS to layout

**Time:** 15 min  
**Acceptance:** Packages installed

---

**16.2 Map Container Component**
- [ ] Create `components/map/map-container.tsx`
- [ ] Initialize MapLibre map:
  - Style: OpenFreeMap (free tiles)
  - Center: Jakarta (-6.2088, 106.8456)
  - Zoom: 12
- [ ] Render in `app/(app)/dashboard/map/page.tsx`

**Time:** 2 hours  
**Acceptance:** Map renders with tiles

---

**16.3 Markers for Leads**
- [ ] Fetch all leads with lat/lng
- [ ] Add GeoJSON source to map
- [ ] Add circle layer (simple markers)
- [ ] Color by stage:
  - New: blue
  - Contacted: yellow
  - Qualified: green
  - Closed: gray

**Time:** 3 hours  
**Acceptance:** Leads appear as dots

---

### **Day 17: Map Clustering**

**17.1 Cluster Layer**
- [ ] Enable clustering in GeoJSON source:
  ```javascript
  cluster: true,
  clusterRadius: 50,
  clusterMaxZoom: 14,
  ```
- [ ] Add cluster circle layer (size by point count)
- [ ] Add cluster count label layer
- [ ] Click cluster → zoom to bounds

**Time:** 3 hours  
**Acceptance:** Dense areas show clusters

---

**17.2 Marker Popup**
- [ ] Click unclustered marker → show popup
- [ ] Popup content:
  - Lead name
  - Address
  - Rating (stars)
  - "View Details" button → open detail panel
- [ ] Close popup on map click

**Time:** 2 hours  
**Acceptance:** Popup shows lead info

---

**17.3 Map Filters Panel**
- [ ] Create sidebar filter panel:
  - Rating slider (1-5★)
  - Stage checkboxes
  - Category multi-select
  - Assigned to (user dropdown)
- [ ] Apply filters → re-fetch leads → update map markers
- [ ] Show count: "47 leads shown"

**Time:** 3 hours  
**Acceptance:** Filters update map

---

### **Day 18: Route Planning**

**18.1 Multi-Select Mode**
- [ ] Shift+Click markers to select
- [ ] Selected markers change color (highlighted)
- [ ] Show selected count: "5 leads selected"
- [ ] "Plan Route" button appears

**Time:** 2 hours  
**Acceptance:** Can select multiple markers

---

**18.2 Route Generation**
- [ ] Click "Plan Route" → call routing API
- [ ] Options:
  - Use OSRM (free, self-hosted or public instance)
  - URL: `http://router.project-osrm.org/route/v1/driving/{coords}`
- [ ] Get optimized route (multi-stop)
- [ ] Draw route polyline on map
- [ ] Show turn-by-turn list in sidebar

**Time:** 4 hours  
**Acceptance:** Route renders on map

---

**18.3 Export Route**
- [ ] "Export to Google Maps" button
- [ ] Generate Google Maps URL with waypoints
- [ ] Open in new tab

**Time:** 1 hour  
**Acceptance:** Opens Google Maps with route

---

### **Day 19: Social Media Integration**

**19.1 Social Profiles Schema**
- [ ] Create `packages/db/src/schema/social_profiles.ts`
- [ ] Fields:
  ```typescript
  - id, leadId
  - instagram (handle + follower count + last post date)
  - facebook (page URL + likes)
  - tiktok (handle + follower count)
  - linkedin (owner profile URL)
  - createdAt, updatedAt
  ```
- [ ] Run migration

**Time:** 30 min  
**Acceptance:** Table in DB

---

**19.2 Social Discovery (Basic)**
- [ ] Create `apps/api/src/social/social.service.ts`
- [ ] Method: `discoverSocial(leadName: string)`
  - Try username guess: `@{leadName.toLowerCase().replace(' ', '')}`
  - Check if Instagram account exists (via scraping or API)
  - Store handle if found
- [ ] POST `/api/social/discover/:leadId`

**Time:** 3 hours  
**Acceptance:** Can discover Instagram handle

---

**19.3 Apify Integration (Deep Enrichment)**
- [ ] Sign up for Apify (free tier: $5 credit)
- [ ] Create `lib/apify/client.ts`
- [ ] Method: `enrichInstagram(username: string)`
  - Call Apify Instagram Profile Scraper
  - Return: followers, posts, bio, latest posts
- [ ] POST `/api/social/enrich/:leadId` (deep)
  - Call Apify
  - Store full social data

**Time:** 2 hours  
**Acceptance:** Deep enrich gets follower count

---

**19.4 Social Tab (Lead Detail)**
- [ ] Create `components/crm/detail-panel/social-tab.tsx`
- [ ] Show:
  - Instagram card (if found)
    - Handle, follower count
    - "View Profile" button (opens IG)
    - "Refresh" button (re-scrape)
  - Facebook card
  - TikTok card
  - LinkedIn card
- [ ] "Discover Social" button (if not found yet)

**Time:** 3 hours  
**Acceptance:** Social profiles visible

---

### **Day 20: Social Features Polish**

**20.1 Bulk Social Discovery**
- [ ] In leads table, bulk action: "Discover Social Media"
- [ ] POST `/api/social/discover/bulk` (batch)
- [ ] Queue in BullMQ
- [ ] Show progress

**Time:** 2 hours  
**Acceptance:** Bulk social discovery works

---

**20.2 Social Icons in Table**
- [ ] Add "Social" column to leads table
- [ ] Show icons: 📱 (IG), 📘 (FB), 🎵 (TikTok), 💼 (LinkedIn)
- [ ] Tooltip on hover: "@warungsedap - 1.2