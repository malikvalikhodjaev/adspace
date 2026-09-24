import { randomBytes } from 'node:crypto';
import { body, digest, failure, json, mustUser, sameOrigin } from '@/lib/auth';
import { assetById } from '@/lib/assets';
import { database, state, transaction } from '@/lib/store';
import { activeAt } from '@/lib/model';
import { maintain, markPlayed, owns } from '@/lib/workflow';
import { playerAuthorized } from '@/lib/player';
import { remainingPlays, playbackDue } from '@/lib/playback';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const b = JSON.parse((await body(req)).toString());
    const screen = String(b.screen || '');
    if (b.action === 'token') {
      const u = mustUser(req);
      const s = state().surfaces.find((x) => x.id === screen);
      if (!s || !owns(u, s)) throw Error('Нет доступа к экрану');
      const token = randomBytes(32).toString('hex');
      database()
        .prepare(
          'INSERT INTO players(screen,token) VALUES(?,?) ON CONFLICT(screen) DO UPDATE SET token=excluded.token',
        )
        .run(screen, digest(token));
      return json({ url: '/player/' + screen + '#' + token });
    }
    if (!playerAuthorized(req, screen))
      return json({ error: 'Плеер не авторизован' }, 401);
    if (b.action === 'played') {
      if (typeof b.eventId !== 'string' || !/^[a-f0-9-]{36}$/.test(b.eventId))
        throw Error('Неверный идентификатор события');
      let remaining: number | null = null;
      transaction((s) => {
        maintain(s);
        const c = s.campaigns.find((x) => x.id === b.campaign);
        if (!c || c.assetId !== b.asset) throw Error('Материал изменился');
        if (c.playSeconds && Number(b.seconds) !== c.playSeconds)
          throw Error('Длительность показа не соответствует брони');
        const existing = database().prepare('SELECT id FROM playback WHERE id=?').get(b.eventId);
        if (!existing) {
          remaining = remainingPlays(screen, c);
          if (remaining === 0) throw Error('Лимит показов на сегодня достигнут');
          if (!playbackDue(screen, c))
            throw Error('Следующий показ ещё не наступил');
          markPlayed(s, screen, c.id);
          database()
            .prepare('INSERT INTO playback VALUES(?,?,?,?,?,?)')
            .run(b.eventId, screen, c.id, c.assetId, new Date().toISOString(), Number(b.seconds) || 0);
        }
        remaining = remainingPlays(screen, c);
      });
      database()
        .prepare('UPDATE players SET last_seen=? WHERE screen=?')
        .run(new Date().toISOString(), screen);
      return json({ ok: true, remaining });
    }
    database()
      .prepare('UPDATE players SET last_seen=? WHERE screen=?')
      .run(new Date().toISOString(), screen);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export function GET(req: Request) {
  try {
    const screen = new URL(req.url).searchParams.get('screen') || '';
    if (!playerAuthorized(req, screen))
      return json({ error: 'Плеер не авторизован' }, 401);
    transaction((s) => maintain(s));
    const s = state(),
      surface = s.surfaces.find((x) => x.id === screen);
    if (!surface) throw Error('Экран не найден');
    database()
      .prepare('UPDATE players SET last_seen=? WHERE screen=?')
      .run(new Date().toISOString(), screen);
    const items =
      surface.status !== 'published' || s.blocked.includes(surface.owner)
        ? []
        : s.campaigns
            .filter((c) => activeAt(c) && c.surfaceIds.includes(screen) && playbackDue(screen, c))
            .map((c) => {
              const a = assetById(c.assetId)!;
              return {
                campaign: c.id,
                asset: a.id,
                mime: a.mime,
                seconds: c.playSeconds || a.seconds || surface.seconds,
                perPlay: !!c.playsPerDay,
                url: '/api/player/media?screen=' + screen + '&id=' + a.id,
              };
            });
    return json({
      screen: surface.name,
      width: surface.width,
      height: surface.height,
      serverTime: new Date().toISOString(),
      expires: (Math.floor(Date.now() / 60000) + 1) * 60000,
      items,
    });
  } catch (e) {
    return failure(e);
  }
}
