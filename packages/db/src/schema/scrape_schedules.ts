import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const scrapeSchedules = pgTable('scrape_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  category: text('category').notNull(),
  query: text('query').notNull(),
  /** ISO-3166 alpha-2 country bias for the search; null = global. */
  country: text('country'),
  /** Lead source to run this schedule against; see LEAD_SOURCES in the worker. */
  source: text('source').notNull().default('places'),
  limitPerRun: integer('limit_per_run').notNull().default(30),
  isActive: boolean('is_active').notNull().default(true),
  intervalMinutes: integer('interval_minutes').notNull().default(720),
  lastRunAt: timestamp('last_run_at'),
  lastRunStatus: text('last_run_status'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  retryDelayMinutes: integer('retry_delay_minutes').notNull().default(60),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ScrapeSchedule = typeof scrapeSchedules.$inferSelect;
export type NewScrapeSchedule = typeof scrapeSchedules.$inferInsert;
