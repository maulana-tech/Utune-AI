'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, emailTemplates, leadNotes, leads } from '@repo/db';
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
export async function logFollowUp(leadId: string, channel: 'whatsapp' | 'email' | 'copy', templateName: string) {
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
