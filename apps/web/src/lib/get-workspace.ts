import 'server-only';
import { DEV_WORKSPACE_ID } from './workspace';

/**
 * Single-user mode: workspaceId comes from the WORKSPACE_ID env var.
 * Provisioning the workspace row in the DB is handled by the seed script
 * (`pnpm db:seed`), not here, so this stays side-effect free and safe to call
 * from any server component or route.
 */
export async function getWorkspaceId(): Promise<string> {
  const workspaceId = process.env.WORKSPACE_ID;
  if (workspaceId) return workspaceId;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('WORKSPACE_ID not set');
  }
  return DEV_WORKSPACE_ID;
}
