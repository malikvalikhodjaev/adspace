import { digest, HttpError } from './auth';
import { database, state, userById } from './store';
import { owns } from './workflow';
import type { User } from './model';
export type RemoteScreen = {
  screen: string;
  token: string | null;
  asset: string | null;
  revision: number;
  applied: number;
  last_seen: string | null;
  phase: string;
  error: string;
  updated_at: string | null;
  actor: string | null;
};
export function remoteState(screen: string) {
  return database()
    .prepare('SELECT * FROM remote_screens WHERE screen=?')
    .get(screen) as RemoteScreen | undefined;
}
export function controlAccess(u: User, screen: string) {
  const s = state(),
    surface = s.surfaces.find((x) => x.id === screen);
  if (
    !surface ||
    !owns(u, surface) ||
    s.blocked.includes(u.id) ||
    s.blocked.includes(surface.owner)
  )
    throw new HttpError(403, 'Нет доступа к управлению этим экраном');
  return surface;
}
export function remoteAuthorized(req: Request, screen: string) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /, ''),
    row = remoteState(screen);
  if (!token || !row?.token || digest(token) !== row.token || !row.actor)
    return;
  const issuer = userById(row.actor);
  if (!issuer) return;
  try {
    controlAccess(issuer, screen);
  } catch {
    return;
  }
  return row;
}
export function remoteStatus(screen: string) {
  const r = remoteState(screen);
  return {
    screen,
    paired: !!r?.token,
    assetId: r?.asset || null,
    revision: r?.revision || 0,
    applied: r?.applied || 0,
    lastSeen: r?.last_seen || null,
    phase: r?.phase || 'waiting',
    error: r?.error || '',
    updatedAt: r?.updated_at || null,
    online: !!r?.last_seen && Date.now() - Date.parse(r.last_seen) < 10000,
    events: database()
      .prepare(
        'SELECT revision,action,asset,at FROM remote_events WHERE screen=? ORDER BY rowid DESC LIMIT 12',
      )
      .all(screen),
  };
}
