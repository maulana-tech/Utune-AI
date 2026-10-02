import type { LeadSourceFn, RawLead, ScrapeRequest } from './types';

/** A source in the fallback chain and the env vars it needs ([] = keyless). */
export interface ChainStep {
  source: string;
  env: string[];
  /** Only try this step for matching requests (e.g. B2B-only sources). */
  when?: (req: ScrapeRequest) => boolean;
}

/**
 * Try each configured source in order; the first one that returns leads wins.
 * Skips sources whose keys aren't set, moves on when one throws or finds nothing.
 * Each lead is tagged with the source that actually produced it.
 */
export async function runChain(
  chain: ChainStep[],
  sources: Record<string, LeadSourceFn>,
  req: ScrapeRequest,
  env: Record<string, string | undefined> = process.env,
): Promise<RawLead[]> {
  const tried: string[] = [];
  for (const step of chain) {
    const missing = step.env.filter((k) => !env[k]);
    if (missing.length || (step.when && !step.when(req))) continue;
    try {
      const leads = await sources[step.source](req);
      if (leads.length) {
        console.log(`[Scrape] auto: ${step.source} returned ${leads.length} leads`);
        return leads.map((l) => ({ ...l, source: l.source ?? step.source }));
      }
      tried.push(`${step.source}: 0 results`);
    } catch (err) {
      tried.push(`${step.source}: ${err instanceof Error ? err.message : String(err)}`);
    }
    console.log(`[Scrape] auto: ${tried[tried.length - 1]} — trying next source`);
  }
  if (tried.length === 0) throw new Error('auto: no lead source is configured');
  // Every source came back empty → a real "nothing found", not a failure.
  if (tried.every((t) => t.endsWith(': 0 results'))) return [];
  throw new Error(`auto: every source failed — ${tried.join(' | ').slice(0, 1500)}`);
}
