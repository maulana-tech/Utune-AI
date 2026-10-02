/**
 * Run: pnpm --filter workers exec tsx src/sources/chain.check.ts
 * Response parsing of the POI sources + the `auto` fallback chain. Fixtures follow
 * each provider's documented response shape (verified 2026-10).
 */
import assert from 'node:assert/strict';
import { runChain } from './auto';
import { splitQuery } from './types';
import { buildQuery, toRawLead as overpassLead } from './overpass';
import { toRawLead as foursquareLead } from './foursquare';
import { toRawLead as hereLead } from './here';
import { toRawLead as tomtomLead } from './tomtom';
import { toRawLead as serpLead } from './serpapi';
import { toRawLead as outscraperLead } from './outscraper';
import { toRawLead as yelpLead } from './yelp';
import { buildSparql, toRawLeads as wikidataLeads } from './wikidata';
import { industryOf } from './industries';
import { mergeContacts } from './enrich';

// ── query split ──────────────────────────────────────────────────────────────
assert.deepEqual(splitQuery('dentist in bali'), { what: 'dentist', where: 'bali' });
assert.deepEqual(splitQuery('kopi di Jakarta Selatan'), { what: 'kopi', where: 'Jakarta Selatan' });
assert.deepEqual(splitQuery('coffee shop jakarta'), { what: 'coffee shop jakarta', where: '' });

// ── Overpass ─────────────────────────────────────────────────────────────────
const q = buildQuery('car repairs', [1, 2, 3, 4], 10, 'tag');
assert.ok(q.includes('nwr["name"]["shop"="car_repair"](1,2,3,4);'));
assert.ok(q.endsWith('out center tags 10;'));
assert.ok(buildQuery('a"b.c', [1, 2, 3, 4], 5, 'name').includes('"a\\"b\\.c",i'));
const way = overpassLead({
  type: 'way', id: 7, center: { lat: -8.6, lon: 115.2 },
  tags: { name: 'Bali Dental', amenity: 'dentist', 'contact:phone': '+62 361 1; +62 361 2', 'addr:street': 'Jl. Diponegoro', 'addr:housenumber': '150', 'addr:city': 'Denpasar' },
});
assert.equal(way.name, 'Bali Dental');
assert.equal(way.phone, '+62 361 1');
assert.equal(way.address, '150 Jl. Diponegoro, Denpasar');
assert.equal(way.lat, -8.6);
assert.equal(way.sourceUrl, 'https://www.openstreetmap.org/way/7');
assert.equal(overpassLead({ type: 'node', id: 1, lat: 1, lon: 2, tags: {} }).lng, 2);

// ── Foursquare ───────────────────────────────────────────────────────────────
const fsq = foursquareLead({
  fsq_place_id: 'abc', name: 'Kopi Senja', latitude: -6.2, longitude: 106.8, tel: '021 555',
  website: 'https://kopi.id', email: 'hi@kopi.id', location: { formatted_address: 'Jl. A, Jakarta' }, categories: [{ name: 'Café' }],
});
assert.deepEqual([fsq.name, fsq.address, fsq.category, fsq.lat], ['Kopi Senja', 'Jl. A, Jakarta', 'Café', -6.2]);
assert.deepEqual(fsq.emails, ['hi@kopi.id']);

// ── HERE ─────────────────────────────────────────────────────────────────────
const here = hereLead({
  title: 'Bali Dental', address: { label: 'Jl. B, Denpasar' }, position: { lat: -8.6, lng: 115.2 },
  categories: [{ name: 'Clinic' }, { name: 'Dentist', primary: true }],
  contacts: [{ phone: [{ value: '+62 361' }], www: [{ value: 'https://dent.id' }], email: [{ value: 'a@dent.id' }] }],
});
assert.deepEqual([here.name, here.phone, here.website, here.category, here.lng], ['Bali Dental', '+62 361', 'https://dent.id', 'Dentist', 115.2]);
assert.deepEqual(here.emails, ['a@dent.id']);

// ── TomTom ───────────────────────────────────────────────────────────────────
const tt = tomtomLead({
  poi: { name: 'Dent', phone: '+62 1', url: 'www.dent.id', categories: ['dentist'] },
  address: { freeformAddress: 'Denpasar' }, position: { lat: 1, lon: 2 },
});
assert.deepEqual([tt.website, tt.category, tt.lng], ['https://www.dent.id', 'dentist', 2]);

// ── SerpApi ──────────────────────────────────────────────────────────────────
const serp = serpLead({ title: 'Dent', address: 'Denpasar', phone: '+62', website: 'https://d.id', type: 'Dentist', place_id: 'P1', gps_coordinates: { latitude: 1, longitude: 2 } });
assert.deepEqual([serp.name, serp.category, serp.sourceUrl, serp.lat], ['Dent', 'Dentist', 'https://www.google.com/maps/place/?q=place_id:P1', 1]);

// ── Outscraper ───────────────────────────────────────────────────────────────
const out = outscraperLead({ name: 'Dent', full_address: 'Denpasar', phone: '+62', site: 'https://d.id', category: 'Dentist', latitude: 1, longitude: 2, email_1: 'a@d.id', location_link: 'https://maps/x' });
assert.deepEqual([out.website, out.address, out.sourceUrl], ['https://d.id', 'Denpasar', 'https://maps/x']);
assert.deepEqual(out.emails, ['a@d.id']);

