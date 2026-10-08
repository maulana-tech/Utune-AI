import { spawn } from 'child_process';
import path from 'path';
import type { LeadSourceFn, RawLead, ScrapeRequest } from './types';

/**
 * Google Places API via the Python scraper, which also crawls each business
 * website for emails / WhatsApp numbers.
 * Needs: GOOGLE_MAPS_API_KEY. Without it, use the `auto` source to fall back to others.
 */
export const scrapePlaces: LeadSourceFn = async ({ query, limit, country, env }: ScrapeRequest) => {
  if (!env.GOOGLE_MAPS_API_KEY) throw new Error('GOOGLE_MAPS_API_KEY is not set — cannot use the places source (add it in Settings → API keys)');
  // 3rd arg = country bias; '' means global (scraper defaults to English results).
  const rows = await runPython<Record<string, unknown>[]>(
    'places_scraper.py',
    [query, String(limit), (country ?? '').toLowerCase()],
    undefined,
    env,
  );

  return rows.map((r): RawLead => ({
    name: String(r.name ?? '').trim(),
    address: (r.address as string) || null,
    phone: (r.phone as string) || null,
    website: (r.website as string) || null,
    category: (r.category as string) || null,
    emails: (r.emails as string[]) ?? [],
    whatsapp: (r.whatsapp as string[]) ?? [],
    sourceUrl: (r.maps_url as string) || null,
    lat: (r.lat as number) ?? null,
    lng: (r.lng as number) ?? null,
  }));
};

/** Run a script from ../python with the worker's venv; stdout must be JSON. */
export function runPython<T>(
  script: string,
  args: string[],
  stdin?: string,
  env: Record<string, string | undefined> = process.env,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../python', script);
    const pythonExec = path.resolve(__dirname, '../../.venv/bin/python');
    const proc = spawn(pythonExec, [scriptPath, ...args], { env });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on('error', reject);

    proc.on('close', (code) => {
      if (code !== 0) {
        // urllib3 prints an OpenSSL warning first — keep the tail, where the real error is.
        return reject(new Error(`${script} exited ${code}: ${stderr.slice(-500)}`));
      }
      try {
        resolve(JSON.parse(stdout) as T);
      } catch {
        reject(new Error(`Failed to parse ${script} output: ${stdout.slice(0, 200)}`));
      }
    });

    if (stdin !== undefined) proc.stdin.end(stdin);
  });
}
