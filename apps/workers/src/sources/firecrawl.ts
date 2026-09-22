import type { LeadSourceFn, RawLead, ScrapeRequest } from './types';

/**
 * Firecrawl search: one call returns web results *with* each page already
 * scraped to markdown, so contacts are pulled straight out of the result.
 *
 * Deliberately no LLM extraction (Firecrawl's /extract) — scraping in this repo
 * stays token-free. Emails and phones come out by regex, the same way
 * places_scraper.py does it.
 *
 * Needs: FIRECRAWL_API_KEY.
 *
 * Trade-off vs places/apify: this reads business *websites*, not a directory,
 * so `address` is usually null and `name` comes off the page title.
 */
export const scrapeFirecrawl: LeadSourceFn = async ({ query, limit, country }: ScrapeRequest) => {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not set — cannot use the firecrawl source');

  const res = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      limit: Math.min(limit, 100),
      ...(country ? { country: country.toLowerCase() } : {}),
      scrapeOptions: { formats: [{ type: 'markdown' }] },
    }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl search failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }

  const body = (await res.json()) as { data?: { web?: unknown[] } };
  const web = Array.isArray(body.data?.web) ? body.data.web : [];

  return web
    .slice(0, limit)
    .map((r) => toRawLead(r as Record<string, unknown>, query))
    .filter((lead) => lead.name);
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const TEL_RE = /tel:(\+?[\d\s().-]{7,20})/i;
const PHONE_RE = /\+?\d[\d\s().-]{7,18}\d/g;

/** Same list places_scraper.py filters on — CDNs, socials and tracker addresses. */
const JUNK_EMAIL = [
  'example.com', 'sentry.io', 'wixpress.com', 'w3.org', 'schema.org',
  'googleapis.com', 'gstatic.com', 'facebook.com', 'twitter.com',
  'instagram.com', 'youtube.com', 'whatsapp.com', 'tiktok.com',
  'linkedin.com', 'localhost', 'noreply', 'no-reply', '.png', '.jpg', '.svg',
];

/** Page titles read "Contact Us | Toko Kopi" — keep the part that is the business. */
const GENERIC_TITLE = /^(home|contact|contact us|about|about us|kontak|hubungi kami|welcome|index)$/i;

export function cleanName(title: string): string {
  const parts = title.split(/[|–—·»]|\s-\s/).map((p) => p.trim()).filter(Boolean);
  return parts.find((p) => !GENERIC_TITLE.test(p)) ?? parts[0] ?? '';
}

export function extractEmails(markdown: string): string[] {
  const found = new Set<string>();
  for (const m of markdown.matchAll(EMAIL_RE)) {
    const email = m[0].toLowerCase();
    if (!JUNK_EMAIL.some((j) => email.includes(j))) found.add(email);
  }
  return [...found].sort();
}

export function extractPhone(markdown: string): string | null {
  // A tel: link is the site saying "this is our phone"; trust it over any match.
  const tel = markdown.match(TEL_RE);
  if (tel) return trimToDigits(tel[1]);

  for (const m of markdown.matchAll(PHONE_RE)) {
    const digits = m[0].replace(/\D/g, '');
    // Below 9 digits it is a date or a price; above 15 it is not a phone number.
    if (digits.length >= 9 && digits.length <= 15) return trimToDigits(m[0]);
  }
  return null;
}

/** The separator classes also match the ')' and '.' that close a sentence. */
function trimToDigits(raw: string): string {
  return raw.trim().replace(/\D+$/, '');
}

export function toRawLead(result: Record<string, unknown>, query: string): RawLead {
  const markdown = typeof result.markdown === 'string' ? result.markdown : '';
  const title = typeof result.title === 'string' ? result.title : '';
  const url = typeof result.url === 'string' ? result.url : null;

  return {
    name: cleanName(title),
    address: null,
    phone: extractPhone(markdown),
    website: url,
    // Firecrawl has no category of its own; the search query is what was asked for.
    category: query,
    emails: extractEmails(markdown),
    whatsapp: [],
    sourceUrl: url,
    lat: null,
    lng: null,
  };
}
