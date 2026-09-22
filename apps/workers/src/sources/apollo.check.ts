/**
 * Run: pnpm --filter workers exec tsx src/sources/apollo.check.ts
 * Checks the defensive parsing of Apollo's response, which is the part most
 * likely to silently return zero leads when the payload shape shifts.
 */
import assert from 'node:assert/strict';
import { extractOrganizations, toRawLead } from './apollo';

const org = { name: 'Acme GmbH', city: 'Berlin', country: 'Germany', industry: 'software' };

// the shapes Apollo/Composio have been seen to return
assert.deepEqual(extractOrganizations({ organizations: [org] }), [org]);
assert.deepEqual(extractOrganizations({ accounts: [org] }), [org]);
assert.deepEqual(extractOrganizations({ data: { organizations: [org] } }), [org]);
assert.deepEqual(extractOrganizations(JSON.stringify({ organizations: [org] })), [org]);

// and the shapes that must not throw
assert.deepEqual(extractOrganizations(null), []);
assert.deepEqual(extractOrganizations('not json'), []);
assert.deepEqual(extractOrganizations({ organizations: 'nope' }), []);
assert.deepEqual(extractOrganizations({}), []);

const lead = toRawLead({
  name: 'Acme GmbH',
  city: 'Berlin',
  country: 'Germany',
  industry: 'software',
  primary_domain: 'acme.de',
  primary_phone: { number: '+49 30 123456' },
  linkedin_url: 'https://linkedin.com/company/acme',
});
// country must be last so the leads table can read it off the address tail
assert.equal(lead.address, 'Berlin, Germany');
assert.equal(lead.website, 'https://acme.de');
assert.equal(lead.phone, '+49 30 123456');
assert.equal(lead.category, 'software');
assert.equal(lead.sourceUrl, 'https://linkedin.com/company/acme');

console.log('all ok');
