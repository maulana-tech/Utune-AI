import type { LeadSourceFn, RawLead, ScrapeRequest } from './types';

/** A source in the fallback chain and the env vars it needs ([] = keyless). */
export interface ChainStep {
  source: string;
  env: string[];
  /** Only try this step for matching requests (e.g. B2B-only sources). */
  when?: (req: ScrapeRequest) => boolean;
}

/**
 * Try each configured source in order and keep collecting until `req.limit` leads:
 * one source rarely has enough (Wikidata knows ~20 Indonesian contractors), so the
 * next ones fill the gap. Skips sources whose keys aren't set, moves on when one
 * throws or finds nothing, drops duplicates across sources. Each lead is tagged
 * with the source that actually produced it.
 */
export async function runChain(
  chain: ChainStep[],
  sources: Record<string, LeadSourceFn>,
  req: ScrapeRequest,
  env: Record<string, string | undefined>,
): Promise<RawLead[]> {
  const collected: RawLead[] = [];
  const seen = new Set<string>();
  const tried: string[] = [];
  for (const step of chain) {
    if (collected.length >= req.limit) break;
    const missing = step.env.filter((k) => !env[k]);
    if (missing.length || (step.when && !step.when(req))) continue;
    try {
      // Ask each source only for what's still missing — paid sources bill per result.
      const leads = await sources[step.source]({ ...req, limit: req.limit - collected.length });
      let added = 0;
      for (const lead of leads) {
        const keys = dedupeKeys(lead);
        if (!keys.length || keys.some((k) => seen.has(k))) continue;
        keys.forEach((k) => seen.add(k));
        collected.push({ ...lead, source: lead.source ?? step.source });
        added++;
      }
      tried.push(`${step.source}: ${added} new`);
    } catch (err) {
      tried.push(`${step.source}: ${err instanceof Error ? err.message : String(err)}`);
    }
    console.log(`[Scrape] auto: ${tried[tried.length - 1]} (${collected.length}/${req.limit})`);
  }
  if (collected.length) return collected.slice(0, req.limit);
  if (tried.length === 0) throw new Error('auto: no lead source is configured');
  // Every source came back empty → a real "nothing found", not a failure.
  if (tried.every((t) => t.endsWith(': 0 new'))) return [];
  throw new Error(`auto: every source failed — ${tried.join(' | ').slice(0, 1500)}`);
}

/** Same company from two sources: "PT Wijaya Karya (Persero) Tbk" ≈ "Wijaya Karya", or same website. */
export function dedupeKeys(lead: RawLead): string[] {
  const name = lead.name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(pt|cv|tbk|persero|ltd|inc|llc|co|corp|company|limited)\b\.?/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const keys = name ? [`name:${name}`] : [];
  if (lead.website) {
    try {
      keys.push(`host:${new URL(lead.website).hostname.replace(/^www\./, '')}`);
    } catch {
      // not a URL — name key only
    }
  }
  return keys;
}

/**
 * Run every configured step at once and interleave the results — for social
 * listening you want posts from each platform, not "Reddit until full". The
 * limit is split evenly; duplicates (same post link) are dropped.
 */
export async function runAll(
  steps: ChainStep[],
  sources: Record<string, LeadSourceFn>,
  req: ScrapeRequest,
  env: Record<string, string | undefined>,
): Promise<RawLead[]> {
  const ready = steps.filter((s) => s.env.every((k) => env[k]) && (!s.when || s.when(req)));
  if (!ready.length) throw new Error('social: no platform is configured (needs COMPOSIO_API_KEY and/or APIFY_TOKEN)');

  const share = Math.ceil(req.limit / ready.length);
  const settled = await Promise.allSettled(ready.map((s) => sources[s.source]({ ...req, limit: share })));
  const perSource = settled.map((r, i) => {
    const name = ready[i].source;
    if (r.status === 'rejected') {
      console.log(`[Scrape] social: ${name} failed — ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
      return [];
    }
    console.log(`[Scrape] social: ${name} returned ${r.value.length}`);
    return r.value.map((l) => ({ ...l, source: l.source ?? name }));
  });
  if (settled.every((r) => r.status === 'rejected')) {
    const reasons = settled.map((r, i) => `${ready[i].source}: ${r.status === 'rejected' ? String(r.reason instanceof Error ? r.reason.message : r.reason) : ''}`);
    throw new Error(`social: every platform failed — ${reasons.join(' | ').slice(0, 1500)}`);
  }

  // Round-robin so each platform is represented even when the limit is small.
  const out: RawLead[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < req.limit && perSource.some((p) => i < p.length); i++) {
    for (const p of perSource) {
      const lead = p[i];
      const key = lead?.sourceUrl ?? lead?.name;
      if (!lead || !key || seen.has(key)) continue;
      seen.add(key);
      out.push(lead);
      if (out.length >= req.limit) break;
    }
  }
  return out;
}
