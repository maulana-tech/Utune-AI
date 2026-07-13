# PROJECT TASKS - B2B Lead CRM SaaS

> Detailed task breakdown with checkboxes
> Timeline: 5 weeks to MVP
> Updated: 2026-07-13

---

## 🎯 Sprint Overview

| Week | Focus | Deliverable |
|------|-------|-------------|
| **Week 1** | Auth & Foundation | Working signup/login, dashboard layout |
| **Week 2** | Scraping & Data | Lead scraping, table view, quota system |
| **Week 3** | CRM Core | Kanban, detail panel, AI enrichment, team |
| **Week 4** | Map & Social | Map view with clustering, social discovery |
| **Week 5** | Billing & Launch | Stripe integration, polish, beta launch |

---

## Week 1: Auth & Foundation (Days 1-5)

### Day 1: Setup (6 hours)

**Setup Design System**
- [ ] `cd apps/web && pnpm dlx shadcn-ui@latest init`
- [ ] Add components: button, input, card, dialog, dropdown, sheet, table
- [ ] Configure Tailwind colors (Twenty-inspired palette)
- [ ] Test: Dark mode toggle works

**Database Schema - Auth**
- [ ] Create `packages/db/src/schema/users.ts`
- [ ] Create `packages/db/src/schema/workspaces.ts`
- [ ] Add billing fields to workspaces (plan, stripeCustomerId, etc.)
- [ ] Create `workspace_memberships` table (user-workspace M2M)
- [ ] Run: `pnpm db:generate && pnpm db:migrate`
- [ ] Test: Tables visible in `pnpm db:studio`

**Supabase Setup**
- [ ] Create Supabase project or use existing
- [ ] Copy API keys to `.env`
- [ ] Create `lib/supabase/client.ts` (browser)
- [ ] Create `lib/supabase/server.ts` (server components)
- [ ] Create `middleware.ts` (protect /dashboard routes)
- [ ] Test: Auth client initialized in console

---

### Day 2: Auth Pages (6 hours)

**Signup Page**
- [ ] Create `app/(auth)/signup/page.tsx`
- [ ] Form: email + password + checkbox (agree to terms)
- [ ] Submit → `supabase.auth.signUp()`
- [ ] Show loading spinner during signup
- [ ] Error handling: email exists, weak password
- [ ] Success → redirect to `/verify-email`
- [ ] Test: Can create account, receive email

**Login Page**
- [ ] Create `app/(auth)/login/page.tsx`
- [ ] Form: email + password + "remember me"
- [ ] Submit → `supabase.auth.signInWithPassword()`
- [ ] "Forgot password?" link
- [ ] Error handling: wrong credentials, unverified email
- [ ] Success → redirect to `/dashboard`
- [ ] Test: Can login with valid credentials

**Email Verification**
- [ ] Create `app/(auth)/verify-email/page.tsx`
- [ ] Show "Check your email" message
- [ ] Handle token from email link
- [ ] Mark user as verified
- [ ] Redirect to dashboard
- [ ] Test: Verification link works

---

### Day 3: Workspace Setup (7 hours)

**Auto-Create Workspace**
- [ ] Create `apps/api/src/workspaces/workspaces.service.ts`
- [ ] Method: `createWorkspace(userId)` - generates slug, sets defaults
- [ ] Call from signup webhook (after user created)
- [ ] Create membership record (role: owner)
- [ ] Test: New user gets workspace automatically

**Dashboard Layout**
- [ ] Create `app/(app)/dashboard/layout.tsx`
- [ ] Sidebar: Dashboard, Leads, Map, Jobs, Settings
- [ ] Top bar: Workspace switcher, search, user avatar
- [ ] Hamburger menu for mobile
- [ ] Test: Layout responsive, navigation works

**Workspace Switcher**
- [ ] Create `components/workspace-switcher.tsx`
- [ ] Dropdown shows all user's workspaces
- [ ] Display: name + role badge
- [ ] "Create Workspace" option
- [ ] Switch workspace → update cookie + reload
- [ ] Test: Can switch between multiple workspaces

---

### Day 4: Settings & UX (7 hours)

