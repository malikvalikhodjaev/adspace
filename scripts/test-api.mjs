import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = 'http://localhost:3100';
const headers = { Cookie: '__sites_local_auth=1', Origin: base };
let checks = 0;
const check = (name) => {
  checks++;
  console.log('PASS', name);
};
let r = await fetch(base + '/api/workspace');
assert.equal(r.status, 401);
check('anonymous denied');
r = await fetch(base + '/api/workspace', { headers });
assert.equal(r.status, 200);
check('signed-in workspace read');
r = await fetch(base + '/api/workspace', {
  method: 'POST',
  headers: {
    ...headers,
    Origin: 'https://wrong.example',
    'Content-Type': 'application/json',
  },
  body: '{}',
});
assert.equal(r.status, 403);
check('cross origin mutation denied');
const bytes = await readFile('public/test-creative.png');
const form = new FormData();
form.append(
  'file',
  new Blob([bytes], { type: 'image/png' }),
  'test-creative.png',
);
r = await fetch(base + '/api/assets', { method: 'POST', headers, body: form });
let d = await r.json();
assert.equal(r.status, 200, JSON.stringify(d));
const assetId = d.id;
check('valid creative persisted');
r = await fetch(base + '/api/assets?id=' + assetId, { headers });
assert.equal(r.status, 200);
assert.equal((await r.arrayBuffer()).byteLength, bytes.length);
check('private creative byte-exact read');
r = await fetch(base + '/api/assets?id=' + assetId);
assert.equal(r.status, 401);
check('anonymous file denied');
const send = async (data) => {
  const res = await fetch(base + '/api/workspace', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return { status: res.status, data: await res.json() };
};
const key = crypto.randomUUID();
const input = {
  action: 'create',
  role: 'advertiser',
  key,
  name: 'API acceptance ' + key.slice(0, 6),
  surfaceIds: ['led-006'],
  start: '2027-01-05',
  end: '2027-01-06',
  assetId,
};
let a = await send(input);
assert.equal(a.status, 200, JSON.stringify(a.data));
const id = a.data.workspace.campaigns.find((c) => c.key === key).id;
check('campaign creation');
a = await send(input);
assert.equal(a.status, 200);
assert.equal(a.data.workspace.campaigns.filter((c) => c.key === key).length, 1);
check('idempotency through API');
const concurrent = await Promise.all([
  send({ action: 'pay', role: 'advertiser', id }),
  send({ action: 'pay', role: 'advertiser', id }),
]);
assert.equal(concurrent.filter((x) => x.status === 200).length, 1);
check('concurrent pay exactly once');
for (const [action, role] of [
  ['content', 'moderator'],
  ['technical', 'operator'],
  ['start', 'operator'],
  ['complete', 'operator'],
]) {
  a = await send({ action, role, id, note: 'Automated sandbox acceptance' });
  assert.equal(a.status, 200, JSON.stringify(a.data));
}
check('end to end approvals start completion');
r = await fetch(base + '/api/workspace', { headers });
d = await r.json();
assert.equal(
  d.workspace.campaigns.find((c) => c.id === id).status,
  'completed',
);
check('durable read after write');
console.log(`${checks} API checks passed`);
