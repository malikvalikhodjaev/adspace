import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
const root = process.cwd(),
  port = Number(process.env.TEST_PORT || 3212),
  base = 'http://127.0.0.1:' + port;
const dir = resolve('.local/qa-' + Date.now());
await mkdir(dir, { recursive: true });
const ffmpeg =
  process.env.FFMPEG_PATH ||
  resolve(
    '.local/media/node_modules/ffmpeg-static/' +
      (process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
  );
const ffprobe =
  process.env.FFPROBE_PATH ||
  resolve(
    '.local/media/node_modules/ffprobe-static/bin/' +
      (process.platform === 'win32'
        ? 'win32/x64/ffprobe.exe'
        : 'linux/x64/ffprobe'),
  );
const proc = spawn(process.execPath, ['dist/standalone/server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    APP_URL: base,
    ADSPACE_DATA_DIR: dir,
    FFMPEG_PATH: ffmpeg,
    FFPROBE_PATH: ffprobe,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let logs = '';
proc.stdout.on('data', (x) => {
  logs += x;
});
proc.stderr.on('data', (x) => {
  logs += x;
});
let checks = 0;
const pass = (s) => {
  checks++;
  console.log('PASS ' + s);
};
async function call(path, data, cookie = '', expected = 200, extra = {}) {
  const r = await fetch(base + path, {
    method: data ? 'POST' : 'GET',
    headers: {
      Origin: base,
      ...(data ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra,
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  let b;
  const text = await r.text();
  try {
    b = JSON.parse(text);
  } catch {
    b = text;
  }
  assert.equal(r.status, expected, JSON.stringify(b));
  const cookies = r.headers.getSetCookie();
  return {
    b,
    cookie: cookies[0]?.split(';')[0] || '',
    cookies,
  };
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/api/health')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready, logs);
  const health = await call('/api/health');
  assert.equal(health.b.version, '0.2.28');
  pass('health reports the published version');
  const homePage = await call('/');
  assert.match(homePage.b, /<html lang="uz"/);
  assert.match(homePage.b, /SHAHAR SIZNI/);
  assert.match(
    homePage.b,
    /class="secondary header-partners-link" href="\/partners">Hamkor bo‘lish<\/a>/,
  );
  pass('Uzbek is the default language on the main page');
  const loginPage = await call('/login?role=operator');
  assert.match(loginPage.b, /Maydonlar platformasiga kirish/);
  pass('Uzbek is the default language on the sign-in page');
  const partnersPage = await call('/partners');
  assert.match(partnersPage.b, /BO‘SH VAQT —/);
  assert.match(partnersPage.b, /boy berilgan daromad\./);
  assert.match(partnersPage.b, /Har bir bo‘sh soat — qo‘shimcha daromad imkoniyati\./);
  assert.match(partnersPage.b, /Yangi so‘rov/);
  assert.deepEqual(
    [...partnersPage.b.matchAll(/class="partners-preview-day">([^<]+)<\/span>/g)].map(
      (match) => match[1],
    ),
    ['DU', 'SE', 'CH', 'PA', 'JU', 'SH', 'YA'],
  );
  pass('partner landing is served with a dedicated onboarding path');
  const devshowPage = await call('/devshow');
  assert.match(devshowPage.b, /DEVSHOW/);
  assert.match(devshowPage.b, /Efir setkasi qanday ishlashini ko‘ring/);
  assert.match(devshowPage.b, /TOSHKENT VAQTI/);
  pass('public devshow landing shows a sample grid without private assets');
  const adminPage = await call('/admin');
  assert.match(adminPage.b, /Maydon/);
  pass('admin address is served without exposing account data');
  const password = 'PilotTest-' + randomUUID();
  async function account(email, role) {
    return (
      await call('/api/auth', {
        action: 'register',
        email,
        password,
        role,
        name: role,
        organization: 'QA ' + role,
      })
    ).cookie;
  }
  await call('/api/workspace');
  await call(
    '/api/auth',
    { action: 'phone-start', phone: '123', role: 'operator' },
    '',
    400,
  );
  await call(
    '/api/auth',
    { action: 'phone-start', phone: '+998901234567', role: 'admin' },
    '',
    400,
  );
  let phoneStart = await call('/api/auth', {
    action: 'phone-start',
    phone: '+998 90 123 45 67',
    role: 'operator',
  });
  assert.match(phoneStart.b.code, /^\d{6}$/);
  assert.match(phoneStart.cookie, /^adspace_phone_challenge=/);
  await call(
    '/api/auth',
    { action: 'phone-complete', code: phoneStart.b.code },
    '',
    400,
  );
  await call(
    '/api/auth',
    {
      action: 'phone-complete',
      code: '999999' === phoneStart.b.code ? '000000' : '999999',
    },
    phoneStart.cookie,
    400,
  );
  let phoneDone = await call(
    '/api/auth',
    { action: 'phone-complete', code: phoneStart.b.code, name: 'Phone QA' },
    phoneStart.cookie,
  );
  const phoneUser = phoneDone.b.user;
  const deviceCookie = phoneDone.cookies
    .find((x) => x.startsWith('adspace_phone_device='))
    ?.split(';')[0];
  assert.ok(deviceCookie);
  assert.equal(phoneUser.role, 'operator');
  assert.equal(phoneUser.verified, 0);
  assert.equal(
    (await call('/api/auth', undefined, phoneDone.cookie)).b.user.id,
    phoneUser.id,
  );
  phoneStart = await call(
    '/api/auth',
    { action: 'phone-start', phone: '+998901234567', role: 'operator' },
    deviceCookie,
  );
  phoneDone = await call(
    '/api/auth',
    { action: 'phone-complete', code: phoneStart.b.code },
    phoneStart.cookie + '; ' + deviceCookie,
  );
  assert.equal(phoneDone.b.user.id, phoneUser.id);
  phoneStart = await call('/api/auth', {
    action: 'phone-start',
    phone: '+998901234567',
    role: 'operator',
  });
  phoneDone = await call(
    '/api/auth',
    { action: 'phone-complete', code: phoneStart.b.code },
    phoneStart.cookie,
  );
  assert.notEqual(phoneDone.b.user.id, phoneUser.id);
  pass('shown phone code creates only an unverified device-bound profile');
  const admin = await account('admin@qa.local', 'advertiser'),
    op = await account('operator@qa.local', 'operator'),
    adv = await account('advertiser@qa.local', 'advertiser'),
    other = await account('other@qa.local', 'advertiser'),
    op2 = await account('other-operator@qa.local', 'operator');
  const db = new DatabaseSync(resolve(dir, 'adspace.sqlite'));
  db.prepare(
    "UPDATE users SET role='admin' WHERE email='admin@qa.local'",
  ).run();
  await call(
    '/api/workspace',
    { action: 'commission', value: 25, role: 'admin' },
    adv,
    400,
  );
  pass('server rejects forged admin role');
  const wrong = await fetch(base + '/api/workspace', {
    method: 'POST',
    headers: {
      Origin: 'https://evil.invalid',
      'Content-Type': 'application/json',
      Cookie: admin,
    },
    body: JSON.stringify({ action: 'commission', value: 20 }),
  });
  assert.equal(wrong.status, 403);
  pass('cross-origin mutation rejected');
  const spec = {
    name: 'QA LED',
    address: 'Test address',
    district: 'Test',
    lat: 41.31,
    lng: 69.27,
    price: 100000,
    reach: 0,
    width: 1920,
    height: 1080,
    seconds: 15,
    fps: 25,
    maxMb: 25,
    size: '4×2.25 м',
    kind: 'Indoor LED',
    opens: '00:00',
    closes: '24:00',
    slots: 1,
  };
  let r = await call(
    '/api/workspace',
    { action: 'surface-save', surface: spec, submit: false },
    op,
  );
  const screen = r.b.surfaces.find((x) => x.name === 'QA LED');
  assert.ok(screen);
  assert.equal(screen.status, 'draft');
  assert.ok(
    !(await call('/api/workspace')).b.surfaces.some((x) => x.id === screen.id),
  );
  assert.ok(
    !(await call('/api/workspace', undefined, op2)).b.surfaces.some(
      (x) => x.id === screen.id,
    ),
  );
  await call(
    '/api/workspace',
    { action: 'surface-publish', id: screen.id },
    adv,
    400,
  );
  await call(
    '/api/workspace',
    { action: 'surface-publish', id: screen.id },
    op,
  );
  assert.ok(
    (await call('/api/workspace')).b.surfaces.some((x) => x.id === screen.id),
  );
  pass('owner drafts and publishes a screen without platform approval');
  r = await call(
    '/api/workspace',
    { action: 'surface-save', id: screen.id, surface: spec, submit: false },
    op,
  );
  assert.equal(
    r.b.surfaces.find((x) => x.id === screen.id).status,
    'published',
  );
  pass('editing a published screen does not silently unpublish it');
  await call(
    '/api/workspace',
    { action: 'surface-approve', id: screen.id },
    admin,
    400,
  );
  await call(
    '/api/workspace',
    { action: 'surface-save', id: screen.id, surface: spec },
    op2,
    400,
  );
  pass('operator cannot edit another operator screen');
  const bytes = await readFile('public/test-creative.png');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'image/png' }), 'test.png');
  const upload = await fetch(base + '/api/assets', {
    method: 'POST',
    headers: { Origin: base, Cookie: adv },
    body: form,
  });
  const asset = await upload.json();
  assert.equal(upload.status, 200, JSON.stringify(asset));
  assert.equal(
    (
      await fetch(base + '/api/assets?id=' + asset.id, {
        headers: { Cookie: other },
      })
    ).status,
    404,
  );
  pass('original creative is private to its owner');
  const rendered = (
    await call(
      '/api/render',
      {
        assetId: asset.id,
        screenId: screen.id,
        mode: 'contain',
        zoom: 1,
        x: 0.5,
        y: 0.5,
        trimStart: 0,
        duration: 15,
      },
      adv,
    )
  ).b;
  assert.equal(rendered.width, 1920);
  assert.equal(rendered.height, 1080);
  pass('server renders an actual final creative');
  const videoPath = resolve(dir, 'source.mp4');
  await promisify(execFile)(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=blue:s=640x480:r=30',
      '-t',
      '3',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      videoPath,
    ],
    { windowsHide: true },
  );
  const vf = new FormData();
  vf.append(
    'file',
    new Blob([await readFile(videoPath)], { type: 'video/mp4' }),
    'source.mp4',
  );
  const vr = await fetch(base + '/api/assets', {
    method: 'POST',
    headers: { Origin: base, Cookie: adv },
    body: vf,
  });
  assert.equal(vr.status, 200);
  const va = await vr.json();
  const finished = (
    await call(
      '/api/render',
      {
        assetId: va.id,
        screenId: screen.id,
        mode: 'cover',
        zoom: 1.2,
        x: 0.7,
        y: 0.3,
        trimStart: 0.5,
        duration: 1.5,
      },
      adv,
    )
  ).b;
  assert.equal(finished.width, 1920);
  assert.equal(finished.height, 1080);
  assert.equal(finished.fps, 25);
  assert.ok(Math.abs(finished.seconds - 1.5) < 0.06);
  assert.equal(finished.mime, 'video/mp4');
  pass(
    'video crop, trim, resolution and target FPS are encoded into final MP4',
  );
  const today = new Date(Date.now() + 18000000).toISOString().slice(0, 10),
    key = randomUUID();
  const draft = {
    action: 'create',
    key,
    name: 'QA campaign',
    surfaceIds: [screen.id],
    start: today,
    end: today,
    from: '00:00',
    to: '24:00',
    assetId: rendered.id,
  };
  const create = (await call('/api/workspace', draft, adv)).b;
  const c = create.campaigns[0];
  assert.equal(c.status, 'draft');
  assert.equal(create.media[c.id], 'image/png');
  assert.ok(
    !(await call('/api/workspace', undefined, op)).b.campaigns.some(
      (x) => x.id === c.id,
    ),
  );
  assert.equal((await call('/api/workspace', undefined, op)).b.media[c.id], undefined);
  await call('/api/workspace', { action: 'technical', id: c.id }, op, 400);
  pass('unsubmitted drafts are invisible and cannot be accepted by the screen owner');
  await call('/api/workspace', draft, adv);
  assert.equal(
    (await call('/api/workspace', undefined, adv)).b.campaigns.length,
    1,
  );
  pass('idempotent creation and durable reservation');
  await call('/api/workspace', { ...draft, key: randomUUID() }, adv, 400);
  pass('full rotation rejects conflicting reservation');
  await call('/api/workspace', { action: 'submit', id: c.id }, adv, 400);
  await call(
    '/api/workspace',
    { action: 'submit', id: c.id, accepted: true },
    adv,
  );
  const ownerWorkspace = (await call('/api/workspace', undefined, op)).b;
  assert.ok(ownerWorkspace.campaigns.some((x) => x.id === c.id && x.status === 'moderation'));
  assert.equal(ownerWorkspace.media[c.id], 'image/png');
  await call(
    '/api/workspace',
    { action: 'submit', id: c.id, accepted: true },
    adv,
    400,
  );
  pass('terms required and conditional charge cannot be repeated');
  const acceptedTerms = (
    await call('/api/contracts?id=' + c.id, undefined, adv)
  ).b;
  assert.match(acceptedTerms, /^УСЛОВИЯ РАЗМЕЩЕНИЯ Maydonlar/);
  assert.doesNotMatch(acceptedTerms, /пилот|тестов|demo|pilot/i);
  assert.match(acceptedTerms, /Деньги не списываются и не переводятся/);
  assert.match(acceptedTerms, /не является электронной подписью/);
  assert.match(acceptedTerms, /Физический экран не подключён/);
  assert.match(acceptedTerms, /Отдельная проверка контента платформой не требуется/);
  pass('placement copy keeps payment, signature and hardware limits explicit');
  await call('/api/workspace', { action: 'content', id: c.id }, admin, 400);
  await call('/api/workspace', { action: 'technical', id: c.id }, admin, 400);
  await call('/api/workspace', { action: 'technical', id: c.id }, op2, 400);
  let status = (await call('/api/workspace', { action: 'technical', id: c.id }, op))
    .b.campaigns[0].status;
  assert.equal(status, 'scheduled');
  await call('/api/workspace', { action: 'technical', id: c.id }, op, 400);
  const legacyState = JSON.parse(db.prepare('SELECT payload FROM state WHERE id=1').get().payload);
  const legacyCampaign = legacyState.campaigns.find((item) => item.id === c.id);
  legacyCampaign.status = 'moderation';
  legacyCampaign.events = legacyCampaign.events.filter((event) => event.action !== 'technical');
  db.prepare('UPDATE state SET payload=? WHERE id=1').run(JSON.stringify(legacyState));
  const unverified = (await call('/api/workspace', undefined, adv)).b.campaigns.find((item) => item.id === c.id);
  assert.equal(unverified.status, 'moderation');
  assert.equal(unverified.technical[screen.id], undefined);
  await call('/api/workspace', { action: 'technical', id: c.id }, op);
  const ownerApprovedState = JSON.parse(db.prepare('SELECT payload FROM state WHERE id=1').get().payload);
  ownerApprovedState.campaigns.find((item) => item.id === c.id).status = 'moderation';
  db.prepare('UPDATE state SET payload=? WHERE id=1').run(JSON.stringify(ownerApprovedState));
  status = (await call('/api/workspace', undefined, adv)).b.campaigns.find((item) => item.id === c.id).status;
  assert.equal(status, 'scheduled');
  assert.equal(
    (await call('/api/contracts?id=' + c.id, undefined, adv)).b,
    acceptedTerms,
  );
  pass('only the screen owner accepts; old owner-approved requests enter the schedule');
  const gridPage = await call('/display/' + screen.id);
  assert.match(gridPage.b, /Efir setkasi/);
  assert.match(gridPage.b, /TOSHKENT VAQTI/);
  const devshowGridPage = await call('/devshow/' + screen.id);
  assert.match(devshowGridPage.b, /Efir setkasi/);
  assert.match(devshowGridPage.b, /TOSHKENT VAQTI/);
  pass('new devshow grid path works while the old display path remains valid');
  await call('/api/display?screen=' + screen.id, undefined, '', 401);
  await call('/api/display?screen=' + screen.id, undefined, op2, 403);
  let grid = (await call('/api/display?screen=' + screen.id, undefined, op)).b;
  assert.equal(grid.items.length, 1);
  assert.equal(grid.items[0].asset, rendered.id);
  const gridMedia = await fetch(base + grid.items[0].url, {
    headers: { Cookie: op },
  });
  assert.equal(gridMedia.status, 200);
  assert.equal(gridMedia.headers.get('content-type'), 'image/png');
  assert.equal(
    (await call('/api/workspace', undefined, op)).b.players.length,
    0,
  );
  pass(
    'owner-only display grid uses current approved media without player heartbeat',
  );
  assert.equal(
    (await call('/api/workspace', undefined, other)).b.campaigns.length,
    0,
  );
  assert.equal((await call('/api/workspace', undefined, other)).b.media[c.id], undefined);
  await call('/api/workspace', { action: 'cancel', id: c.id }, other, 400);
  pass('other advertiser cannot read or change campaign');
  const link = (
    await call('/api/player', { action: 'token', screen: screen.id }, op)
  ).b.url;
  assert.match((await call('/player/' + screen.id)).b, /TOSHKENT VAQTI/);
  const token = link.split('#')[1];
  const headers = { Authorization: 'Bearer ' + token };
  await call('/api/player?screen=' + screen.id, undefined, '', 401);
  let playlist = (
    await call('/api/player?screen=' + screen.id, undefined, '', 200, headers)
  ).b;
  assert.equal(playlist.items.length, 1);
  assert.equal(playlist.items[0].asset, rendered.id);
  pass('private player manifest contains only scheduled creative');
  const media = await fetch(base + playlist.items[0].url, { headers });
  assert.equal(media.status, 200);
  assert.equal(media.headers.get('content-type'), 'image/png');
  const event = {
    action: 'played',
    screen: screen.id,
    campaign: c.id,
    asset: rendered.id,
    eventId: randomUUID(),
    seconds: 15,
  };
  await call('/api/player', event, '', 200, headers);
  await call('/api/player', event, '', 200, headers);
  r = await call('/api/workspace', undefined, adv);
  assert.equal(r.b.campaigns[0].status, 'live');
  assert.equal(r.b.playback[0].count, 1);
  assert.equal(
    r.b.campaigns[0].ledger.filter((x) => x.kind === 'release').length,
    1,
  );
  pass('actual player signal starts campaign exactly once');
  await call(
    '/api/workspace',
    { action: 'pause', id: c.id, note: 'QA pause' },
    op,
  );
  playlist = (
    await call('/api/player?screen=' + screen.id, undefined, '', 200, headers)
  ).b;
  assert.equal(playlist.items.length, 0);
  pass('paused creative removed from player');
  grid = (await call('/api/display?screen=' + screen.id, undefined, op)).b;
  assert.equal(grid.items.length, 0);
  pass('display grid hides paused material');
  r = await call('/api/workspace', { action: 'resume', id: c.id }, op);
  assert.equal(r.b.campaigns[0].status, 'live');
  await call('/api/workspace', { action: 'cancel', id: c.id }, adv, 400);
  pass('resuming live placement cannot bypass refund accounting');
  await call('/api/workspace', { action: 'surface-pause', id: screen.id }, op);
  assert.ok(
    (await call('/api/workspace', undefined, adv)).b.surfaces.some(
      (x) => x.id === screen.id,
    ),
  );
  assert.ok(
    !(await call('/api/workspace')).b.surfaces.some((x) => x.id === screen.id),
  );
  await call('/api/workspace', { action: 'surface-resume', id: screen.id }, op);
  pass(
    'paused surface remains visible only to authorized campaign participants',
  );
  await call(
    '/api/workspace',
    { action: 'dispute', id: c.id, note: 'QA dispute' },
    adv,
  );
  await call(
    '/api/workspace',
    { action: 'resolve', id: c.id, note: 'QA refund' },
    admin,
  );
  r = await call('/api/workspace', undefined, adv);
  assert.deepEqual(
    r.b.campaigns[0].ledger.map((x) => x.kind),
    ['hold', 'release', 'fee', 'reversal', 'fee_reversal', 'refund'],
  );
  pass('dispute reversal and refund ledger');
  // Revised creative requires new acceptance and resets the screen-owner decision.
  const second = (
    await call(
      '/api/workspace',
      { ...draft, key: randomUUID(), name: 'Revision QA' },
      adv,
    )
  ).b.campaigns[0];
  await call(
    '/api/workspace',
    { action: 'submit', id: second.id, accepted: true },
    adv,
  );
  await call(
    '/api/workspace',
    { action: 'revision', id: second.id, note: 'Replace creative' },
    op,
  );
  await call(
    '/api/workspace',
    { action: 'resubmit', id: second.id, assetId: asset.id },
    adv,
    400,
  );
  r = await call(
    '/api/workspace',
    { action: 'resubmit', id: second.id, assetId: asset.id, accepted: true },
    adv,
  );
  assert.equal(r.b.campaigns[0].contracts.length, 2);
  assert.equal(r.b.campaigns[0].content, 'pending');
  assert.deepEqual(r.b.campaigns[0].technical, {});
  pass('revision invalidates approvals and records new terms');
  await call('/api/player', { action: 'token', screen: screen.id }, op);
  await call('/api/player?screen=' + screen.id, undefined, '', 401, headers);
  pass('replaced player token revoked');
  db.prepare(
    "UPDATE users SET role='advertiser' WHERE email='operator@qa.local'",
  ).run();
  await call('/api/workspace', { action: 'technical', id: second.id }, op, 400);
  await call('/api/player', { action: 'token', screen: screen.id }, op, 400);
  pass('demoted operator loses technical approval and player controls');
  db.prepare(
    "UPDATE users SET role='operator' WHERE email='operator@qa.local'",
  ).run();
  async function uploadForOperator(data, name, mime) {
    const form = new FormData();
    form.append('file', new Blob([data], { type: mime }), name);
    const response = await fetch(base + '/api/assets', {
      method: 'POST',
      headers: { Origin: base, Cookie: op },
      body: form,
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  const remoteImage = await uploadForOperator(
    bytes,
    'remote-first.png',
    'image/png',
  );
  const orangePath = resolve(dir, 'remote-second.png');
  await promisify(execFile)(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=orange:s=1920x1080',
      '-frames:v',
      '1',
      orangePath,
    ],
    { windowsHide: true },
  );
  const remoteSecond = await uploadForOperator(
    await readFile(orangePath),
    'remote-second.png',
    'image/png',
  );
  const remoteVideo = await uploadForOperator(
    await readFile(videoPath),
    'remote-video.mp4',
    'video/mp4',
  );
  await call('/api/remote', { action: 'pair', screen: screen.id }, adv, 403);
  await call('/api/remote', { action: 'pair', screen: screen.id }, op2, 403);
  await call('/api/remote?screen=' + screen.id, undefined, '', 401);
  let paired = (
    await call('/api/remote', { action: 'pair', screen: screen.id }, op)
  ).b;
  const remoteHeaders = { Authorization: 'Bearer ' + paired.url.split('#')[1] };
  await call(
    '/api/remote?device=1&screen=' + screen.id,
    undefined,
    '',
    401,
    headers,
  );
  pass(
    'remote control restricted to screen owner; advertising and test tokens are separate',
  );
  const makeCommand = (assetId, revision) => ({
    action: 'show',
    screen: screen.id,
    assetId,
    expectedRevision: revision,
    key: randomUUID(),
  });
  await call('/api/remote', makeCommand(asset.id, paired.revision), op, 400);
  const remoteCommand = makeCommand(remoteImage.id, paired.revision);
  let remoteResult = (await call('/api/remote', remoteCommand, op)).b;
  assert.equal(
    (await call('/api/remote', remoteCommand, op)).b.revision,
    remoteResult.revision,
  );
  await call(
    '/api/remote',
    makeCommand(remoteSecond.id, paired.revision),
    op,
    409,
  );
  const remoteManifest = (
    await call(
      '/api/remote?device=1&screen=' + screen.id,
      undefined,
      '',
      200,
      remoteHeaders,
    )
  ).b;
  assert.equal(remoteManifest.asset.id, remoteImage.id);
  assert.equal(
    (await fetch(base + remoteManifest.asset.url, { headers: remoteHeaders }))
      .status,
    200,
  );
  assert.equal((await fetch(base + remoteManifest.asset.url)).status, 401);
  pass(
    'remote commands are idempotent, protect private files and reject stale edits',
  );
  await call(
    '/api/remote',
    {
      action: 'ack',
      screen: screen.id,
      revision: remoteResult.revision,
      asset: remoteImage.id,
      phase: 'displayed',
    },
    '',
    200,
    remoteHeaders,
  );
  await call(
    '/api/remote',
    {
      action: 'ack',
      screen: screen.id,
      revision: remoteResult.revision,
      asset: remoteImage.id,
      phase: 'received',
    },
    '',
    200,
    remoteHeaders,
  );
  let confirmed = (await call('/api/remote?screen=' + screen.id, undefined, op))
    .b;
  assert.equal(confirmed.applied, remoteResult.revision);
  assert.equal(confirmed.phase, 'displayed');
  assert.equal(confirmed.online, true);
  remoteResult = (
    await call(
      '/api/remote',
      makeCommand(remoteSecond.id, remoteResult.revision),
      op,
    )
  ).b;
  assert.equal(
    (
      await call(
        '/api/remote',
        {
          action: 'ack',
          screen: screen.id,
          revision: remoteResult.revision - 1,
          asset: remoteImage.id,
          phase: 'displayed',
        },
        '',
        200,
        remoteHeaders,
      )
    ).b.accepted,
    false,
  );
  assert.equal(
    (await fetch(base + remoteManifest.asset.url, { headers: remoteHeaders }))
      .status,
    404,
  );
  assert.equal(
    (
      await call(
        '/api/remote?device=1&screen=' + screen.id,
        undefined,
        '',
        200,
        remoteHeaders,
      )
    ).b.asset.id,
    remoteSecond.id,
  );
  pass(
    'new image replaces the desired revision and stale acknowledgements cannot confirm it',
  );
  remoteResult = (
    await call(
      '/api/remote',
      makeCommand(remoteVideo.id, remoteResult.revision),
      op,
    )
  ).b;
  assert.equal(
    (
      await call(
        '/api/remote?device=1&screen=' + screen.id,
        undefined,
        '',
        200,
        remoteHeaders,
      )
    ).b.asset.mime,
    'video/mp4',
  );
  remoteResult = (
    await call(
      '/api/remote',
      {
        action: 'clear',
        screen: screen.id,
        expectedRevision: remoteResult.revision,
        key: randomUUID(),
      },
      op,
    )
  ).b;
  assert.equal(
    (
      await call(
        '/api/remote?device=1&screen=' + screen.id,
        undefined,
        '',
        200,
        remoteHeaders,
      )
    ).b.asset,
    null,
  );
  assert.equal(
    (await call('/api/workspace', undefined, adv)).b.campaigns[0].status,
    'moderation',
  );
  pass(
    'remote MP4 and clear commands work without changing moderated advertising campaigns',
  );
  paired = (
    await call('/api/remote', { action: 'pair', screen: screen.id }, op)
  ).b;
  await call(
    '/api/remote?device=1&screen=' + screen.id,
    undefined,
    '',
    401,
    remoteHeaders,
  );
  db.prepare(
    "UPDATE users SET role='advertiser' WHERE email='operator@qa.local'",
  ).run();
  await call('/api/remote?device=1&screen=' + screen.id, undefined, '', 401, {
    Authorization: 'Bearer ' + paired.url.split('#')[1],
  });
  db.prepare(
    "UPDATE users SET role='operator' WHERE email='operator@qa.local'",
  ).run();
  pass('remote pairing rotation and role revocation disable old player access');
  const perPlaySpec = {
    ...spec,
    name: 'QA per-play LED',
    cityCode: '1726',
    districtCode: '1726273',
    district: 'Mirobod tumani',
    pricingMode: 'per-play',
    tariffs: [
      { seconds: 10, price: 2500 },
      { seconds: 15, price: 3300 },
    ],
    seconds: 30,
  };
  await call(
    '/api/workspace',
    { action: 'surface-save', surface: { ...perPlaySpec, districtCode: 'unknown' }, submit: true },
    op,
    400,
  );
  const perPlaySaved = (
    await call('/api/workspace', { action: 'surface-save', surface: perPlaySpec, submit: true }, op)
  ).b.surfaces.find((item) => item.name === perPlaySpec.name);
  assert.equal(perPlaySaved.cityCode, '1726');
  assert.equal(perPlaySaved.districtCode, '1726273');
  assert.equal(perPlaySaved.price, 2500);
  pass('official city/district selection is validated and per-play tariffs are saved');
  const perPlayDraft = {
    action: 'create',
    key: randomUUID(),
    name: 'QA one play',
    surfaceIds: [perPlaySaved.id],
    start: today,
    end: today,
    from: '00:00',
    to: '24:00',
    assetId: rendered.id,
    playSeconds: 10,
    playsPerDay: 1,
  };
  await call('/api/workspace', { ...perPlayDraft, key: randomUUID(), playsPerDay: 9000 }, adv, 400);
  const perPlayCampaign = (
    await call('/api/workspace', perPlayDraft, adv)
  ).b.campaigns.find((item) => item.name === perPlayDraft.name);
  assert.equal(perPlayCampaign.total, 2500);
  assert.equal(perPlayCampaign.playSeconds, 10);
  await call('/api/workspace', { action: 'submit', id: perPlayCampaign.id, accepted: true }, adv);
  await call('/api/workspace', { action: 'technical', id: perPlayCampaign.id }, op);
  const perPlayToken = (
    await call('/api/player', { action: 'token', screen: perPlaySaved.id }, op)
  ).b.url.split('#')[1];
  const perPlayHeaders = { Authorization: 'Bearer ' + perPlayToken };
  const perPlayItems = (
    await call('/api/player?screen=' + perPlaySaved.id, undefined, '', 200, perPlayHeaders)
  ).b.items;
  assert.equal(perPlayItems.length, 1);
  assert.equal(perPlayItems[0].seconds, 10);
  const perPlayEvent = {
    action: 'played',
    screen: perPlaySaved.id,
    campaign: perPlayCampaign.id,
    asset: rendered.id,
    eventId: randomUUID(),
    seconds: 10,
  };
  assert.equal((await call('/api/player', perPlayEvent, '', 200, perPlayHeaders)).b.remaining, 0);
  assert.equal((await call('/api/player', perPlayEvent, '', 200, perPlayHeaders)).b.remaining, 0);
  const perPlayLedger = (
    await call('/api/workspace', undefined, adv)
  ).b.campaigns.find((item) => item.id === perPlayCampaign.id).ledger;
  assert.equal(perPlayLedger.filter((entry) => entry.kind === 'release').length, 1);
  assert.equal(perPlayLedger.filter((entry) => entry.kind === 'fee').length, 1);
  assert.equal(perPlayLedger.filter((entry) => entry.kind === 'release' || entry.kind === 'fee').reduce((sum, entry) => sum + entry.amount, 0), 2500);
  assert.equal((await call('/api/player?screen=' + perPlaySaved.id, undefined, '', 200, perPlayHeaders)).b.items.length, 0);
  await call('/api/player', { ...perPlayEvent, eventId: randomUUID() }, '', 400, perPlayHeaders);
  pass('one-play pricing, capacity and player quota work end to end');
  await writeFile(
    resolve(dir, 'qa-result.json'),
    JSON.stringify(
      { checks, status: 'passed', at: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`${checks} integration checks passed. Temporary QA data: ${dir}`);
  if (process.env.BROWSER_QA === '1') {
    db.prepare(
      "UPDATE users SET role='operator' WHERE email='operator@qa.local'",
    ).run();
    await call('/api/workspace', { action: 'technical', id: second.id }, op);
    const player = (
      await call('/api/player', { action: 'token', screen: screen.id }, op)
    ).b.url;
    console.log('BROWSER_QA_URL=' + base + player);
    const remotePair = (
      await call('/api/remote', { action: 'pair', screen: screen.id }, op)
    ).b;
    await call(
      '/api/remote',
      makeCommand(remoteImage.id, remotePair.revision),
      op,
    );
    await writeFile(
      resolve(dir, 'remote-fixture.json'),
      JSON.stringify({
        base,
        screen: screen.id,
        cookie: op,
        first: remoteImage.id,
        second: remoteSecond.id,
        video: remoteVideo.id,
        password,
        email: 'operator@qa.local',
      }),
      { mode: 0o600 },
    );
    console.log('REMOTE_QA_URL=' + base + remotePair.url);
    console.log(
      'Browser fixture stays open until this test process is stopped. It uses only temporary QA data.',
    );
    await new Promise(() => {});
  }
  db.close();
} catch (e) {
  console.error(logs.slice(-7000));
  throw e;
} finally {
  proc.kill();
}
