import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
await mkdir('.test', { recursive: true });
const source = await readFile('lib/experiment.ts', 'utf8');
await writeFile(
  '.test/experiment.mjs',
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
);
const { assignedDesign } = await import('../.test/experiment.mjs');
const bucket = { a: 0, b: 0 };
for (let i = 0; i < 256; i++) bucket[assignedDesign(null, i)]++;
assert.deepEqual(bucket, { a: 128, b: 128 });
assert.equal(assignedDesign('adspace_design_v1=a', 255), 'a');
assert.equal(assignedDesign('adspace_design_v1=b', 0), 'b');
assert.equal(assignedDesign('adspace_design_v1=invalid', 0), 'a');
assert.equal(assignedDesign('unrelated=a; adspace_design_v1=b', 0), 'b');
assert.equal(
  assignedDesign('adspace_design_v1=a; adspace_design_v1=b', 255),
  'b',
);
console.log(
  'PASS allocation boundaries, 50/50 distribution, sticky assignment, invalid cookies',
);
const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
for (const variant of ['a', 'b']) {
  const r = await fetch(base + '/' + variant);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.ok(html.includes(`data-variant="${variant}"`));
  const title = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '';
  assert.ok(
    title.includes(variant === 'a' ? 'Ваш бренд. На виду.' : 'ГОРОД УВИДИТ'),
    title,
  );
  assert.ok(html.includes('/' + variant + '?view=campaigns'));
  const signed = await fetch(base + '/auth/register?returnTo=/' + variant);
  assert.equal(signed.status, 200);
  console.log(
    'PASS route, distinct headline, role navigation and registration',
    variant,
  );
}
const first = await fetch(base + '/test', { redirect: 'manual' });
assert.equal(first.status, 307);
assert.match(first.headers.get('location'), /^\/[ab]$/);
const cookie = first.headers.get('set-cookie');
assert.match(cookie, /HttpOnly/);
assert.match(first.headers.get('cache-control'), /no-store/);
const repeat = await fetch(base + '/test', {
  redirect: 'manual',
  headers: { Cookie: cookie.split(';')[0] },
});
assert.equal(repeat.headers.get('location'), first.headers.get('location'));
const deep = await fetch(base + '/test?surface=led-001', {
  redirect: 'manual',
  headers: { Cookie: 'adspace_design_v1=a' },
});
assert.equal(deep.headers.get('location'), '/a?surface=led-001');
console.log(
  'PASS redirect, secure assignment cookie, no-cache, repeat visit and QR deep link',
);
