import { readFile } from 'node:fs/promises';
import {
  body,
  failure,
  json,
  limit,
  mustUser,
  sameOrigin,
  sessionUser,
} from '@/lib/auth';
import { assetById, assetPath, mayRead, saveAsset } from '@/lib/assets';
import { database, state } from '@/lib/store';
let uploads = 0;
export async function POST(req: Request) {
  let acquired = false;
  try {
    sameOrigin(req);
    const u = mustUser(req);
    if (uploads >= 2)
      return json(
        { error: 'Сервер принимает другие файлы. Повторите через минуту.' },
        429,
      );
    uploads++;
    acquired = true;
    limit('upload:' + u.id, 30, 3600);
    const used = database()
      .prepare('SELECT SUM(size) total FROM assets WHERE owner=?')
      .get(u.id) as { total: number };
    if (used.total > 1073741824) throw Error('Лимит хранения 1 ГБ достигнут');
    const bytes = await body(req, 105 * 1048576);
    const parsed = new Request(req.url, {
      method: 'POST',
      headers: { 'content-type': req.headers.get('content-type') || '' },
      body: bytes,
    });
    const f = (await parsed.formData()).get('file');
    if (!(f instanceof File) || f.size < 24 || f.size > 100 * 1048576)
      throw Error('Размер файла: до 100 МБ');
    return json(
      await saveAsset(u.id, f.name, Buffer.from(await f.arrayBuffer())),
    );
  } catch (e) {
    return failure(e);
  } finally {
    if (acquired) uploads--;
  }
}
export async function GET(req: Request) {
  try {
    const url = new URL(req.url),
      id = url.searchParams.get('id'),
      u = sessionUser(req);
    if (!id) {
      if (!u) return json([], 401);
      return json(
        database()
          .prepare(
            'SELECT * FROM assets WHERE owner=? ORDER BY rowid DESC LIMIT 100',
          )
          .all(u.id),
      );
    }
    const a = assetById(id);
    if (!a || !mayRead(a, u)) return new Response('Not found', { status: 404 });
    const bytes = await readFile(assetPath(id));
    return new Response(bytes, {
      headers: {
        'Content-Type': a.mime,
        'Content-Length': String(bytes.length),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return failure(e);
  }
}
