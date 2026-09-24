import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(
  new URL('../lib/navigation.ts', import.meta.url),
  'utf8',
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { viewFromSearch, viewHref, calendarHref, devshowHref, loginHref, loginDestination } =
  await import(
    'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
  );
let checks = 0;
function check(label, fn) {
  fn();
  checks++;
  console.log('PASS', label);
}
check('home is the default; catalog requires an explicit action', () => {
  assert.equal(viewFromSearch(''), 'home');
  assert.equal(viewFromSearch('?view=missing'), 'home');
  assert.equal(viewFromSearch('?view=catalog'), 'catalog');
});
check('new order URL and legacy campaign bookmarks both work', () => {
  assert.equal(viewFromSearch('?view=orders'), 'campaigns');
  assert.equal(viewFromSearch('?view=campaigns'), 'campaigns');
  assert.equal(viewHref('campaigns'), '/?view=orders');
  assert.equal(viewHref('home'), '/');
});
check(
  'admin lives at its own address while old bookmarks remain readable',
  () => {
    assert.equal(viewFromSearch('', '/admin'), 'admin');
    assert.equal(viewFromSearch('?view=catalog', '/admin'), 'admin');
    assert.equal(viewFromSearch('?view=admin'), 'admin');
    assert.equal(viewHref('admin'), '/admin');
    assert.equal(loginDestination('/?view=admin', 'admin'), '/admin');
  },
);
check('screen QR links still open the catalog', () =>
  assert.equal(viewFromSearch('?surface=led-001'), 'catalog'),
);
check('calendar links keep the screen and protect the owner route', () => {
  assert.equal(viewFromSearch('?view=calendar&screen=led-001'), 'calendar');
  assert.equal(
    viewFromSearch('?view=owner-calendar&screen=led-001'),
    'owner-calendar',
  );
  assert.equal(calendarHref('led-001'), '/?view=calendar&screen=led-001');
  assert.equal(
    calendarHref('led-001', true),
    '/?view=owner-calendar&screen=led-001',
  );
  assert.equal(
    loginDestination(calendarHref('led-001', true), 'operator'),
    calendarHref('led-001', true),
  );
  assert.equal(
    loginDestination(calendarHref('led-001', true), 'advertiser'),
    '/?view=orders',
  );
});
check('display grid return path is restricted to screen owners', () => {
  assert.equal(devshowHref('led-001'), '/devshow/led-001');
  assert.equal(loginDestination('/devshow', 'advertiser'), '/devshow');
  assert.equal(loginDestination('/devshow/led-001', 'operator'), '/devshow/led-001');
  assert.equal(loginDestination('/devshow/led-001', 'admin'), '/devshow/led-001');
  assert.equal(loginDestination('/devshow/led-001', 'advertiser'), '/?view=orders');
  assert.equal(
    loginDestination('/display/led-001', 'operator'),
    '/display/led-001',
  );
  assert.equal(
    loginDestination('/display/led-001', 'admin'),
    '/display/led-001',
  );
  assert.equal(
    loginDestination('/display/led-001', 'advertiser'),
    '/?view=orders',
  );
});
check('all four actual account roles have distinct destinations', () => {
  for (const [role, view] of [
    ['advertiser', 'orders'],
    ['operator', 'operator'],
    ['moderator', 'moderator'],
    ['admin', 'admin'],
  ]) {
    assert.equal(
      loginDestination(null, role),
      role === 'admin' ? '/admin' : '/?view=' + view,
    );
  }
});
check('role-specific entry preserves a safe order-resume URL', () => {
  const url = new URL(
    loginHref('advertiser', '/?view=catalog&resume=1'),
    'https://adspace.local',
  );
  assert.equal(url.searchParams.get('role'), 'advertiser');
  assert.equal(
    loginDestination(url.searchParams.get('next'), 'advertiser'),
    '/?view=catalog&resume=1',
  );
  assert.equal(
    new URL(loginHref('operator'), 'https://adspace.local').searchParams.get(
      'role',
    ),
    'operator',
  );
});
check(
  'external, protocol-relative and backslash redirects are rejected',
  () => {
    for (const next of [
      'https://evil.invalid',
      '//evil.invalid',
      '/\\\\evil.invalid',
      '/\n/evil.invalid',
      'javascript:alert(1)',
    ]) {
      assert.equal(loginDestination(next, 'operator'), '/?view=operator');
    }
  },
);
check(
  'wrong-role login cannot enter another cabinet or resume advertiser checkout',
  () => {
    assert.equal(
      loginDestination('/?view=operator', 'advertiser'),
      '/?view=orders',
    );
    assert.equal(
      loginDestination('/?view=orders', 'operator'),
      '/?view=operator',
    );
    assert.equal(
      loginDestination('/?view=catalog&resume=1', 'operator'),
      '/?view=operator',
    );
    assert.equal(
      loginDestination('/?view=admin', 'moderator'),
      '/?view=moderator',
    );
    assert.equal(loginDestination('/admin', 'moderator'), '/?view=moderator');
    assert.equal(loginDestination('/admin', 'operator'), '/?view=operator');
    assert.equal(loginDestination('/admin', 'advertiser'), '/?view=orders');
    assert.equal(loginDestination('/admin', 'admin'), '/admin');
    assert.equal(
      loginDestination('/?view=moderator', 'operator'),
      '/?view=operator',
    );
    assert.equal(
      loginDestination('/?view=operator', 'admin'),
      '/?view=operator',
    );
  },
);
const occasionSource = await readFile(
  new URL('../lib/occasions.ts', import.meta.url),
  'utf8',
);
const occasionJs = ts.transpileModule(occasionSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const {
  occasions,
  occasionById,
  occasionFromSearch,
  catalogHref,
  placementNameForOccasion,
} = await import(
  'data:text/javascript;base64,' + Buffer.from(occasionJs).toString('base64')
);
check(
  'five explicit personal and business occasions have complete Russian and Uzbek copy',
  () => {
    assert.deepEqual(
      occasions.map((x) => x.id),
      ['photo', 'greeting', 'love', 'event', 'business'],
    );
    for (const item of occasions)
      for (const field of ['title', 'description', 'hint', 'name']) {
        assert.equal(item[field].length, 2);
        assert.ok(
          item[field].every((x) => typeof x === 'string' && x.length > 2),
        );
      }
  },
);
check(
  'occasion links open catalog and survive login/resume without granting rights',
  () => {
    for (const occasion of occasions) {
      const href = catalogHref(occasion.id, true);
      assert.equal(
        viewFromSearch(new URL(href, 'https://adspace.local').search),
        'catalog',
      );
      assert.equal(occasionFromSearch(href.slice(1)), occasion.id);
      const login = new URL(
        loginHref('advertiser', href),
        'https://adspace.local',
      );
      assert.equal(
        loginDestination(login.searchParams.get('next'), 'advertiser'),
        href,
      );
      assert.equal(
        loginDestination(login.searchParams.get('next'), 'operator'),
        '/?view=operator',
      );
    }
  },
);
check(
  'unknown occasions are ignored; direct browsing does not force a personal scenario',
  () => {
    for (const value of [null, undefined, '', 'admin', '<script>', {}, 1])
      assert.equal(occasionById(value), undefined);
    assert.equal(occasionFromSearch('?view=catalog&occasion=%3Cscript%3E'), '');
    assert.equal(catalogHref('admin'), '/?view=catalog');
    assert.equal(catalogHref(), '/?view=catalog');
  },
);
check(
  'changing occasion updates automatic titles but never overwrites a custom title',
  () => {
    assert.equal(placementNameForOccasion('', 'photo'), 'Моё фото на экране');
    assert.equal(
      placementNameForOccasion('Моё фото на экране', 'greeting'),
      'Поздравление на экране',
    );
    assert.equal(
      placementNameForOccasion('С днём рождения, мама!', 'greeting'),
      'С днём рождения, мама!',
    );
    assert.equal(
      placementNameForOccasion('', 'photo', true),
      'Mening suratim ekranda',
    );
    assert.equal(placementNameForOccasion('Моё фото на экране', ''), '');
  },
);
console.log(checks + ' navigation checks passed.');
