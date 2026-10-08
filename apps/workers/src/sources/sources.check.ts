/**
 * Run: pnpm --filter workers exec tsx src/sources/sources.check.ts
 * Covers the response parsing of the two HTTP sources — the part that silently
 * returns zero leads when a payload shape or a page layout shifts.
 */
import assert from 'node:assert/strict';
import { toRawLead as apifyLead } from './apify';
import { toRawLead as osmLead } from './osm';
import { cleanName, extractEmails, extractPhone, isListingPage, toRawLead as firecrawlLead } from './firecrawl';

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

// ── OpenStreetMap (Nominatim) ────────────────────────────────────────────────
const osm = osmLead({
  place_id: 1,
  osm_type: 'node',
  osm_id: 42,
  name: 'Toko Kopi Senja',
  display_name: 'Toko Kopi Senja, Jalan Sudirman, Jakarta, Indonesia',
  type: 'fast_food',
  lat: '-6.2',
  lon: '106.8',
  extratags: { 'contact:phone': '+62 21 555 1234; +62 812 0000', email: 'halo@tokokopisenja.id', website: 'https://tokokopisenja.id' },
});
assert.equal(osm.name, 'Toko Kopi Senja');
assert.equal(osm.address, 'Jalan Sudirman, Jakarta, Indonesia');
assert.equal(osm.phone, '+62 21 555 1234');
assert.deepEqual(osm.emails, ['halo@tokokopisenja.id']);
assert.equal(osm.category, 'fast food');
assert.equal(osm.sourceUrl, 'https://www.openstreetmap.org/node/42');
assert.equal(osm.lat, -6.2);
// the shapes that must not throw
assert.equal(osmLead({}).name, '');
assert.equal(osmLead({ extratags: null, lat: 'x' }).lat, null);

// ── Firecrawl listing filter + phone strictness ──────────────────────────────
assert.ok(isListingPage({ url: 'https://www.linkedin.com/pulse/top-5-construction', title: 'Top 5 Construction Leaders in Indonesia' }));
assert.ok(isListingPage({ url: 'https://en.wikipedia.org/wiki/Category:X', title: 'Category:Construction companies of Indonesia' }));
assert.ok(isListingPage({ url: 'https://some-blog.id/x', title: 'Construction companies in Indonesia' }));
assert.ok(!isListingPage({ url: 'https://ptlas.com/', title: 'PT Limas Anugrah Steel: Selamat Datang' }));
assert.equal(cleanName('PT Limas Anugrah Steel: Selamat Datang'), 'PT Limas Anugrah Steel');
assert.equal(extractPhone('Established 2021-07-16, NPWP 01.09-0259664'), null);
assert.equal(extractPhone('Telp: (031) 749 6300'), '(031) 749 6300');
assert.equal(extractPhone('Reach us on +62 31 749 6300 anytime'), '+62 31 749 6300');
