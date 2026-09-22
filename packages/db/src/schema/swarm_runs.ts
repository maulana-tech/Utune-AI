import { pgTable, text, timestamp, uuid, integer, pgEnum } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { leads } from './leads';

export const swarmRunStatusEnum = pgEnum('swarm_run_status', [
  'completed',
  'failed',
  'max_iterations',
]);

export const swarmRuns = pgTable('swarm_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  executionId: uuid('execution_id').notNull(),
  workflowName: text('workflow_name').notNull(),
  entryAgent: text('entry_agent').notNull(),
  leadId: uuid('lead_id').references(() => leads.id),
  totalSteps: integer('total_steps').notNull(),
  totalDurationMs: integer('total_duration_ms').notNull(),
  totalTokensUsed: integer('total_tokens_used').notNull(),
  status: swarmRunStatusEnum('status').notNull().default('completed'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SwarmRun = typeof swarmRuns.$inferSelect;
export type NewSwarmRun = typeof swarmRuns.$inferInsert;
