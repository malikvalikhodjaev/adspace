export type Role = 'advertiser' | 'operator' | 'moderator' | 'admin';
export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  organization: string;
  verified: number;
};
export type Surface = {
  id: string;
  owner: string;
  operator: string;
  name: string;
  address: string;
  district: string;
  cityCode?: string;
  districtCode?: string;
  lat: number;
  lng: number;
  price: number;
  pricingMode?: 'per-play';
  tariffs?: { seconds: number; price: number }[];
  reach: number;
  width: number;
  height: number;
  seconds: number;
  fps: number;
  maxMb: number;
  formats: string[];
  size: string;
  kind: string;
  opens: string;
  closes: string;
  slots: number;
  photoId: string;
  demo: boolean;
  status: 'draft' | 'pending' | 'published' | 'revision' | 'paused';
  note: string;
  events: Audit[];
};
export type Audit = {
  at: string;
  actor: string;
  role: string;
  action: string;
  note: string;
};
export type Asset = {
  id: string;
  owner: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  seconds: number;
  size: number;
  hash: string;
  fps: number;
};
export type Contract = {
  version: string;
  acceptedAt: string;
  actor: string;
  assetHash: string;
  text: string;
  method: 'pilot-acceptance';
};
export type Campaign = {
  id: string;
  owner: string;
  key: string;
  name: string;
  surfaceIds: string[];
  start: string;
  end: string;
  from: string;
  to: string;
  assetId: string;
  total: number;
  playsPerDay?: number;
  playSeconds?: number;
  commission: number;
  status:
    | 'draft'
    | 'moderation'
    | 'revision'
    | 'scheduled'
    | 'live'
    | 'paused'
    | 'completed'
    | 'cancelled'
    | 'expired'
    | 'dispute';
  content: string;
  technical: Record<string, boolean>;
  created: string;
  expires: string;
  contracts: Contract[];
  events: Audit[];
  ledger: { kind: string; amount: number; at: string }[];
};
export type Reservation = Pick<
  Campaign,
  'id' | 'surfaceIds' | 'start' | 'end' | 'from' | 'to' | 'status'
>;
export type State = {
  surfaces: Surface[];
  campaigns: Campaign[];
  blocked: string[];
  unavailable: { id: string; start: string; end: string }[];
  commission: number;
};
export const labels: Record<string, [string, string]> = {
  draft: ['Черновик', 'Qoralama'],
  pending: ['На проверке', 'Tekshiruvda'],
  published: ['Опубликован', 'Saytda ko‘rinadi'],
  moderation: ['Ждёт владельца', 'Egasidan javob kutilmoqda'],
  revision: ['На доработке', 'Tuzatish kerak'],
  scheduled: ['В расписании', 'Vaqti belgilangan'],
  live: ['В эфире', 'Ekranda ko‘rsatilmoqda'],
  paused: ['Приостановлено', 'Vaqtincha to‘xtagan'],
  completed: ['Завершено', 'Ko‘rsatish tugadi'],
  cancelled: ['Отменено', 'Bekor qilindi'],
  expired: ['Период истёк', 'Vaqti o‘tgan'],
  dispute: ['Спор', 'Shikoyat ko‘rilmoqda'],
};
export const roleLabels: Record<Role, [string, string]> = {
  advertiser: ['Автор размещения', 'Joylashtiruvchi'],
  operator: ['Владелец экранов', 'Ekran egasi'],
  moderator: ['Модератор', 'Moderator'],
  admin: ['Администратор', 'Administrator'],
};
export function tashkent(now = new Date()) {
  return new Date(now.getTime() + 5 * 3600000).toISOString();
}
export function dayCount(a: string, b: string) {
  for (const d of [a, b])
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
      !Number.isFinite(Date.parse(d)) ||
      new Date(d).toISOString().slice(0, 10) !== d
    )
      throw Error('Проверьте даты');
  const n = (Date.parse(b) - Date.parse(a)) / 86400000 + 1;
  if (n < 1 || n > 90) throw Error('Период: от 1 до 90 дней');
  return n;
}
export function timeValid(s: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) || s === '24:00';
}
export const terminal = ['cancelled', 'completed', 'expired'];
export function activeAt(c: Campaign, now = new Date()) {
  const local = tashkent(now);
  return (
    ['scheduled', 'live'].includes(c.status) &&
    c.start <= local.slice(0, 10) &&
    c.end >= local.slice(0, 10) &&
    c.from <= local.slice(11, 16) &&
    c.to > local.slice(11, 16)
  );
}
export function capacityAvailable(
  state: { campaigns: Reservation[] },
  s: Surface,
  start: string,
  end: string,
  from: string,
  to: string,
  except = '',
) {
  const n = dayCount(start, end);
  for (let day = 0; day < n; day++) {
    const date = new Date(Date.parse(start) + day * 86400000)
      .toISOString()
      .slice(0, 10);
    if (
      occupiedPlaces(state.campaigns, s.id, date, from, to, except) >= s.slots
    )
      return false;
  }
  return true;
}

export function occupiedPlaces(
  campaigns: Reservation[],
  surfaceId: string,
  date: string,
  from: string,
  to: string,
  except = '',
) {
  const events: [string, number][] = [];
  for (const c of campaigns)
    if (
      c.id !== except &&
      !terminal.includes(c.status) &&
      c.surfaceIds.includes(surfaceId) &&
      c.start <= date &&
      c.end >= date &&
      c.from < to &&
      c.to > from
    )
      events.push(
        [c.from < from ? from : c.from, 1],
        [c.to > to ? to : c.to, -1],
      );
  events.sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);
  let used = 0;
  let peak = 0;
  for (const [, delta] of events) peak = Math.max(peak, (used += delta));
  return peak;
}
