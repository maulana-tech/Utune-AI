/**
 * Run: pnpm --filter workers exec tsx src/sources/sources.check.ts
 * Covers the response parsing of the two HTTP sources — the part that silently
 * returns zero leads when a payload shape or a page layout shifts.
 */
import assert from 'node:assert/strict';
import { toRawLead as apifyLead } from './apify';
import { cleanName, extractEmails, extractPhone, toRawLead as firecrawlLead } from './firecrawl';

// ── Apify ────────────────────────────────────────────────────────────────────
const maps = apifyLead({
  title: 'Toko Kopi Senja',
  address: 'Jl. Sudirman 12, Jakarta, Indonesia',
  phone: '+62 21 555 1234',
  website: 'https://tokokopisenja.id',
  categoryName: 'Coffee shop',
  url: 'https://maps.google.com/?cid=123',
  emails: ['halo@tokokopisenja.id'],
  location: { lat: -6.2, lng: 106.8 },
});
assert.equal(maps.name, 'Toko Kopi Senja');
assert.equal(maps.website, 'https://tokokopisenja.id');
assert.equal(maps.category, 'Coffee shop');
assert.equal(maps.sourceUrl, 'https://maps.google.com/?cid=123');
assert.deepEqual(maps.emails, ['halo@tokokopisenja.id']);

// a different actor, different field names — must still map
const other = apifyLead({ name: 'Acme Ltd', fullAddress: 'Berlin', category: 'software' });
assert.equal(other.name, 'Acme Ltd');
assert.equal(other.address, 'Berlin');
assert.equal(other.category, 'software');

// the shapes that must not throw
assert.equal(apifyLead({}).name, '');
assert.deepEqual(apifyLead({ emails: 'nope' }).emails, []);
// `url` is the Maps link, never the business website
assert.equal(apifyLead({ url: 'https://maps.google.com/x' }).website, null);

// ── Firecrawl ────────────────────────────────────────────────────────────────
assert.equal(cleanName('Contact Us | Toko Kopi Senja'), 'Toko Kopi Senja');
assert.equal(cleanName('Acme Ltd - Home'), 'Acme Ltd');
assert.equal(cleanName('Acme Ltd'), 'Acme Ltd');

const page = `
# Toko Kopi Senja
Email us at [halo@tokokopisenja.id](mailto:halo@tokokopisenja.id) or ops@tokokopisenja.id
Tracked by bugs@sentry.io — ![logo](https://cdn.x/logo.png)
Call [+62 21 555 1234](tel:+62 21 555 1234). Open since 2019.
`;
assert.deepEqual(extractEmails(page), ['halo@tokokopisenja.id', 'ops@tokokopisenja.id']);
assert.equal(extractPhone(page), '+62 21 555 1234');
// a bare year must not read as a phone number
assert.equal(extractPhone('Founded in 2019, 40 seats.'), null);

const fc = firecrawlLead(
  { title: 'Kontak | Toko Kopi Senja', url: 'https://tokokopisenja.id/kontak', markdown: page },
  'coffee shop jakarta',
);
assert.equal(fc.name, 'Toko Kopi Senja');
assert.equal(fc.website, 'https://tokokopisenja.id/kontak');
assert.equal(fc.category, 'coffee shop jakarta');
assert.equal(fc.address, null);

console.log('all ok');
