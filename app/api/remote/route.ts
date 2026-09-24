import { randomBytes, randomUUID } from 'node:crypto';
import {
  body,
  digest,
  failure,
  HttpError,
  json,
  limit,
  mustUser,
  sameOrigin,
} from '@/lib/auth';
import { assetById } from '@/lib/assets';
import { database, transaction } from '@/lib/store';
import {
  controlAccess,
  remoteAuthorized,
  remoteState,
  remoteStatus,
} from '@/lib/remote';
export function GET(req: Request) {
  try {
    const url = new URL(req.url),
      screen = url.searchParams.get('screen') || '';
    if (url.searchParams.get('device') === '1') {
      const r = remoteAuthorized(req, screen);
      if (!r) throw new HttpError(401, 'Ссылка экрана недействительна');
      database()
        .prepare('UPDATE remote_screens SET last_seen=? WHERE screen=?')
        .run(new Date().toISOString(), screen);
      const a = r.asset ? assetById(r.asset) : undefined;
      return json({
        screen,
        revision: r.revision,
        expires: Date.now() + 60000,
        serverTime: Date.now(),
        asset: a
          ? {
              id: a.id,
              mime: a.mime,
              name: a.name,
              url: '/api/remote/media?screen=' + screen + '&id=' + a.id,
            }
          : null,
      });
    }
    const surface = controlAccess(mustUser(req), screen);
    return json({
      ...remoteStatus(screen),
      name: surface.name,
      width: surface.width,
      height: surface.height,
      maxMb: surface.maxMb,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const b = JSON.parse((await body(req)).toString()),
      screen = String(b.screen || '');
    if (b.action === 'ack') {
      const r = remoteAuthorized(req, screen);
      if (!r) throw new HttpError(401, 'Ссылка экрана недействительна');
      if (
        !Number.isSafeInteger(b.revision) ||
        !['received', 'displayed', 'error'].includes(b.phase)
      )
        throw Error('Некорректное подтверждение');
      if (b.revision !== r.revision || (b.asset || null) !== r.asset)
        return json({ accepted: false });
      if (b.phase === 'received' && r.applied === r.revision)
        return json({ accepted: true });
      const error =
        b.phase === 'error'
          ? String(b.error || 'Ошибка воспроизведения').slice(0, 250)
          : '';
      const result = database()
        .prepare(
          "UPDATE remote_screens SET phase=?,error=?,last_seen=?,applied=CASE WHEN ?='displayed' THEN ? ELSE applied END WHERE screen=? AND revision=?",
        )
        .run(
          b.phase,
          error,
          new Date().toISOString(),
          b.phase,
          b.revision,
          screen,
          b.revision,
        );
      return json({ accepted: result.changes > 0 });
    }
    const u = mustUser(req),
      surface = controlAccess(u, screen);
    if (!['pair', 'show', 'clear'].includes(b.action))
      throw Error('Неизвестная команда');
    limit('remote-command:' + u.id, 60, 60);
    const token = b.action === 'pair' ? randomBytes(32).toString('hex') : null;
    const asset =
      b.action === 'show' ? assetById(String(b.assetId)) : undefined;
    if (
      b.action === 'show' &&
      (!asset ||
        asset.owner !== u.id ||
        !['image/png', 'image/jpeg', 'video/mp4'].includes(asset.mime) ||
        asset.size > Math.min(25, surface.maxMb) * 1048576)
    )
      throw Error(
        'Выберите свой PNG/JPG или MP4 в пределах лимита экрана (до 25 МБ)',
      );
    transaction(() => {
      const d = database(),
        r = remoteState(screen),
        now = new Date().toISOString();
      if (b.action !== 'pair') {
        if (typeof b.key !== 'string' || !/^[a-f0-9-]{36}$/.test(b.key))
          throw Error('Некорректный идентификатор команды');
        const old = d
          .prepare(
            'SELECT screen,actor,action,asset FROM remote_events WHERE id=?',
          )
          .get(b.key) as any;
        if (old) {
          if (
            old.screen !== screen ||
            old.actor !== u.id ||
            old.action !== b.action ||
            (old.asset || null) !== (asset?.id || null)
          )
            throw new HttpError(409, 'Идентификатор команды уже использован');
          return;
        }
        if (
          !Number.isSafeInteger(b.expectedRevision) ||
          b.expectedRevision !== (r?.revision || 0)
        )
          throw new HttpError(
            409,
            'Экран уже изменён в другом окне. Проверьте текущую команду и повторите.',
          );
      }
      const revision = (r?.revision || 0) + 1,
        assetId = b.action === 'pair' ? r?.asset || null : asset?.id || null;
      d.prepare(
        "INSERT INTO remote_screens(screen,token,asset,revision,updated_at,actor) VALUES(?,?,?,?,?,?) ON CONFLICT(screen) DO UPDATE SET token=excluded.token,asset=excluded.asset,revision=excluded.revision,phase='waiting',error='',updated_at=excluded.updated_at,actor=excluded.actor",
      ).run(
        screen,
        token ? digest(token) : r?.token || null,
        assetId,
        revision,
        now,
        u.id,
      );
      if (token)
        d.prepare(
          'UPDATE remote_screens SET applied=0,last_seen=NULL WHERE screen=?',
        ).run(screen);
      d.prepare('INSERT INTO remote_events VALUES(?,?,?,?,?,?,?)').run(
        b.action === 'pair' ? randomUUID() : b.key,
        screen,
        revision,
        b.action,
        assetId,
        now,
        u.id,
      );
    });
    return json({
      ...remoteStatus(screen),
      ...(token ? { url: '/screen/' + screen + '#' + token } : {}),
    });
  } catch (e) {
    return failure(e);
  }
}
