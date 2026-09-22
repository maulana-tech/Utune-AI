import { pgTable, text, timestamp, uuid, jsonb, doublePrecision } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  // sourceJobId will be added after running: pnpm db:generate && pnpm db:migrate
  /** Which lead source produced this row: 'places', 'apollo', ... */
  source: text('source').notNull().default('places'),
  name: text('name').notNull(),
  address: text('address'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  phone: text('phone'),
  website: text('website'),
  category: text('category'),
  emails: jsonb('emails').$type<string[]>(),
  whatsapp: jsonb('whatsapp').$type<string[]>(),
  mapsUrl: text('maps_url'),
  pipelineStage: text('pipeline_stage').default('Prospecting'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
