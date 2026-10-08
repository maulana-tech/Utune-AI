'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, emailTemplates, getWorkspaceKeys, leadNotes, leads, sendAndRecord } from '@repo/db';
import { getWorkspaceId } from '@/lib/get-workspace';

// Workspace always comes from the session, never from the client.

export async function saveTemplate(input: { id?: string; name: string; subject: string; body: string }) {
  const name = input.name.trim();
  const body = input.body.trim();
  if (!name || !body) throw new Error('Name and message are required');

  const workspaceId = await getWorkspaceId();
  const values = { name, subject: input.subject.trim(), body };

  if (input.id) {
    await db
      .update(emailTemplates)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, input.id), eq(emailTemplates.workspaceId, workspaceId)));
  } else {
    await db.insert(emailTemplates).values({ ...values, workspaceId });
  }
  revalidatePath('/dashboard/contacts');
}

export async function deleteTemplate(id: string) {
  const workspaceId = await getWorkspaceId();
  await db
    .delete(emailTemplates)
    .where(and(eq(emailTemplates.id, id), eq(emailTemplates.workspaceId, workspaceId)));
  revalidatePath('/dashboard/contacts');
}

/** Record a sent follow-up as a lead note and move untouched leads to "Contacted". */
export async function logFollowUp(
  leadId: string,
  channel: 'whatsapp' | 'email' | 'email (sent from app)' | 'copy',
  templateName: string,
) {
  const workspaceId = await getWorkspaceId();
  const [lead] = await db
    .select({ id: leads.id, stage: leads.pipelineStage })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspaceId)))
    .limit(1);
  if (!lead) throw new Error('Lead not found');

  await db.insert(leadNotes).values({
    leadId,
    workspaceId,
    author: 'follow-up',
    content: `Follow-up via ${channel}: "${templateName}"`,
  });

  if (!lead.stage || lead.stage === 'Prospecting') {
    await db
      .update(leads)
      .set({ pipelineStage: 'Contacted', updatedAt: new Date() })
      .where(eq(leads.id, leadId));
  }
  revalidatePath('/dashboard/contacts');
}

/**
 * Send the rendered template to the lead's first email address through the shared
 * mailer (EMAIL_PROVIDER: Gmail via Composio by default). Returns the error instead of
 * throwing — Next hides thrown server-action messages in production.
 */
export async function sendLeadEmail(
  leadId: string,
  subject: string,
  body: string,
  templateName: string,
): Promise<{ ok: true; provider: string } | { ok: false; error: string }> {
  const workspaceId = await getWorkspaceId();
  const [lead] = await db
    .select({ emails: leads.emails })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspaceId)))
    .limit(1);
  const to = lead?.emails?.[0];
  if (!to) return { ok: false, error: 'This lead has no email address' };
  if (!subject.trim() || !body.trim()) return { ok: false, error: 'Subject and message are required' };

  try {
    const env = { ...process.env, ...(await getWorkspaceKeys(workspaceId)) };
    const result = await sendAndRecord({ workspaceId, leadId, to, subject, body }, env);
    await logFollowUp(leadId, 'email (sent from app)', templateName);
    return { ok: true, provider: result.provider ?? 'email' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
