/** Run: pnpm --filter web exec tsx src/features/contacts/template.check.ts */
import assert from 'node:assert/strict';
import { renderTemplate, waNumber } from './template';

const lead = {
  name: 'Toko Kopi Senja',
  category: 'cafe',
  address: 'Jl. Sudirman 12, Jakarta, Indonesia',
  phone: '0812-3456-7890',
  website: null,
};

assert.equal(
  renderTemplate('Halo {{business_name}} di {{ city }} ({{CATEGORY}})', lead),
  'Halo Toko Kopi Senja di Jakarta (cafe)',
);
assert.equal(renderTemplate('{{website}}|{{company_name}}', lead), '|Toko Kopi Senja');
// unknown variables stay visible instead of silently vanishing
assert.equal(renderTemplate('Hi {{owner_name}}', lead), 'Hi {{owner_name}}');
assert.equal(renderTemplate('{{city}}', { ...lead, address: null }), '');

assert.equal(waNumber('0812-3456-7890'), '6281234567890');
assert.equal(waNumber('+62 812 3456 7890'), '6281234567890');
assert.equal(waNumber('0044 20 7946 0958'), '442079460958');
assert.equal(waNumber('123'), null);
assert.equal(waNumber(null), null);

console.log('all ok');
