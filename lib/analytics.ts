import type { Campaign, Reservation, Surface } from './model';

export type OccupancyDay = {
  date: string;
  bookedMinutes: number;
  capacityMinutes: number;
  bookings: number;
  closed: boolean;
  percent: number;
};

export type OccupancyRow = {
  surface: Surface;
  days: OccupancyDay[];
  bookedMinutes: number;
  capacityMinutes: number;
  bookings: number;
  bookedDays: number;
  closedDays: number;
  percent: number;
};

export type OccupancySummary = {
  rows: OccupancyRow[];
  dates: string[];
  screens: number;
  published: number;
  bookedCalendars: number;
  bookings: number;
  pending: number;
  bookedMinutes: number;
  capacityMinutes: number;
  percent: number;
};

function minutes(value: string) {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
}

function percent(booked: number, capacity: number) {
  return capacity ? Math.round((booked / capacity) * 1000) / 10 : 0;
}

function occupiedMinutes(
  surface: Surface,
  date: string,
  reservations: Reservation[],
) {
  const start = minutes(surface.opens);
  const end = minutes(surface.closes);
  const events: [number, number][] = [
    [start, 0],
    [end, 0],
  ];
  let bookings = 0;
  for (const reservation of reservations) {
    if (
      !reservation.surfaceIds.includes(surface.id) ||
      reservation.start > date ||
      reservation.end < date ||
      ['cancelled', 'completed', 'expired'].includes(reservation.status)
    )
      continue;
    const from = Math.max(start, minutes(reservation.from));
    const to = Math.min(end, minutes(reservation.to));
    if (from >= to) continue;
    bookings++;
    events.push([from, 1], [to, -1]);
  }
  events.sort((a, b) => a[0] - b[0]);
  let bookedMinutes = 0;
  let active = 0;
  let cursor = start;
  for (let index = 0; index < events.length;) {
    const at = events[index][0];
    bookedMinutes += (at - cursor) * Math.min(surface.slots, active);
    while (index < events.length && events[index][0] === at)
      active += events[index++][1];
    cursor = at;
  }
  return { bookedMinutes, bookings };
}

export function occupancySummary(
  surfaces: Surface[],
  reservations: Reservation[],
  campaigns: Campaign[],
  unavailable: { id: string; start: string; end: string }[],
  from: string,
  length = 7,
): OccupancySummary {
  const dates = Array.from({ length }, (_, offset) =>
    new Date(Date.parse(from + 'T00:00:00Z') + offset * 86400000)
      .toISOString()
      .slice(0, 10),
  );
  const last = dates.at(-1) || from;
  const rows = surfaces.map((surface) => {
    const days = dates.map((date) => {
      const closed = unavailable.some(
        (period) =>
          period.id === surface.id &&
          period.start <= date &&
          period.end >= date,
      );
      const available = surface.status === 'published' && !closed;
      const { bookedMinutes, bookings } = occupiedMinutes(
        surface,
        date,
        reservations,
      );
      const capacityMinutes = available
        ? (minutes(surface.closes) - minutes(surface.opens)) * surface.slots
        : 0;
      return {
        date,
        bookedMinutes,
        capacityMinutes,
        bookings,
        closed,
        percent: percent(bookedMinutes, capacityMinutes),
      };
    });
    const bookedMinutes = days.reduce((sum, day) => sum + day.bookedMinutes, 0);
    const capacityMinutes = days.reduce(
      (sum, day) => sum + day.capacityMinutes,
      0,
    );
    const bookingIds = new Set(
      reservations
        .filter(
          (reservation) =>
            reservation.surfaceIds.includes(surface.id) &&
            reservation.start <= last &&
            reservation.end >= from &&
            !['cancelled', 'completed', 'expired'].includes(reservation.status),
        )
        .map((reservation) => reservation.id),
    );
    return {
      surface,
      days,
      bookedMinutes,
      capacityMinutes,
      bookings: bookingIds.size,
      bookedDays: days.filter((day) => day.bookedMinutes > 0).length,
      closedDays: days.filter((day) => day.closed).length,
      percent: percent(bookedMinutes, capacityMinutes),
    };
  });
  const surfaceIds = new Set(surfaces.map((surface) => surface.id));
  const bookedIds = new Set(
    reservations
      .filter(
        (reservation) =>
          reservation.surfaceIds.some((id) => surfaceIds.has(id)) &&
          reservation.start <= last &&
          reservation.end >= from &&
          !['cancelled', 'completed', 'expired'].includes(reservation.status),
      )
      .map((reservation) => reservation.id),
  );
  const bookedMinutes = rows.reduce((sum, row) => sum + row.bookedMinutes, 0);
  const capacityMinutes = rows.reduce(
    (sum, row) => sum + row.capacityMinutes,
    0,
  );
  return {
    rows,
    dates,
    screens: surfaces.length,
    published: surfaces.filter((surface) => surface.status === 'published')
      .length,
    bookedCalendars: rows.filter((row) => row.bookedMinutes > 0).length,
    bookings: bookedIds.size,
    pending: campaigns.filter(
      (campaign) =>
        bookedIds.has(campaign.id) &&
        ['moderation', 'revision'].includes(campaign.status),
    ).length,
    bookedMinutes,
    capacityMinutes,
    percent: percent(bookedMinutes, capacityMinutes),
  };
}
