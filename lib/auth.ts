import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { database, userById } from './store';
import type { User } from './model';
export function digest(v: string | Uint8Array) {
  return createHash('sha256').update(v).digest('hex');
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function passwordMatches(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const got = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === got.length && timingSafeEqual(got, expected);
}
export function sessionUser(req: Request): User | undefined {
  const token = requestCookie(req, 'adspace_session');
  if (!token) return;
  const row = database()
    .prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?')
    .get(digest(token), Date.now()) as { user_id: string } | undefined;
  return row ? userById(row.user_id) : undefined;
}
export function mustUser(req: Request) {
  const u = sessionUser(req);
  if (!u) throw new HttpError(401, 'Войдите в аккаунт');
  return u;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(req: Request) {
  const expected = process.env.APP_URL || new URL(req.url).origin;
  const origin = req.headers.get('origin');
  const host = req.headers.get('host')?.toLowerCase();
  const primarySameHost =
    origin === new URL(expected).origin && host === new URL(expected).host;
  const legacySameHost =
    (host === 'adspace.fom-analytics.uz' ||
      host === 'maydon.fom-analytics.uz') &&
    origin === `https://${host}`;
  if (!primarySameHost && !legacySameHost)
    throw new HttpError(403, 'Недопустимый источник запроса');
}
export function requestCookie(req: Request, name: string) {
  return req.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + '='))
    ?.slice(name.length + 1);
}
export function limit(key: string, max: number, seconds: number) {
  const d = database();
  const now = Date.now();
  d.prepare('DELETE FROM attempts WHERE expires<?').run(now);
  d.prepare(
    'INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',
  ).run(key, now + seconds * 1000);
  const row = d.prepare('SELECT count FROM attempts WHERE key=?').get(key) as {
    count: number;
  };
  if (row.count > max)
    throw new HttpError(429, 'Слишком много попыток. Повторите позже.');
}
export function namedCookie(name: string, token: string, age: number) {
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${process.env.APP_URL?.startsWith('https:') ? '; Secure' : ''}`;
}
export function cookie(token: string, age = 604800) {
  return namedCookie('adspace_session', token, age);
}
export function newSession(u: User) {
  const token = randomBytes(32).toString('hex');
  database().prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  database()
    .prepare('INSERT INTO sessions VALUES(?,?,?)')
    .run(digest(token), u.id, Date.now() + 604800000);
  return token;
}
export function json(
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}
export function failure(e: unknown) {
  return json(
    { error: e instanceof Error ? e.message : 'Ошибка запроса' },
    e instanceof HttpError ? e.status : 400,
  );
}
export async function body(req: Request, max = 32768) {
  const reader = req.body?.getReader();
  if (!reader) throw Error('Пустой запрос');
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, 'Слишком большой запрос');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
