import { NextRequest, NextResponse } from 'next/server';
import { db, leads } from '@repo/db';
import { and, eq } from 'drizzle-orm';
import { getWorkspaceId } from '@/lib/get-workspace';

const VALID_STAGES = [
  'Prospecting',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).stage !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing stage field' }, { status: 400 });
  }

  const stage = (body as Record<string, unknown>).stage as string;

  if (!(VALID_STAGES as readonly string[]).includes(stage)) {
    return NextResponse.json(
      { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
      { status: 400 }
    );
  }

  let workspaceId: string;
  try {
    workspaceId = await getWorkspaceId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const updated = await db
    .update(leads)
    .set({ pipelineStage: stage })
    .where(and(eq(leads.id, id), eq(leads.workspaceId, workspaceId)))
    .returning({ id: leads.id });
  if (!updated.length) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
