import type { LeadSourceFn, RawLead, ScrapeRequest } from './types';

/** Google Maps scraper actor. Override with APIFY_ACTOR_ID for Yelp, LinkedIn, etc. */
const DEFAULT_ACTOR = 'compass/crawler-google-places';

/**
 * Apify hosted actors. One synchronous HTTP call — the actor runs on Apify's
 * infra and the dataset comes back in the response body, so there is no SDK,
 * no polling and no local browser.
 *
 * Needs: APIFY_TOKEN. Optional APIFY_ACTOR_ID to point at a different actor.
 *
 * ponytail: run-sync caps at ~5 min, so a big `limit` can 408. Switch to the
 * async /runs endpoint + polling only when that actually starts happening.
 */
export const scrapeApify: LeadSourceFn = async ({ query, limit, country }: ScrapeRequest) => {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN is not set — cannot use the apify source');

  // Apify writes `username/actor` as `username~actor` in URLs.
  const actor = (process.env.APIFY_ACTOR_ID || DEFAULT_ACTOR).replace('/', '~');

  const res = await fetch(
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?limit=${limit}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        searchStringsArray: [query],
        maxCrawledPlacesPerSearch: limit,
        language: 'en',
        // Crawls each business website for emails — the whole point of using Apify
        // over the Places API, which never returns an email.
        scrapeContacts: true,
        ...(country ? { countryCode: country.toLowerCase() } : {}),
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Apify run failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }

  const items = (await res.json()) as unknown;
  if (!Array.isArray(items)) return [];

  return items
    .slice(0, limit)
    .map((item) => toRawLead(item as Record<string, unknown>))
    .filter((lead) => lead.name);
};

/**
 * Actors do not share an output schema — Google Maps says `title`/`categoryName`,
 * most others say `name`/`category`. Try both so swapping APIFY_ACTOR_ID usually
 * just works.
 */
export function toRawLead(item: Record<string, unknown>): RawLead {
  const str = (...keys: string[]): string | null => {
    for (const key of keys) {
      const v = item[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };

  const emails = Array.isArray(item.emails)
    ? (item.emails as unknown[]).filter((e): e is string => typeof e === 'string')
    : [];
  const location = item.location as { lat?: number; lng?: number } | undefined;

  return {
    name: str('title', 'name', 'companyName') ?? '',
    address: str('address', 'fullAddress', 'street'),
    phone: str('phone', 'phoneUnformatted', 'phoneNumber'),
    // never fall back to `url` here — on the Maps actor that is the Maps link
    website: str('website', 'websiteUrl', 'domain'),
    category: str('categoryName', 'category', 'industry'),
    emails,
    whatsapp: [],
    sourceUrl: str('url', 'placeUrl', 'link'),
    lat: typeof location?.lat === 'number' ? location.lat : null,
    lng: typeof location?.lng === 'number' ? location.lng : null,
  };
}
