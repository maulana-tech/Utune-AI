import { z } from 'zod';

export const LeadSourceNameSchema = z.enum([
  'auto',
  'places',
  'apollo',
  'apify',
  'firecrawl',
  'osm',
  'overpass',
  'foursquare',
  'here',
  'tomtom',
  'serpapi',
  'outscraper',
  'yelp',
  'wikidata',
  'social',
  'reddit',
  'twitter',
  'threads',
  'linkedin',
]);
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
