import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { resolve } from 'node:path';

const port = Number(process.env.TEST_PORT || 3218);
const base = `http://127.0.0.1:${port}`;
const oldHosts = ['adspace.fom-analytics.uz', 'maydon.fom-analytics.uz'];
const newHost = 'maydonlar.fom-analytics.uz';
const redirectEnabled = process.env.MAYDON_REDIRECT !== '0';
const child = spawn(process.execPath, ['dist/standalone/server.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(port),
    APP_URL: `https://${newHost}`,
    MAYDON_REDIRECT: redirectEnabled ? '1' : '0',
    ADSPACE_DATA_DIR: resolve('.local/qa-domain-' + Date.now()),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let logs = '';
child.stdout.on('data', (chunk) => (logs += chunk));
child.stderr.on('data', (chunk) => (logs += chunk));

async function request(path, host, options = {}) {
  return new Promise((resolve, reject) => {
    const call = httpRequest(
      base + path,
      {
        method: options.method || 'GET',
        headers: { Host: host, ...options.headers },
      },
      (incoming) => {
        const chunks = [];
        incoming.on('data', (chunk) => chunks.push(chunk));
        incoming.on('end', () => {
          const headers = new Headers();
          for (const [name, value] of Object.entries(incoming.headers)) {
            if (value)
              headers.set(name, Array.isArray(value) ? value.join(', ') : value);
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: incoming.statusCode,
              headers,
            }),
          );
        });
        incoming.on('error', reject);
      },
    );
    call.on('error', reject);
    call.end(options.body);
  });
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await request('/api/health', newHost);
      ready = response.ok;
      if (ready) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.ok(ready, 'Server did not start: ' + logs);

  for (const oldHost of oldHosts) {
    const oldPage = await request('/?view=catalog&occasion=photo', oldHost, {
      headers: { Accept: 'text/html' },
    });
    if (redirectEnabled) {
      assert.equal(oldPage.status, 307);
      assert.equal(
        oldPage.headers.get('location'),
        `https://${newHost}/?view=catalog&occasion=photo`,
      );
      assert.equal(oldPage.headers.get('cache-control'), 'no-store');
    } else {
      assert.equal(oldPage.status, 200);
    }
    for (const path of ['/player/screen-1', '/screen/screen-1']) {
      const response = await request(path, oldHost, {
        headers: { Accept: 'text/html' },
      });
      assert.equal(response.status, 200);
    }
    assert.equal(
      (await request('/api/health', oldHost, {
        headers: { Accept: 'text/html' },
      })).status,
      200,
    );
    console.log(`PASS ${oldHost} keeps player and API links; page redirect=${redirectEnabled}`);
  }

  assert.equal(
    (await request('/', newHost, { headers: { Accept: 'text/html' } })).status,
    200,
  );
  console.log('PASS new domain renders the site');

  async function mutation(host, origin) {
    const response = await request('/api/remote', host, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: '{}',
    });
    return { status: response.status, body: await response.json() };
  }
  for (const oldHost of oldHosts)
    assert.equal((await mutation(oldHost, `https://${oldHost}`)).status, 401);
  assert.equal(
    (await mutation(newHost, `https://${newHost}`)).status,
    401,
  );
  for (const oldHost of oldHosts) {
    const forged = await mutation(newHost, `https://${oldHost}`);
    assert.equal(forged.status, 403);
    assert.equal(forged.body.error, 'Недопустимый источник запроса');
    assert.equal((await mutation(oldHost, `https://${newHost}`)).status, 403);
  }
  console.log('PASS all same-host origins work; cross-host mutation is rejected');
} finally {
  child.kill();
  if (child.exitCode === null && child.signalCode === null)
    await new Promise((resolve) => child.once('exit', resolve));
}
