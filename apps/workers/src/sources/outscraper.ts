import { fetchJson, firstString, isRecord, type LeadSourceFn, type RawLead } from './types';

/**
 * Outscraper Google Maps search, synchronous mode (one query per request keeps it sync).
 * Needs: OUTSCRAPER_API_KEY.
 */
export const scrapeOutscraper: LeadSourceFn = async ({ query, limit, country, env }) => {
  const key = env.OUTSCRAPER_API_KEY;
  if (!key) throw new Error('OUTSCRAPER_API_KEY is not set — cannot use the outscraper source (add it in Settings → API keys)');

  const params = new URLSearchParams({
    query,
    limit: String(Math.min(limit, 400)),
    async: 'false',
    language: 'en',
    dropDuplicates: 'true',
  });
  if (country) params.set('region', country.toUpperCase());

  const body = await fetchJson('Outscraper', `https://api.app.outscraper.com/maps/search-v3?${params}`, {
    headers: { 'X-API-KEY': key },
  });
  // data is one array per query: data[0] holds our places.
  const data = isRecord(body) && Array.isArray(body.data) ? body.data : [];
  const places = Array.isArray(data[0]) ? data[0] : [];
  return places.filter(isRecord).map(toRawLead).slice(0, limit);
};

export function toRawLead(r: Record<string, unknown>): RawLead {
  const emails = [r.email_1, r.email_2, r.email_3]
    .map((e) => firstString(e))
    .filter((e): e is string => !!e);
  return {
    name: firstString(r.name) ?? '',
    address: firstString(r.full_address, r.address),
    phone: firstString(r.phone),
    website: firstString(r.site),
    category: firstString(r.category, r.type),
    emails,
    sourceUrl: firstString(r.location_link),
    lat: typeof r.latitude === 'number' ? r.latitude : null,
    lng: typeof r.longitude === 'number' ? r.longitude : null,
  };
}
