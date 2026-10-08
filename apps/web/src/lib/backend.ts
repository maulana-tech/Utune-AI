import 'server-only';

/**
 * Server-side call to the NestJS API. API_URL is server-only (the browser never
 * talks to the API — it goes through app/api/backend); API_SECRET proves the call
 * came from this app (see apps/api/src/api-secret.guard.ts).
 */
export function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  const headers = new Headers(init.headers);
  if (process.env.API_SECRET) headers.set('x-api-secret', process.env.API_SECRET);
  return fetch(`${base}${path}`, { ...init, headers, cache: 'no-store' });
}
