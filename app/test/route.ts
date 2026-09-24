import { assignedDesign, DESIGN_COOKIE } from '@/lib/experiment';
export function GET(req: Request) {
  const variant = assignedDesign(
    req.headers.get('cookie'),
    crypto.getRandomValues(new Uint8Array(1))[0],
  );
  const url = new URL(req.url);
  const retained = new URLSearchParams();
  for (const key of ['view', 'surface']) {
    const value = url.searchParams.get(key);
    if (value) retained.set(key, value.slice(0, 100));
  }
  const query = retained.toString();
  return new Response(null, {
    status: 307,
    headers: {
      Location: '/' + variant + (query ? '?' + query : ''),
      'Set-Cookie': `${DESIGN_COOKIE}=${variant}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}`,
      'Cache-Control': 'private, no-store, max-age=0',
      Vary: 'Cookie',
    },
  });
}
