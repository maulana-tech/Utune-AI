import { industryOf } from './industries';
import { geocode } from './osm';
import { isRecord, splitQuery, type LeadSourceFn, type RawLead, type ScrapeRequest } from './types';

const SPARQL_URL = 'https://query.wikidata.org/sparql';

/**
 * Wikidata — keyless B2B company finder. Companies whose industry (P452) matches
 * the query, in the job's country (or the country of "<what> in <where>").
 * Good for established companies and brands (contractors, oil & gas, FMCG) and
 * almost always has a website; no phones or emails.
 *
 * ponytail: country-level only — "construction in surabaya" returns Indonesian
 * construction companies, not just Surabaya ones. Filter on HQ (P159) if that matters.
 */
export const scrapeWikidata: LeadSourceFn = async ({ query, limit, country }: ScrapeRequest) => {
  const { what, where } = splitQuery(query);
  const industry = industryOf(what);
  const terms = industry?.wikidata ?? [what];

  let countryCode = country?.toUpperCase();
  if (!countryCode && where) countryCode = (await geocode(where))?.countryCode ?? undefined;

  const industryIds = (await Promise.all(terms.map(searchItems))).flat();
  if (!industryIds.length) return [];

  const res = await fetch(`${SPARQL_URL}?${new URLSearchParams({ query: buildSparql(industryIds, countryCode, limit) })}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'Utune-AI lead finder' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Wikidata query failed (${res.status}): ${(await res.text()).slice(0, 300)}`);

  const body = (await res.json()) as { results?: { bindings?: unknown[] } };
  return toRawLeads((body.results?.bindings ?? []).filter(isRecord)).slice(0, limit);
};

/** Term → top Wikidata item ids ("construction" → Q385378, ...). */
async function searchItems(term: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: term,
    language: 'en',
    type: 'item',
    limit: '3',
    format: 'json',
  });
  const res = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'Utune-AI lead finder' },
  });
  if (!res.ok) throw new Error(`Wikidata search failed (${res.status})`);
  const body = (await res.json()) as { search?: { id?: string }[] };
  return (body.search ?? []).map((r) => r.id).filter((id): id is string => !!id && /^Q\d+$/.test(id));
}

export function buildSparql(industryIds: string[], countryCode: string | undefined, limit: number): string {
  const countryFilter = countryCode
    ? `?country wdt:P297 ${JSON.stringify(countryCode)} . ?c wdt:P17 ?country .`
    : '';
  // Over-fetch: one company can come back once per website/HQ.
  return `SELECT ?c ?cLabel ?website ?coord ?industryLabel ?hqLabel WHERE {
  VALUES ?industry { ${industryIds.map((id) => `wd:${id}`).join(' ')} }
  ?c wdt:P452 ?industry .
  ${countryFilter}
  OPTIONAL { ?c wdt:P856 ?website }
  OPTIONAL { ?c wdt:P625 ?coord }
  OPTIONAL { ?c wdt:P159 ?hq }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,id" . }
} LIMIT ${limit * 3}`;
}

/** One lead per company — SPARQL repeats a company per extra website/HQ. */
export function toRawLeads(bindings: Record<string, unknown>[]): RawLead[] {
  const val = (b: Record<string, unknown>, k: string) => {
    const cell = b[k];
    return isRecord(cell) && typeof cell.value === 'string' ? cell.value : null;
  };
  const byCompany = new Map<string, RawLead>();
  for (const b of bindings) {
    const id = val(b, 'c');
    const name = val(b, 'cLabel');
    // Unlabelled items come back with their Q-id as the label.
    if (!id || !name || /^Q\d+$/.test(name) || byCompany.has(id)) continue;
    // WKT "Point(lng lat)"
    const point = val(b, 'coord')?.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    byCompany.set(id, {
      name,
      address: val(b, 'hqLabel'),
      website: val(b, 'website'),
      category: val(b, 'industryLabel'),
      emails: [],
      sourceUrl: id,
      lat: point ? Number(point[2]) : null,
      lng: point ? Number(point[1]) : null,
    });
  }
  return [...byCompany.values()];
}
