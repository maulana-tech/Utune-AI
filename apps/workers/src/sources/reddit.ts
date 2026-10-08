import { composioExecute } from './composio';
import { isRecord, type LeadSourceFn, type RawLead } from './types';

/**
 * Reddit posts matching a need ("looking for app developer"), newest first, via
 * Composio's REDDIT_SEARCH_ACROSS_SUBREDDITS. A lead is the post's author; the
 * post itself is kept as `postText`, the post link as the source link.
 *
 * Needs: COMPOSIO_API_KEY + a Reddit account connected in that Composio project.
 * (Reddit's keyless .json endpoints now answer 403.)
 */
export const scrapeReddit: LeadSourceFn = async ({ query, limit, workspaceId, env }) => {
  const data = await composioExecute(env, workspaceId, 'reddit', 'REDDIT_SEARCH_ACROSS_SUBREDDITS', {
    search_query: query,
    sort: 'new',
    limit: Math.min(limit, 100),
    restrict_sr: false,
  });
  return extractPosts(data).map((p) => toRawLead(p, query)).filter((l) => l.name).slice(0, limit);
};

/** data.search_results is Reddit's raw Listing: { data: { children: [{ kind, data }] } }. */
export function extractPosts(data: unknown): Record<string, unknown>[] {
  const results = isRecord(data) ? data.search_results : undefined;
  const listing = isRecord(results) && isRecord(results.data) ? results.data : undefined;
  const children = listing && Array.isArray(listing.children) ? listing.children : [];
  return children
    .filter(isRecord)
    .filter((c) => c.kind === 't3' && isRecord(c.data)) // t3 = post
    .map((c) => c.data as Record<string, unknown>);
}

export function toRawLead(post: Record<string, unknown>, query: string): RawLead {
  const author = typeof post.author === 'string' && post.author !== '[deleted]' ? post.author : '';
  const title = typeof post.title === 'string' ? post.title : '';
  const body = typeof post.selftext === 'string' ? post.selftext : '';
  const created = typeof post.created_utc === 'number' ? new Date(post.created_utc * 1000) : null;
  return {
    name: author ? `u/${author}` : '',
    category: query,
    website: author ? `https://www.reddit.com/user/${author}` : null,
    sourceUrl: typeof post.permalink === 'string' ? `https://www.reddit.com${post.permalink}` : null,
    address: typeof post.subreddit === 'string' ? `r/${post.subreddit}` : null,
    postText: [title, body].filter(Boolean).join('\n\n').slice(0, 4000) || null,
    postedAt: created,
  };
}