**Dashboard Overview**
- [ ] Create `app/(app)/dashboard/page.tsx`
- [ ] Empty state: illustration + "Find Your First Leads" CTA
- [ ] Stats widgets (show when data exists)
- [ ] Test: Empty state renders

**Settings Page**
- [ ] Create `app/(app)/dashboard/settings/page.tsx`
- [ ] Tabs: General, Members, Billing
- [ ] General: Edit workspace name, view slug, delete button
- [ ] Update → `PATCH /api/workspaces/:id`
- [ ] Test: Can rename workspace

**Command Menu**
- [ ] Install `cmdk` package
- [ ] Create `components/command-menu.tsx`
- [ ] Trigger: Cmd/Ctrl + K
- [ ] Search: leads (future)
- [ ] Quick actions: Create lead, Start job
- [ ] Navigation: Go to Dashboard, Settings
- [ ] Test: Cmd+K opens, navigation works

**Create Workspace Dialog**
- [ ] Dialog with form (workspace name)
- [ ] Submit → `POST /api/workspaces`
- [ ] Auto-switch to new workspace
- [ ] Test: Can create second workspace

---

### Day 5: API Client & Testing (4 hours)

**API Client**
- [ ] Create `lib/api/client.ts` (fetch wrapper)
- [ ] Add auth header (Supabase token)
- [ ] Add workspace header (`X-Workspace-ID`)
- [ ] Error handling: 401, 403, 500
- [ ] Create `lib/api/workspaces.ts` (typed methods)
- [ ] Test: API calls include correct headers

**Week 1 Testing**
- [ ] Test flow: Signup → verify → login → dashboard
- [ ] Test: Logout redirects to login
- [ ] Test: Protected routes require auth
- [ ] Test: Workspace switcher works
- [ ] Document: Update README with setup steps

---

## Week 2: Scraping & Data (Days 6-10)

### Day 6: Database Schema (4 hours)

**Leads Table**
- [ ] Create `packages/db/src/schema/leads.ts`
- [ ] Fields: id, workspaceId, name, address, lat, lng, phone, email, website, category, rating, reviewCount, stage, assignedTo, jobId
- [ ] Indexes: workspaceId, stage, assignedTo
- [ ] Run migration
- [ ] Test: Table in DB with proper constraints

**Jobs Table**
- [ ] Create `packages/db/src/schema/jobs.ts`
- [ ] Fields: id, workspaceId, query, status, resultCount, errorMessage, createdAt, completedAt
- [ ] Run migration
- [ ] Test: Table in DB

**Leads API Endpoints**
- [ ] Create `apps/api/src/leads/leads.controller.ts`
- [ ] `GET /leads` - filter by workspace, stage, category, rating
- [ ] `GET /leads/:id`
- [ ] `POST /leads` - manual creation
- [ ] `PATCH /leads/:id`
- [ ] `DELETE /leads/:id`
- [ ] `PATCH /leads/:id/stage` - quick stage update
- [ ] Test: All endpoints in Postman

---

### Day 7: Scraper Integration (6 hours)

**Jobs API**
- [ ] Create `apps/api/src/jobs/jobs.controller.ts`
- [ ] `POST /jobs/scrape` - validate quota, create job, push to BullMQ
- [ ] `GET /jobs` - list all for workspace
- [ ] `GET /jobs/:id` - single job + results
- [ ] Test: Job creation pushes to queue

**Scraper Worker Update**
- [ ] Update `apps/workers/src/processors/scrape.processor.ts`
- [ ] After scraping: save each result to `leads` table
- [ ] Set `jobId`, `stage=new`
- [ ] Increment `workspace.leadsCount`
- [ ] Increment `workspace.monthlyScrapingUsed`
- [ ] Update job status to completed
- [ ] Test: Scraping creates leads in DB

**Quota Enforcement**
- [ ] Check monthly quota in `POST /jobs/scrape`
- [ ] Check lead cap by plan (free: 50, starter: 200, pro: 800, business: 2000)
- [ ] Return 403 if exceeded
- [ ] Test: Quota blocks when limit reached

---

### Day 8: Leads Table UI (7 hours)

