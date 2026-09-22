import { pgTable, text, timestamp, uuid, jsonb, integer } from 'drizzle-orm/pg-core';
import { leads } from './leads';
import { workspaces } from './workspaces';

export const agentLogs = pgTable('agent_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  leadId: uuid('lead_id').references(() => leads.id), // nullable for workspace-level strategy agent

  // Agent identification
  agentName: text('agent_name').notNull(), // extractor, finance, marketing, strategy
  agentRole: text('agent_role').notNull(), // describe the agent's purpose

  // Execution context
  executionId: uuid('execution_id').notNull(), // groups all agents in one workflow run
  stepNumber: integer('step_number').notNull(), // sequence in orchestration (1, 2, 3, 4)

  // Input/Output
  input: jsonb('input').notNull(), // what the agent received
  output: jsonb('output').notNull(), // what the agent produced

  // Reasoning transparency
  reasoning: text('reasoning').notNull(), // explicit reasoning chain (chain-of-thought)
  confidence: integer('confidence'), // 0-100 confidence score

  // Context passing
  contextFromPreviousAgent: jsonb('context_from_previous_agent'), // what was shared from prior step
  contextSharedToNextAgent: jsonb('context_shared_to_next_agent'), // what this agent shares forward

  // Metrics
  durationMs: integer('duration_ms'), // execution time
  tokensUsed: integer('tokens_used'), // LLM token consumption

  // Swarm observability
  handoffFrom: text('handoff_from'), // which agent handed off to this one
  parallelGroup: text('parallel_group'), // set for agents run in parallel fan-out

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
