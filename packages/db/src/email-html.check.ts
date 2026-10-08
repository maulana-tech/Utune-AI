/** Run: pnpm --filter @repo/db exec tsx src/email-html.check.ts */
import assert from 'node:assert/strict';
import { parseBlocks, plainTextFromMarkup, renderEmailHtml, resolveCta } from './email-html';

const body = `::Perkenalan
# Bisnis Anda tumbuh. _Sistemnya_ juga.

Yth. Tim PT <Maju>,
baris kedua

- satu
- dua

---

- tiga

[Jadwalkan diskusi]({{cta_url}})`;

const brand = { name: 'Using', url: 'https://site-using.vercel.app', ctaUrl: 'https://cal.com/using' };

// {{cta_url}} becomes a button once resolved (renderEmailHtml resolves first)
assert.deepEqual(
  parseBlocks(resolveCta(body, brand)).map((b) => b.kind),
  ['label', 'heading', 'para', 'item', 'item', 'rule', 'item', 'cta'],
);
const html = renderEmailHtml(body, brand, 'Subjek');
assert.ok(html.includes('<em style="font-style:italic;">Sistemnya</em>'));
assert.ok(html.includes('PT &lt;Maju&gt;'), 'user text is escaped');
assert.ok(html.includes('href="https://cal.com/using"'), 'cta_url filled from brand');
assert.ok(html.includes('Using<span style="color:#E4572E;">.</span>'), 'wordmark with accent dot');
assert.ok(!/<svg|<script/i.test(html));

// each list restarts at 01
const text = plainTextFromMarkup(body, brand);
assert.ok(text.includes('01  satu') && text.includes('02  dua') && text.includes('01  tiga'));
assert.ok(text.includes('Jadwalkan diskusi: https://cal.com/using'));
assert.ok(!text.includes('::') && !text.includes('# '));

// no link configured → the button line is dropped, not sent broken
assert.ok(!resolveCta('[Go]({{cta_url}})\nhalo', { name: 'X' }).includes('Go'));
assert.equal(resolveCta('[Go]({{cta_url}})', { name: 'X', url: 'https://x.id' }), '[Go](https://x.id)');

console.log('all ok');
