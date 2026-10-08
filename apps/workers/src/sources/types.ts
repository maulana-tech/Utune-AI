/**
 * A lead as a source returns it, before it is written to the `leads` table.
 * Every field except `name` is optional — sources have wildly different coverage.
 */
export interface RawLead {
  name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  emails?: string[];
  whatsapp?: string[];
  /** Link back to this lead at its source (Google Maps place, LinkedIn company page, ...). */
  sourceUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Set by `auto` to the source that actually found this lead. */
  source?: string;
  /** Social intent leads: the matching post. Such leads are never website-enriched. */
  postText?: string | null;
  postedAt?: Date | null;
}

export interface ScrapeRequest {
  query: string;
  limit: number;
  /** ISO-3166 alpha-2, '' or undefined = global. */
  country?: string;
  workspaceId: string;
  /**
   * Keys/config for this job: the workspace's own keys (BYOK, Settings page) layered
   * over the server's process.env. Sources read keys from here, never process.env.
   */
  env: Record<string, string | undefined>;
}

export type LeadSourceFn = (req: ScrapeRequest) => Promise<RawLead[]>;

/** ISO-3166 alpha-2 -> English country name, for sources that want a name not a code. */
export function countryName(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase());
}

/**
 * "dentist in bali" / "kopi di jakarta" → { what: 'dentist', where: 'bali' }.
 * No location word → where = ''. Sources that need a place (Overpass, Yelp, HERE)
 * fall back to the job's country or refuse.
 */
export function splitQuery(query: string): { what: string; where: string } {
  const m = query.match(/^(.+?)\s+(?:in|di|near|around|dekat)\s+(.+)$/i);
  return m ? { what: m[1].trim(), where: m[2].trim() } : { what: query.trim(), where: '' };
}

/** First non-empty string among the given values. */
export function firstString(...values: unknown[]): string | null {
  for (const v of values) if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Throw with the provider's own error text — sources share this so failures read the same in job logs. */
export async function fetchJson(source: string, url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${source} request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
