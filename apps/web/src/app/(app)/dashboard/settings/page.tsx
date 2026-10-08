import { BYOK_KEYS, db, decryptSecret, workspaceApiKeys, workspaces } from '@repo/db';
import { eq } from 'drizzle-orm';
import { getWorkspaceId } from '@/lib/get-workspace';
import { BusinessContextForm } from './BusinessContextForm';
import { ApiKeysForm } from './ApiKeysForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const workspaceId = await getWorkspaceId();
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  // Only the last 4 characters ever leave the server.
  const saved = await db
    .select({ name: workspaceApiKeys.name, value: workspaceApiKeys.value })
    .from(workspaceApiKeys)
    .where(eq(workspaceApiKeys.workspaceId, workspaceId));
  const last4 = new Map(
    saved.map((k) => {
      try {
        return [k.name, decryptSecret(k.value).slice(-4)];
      } catch {
        return [k.name, '????']; // undecryptable (SECRETS_KEY changed) — show it so it can be replaced
      }
    }),
  );
  const keyRows = BYOK_KEYS.map((k) => ({ ...k, last4: last4.get(k.name) ?? null }));

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">Manage your workspace configuration.</p>

      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-bold tracking-tight mb-1">Business Context</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Describe your business — products, target market, value proposition, industry, etc.
            This context is used by AI agents to generate more relevant sales analysis and cold emails.
          </p>
          <BusinessContextForm
            workspaceId={workspaceId}
            initialValue={workspace?.businessContext ?? ''}
          />
        </div>

        <div>
          <h2 className="text-sm font-bold tracking-tight mb-1">API keys (bring your own)</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Keys for lead sources, used only for this workspace's scrapes. A key saved here takes
            priority over the server&apos;s; without one the source falls back to the server key, if
            it has one. Keys are encrypted at rest and never shown again — only the last 4 characters.
          </p>
          <ApiKeysForm rows={keyRows} />
        </div>
      </div>
    </div>
  );
}
