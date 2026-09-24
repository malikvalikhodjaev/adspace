import { failure, json, mustUser } from '@/lib/auth';
import { assetById } from '@/lib/assets';
import { state } from '@/lib/store';
import { contractText, sees } from '@/lib/workflow';
export function GET(req: Request) {
  try {
    const u = mustUser(req),
      url = new URL(req.url),
      s = state(),
      c = s.campaigns.find((x) => x.id === url.searchParams.get('id'));
    if (!c || !sees(u, c, s)) return json({ error: 'Не найдено' }, 404);
    const replacement = url.searchParams.get('asset');
    const a = assetById(replacement || c.assetId);
    if (!a || (replacement && a.owner !== u.id)) throw Error('Файл не найден');
    const last = c.contracts.at(-1);
    const text = replacement
      ? contractText({ ...c, assetId: a.id }, s, a)
      : last
        ? last.text +
          `\n\nПодтверждено: ${last.acceptedAt}\nМетод: подтверждение в аккаунте\nID аккаунта: ${last.actor}`
        : contractText(c, s, a);
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        ...(url.searchParams.has('download')
          ? {
              'Content-Disposition': `attachment; filename="maydonlar-terms-${c.id}.txt"`,
            }
          : {}),
      },
    });
  } catch (e) {
    return failure(e);
  }
}
