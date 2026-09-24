'use client';

import { useState } from 'react';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { occupancySummary } from '@/lib/analytics';
import { shortDayLabel } from '@/lib/date-labels';
import {
  labels,
  tashkent,
  type Campaign,
  type Reservation,
  type Surface,
} from '@/lib/model';
import './screen-analytics.css';

function hours(minutes: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(
    minutes / 60,
  );
}

function bookingWord(count: number, uz: boolean) {
  if (uz) return 'joylashtirish';
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'броней';
  if (count % 10 === 1) return 'бронь';
  if (count % 10 >= 2 && count % 10 <= 4) return 'брони';
  return 'броней';
}

function dayLabel(date: string, uz: boolean) {
  return shortDayLabel(date, uz);
}

export default function ScreenAnalytics({
  surfaces,
  reservations,
  campaigns,
  unavailable,
  uz,
  onOpenCalendar,
}: {
  surfaces: Surface[];
  reservations: Reservation[];
  campaigns: Campaign[];
  unavailable: { id: string; start: string; end: string }[];
  uz: boolean;
  onOpenCalendar: (surface: Surface, date: string) => void;
}) {
  const today = tashkent().slice(0, 10);
  const [from, setFrom] = useState(today);
  const t = (ru: string, uzText: string) => (uz ? uzText : ru);
  const summary = occupancySummary(
    surfaces,
    reservations,
    campaigns,
    unavailable,
    from < today ? today : from,
  );
  const ordered = [...summary.rows].sort(
    (a, b) =>
      Number(b.bookedMinutes > 0) - Number(a.bookedMinutes > 0) ||
      a.surface.name.localeCompare(b.surface.name),
  );

  return (
    <section
      className="screen-analytics"
      aria-label={t('Аналитика экранов', 'Ekranlar tahlili')}
    >
      <div className="screen-analytics-heading">
        <div>
          <p className="kicker">{t('ОБЗОР', 'UMUMIY KO‘RINISH')}</p>
          <h2>{t('Аналитика экранов', 'Ekranlar tahlili')}</h2>
          <p className="muted">
            {t(
              'Занятость календарей на 7 дней по времени Ташкента.',
              'Toshkent vaqti bo‘yicha 7 kunlik taqvim bandligi.',
            )}
          </p>
        </div>
        <label className="screen-analytics-date">
          <CalendarDays size={17} aria-hidden="true" />
          <span>{t('Начиная с', 'Boshlanish sanasi')}</span>
          <input
            type="date"
            aria-label={t(
              'Начало периода аналитики',
              'Tahlil davrining boshlanishi',
            )}
            min={today}
            value={from < today ? today : from}
            onChange={(event) => setFrom(event.target.value || today)}
          />
        </label>
      </div>
      <div className="screen-analytics-metrics">
        <div>
          <span>{t('Экранов', 'Ekranlar')}</span>
          <strong>{summary.screens}</strong>
          <small>
            {t('Опубликовано', 'Saytda ko‘rinadi')}: {summary.published}
          </small>
        </div>
        <div>
          <span>{t('Занятые календари', 'Band taqvimlar')}</span>
          <strong>
            {summary.bookedCalendars} / {summary.published}
          </strong>
          <small>
            {t('с бронью в выбранные 7 дней', 'tanlangan 7 kunda band')}
          </small>
        </div>
        <div>
          <span>{t('Загрузка ротации', 'Ekrandagi joylar bandligi')}</span>
          <strong>{summary.percent}%</strong>
          <small>
            {hours(summary.bookedMinutes)} / {hours(summary.capacityMinutes)}{' '}
            {t('место-часов', 'joy-soat')}
          </small>
        </div>
        <div>
          <span>{t('Брони', 'Band qilingan joylar')}</span>
          <strong>{summary.bookings}</strong>
          <small>
            {summary.pending}{' '}
            {t(
              summary.pending === 1
                ? 'ожидает согласования'
                : 'ожидают согласования',
              'tasdiq kutmoqda',
            )}
          </small>
        </div>
      </div>
      <div className="screen-analytics-table-wrap">
        <div className="screen-analytics-table">
          <div
            className="screen-analytics-row screen-analytics-column-head"
            aria-hidden="true"
          >
            <span>{t('Экран', 'Ekran')}</span>
            <span className="screen-analytics-days">
              {summary.dates.map((date) => (
                <span key={date}>{dayLabel(date, uz)}</span>
              ))}
            </span>
            <span>{t('Итого', 'Jami')}</span>
            <span />
          </div>
          {ordered.map((row) => (
            <div
              className={`screen-analytics-row${row.bookedMinutes ? ' has-bookings' : ''}`}
              key={row.surface.id}
            >
              <div className="screen-analytics-name">
                <strong>{row.surface.name}</strong>
                <small>
                  {labels[row.surface.status]?.[uz ? 1 : 0] ||
                    row.surface.status}{' '}
                  · {row.surface.slots} {t('мест в ротации', 'bir vaqtdagi joy')}
                </small>
              </div>
              <div className="screen-analytics-days">
                {row.days.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    className={`screen-analytics-day${day.closed ? ' is-closed' : ''}`}
                    onClick={() => onOpenCalendar(row.surface, day.date)}
                    aria-label={`${row.surface.name}, ${dayLabel(day.date, uz)}: ${day.closed ? t('закрыто', 'yopiq') : row.surface.status !== 'published' ? t('не опубликован', 'nashr qilinmagan') : `${day.percent}% ${t('занято', 'band')}, ${day.bookings} ${bookingWord(day.bookings, uz)}`}`}
                    title={
                      day.closed
                        ? t('День закрыт', 'Bu kun yopiq')
                        : `${day.bookings} ${bookingWord(day.bookings, uz)}`
                    }
                  >
                    <span
                      style={{
                        height: day.bookedMinutes
                          ? `max(4px, ${day.percent}%)`
                          : '0',
                      }}
                    />
                    <strong>
                      {day.closed
                        ? '×'
                        : row.surface.status === 'published'
                          ? `${day.percent}%`
                          : '—'}
                    </strong>
                  </button>
                ))}
              </div>
              <div className="screen-analytics-total">
                <strong>{row.percent}%</strong>
                <small>
                  {row.bookings} {bookingWord(row.bookings, uz)} ·{' '}
                  {row.bookedDays}/7 {t('дней', 'kun')}
                </small>
              </div>
              <button
                className="screen-analytics-open"
                type="button"
                onClick={() => onOpenCalendar(row.surface, summary.dates[0])}
              >
                {t('Календарь', 'Taqvim')}{' '}
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          {!ordered.length && (
            <p className="screen-analytics-empty">
              {t(
                'Пока нет экранов. Добавьте первый экран, чтобы увидеть занятость.',
                'Hozircha ekranlar yo‘q. Bandlikni ko‘rish uchun ekran qo‘shing.',
              )}
            </p>
          )}
        </div>
      </div>
      <p className="screen-analytics-note">
        {t(
          'Брони включают временные резервы и заявки на согласовании. Процент — занятые место-часы от доступных; закрытые дни исключены.',
          'Bu hisobga vaqtincha ushlab turilgan joylar va javob kutayotgan so‘rovlar ham kiradi. Foiz mavjud joylar vaqtining qancha qismi bandligini bildiradi. Yopiq kunlar hisoblanmaydi.',
        )}
      </p>
    </section>
  );
}
