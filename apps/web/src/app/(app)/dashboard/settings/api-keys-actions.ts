'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, encryptSecret, isByokKey, workspaceApiKeys } from '@repo/db';
import { getWorkspaceId } from '@/lib/get-workspace';

// Workspace always comes from the session, never from the client.

export async function saveApiKey(name: string, value: string) {
  if (!isByokKey(name)) throw new Error('Unknown key');
  const key = value.trim();
  if (!key || key.length > 500 || /\s/.test(key)) throw new Error('That does not look like an API key');

  const workspaceId = await getWorkspaceId();
  const sealed = encryptSecret(key);
  await db
    .insert(workspaceApiKeys)
    .values({ workspaceId, name, value: sealed })
    .onConflictDoUpdate({
      target: [workspaceApiKeys.workspaceId, workspaceApiKeys.name],
      set: { value: sealed, updatedAt: new Date() },
    });
  revalidatePath('/dashboard/settings');
}

export async function deleteApiKey(name: string) {
  if (!isByokKey(name)) throw new Error('Unknown key');
  const workspaceId = await getWorkspaceId();
  await db
    .delete(workspaceApiKeys)
    .where(and(eq(workspaceApiKeys.workspaceId, workspaceId), eq(workspaceApiKeys.name, name)));
  revalidatePath('/dashboard/settings');
}
