import { assetById } from '@/lib/assets';
import { json, sessionUser } from '@/lib/auth';
import { activeAt } from '@/lib/model';
import { state, transaction } from '@/lib/store';
import { maintain, owns } from '@/lib/workflow';
import { playbackDue } from '@/lib/playback';

export function GET(req: Request) {
  const user = sessionUser(req);
  if (!user) return json({ error: 'Войдите в кабинет владельца' }, 401);

  const screen = new URL(req.url).searchParams.get('screen') || '';
  transaction((current) => maintain(current));
  const current = state();
  const surface = current.surfaces.find((item) => item.id === screen);
  if (!surface || !owns(user, surface))
    return json({ error: 'Нет доступа к экрану' }, 403);

  const items =
    surface.status !== 'published' || current.blocked.includes(surface.owner)
      ? []
      : current.campaigns
          .filter(
            (campaign) =>
              activeAt(campaign) && campaign.surfaceIds.includes(screen) && playbackDue(screen, campaign),
          )
          .flatMap((campaign) => {
            const asset = assetById(campaign.assetId);
            return asset
              ? [
                  {
                    campaign: campaign.id,
                    name: campaign.name,
                    asset: asset.id,
                    mime: asset.mime,
                    seconds: campaign.playSeconds || asset.seconds || surface.seconds,
                    url: '/api/assets?id=' + encodeURIComponent(asset.id),
                  },
                ]
              : [];
          });

  return json(
    {
      screen: surface.name,
      serverTime: new Date().toISOString(),
      expires: (Math.floor(Date.now() / 60000) + 1) * 60000,
      items,
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
}
