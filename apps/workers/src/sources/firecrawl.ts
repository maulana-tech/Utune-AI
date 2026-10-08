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
export const scrapeFirecrawl: LeadSourceFn = async ({ query, limit, country, env }: ScrapeRequest) => {
  const apiKey = env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not set — cannot use the firecrawl source (add it in Settings → API keys)');

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
    .map((r) => r as Record<string, unknown>)
    .filter((r) => !isListingPage(r))
    .slice(0, limit)
    .map((r) => toRawLead(r, query))
    .filter((lead) => lead.name);
};

/** Directories, socials, news and wikis — pages *about* companies, not a company's own site. */
const LISTING_HOSTS = [
  'fitchratings.com', 'michaelpage', 'kompas.com', 'detik.com', 'cnbcindonesia.com', 'bisnis.com',
  'linkedin.com', 'wikipedia.org', 'facebook.com', 'instagram.com', 'youtube.com', 'x.com',
  'twitter.com', 'tiktok.com', 'medium.com', 'reddit.com', 'quora.com', 'scribd.com',
  'fitchsolutions.com', 'glassdoor.com', 'indeed.com', 'jobstreet.co.id', 'crunchbase.com',
  'zoominfo.com', 'dnb.com', 'tracxn.com', 'yellowpages', 'yelp.com', 'tripadvisor.com',
];
/** Sections of a site that are about other companies, not this one. */
const LISTING_PATH = /\/(jobs?|careers?|lowongan|news|berita|blog|articles?|artikel|research|insights?|wiki|directory|direktori|list|tag|category|kategori)(\/|$)/;
/** "Top 5 …", "Category: …", "Construction companies in Indonesia", "Daftar perusahaan …". */
const LISTING_TITLE = /^(top|best|list of|category:|daftar|\d+\s)|\bcompanies (in|of)\b|\bperusahaan\b.*\b(di|terbaik)\b/i;

export function isListingPage(r: Record<string, unknown>): boolean {
  const url = typeof r.url === 'string' ? r.url : '';
  const title = typeof r.title === 'string' ? r.title : '';
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return true;
  }
  let path = '';
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    // host check above already parsed it
  }
  return (
    LISTING_HOSTS.some((h) => host === h || host.endsWith(`.${h}`) || host.includes(h)) ||
    LISTING_TITLE.test(title.trim()) ||
    LISTING_PATH.test(path) ||
    // a long hyphenated slug is an article ("/indonesias-largest-mining-contractors/")
    path.split('/').some((seg) => seg.split('-').length >= 4)
  );
}

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
const GENERIC_TITLE = /^(home|beranda|contact|contact us|about|about us|kontak|hubungi kami|welcome|selamat datang|index|official website|situs resmi)$/i;

/**
 * The business's name for a search result: og:site_name when the site sets one,
 * else the title part that reads like a company ("General Contractor based in
 * Surabaya - PT Archikon" → "PT Archikon"), else the first non-generic part.
 */
export function companyName(title: string, siteName = ''): string {
  if (siteName.trim() && !GENERIC_TITLE.test(siteName.trim())) return siteName.trim();
  const parts = title.split(/[|–—·»]|\s-\s|:\s/).map((p) => p.trim()).filter(Boolean);
  return parts.find((p) => /\b(PT|CV|Tbk|Ltd|Inc|LLC|Group|Persero)\b/.test(p)) ?? cleanName(title);
}

export function cleanName(title: string): string {
  const parts = title.split(/[|–—·»]|\s-\s|:\s/).map((p) => p.trim()).filter(Boolean);
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

  // "Telp: (021) 555 1234" — a labelled number is the site saying it's a phone.
  const labelled = markdown.match(/(?:tel|telp|telepon|phone|call|hotline)\.?\s*[:.]?\s*(\+?\(?\d[\d\s().-]{6,18}\d)/i);
  if (labelled) return trimToDigits(labelled[1]);

  // Unlabelled: only international format. Bare digit runs are dates, tax ids, order numbers.
  for (const m of markdown.matchAll(PHONE_RE)) {
    const digits = m[0].replace(/\D/g, '');
    if (m[0].startsWith('+') && digits.length >= 9 && digits.length <= 15) return trimToDigits(m[0]);
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
  const meta = (typeof result.metadata === 'object' && result.metadata) || {};
  const siteName = (meta as Record<string, unknown>).ogSiteName;

  return {
    name: companyName(title, typeof siteName === 'string' ? siteName : ''),
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