**Setup TanStack Table**
- [ ] Install `@tanstack/react-table`, `@tanstack/react-query`
- [ ] Create `lib/api/leads.ts` (client fetch)
- [ ] Setup React Query provider in layout
- [ ] Test: Query provider works

**Data Table Component**
- [ ] Create `components/crm/data-table/data-table.tsx`
- [ ] Create `components/crm/data-table/columns.tsx`
- [ ] Columns: Checkbox, Name, Address, Rating, Stage, Assigned, Actions
- [ ] Sorting: Click column headers
- [ ] Pagination: 10/25/50/100 per page
- [ ] Row click → open detail panel (stub for now)
- [ ] Test: Table renders, sorting works

**Toolbar & Filters**
- [ ] Create `components/crm/data-table/toolbar.tsx`
- [ ] Search box (name/address)
- [ ] Filter dropdown: Stage (multi-select)
- [ ] Filter slider: Rating (1-5★)
- [ ] Filter dropdown: Category (multi-select)
- [ ] Clear filters button
- [ ] Test: Filters update query, table rerenders

---

### Day 9: Leads Page & CRUD (7 hours)

**Leads List Page**
- [ ] Create `app/(app)/dashboard/leads/page.tsx`
- [ ] Fetch leads via `useQuery`
- [ ] Render `<DataTable />`
- [ ] "New Lead" button (top right)
- [ ] Loading skeleton
- [ ] Empty state: "Run your first scraping job"
- [ ] Test: Page loads with data

**Create Lead Dialog**
- [ ] Create `components/crm/create-lead-dialog.tsx`
- [ ] Form: Name, Address, Phone, Email, Website, Category
- [ ] Geocode address (Nominatim API or Google)
- [ ] Submit → `POST /api/leads`
- [ ] Success → close dialog + refresh table
- [ ] Test: Manual lead creation works

**Bulk Actions**
- [ ] Select leads via checkbox
- [ ] Bulk toolbar appears when >0 selected
- [ ] Actions: Assign to user, Change stage, Delete
- [ ] Confirmation dialog for delete
- [ ] Show count: "3 leads selected"
- [ ] Test: Bulk stage change updates DB

---

### Day 10: Jobs Page (6 hours)

**Jobs Table**
- [ ] Create `app/(app)/dashboard/jobs/page.tsx`
- [ ] Table: ID, Query, Status (badge), Results, Created
- [ ] Status colors: pending=gray, running=blue, completed=green, failed=red
- [ ] Click row → expand to show leads created
- [ ] Test: Jobs history visible

**Create Job Form**
- [ ] "New Scraping Job" button
- [ ] Dialog form: Query, Location (dropdown), Category
- [ ] Submit → `POST /api/jobs/scrape`
- [ ] Show job ID + polling status
- [ ] Poll every 5s until completed
- [ ] Test: Job completes, creates leads

**Quota Display**
- [ ] Show in sidebar or top bar:
  - `📊 15/25 scrapes used`
  - `💾 47/200 leads stored`
- [ ] Warning badge at 80%
- [ ] Block "New Job" button if exceeded
- [ ] Test: Quota updates after scraping

---

## Week 3: CRM Core (Days 11-15)

### Day 11: Lead Detail Panel (7 hours)

**Slide-over Panel**
- [ ] Install `vaul` (drawer library)
- [ ] Create `components/crm/detail-panel/panel.tsx`
- [ ] Opens from right, overlay background
- [ ] Close: X button, Escape key, click outside
- [ ] Loading state
- [ ] Test: Panel animates smoothly

**Overview Tab**
- [ ] Create `components/crm/detail-panel/overview-tab.tsx`
- [ ] Display fields (editable):
  - Name, Address, Phone, Email, Website, Category, Rating
- [ ] Inline edit: Click → input → Save/Cancel
- [ ] Phone: Click-to-call link
- [ ] Submit → `PATCH /api/leads/:id`
- [ ] Test: Field updates save to DB

**Activity Tab**
- [ ] Create `components/crm/detail-panel/activity-tab.tsx`
- [ ] Timeline: Lead created, Stage changed, Assigned, Note added
- [ ] "Add Note" textarea + Save button
- [ ] Store in `activities` table
- [ ] Test: Notes appear in timeline

