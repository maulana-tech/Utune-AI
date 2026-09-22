import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from '../schema/all';
import type {
  NewScrapeSchedule,
} from '../schema/all';

/**
 * Demo seed for hackathon.
 *
 * Populates a single demo workspace with realistic UMKM-scale data:
 *   • 1 workspace (DEV_WORKSPACE_ID)
 *   • ~12 leads scattered around Jakarta
 *
 * Re-running is idempotent — it wipes existing rows for the demo workspace
 * before inserting fresh ones.
 */

const WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

async function main() {
  console.log('🌱 Seeding demo workspace…');

  await ensureWorkspace();
  await clearExisting();
  await seedLeads();
  await seedScrapeSchedules();

  console.log('✅ Seed complete');
  await pool.end();
  process.exit(0);
}

/* =============================================================
   Workspace
   ============================================================= */
async function ensureWorkspace() {
  await db
    .insert(schema.workspaces)
    .values({ id: WORKSPACE_ID, name: 'Demo Workspace' })
    .onConflictDoNothing();
  console.log('  · workspace ready');
}

/* =============================================================
   Wipe — order matters because of FK constraints
   ============================================================= */
async function clearExisting() {
  // lead_scores → leads
  await db
    .delete(schema.leadScores)
    .where(
      // No workspaceId on lead_scores; cascade via parent leads delete in this workspace
      eq(schema.leadScores.priorityTier, '__sentinel__never_match__'),
    );
  // ai_insights → leads (no workspaceId column); same approach: rely on per-lead deletes below

  // agent_logs → workspace
  await db
    .delete(schema.agentLogs)
    .where(eq(schema.agentLogs.workspaceId, WORKSPACE_ID));

  // Delete dependents of leads first (cascade isn't declared on FKs in current schema)
  const ourLeads = await db
    .select({ id: schema.leads.id })
    .from(schema.leads)
    .where(eq(schema.leads.workspaceId, WORKSPACE_ID));
  for (const l of ourLeads) {
    await db.delete(schema.leadScores).where(eq(schema.leadScores.leadId, l.id));
    await db.delete(schema.aiInsights).where(eq(schema.aiInsights.leadId, l.id));
  }
  await db.delete(schema.leads).where(eq(schema.leads.workspaceId, WORKSPACE_ID));

  console.log('  · existing demo rows cleared');
}

/* =============================================================
   Leads — Jakarta-area UMKM for Map Explorer demo
   ============================================================= */
const LEADS = [
  {
    name: 'Toko Buah Segar Menteng',
    address: 'Jl. HOS Cokroaminoto, Menteng, Jakarta Pusat',
    lat: -6.1944,
    lng: 106.8319,
    category: 'Food Retail',
    phone: '+62-21-3192-4501',
    website: 'https://tokobuahsegar.id',
    emails: ['hello@tokobuahsegar.id'],
  },
  {
    name: 'Jaya Print Tanah Abang',
    address: 'Pasar Tanah Abang Blok A, Jakarta Pusat',
    lat: -6.1862,
    lng: 106.8128,
    category: 'Printing Service',
    phone: '+62-21-3500-7712',
    website: null,
    emails: ['jayaprint@gmail.com'],
  },
  {
    name: 'Cipta Konveksi',
    address: 'Jl. Pasar Baru No. 47, Jakarta Pusat',
    lat: -6.1670,
    lng: 106.8329,
    category: 'Garment Manufacturing',
    phone: '+62-21-3801-2245',
    website: 'https://ciptakonveksi.com',
    emails: ['order@ciptakonveksi.com'],
  },
  {
    name: 'Kopi Tubruk Bendungan Hilir',
    address: 'Jl. Bendungan Hilir No. 25, Jakarta Pusat',
    lat: -6.2089,
    lng: 106.8137,
    category: 'Coffee Shop',
    phone: '+62-878-1234-5678',
    website: 'https://kopitubruk.id',
    emails: ['halo@kopitubruk.id'],
  },
  {
    name: 'Bengkel Motor Cempaka',
    address: 'Jl. Cempaka Putih Tengah, Jakarta Pusat',
    lat: -6.1707,
    lng: 106.8694,
    category: 'Auto Service',
    phone: '+62-21-4280-9911',
    website: null,
    emails: [],
  },
  {
    name: 'Salon Anggrek',
    address: 'Jl. Senopati No. 12, Kebayoran Baru, Jakarta Selatan',
    lat: -6.2297,
    lng: 106.8131,
    category: 'Beauty Service',
    phone: '+62-21-7261-4400',
    website: null,
    emails: ['booking@salonanggrek.id'],
  },
  {
    name: 'Warung Sate Pak Karman',
    address: 'Jl. Sabang No. 18, Jakarta Pusat',
    lat: -6.1846,
    lng: 106.8261,
    category: 'Restaurant',
    phone: '+62-812-9988-7766',
    website: null,
    emails: [],
  },
  {
    name: 'Toko Buku Sumber Ilmu',
    address: 'Jl. Kwitang Raya No. 8, Jakarta Pusat',
    lat: -6.1819,
    lng: 106.8419,
    category: 'Book Retail',
    phone: '+62-21-3144-2200',
    website: 'https://sumberilmu.co.id',
    emails: ['info@sumberilmu.co.id'],
  },
  {
    name: 'Laundry Express Kemang',
    address: 'Jl. Kemang Raya No. 33, Jakarta Selatan',
    lat: -6.2607,
    lng: 106.8137,
    category: 'Laundry',
    phone: '+62-21-7194-2233',
    website: null,
    emails: ['cs@laundryexpress.id'],
  },
  {
    name: 'Roti Kukus Mama Lina',
    address: 'Jl. Mangga Besar Raya No. 56, Jakarta Barat',
    lat: -6.1442,
    lng: 106.8224,
    category: 'Bakery',
    phone: '+62-815-4567-8899',
    website: null,
    emails: ['order@rotimama.id'],
  },
  {
    name: 'Studio Foto Klasik',
    address: 'Jl. Sudirman Kav. 21, Jakarta Selatan',
    lat: -6.2253,
    lng: 106.8086,
    category: 'Photography Service',
    phone: '+62-21-5212-7700',
    website: 'https://studioklasik.id',
    emails: ['hello@studioklasik.id'],
  },
  {
    name: 'Furniture Kayu Jati Cipinang',
    address: 'Jl. Bekasi Timur Raya, Cipinang, Jakarta Timur',
    lat: -6.2298,
    lng: 106.8866,
    category: 'Furniture Retail',
    phone: '+62-21-8190-3344',
    website: 'https://furniturejati.com',
    emails: ['sales@furniturejati.com'],
  },
];

