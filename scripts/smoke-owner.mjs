import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const origin = process.env.APP_URL;
assert.ok(origin, 'APP_URL is required');
const base = process.env.CHECK_URL || origin;
const access = await readFile(resolve(process.env.ADSPACE_DATA_DIR || '.local/server-data', 'pilot-access.txt'), 'utf8');
const email = access.match(/^Email: (.+)$/m)?.[1];
const password = access.match(/^Password: (.+)$/m)?.[1];
assert.ok(email && password, 'Private owner access file is missing required fields');
const login = await fetch(base + '/api/auth', {method:'POST', headers:{Origin:origin,'Content-Type':'application/json'}, body:JSON.stringify({action:'login',email,password})});
assert.equal(login.status, 200, 'Owner login failed');
const cookie = login.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie, 'Session cookie missing');
try {
  assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
  if (origin.startsWith('https:')) assert.ok(login.headers.get('set-cookie').includes('Secure'));
  const r = await fetch(base + '/api/workspace', {headers:{Cookie:cookie}});
  assert.equal(r.status, 200);
  const workspace = await r.json();
  assert.equal(workspace.user.role, 'admin');
  assert.ok(workspace.users.some(x => x.email === email));
  console.log('Owner authentication, secure session and administrator permissions verified.');
} finally {
  const logout = await fetch(base + '/api/auth', {method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({action:'logout'})});
  assert.equal(logout.status, 200);
}
