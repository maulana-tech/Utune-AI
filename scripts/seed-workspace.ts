import { db, workspaces, users } from '@repo/db';
import { eq } from 'drizzle-orm';

async function main() {
  const workspaceId = process.env.WORKSPACE_ID;
  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
  if (!workspaceId) throw new Error('WORKSPACE_ID not set in .env');

  const [existingWs] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (existingWs) {
    console.log(`workspace ${workspaceId} already exists: ${existingWs.name}`);
  } else {
    await db.insert(workspaces).values({ id: workspaceId, name: `${adminUsername}'s Workspace` });
    console.log(`workspace ${workspaceId} inserted`);
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, adminUsername)).limit(1);
  if (existingUser) {
    console.log(`user ${adminUsername} already exists`);
  } else {
    await db.insert(users).values({ workspaceId, email: adminUsername, role: 'owner' });
    console.log(`user ${adminUsername} inserted`);
  }

  console.log('done');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