async function seedLeads() {
  await db.insert(schema.leads).values(
    LEADS.map((l) => ({
      workspaceId: WORKSPACE_ID,
      name: l.name,
      address: l.address,
      lat: l.lat,
      lng: l.lng,
      category: l.category,
      phone: l.phone,
      website: l.website,
      emails: l.emails,
    })),
  );
  console.log(`  · ${LEADS.length} leads inserted`);
}

/* =============================================================
   Scrape schedules — 12 UMKM categories for Jakarta
   ============================================================= */
const SCRAPE_SCHEDULE_DEFS: { category: string; query: string; intervalMinutes: number }[] = [
  { category: 'Kesehatan',         query: 'klinik jakarta',            intervalMinutes: 720 },
  { category: 'Kuliner',           query: 'warung makan jakarta',      intervalMinutes: 720 },
  { category: 'Otomotif',          query: 'bengkel motor jakarta',     intervalMinutes: 1440 },
  { category: 'Pendidikan',        query: 'bimbel jakarta',            intervalMinutes: 1440 },
  { category: 'Kecantikan',        query: 'salon kecantikan jakarta',  intervalMinutes: 720 },
  { category: 'Ritel Pakaian',     query: 'toko baju jakarta',         intervalMinutes: 1440 },
  { category: 'Percetakan',        query: 'percetakan jakarta',        intervalMinutes: 1440 },
  { category: 'Properti',          query: 'agen properti jakarta',     intervalMinutes: 2880 },
  { category: 'Logistik',          query: 'jasa pengiriman jakarta',   intervalMinutes: 1440 },
  { category: 'Teknologi',         query: 'service laptop jakarta',    intervalMinutes: 1440 },
  { category: 'Kopi & Minuman',    query: 'coffee shop jakarta',       intervalMinutes: 720 },
  { category: 'Furnitur & Dekor',  query: 'toko furnitur jakarta',     intervalMinutes: 2880 },
];

async function seedScrapeSchedules() {
  await db
    .delete(schema.scrapeSchedules)
    .where(eq(schema.scrapeSchedules.workspaceId, WORKSPACE_ID));

  const rows: NewScrapeSchedule[] = SCRAPE_SCHEDULE_DEFS.map((def) => ({
    workspaceId: WORKSPACE_ID,
    category: def.category,
    query: def.query,
    limitPerRun: 30,
    isActive: true,
    intervalMinutes: def.intervalMinutes,
    maxRetries: 3,
    retryDelayMinutes: 60,
  }));

  await db.insert(schema.scrapeSchedules).values(rows);
  console.log(`  · ${rows.length} scrape schedules inserted`);
}

/* =============================================================
   Entry point
   ============================================================= */
main().catch(async (e) => {
  console.error('❌ Seed failed:', e);
  await pool.end();
  process.exit(1);
});
