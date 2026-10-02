import { fetchJson, firstString, isRecord, type LeadSourceFn, type RawLead } from './types';

const PAGE_SIZE = 20; // fixed by SerpApi's Google Maps engine
const MAX_PAGES = 6; // SerpApi recommends stopping at start=100

/**
 * Google Maps results through SerpApi — Google-grade data without a Google key.
 * Each page is one billed search. No email in the data.
 * Needs: SERPAPI_API_KEY.
 */
export const scrapeSerpapi: LeadSourceFn = async ({ query, limit, country }) => {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) throw new Error('SERPAPI_API_KEY is not set — cannot use the serpapi source');

  const leads: RawLead[] = [];
  for (let page = 0; page < MAX_PAGES && leads.length < limit; page++) {
    const params = new URLSearchParams({
      engine: 'google_maps',
      type: 'search',
      q: query,
      start: String(page * PAGE_SIZE),
      hl: 'en',
      api_key: key,
    });
    if (country) params.set('gl', country.toLowerCase());

    const body = await fetchJson('SerpApi', `https://serpapi.com/search.json?${params}`);
    const rows = isRecord(body) && Array.isArray(body.local_results) ? body.local_results : [];
    leads.push(...rows.filter(isRecord).map(toRawLead));
    if (rows.length < PAGE_SIZE) break;
  }
  return leads.slice(0, limit);
};

export function toRawLead(r: Record<string, unknown>): RawLead {
  const gps = isRecord(r.gps_coordinates) ? r.gps_coordinates : {};
  const placeId = firstString(r.place_id);
  return {
    name: firstString(r.title) ?? '',
    address: firstString(r.address),
    phone: firstString(r.phone),
    website: firstString(r.website),
    category: firstString(r.type),
    emails: [],
    sourceUrl: placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : null,
    lat: typeof gps.latitude === 'number' ? gps.latitude : null,
    lng: typeof gps.longitude === 'number' ? gps.longitude : null,
  };
}
