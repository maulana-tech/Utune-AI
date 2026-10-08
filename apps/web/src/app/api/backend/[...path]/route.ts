import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backend';
import { getWorkspaceId } from '@/lib/get-workspace';

/**
 * Browser → API proxy. Every client fetch to `apiUrl()` lands here. The signed-in
 * user's workspace replaces any workspaceId the client sent (query string and JSON
 * body), so one tenant can't read or act on another's data, and the API only ever
 * sees requests carrying API_SECRET.
 */
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  let workspaceId: string;
  try {
    workspaceId = await getWorkspaceId();
  } catch {
    return NextResponse.json({ message: 'Not signed in' }, { status: 401 });
  }

  const { path } = await params;
  const search = new URLSearchParams(req.nextUrl.searchParams);
  if (search.has('workspaceId')) search.set('workspaceId', workspaceId);
  const query = search.toString();

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
    if (body && req.headers.get('content-type')?.includes('application/json')) {
      try {
        const json = JSON.parse(body) as unknown;
        if (json && typeof json === 'object' && !Array.isArray(json) && 'workspaceId' in json) {
          body = JSON.stringify({ ...json, workspaceId });
        }
      } catch {
        // not JSON after all — forward untouched
      }
    }
  }

  const res = await backendFetch(`/${path.map(encodeURIComponent).join('/')}${query ? `?${query}` : ''}`, {
    method: req.method,
    headers: { 'content-type': req.headers.get('content-type') ?? 'application/json' },
    body,
  });
  return new NextResponse(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
