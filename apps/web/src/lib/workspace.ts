export const DEV_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Browser code calls the API through the web app's own proxy (app/api/backend),
 * which checks the Supabase session, pins workspaceId to the user's workspace and
 * adds API_SECRET. Never point the browser at the API directly.
 */
export function apiUrl(): string {
  return '/api/backend';
}
