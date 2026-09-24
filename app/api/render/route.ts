import { body, failure, json, limit, mustUser, sameOrigin } from '@/lib/auth';
import { renderAsset } from '@/lib/assets';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = mustUser(req);
    limit('render:' + u.id, 20, 3600);
    return json(await renderAsset(u, JSON.parse((await body(req)).toString())));
  } catch (e) {
    return failure(e);
  }
}