// ── Yelp ─────────────────────────────────────────────────────────────────────
const yelp = yelpLead({ name: 'Dent', phone: '+44 20', url: 'https://yelp.com/biz/dent', location: { display_address: ['1 High St', 'London'] }, categories: [{ title: 'Dentists' }], coordinates: { latitude: 51.5, longitude: -0.1 } });
assert.deepEqual([yelp.address, yelp.category, yelp.website, yelp.sourceUrl], ['1 High St, London', 'Dentists', null, 'https://yelp.com/biz/dent']);

// every parser survives an empty object
for (const parse of [overpassLead, foursquareLead, hereLead, tomtomLead, serpLead, outscraperLead, yelpLead]) {
  assert.equal(parse({}).name, '');
}

// ── B2B industries ───────────────────────────────────────────────────────────
assert.equal(industryOf('kontraktor jalan')?.name, 'construction');
assert.equal(industryOf('Gas')?.name, 'oil and gas');
assert.equal(industryOf('palm oil')?.name, 'agriculture'); // longest alias beats "oil"
assert.equal(industryOf('FMCG brands')?.name, 'consumer brands');
assert.equal(industryOf('cafe'), undefined);
assert.equal(industryOf('gasket'), undefined); // whole words only
assert.ok(buildQuery('kontraktor', [1, 2, 3, 4], 5, 'tag').includes('nwr["name"]["craft"="builder"](1,2,3,4);'));

// ── Wikidata ─────────────────────────────────────────────────────────────────
const sparql = buildSparql(['Q385378', 'Q1'], 'ID', 10);
assert.ok(sparql.includes('VALUES ?industry { wd:Q385378 wd:Q1 }'));
assert.ok(sparql.includes('?country wdt:P297 "ID"'));
assert.ok(sparql.endsWith('LIMIT 30'));
assert.ok(!buildSparql(['Q1'], undefined, 5).includes('P297'));
const cell = (value: string) => ({ value });
const wd = wikidataLeads([
  { c: cell('http://www.wikidata.org/entity/Q1'), cLabel: cell('Wijaya Karya'), website: cell('http://www.wika.co.id'), coord: cell('Point(106.8 -6.2)'), industryLabel: cell('construction'), hqLabel: cell('Jakarta') },
  { c: cell('http://www.wikidata.org/entity/Q1'), cLabel: cell('Wijaya Karya'), website: cell('https://wika.co.id/en') }, // same company, 2nd website
  { c: cell('http://www.wikidata.org/entity/Q2'), cLabel: cell('Q2') }, // unlabelled
]);
assert.equal(wd.length, 1);
assert.deepEqual([wd[0].name, wd[0].website, wd[0].address, wd[0].lat, wd[0].lng], ['Wijaya Karya', 'http://www.wika.co.id', 'Jakarta', -6.2, 106.8]);

// ── auto chain ───────────────────────────────────────────────────────────────
async function checkChain() {
const req = { query: 'x', limit: 5, workspaceId: 'w' };
const calls: string[] = [];
const fake = (name: string, result: 'boom' | number) => async () => {
  calls.push(name);
  if (result === 'boom') throw new Error('down');
  return Array.from({ length: result }, (_, i) => ({ name: `${name}${i}` }));
};
const chain = [
  { source: 'paid', env: ['PAID_KEY'] }, // no key → skipped, never called
  { source: 'flaky', env: [] }, // throws → next
  { source: 'empty', env: [] }, // 0 results → next
  { source: 'free', env: [] },
  { source: 'never', env: [] },
];
const sources = { paid: fake('paid', 3), flaky: fake('flaky', 'boom'), empty: fake('empty', 0), free: fake('free', 2), never: fake('never', 9) };
const leads = await runChain(chain, sources, req, {});
assert.deepEqual(calls, ['flaky', 'empty', 'free']);
assert.deepEqual(leads.map((l) => [l.name, l.source]), [['free0', 'free'], ['free1', 'free']]);

// key present → paid wins first
calls.length = 0;
assert.equal((await runChain(chain, sources, req, { PAID_KEY: 'k' }))[0].source, 'paid');
// all empty → [] (nothing found), all throwing → error naming each source
assert.deepEqual(await runChain([{ source: 'empty', env: [] }], sources, req, {}), []);
await assert.rejects(runChain([{ source: 'flaky', env: [] }], sources, req, {}), /flaky: down/);
await assert.rejects(runChain([{ source: 'paid', env: ['PAID_KEY'] }], sources, req, {}), /no lead source is configured/);
}

checkChain().then(() => console.log('all ok'));

// ── website enrichment merge ─────────────────────────────────────────────────
const merged = mergeContacts(
  [{ name: 'A', website: 'https://a.id', phone: null, emails: [] }, { name: 'B', phone: '+62 1', emails: ['b@b.id'] }, { name: 'C' }],
  { '0': { emails: ['info@a.id'], whatsapp: ['+628123'], phones: ['(021) 555', '(021) 556'] }, '1': { emails: ['b@b.id', 'x@b.id'], whatsapp: [], phones: ['(021) 9'] } },
);
assert.deepEqual([merged[0].emails, merged[0].whatsapp, merged[0].phone], [['info@a.id'], ['+628123'], '(021) 555']);
assert.deepEqual([merged[1].emails, merged[1].phone], [['b@b.id', 'x@b.id'], '+62 1']); // keeps existing phone, dedupes emails
assert.deepEqual(merged[2], { name: 'C' }); // no website → untouched
