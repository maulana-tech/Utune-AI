import { countryName, fetchJson, firstString, isRecord, splitQuery, type LeadSourceFn, type RawLead } from './types';

/**
 * Foursquare Places (new API host — the v3 api.foursquare.com endpoint was sunset 2026-05-15).
 * Needs: FOURSQUARE_API_KEY (a service key).
 *
 * ponytail: one page (max 50). Follow the Link-header cursor if users need more per job.
 */
export const scrapeFoursquare: LeadSourceFn = async ({ query, limit, country, env }) => {
  const key = env.FOURSQUARE_API_KEY;
  if (!key) throw new Error('FOURSQUARE_API_KEY is not set — cannot use the foursquare source (add it in Settings → API keys)');

  const { what, where } = splitQuery(query);
  const near = [where, countryName(country)].filter(Boolean).join(', ');
  const params = new URLSearchParams({ query: what, limit: String(Math.min(limit, 50)) });
  if (near) params.set('near', near);

  const body = await fetchJson('Foursquare', `https://places-api.foursquare.com/places/search?${params}`, {
    headers: { Authorization: `Bearer ${key}`, 'X-Places-Api-Version': '2025-06-17', Accept: 'application/json' },
  });
  const results = isRecord(body) && Array.isArray(body.results) ? body.results : [];
  return results.filter(isRecord).map(toRawLead).slice(0, limit);
};

export function toRawLead(r: Record<string, unknown>): RawLead {
  const location = isRecord(r.location) ? r.location : {};
  const category = Array.isArray(r.categories) && isRecord(r.categories[0]) ? r.categories[0].name : null;
  const email = firstString(r.email);
  return {
    name: firstString(r.name) ?? '',
    address: firstString(location.formatted_address),
    phone: firstString(r.tel),
    website: firstString(r.website),
    category: firstString(category),
    emails: email ? [email] : [],
    sourceUrl: firstString(r.fsq_place_id) ? `https://foursquare.com/v/${String(r.fsq_place_id)}` : null,
    lat: typeof r.latitude === 'number' ? r.latitude : null,
    lng: typeof r.longitude === 'number' ? r.longitude : null,
  };
}
