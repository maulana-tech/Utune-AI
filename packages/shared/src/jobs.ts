import { z } from 'zod';

export const LeadSourceNameSchema = z.enum(['places', 'apollo', 'apify', 'firecrawl']);
export type LeadSourceName = z.infer<typeof LeadSourceNameSchema>;

export const ScrapeJobPayloadSchema = z.object({
  workspaceId: z.string().uuid(),
  query: z.string().min(1),
  limit: z.number().int().positive().default(10),
  scheduleId: z.string().uuid().optional(),
  /**
   * ISO-3166 alpha-2 country code to bias the Places search to (e.g. 'gb', 'jp').
   * Omit / empty string = global search, no country bias.
   */
  country: z.string().length(2).optional(),
  /** Which lead source to scrape. Must match a key in LEAD_SOURCES (apps/workers/src/sources). */
  source: LeadSourceNameSchema.optional(),
});

export type ScrapeJobPayload = z.infer<typeof ScrapeJobPayloadSchema>;

/**
 * Payload for triggering a finance multi-agent simulation. The simulation
 * row must already exist (status='pending') — the worker picks it up by id.
 */
export const FinanceSimulationJobPayloadSchema = z.object({
  simulationId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export type FinanceSimulationJobPayload = z.infer<
  typeof FinanceSimulationJobPayloadSchema
>;

/**
 * Payload for triggering a market-analysis multi-agent run. The
 * market_analyses row must already exist (status='pending'); the worker
 * picks it up by id.
 */
export const MarketAnalysisJobPayloadSchema = z.object({
  marketAnalysisId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export type MarketAnalysisJobPayload = z.infer<
  typeof MarketAnalysisJobPayloadSchema
>;

/**
 * Payload for triggering the market scraper. The worker will fetch
 * competitor / industry data and write rows to market_data.
 */
export const MarketScrapeJobPayloadSchema = z.object({
  workspaceId: z.string().uuid(),
  industry: z.string().min(1),
  region: z.string().min(1),
  limit: z.number().int().positive().default(10),
});

export type MarketScrapeJobPayload = z.infer<typeof MarketScrapeJobPayloadSchema>;
