import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { surfaces } from './catalog';
import type { State, User } from './model';
export const dataDir = resolve(
  process.env.ADSPACE_DATA_DIR || '.local/server-data',
);
let db: DatabaseSync;
export function database() {
  if (db) return db;
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  db = new DatabaseSync(resolve(dataDir, 'adspace.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,organization TEXT NOT NULL,password TEXT NOT NULL,verified INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS phone_challenges(token TEXT PRIMARY KEY,phone TEXT NOT NULL,role TEXT NOT NULL,code TEXT NOT NULL,expires INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS phone_devices(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),phone TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,width INTEGER,height INTEGER,seconds REAL,size INTEGER,hash TEXT,fps REAL);
    CREATE TABLE IF NOT EXISTS players(screen TEXT PRIMARY KEY,token TEXT NOT NULL,last_seen TEXT);
    CREATE TABLE IF NOT EXISTS remote_screens(screen TEXT PRIMARY KEY,token TEXT,asset TEXT,revision INTEGER NOT NULL DEFAULT 0,applied INTEGER NOT NULL DEFAULT 0,last_seen TEXT,phase TEXT NOT NULL DEFAULT 'waiting',error TEXT NOT NULL DEFAULT '',updated_at TEXT,actor TEXT);
    CREATE TABLE IF NOT EXISTS remote_events(id TEXT PRIMARY KEY,screen TEXT NOT NULL,revision INTEGER NOT NULL,action TEXT NOT NULL,asset TEXT,at TEXT NOT NULL,actor TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS playback(id TEXT PRIMARY KEY,screen TEXT,campaign TEXT,asset TEXT,at TEXT,seconds REAL);
    CREATE INDEX IF NOT EXISTS playback_campaign ON playback(campaign,at);
    CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER,expires INTEGER);`);
  if (!db.prepare('SELECT id FROM state WHERE id=1').get()) {
    const seed: State = {
      surfaces: surfaces.map((s) => ({
        ...s,
        owner: 'demo',
        status: 'published',
        demo: true,
        photoId: '',
        fps: 25,
        maxMb: 25,
        formats: ['image/png', 'image/jpeg', 'video/mp4'],
        opens: '00:00',
        closes: '24:00',
        slots: 6,
        note: 'Демонстрационная поверхность',
        events: [],
      })),
      campaigns: [],
      blocked: [],
      unavailable: [],
      commission: 15,
    };
    db.prepare('INSERT OR IGNORE INTO state VALUES(1,?)').run(
      JSON.stringify(seed),
    );
  }
  return db;
}
export function state(): State {
  return JSON.parse(
    (
      database().prepare('SELECT payload FROM state WHERE id=1').get() as {
        payload: string;
      }
    ).payload,
  );
}
export function transaction<T>(fn: (s: State) => T): T {
  const d = database();
  d.exec('BEGIN IMMEDIATE');
  try {
    const s = state();
    const result = fn(s);
    d.prepare('UPDATE state SET payload=? WHERE id=1').run(JSON.stringify(s));
    d.exec('COMMIT');
    return result;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}
export function userById(id: string): User | undefined {
  return database()
    .prepare(
      'SELECT id,email,name,role,organization,verified FROM users WHERE id=?',
    )
    .get(id) as User | undefined;
}
