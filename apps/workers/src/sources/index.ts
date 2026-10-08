import type { LeadSourceFn } from './types';
import { runAll, runChain, type ChainStep } from './auto';
import { scrapePlaces } from './places';
import { scrapeApollo } from './apollo';
import { scrapeApify } from './apify';
import { scrapeFirecrawl } from './firecrawl';
import { scrapeOsm } from './osm';
import { scrapeOverpass } from './overpass';
import { scrapeFoursquare } from './foursquare';
import { scrapeHere } from './here';
import { scrapeTomtom } from './tomtom';
import { scrapeSerpapi } from './serpapi';
import { scrapeOutscraper } from './outscraper';
import { scrapeYelp } from './yelp';
import { scrapeWikidata } from './wikidata';
import { scrapeReddit } from './reddit';
import { scrapeLinkedin, scrapeThreads, scrapeTwitter } from './social-apify';
import { industryOf } from './industries';
import { splitQuery } from './types';

/** B2B query = mentions an industry from industries.ts ("kontraktor", "migas", "brand"). */
const isB2B = (req: { query: string }) => industryOf(splitQuery(req.query).what) !== undefined;

/**
 * Order `auto` tries sources in: richest data first, keyless sources last so a
 * scrape always has somewhere to land. Company databases (Apollo, Wikidata) only
 * run for B2B queries, so "cafe in jakarta" doesn't come back as a list of chains.
 */
export const AUTO_CHAIN: ChainStep[] = [
  { source: 'places', env: ['GOOGLE_MAPS_API_KEY'] },
  { source: 'apollo', env: ['COMPOSIO_API_KEY'], when: isB2B },
  { source: 'outscraper', env: ['OUTSCRAPER_API_KEY'] },
  { source: 'serpapi', env: ['SERPAPI_API_KEY'] },
  { source: 'apify', env: ['APIFY_TOKEN'] },
  { source: 'foursquare', env: ['FOURSQUARE_API_KEY'] },
  { source: 'here', env: ['HERE_API_KEY'] },
  { source: 'tomtom', env: ['TOMTOM_API_KEY'] },
  { source: 'yelp', env: ['YELP_API_KEY'] },
  // Wikidata before Firecrawl: for B2B, real company records beat web-search pages.
  { source: 'wikidata', env: [], when: isB2B },
  { source: 'firecrawl', env: ['FIRECRAWL_API_KEY'] },
  { source: 'overpass', env: [] },
  { source: 'osm', env: [] },
];

/**
 * Social listening: posts where someone states a need ("butuh jasa bikin app").
 * A different kind of lead from AUTO_CHAIN's businesses, so never mixed into it.
 */
export const SOCIAL_STEPS: ChainStep[] = [
  { source: 'reddit', env: ['COMPOSIO_API_KEY'] },
  { source: 'twitter', env: ['APIFY_TOKEN'] },
  { source: 'threads', env: ['APIFY_TOKEN'] },
  { source: 'linkedin', env: ['APIFY_TOKEN'] },
];

/**
 * Lead sources, keyed by the `source` field on a scrape job.
 * Adding a source = one file here + one entry in `LeadSourceName` (@repo/shared)
 * (+ a spot in AUTO_CHAIN if it should be part of the fallback).
 */
export const LEAD_SOURCES: Record<string, LeadSourceFn> = {
  auto: (req) => runChain(AUTO_CHAIN, LEAD_SOURCES, req, req.env),
  places: scrapePlaces,
  apollo: scrapeApollo,
  apify: scrapeApify,
  firecrawl: scrapeFirecrawl,
  osm: scrapeOsm,
  overpass: scrapeOverpass,
  foursquare: scrapeFoursquare,
  here: scrapeHere,
  tomtom: scrapeTomtom,
  serpapi: scrapeSerpapi,
  outscraper: scrapeOutscraper,
  yelp: scrapeYelp,
  wikidata: scrapeWikidata,
  social: (req) => runAll(SOCIAL_STEPS, LEAD_SOURCES, req, req.env),
  reddit: scrapeReddit,
  twitter: scrapeTwitter,
  threads: scrapeThreads,
  linkedin: scrapeLinkedin,
};

export function getLeadSource(name: string | undefined): LeadSourceFn {
  const source = LEAD_SOURCES[name ?? 'auto'];
  if (!source) {
    throw new Error(
      `Unknown lead source "${name}". Known: ${Object.keys(LEAD_SOURCES).join(', ')}`,
    );
  }
  return source;
}

export type { LeadSourceFn, RawLead, ScrapeRequest } from './types';
