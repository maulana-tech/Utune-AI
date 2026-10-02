import { geocode } from './osm';
import { countryName, fetchJson, firstString, isRecord, splitQuery, type LeadSourceFn, type RawLead } from './types';

/**
 * HERE Geocoding & Search `discover`. It needs a point to search around, so the
 * place part of the query (or the job's country) is geocoded first.
 * Needs: HERE_API_KEY.
 */
export const scrapeHere: LeadSourceFn = async ({ query, limit, country }) => {
  const key = process.env.HERE_API_KEY;
  if (!key) throw new Error('HERE_API_KEY is not set — cannot use the here source');

  const { what, where } = splitQuery(query);
  const place = where || countryName(country);
  if (!place) throw new Error('HERE needs a location — search like "dentist in bali" or pick a country');
  const at = await geocode(place, country);
  if (!at) throw new Error(`HERE: could not find the place "${place}"`);

  const params = new URLSearchParams({
    q: what,
    at: `${at.lat},${at.lng}`,
    limit: String(Math.min(limit, 100)),
    lang: 'en',
    apiKey: key,
  });
  const body = await fetchJson('HERE', `https://discover.search.hereapi.com/v1/discover?${params}`);
  const items = isRecord(body) && Array.isArray(body.items) ? body.items : [];
  return items.filter(isRecord).map(toRawLead).slice(0, limit);
};

/** contacts: [{ phone: [{ value }], www: [{ value }], email: [{ value }] }] */
function contact(r: Record<string, unknown>, kind: string): string[] {
  const contacts = Array.isArray(r.contacts) ? r.contacts : isRecord(r.contacts) ? [r.contacts] : [];
  return contacts.flatMap((c) =>
    isRecord(c) && Array.isArray(c[kind])
      ? (c[kind] as unknown[]).map((v) => (isRecord(v) ? firstString(v.value) : null)).filter((v): v is string => !!v)
      : [],
  );
}

export function toRawLead(r: Record<string, unknown>): RawLead {
  const address = isRecord(r.address) ? r.address : {};
  const position = isRecord(r.position) ? r.position : {};
  const categories = Array.isArray(r.categories) ? r.categories.filter(isRecord) : [];
  const category = categories.find((c) => c.primary) ?? categories[0];
  return {
    name: firstString(r.title) ?? '',
    address: firstString(address.label),
    phone: contact(r, 'phone')[0] ?? contact(r, 'mobile')[0] ?? null,
    website: contact(r, 'www')[0] ?? null,
    category: category ? firstString(category.name) : null,
    emails: contact(r, 'email'),
    sourceUrl: null,
    lat: typeof position.lat === 'number' ? position.lat : null,
    lng: typeof position.lng === 'number' ? position.lng : null,
  };
}
