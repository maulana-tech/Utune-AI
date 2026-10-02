import { extractEmails, extractPhone } from './firecrawl';
import { runPython } from './places';
import type { RawLead } from './types';

interface SiteContacts {
  emails: string[];
  whatsapp: string[];
  phones: string[];
}

/**
 * Crawl each lead's website for emails / WhatsApp / phone, for leads that have
 * a website but no email yet. Sources like Wikidata, Apollo and OSM return
 * websites only — without this they never show up on the Contacts page.
 * `places` already does this inside its Python scraper.
 *
 * Two layers, cheapest first:
 *   1. enrich_websites.py — plain HTTP, follows the site's own contact links. Free.
 *   2. Firecrawl /scrape (if FIRECRAWL_API_KEY) — renders JS, for whatever layer 1
 *      left empty. Costs credits, so capped at FIRECRAWL_ENRICH_MAX sites per job.
 *   3. ScrapeGraphAI /extract (if SGAI_API_KEY) — LLM reads the page, so it finds
 *      contacts written in ways regex misses. ~5 credits/site, capped at
 *      SGAI_ENRICH_MAX. The LLM runs on ScrapeGraph's side: our token cost stays zero.
 */
export async function enrichFromWebsites(leads: RawLead[], jobSource: string): Promise<RawLead[]> {
  const targets = leads
    .map((lead, i) => ({ lead, key: String(i) }))
    .filter(({ lead }) => lead.website && !lead.emails?.length && (lead.source ?? jobSource) !== 'places');
  if (!targets.length) return leads;

  console.log(`[Scrape] Enriching ${targets.length} websites for contacts...`);
  let found: Record<string, SiteContacts>;
  try {
    found = await runPython<Record<string, SiteContacts>>(
      'enrich_websites.py',
      ['240'],
      JSON.stringify(targets.map(({ lead, key }) => ({ key, url: lead.website, phone: lead.phone }))),
    );
  } catch (err) {
    // Enrichment is a bonus — never lose the scraped leads over it.
    console.warn(`[Scrape] Website enrichment failed: ${err instanceof Error ? err.message : String(err)}`);
    return leads;
  }

  let out = mergeContacts(leads, found);
  if (process.env.FIRECRAWL_API_KEY) out = await enrichWith('Firecrawl', out, jobSource, FIRECRAWL_ENRICH_MAX, firecrawlContacts);
  if (process.env.SGAI_API_KEY) out = await enrichWith('ScrapeGraphAI', out, jobSource, SGAI_ENRICH_MAX, scrapegraphContacts);
  return out;
}

const FIRECRAWL_ENRICH_MAX = Number(process.env.FIRECRAWL_ENRICH_MAX ?? 20);
const SGAI_ENRICH_MAX = Number(process.env.SGAI_ENRICH_MAX ?? 10);

/** Run a paid enricher on leads that still have no email and no phone. */
async function enrichWith(
  name: string,
  leads: RawLead[],
  jobSource: string,
  max: number,
  fetchContacts: (url: string) => Promise<SiteContacts & { address?: string | null }>,
): Promise<RawLead[]> {
  const empty = leads
    .map((lead, i) => ({ lead, i }))
    .filter(({ lead }) => lead.website && !lead.emails?.length && !lead.phone && (lead.source ?? jobSource) !== 'places')
    .slice(0, max);
  if (!empty.length) return leads;

  console.log(`[Scrape] ${name}: enriching ${empty.length} sites still without contacts...`);
  const out = [...leads];
  // ponytail: 3 at a time, no retry — raise if the provider's plan allows more concurrency.
  for (let start = 0; start < empty.length; start += 3) {
    await Promise.all(
      empty.slice(start, start + 3).map(async ({ lead, i }) => {
        try {
          const c = await fetchContacts(lead.website!);
          out[i] = { ...mergeContacts([lead], { '0': c })[0], address: lead.address || c.address || null };
        } catch (err) {
          console.warn(`[Scrape] ${name} enrich failed for ${lead.website}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }),
    );
  }
  return out;
}

/** ScrapeGraphAI v2 (the v1 api.scrapegraphai.com host is deprecated). */
async function scrapegraphContacts(url: string): Promise<SiteContacts & { address: string | null }> {
  const res = await fetch('https://v2-api.scrapegraphai.com/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'SGAI-APIKEY': process.env.SGAI_API_KEY! },
    body: JSON.stringify({
      url,
      prompt:
        'Extract the company contact details exactly as written on the site: emails, phone numbers, ' +
        'WhatsApp numbers and head office address. Empty list / null when not on the site; never guess.',
      schema: {
        type: 'object',
        properties: {
          emails: { type: 'array', items: { type: 'string' } },
          phones: { type: 'array', items: { type: 'string' } },
          whatsapp: { type: 'array', items: { type: 'string' } },
          address: { type: ['string', 'null'] },
        },
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { json?: Record<string, unknown> };
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []);
  const j = body.json ?? {};
  // The model can still invent; keep only things shaped like what we asked for.
  return {
    emails: strings(j.emails).filter((e) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)).map((e) => e.toLowerCase()),
    phones: strings(j.phones).filter((p) => p.replace(/\D/g, '').length >= 8),
    whatsapp: strings(j.whatsapp).filter((p) => p.replace(/\D/g, '').length >= 8),
    address: typeof j.address === 'string' && j.address.trim() ? j.address.replace(/\s*\n\s*/g, ', ').trim() : null,
  };
}

/** Homepage, then the first contact page it links to if the homepage had no email. */
async function firecrawlContacts(url: string): Promise<SiteContacts> {
  const home = await firecrawlScrape(url);
  let markdown = home.markdown;
  if (!extractEmails(markdown).length) {
    const contact = home.links.find((l) => /contact|kontak|hubungi/i.test(l));
    if (contact) markdown += `\n${(await firecrawlScrape(contact)).markdown}`;
  }
  const phone = extractPhone(markdown);
  return { emails: extractEmails(markdown), whatsapp: [], phones: phone ? [phone] : [] };
}

async function firecrawlScrape(url: string): Promise<{ markdown: string; links: string[] }> {
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
    body: JSON.stringify({ url, formats: ['markdown', 'links'], onlyMainContent: false }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { data?: { markdown?: string; links?: unknown[] } };
  return {
    markdown: body.data?.markdown ?? '',
    links: (body.data?.links ?? []).filter((l): l is string => typeof l === 'string'),
  };
}

export function mergeContacts(leads: RawLead[], found: Record<string, SiteContacts>): RawLead[] {
  return leads.map((lead, i) => {
    const c = found[String(i)];
    if (!c) return lead;
    return {
      ...lead,
      emails: [...new Set([...(lead.emails ?? []), ...c.emails])],
      whatsapp: [...new Set([...(lead.whatsapp ?? []), ...c.whatsapp])],
      phone: lead.phone || c.phones[0] || null,
    };
  });
}
