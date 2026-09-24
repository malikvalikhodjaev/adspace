import { randomUUID } from 'node:crypto';
import { cityByCode } from './locations';
import { commonDurations, maxPlaysPerDay, placementTotal, playDurations, tariff } from './pricing';
import {
  activeAt,
  capacityAvailable,
  dayCount,
  tashkent,
  terminal,
  timeValid,
  type Asset,
  type Campaign,
  type State,
  type Surface,
  type User,
} from './model';
export const contractVersion = '2026-09-24-v8';
export function staff(u: User) {
  return u.role === 'admin' || u.role === 'moderator';
}
export function owns(u: User, s: Surface) {
  return u.role === 'admin' || (u.role === 'operator' && s.owner === u.id);
}
export function sees(u: User, c: Campaign, s: State) {
  return (
    staff(u) ||
    c.owner === u.id ||
    (u.role === 'operator' && c.status !== 'draft' &&
      c.surfaceIds.some((id) =>
        s.surfaces.some((x) => x.id === id && x.owner === u.id),
      ))
  );
}
function requireThat(ok: unknown, message = 'Недостаточно прав'): asserts ok {
  if (!ok) throw Error(message);
}
function line(value: unknown, max = 150) {
  requireThat(
    typeof value === 'string' && value.trim().length > 0 && value.length <= max,
    'Заполните обязательные поля',
  );
  return value.trim();
}
function number(value: unknown, min: number, max: number) {
  requireThat(
    typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max,
    'Проверьте числовые параметры',
  );
  return value;
}
export function audit(
  u: User,
  action: string,
  note = '',
  now = new Date().toISOString(),
) {
  return { at: now, actor: u.id, role: u.role, action, note };
}
export function maintain(s: State, now = new Date()) {
  const local = tashkent(now);
  for (const c of s.campaigns) {
    if (c.status === 'moderation') {
      let resetApproval = false;
      for (const id of c.surfaceIds) {
        const owner = s.surfaces.find((screen) => screen.id === id)?.owner;
        if (
          c.technical[id] &&
          !c.events.some(
            (event) =>
              event.action === 'technical' &&
              event.role === 'operator' &&
              event.actor === owner,
          )
        ) {
          delete c.technical[id];
          resetApproval = true;
        }
      }
      if (resetApproval)
        c.events.push({
          at: now.toISOString(),
          actor: 'system',
          role: 'system',
          action: 'approval-reset',
          note: 'Подтверждение должно исходить от владельца экрана',
        });
      if (
        c.surfaceIds.length > 0 &&
        c.surfaceIds.every((id) => c.technical[id])
      ) {
        c.status = 'scheduled';
        c.events.push({
          at: now.toISOString(),
          actor: 'system',
          role: 'system',
          action: 'owner-approved',
          note: 'Подтверждение владельца достаточно для расписания',
        });
      }
    }
    if (c.status === 'draft' && c.expires < now.toISOString()) {
      c.status = 'expired';
      c.events.push({
        at: now.toISOString(),
        actor: 'system',
        role: 'system',
        action: 'expire',
        note: 'Срок резерва черновика истёк',
      });
    } else if (
      !terminal.includes(c.status) &&
      c.status !== 'dispute' &&
      (c.end < local.slice(0, 10) ||
        (c.end === local.slice(0, 10) && c.to <= local.slice(11, 16)))
    ) {
      const played = c.ledger.some((l) => l.kind === 'release');
      c.status = played ? 'completed' : 'expired';
      const delivered = c.ledger
        .filter((entry) => entry.kind === 'release' || entry.kind === 'fee')
        .reduce((sum, entry) => sum + entry.amount, 0);
      const outstanding = c.playsPerDay ? Math.max(0, c.total - delivered) : played ? 0 : c.total;
      if (outstanding && c.ledger.some((l) => l.kind === 'hold'))
        c.ledger.push({
          kind: 'refund',
          amount: outstanding,
          at: now.toISOString(),
        });
      c.events.push({
        at: now.toISOString(),
        actor: 'system',
        role: 'system',
        action: c.status,
        note: played
          ? outstanding ? 'Период завершён; непоказанная часть расчётной суммы возвращена' : 'Период завершён'
          : 'Период закончился без зарегистрированного воспроизведения',
      });
    }
  }
}
export function contractText(c: Campaign, s: State, a: Asset) {
  const names = c.surfaceIds
    .map((id) => s.surfaces.find((x) => x.id === id)?.name)
    .join(', ');
  return `УСЛОВИЯ РАЗМЕЩЕНИЯ Maydonlar\nВерсия ${contractVersion}\n\nРазмещение: ${c.name}\nПоверхности: ${names}\nПериод: ${c.start} — ${c.end}, ежедневно ${c.from}–${c.to}, Asia/Tashkent\n${c.playsPerDay ? `План: ${c.playsPerDay} показов в день на каждом экране, длительность ${c.playSeconds} сек.\n` : ''}Креатив: ${a.name}\nSHA-256: ${a.hash}\nРасчётная стоимость: ${c.total} UZS; комиссия внутри суммы: ${c.commission} UZS.\n\n1. Предмет: воспроизведение указанного материала в браузерном LED-плеере по согласованному расписанию. Физический экран не подключён.\n2. Автор размещения отвечает за права на материал и достоверность сообщённых сведений. Владелец каждого выбранного экрана проверяет материал, даты и параметры размещения и принимает либо отклоняет запрос. Отдельная проверка контента платформой не требуется.\n3. Владелец проверяет параметры экрана и готовность к воспроизведению. Платформа хранит расписание и историю решений. Журнал браузерного плеера не подтверждает аудиторию или реальный наружный показ.\n4. До подтверждения владельцами всех выбранных экранов материал не воспроизводится. После подтверждения он попадает в расписание и доступен плееру в согласованное время. При отказе указывается причина; можно отредактировать материал и повторно согласовать условия. Владелец экрана может приостановить показ; спор рассматривает администратор.\n5. Суммы используются для расчёта размещения. Деньги не списываются и не переводятся. При отмене до старта либо отказе расчётная сумма возвращается в журнале. По спору решение также записывается в журнал.\n6. Подтверждение в аккаунте фиксирует согласование заявки и не является электронной подписью. One ID не подключён. Договор на фактическое размещение и юридическая ответственность согласуются отдельно.\n\nПодтверждение привязано к этой версии материала, поверхностям, времени и стоимости. При изменении креатива необходимо повторное подтверждение.`;
}
export function apply(
  s: State,
  u: User,
  b: Record<string, any>,
  getAsset: (id: string) => Asset | undefined,
  now = new Date(),
) {
  maintain(s, now);
  const at = now.toISOString();
  const action = String(b.action);
  const note = String(b.note || '')
    .trim()
    .slice(0, 1000);
  if (action === 'surface-save') {
    requireThat(u.role === 'operator' || u.role === 'admin');
    const previous = b.id ? s.surfaces.find((x) => x.id === b.id) : undefined;
    requireThat(!b.id || (previous && owns(u, previous)));
    if (previous)
      requireThat(
        !s.campaigns.some(
          (c) =>
            !terminal.includes(c.status) && c.surfaceIds.includes(previous.id),
        ),
        'Для изменения характеристик дождитесь завершения активных заявок',
      );
    const p = b.surface;
    requireThat(p, 'Заполните карточку');
    const opens = line(p.opens),
      closes = line(p.closes);
    requireThat(
      timeValid(opens) && timeValid(closes) && opens < closes,
      'Проверьте часы работы',
    );
    const width = number(p.width, 64, 7680),
      height = number(p.height, 64, 4320);
    requireThat(
      Number.isInteger(width) &&
        Number.isInteger(height) &&
        width % 2 === 0 &&
        height % 2 === 0,
      'Разрешение должно быть чётным',
    );
    const photo = p.photoId ? getAsset(p.photoId) : undefined;
    requireThat(
      !p.photoId ||
        (photo && photo.owner === u.id && photo.mime.startsWith('image/')),
      'Загрузите фотографию поверхности',
    );
    const cityCode = typeof p.cityCode === 'string' ? p.cityCode : '';
    const districtCode = typeof p.districtCode === 'string' ? p.districtCode : '';
    const city = cityCode ? cityByCode(cityCode) : undefined;
    requireThat(!cityCode || city, 'Выберите город из справочника');
    const district = city?.districts.find((item) => item.code === districtCode);
    requireThat(
      !city || city.districts.length === 0 || district,
      'Выберите район из справочника',
    );
    requireThat(
      !city || city.districts.length > 0 || !districtCode,
      'Для этого города район не требуется',
    );
    const perPlay = p.pricingMode === 'per-play';
    const maxSeconds = number(p.seconds, 3, 120);
    const tariffs = perPlay && Array.isArray(p.tariffs)
      ? p.tariffs.map((item: { seconds: number; price: number }) => ({
          seconds: item.seconds,
          price: number(item.price, 1, 100000000),
        }))
      : [];
    requireThat(
      !perPlay ||
        (tariffs.length > 0 &&
          tariffs.every((item: { seconds: number; price: number }) =>
            playDurations.includes(item.seconds as 10 | 15 | 30) &&
            item.seconds <= maxSeconds,
          ) &&
          new Set(tariffs.map((item: { seconds: number }) => item.seconds)).size === tariffs.length),
      'Укажите цену за один показ и проверьте длительность ролика',
    );
    const surface: Surface = {
      id: previous?.id || randomUUID(),
      owner: previous?.owner || u.id,
      operator: u.organization,
      name: line(p.name, 100),
      address: line(p.address),
      district: district?.uz || (city ? '' : line(p.district, 80)),
      cityCode: city?.code || previous?.cityCode,
      districtCode: district?.code || '',
      lat: number(p.lat, 37, 46),
      lng: number(p.lng, 55, 74),
      price: perPlay
        ? Math.min(...tariffs.map((item: { price: number }) => item.price))
        : number(p.price, 10000, 100000000),
      pricingMode: perPlay ? 'per-play' : undefined,
      tariffs: perPlay ? tariffs : undefined,
      reach: number(p.reach || 0, 0, 10000000),
      width,
      height,
      seconds: maxSeconds,
      fps: number(p.fps, 1, 60),
      maxMb: number(p.maxMb, 1, 100),
      formats: ['image/png', 'image/jpeg', 'video/mp4'],
      size: line(p.size),
      kind: line(p.kind),
      opens,
      closes,
      slots: number(p.slots, 1, 20),
      photoId: p.photoId || '',
      demo: false,
      status: b.submit
        ? 'published'
        : previous?.status === 'published' || previous?.status === 'paused'
          ? previous.status
          : 'draft',
      note: '',
      events: [...(previous?.events || []), audit(u, action, note, at)],
    };
    requireThat(
      Number.isInteger(surface.slots) &&
        Number.isInteger(surface.fps) &&
        Number.isInteger(surface.price),
      'Тариф, FPS и число мест должны быть целыми',
    );
    if (previous) s.surfaces[s.surfaces.indexOf(previous)] = surface;
    else s.surfaces.push(surface);
    return;
  }
  if (['surface-publish', 'surface-pause', 'surface-resume'].includes(action)) {
    const surface = s.surfaces.find((x) => x.id === b.id);
    requireThat(surface, 'Экран не найден');
    requireThat(owns(u, surface));
    if (action === 'surface-publish') {
      requireThat(
        ['draft', 'pending', 'revision', 'paused'].includes(surface.status),
        'Экран уже опубликован',
      );
      surface.status = 'published';
      surface.note = '';
    } else {
      requireThat(
        surface.status ===
          (action === 'surface-pause' ? 'published' : 'paused'),
        'Статус экрана изменился',
      );
      surface.status = action === 'surface-pause' ? 'paused' : 'published';
    }
    surface.events.push(audit(u, action, note, at));
    return;
  }
  if (action === 'unavailable') {
    const screen = s.surfaces.find((x) => x.id === b.id);
    requireThat(screen && owns(u, screen));
    dayCount(b.start, b.end);
    requireThat(
      !s.campaigns.some(
        (c) =>
          !terminal.includes(c.status) &&
          c.surfaceIds.includes(screen.id) &&
          c.start <= b.end &&
          c.end >= b.start,
      ),
      'На эти даты есть заявки',
    );
    const ix = s.unavailable.findIndex(
      (x) => x.id === b.id && x.start === b.start && x.end === b.end,
    );
    if (ix < 0) s.unavailable.push({ id: b.id, start: b.start, end: b.end });
    else s.unavailable.splice(ix, 1);
    return;
  }
  if (action === 'commission') {
    requireThat(u.role === 'admin');
    s.commission = number(b.value, 0, 30);
    return;
  }
  if (action === 'block') {
    requireThat(u.role === 'admin');
    const owner = line(b.owner);
    if (s.blocked.includes(owner))
      s.blocked = s.blocked.filter((x) => x !== owner);
    else s.blocked.push(owner);
    return;
  }
  if (action === 'create') {
    requireThat(u.role === 'advertiser' || u.role === 'admin');
    const key = line(b.key, 100);
    if (s.campaigns.some((c) => c.owner === u.id && c.key === key)) return;
    requireThat(
      Array.isArray(b.surfaceIds) &&
        b.surfaceIds.length > 0 &&
        b.surfaceIds.length <= 10 &&
        new Set(b.surfaceIds).size === b.surfaceIds.length,
      'Выберите от 1 до 10 экранов',
    );
    const start = line(b.start),
      end = line(b.end),
      days = dayCount(start, end),
      from = line(b.from),
      to = line(b.to);
    requireThat(
      start >= tashkent(now).slice(0, 10),
      'Начало не может быть в прошлом',
    );
    requireThat(
      timeValid(from) && timeValid(to) && from < to,
      'Проверьте часы размещения',
    );
    requireThat(
      end > tashkent(now).slice(0, 10) || to > tashkent(now).slice(11, 16),
      'Время показа уже прошло',
    );
    const asset = getAsset(String(b.assetId));
    requireThat(asset && asset.owner === u.id, 'Загрузите свой креатив');
    const selected: Surface[] = b.surfaceIds.map((id: string) => {
      const x = s.surfaces.find((x) => x.id === id);
      requireThat(
        x && x.status === 'published' && !s.blocked.includes(x.owner),
        'Экран недоступен',
      );
      return x;
    });
    requireThat(
      selected.every((x) => x.pricingMode === 'per-play') ||
        selected.every((x) => x.pricingMode !== 'per-play'),
      'Экраны с разными типами тарифов оформите отдельно',
    );
    const perPlayBooking = selected.every((x) => x.pricingMode === 'per-play');
    const playSeconds = perPlayBooking ? Number(b.playSeconds) : 0;
    const playsPerDay = perPlayBooking ? Number(b.playsPerDay) : 0;
    if (perPlayBooking) {
      requireThat(
        Number.isInteger(playSeconds) &&
          commonDurations(selected).includes(playSeconds as 10 | 15 | 30) &&
          Number.isInteger(playsPerDay) && playsPerDay >= 1 && playsPerDay <= 10000,
        'Выберите длительность и число показов в день',
      );
    }
    for (const x of selected) {
      requireThat(
        from >= x.opens && to <= x.closes,
        'Время выходит за часы работы ' + x.name,
      );
      requireThat(
        asset.width === x.width &&
          asset.height === x.height &&
          (perPlayBooking
            ? (!asset.seconds || Math.abs(asset.seconds - playSeconds) < 0.2)
            : asset.seconds <= x.seconds) &&
          asset.size <= x.maxMb * 1024 * 1024 &&
          x.formats.includes(asset.mime) &&
          (!asset.seconds || Math.abs(asset.fps - x.fps) < 0.1),
        'Подгоните креатив под требования ' + x.name,
      );
      requireThat(
        !s.unavailable.some(
          (v) => v.id === x.id && v.start <= end && v.end >= start,
        ),
        'Оператор закрыл выбранные даты',
      );
      requireThat(
        capacityAvailable(s, x, start, end, from, to),
        'На выбранное время нет свободных мест: ' + x.name,
      );
      if (perPlayBooking)
        requireThat(
          !!tariff(x, playSeconds) &&
            playsPerDay <= maxPlaysPerDay(x, from, to, playSeconds),
          'Число показов не помещается в выбранное время: ' + x.name,
        );
    }
    const total = placementTotal(selected, days, playSeconds, playsPerDay);
    s.campaigns.unshift({
      id: randomUUID(),
      owner: u.id,
      key,
      name: line(b.name, 100),
      surfaceIds: b.surfaceIds,
      start,
      end,
      from,
      to,
      assetId: asset.id,
      total,
      playsPerDay: perPlayBooking ? playsPerDay : undefined,
      playSeconds: perPlayBooking ? playSeconds : undefined,
      commission: Math.round((total * s.commission) / 100),
      status: 'draft',
      content: 'pending',
      technical: {},
      created: at,
      expires: new Date(now.getTime() + 30 * 60000).toISOString(),
      contracts: [],
      events: [audit(u, 'create', 'Резерв на 30 минут', at)],
      ledger: [],
    });
    return;
  }
  const c = s.campaigns.find((x) => x.id === b.id);
  requireThat(c && sees(u, c, s), 'Заявка не найдена');
  const own = c.owner === u.id || u.role === 'admin';
  const operator = c.surfaceIds.some((id) =>
    s.surfaces.some((x) => x.id === id && owns(u, x)),
  );
  const fee = (kind: string, amount: number) =>
    c.ledger.push({ kind, amount, at });
  const accept = (asset: Asset) => {
    requireThat(
      b.accepted === true,
      'Сначала прочитайте и подтвердите условия размещения',
    );
    c.contracts.push({
      version: contractVersion,
      acceptedAt: at,
      actor: u.id,
      assetHash: asset.hash,
      text: contractText(c, s, asset),
      method: 'pilot-acceptance',
    });
  };
  switch (action) {
    case 'submit':
      requireThat(own && c.status === 'draft');
      accept(getAsset(c.assetId)!);
      fee('hold', c.total);
      c.status = 'moderation';
      break;
    case 'technical':
      requireThat(u.role === 'operator' && operator && c.status === 'moderation');
      requireThat(
        c.surfaceIds.some((id) =>
          !c.technical[id] && s.surfaces.some((x) => x.id === id && x.owner === u.id),
        ),
        'Это размещение уже подтверждено владельцем экрана',
      );
      for (const id of c.surfaceIds)
        if (s.surfaces.some((x) => x.id === id && x.owner === u.id))
          c.technical[id] = true;
      break;
    case 'revision':
      requireThat(
        u.role === 'operator' && operator && c.status === 'moderation' && note,
        'Укажите причину доработки',
      );
      c.status = 'revision';
      break;
    case 'reject':
      requireThat(
        u.role === 'operator' && operator && c.status === 'moderation' && note,
        'Укажите причину отказа',
      );
      fee('refund', c.total);
      c.status = 'cancelled';
      break;
    case 'resubmit': {
      requireThat(own && c.status === 'revision');
      const a = getAsset(String(b.assetId));
      requireThat(
        a && a.owner === u.id && a.id !== c.assetId,
        'Загрузите исправленный материал',
      );
      for (const id of c.surfaceIds) {
        const x = s.surfaces.find((x) => x.id === id)!;
        requireThat(
          x.status === 'published' &&
            !s.blocked.includes(x.owner) &&
            a.width === x.width &&
            a.height === x.height &&
            (c.playSeconds
              ? (!a.seconds || Math.abs(a.seconds - c.playSeconds) < 0.2)
              : a.seconds <= x.seconds) &&
            a.size <= x.maxMb * 1048576 &&
            x.formats.includes(a.mime) &&
            (!a.seconds || Math.abs(a.fps - x.fps) < 0.1),
          'Креатив не подходит экрану',
        );
      }
      c.assetId = a.id;
      accept(a);
      c.content = 'pending';
      c.technical = {};
      c.status = 'moderation';
      break;
    }
    case 'pause':
      requireThat(
        (staff(u) || operator) &&
          ['live', 'scheduled'].includes(c.status) &&
          note,
        'Укажите причину остановки',
      );
      c.status = 'paused';
      break;
    case 'resume':
      requireThat((staff(u) || operator) && c.status === 'paused');
      c.status = c.ledger.some((l) => l.kind === 'release')
        ? 'live'
        : 'scheduled';
      break;
    case 'cancel':
      requireThat(
        own &&
          ['draft', 'moderation', 'revision', 'scheduled'].includes(c.status),
      );
      if (c.ledger.some((l) => l.kind === 'hold')) fee('refund', c.total);
      c.status = 'cancelled';
      break;
    case 'dispute':
      requireThat(
        own && ['live', 'scheduled', 'paused'].includes(c.status) && note,
        'Укажите причину спора',
      );
      c.status = 'dispute';
      break;
    case 'resolve':
      requireThat(
        u.role === 'admin' && c.status === 'dispute' && note,
        'Укажите решение',
      );
      if (c.ledger.some((l) => l.kind === 'release')) {
        fee('reversal', c.ledger.filter((entry) => entry.kind === 'release').reduce((sum, entry) => sum + entry.amount, 0));
        fee('fee_reversal', c.ledger.filter((entry) => entry.kind === 'fee').reduce((sum, entry) => sum + entry.amount, 0));
      }
      fee('refund', c.total);
      c.status = 'cancelled';
      break;
    default:
      throw Error('Неизвестное действие');
  }
  if (
    c.status === 'moderation' &&
    c.surfaceIds.every((id) => c.technical[id])
  )
    c.status = 'scheduled';
  c.events.push(audit(u, action, note, at));
}
export function markPlayed(
  s: State,
  screen: string,
  campaign: string,
  now = new Date(),
) {
  const c = s.campaigns.find((c) => c.id === campaign);
  const surface = s.surfaces.find((x) => x.id === screen);
  if (
    !c ||
    !surface ||
    surface.status !== 'published' ||
    s.blocked.includes(surface.owner) ||
    !c.surfaceIds.includes(screen) ||
    !activeAt(c, now)
  )
    throw Error('Размещение сейчас не разрешено');
  if (c.status === 'scheduled') {
    c.status = 'live';
    if (!c.playsPerDay && !c.ledger.some((l) => l.kind === 'release'))
      c.ledger.push(
        {
          kind: 'release',
          amount: c.total - c.commission,
          at: now.toISOString(),
        },
        { kind: 'fee', amount: c.commission, at: now.toISOString() },
      );
    c.events.push({
      at: now.toISOString(),
      actor: screen,
      role: 'player',
      action: 'playback',
      note: 'Браузерный плеер сообщил о начале показа; физический показ не подтверждён',
    });
  }
  if (c.playsPerDay && c.playSeconds) {
    const price = tariff(surface, c.playSeconds)?.price;
    if (!price) throw Error('Тариф показа не найден');
    const commission = Math.round(price * s.commission / 100);
    c.ledger.push(
      { kind: 'release', amount: price - commission, at: now.toISOString() },
      { kind: 'fee', amount: commission, at: now.toISOString() },
    );
  }
}
