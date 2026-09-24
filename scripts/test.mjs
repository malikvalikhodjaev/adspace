import ts from 'typescript';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('.test', { recursive: true });
for (const name of ['catalog', 'domain', 'media']) {
  const source = await readFile('lib/' + name + '.ts', 'utf8');
  const output = ts
    .transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    })
    .outputText.replace("'./catalog'", "'./catalog.mjs'");
  await writeFile('.test/' + name + '.mjs', output);
}
const { act, initial, quote, days } = await import('../.test/domain.mjs');
const { inspectMedia } = await import('../.test/media.mjs');
let count = 0;
function check(name, fn) {
  fn();
  count++;
  console.log('PASS', name);
}
const now = '2026-09-05T12:00:00Z';
const create = (w, key = 'test-key-001') =>
  act(
    w,
    {
      action: 'create',
      role: 'advertiser',
      key,
      name: 'Test',
      surfaceIds: ['led-001'],
      start: '2026-09-10',
      end: '2026-09-12',
      assetId: 'asset',
    },
    now,
  );
const transition = (w, action, role, note = 'Test evidence') =>
  act(w, { id: w.campaigns[0].id, action, role, note }, now);
check('inclusive date pricing', () =>
  assert.equal(
    quote(initial(), ['led-001', 'led-002'], '2026-09-10', '2026-09-12'),
    2490000,
  ),
);
check('invalid calendar dates rejected', () =>
  assert.throws(() => days('2026-02-30', '2026-03-02')),
);
check('reversed dates rejected', () =>
  assert.throws(() => days('2026-09-12', '2026-09-10')),
);
check('90 day bound', () =>
  assert.throws(() => days('2026-01-01', '2026-05-01')),
);
check('duplicate surfaces rejected', () =>
  assert.throws(() =>
    quote(initial(), ['led-001', 'led-001'], '2026-09-10', '2026-09-12'),
  ),
);
check('idempotent creation', () => {
  const w = create(initial());
  create(w);
  assert.equal(w.campaigns.length, 1);
});
check('overlapping reservations rejected', () => {
  const w = create(initial());
  assert.throws(() => create(w, 'test-key-002'));
});
check('payment cannot be duplicated', () => {
  const w = create(initial());
  transition(w, 'pay', 'advertiser');
  assert.throws(() => transition(w, 'pay', 'advertiser'));
  assert.equal(w.campaigns[0].ledger.length, 1);
});
check('roles and two approvals required', () => {
  const w = create(initial());
  transition(w, 'pay', 'advertiser');
  assert.throws(() => transition(w, 'content', 'operator'));
  assert.throws(() => transition(w, 'start', 'operator'));
  transition(w, 'content', 'moderator');
  assert.equal(w.campaigns[0].status, 'moderation');
  assert.throws(() => transition(w, 'start', 'operator'));
  transition(w, 'technical', 'operator');
  assert.equal(w.campaigns[0].status, 'approved');
});
check('refund requires reason and occurs once', () => {
  const w = create(initial());
  transition(w, 'pay', 'advertiser');
  assert.throws(() => transition(w, 'reject', 'moderator', ''));
  transition(w, 'reject', 'moderator');
  assert.throws(() => transition(w, 'reject', 'moderator'));
  assert.equal(
    w.campaigns[0].ledger.filter((l) => l.kind === 'refund').length,
    1,
  );
});
check('new creative resets approvals', () => {
  const w = create(initial());
  transition(w, 'pay', 'advertiser');
  transition(w, 'content', 'moderator');
  transition(w, 'revision', 'operator');
  act(
    w,
    {
      action: 'resubmit',
      role: 'advertiser',
      id: w.campaigns[0].id,
      assetId: 'new',
    },
    now,
  );
  assert.equal(w.campaigns[0].content, 'pending');
});
check('price snapshots survive tariff changes', () => {
  const w = create(initial());
  act(
    w,
    { action: 'surface', role: 'operator', id: 'led-001', price: 900000 },
    now,
  );
  assert.equal(w.campaigns[0].total, 1350000);
});
check('dispute refund reverses accrual and fee', () => {
  const w = create(initial());
  for (const [a, r] of [
    ['pay', 'advertiser'],
    ['content', 'moderator'],
    ['technical', 'operator'],
    ['start', 'operator'],
    ['dispute', 'advertiser'],
    ['resolve', 'admin'],
  ])
    transition(w, a, r);
  assert.equal(w.campaigns[0].status, 'refunded');
  assert.deepEqual(
    w.campaigns[0].ledger.map((l) => l.kind),
    ['hold', 'release', 'fee', 'reversal', 'fee_reversal', 'refund'],
  );
});
check('blocking prevents booking', () => {
  const w = initial();
  act(w, { action: 'block', role: 'admin', operator: 'Demo City Media' }, now);
  assert.throws(() => create(w));
});
check('cancel releases reservation', () => {
  const w = create(initial());
  transition(w, 'cancel', 'advertiser');
  create(w, 'different-key');
  assert.equal(w.campaigns.length, 2);
});
check('invalid files rejected', () =>
  assert.throws(() => inspectMedia(new Uint8Array(40))),
);
check('operator can create a surface',()=>{const w=initial();act(w,{action:'addSurface',role:'operator',surface:{name:'New',address:'Tashkent',district:'Test',lat:41.3,lng:69.2,price:100000}},now);assert.equal(w.surfaces.length,7)});
check('closed operator dates prevent booking',()=>{const w=initial();act(w,{action:'unavailable',role:'operator',id:'led-001',start:'2026-09-10',end:'2026-09-12'},now);assert.throws(()=>create(w));act(w,{action:'unavailable',role:'operator',id:'led-001',start:'2026-09-10',end:'2026-09-12'},now);create(w);assert.equal(w.campaigns.length,1)});
check('operator cannot close reserved dates',()=>{const w=create(initial());assert.throws(()=>act(w,{action:'unavailable',role:'operator',id:'led-001',start:'2026-09-10',end:'2026-09-12'},now))});
console.log(`${count} checks passed`);
