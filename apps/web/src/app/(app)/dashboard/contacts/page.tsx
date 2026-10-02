import { and, desc, eq, max, sql } from 'drizzle-orm';
import { db, emailTemplates, leadNotes, leads } from '@repo/db';
import { getWorkspaceId } from '@/lib/get-workspace';
import { ContactsClient } from '@/features/contacts/ContactsClient';
import { STARTER_TEMPLATES } from '@/features/contacts/template';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const workspaceId = await getWorkspaceId();

  let templates = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.workspaceId, workspaceId))
    .orderBy(emailTemplates.createdAt);

  if (templates.length === 0) {
    templates = await db
      .insert(emailTemplates)
      .values(STARTER_TEMPLATES.map((t) => ({ ...t, workspaceId })))
      .returning();
  }

  // Only leads you can actually reach.
  const contacts = await db
    .select({
      id: leads.id,
      name: leads.name,
      category: leads.category,
      address: leads.address,
      phone: leads.phone,
      website: leads.website,
      emails: leads.emails,
      whatsapp: leads.whatsapp,
      pipelineStage: leads.pipelineStage,
    })
    .from(leads)
    .where(
      and(
        eq(leads.workspaceId, workspaceId),
        sql`(${leads.phone} is not null and ${leads.phone} <> ''
          or jsonb_array_length(coalesce(${leads.emails}, '[]'::jsonb)) > 0
          or jsonb_array_length(coalesce(${leads.whatsapp}, '[]'::jsonb)) > 0)`,
      ),
    )
    .orderBy(desc(leads.createdAt));

  const followUps = await db
    .select({ leadId: leadNotes.leadId, last: max(leadNotes.createdAt) })
    .from(leadNotes)
    .where(and(eq(leadNotes.workspaceId, workspaceId), eq(leadNotes.author, 'follow-up')))
    .groupBy(leadNotes.leadId);
  const lastFollowUp = Object.fromEntries(followUps.map((f) => [f.leadId, f.last?.toISOString() ?? null]));

  return (
    <ContactsClient
      contacts={contacts.map((c) => ({ ...c, lastFollowUp: lastFollowUp[c.id] ?? null }))}
      templates={templates.map((t) => ({ id: t.id, name: t.name, subject: t.subject, body: t.body }))}
    />
  );
}
