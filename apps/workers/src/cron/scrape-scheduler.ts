import cron from 'node-cron';
import { Queue } from 'bullmq';
import { and, asc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { db, scrapeSchedules } from '@repo/db';

const scrapeQueue = new Queue('scrape-map', {
  connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
});

/**
 * Runs every 15 minutes.
 *
 * Picks at most 1 due schedule per tick to avoid flooding the scraper.
 * A schedule is "due" when:
 *   - is_active = true
 *   - never run before (last_run_at IS NULL), OR
 *     last_run_at + interval_minutes < now()
 *   - retry_count < max_retries (or never run)
 */
export function startScrapeScheduler() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      await tick();
    } catch (err) {
      console.error('[ScrapeScheduler] tick error:', err);
    }
  });

  console.log('[ScrapeScheduler] Started — ticking every 15 minutes');
}

async function tick() {
  const now = new Date();

  // A schedule is due if it has never run, or its next run time has passed.
  const dueSchedules = await db
    .select()
    .from(scrapeSchedules)
    .where(
      and(
        eq(scrapeSchedules.isActive, true),
        or(
          isNull(scrapeSchedules.lastRunAt),
          lt(
            sql`${scrapeSchedules.lastRunAt} + (${scrapeSchedules.intervalMinutes} * interval '1 minute')`,
            now,
          ),
        ),
      ),
    )
    .orderBy(
      // Never-run schedules first, then oldest run first
      sql`CASE WHEN ${scrapeSchedules.lastRunAt} IS NULL THEN 0 ELSE 1 END`,
      asc(scrapeSchedules.lastRunAt),
    )
    .limit(1);

  if (dueSchedules.length === 0) {
    return; // nothing to do this tick
  }

  const schedule = dueSchedules[0];

  // Check if retry budget is exhausted (but still allow first run)
  if (
    schedule.lastRunAt !== null &&
    schedule.lastRunStatus === 'failed' &&
    (schedule.retryCount ?? 0) >= schedule.maxRetries
  ) {
    console.warn(
      `[ScrapeScheduler] Auto-disabling schedule ${schedule.id} (${schedule.category}) — max retries reached`,
    );
    await db
      .update(scrapeSchedules)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(scrapeSchedules.id, schedule.id));
    return;
  }

  console.log(
    `[ScrapeScheduler] Queuing scrape: category="${schedule.category}" query="${schedule.query}" limit=${schedule.limitPerRun}`,
  );

  await scrapeQueue.add('scrape-scheduled', {
    workspaceId: schedule.workspaceId,
    query: schedule.query,
    limit: schedule.limitPerRun,
    scheduleId: schedule.id,
    country: schedule.country ?? undefined,
    source: schedule.source,
  });

  // Increment retry_count now; the worker will reset to 0 on success or keep incrementing on failure.
  await db
    .update(scrapeSchedules)
    .set({
      retryCount: sql`COALESCE(${scrapeSchedules.retryCount}, 0) + 1`,
      updatedAt: new Date(),
    })
    .where(eq(scrapeSchedules.id, schedule.id));
}
