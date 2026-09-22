import { DashboardClient } from '../../../features/dashboard/DashboardClient';
import { db, leads } from '@repo/db';
import { eq } from 'drizzle-orm';
import { getWorkspaceId } from '@/lib/get-workspace';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const workspaceId = await getWorkspaceId();
  const allLeads = await db
    .select({
      id: leads.id,
      source: leads.source,
      name: leads.name,
      address: leads.address,
      emails: leads.emails,
      whatsapp: leads.whatsapp,
      category: leads.category,
      mapsUrl: leads.mapsUrl,
      phone: leads.phone,
      pipelineStage: leads.pipelineStage,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(eq(leads.workspaceId, workspaceId));

  // Convert Date to string for client
  const leadsWithStringDates = allLeads.map(lead => ({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
  }));

  return <DashboardClient leads={leadsWithStringDates} />;
}
