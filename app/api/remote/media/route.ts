import { readFile } from 'node:fs/promises';
import { assetById, assetPath } from '@/lib/assets';
import { remoteAuthorized } from '@/lib/remote';
export async function GET(req: Request) {
  const url = new URL(req.url),
    screen = url.searchParams.get('screen') || '',
    id = url.searchParams.get('id') || '',
    r = remoteAuthorized(req, screen);
  if (!r) return new Response('Unauthorized', { status: 401 });
  if (r.asset !== id) return new Response('Not found', { status: 404 });
  const a = assetById(id);
  if (!a) return new Response('Not found', { status: 404 });
  return new Response(await readFile(assetPath(id)), {
    headers: {
      'Content-Type': a.mime,
      'Content-Length': String(a.size),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
