import { isRecord, type LeadSourceFn, type RawLead, type ScrapeRequest } from './types';

/**
 * OpenStreetMap via Nominatim — keyless; the last stop of the `auto` chain.
 *
 * Nominatim understands "<category> in <city>" phrases ("cafe in jakarta",
 * "restaurants in bali"); a bare "coffee shop jakarta" only matches by name.
 * OSM coverage of phone/website/email is thin, so expect sparser contacts than Places.
 *
 * ponytail: public Nominatim is capped at 1 req/s and not for bulk scraping —
 * self-host Nominatim or switch to Overpass if this becomes the main source.
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const PAGE_SIZE = 40; // Nominatim's max per request
const MAX_PAGES = 5;

export const scrapeOsm: LeadSourceFn = async ({ query, limit, country }: ScrapeRequest) => {
  const leads: RawLead[] = [];
  const seen: string[] = [];

  for (let page = 0; page < MAX_PAGES && leads.length < limit; page++) {
    if (page > 0) await new Promise((r) => setTimeout(r, 1100));

    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      extratags: '1',
      limit: String(PAGE_SIZE),
    });
    if (country) params.set('countrycodes', country.toLowerCase());
    if (seen.length) params.set('exclude_place_ids', seen.join(','));

    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      // Nominatim usage policy requires an identifying User-Agent.
      headers: { 'User-Agent': 'Utune-AI lead finder', 'Accept-Language': 'en' },
    });
    if (!res.ok) {
      throw new Error(`Nominatim search failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }

    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows) || rows.length === 0) break;

    for (const row of rows as Record<string, unknown>[]) {
      if (row.place_id != null) seen.push(String(row.place_id));
      const lead = toRawLead(row);
      if (lead.name) leads.push(lead);
    }
    if (rows.length < PAGE_SIZE) break;
  }

  return leads.slice(0, limit);
};

export function toRawLead(r: Record<string, unknown>): RawLead {
  const tags = isRecord(r.extratags) ? r.extratags : {};
  const tag = (...keys: string[]) => {
    for (const k of keys) if (typeof tags[k] === 'string' && tags[k]) return tags[k] as string;
    return null;
  };
  const email = tag('email', 'contact:email');
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  const display = typeof r.display_name === 'string' ? r.display_name : '';

  return {
    name,
    // display_name starts with the place's own name — drop it to leave the address.
    address: (name && display.startsWith(`${name}, `) ? display.slice(name.length + 2) : display) || null,
    // OSM allows several values separated by ';' — keep the first.
    phone: tag('phone', 'contact:phone', 'contact:mobile')?.split(';')[0].trim() ?? null,
    website: tag('website', 'contact:website', 'url'),
    category: typeof r.type === 'string' ? r.type.replace(/_/g, ' ') : null,
    emails: email ? email.split(';').map((e) => e.trim()).filter(Boolean) : [],
    whatsapp: [],
    sourceUrl:
      typeof r.osm_type === 'string' && r.osm_id != null
        ? `https://www.openstreetmap.org/${r.osm_type}/${r.osm_id}`
        : null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

/**
 * Place name → centre + bounding box, via Nominatim. Used by sources that need
 * a location rather than free text (Overpass, HERE).
 */
export async function geocode(
  place: string,
  country?: string,
): Promise<{ lat: number; lng: number; bbox: [number, number, number, number]; countryCode: string | null } | null> {
  const params = new URLSearchParams({ q: place, format: 'jsonv2', limit: '1', addressdetails: '1' });
  if (country) params.set('countrycodes', country.toLowerCase());
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'Utune-AI lead finder', 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error(`Nominatim geocode failed (${res.status})`);
  const [hit] = (await res.json()) as {
    lat: string;
    lon: string;
    boundingbox: string[];
    address?: { country_code?: string };
  }[];
  if (!hit) return null;
  // Nominatim bbox order: [south, north, west, east]
  const [s, n, w, e] = hit.boundingbox.map(Number);
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    bbox: [s, w, n, e],
    countryCode: hit.address?.country_code?.toUpperCase() ?? null,
  };
}
