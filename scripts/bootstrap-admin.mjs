import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const dir = resolve(process.env.ADSPACE_DATA_DIR || '.local/server-data');
const db = new DatabaseSync(resolve(dir, 'adspace.sqlite'));
if (db.prepare("SELECT id FROM users WHERE role='admin'").get()) {
  console.log('An administrator already exists; unchanged.');
  process.exit(0);
}
const password = randomBytes(20).toString('base64url'),
  salt = randomBytes(16).toString('hex'),
  email = 'owner@adspace.local';
db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,1)').run(
  randomUUID(),
  email,
  'Владелец AdSpace',
  'admin',
  'AdSpace',
  salt + ':' + scryptSync(password, salt, 64).toString('hex'),
);
writeFileSync(
  resolve(dir, 'pilot-access.txt'),
  `Maydonlar\nURL: ${process.env.APP_URL || 'http://localhost:3100'}/login\nEmail: ${email}\nPassword: ${password}\n\nKeep this file private. Users register their own advertiser/operator accounts. The administrator assigns moderator access in Management.\n`,
  { mode: 0o600 },
);
console.log(
  'Administrator created. Credentials saved privately in data/pilot-access.txt.',
);
