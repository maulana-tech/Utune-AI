/**
 * Run: pnpm --filter workers exec tsx src/sources/social.check.ts
 * Parsing of the social-post sources + the `social` fan-out.
 */
import assert from 'node:assert/strict';
import { runAll } from './auto';
import { buyerQueries, coreNeed } from './intent';
import { extractPosts, toRawLead as redditLead } from './reddit';
import { linkedinLead, threadsLead, tweetLead } from './social-apify';

// ── Reddit (Composio returns Reddit's raw Listing) ───────────────────────────
const listing = {
  search_results: {
    data: {
      children: [
        { kind: 't3', data: { author: 'budi', title: 'Butuh jasa bikin aplikasi kasir', selftext: 'Budget 20jt, Jakarta', permalink: '/r/indonesia/comments/abc/x/', subreddit: 'indonesia', created_utc: 1759900000 } },
        { kind: 't1', data: { author: 'commenter', body: 'a comment' } }, // comments are skipped
        { kind: 't3', data: { author: '[deleted]', title: 'gone' } },
      ],
    },
  },
};
const posts = extractPosts(listing);
assert.equal(posts.length, 2);
const r = redditLead(posts[0], 'butuh jasa bikin aplikasi');
assert.equal(r.name, 'u/budi');
assert.equal(r.sourceUrl, 'https://www.reddit.com/r/indonesia/comments/abc/x/');
assert.equal(r.website, 'https://www.reddit.com/user/budi');
assert.equal(r.postText, 'Butuh jasa bikin aplikasi kasir\n\nBudget 20jt, Jakarta');
assert.equal(r.postedAt?.toISOString(), new Date(1759900000 * 1000).toISOString());
assert.equal(redditLead(posts[1], 'q').name, ''); // deleted author → dropped by the source
assert.deepEqual(extractPosts({}), []);
// the shape Composio actually returns today
assert.equal(extractPosts({ posts: [{ author: 'x', title: 't' }], total_results: 1 }).length, 1);

// ── Apify actors (field names from each actor's dataset schema) ─────────────
const tw = tweetLead({ text: 'anyone know a dev who can build an app?', url: 'https://x.com/sari_id/status/111', createdAt: 'Tue Oct 07 10:00:00 +0000 2026', author: { name: 'Sari', userName: 'sari_id', url: 'https://x.com/sari_id' } }, 'build an app');
assert.deepEqual([tw.name, tw.sourceUrl, tw.website], ['Sari (@sari_id)', 'https://x.com/sari_id/status/111', 'https://x.com/sari_id']);
assert.equal(tw.postedAt?.toISOString(), '2026-10-07T10:00:00.000Z');
const th = threadsLead({ username: 'dina.dev', display_name: 'Dina', text_content: 'butuh jasa bikin app', post_url: 'https://www.threads.com/@dina.dev/post/x', created_at: '2026-10-06T08:00:00Z' }, 'q');
assert.deepEqual([th.name, th.website, th.postText], ['Dina (@dina.dev)', 'https://www.threads.com/@dina.dev', 'butuh jasa bikin app']);
const li = linkedinLead({ content: 'We are looking for a vendor to build our mobile app', linkedinUrl: 'https://www.linkedin.com/posts/x', author: { name: 'Rina Wijaya', info: 'Head of Ops at PT Maju', linkedinUrl: 'https://www.linkedin.com/in/rina' }, postedAt: { date: '2026-10-05T00:00:00Z' } }, 'q');
assert.deepEqual([li.name, li.website, li.sourceUrl], ['Rina Wijaya — Head of Ops at PT Maju', 'https://www.linkedin.com/in/rina', 'https://www.linkedin.com/posts/x']);
for (const parse of [tweetLead, threadsLead, linkedinLead]) assert.equal(parse({}, 'q').name, '');

// ── buyer phrasings ──────────────────────────────────────────────────────────
assert.equal(coreNeed('Butuh jasa bikin aplikasi'), 'jasa bikin aplikasi');
assert.equal(coreNeed('looking for app developer'), 'app developer');
assert.deepEqual(buyerQueries('butuh jasa bikin aplikasi'), ['butuh jasa bikin aplikasi', 'cari jasa bikin aplikasi', 'rekomendasi jasa bikin aplikasi', 'ada yang bisa jasa bikin aplikasi']);
assert.deepEqual(buyerQueries('mobile app developer').slice(1, 3), ['looking for mobile app developer', 'need mobile app developer']);

// ── social fan-out ───────────────────────────────────────────────────────────
async function checkSocial() {
  const req = { query: 'x', limit: 4, workspaceId: 'w', env: { KEY: 'k' } };
  const post = (src: string, i: number) => ({ name: `${src}${i}`, sourceUrl: `https://${src}/${i}` });
  const sources = {
    a: async ({ limit }: { limit: number }) => Array.from({ length: limit }, (_, i) => post('a', i)),
    b: async () => [post('b', 0), post('a', 0)], // second one duplicates a's first post
    down: async () => { throw new Error('boom'); },
  };
  const steps = [{ source: 'a', env: ['KEY'] }, { source: 'b', env: ['KEY'] }, { source: 'down', env: ['KEY'] }, { source: 'nokey', env: ['MISSING'] }];
  const out = await runAll(steps, sources, req, req.env);
  // limit 4 split over 3 ready platforms → 2 each; round-robin a,b,a ; dup + failure ignored
  assert.deepEqual(out.map((l) => [l.name, l.source]), [['a0', 'a'], ['b0', 'b'], ['a1', 'a']]);
  await assert.rejects(runAll([{ source: 'down', env: [] }], sources, req, {}), /every platform failed — down: boom/);
  await assert.rejects(runAll([{ source: 'nokey', env: ['MISSING'] }], sources, req, {}), /no platform is configured/);
}

checkSocial().then(() => console.log('all ok'));
