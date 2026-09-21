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
}

export interface ScrapeRequest {
  query: string;
  limit: number;
  /** ISO-3166 alpha-2, '' or undefined = global. */
  country?: string;
  workspaceId: string;
}

export type LeadSourceFn = (req: ScrapeRequest) => Promise<RawLead[]>;

/** ISO-3166 alpha-2 -> English country name, for sources that want a name not a code. */
export function countryName(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase());
}
