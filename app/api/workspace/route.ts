import {
  body,
  failure,
  json,
  mustUser,
  sameOrigin,
  sessionUser,
} from '@/lib/auth';
import { database, state, transaction } from '@/lib/store';
import { apply, maintain, owns, sees, staff } from '@/lib/workflow';
import type { Asset, State, User } from '@/lib/model';
function visible(s: State, u?: User) {
  const campaigns = u ? s.campaigns.filter((c) => sees(u, c, s)) : [];
  const assetMime = database().prepare('SELECT mime FROM assets WHERE id=?');
  return {
    ...s,
    surfaces: s.surfaces.filter(
      (x) =>
        x.status === 'published' ||
        (u && (staff(u) || owns(u, x))) ||
        campaigns.some((c) => c.surfaceIds.includes(x.id)),
    ),
    campaigns,
    media: Object.fromEntries(
      campaigns.map((campaign) => [
        campaign.id,
        (assetMime.get(campaign.assetId) as { mime?: string } | undefined)?.mime || '',
      ]),
    ),
    reservations: s.campaigns
      .filter((c) => !['cancelled', 'completed', 'expired'].includes(c.status))
      .map((c) => ({
        id: c.id,
        surfaceIds: c.surfaceIds,
        start: c.start,
        end: c.end,
        from: c.from,
        to: c.to,
        status: c.status,
      })),
    users:
      u?.role === 'admin'
        ? database()
            .prepare(
              'SELECT id,email,name,role,organization,verified FROM users ORDER BY rowid DESC',
            )
            .all()
        : [],
    players: u
      ? database()
          .prepare('SELECT screen,last_seen FROM players')
          .all()
          .filter(
            (p: any) =>
              staff(u) ||
              s.surfaces.some((x) => x.id === p.screen && owns(u, x)),
          )
      : [],
    playback: u
      ? database()
          .prepare(
            'SELECT campaign,COUNT(*) count,MAX(at) last FROM playback GROUP BY campaign',
          )
          .all()
          .filter((p: any) => campaigns.some((c) => c.id === p.campaign))
      : [],
    user: u || null,
  };
}
export function GET(req: Request) {
  try {
    transaction((s) => maintain(s));
    return json(visible(state(), sessionUser(req)));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = mustUser(req);
    const b = JSON.parse((await body(req)).toString());
    if (b.action === 'user-role') {
      if (
        u.role !== 'admin' ||
        u.id === b.id ||
        !['advertiser', 'operator', 'moderator', 'admin'].includes(b.role)
      )
        throw Error('Изменение роли недоступно');
      database()
        .prepare('UPDATE users SET role=?,verified=1 WHERE id=?')
        .run(b.role, b.id);
    } else
      transaction((s) =>
        apply(
          s,
          u,
          b,
          (id) =>
            database().prepare('SELECT * FROM assets WHERE id=?').get(id) as
              | Asset
              | undefined,
        ),
      );
    return json(visible(state(), u));
  } catch (e) {
    return failure(e);
  }
}
