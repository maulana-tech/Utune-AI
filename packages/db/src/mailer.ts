import { and, eq, sql } from 'drizzle-orm';
import { db } from './index';
import { brandFromEnv, plainTextFromMarkup, renderEmailHtml } from './email-html';
import { emailOutreach } from './schema/email_outreach';
import { workspaces } from './schema/workspaces';
import { getWorkspaceKeys } from './secrets';

/**
 * One way to send email, used by the API, the email scheduler and the web app.
 * EMAIL_PROVIDER picks the transport:
 *   gmail  (default) — the workspace's Gmail, connected in Composio (COMPOSIO_API_KEY)
 *   resend           — RESEND_API_KEY + RESEND_FROM_EMAIL on a verified domain; delivery/open/click webhooks
 *   smtp             — SumoPod SMTP (SUMOPOD_SMTP_*); "sumopod" is accepted as an alias
 * `env` is process.env with the workspace's own keys (BYOK) layered on top.
 */
export type MailProvider = 'gmail' | 'resend' | 'smtp';
type Env = Record<string, string | undefined>;

export function mailProvider(env: Env): MailProvider {
  const p = (env.EMAIL_PROVIDER ?? '').toLowerCase();
  if (p === 'resend') return 'resend';
  if (p === 'smtp' || p === 'sumopod') return 'smtp';
  return 'gmail';
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
}

const looksLikeHtml = (body: string) => /<\/?(p|br|div|a|strong|em|ul|ol|li|table|html|body)\b/i.test(body);

/** Send one email. Returns who it went out as and the provider's message id. */
export async function deliverEmail(
  mail: OutgoingEmail,
  env: Env,
  workspaceId: string,
): Promise<{ provider: MailProvider; from: string; messageId: string | null }> {
  const provider = mailProvider(env);
  // Plain-text templates get the designed layout (email-html.ts) plus a text/plain part;
  // a body that is already HTML (e.g. an AI draft) is sent as-is.
  const isHtml = looksLikeHtml(mail.body);
  const brand = isHtml ? null : await brandFor(env, workspaceId);
  const html = brand ? renderEmailHtml(mail.body, brand, mail.subject) : mail.body;
  const text = brand ? plainTextFromMarkup(mail.body, brand) : undefined;

  if (provider === 'resend') {
    const key = env.RESEND_API_KEY;
    const from = env.RESEND_FROM_EMAIL;
    if (!key || !from) throw new Error('Resend needs RESEND_API_KEY and RESEND_FROM_EMAIL (a verified domain)');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: mail.to,
        subject: mail.subject,
        html,
        ...(text ? { text } : {}),
        tags: [{ name: 'workspace_id', value: workspaceId }],
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message ?? 'send failed'}`);
    return { provider, from, messageId: body.id ?? null };
  }

  if (provider === 'smtp') {
    const { SUMOPOD_SMTP_HOST: host, SUMOPOD_SMTP_PORT: port, SUMOPOD_SMTP_USER: user, SUMOPOD_SMTP_PASS: pass } = env;
    const from = env.SUMOPOD_FROM_EMAIL;
    if (!host || !port || !user || !pass || !from) throw new Error('SMTP needs SUMOPOD_SMTP_HOST/PORT/USER/PASS and SUMOPOD_FROM_EMAIL');
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({ host, port: Number(port), secure: true, auth: { user, pass } });
    const info = await transport.sendMail({ from, to: mail.to, subject: mail.subject, html, ...(text ? { text } : {}) });
    return { provider, from, messageId: info.messageId ?? null };
  }

  // gmail via Composio
  const key = env.COMPOSIO_API_KEY;
  if (!key) throw new Error('Gmail sending needs COMPOSIO_API_KEY (add it in Settings → API keys) and Gmail connected in Composio');
  const userId = env.COMPOSIO_USER_ID || (await composioUser(key, 'gmail', workspaceId));
  const data = await composioTool(key, userId, 'GMAIL_SEND_EMAIL', {
    recipient_email: mail.to,
    subject: mail.subject,
    body: html,
    is_html: true,
  });
  const sent = isObj(data) && isObj(data.response_data) ? data.response_data : {};
  return { provider, from: await gmailAddress(key, userId), messageId: typeof sent.id === 'string' ? sent.id : null };
}

/** Brand for the email layout: EMAIL_BRAND_* env, else the workspace's name. */
async function brandFor(env: Env, workspaceId: string) {
  if (env.EMAIL_BRAND_NAME) return brandFromEnv(env);
  const [ws] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  return brandFromEnv(env, ws?.name);
}

/**
 * Record an email in email_outreach and send it — or leave it as a draft for the
 * scheduler when `scheduledFor` is set. Throws (after marking the row failed) if
 * sending fails.
 */
export async function sendAndRecord(
  params: OutgoingEmail & { workspaceId: string; leadId: string; scheduledFor?: Date },
  env: Env,
): Promise<{ emailId: string; scheduled: boolean; provider?: MailProvider }> {
  const [row] = await db
    .insert(emailOutreach)
    .values({
      workspaceId: params.workspaceId,
      leadId: params.leadId,
      fromEmail: '(pending)',
      toEmail: params.to,
      subject: params.subject,
      body: params.body,
      status: params.scheduledFor ? 'draft' : 'queued',
      scheduledFor: params.scheduledFor,
    })
    .returning({ id: emailOutreach.id });
  if (params.scheduledFor) return { emailId: row.id, scheduled: true };

  const result = await deliverOutreachRow(row.id, params, env, params.workspaceId);
  return { emailId: row.id, scheduled: false, provider: result.provider };
}

async function deliverOutreachRow(id: string, mail: OutgoingEmail, env: Env, workspaceId: string) {
  try {
    const sent = await deliverEmail(mail, env, workspaceId);
    await db
      .update(emailOutreach)
      // resendEmailId holds whichever provider's message id; Resend webhooks match on it.
      .set({ status: 'sent', sentAt: new Date(), fromEmail: sent.from, resendEmailId: sent.messageId })
      .where(eq(emailOutreach.id, id));
    return sent;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await db.update(emailOutreach).set({ status: 'failed', errorMessage }).where(eq(emailOutreach.id, id));
    throw new Error(errorMessage);
  }
}

/** Send every draft whose scheduledFor has passed, each with its own workspace's keys. */
export async function sendDueEmails(baseEnv: Env): Promise<{ sent: number; failed: number }> {
  const due = await db
    .select()
    .from(emailOutreach)
    .where(and(eq(emailOutreach.status, 'draft'), sql`${emailOutreach.scheduledFor} <= NOW()`));
  let sent = 0;
  let failed = 0;
  for (const row of due) {
    await db.update(emailOutreach).set({ status: 'queued' }).where(eq(emailOutreach.id, row.id));
    const env = { ...baseEnv, ...(await getWorkspaceKeys(row.workspaceId)) };
    try {
      await deliverOutreachRow(row.id, { to: row.toEmail, subject: row.subject, body: row.body }, env, row.workspaceId);
      sent++;
    } catch (err) {
      console.error(`[mailer] scheduled email ${row.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }
  return { sent, failed };
}

