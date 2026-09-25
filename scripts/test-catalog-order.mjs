import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(resolve(import.meta.dirname, '../lib/catalog-order.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
runInNewContext(compiled, { exports, Map });
const { mixCatalogCards } = exports;

const references = [
  { id: 'a1', supplier: 'A' },
  { id: 'a2', supplier: 'A' },
  { id: 'a3', supplier: 'A' },
  { id: 'b1', supplier: 'B' },
  { id: 'b2', supplier: 'B' },
  { id: 'c1', supplier: 'C' },
];
const connected = [{ id: 'live1' }, { id: 'live2' }];
const mixed = mixCatalogCards(references, connected);
assert.deepEqual(
  [...mixed].map(({ screen }) => screen.id),
  ['a1', 'b1', 'c1', 'a2', 'live1', 'b2', 'a3', 'live2'],
);
assert.deepEqual([...mixCatalogCards([], connected)].map(({ screen }) => screen.id), ['live1', 'live2']);
assert.deepEqual([...mixCatalogCards(references, [])].map(({ screen }) => screen.id), ['a1', 'b1', 'c1', 'a2', 'b2', 'a3']);
assert.equal(new Set(mixed.map(({ screen }) => screen.id)).size, references.length + connected.length);
console.log('Catalogue mixes suppliers and connected screens without duplicates: OK');
