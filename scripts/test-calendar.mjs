import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(
  new URL('../lib/model.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { activeAt, capacityAvailable, occupiedPlaces, labels, roleLabels } = await import(
  'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
);
const clockSource = await readFile(new URL('../lib/tashkent-clock.ts', import.meta.url), 'utf8');
const clockJs = ts.transpileModule(clockSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { tashkentClock } = await import(
  'data:text/javascript;base64,' + Buffer.from(clockJs).toString('base64')
);
assert.deepEqual(tashkentClock(Date.parse('2026-09-24T18:59:59Z')), {
  date: '24.09.2026',
  time: '23:59:59',
  dateTime: '2026-09-24T23:59:59+05:00',
});
assert.equal(tashkentClock(Date.parse('2026-09-24T19:00:00Z')).date, '25.09.2026');
const scheduledToday = {
  status: 'scheduled',
  start: '2026-09-24',
  end: '2026-09-24',
  from: '09:00',
  to: '23:00',
};
assert.equal(activeAt(scheduledToday, new Date('2026-09-24T03:59:59Z')), false);
assert.equal(activeAt(scheduledToday, new Date('2026-09-24T04:00:00Z')), true);
assert.equal(activeAt(scheduledToday, new Date('2026-09-24T18:00:00Z')), false);
console.log('PASS visible Tashkent clock matches scheduling boundaries');
assert.equal(labels.moderation[1], 'Egasidan javob kutilmoqda');
assert.equal(labels.scheduled[1], 'Vaqti belgilangan');
assert.equal(labels.live[1], 'Ekranda ko‘rsatilmoqda');
assert.equal(roleLabels.advertiser[1], 'Joylashtiruvchi');
console.log('PASS plain Uzbek placement statuses and account role');
const screen = { id: 'screen-a', slots: 2 };
const book = (
  id,
  from,
  to,
  start = '2026-09-25',
  end = start,
  status = 'scheduled',
) => ({
  id,
  surfaceIds: [screen.id],
  start,
  end,
  from,
  to,
  status,
});
const bookings = [
  book('morning', '09:00', '12:00'),
  book('midday', '11:00', '14:00'),
];

assert.equal(
  occupiedPlaces(bookings, screen.id, '2026-09-25', '09:00', '11:00'),
  1,
);
assert.equal(
  occupiedPlaces(bookings, screen.id, '2026-09-25', '11:00', '12:00'),
  2,
);
assert.equal(
  occupiedPlaces(bookings, screen.id, '2026-09-25', '12:00', '13:00'),
  1,
);
assert.equal(
  capacityAvailable(
    { campaigns: bookings },
    screen,
    '2026-09-25',
    '2026-09-25',
    '09:00',
    '11:00',
  ),
  true,
);
assert.equal(
  capacityAvailable(
    { campaigns: bookings },
    screen,
    '2026-09-25',
    '2026-09-25',
    '11:00',
    '12:00',
  ),
  false,
);
assert.equal(
  capacityAvailable(
    { campaigns: bookings },
    screen,
    '2026-09-25',
    '2026-09-26',
    '09:00',
    '11:00',
  ),
  true,
);
assert.equal(
  occupiedPlaces(
    [
      ...bookings,
      book(
        'cancelled',
        '11:00',
        '12:00',
        '2026-09-25',
        '2026-09-25',
        'cancelled',
      ),
    ],
    screen.id,
    '2026-09-25',
    '11:00',
    '12:00',
  ),
  2,
);
assert.equal(
  occupiedPlaces(bookings, screen.id, '2026-09-26', '11:00', '12:00'),
  0,
);
console.log('PASS calendar occupancy, boundary, capacity and status checks');

const dateSource = await readFile(new URL('../lib/date-labels.ts', import.meta.url), 'utf8');
const dateModule = ts.transpileModule(dateSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { shortDayLabel, longDateLabel, monthLabel } = await import(
  'data:text/javascript;base64,' + Buffer.from(dateModule).toString('base64')
);
assert.equal(shortDayLabel('2026-09-24', true), '24.09 · pa');
assert.equal(shortDayLabel('2026-09-25', false), '25.09 · пт');
assert.equal(longDateLabel('2026-09-24', true), '24-sentabr 2026');
assert.equal(longDateLabel('2026-09-24', false), '24 сентября 2026');
assert.equal(monthLabel('2026-09', true), 'sentabr 2026');
console.log('PASS Uzbek and Russian calendar labels are browser-locale independent');

const { cities } = JSON.parse(await readFile(new URL('../lib/soato-locations.json', import.meta.url), 'utf8'));
assert.equal(cities.length, 120);
assert.equal(cities[0].code, '1726');
assert.equal(cities[0].districts.length, 12);
assert.equal(cities.find((city) => city.code === '1727407505').districts.length, 0);
console.log('PASS official SOATO city and district relationships');
