import 'server-only';
import { createClient } from './supabase/server';
import { db, workspaces, users } from '@repo/db';
import { eq } from 'drizzle-orm';
import { DEV_WORKSPACE_ID } from './workspace';

/**
 * Returns workspaceId dari session user.
 * Auto-provision workspace + user row kalau first login.
 *
 * RACE CONDITION PROTECTION: If multiple requests try to create
 * workspace/user simultaneously, the unique constraint on users.email
 * will fail on all but one. We catch that error and retry the SELECT.
 */
export async function getWorkspaceId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    // Local dev without Supabase uses the demo workspace; production never does.
    if (process.env.NODE_ENV === 'production') throw new Error('Not signed in');
    return DEV_WORKSPACE_ID;
  }

  // First attempt: check if user already exists
  const [existing] = await db
    .select({ workspaceId: users.workspaceId })
    .from(users)
    .where(eq(users.email, user.email))
    .limit(1);

  if (existing) {
    return existing.workspaceId;
  }

  // User doesn't exist — try to create workspace + user
  try {
    const [ws] = await db
      .insert(workspaces)
      .values({ name: `${user.email}'s Workspace` })
      .returning({ id: workspaces.id });

    await db.insert(users).values({
      workspaceId: ws.id,
      email: user.email,
      role: 'owner',
    });

    return ws.id;
  } catch (err: any) {
    // If unique constraint violation (23505) on users.email,
    // another request already created the user — retry SELECT
    if (err?.code === '23505' && err?.constraint === 'users_email_unique') {
      const [retry] = await db
        .select({ workspaceId: users.workspaceId })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (retry) {
        return retry.workspaceId;
      }
    }
    // Other errors — re-throw
    throw err;
  }
}
