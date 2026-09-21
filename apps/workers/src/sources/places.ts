import { spawn } from 'child_process';
import path from 'path';
import type { LeadSourceFn, RawLead, ScrapeRequest } from './types';

/**
 * Google Places API via the Python scraper, which also crawls each business
 * website for emails / WhatsApp numbers.
 */
export const scrapePlaces: LeadSourceFn = async ({ query, limit, country }: ScrapeRequest) => {
  const rows = await runPythonScraper(query, limit, country);

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

function runPythonScraper(
  query: string,
  limit: number,
  country?: string,
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../python/places_scraper.py');
    const pythonExec = path.resolve(__dirname, '../../.venv/bin/python');
    // 3rd arg = country bias; '' means global (scraper defaults to English results).
    const proc = spawn(
      pythonExec,
      [scriptPath, query, String(limit), (country ?? '').toLowerCase()],
      { env: { ...process.env } },
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Scraper exited ${code}: ${stderr.slice(0, 500)}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Failed to parse scraper output: ${stdout.slice(0, 200)}`));
      }
    });
  });
}