---

### Day 12: Kanban Board (7 hours)

**DnD Setup**
- [ ] Install `@dnd-kit/core`, `@dnd-kit/sortable`
- [ ] Create `components/crm/kanban/board.tsx`
- [ ] Create `components/crm/kanban/column.tsx`
- [ ] Create `components/crm/kanban/card.tsx`
- [ ] Test: Basic kanban structure renders

**Kanban Page**
- [ ] Create `app/(app)/dashboard/leads/kanban/page.tsx`
- [ ] 4 columns: New, Contacted, Qualified, Closed
- [ ] Fetch leads grouped by stage
- [ ] Render cards: Name, Address, Rating, Avatar
- [ ] Click card → open detail panel
- [ ] Test: Kanban shows leads by stage

**Drag-Drop**
- [ ] Enable drag between columns
- [ ] On drop → `PATCH /api/leads/:id/stage`
- [ ] Optimistic UI update
- [ ] Revert if API fails
- [ ] Toast notification: "Lead moved to Contacted"
- [ ] Test: Drag-drop updates stage

---

### Day 13: AI Enrichment (7 hours)

**AI Schema**
- [ ] Create `packages/db/src/schema/ai_insights.ts`
- [ ] Fields: id, leadId, summary, weaknesses, opportunities, sentimentScore
- [ ] Run migration
- [ ] Test: Table in DB

**AI API**
- [ ] Create `apps/api/src/ai/ai.controller.ts`
- [ ] `POST /ai/enrich/:leadId` - call existing AI agents, save insights
- [ ] `GET /ai/insights/:leadId`
- [ ] `POST /ai/enrich/bulk` - batch enrich (queue in BullMQ)
- [ ] Test: Enrichment creates insights record

**AI Tab (Detail Panel)**
- [ ] Create `components/crm/detail-panel/ai-tab.tsx`
- [ ] Show: Review summary, Weaknesses, Opportunities, Sentiment
- [ ] "Refresh Insights" button
- [ ] Loading state during enrichment
- [ ] Test: AI insights visible after enrichment

**Bulk Enrich**
- [ ] Add "Enrich with AI" to bulk actions
- [ ] Progress indicator: "5/10 completed"
- [ ] Test: Bulk enrichment queues all leads

---

### Day 14: Team Management (7 hours)

**Members Page**
- [ ] Create `app/(app)/dashboard/settings/members/page.tsx`
- [ ] Table: Email, Role, Status, Actions (Remove)
- [ ] "Invite Member" button
- [ ] Test: Members list renders

**Invitations System**
- [ ] Create `workspace_invitations` table (email, token, role, status, expiresAt)
- [ ] `POST /api/workspaces/:id/invites` - send email with magic link
- [ ] Email template with invite link
- [ ] `GET /accept-invite?token=xxx` - verify, create membership
- [ ] Test: Full invite flow works

**Role-Based Access**
- [ ] Define roles: Owner, Manager, Rep
- [ ] Create `@UseGuards(WorkspaceGuard)` decorator
- [ ] Filter leads by role (Rep sees only assigned)
- [ ] Test: Rep can't see other reps' leads

---

### Day 15: Dashboard Widgets (6 hours)

**Stats API**
- [ ] Create `apps/api/src/stats/stats.controller.ts`
- [ ] `GET /stats/dashboard` - total leads, by stage, recent jobs, top leads
- [ ] Test: Returns aggregated data

**Widget Components**
- [ ] Total leads card (number)
- [ ] Pipeline chart (pie/donut - use recharts)
- [ ] Recent jobs mini-table
- [ ] Top leads by rating
- [ ] Render on dashboard page
- [ ] Test: Widgets show real data

**Empty State Improvements**
- [ ] No leads → "Import first leads" CTA
- [ ] No jobs → "Start scraping" button
- [ ] No members → "Invite team" button
- [ ] Test: CTAs link to correct pages

---

## Week 4: Map & Social (Days 16-20)

### Day 16: Map Foundation (7 hours)

