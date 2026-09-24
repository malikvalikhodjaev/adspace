import type { NextRequest } from 'next/server';

const previousHosts = new Set([
  'adspace.fom-analytics.uz',
  'maydon.fom-analytics.uz',
]);
const newOrigin = 'https://maydonlar.fom-analytics.uz';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.toLowerCase();
  const path = request.nextUrl.pathname;
  const isPage = request.headers.get('accept')?.includes('text/html');
  const isLegacyPlayer = path.startsWith('/player/') || path.startsWith('/screen/');

  if (
    process.env.MAYDON_REDIRECT === '1' &&
    host !== undefined &&
    previousHosts.has(host) &&
    (request.method === 'GET' || request.method === 'HEAD') &&
    isPage &&
    !path.startsWith('/api/') &&
    !isLegacyPlayer
  ) {
    const target = new URL(path + request.nextUrl.search, newOrigin);
    return new Response(null, {
      status: 307,
      headers: {
        Location: target.toString(),
        'Cache-Control': 'no-store',
      },
    });
  }
}
