'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Grid2X2,
  MapPin,
} from 'lucide-react';
import {
  capacityAvailable,
  dayCount,
  labels,
  occupiedPlaces,
  tashkent,
  type Campaign,
  type Reservation,
  type Surface,
} from '@/lib/model';
import { money } from '@/lib/catalog';
import { devshowHref } from '@/lib/navigation';
import { maxPlaysPerDay, tariff } from '@/lib/pricing';
import { compactDateRange, longDateLabel, monthLabel } from '@/lib/date-labels';
import './availability-calendar.css';

type ClosedPeriod = { id: string; start: string; end: string };
type Period = { start: string; end: string; from: string; to: string; playSeconds?: number; playsPerDay?: number };

function minutes(value: string) {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
}

function clock(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function rows(surface: Surface) {
  const result: { from: string; to: string }[] = [];
  for (let n = minutes(surface.opens); n < minutes(surface.closes); n += 60)
    result.push({
      from: clock(n),
      to: clock(Math.min(n + 60, minutes(surface.closes))),
    });
  return result;
}

function changeMonth(month: string, offset: number) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}

function monthDays(month: string) {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const blanks = (first.getUTCDay() + 6) % 7;
  return [
    ...Array.from({ length: blanks }, () => ''),
    ...Array.from(
      { length: count },
      (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
    ),
  ];
}

function formatDate(date: string, uz: boolean) {
  return longDateLabel(date, uz);
}

function ruPlural(count: number, one: string, few: string, many: string) {
  if (count % 100 >= 11 && count % 100 <= 14) return many;
  if (count % 10 === 1) return one;
  if (count % 10 >= 2 && count % 10 <= 4) return few;
  return many;
}

export default function AvailabilityCalendar({
  surface,
  reservations,
  campaigns,
  unavailable,
  initialDay,
  backToAdmin,
  owner,
  uz,
  busy,
  onBack,
  onReserve,
  onToggleUnavailable,
  onOpenCampaign,
}: {
  surface: Surface;
  reservations: Reservation[];
  campaigns: Campaign[];
  unavailable: ClosedPeriod[];
  initialDay?: string;
  backToAdmin?: boolean;
  owner: boolean;
  uz: boolean;
  busy: boolean;
  onBack: () => void;
  onReserve: (period: Period) => void;
  onToggleUnavailable: (period: ClosedPeriod) => void;
  onOpenCampaign: (id: string) => void;
}) {
  const today = tashkent().slice(0, 10);
  const currentTime = tashkent().slice(11, 16);
  const startingDay =
    initialDay &&
    /^\d{4}-\d{2}-\d{2}$/.test(initialDay) &&
    !Number.isNaN(Date.parse(initialDay)) &&
    initialDay >= today
      ? initialDay
      : today;
  const [day, setDay] = useState(startingDay);
  const [month, setMonth] = useState(startingDay.slice(0, 7));
  const [end, setEnd] = useState(startingDay);
  const [chosen, setChosen] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [playSeconds, setPlaySeconds] = useState(surface.tariffs?.[0]?.seconds || 10);
  const [playsPerDay, setPlaysPerDay] = useState(10);
  const perPlay = surface.pricingMode === 'per-play';
  const t = (ru: string, uzText: string) => (uz ? uzText : ru);
  const screenReservations = reservations.filter((c) =>
    c.surfaceIds.includes(surface.id),
  );
  const screenCampaigns = campaigns.filter((c) =>
    c.surfaceIds.includes(surface.id),
  );
  const closed = (date: string) =>
    unavailable.find(
      (period) =>
        period.id === surface.id && period.start <= date && period.end >= date,
    );
  const hours = rows(surface);
  const remaining = (date: string, from: string, to: string) =>
    surface.slots -
    occupiedPlaces(screenReservations, surface.id, date, from, to);
  const future = (date: string, to: string) =>
    date > today || (date === today && to > currentTime);
  const hasTime = (date: string) =>
    !closed(date) &&
    hours.some(
      (hour) =>
        future(date, hour.from) && remaining(date, hour.from, hour.to) > 0,
    );
  const shownHours = owner
    ? hours
    : hours.filter((hour) => future(day, hour.from));
  const days = monthDays(month);
  let count = 0;
  let available = false;
  if (chosen && end >= day) {
    try {
      count = dayCount(day, end);
      available =
        future(day, chosen.from) &&
        !unavailable.some(
          (period) =>
            period.id === surface.id &&
            period.start <= end &&
            period.end >= day,
        ) &&
        capacityAvailable(
          { campaigns: screenReservations },
          surface,
          day,
          end,
          chosen.from,
          chosen.to,
        ) &&
        (!perPlay || (playsPerDay >= 1 && playsPerDay <= maxPlaysPerDay(surface, chosen.from, chosen.to, playSeconds)));
    } catch {
      available = false;
    }
  }
  const dayCampaigns = screenCampaigns
    .filter((campaign) => campaign.start <= day && campaign.end >= day)
    .sort((a, b) => a.from.localeCompare(b.from));
  const closure = closed(day);

  return (
    <section
      className="availability-page"
      aria-label={t('Календарь экрана', 'Ekran taqvimi')}
    >
      <button className="availability-back" type="button" onClick={onBack}>
        <ArrowLeft size={17} />{' '}
        {owner
          ? backToAdmin
            ? t('В аналитику', 'Tahlilga qaytish')
            : t('Мои экраны', 'Ekranlarim')
          : t('Все экраны', 'Barcha ekranlar')}
      </button>
      <div className="availability-heading">
        <div>
          <p className="kicker">
            {owner
              ? t('КАЛЕНДАРЬ ВЛАДЕЛЬЦА', 'EGANING TAQVIMI')
              : t('ВЫБОР ДАТЫ И ВРЕМЕНИ', 'SANA VA VAQTNI TANLASH')}
          </p>
          <h1>{surface.name}</h1>
          <p className="availability-address">
            <MapPin size={15} /> {surface.address}
          </p>
          {owner && (
            <a
              className="availability-display-link"
              href={devshowHref(surface.id)}
            >
              <Grid2X2 size={16} aria-hidden="true" />
              {t('Смотреть сетку эфира', 'Ekran jadvalini ko‘rish')}
            </a>
          )}
        </div>
        <div className="availability-price">
          <strong>{perPlay ? t('от ', 'boshlab ') : ''}{money(surface.price)}</strong>
          <span>
            {perPlay
              ? t('за один показ', 'bir ko‘rsatish uchun')
              : t('за сутки', 'kuniga')}
          </span>
        </div>
      </div>
      <div className="availability-layout">
        <div className="availability-month">
          <div className="availability-month-bar">
            <h2>
              <CalendarDays size={21} />{' '}
              {monthLabel(month, uz)}
            </h2>
            <div className="availability-month-actions">
              <button
                type="button"
                aria-label={t('Предыдущий месяц', 'Oldingi oy')}
                disabled={!owner && month <= today.slice(0, 7)}
                onClick={() => setMonth(changeMonth(month, -1))}
              >
                <ArrowLeft size={17} />
              </button>
              <button
                type="button"
                aria-label={t('Следующий месяц', 'Keyingi oy')}
                onClick={() => setMonth(changeMonth(month, 1))}
              >
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
          <div className="availability-weekdays" aria-hidden="true">
            {(uz
              ? ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya']
              : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
            ).map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="availability-days">
            {days.map((date, index) => {
              if (!date)
                return (
                  <span key={`blank-${index}`} className="availability-blank" />
                );
              const isClosed = !!closed(date);
              const open = hasTime(date);
              const bookingCount = screenReservations.filter(
                (c) => c.start <= date && c.end >= date,
              ).length;
              return (
                <button
                  key={date}
                  type="button"
                  aria-label={formatDate(date, uz)}
                  aria-pressed={date === day}
                  disabled={!owner && !open}
                  className={`availability-day${date === day ? ' is-selected' : ''}${isClosed ? ' is-closed' : ''}`}
                  onClick={() => {
                    setDay(date);
                    setEnd(date);
                    setChosen(null);
                  }}
                >
                  <strong>{Number(date.slice(8))}</strong>
                  <small>
                    {isClosed
                      ? t('Закрыто', 'Yopiq')
                      : !owner && date < today
                        ? ''
                        : owner
                          ? bookingCount
                            ? `${bookingCount} ${uz ? 'so‘rov' : ruPlural(bookingCount, 'заявка', 'заявки', 'заявок')}`
                            : t('Свободно', 'Bo‘sh')
                          : open
                            ? t('Есть время', 'Vaqt bor')
                            : t('Нет мест', 'Joy yo‘q')}
                  </small>
                </button>
              );
            })}
          </div>
          <p className="availability-tz">
            <Clock3 size={15} />{' '}
            {t(
              'Все часы указаны по Ташкенту (UTC+5).',
              'Barcha vaqtlar Toshkent bo‘yicha (UTC+5).',
            )}
          </p>
        </div>
        <div className="availability-detail">
          <div className="availability-detail-head">
            <h2>{formatDate(day, uz)}</h2>
            <p>
              {t(
                `Работает ${surface.opens}–${surface.closes}`,
                `Ish vaqti ${surface.opens}–${surface.closes}`,
              )}
            </p>
          </div>
          {owner ? (
            <>
              <div className="availability-owner-stats">
                <strong>{dayCampaigns.length}</strong>
                <span>
                  {uz
                    ? 'shu kundagi joylashtirishlar'
                    : `${ruPlural(dayCampaigns.length, 'размещение', 'размещения', 'размещений')} на эту дату`}
                </span>
              </div>
              <div
                className="availability-hours"
                aria-label={t('Занятость по часам', 'Soatlar bo‘yicha bandlik')}
              >
                {hours.map((hour) => {
                  const used =
                    surface.slots - remaining(day, hour.from, hour.to);
                  return (
                    <div className="availability-hour" key={hour.from}>
                      <span>
                        {hour.from}–{hour.to}
                      </span>
                      <span
                        className="availability-capacity-track"
                        aria-hidden="true"
                      >
                        <span
                          style={{
                            width: `${Math.min(100, (used / surface.slots) * 100)}%`,
                          }}
                        />
                      </span>
                      <strong>
                        {t(
                          `Занято ${used} из ${surface.slots} мест`,
                          `${surface.slots} o‘rindan ${used} tasi band`,
                        )}
                      </strong>
                    </div>
                  );
                })}
              </div>
              <h3>{t('Размещения', 'Joylashtirishlar')}</h3>
              {dayCampaigns.length ? (
                <div className="availability-bookings">
                  {dayCampaigns.map((campaign) => (
                    <button
                      type="button"
                      key={campaign.id}
                      onClick={() => onOpenCampaign(campaign.id)}
                    >
                      <span>
                        <strong>{campaign.name}</strong>
                        <small>
                          {campaign.from}–{campaign.to}
                        </small>
                      </span>
                      <span className={`status status-${campaign.status}`}>
                        {labels[campaign.status]?.[uz ? 1 : 0] ||
                          campaign.status}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="availability-none">
                  {t('На эту дату заявок нет.', 'Bu kunda so‘rov yo‘q.')}
                </p>
              )}
              <div className="availability-closure">
                <h3>{t('Доступность экрана', 'Ekran mavjudligi')}</h3>
                <p>
                  {closure
                    ? t(
                        `Закрыт на период ${compactDateRange(closure.start, closure.end)}`,
                        `${compactDateRange(closure.start, closure.end)} davrida yopiq`,
                      )
                    : t(
                        'Дата открыта для размещений.',
                        'Sana joylashtirish uchun ochiq.',
                      )}
                </p>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || (!closure && dayCampaigns.length > 0)}
                  onClick={() =>
                    onToggleUnavailable(
                      closure || { id: surface.id, start: day, end: day },
                    )
                  }
                >
                  {closure
                    ? t('Открыть этот период', 'Bu davrni ochish')
                    : t('Закрыть этот день', 'Bu kunni yopish')}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="availability-intro">
                {perPlay
                  ? t('Выберите время, длительность и количество показов.', 'Vaqtni, davomiylikni va ko‘rsatishlar sonini tanlang.')
                  : t('Выберите свободное время размещения.', 'Joylashtirish uchun bo‘sh vaqtni tanlang.')}
              </p>
              <div
                className="availability-hours"
                role="group"
                aria-label={t('Время показа', 'Ko‘rsatish vaqti')}
              >
                {shownHours.map((hour) => {
                  const free = remaining(day, hour.from, hour.to);
                  const canChoose =
                    !closure && future(day, hour.from) && free > 0;
                  return (
                    <button
                      className="availability-slot"
                      type="button"
                      key={hour.from}
                      aria-pressed={
                        chosen?.from === hour.from && chosen.to === hour.to
                      }
                      disabled={!canChoose}
                      onClick={() => setChosen(hour)}
                    >
                      <span>
                        {hour.from}–{hour.to}
                      </span>
                      <strong>
                        {canChoose
                          ? t(
                              `Свободно ${free} из ${surface.slots} мест`,
                              `${surface.slots} o‘rindan ${free} tasi bo‘sh`,
                            )
                          : t('Недоступно', 'Tanlab bo‘lmaydi')}
                      </strong>
                    </button>
                  );
                })}
                {!shownHours.length && (
                  <p className="availability-none">
                    {t(
                      'На эту дату время уже прошло.',
                      'Bu sanada vaqt tugagan.',
                    )}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="availability-full-day"
                disabled={
                  !!closure ||
                  !future(day, surface.opens) ||
                  !capacityAvailable(
                    { campaigns: screenReservations },
                    surface,
                    day,
                    day,
                    surface.opens,
                    surface.closes,
                  )
                }
                onClick={() =>
                  setChosen({ from: surface.opens, to: surface.closes })
                }
              >
                {t('Выбрать всё рабочее время', 'Butun ish vaqtini tanlash')}
              </button>
              {chosen && (
                <div className="availability-checkout">
                  {perPlay && (
                    <div className="form-grid">
                      <label>
                        {t('Длительность показа', 'Ko‘rsatish davomiyligi')}
                        <select value={playSeconds} onChange={(event) => setPlaySeconds(Number(event.target.value))}>
                          {surface.tariffs?.map((item) => (
                            <option key={item.seconds} value={item.seconds}>{item.seconds} {t('секунд', 'soniya')} · {money(item.price)}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t('Показов в день', 'Kuniga ko‘rsatishlar soni')}
                        <input type="number" min="1" max={maxPlaysPerDay(surface, chosen.from, chosen.to, playSeconds)} value={playsPerDay} onChange={(event) => setPlaysPerDay(Number(event.target.value))} />
                      </label>
                    </div>
                  )}
                  <label>
                    {t('Показывать ежедневно до', 'Qaysi kungacha ko‘rsatilsin?')}
                    <input
                      type="date"
                      min={day}
                      max={new Date(Date.parse(day) + 89 * 86400000)
                        .toISOString()
                        .slice(0, 10)}
                      value={end}
                      onChange={(event) => setEnd(event.target.value)}
                    />
                  </label>
                  <div className="availability-total">
                    <span>
                      {t('Итого', 'Jami')} · {count || '—'} {t('дн.', 'kun')}
                    </span>
                    <strong>
                      {count ? money(perPlay ? (tariff(surface, playSeconds)?.price || 0) * playsPerDay * count : surface.price * count) : '—'}
                    </strong>
                  </div>
                  {!available && (
                    <p role="status" className="availability-warning">
                      {t(
                        'На выбранный период нет свободного места. Выберите другое время или сократите даты.',
                        'Tanlangan davrda bo‘sh o‘rin yo‘q. Boshqa vaqt yoki qisqaroq muddatni tanlang.',
                      )}
                    </p>
                  )}
                  <button
                    type="button"
                    className="primary full"
                    disabled={!available || busy}
                    onClick={() =>
                      onReserve({
                        start: day,
                        end,
                        from: chosen.from,
                        to: chosen.to,
                        playSeconds: perPlay ? playSeconds : undefined,
                        playsPerDay: perPlay ? playsPerDay : undefined,
                      })
                    }
                  >
                    {t(
                      'Продолжить размещение',
                      'Joylashtirishni davom ettirish',
                    )}{' '}
                    <ArrowRight size={17} />
                  </button>
                  <p className="availability-price-note">
                    {perPlay
                      ? t('Итог: цена одного показа × показов в день × число дней. Показ зависит от работы подключённого плеера.', 'Jami: bir ko‘rsatish narxi × kunlik ko‘rsatishlar × kunlar soni. Rasm yoki video faqat pleyer ulanganida ko‘rsatiladi.')
                      : t('Суточный тариф. Время удерживается после оформления.', 'Kunlik narx. Vaqt rasmiylashtirilgandan keyin saqlanadi.')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
