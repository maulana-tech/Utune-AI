import { runActor } from './apify';
import { isRecord, type LeadSourceFn, type RawLead } from './types';

/**
 * Social posts via Apify actors (no login/cookies needed by any of them). Actor ids
 * and field names checked against each actor's input/dataset schema, 2026-10-08.
 * The actor can be swapped per platform with APIFY_<PLATFORM>_ACTOR.
 *
 * Scraping X and LinkedIn is against their ToS; the runs bill the APIFY_TOKEN owner.
 */
function token(env: Record<string, string | undefined>, platform: string): string {
  if (!env.APIFY_TOKEN) throw new Error(`APIFY_TOKEN is not set — cannot search ${platform} (add it in Settings → API keys)`);
  return env.APIFY_TOKEN;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const date = (v: unknown) => {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// ── Threads: futurizerush/meta-threads-scraper ───────────────────────────────
export const scrapeThreads: LeadSourceFn = async ({ query, limit, env }) => {
  const items = await runActor(token(env, 'Threads'), env.APIFY_THREADS_ACTOR || 'futurizerush/meta-threads-scraper', limit, {
    mode: 'search',
    keywords: [query],
    max_posts: limit,
    search_filter: 'recent',
    start_date: '1 month',
  });
  return items.filter((i) => i.record_type !== 'profile').map((i) => threadsLead(i, query)).filter((l) => l.name).slice(0, limit);
};

export function threadsLead(i: Record<string, unknown>, query: string): RawLead {
  const username = str(i.username);
  return {
    name: username ? (str(i.display_name) ? `${str(i.display_name)} (@${username})` : `@${username}`) : '',
    category: query,
    website: str(i.profile_url) ?? (username ? `https://www.threads.com/@${username}` : null),
    sourceUrl: str(i.post_url),
    postText: str(i.text_content),
    postedAt: date(i.created_at),
  };
}

// ── LinkedIn posts: harvestapi/linkedin-post-search ──────────────────────────
export const scrapeLinkedin: LeadSourceFn = async ({ query, limit, env }) => {
  const items = await runActor(token(env, 'LinkedIn'), env.APIFY_LINKEDIN_ACTOR || 'harvestapi/linkedin-post-search', limit, {
    searchQueries: [query],
    maxPosts: limit,
    sortBy: 'date',
    postedLimit: 'month',
  });
  return items.map((i) => linkedinLead(i, query)).filter((l) => l.name).slice(0, limit);
};

export function linkedinLead(i: Record<string, unknown>, query: string): RawLead {
  const author = isRecord(i.author) ? i.author : {};
  const posted = isRecord(i.postedAt) ? i.postedAt : {};
  const name = str(author.name);
  const headline = str(author.info);
  return {
    // "Rina Wijaya — Head of Ops at PT X": the headline is what tells you if they can buy.
    name: name ? (headline ? `${name} — ${headline}`.slice(0, 200) : name) : '',
    category: query,
    website: str(author.linkedinUrl),
    sourceUrl: str(i.linkedinUrl),
    postText: str(i.content),
    postedAt: date(posted.date ?? posted.timestamp),
  };
}

// ── X: apidojo/tweet-scraper ─────────────────────────────────────────────────
export const scrapeTwitter: LeadSourceFn = async ({ query, limit, env }) => {
  const items = await runActor(token(env, 'X'), env.APIFY_TWITTER_ACTOR || 'apidojo/tweet-scraper', limit, {
    searchTerms: [`${query} -filter:retweets`],
    maxItems: limit,
    sort: 'Latest',
  });
  return items.map((i) => tweetLead(i, query)).filter((l) => l.name).slice(0, limit);
};

export function tweetLead(i: Record<string, unknown>, query: string): RawLead {
  const author = isRecord(i.author) ? i.author : {};
  const handle = str(author.userName);
  return {
    name: handle ? (str(author.name) ? `${str(author.name)} (@${handle})` : `@${handle}`) : '',
    category: query,
    website: str(author.url) ?? (handle ? `https://x.com/${handle}` : null),
    sourceUrl: str(i.url) ?? str(i.twitterUrl),
    postText: str(i.text),
    postedAt: date(i.createdAt), // "Fri Nov 24 17:49:36 +0000 2023" parses natively
  };
}
