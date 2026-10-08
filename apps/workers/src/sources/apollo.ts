import { composioExecute } from './composio';
import { countryName, splitQuery, type LeadSourceFn, type RawLead, type ScrapeRequest } from './types';

/**
 * Apollo company search through Composio (`APOLLO_ORGANIZATION_SEARCH`).
 *
 * Apollo is the LinkedIn-derived B2B database — it is what actually answers
 * "find me companies like X". Composio's own LinkedIn toolkit only posts and
 * comments; it has no company/people search, so it is not a lead source.
 *
 * Needs: COMPOSIO_API_KEY, plus an Apollo account connected in Composio for
 * COMPOSIO_USER_ID (falls back to the workspace id, so each workspace can
 * connect its own Apollo key).
 */
export const scrapeApollo: LeadSourceFn = async ({
  query,
  limit,
  country,
  workspaceId,
  env,
}: ScrapeRequest) => {
  // "construction company in jakarta" → keyword "construction company", location "jakarta".
  const { what, where } = splitQuery(query);
  const locations = [where, countryName(country)].filter((l): l is string => !!l);
  const data = await composioExecute(env, workspaceId, 'apollo', 'APOLLO_ORGANIZATION_SEARCH', {
    q_organization_keyword_tags: [what],
    ...(locations.length ? { organization_locations: locations } : {}),
    per_page: Math.min(limit, 100),
    page: 1,
  });

  return extractOrganizations(data).slice(0, limit).map(toRawLead);
};

/**
 * Composio returns the provider's raw payload, and Apollo has used both
 * `organizations` and `accounts` for this endpoint — accept either, and accept
 * a JSON string in case the tool hands the body back unparsed.
 */
export function extractOrganizations(data: unknown): Record<string, unknown>[] {
  let body = data;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return [];
    }
  }
  if (!body || typeof body !== 'object') return [];

  const obj = body as Record<string, unknown>;
  for (const key of ['organizations', 'accounts', 'results']) {
    const value = obj[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
  }
  // Some responses nest the payload one level down under `data`.
  if (obj.data && obj.data !== body) return extractOrganizations(obj.data);
  return [];
}

export function toRawLead(org: Record<string, unknown>): RawLead {
  const str = (key: string): string | null => {
    const v = org[key];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };

  const phoneObj = org.primary_phone as Record<string, unknown> | undefined;
  const phone =
    (typeof phoneObj?.number === 'string' ? phoneObj.number : null) ?? str('phone');

  // Country last, so the leads table can read it off the tail like a Places address.
  const address = [str('street_address'), str('city'), str('state'), str('country')]
    .filter(Boolean)
    .join(', ');

  return {
    name: str('name') ?? '',
    address: address || null,
    phone,
    website: str('website_url') ?? (str('primary_domain') ? `https://${str('primary_domain')}` : null),
    category: str('industry'),
    emails: [],
    whatsapp: [],
    sourceUrl: str('linkedin_url'),
    lat: null,
    lng: null,
  };
}