// ── Composio REST (no SDK: @composio/core is ESM-only, this package is CommonJS) ──

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function composioTool(apiKey: string, userId: string, tool: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`https://backend.composio.dev/api/v3/tools/execute/${tool}`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, arguments: args }),
  });
  const body = (await res.json().catch(() => ({}))) as { successful?: boolean; data?: unknown; error?: unknown };
  if (!res.ok || body.successful === false) {
    const msg = isObj(body.error) ? String(body.error.message ?? JSON.stringify(body.error)) : String(body.error ?? res.status);
    throw new Error(`${tool}: ${msg}`);
  }
  return body.data;
}

/** The Composio user owning an active connection for `toolkit` — this workspace's if it has one. */
async function composioUser(apiKey: string, toolkit: string, workspaceId: string): Promise<string> {
  const res = await fetch(
    `https://backend.composio.dev/api/v3/connected_accounts?toolkit_slugs=${toolkit}&statuses=ACTIVE`,
    { headers: { 'x-api-key': apiKey } },
  );
  if (!res.ok) throw new Error(`Composio connected accounts lookup failed (${res.status})`);
  const body = (await res.json()) as { items?: { user_id?: string }[] };
  const users = (body.items ?? []).map((a) => a.user_id).filter((u): u is string => !!u);
  if (!users.length) throw new Error(`No active ${toolkit} connection in Composio — connect it at app.composio.dev`);
  return users.includes(workspaceId) ? workspaceId : users[0];
}

const gmailAddresses = new Map<string, string>();

/** The connected Gmail address, for the "from" column. Falls back to a label if the lookup fails. */
async function gmailAddress(apiKey: string, userId: string): Promise<string> {
  const cacheKey = `${apiKey.slice(-6)}:${userId}`;
  if (!gmailAddresses.has(cacheKey)) {
    try {
      const data = await composioTool(apiKey, userId, 'GMAIL_GET_PROFILE', { user_id: 'me' });
      // Composio wraps Gmail's response: { response_data: { emailAddress, ... } }
      const profile = isObj(data) && isObj(data.response_data) ? data.response_data : data;
      const address = isObj(profile) && typeof profile.emailAddress === 'string' ? profile.emailAddress : null;
      gmailAddresses.set(cacheKey, address ?? 'gmail');
    } catch {
      gmailAddresses.set(cacheKey, 'gmail');
    }
  }
  return gmailAddresses.get(cacheKey)!;
}
