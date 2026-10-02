import { industryOf } from './industries';
import { geocode } from './osm';
import { countryName, firstString, isRecord, splitQuery, type LeadSourceFn, type RawLead, type ScrapeRequest } from './types';

/** Public instances, tried in order — the main one 504s/429s under load. OVERPASS_URL pins your own. */
const OVERPASS_URLS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
const CATEGORY_KEYS = ['amenity', 'shop', 'craft', 'office', 'healthcare', 'tourism', 'leisure', 'industrial', 'man_made'];

/**
 * OpenStreetMap via Overpass — keyless, searches by *tag* inside a place's
 * bounding box, so "dentist in bali" finds every amenity=dentist, not just
 * things named "dentist" (which is all Nominatim manages).
 *
 * Needs a location: "<what> in <where>", or the job's country.
 *
 * B2B words ("kontraktor", "migas") map to OSM tags via industries.ts; anything
 * else is matched as a tag value, then by name.
 */
export const scrapeOverpass: LeadSourceFn = async ({ query, limit, country }: ScrapeRequest) => {
  const { what, where } = splitQuery(query);
  const place = where || countryName(country);
  if (!place) throw new Error('Overpass needs a location — search like "dentist in bali" or pick a country');

  const area = await geocode(place, country);
  if (!area) throw new Error(`Overpass: could not find the place "${place}"`);

  // Exact tag match first (indexed, fast). Name regex only when that finds nothing —
  // it's for local words OSM doesn't tag ("bengkel"), and it's slow over a big bbox.
  let body = await runQuery(buildQuery(what, area.bbox, limit, 'tag'));
  if (!body.elements?.length) body = await runQuery(buildQuery(what, area.bbox, limit, 'name'));
  return (body.elements ?? [])
    .filter(isRecord)
    .map(toRawLead)
    .filter((l) => l.name)
    .slice(0, limit);
};

async function runQuery(data: string): Promise<{ elements?: unknown[] }> {
  const errors: string[] = [];
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Utune-AI lead finder' },
        body: new URLSearchParams({ data }),
        signal: AbortSignal.timeout(75_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { elements?: unknown[]; remark?: string };
      // Timeouts / memory errors come back as HTTP 200 with a `remark` and no elements.
      if (!body.elements?.length && body.remark) throw new Error(body.remark);
      return body;
    } catch (err) {
      errors.push(`${new URL(url).host}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`Overpass failed on every instance — ${errors.join('; ')}`);
}

export function buildQuery(
  what: string,
  bbox: [number, number, number, number],
  limit: number,
  by: 'tag' | 'name',
): string {
  const singular = what.toLowerCase().trim().replace(/s$/, '');
  const box = bbox.join(',');
  const statements =
    by === 'tag'
      ? // OSM tag values are snake_case English: "car repair" → car_repair.
        [
          ...CATEGORY_KEYS.map((k) => [k, singular.replace(/\s+/g, '_').replace(/[\\"]/g, '')]),
          ...(industryOf(what)?.osm ?? []),
        ].map(([k, v]) => `nwr["name"]["${k}"="${v}"](${box});`)
      : [`nwr["name"~"${singular.replace(/[\\"^$.*+?()[\]{}|]/g, '\\$&').replace(/\s+/g, '.')}",i](${box});`];
  return `[out:json][timeout:60];(${statements.join('')});out center tags ${limit};`;
}

export function toRawLead(el: Record<string, unknown>): RawLead {
  const tags = (isRecord(el.tags) ? el.tags : {}) as Record<string, unknown>;
  const center = isRecord(el.center) ? el.center : el;
  const lat = Number(center.lat);
  const lng = Number(center.lon);
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const address = [street, tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(', ');
  const email = firstString(tags.email, tags['contact:email']);
  const category = firstString(...CATEGORY_KEYS.map((k) => tags[k]));

  return {
    name: firstString(tags.name) ?? '',
    address: address || null,
    phone: firstString(tags.phone, tags['contact:phone'], tags['contact:mobile'])?.split(';')[0].trim() ?? null,
    website: firstString(tags.website, tags['contact:website'], tags.url),
    category: category?.replace(/_/g, ' ') ?? null,
    emails: email ? email.split(';').map((e) => e.trim()).filter(Boolean) : [],
    whatsapp: [],
    sourceUrl: el.type && el.id != null ? `https://www.openstreetmap.org/${String(el.type)}/${String(el.id)}` : null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}
