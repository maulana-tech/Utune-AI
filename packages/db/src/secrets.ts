import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './index';
import { workspaceApiKeys } from './schema/workspace_api_keys';

/**
 * Keys a workspace may bring itself (BYOK), and the lead sources each unlocks.
 * This list is the allow-list: nothing else (DATABASE_URL, CAMOFOX_URL, ...) can
 * be overridden per workspace.
 */
export const BYOK_KEYS = [
  { name: 'GOOGLE_MAPS_API_KEY', label: 'Google Maps (Places API)', sources: ['places'], url: 'https://console.cloud.google.com/apis/credentials' },
  { name: 'COMPOSIO_API_KEY', label: 'Composio (Apollo)', sources: ['apollo'], url: 'https://app.composio.dev' },
  { name: 'APIFY_TOKEN', label: 'Apify', sources: ['apify'], url: 'https://console.apify.com/settings/integrations' },
  { name: 'OUTSCRAPER_API_KEY', label: 'Outscraper', sources: ['outscraper'], url: 'https://app.outscraper.com/profile' },
  { name: 'SERPAPI_API_KEY', label: 'SerpApi', sources: ['serpapi'], url: 'https://serpapi.com/manage-api-key' },
  { name: 'FOURSQUARE_API_KEY', label: 'Foursquare (service key)', sources: ['foursquare'], url: 'https://foursquare.com/developers' },
  { name: 'HERE_API_KEY', label: 'HERE', sources: ['here'], url: 'https://platform.here.com' },
  { name: 'TOMTOM_API_KEY', label: 'TomTom', sources: ['tomtom'], url: 'https://developer.tomtom.com' },
  { name: 'YELP_API_KEY', label: 'Yelp Fusion', sources: ['yelp'], url: 'https://www.yelp.com/developers' },
  { name: 'FIRECRAWL_API_KEY', label: 'Firecrawl', sources: ['firecrawl'], url: 'https://firecrawl.dev/app/api-keys' },
  { name: 'SGAI_API_KEY', label: 'ScrapeGraphAI (contact enrichment)', sources: [], url: 'https://dashboard.scrapegraphai.com' },
] as const;

export type ByokKeyName = (typeof BYOK_KEYS)[number]['name'];

export function isByokKey(name: string): name is ByokKeyName {
  return BYOK_KEYS.some((k) => k.name === name);
}

/** SECRETS_KEY can be any long random string — hashed to the 32 bytes AES-256 needs. */
function cipherKey(): Buffer {
  const secret = process.env.SECRETS_KEY;
  if (!secret) throw new Error('SECRETS_KEY is not set — cannot store or read workspace API keys');
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cipherKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, data] = stored.split(':');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unrecognised secret format');
  const decipher = createDecipheriv('aes-256-gcm', cipherKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}

/** A workspace's own keys, decrypted, allow-listed. Rows that fail to decrypt are skipped. */
export async function getWorkspaceKeys(workspaceId: string): Promise<Partial<Record<ByokKeyName, string>>> {
  const rows = await db
    .select({ name: workspaceApiKeys.name, value: workspaceApiKeys.value })
    .from(workspaceApiKeys)
    .where(eq(workspaceApiKeys.workspaceId, workspaceId));
  const keys: Partial<Record<ByokKeyName, string>> = {};
  for (const row of rows) {
    if (!isByokKey(row.name)) continue;
    try {
      keys[row.name] = decryptSecret(row.value);
    } catch (err) {
      console.warn(`[secrets] cannot decrypt ${row.name} for workspace ${workspaceId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return keys;
}
