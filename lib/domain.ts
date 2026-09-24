import { surfaces, type Surface } from './catalog';
export type Role = 'advertiser' | 'operator' | 'moderator' | 'admin';
export type Event = { at: string; role: Role; action: string; note: string };
export type Campaign = {
  id: string;
  key: string;
  name: string;
  surfaceIds: string[];
  start: string;
  end: string;
  assetId: string;
  total: number;
  commission: number;
  status: string;
  content: string;
  technical: string;
  events: Event[];
  ledger: { kind: string; amount: number; at: string }[];
  proof: string;
  created: string;
};
export type Workspace = {
  surfaces: Surface[];
  campaigns: Campaign[];
  blocked: string[];
  unavailable?: { id: string; start: string; end: string }[];
  profile: { name: string; type: string };
  commission: number;
};
export function initial(): Workspace {
  return {
    surfaces: structuredClone(surfaces),
    campaigns: [],
    blocked: [],
    unavailable: [],
    profile: { name: '', type: 'business' },
    commission: 15,
  };
}
export function days(start: string, end: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end))
    throw Error('Укажите даты');
  const a = Date.parse(start + 'T00:00:00Z'),
    b = Date.parse(end + 'T00:00:00Z');
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    new Date(a).toISOString().slice(0, 10) !== start ||
    new Date(b).toISOString().slice(0, 10) !== end
  )
    throw Error('Некорректная дата');
  const d = (b - a) / 86400000 + 1;
  if (d < 1 || d > 90) throw Error('Период должен составлять от 1 до 90 дней');
  return d;
}
export function quote(w: Workspace, ids: string[], start: string, end: string) {
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 10 ||
    new Set(ids).size !== ids.length
  )
    throw Error('Выберите уникальные поверхности');
  const picked = ids.map((id) => {
    const s = w.surfaces.find((x) => x.id === id);
    if (!s || w.blocked.includes(s.operator))
      throw Error('Поверхность недоступна');
    return s;
  });
  return picked.reduce((n, s) => n + s.price, 0) * days(start, end);
}
export function act(
  w: Workspace,
  input: Record<string, any>,
  now = new Date().toISOString(),
): Workspace {
  const role = input.role as Role;
  if (!['advertiser', 'operator', 'moderator', 'admin'].includes(role))
    throw Error('Неизвестная роль');
  if (input.action === 'addSurface') {
    if (role !== 'operator') throw Error('Действие доступно оператору');
    const s = input.surface;
    if (
      !s ||
      typeof s.name !== 'string' ||
      !s.name.trim() ||
      s.name.length > 100 ||
      typeof s.address !== 'string' ||
      !s.address.trim() ||
      s.address.length > 150 ||
      typeof s.district !== 'string' ||
      !s.district.trim() ||
      s.district.length > 80
    )
      throw Error('Заполните название, адрес и район');
    if (
      !Number.isFinite(s.lat) ||
      !Number.isFinite(s.lng) ||
      s.lat < 37 ||
      s.lat > 46 ||
      s.lng < 55 ||
      s.lng > 74
    )
      throw Error('Координаты должны находиться в Узбекистане');
    if (!Number.isInteger(s.price) || s.price < 10000 || s.price > 100000000)
      throw Error('Проверьте тариф');
    w.surfaces.push({
      id: 'led-' + crypto.randomUUID().slice(0, 8),
      name: s.name.trim(),
      address: s.address.trim(),
      district: s.district.trim(),
      lat: s.lat,
      lng: s.lng,
      price: s.price,
      reach: 0,
      width: 1920,
      height: 1080,
      seconds: 15,
      size: 'По данным оператора',
      kind: 'Уличный LED',
      operator: 'Demo Custom Operator',
    });
    return w;
  }
  if (input.action === 'unavailable') {
    if (role !== 'operator' || !w.surfaces.some((s) => s.id === input.id))
      throw Error('Нет доступа к экрану');
    days(input.start, input.end);
    if (
      w.campaigns.some(
        (c) =>
          !['refunded', 'completed'].includes(c.status) &&
          c.surfaceIds.includes(input.id) &&
          c.start <= input.end &&
          c.end >= input.start,
      )
    )
      throw Error('На эти даты уже есть заявка');
    w.unavailable ??= [];
    const ix = w.unavailable.findIndex(
      (b) =>
        b.id === input.id && b.start === input.start && b.end === input.end,
    );
    if (ix >= 0) w.unavailable.splice(ix, 1);
    else
      w.unavailable.push({ id: input.id, start: input.start, end: input.end });
    return w;
  }
  if (input.action === 'profile') {
    if (
      role !== 'advertiser' ||
      typeof input.name !== 'string' ||
      input.name.length > 100 ||
      !['person', 'ip', 'business'].includes(input.type)
    )
      throw Error('Проверьте профиль');
    w.profile = { name: input.name, type: input.type };
    return w;
  }
  if (input.action === 'surface') {
    if (role !== 'operator') throw Error('Действие доступно оператору');
    const s = w.surfaces.find((x) => x.id === input.id);
    if (!s) throw Error('Экран не найден');
    if (
      !Number.isInteger(input.price) ||
      input.price < 10000 ||
      input.price > 100000000
    )
      throw Error('Тариф: от 10 000 до 100 000 000 сум');
    s.price = input.price;
    return w;
  }
  if (input.action === 'block') {
    if (
      role !== 'admin' ||
      !w.surfaces.some((s) => s.operator === input.operator)
    )
      throw Error('Нет доступа');
    w.blocked = w.blocked.includes(input.operator)
      ? w.blocked.filter((x) => x !== input.operator)
      : [...w.blocked, input.operator];
    return w;
  }
  if (input.action === 'commission') {
    if (
      role !== 'admin' ||
      !Number.isInteger(input.value) ||
      input.value < 0 ||
      input.value > 30
    )
      throw Error('Комиссия: 0–30%');
    w.commission = input.value;
    return w;
  }
  if (input.action === 'create') {
    if (role !== 'advertiser') throw Error('Действие доступно рекламодателю');
    if (
      typeof input.key !== 'string' ||
      input.key.length < 8 ||
      input.key.length > 100
    )
      throw Error('Некорректный ключ запроса');
    if (w.campaigns.some((c) => c.key === input.key)) return w;
    if (
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.name.length > 100 ||
      typeof input.assetId !== 'string' ||
      !input.assetId
    )
      throw Error('Укажите название и загрузите креатив');
    const total = quote(w, input.surfaceIds, input.start, input.end);
    if (input.start < now.slice(0, 10))
      throw Error('Начало размещения не может быть в прошлом');
    if (
      w.unavailable?.some(
        (b) =>
          input.surfaceIds.includes(b.id) &&
          b.start <= input.end &&
          b.end >= input.start,
      )
    )
      throw Error('Оператор закрыл выбранные даты');
    for (const c of w.campaigns)
      if (
        !['refunded', 'completed'].includes(c.status) &&
        c.surfaceIds.some((id) => input.surfaceIds.includes(id)) &&
        c.start <= input.end &&
        c.end >= input.start
      )
        throw Error('На выбранные даты экран уже занят');
    w.campaigns.unshift({
      id: crypto.randomUUID(),
      key: input.key,
      name: input.name.trim(),
      surfaceIds: input.surfaceIds,
      start: input.start,
      end: input.end,
      assetId: input.assetId,
      total,
      commission: Math.round((total * w.commission) / 100),
      status: 'draft',
      content: 'pending',
      technical: 'pending',
      events: [
        {
          at: now,
          role,
          action: 'create',
          note: 'Заявка создана; тестовый резерв',
        },
      ],
      ledger: [],
      proof: '',
      created: now,
    });
    return w;
  }
  const c = w.campaigns.find((x) => x.id === input.id);
  if (!c) throw Error('Кампания не найдена');
  const note =
    typeof input.note === 'string' ? input.note.trim().slice(0, 1000) : '';
  const move = (status: string) => {
    c.status = status;
  };
  const entry = (kind: string, amount: number) =>
    c.ledger.push({ kind, amount, at: now });
  switch (input.action) {
    case 'pay':
      if (role !== 'advertiser' || c.status !== 'draft')
        throw Error('Оплата недоступна');
      entry('hold', c.total);
      move('moderation');
      break;
    case 'content':
      if (
        role !== 'moderator' ||
        c.status !== 'moderation' ||
        c.content === 'approved'
      )
        throw Error('Нет заявки на контентную проверку');
      c.content = 'approved';
      if (c.technical === 'approved') move('approved');
      break;
    case 'technical':
      if (
        role !== 'operator' ||
        c.status !== 'moderation' ||
        c.technical === 'approved'
      )
        throw Error('Нет заявки на техническую проверку');
      c.technical = 'approved';
      if (c.content === 'approved') move('approved');
      break;
    case 'revision':
      if (
        !['moderator', 'operator'].includes(role) ||
        c.status !== 'moderation' ||
        !note
      )
        throw Error('Для доработки нужна причина');
      move('revision');
      break;
    case 'resubmit':
      if (role !== 'advertiser' || c.status !== 'revision' || !input.assetId)
        throw Error('Загрузите новый креатив');
      c.assetId = input.assetId;
      c.content = 'pending';
      c.technical = 'pending';
      move('moderation');
      break;
    case 'reject':
      if (
        !['moderator', 'operator'].includes(role) ||
        c.status !== 'moderation' ||
        !note
      )
        throw Error('Для отказа нужна причина');
      entry('refund', c.total);
      move('refunded');
      break;
    case 'cancel':
      if (
        role !== 'advertiser' ||
        !['draft', 'moderation', 'revision', 'approved'].includes(c.status)
      )
        throw Error('Отмена недоступна');
      if (c.ledger.some((l) => l.kind === 'hold')) entry('refund', c.total);
      move('refunded');
      break;
    case 'start':
      if (role !== 'operator' || c.status !== 'approved' || !note)
        throw Error('Нужны оба одобрения и подтверждение оператора');
      if (
        w.blocked.some((o) =>
          c.surfaceIds.some(
            (id) => w.surfaces.find((s) => s.id === id)?.operator === o,
          ),
        )
      )
        throw Error('Оператор заблокирован');
      c.proof = note;
      entry('release', c.total - c.commission);
      entry('fee', c.commission);
      move('live');
      break;
    case 'complete':
      if (role !== 'operator' || c.status !== 'live')
        throw Error('Завершение недоступно');
      move('completed');
      break;
    case 'dispute':
      if (
        role !== 'advertiser' ||
        !['live', 'approved'].includes(c.status) ||
        !note
      )
        throw Error('Нужна причина спора');
      move('dispute');
      break;
    case 'resolve':
      if (role !== 'admin' || c.status !== 'dispute' || !note)
        throw Error('Нужно решение администратора');
      if (c.ledger.some((l) => l.kind === 'release')) {
        entry('reversal', c.total - c.commission);
        entry('fee_reversal', c.commission);
      }
      entry('refund', c.total);
      move('refunded');
      break;
    default:
      throw Error('Неизвестное действие');
  }
  c.events.push({ at: now, role, action: input.action, note });
  return w;
}
