import type { LeadSourceFn } from './types';
import { scrapePlaces } from './places';
import { scrapeApollo } from './apollo';

/**
 * Lead sources, keyed by the `source` field on a scrape job.
 * Adding a source = one file here + one entry in `LeadSourceName` (@repo/shared).
 */
export const LEAD_SOURCES: Record<string, LeadSourceFn> = {
  places: scrapePlaces,
  apollo: scrapeApollo,
};

export function getLeadSource(name: string | undefined): LeadSourceFn {
  const source = LEAD_SOURCES[name ?? 'places'];
  if (!source) {
    throw new Error(
      `Unknown lead source "${name}". Known: ${Object.keys(LEAD_SOURCES).join(', ')}`,
    );
  }
  return source;
}

export type { LeadSourceFn, RawLead, ScrapeRequest } from './types';
