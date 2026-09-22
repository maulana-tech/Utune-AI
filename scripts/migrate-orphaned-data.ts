/**
 * Migrate data from orphaned workspace to active workspace
 * Run: pnpm db:migrate-orphaned <orphaned-workspace-id> <target-workspace-id>
 */

import {
  db,
  leads,
  jobs,
  agentLogs,
  swarmRuns,
  scrapeSchedules,
  leadNotes,
} from '@repo/db';
import { sql, eq } from 'drizzle-orm';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Auto-migrate all orphaned data to the only active workspace
    console.log('🔍 Auto-detecting active workspace...\n');

    const activeWorkspaces = await db.execute<{ id: string; email: string; workspace_name: string }>(sql`
      SELECT u.workspace_id as id, u.email, w.name as workspace_name
      FROM users u
      JOIN workspaces w ON w.id = u.workspace_id
      LIMIT 1
    `);

    if (activeWorkspaces.rows.length === 0) {
      console.error('❌ No active workspaces found. Create a user first.');
      process.exit(1);
    }

    const targetWorkspaceId = activeWorkspaces.rows[0].id;
    const email = activeWorkspaces.rows[0].email;
    const workspaceName = activeWorkspaces.rows[0].workspace_name;

    console.log(`✅ Found active workspace for ${email}:`);
    console.log(`   "${workspaceName}" (${targetWorkspaceId})\n`);

    // Find all orphaned workspaces with data
    const orphaned = await db.execute<{ id: string; name: string }>(sql`
      SELECT w.id, w.name
      FROM workspaces w
      LEFT JOIN users u ON u.workspace_id = w.id
      WHERE u.id IS NULL
    `);

    if (orphaned.rows.length === 0) {
      console.log('✅ No orphaned workspaces found.\n');
      return;
    }

    console.log(`📦 Migrating data from ${orphaned.rows.length} orphaned workspaces...\n`);

    for (const ws of orphaned.rows) {
      await migrateWorkspace(ws.id, ws.name, targetWorkspaceId);
    }

    console.log('\n✅ All orphaned data migrated!\n');
  } else if (args.length === 2) {
    // Manual: migrate specific workspace
    const [orphanedId, targetId] = args;
    await migrateWorkspace(orphanedId, 'Orphaned Workspace', targetId);
  } else {
    console.error('Usage:');
    console.error('  pnpm db:migrate-orphaned                              # Auto-migrate all');
    console.error('  pnpm db:migrate-orphaned <orphaned-id> <target-id>   # Manual migrate');
    process.exit(1);
  }
}

async function migrateWorkspace(orphanedId: string, name: string, targetId: string): Promise<void> {
  console.log(`📦 "${name}"`);
  console.log(`   From: ${orphanedId}`);
  console.log(`   To:   ${targetId}`);

  let totalMigrated = 0;

  // Migrate all tables with workspaceId
  const tables = [
    { table: leads, name: 'leads' },
    { table: jobs, name: 'jobs' },
    { table: agentLogs, name: 'agent_logs' },
    { table: swarmRuns, name: 'swarm_runs' },
    { table: scrapeSchedules, name: 'scrape_schedules' },
    { table: leadNotes, name: 'lead_notes' },
  ];

  for (const { table, name } of tables) {
    const result = await db
      .update(table)
      .set({ workspaceId: targetId })
      .where(eq(table.workspaceId, orphanedId));

    const count = result.rowCount || 0;
    if (count > 0) {
      console.log(`   → Migrated ${count} ${name}`);
      totalMigrated += count;
    }
  }

  console.log(`   ✅ Total: ${totalMigrated} records migrated\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