**MapLibre Setup**
- [ ] Install `maplibre-gl`, `@turf/turf`, `supercluster`
- [ ] Import MapLibre CSS in layout
- [ ] Test: Packages installed

**Map Container**
- [ ] Create `components/map/map-container.tsx`
- [ ] Initialize MapLibre: OpenFreeMap style, center Jakarta, zoom 12
- [ ] Create `app/(app)/dashboard/map/page.tsx`
- [ ] Render map container
- [ ] Test: Map renders with tiles

**Lead Markers**
- [ ] Fetch leads with lat/lng
- [ ] Add GeoJSON source
- [ ] Add circle layer (color by stage)
- [ ] Test: Leads appear as colored dots

---

### Day 17: Map Clustering (7 hours)

**Cluster Layer**
- [ ] Enable clustering in GeoJSON source
- [ ] Add cluster circle layer (size by count)
- [ ] Add cluster count label
- [ ] Click cluster → zoom to bounds
- [ ] Test: Dense areas show clusters

**Marker Popup**
- [ ] Click marker → show popup
- [ ] Popup: Name, Address, Rating, "View Details" button
- [ ] Button opens detail panel
- [ ] Close popup on map click
- [ ] Test: Popup shows correct data

**Filter Panel**
- [ ] Create sidebar with filters:
  - Rating slider (1-5★)
  - Stage checkboxes
  - Category multi-select
  - Assigned to dropdown
- [ ] Apply filters → refetch + update map
- [ ] Show count: "47 leads shown"
- [ ] Test: Filters work correctly

---

### Day 18: Route Planning (7 hours)

**Multi-Select**
- [ ] Shift+Click markers to select
- [ ] Change selected marker color
- [ ] Show count: "5 leads selected"
- [ ] "Plan Route" button appears
- [ ] Test: Multi-select works

**Route Generation**
- [ ] Click "Plan Route" → call OSRM API
- [ ] URL: `http://router.project-osrm.org/route/v1/driving/{coords}`
- [ ] Parse response, draw polyline
- [ ] Show turn-by-turn list in sidebar
- [ ] Test: Route renders on map

**Export Route**
- [ ] "Export to Google Maps" button
- [ ] Generate Google Maps URL with waypoints
- [ ] Open in new tab
- [ ] Test: Opens Google Maps with route

---

### Day 19: Social Media (7 hours)

**Social Schema**
- [ ] Create `packages/db/src/schema/social_profiles.ts`
- [ ] Fields: id, leadId, instagram (handle, followers), facebook, tiktok, linkedin
- [ ] Run migration
- [ ] Test: Table in DB

**Basic Discovery**
- [ ] Create `apps/api/src/social/social.service.ts`
- [ ] Method: `discoverSocial(leadName)` - try username guess
- [ ] Check if Instagram exists (basic scrape)
- [ ] `POST /api/social/discover/:leadId`
- [ ] Test: Discovers simple handles

**Apify Integration**
- [ ] Sign up for Apify, get API key
- [ ] Create `lib/apify/client.ts`
- [ ] Method: `enrichInstagram(username)` - call Apify scraper
- [ ] `POST /api/social/enrich/:leadId` (deep enrich)
- [ ] Test: Gets follower count via Apify

**Social Tab**
- [ ] Create `components/crm/detail-panel/social-tab.tsx`
- [ ] Cards for: Instagram, Facebook, TikTok, LinkedIn
- [ ] Show: Handle, followers, "View Profile" link
- [ ] "Discover Social" button
- [ ] Test: Social data displays

---

### Day 20: Social Polish (6 hours)

**Bulk Discovery**
- [ ] Add "Discover Social Media" to bulk actions
- [ ] `POST /api/social/discover/bulk`
- [ ] Queue in BullMQ, show progress
- [ ] Test: Batch discovery works

**Social Icons**
- [ ] Add "Social" column to leads table
- [ ] Icons: 📱 (IG), 📘 (FB), 🎵 (TikTok), 💼 (LinkedIn)
- [ ] Tooltip on hover: handle + follower count
- [ ] Test: Icons show correct platforms

