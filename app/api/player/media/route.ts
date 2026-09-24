import { readFile } from 'node:fs/promises';
import { assetById, assetPath } from '@/lib/assets';
import { playerAuthorized } from '@/lib/player';
import { state } from '@/lib/store';
import { activeAt } from '@/lib/model';
export async function GET(req: Request) {
  const url = new URL(req.url),
    screen = url.searchParams.get('screen') || '',
    id = url.searchParams.get('id') || '';
  if (!playerAuthorized(req, screen))
    return new Response('Unauthorized', { status: 401 });
  const s = state(),
    surface = s.surfaces.find((x) => x.id === screen);
  if (
    !surface ||
    surface.status !== 'published' ||
    s.blocked.includes(surface.owner) ||
    !s.campaigns.some(
      (c) => activeAt(c) && c.assetId === id && c.surfaceIds.includes(screen),
    )
  )
    return new Response('Not found', { status: 404 });
  const a = assetById(id);
  if (!a) return new Response('Not found', { status: 404 });
  const bytes = await readFile(assetPath(id));
  return new Response(bytes, {
    headers: {
      'Content-Type': a.mime,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
