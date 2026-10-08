import { createHmac, timingSafeEqual } from 'node:crypto';

/** Svix (Resend webhooks) signature check; 5-minute replay window. */
export function verifySvix(secret: string, id: string, timestamp: string, body: string, signatureHeader: string, nowSec = Date.now() / 1000): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > 300) return false; // 5 min replay window
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest();
  return signatureHeader.split(' ').some((part) => {
    const sig = Buffer.from(part.split(',')[1] ?? '', 'base64');
    return sig.length === expected.length && timingSafeEqual(sig, expected);
  });
}