**AI Social Insights**
- [ ] Analyze social posts for pain points
- [ ] Show in AI tab: "Posted 3x about 'susah manage pesanan'"
- [ ] Suggest talking points
- [ ] Test: AI detects pain points from posts

---

## Week 5: Billing & Launch (Days 21-25)

### Day 21: Stripe Setup (7 hours)

**Stripe Account**
- [ ] Create Stripe account
- [ ] Create products:
  - Starter: $15/mo
  - Pro: $49/mo
  - Business: $149/mo
- [ ] Copy price IDs to env
- [ ] Install `stripe` package
- [ ] Test: Stripe dashboard accessible

**Billing Service**
- [ ] Create `apps/api/src/billing/billing.service.ts`
- [ ] Method: `createCheckoutSession(workspaceId, plan)`
- [ ] Method: `handleWebhook(event)` - checkout.completed, subscription.deleted
- [ ] Create `POST /api/billing/checkout` endpoint
- [ ] Create `POST /api/webhooks/stripe` endpoint
- [ ] Test: Checkout session created

**Webhook Handler**
- [ ] Handle `checkout.session.completed` - update workspace plan
- [ ] Handle `invoice.payment_succeeded` - renew subscription
- [ ] Handle `customer.subscription.deleted` - cancel subscription
- [ ] Test: Webhooks update DB correctly

---

### Day 22: Pricing & Upgrade (7 hours)

**Pricing Page (Marketing)**
- [ ] Create `app/(marketing)/pricing/page.tsx`
- [ ] 4 pricing cards: Free, Starter, Pro, Business
- [ ] Feature comparison table
- [ ] CTA buttons: "Start Free" / "Upgrade"
- [ ] Test: Pricing page renders

**Upgrade Flow**
- [ ] "Upgrade" button in dashboard (when free plan)
- [ ] Redirect to Stripe Checkout
- [ ] Success → redirect back with `?success=true`
- [ ] Show success toast, update plan badge
- [ ] Test: Full payment flow works

**Billing Settings**
- [ ] Add Billing tab to settings
- [ ] Show: Current plan, next renewal, usage
- [ ] "Manage Subscription" button → Stripe portal
- [ ] Test: Can view billing info

**Usage Indicators**
- [ ] Progress bars: Leads used, Scrapes used
- [ ] Warning at 80%: "Almost at limit"
- [ ] Upgrade CTA when at 100%
- [ ] Test: Indicators update in real-time

---

### Day 23: Landing Page (7 hours)

**Hero Section**
- [ ] Create `app/(marketing)/page.tsx`
- [ ] Headline: "Map-First CRM for Field Sales Teams"
- [ ] Subheadline: "Find, map, and close B2B leads faster"
- [ ] CTA: "Start Free Trial" (→ /signup)
- [ ] Hero image: Screenshot of map view
- [ ] Test: Landing page renders

**Features Section**
- [ ] 4 feature cards:
  - 🗺️ Map View with Clustering
  - 🤖 AI Lead Enrichment
  - 📱 Social Media Discovery
  - 🚀 Route Planning
- [ ] Each with icon + description
- [ ] Test: Feature cards render

**How It Works**
- [ ] 3 steps:
  1. Search businesses by location
  2. View leads on map
  3. Close deals faster
- [ ] Step-by-step illustrations
- [ ] Test: Steps section renders

**Footer**
- [ ] Links: Pricing, Blog, Terms, Privacy, Contact
- [ ] Social icons (Twitter, LinkedIn)
- [ ] Test: Footer links work

---

### Day 24: Polish & Testing (7 hours)

**Email Templates**
- [ ] Setup Resend account
- [ ] Create templates (React Email):
  - Welcome email
  - Email verification
  - Team invite
  - Payment receipt
- [ ] Test: Emails send correctly

**Error Pages**
- [ ] Create `app/error.tsx` (500 error)
- [ ] Create `app/not-found.tsx` (404)
- [ ] Test: Error pages render

**Loading States**
- [ ] Review all pages for loading skeletons
- [ ] Add to: Leads table, Map, Dashboard
- [ ] Test: Skeletons show during load

