/** Run: pnpm --filter web exec tsx src/lib/svix.check.ts */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifySvix } from './svix';

const secret = `whsec_${Buffer.from('test-secret-key').toString('base64')}`;
const body = '{"type":"email.opened","data":{"email_id":"abc"}}';
const ts = '1760000000';
const sig = createHmac('sha256', Buffer.from('test-secret-key')).update(`msg_1.${ts}.${body}`).digest('base64');

assert.ok(verifySvix(secret, 'msg_1', ts, body, `v1,${sig}`, 1760000000));
assert.ok(verifySvix(secret, 'msg_1', ts, body, `v1,bogus v1,${sig}`, 1760000000)); // any listed sig may match
assert.ok(!verifySvix(secret, 'msg_1', ts, body + ' ', `v1,${sig}`, 1760000000)); // body tampered
assert.ok(!verifySvix(secret, 'msg_1', ts, body, `v1,${sig}`, 1760000000 + 3600)); // replayed an hour later
assert.ok(!verifySvix(secret, 'msg_1', ts, body, '', 1760000000)); // unsigned
console.log('all ok');
