import { tashkent, type Campaign, type Surface } from './model';

export const playDurations = [10, 15, 30] as const;

export function tariff(surface: Surface, seconds: number) {
  return surface.pricingMode === 'per-play'
    ? surface.tariffs?.find((item) => item.seconds === seconds)
    : undefined;
}

export function commonDurations(surfaces: Surface[]) {
  if (!surfaces.length || surfaces.some((surface) => surface.pricingMode !== 'per-play')) return [];
  return playDurations.filter((seconds) =>
    surfaces.every((surface) => tariff(surface, seconds)),
  );
}

export function placementTotal(
  surfaces: Surface[],
  days: number,
  playSeconds: number,
  playsPerDay: number,
) {
  if (surfaces.every((surface) => surface.pricingMode === 'per-play')) {
    if (!Number.isInteger(playsPerDay) || playsPerDay < 1) return 0;
    const prices = surfaces.map((surface) => tariff(surface, playSeconds)?.price);
    if (prices.some((price) => !price)) return 0;
    return prices.reduce((sum: number, price) => sum + (price || 0), 0) * playsPerDay * days;
  }
  if (surfaces.some((surface) => surface.pricingMode === 'per-play')) return 0;
  return surfaces.reduce((sum, surface) => sum + surface.price, 0) * days;
}

export function maxPlaysPerDay(
  surface: Surface,
  from: string,
  to: string,
  playSeconds: number,
) {
  const [fromHour, fromMinute] = from.split(':').map(Number);
  const [toHour, toMinute] = to.split(':').map(Number);
  const windowSeconds = ((toHour * 60 + toMinute) - (fromHour * 60 + fromMinute)) * 60;
  // One booking consumes one calendar lane, not the whole display. This
  // conservative bound leaves room for other bookings in the same window.
  return Math.max(0, Math.floor(windowSeconds / (Math.max(1, surface.slots) * playSeconds)));
}

export function nextPlayDue(campaign: Campaign, completedToday: number, now = new Date()) {
  if (!campaign.playsPerDay) return true;
  if (completedToday >= campaign.playsPerDay) return false;
  const local = tashkent(now).slice(11, 19);
  const clockSeconds = (clock: string) => {
    const [hours, minutes, seconds = 0] = clock.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };
  const start = clockSeconds(campaign.from);
  const end = clockSeconds(campaign.to);
  const due = start + completedToday * (end - start) / campaign.playsPerDay;
  return clockSeconds(local) >= due;
}