**Responsive Design**
- [ ] Test mobile: Sidebar collapses to hamburger
- [ ] Test tablet: Layout adapts
- [ ] Test desktop: Full layout
- [ ] Fix any responsive issues

---

### Day 25: Beta Launch Prep (7 hours)

**Documentation**
- [ ] Write `docs/USER_GUIDE.md`:
  - How to sign up
  - How to scrape leads
  - How to use map view
  - How to manage team
- [ ] Write `docs/API.md` (for developers)
- [ ] Update main `README.md`
- [ ] Test: Docs are clear

**Analytics Setup**
- [ ] Install PostHog or Plausible
- [ ] Track key events:
  - `user_signed_up`
  - `first_lead_added`
  - `map_viewed`
  - `upgraded_to_paid`
- [ ] Test: Events tracked in dashboard

**Beta User List**
- [ ] Create waitlist spreadsheet
- [ ] Send invites to 10 early users
- [ ] Personal onboarding calls scheduled
- [ ] Test: Can onboard users successfully

**Launch Checklist**
- [ ] All features work end-to-end
- [ ] No critical bugs
- [ ] Performance acceptable (<3s page load)
- [ ] Mobile responsive
- [ ] Error handling in place
- [ ] Monitoring setup (Sentry, Uptime)

---

## Appendix A: Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui
- **Tables:** TanStack Table
- **Queries:** TanStack Query (React Query)
- **Maps:** MapLibre GL JS
- **Drag-Drop:** @dnd-kit
- **Forms:** react-hook-form
- **Charts:** recharts

### Backend
- **API:** NestJS 11
- **Database:** PostgreSQL (Supabase)
- **ORM:** Drizzle
- **Queue:** BullMQ + Redis
- **Auth:** Supabase Auth
- **Workers:** Node.js + Python (scraper)

### SaaS Essentials
- **Payments:** Stripe
- **Email:** Resend
- **Analytics:** PostHog
- **Social Scraping:** Apify
- **Monitoring:** Sentry + Uptime Kuma

---

## Appendix B: Acceptance Criteria

### Week 1 ✅
- User can sign up with email/password
- User receives verification email
- User can login and see dashboard
- Dashboard has sidebar navigation
- User can create/switch workspaces

### Week 2 ✅
- User can create scraping job
- Job scrapes Google Maps, creates leads
- Leads appear in table view
- Table has filters (stage, rating, category)
- Quota enforced (leads cap + monthly scrapes)

### Week 3 ✅
- Lead detail panel opens on click
- User can edit lead fields inline
- Kanban board shows leads by stage
- Drag-drop changes stage
- AI enrichment generates insights
- User can invite team members
- Role-based access works (Rep sees only assigned)

### Week 4 ✅
- Map shows all leads as markers
- Clustering works in dense areas
- User can filter map (stage, rating)
- User can select multiple leads and plan route
- Route displays on map + turn-by-turn
- Social media handles discovered (Instagram, Facebook)
- Social profiles show in lead detail

### Week 5 ✅
- User can upgrade to paid plan via Stripe
- Payment succeeds, plan updated
- Landing page live with pricing
- Email templates working
- 10 beta users onboarded
- No critical bugs

---

## Appendix C: Daily Standup Template

```markdown
## Daily Progress - Day X

**What I completed:**
- [ ] Task 1
- [ ] Task 2

**Blockers:**
- None / [Describe issue]

**Next:**
- [ ] Task 3
- [ ] Task 4

**Notes:**
- Any learnings or decisions made
```

---

## Appendix D: Deployment Checklist

**Before Launch:**
- [ ] Env variables set in production
- [ ] Database migrations run
- [ ] Stripe webhook endpoint configured
- [ ] DNS records pointed to VPS
- [ ] SSL certificate installed
- [ ] Redis server running
- [ ] BullMQ workers running (PM2)
- [ ] Monitoring active (Sentry, Uptime Kuma)
- [ ] Backup cron jobs set
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Terms of Service published
- [ ] Privacy Policy published

---

**Last Updated:** 2026-07-13  
**Status:** Ready to start Week 1  
**Estimated Completion:** Week 5, Day 25 (Beta Launch)
