import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(join(root, 'lib/reference-screens.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
runInNewContext(compiled, { exports });
const screens = exports.referenceScreens;

assert.ok(Array.isArray(screens));
assert.equal(screens.length, 63, `Expected 63 photos, found ${screens.length}`);
assert.equal(new Set(screens.map((screen) => screen.id)).size, screens.length);
assert.equal(new Set(screens.map((screen) => screen.photo)).size, screens.length);

for (const screen of screens) {
  assert.ok(screen.name && screen.place && screen.placeRu && screen.size);
  assert.ok(screen.source && (Number.isInteger(screen.page) || screen.sourceUrl));
  if (screen.sourceUrl) assert.match(screen.sourceUrl, /^https:\/\//);
  assert.ok(screen.photo.startsWith('/reference-screens/'));
  assert.ok(existsSync(join(root, 'public', screen.photo)), `Missing photo: ${screen.photo}`);
  const preview = exports.referencePreviewPath(screen.photo);
  assert.ok(existsSync(join(root, 'public', preview)), `Missing preview: ${preview}`);
}

const suppliers = new Set(screens.map((screen) => screen.supplier || '7Media'));
assert.deepEqual([...suppliers].sort(), ['7Media', 'Ahad Mix', 'Light Media Invest', 'M-Exclusive', 'TOPIC']);
console.log(`${screens.length} screen cards, ${screens.length} photographs, ${suppliers.size} suppliers: OK`);
