/**
 * Composio tool calls for the sources that go through it (Apollo, Reddit, X).
 * Each needs that toolkit connected in the Composio project the key belongs to.
 */
export async function composioExecute(
  env: Record<string, string | undefined>,
  workspaceId: string,
  toolkit: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const apiKey = env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error(`COMPOSIO_API_KEY is not set — cannot use ${toolkit} (add it in Settings → API keys)`);

  // @composio/core is ESM-only and this app compiles to CommonJS, so it has to be
  // imported dynamically. Bonus: workers that never call Composio never load it.
  const { Composio } = await import('@composio/core');
  const composio = new Composio({ apiKey });
  const userId = env.COMPOSIO_USER_ID || (await connectedUserId(apiKey, toolkit, workspaceId));

  let result: { successful: boolean; error?: unknown; data?: unknown };
  try {
    result = await composio.tools.execute(tool, { userId, arguments: args, dangerouslySkipVersionCheck: true });
  } catch (err) {
    // The SDK hides the provider's message in `cause`; surface it.
    const cause = (err as { cause?: { error?: { error?: { message?: string } } } }).cause;
    throw new Error(`${toolkit}: ${cause?.error?.error?.message ?? (err instanceof Error ? err.message : String(err))}`);
  }
  if (!result.successful) throw new Error(`${toolkit}: ${String(result.error ?? 'unknown error')}`);
  return result.data;
}

/**
 * The Composio user that owns an active connection for `toolkit`. Connections made
 * in the Composio dashboard/playground get ids like "pg-test-…", not our workspace
 * id, so look it up: this workspace's own connection if there is one, else the
 * first active one in the project.
 */
async function connectedUserId(apiKey: string, toolkit: string, workspaceId: string): Promise<string> {
  const res = await fetch(
    `https://backend.composio.dev/api/v3/connected_accounts?toolkit_slugs=${toolkit}&statuses=ACTIVE`,
    { headers: { 'x-api-key': apiKey } },
  );
  if (!res.ok) throw new Error(`Composio connected accounts lookup failed (${res.status})`);
  const body = (await res.json()) as { items?: { user_id?: string }[] };
  const users = (body.items ?? []).map((a) => a.user_id).filter((u): u is string => !!u);
  if (!users.length) throw new Error(`No active ${toolkit} connection in Composio — connect it at app.composio.dev`);
  return users.includes(workspaceId) ? workspaceId : users[0];
}
