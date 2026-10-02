import { countryName, fetchJson, firstString, isRecord, splitQuery, type LeadSourceFn, type RawLead } from './types';

/**
 * Yelp Fusion business search. Strong in US/EU, thin or absent in much of Asia.
 * Search returns no website or email — `sourceUrl` is the Yelp page.
 * Needs: YELP_API_KEY.
 */
export const scrapeYelp: LeadSourceFn = async ({ query, limit, country }) => {
  const key = process.env.YELP_API_KEY;
  if (!key) throw new Error('YELP_API_KEY is not set — cannot use the yelp source');

  const { what, where } = splitQuery(query);
  const location = [where, countryName(country)].filter(Boolean).join(', ');
  if (!location) throw new Error('Yelp needs a location — search like "dentist in london" or pick a country');

  const params = new URLSearchParams({ term: what, location, limit: String(Math.min(limit, 50)) });
  const body = await fetchJson('Yelp', `https://api.yelp.com/v3/businesses/search?${params}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  const businesses = isRecord(body) && Array.isArray(body.businesses) ? body.businesses : [];
  return businesses.filter(isRecord).map(toRawLead).slice(0, limit);
};

export function toRawLead(r: Record<string, unknown>): RawLead {
  const location = isRecord(r.location) ? r.location : {};
  const coords = isRecord(r.coordinates) ? r.coordinates : {};
  const address = Array.isArray(location.display_address) ? location.display_address.filter((p) => typeof p === 'string').join(', ') : null;
  const category = Array.isArray(r.categories) && isRecord(r.categories[0]) ? r.categories[0].title : null;
  return {
    name: firstString(r.name) ?? '',
    address: address || null,
    phone: firstString(r.phone, r.display_phone),
    website: null,
    category: firstString(category),
    emails: [],
    sourceUrl: firstString(r.url),
    lat: typeof coords.latitude === 'number' ? coords.latitude : null,
    lng: typeof coords.longitude === 'number' ? coords.longitude : null,
  };
}
