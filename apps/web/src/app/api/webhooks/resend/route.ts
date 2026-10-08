import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backend';
import { verifySvix } from '@/lib/svix';

/**
 * Resend delivery/open/click webhooks (Resend → this HTTPS route → API).
 * Resend signs with Svix: base64 HMAC-SHA256 of `${svix-id}.${svix-timestamp}.${rawBody}`
 * keyed with the base64 part of RESEND_WEBHOOK_SECRET ("whsec_…"). Verified here,
 * where the raw body is available; the API trusts the forward via API_SECRET.
 *
 * Webhook URL to set in Resend: https://<web-domain>/api/webhooks/resend
 */
export async function POST(request: Request) {
  const body = await request.text();
  const id = request.headers.get('svix-id') ?? '';
  const timestamp = request.headers.get('svix-timestamp') ?? '';
  const signature = request.headers.get('svix-signature') ?? '';
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'RESEND_WEBHOOK_SECRET is not configured' }, { status: 500 });
    }
  } else if (!verifySvix(secret, id, timestamp, body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const res = await backendFetch('/webhooks/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    console.error('[Resend webhook] API error:', res.status);
    return NextResponse.json({ success: false }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
