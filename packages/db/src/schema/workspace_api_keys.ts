import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

/**
 * BYOK — a workspace's own keys for lead sources (see BYOK_KEYS in ../secrets.ts).
 * Separate table, not a column on `workspaces`, so no workspace query can leak them.
 * `value` is AES-256-GCM ciphertext; never select it into anything a client sees.
 */
export const workspaceApiKeys = pgTable(
  'workspace_api_keys',
  {
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
    name: text('name').notNull(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.name] })],
);
