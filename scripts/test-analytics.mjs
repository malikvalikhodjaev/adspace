import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(
  new URL('../lib/analytics.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { occupancySummary } = await import(
  'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
);

const screen = {
  id: 'screen-a',
  name: 'Экран A',
  opens: '09:00',
  closes: '18:00',
  slots: 2,
  status: 'published',
};
const draft = { ...screen, id: 'screen-b', name: 'Экран B', status: 'draft' };
const reservation = (
  id,
  from,
  to,
  status = 'scheduled',
  date = '2026-09-25',
) => ({
  id,
  surfaceIds: [screen.id],
  start: date,
  end: date,
  from,
  to,
  status,
});
const reservations = [
  reservation('morning', '09:00', '12:00'),
  reservation('midday', '11:00', '14:00', 'moderation'),
  reservation('cancelled', '10:00', '13:00', 'cancelled'),
];
const campaigns = [
  { id: 'morning', status: 'scheduled' },
  { id: 'midday', status: 'moderation' },
];
const unavailable = [{ id: screen.id, start: '2026-09-26', end: '2026-09-26' }];
const result = occupancySummary(
  [screen, draft],
  reservations,
  campaigns,
  unavailable,
  '2026-09-25',
  2,
);

assert.deepEqual(result.dates, ['2026-09-25', '2026-09-26']);
assert.equal(result.screens, 2);
assert.equal(result.published, 1);
assert.equal(result.bookedCalendars, 1);
assert.equal(result.bookings, 2);
assert.equal(result.pending, 1);
assert.equal(result.bookedMinutes, 360);
assert.equal(result.capacityMinutes, 1080);
assert.equal(result.percent, 33.3);
assert.equal(result.rows[0].days[0].bookings, 2);
assert.equal(result.rows[0].days[1].closed, true);
assert.equal(result.rows[0].days[1].capacityMinutes, 0);
assert.equal(result.rows[1].capacityMinutes, 0);

const clipped = occupancySummary(
  [screen],
  [
    reservation('early', '08:00', '09:30'),
    reservation('late', '17:30', '19:00'),
  ],
  [],
  [],
  '2026-09-25',
  1,
);
assert.equal(clipped.bookedMinutes, 60);
assert.equal(clipped.bookings, 2);
assert.equal(
  occupancySummary(
    [draft],
    reservations,
    campaigns,
    unavailable,
    '2026-09-25',
    2,
  ).bookings,
  0,
);
console.log(
  'PASS analytics overlap, clipping, closed days, statuses and scope',
);
