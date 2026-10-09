/**
 * Turn on Row Level Security for every table in `public`.
 *
 * The app reads the database through DATABASE_URL as the `postgres` role, which
 * bypasses RLS, and never through Supabase's Data API. But the anon key is public
 * (NEXT_PUBLIC_SUPABASE_ANON_KEY), and without RLS anyone holding it could read and
 * write every table through https://<project>.supabase.co/rest/v1. RLS on with no
 * policies = the Data API sees nothing, the app is unaffected.
 *
 * Run after every schema push (CI and deploy/setup-vps.sh do): pnpm --filter @repo/db rls
 */
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public' and not rowsecurity`,
    );
    for (const { tablename } of rows) {
      await pool.query(`alter table public.${JSON.stringify(tablename)} enable row level security`);
    }
    console.log(rows.length ? `RLS enabled on: ${rows.map((r) => r.tablename).join(', ')}` : 'RLS already on for every public table');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
