import { fetchJson, firstString, isRecord, type LeadSourceFn, type RawLead } from './types';

/**
 * TomTom Search (fuzzy search restricted to POIs). Free text works as-is —
 * "dentist in bali" is understood without geocoding. No email in the data.
 * Needs: TOMTOM_API_KEY.
 */
export const scrapeTomtom: LeadSourceFn = async ({ query, limit, country }) => {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) throw new Error('TOMTOM_API_KEY is not set — cannot use the tomtom source');

  const params = new URLSearchParams({ key, limit: String(Math.min(limit, 100)), idxSet: 'POI', language: 'en-GB' });
  if (country) params.set('countrySet', country.toUpperCase());

  const body = await fetchJson(
    'TomTom',
    `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?${params}`,
  );
  const results = isRecord(body) && Array.isArray(body.results) ? body.results : [];
  return results.filter(isRecord).map(toRawLead).slice(0, limit);
};

export function toRawLead(r: Record<string, unknown>): RawLead {
  const poi = isRecord(r.poi) ? r.poi : {};
  const address = isRecord(r.address) ? r.address : {};
  const position = isRecord(r.position) ? r.position : {};
  const classification = Array.isArray(poi.classifications) && isRecord(poi.classifications[0]) ? poi.classifications[0] : {};
  const className =
    Array.isArray(classification.names) && isRecord(classification.names[0]) ? classification.names[0].name : null;
  const url = firstString(poi.url);
  return {
    name: firstString(poi.name) ?? '',
    address: firstString(address.freeformAddress),
    phone: firstString(poi.phone),
    // TomTom returns bare hosts ("www.example.com").
    website: url && !/^https?:\/\//i.test(url) ? `https://${url}` : url,
    category: firstString(Array.isArray(poi.categories) ? poi.categories[0] : null, className),
    emails: [],
    sourceUrl: null,
    lat: typeof position.lat === 'number' ? position.lat : null,
    lng: typeof position.lon === 'number' ? position.lon : null,
  };
}
