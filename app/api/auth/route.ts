import {
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { database, userById } from '@/lib/store';
import {
  body,
  cookie,
  digest,
  failure,
  HttpError,
  json,
  limit,
  newSession,
  namedCookie,
  passwordHash,
  passwordMatches,
  requestCookie,
  sameOrigin,
  sessionUser,
} from '@/lib/auth';
const phoneDeviceAge = 90 * 24 * 60 * 60;
function phoneNumber(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  const normalized =
    digits.length === 9
      ? '998' + digits
      : digits.length === 10 && digits.startsWith('0')
        ? '998' + digits.slice(1)
        : digits;
  if (!/^998\d{9}$/.test(normalized))
    throw Error('Укажите номер Узбекистана в формате +998 90 123 45 67');
  return '+' + normalized;
}
function authResponse(user: ReturnType<typeof userById>, cookies: string[]) {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return Response.json({ user }, { headers });
}
export function GET(req: Request) {
  return json({ user: sessionUser(req) || null });
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const b = JSON.parse((await body(req)).toString());
    if (b.action === 'logout') {
      const token = requestCookie(req, 'adspace_session');
      if (token)
        database()
          .prepare('DELETE FROM sessions WHERE token=?')
          .run(digest(token));
      return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
    }
    if (b.action === 'phone-start') {
      const phone = phoneNumber(b.phone);
      if (!['advertiser', 'operator'].includes(b.role))
        throw Error('Выберите кабинет');
      limit('phone:' + phone, 5, 3600);
      limit('phone-total', 100, 900);
      const token = randomBytes(32).toString('hex');
      const code = String(randomInt(0, 1000000)).padStart(6, '0');
      const db = database();
      db.prepare('DELETE FROM phone_challenges WHERE expires<?').run(
        Date.now(),
      );
      db.prepare('INSERT INTO phone_challenges VALUES(?,?,?,?,?,0)').run(
        digest(token),
        phone,
        b.role,
        digest(token + ':' + code),
        Date.now() + 600000,
      );
      const headers = new Headers({ 'Cache-Control': 'no-store' });
      headers.append(
        'Set-Cookie',
        namedCookie('adspace_phone_challenge', token, 600),
      );
      return Response.json({ phone, code, expiresIn: 600 }, { headers });
    }
    if (b.action === 'phone-complete') {
      const token = requestCookie(req, 'adspace_phone_challenge');
      const code = String(b.code || '');
      if (!token || !/^\d{6}$/.test(code))
        throw new HttpError(400, 'Начните вход по телефону заново');
      const db = database();
      const challenge = db
        .prepare(
          'SELECT phone,role,code,expires,attempts FROM phone_challenges WHERE token=?',
        )
        .get(digest(token)) as
        | {
            phone: string;
            role: 'advertiser' | 'operator';
            code: string;
            expires: number;
            attempts: number;
          }
        | undefined;
      if (
        !challenge ||
        challenge.expires < Date.now() ||
        challenge.attempts >= 5
      )
        throw new HttpError(400, 'Код истёк. Получите новый');
      const expected = Buffer.from(challenge.code, 'hex');
      const received = Buffer.from(digest(token + ':' + code), 'hex');
      if (!timingSafeEqual(received, expected)) {
        db.prepare(
          'UPDATE phone_challenges SET attempts=attempts+1 WHERE token=?',
        ).run(digest(token));
        throw new HttpError(400, 'Код не совпадает');
      }
      db.prepare('DELETE FROM phone_challenges WHERE token=?').run(
        digest(token),
      );
      const previousDevice = requestCookie(req, 'adspace_phone_device');
      const device = previousDevice
        ? (db
            .prepare(
              'SELECT user_id,phone FROM phone_devices WHERE token=? AND expires>?',
            )
            .get(digest(previousDevice), Date.now()) as
            | { user_id: string; phone: string }
            | undefined)
        : undefined;
      let user =
        device?.phone === challenge.phone
          ? userById(device.user_id)
          : undefined;
      if (user && user.role !== challenge.role)
        throw new HttpError(403, 'Для этого номера выбран другой кабинет');
      if (!user) {
        const id = randomUUID();
        const name =
          String(b.name || '')
            .trim()
            .slice(0, 100) || 'Maydonlar · ' + challenge.phone.slice(-4);
        db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,0)').run(
          id,
          'phone-' + id + '@maydon.local',
          name,
          challenge.role,
          name,
          passwordHash(randomBytes(32).toString('base64url')),
        );
        user = userById(id)!;
      }
      const deviceToken = randomBytes(32).toString('hex');
      db.prepare('DELETE FROM phone_devices WHERE expires<?').run(Date.now());
      if (previousDevice)
        db.prepare('DELETE FROM phone_devices WHERE token=?').run(
          digest(previousDevice),
        );
      db.prepare('INSERT INTO phone_devices VALUES(?,?,?,?)').run(
        digest(deviceToken),
        user.id,
        challenge.phone,
        Date.now() + phoneDeviceAge * 1000,
      );
      return authResponse(user, [
        cookie(newSession(user)),
        namedCookie('adspace_phone_device', deviceToken, phoneDeviceAge),
        namedCookie('adspace_phone_challenge', '', 0),
      ]);
    }
    const email = String(b.email || '')
      .trim()
      .toLowerCase();
    const password = String(b.password || '');
    if (
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
      email.length > 254 ||
      password.length < 10 ||
      password.length > 200
    )
      throw Error('Укажите email и пароль от 10 до 200 символов');
    limit('auth:' + email, 12, 900);
    limit('auth-total', 200, 900);
    let u;
    if (b.action === 'register') {
      if (!['advertiser', 'operator'].includes(b.role))
        throw Error('Выберите роль');
      const name = String(b.name || '').trim();
      const organization = String(b.organization || name).trim();
      if (!name || name.length > 100 || organization.length > 150)
        throw Error('Укажите имя и организацию');
      if (database().prepare('SELECT id FROM users WHERE email=?').get(email))
        throw Error('Этот email уже зарегистрирован. Войдите в аккаунт.');
      const id = randomUUID();
      database()
        .prepare('INSERT INTO users VALUES(?,?,?,?,?,?,0)')
        .run(id, email, name, b.role, organization, passwordHash(password));
      u = userById(id)!;
    } else if (b.action === 'login') {
      const row = database()
        .prepare('SELECT id,password FROM users WHERE email=?')
        .get(email) as { id: string; password: string } | undefined;
      const dummy = '00000000000000000000000000000000:' + '00'.repeat(64);
      const ok = passwordMatches(password, row?.password || dummy);
      if (!row || !ok) throw new HttpError(401, 'Неверный email или пароль');
      u = userById(row.id)!;
    } else throw Error('Неизвестное действие');
    return json({ user: u }, 200, { 'Set-Cookie': cookie(newSession(u)) });
  } catch (e) {
    return failure(e);
  }
}
