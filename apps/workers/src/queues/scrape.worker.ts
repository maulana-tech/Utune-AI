import { Worker } from 'bullmq';
import { eq, sql, and, ilike } from 'drizzle-orm';
import { db, leads, scrapeSchedules, jobs } from '@repo/db';
import { getLeadSource, type RawLead } from '../sources';

export const startScrapeWorker = () => {
  const worker = new Worker(
    'scrape-map',
    async (job) => {
      const { query, limit, workspaceId, scheduleId, jobId, country, source } = job.data as {
        query: string;
        limit: number;
        workspaceId: string;
        scheduleId?: string;
        jobId?: string;
        country?: string;
        source?: string;
      };
      const sourceName = source ?? 'places';

      console.log(
        `[Scrape] Starting scrape: source=${sourceName} query="${query}" ` +
          `limit=${limit} country=${country || 'global'}`,
      );

      if (jobId) {
        await db
          .update(jobs)
          .set({ status: 'processing', updatedAt: new Date() })
          .where(eq(jobs.id, jobId));
      }

      let rawResults: RawLead[];
      try {
        rawResults = await getLeadSource(sourceName)({ query, limit, country, workspaceId });
      } catch (err) {
        if (jobId) {
          await db
            .update(jobs)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(jobs.id, jobId));
        }
        if (scheduleId) {
          await db
            .update(scrapeSchedules)
            .set({
              lastRunAt: new Date(),
              lastRunStatus: 'failed',
              retryCount: sql`COALESCE(${scrapeSchedules.retryCount}, 0)`,
              updatedAt: new Date(),
            })
            .where(eq(scrapeSchedules.id, scheduleId));
        }
        throw err;
      }

      console.log(`[Scrape] Scraped ${rawResults.length} results for "${query}"`);

      // Names that indicate scraper picked up a non-business element
      const BAD_NAMES = new Set(['json', 'null', 'undefined', 'n/a', 'na', 'loading', 'unknown']);

      let insertedCount = 0;
      for (const res of rawResults) {
        const emails    = res.emails   ?? [];
        const whatsapp  = res.whatsapp ?? [];
        const leadName  = res.name?.trim() || '';

        // Skip bad/placeholder names
        if (!leadName || leadName.length < 3 || BAD_NAMES.has(leadName.toLowerCase())) {
          console.log(`[Scrape] Skip bad name: "${leadName}"`);
          continue;
        }

        // Skip duplicates — same workspace + same name already exists
        const existing = await db
          .select({ id: leads.id })
          .from(leads)
          .where(and(eq(leads.workspaceId, workspaceId), ilike(leads.name, leadName)))
          .limit(1);

        if (existing.length > 0) {
          console.log(`[Scrape] Skip duplicate: ${leadName}`);
          continue;
        }

        await db.insert(leads).values({
          workspaceId,
          source:        sourceName,
          name:          leadName,
          address:       res.address  || null,
          phone:         res.phone    || null,
          website:       res.website  || null,
          emails:        emails.length   > 0 ? emails   : undefined,
          whatsapp:      whatsapp.length > 0 ? whatsapp : undefined,
          mapsUrl:       res.sourceUrl || null,
          lat:           res.lat       ?? null,
          lng:           res.lng       ?? null,
          category:      res.category  || query,
        });

        insertedCount++;
      }
      // Scoring is on-demand only (per-lead "Analyze" in the UI) — scraping never
      // queues AI work, so a 500-lead scrape costs zero tokens.
      console.log(`[Scrape] Inserted ${insertedCount} leads`);

      if (jobId) {
        await db
          .update(jobs)
          .set({ status: 'completed', resultCount: insertedCount, updatedAt: new Date() })
          .where(eq(jobs.id, jobId));
      }

      // Update schedule status on success
      if (scheduleId) {
        await db
          .update(scrapeSchedules)
          .set({
            lastRunAt: new Date(),
            lastRunStatus: 'success',
            retryCount: 0,
            updatedAt: new Date(),
          })
          .where(eq(scrapeSchedules.id, scheduleId));
      }

      return { count: rawResults.length };
    },
    {
      connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
    },
  );

  worker.on('completed', (job) => console.log(`[Scrape] Job ${job.id} completed`));
  worker.on('failed', (job, err) =>
    console.log(`[Scrape] Job ${job?.id} failed: ${err.message}`),
  );

  console.log('[Scrape] Worker started - listening to scrape-map');
};
