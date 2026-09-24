'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Monitor,
} from 'lucide-react';
import Brand from '../brand';
import useLanguage from '../use-language';
import { loginHref, viewHref } from '@/lib/navigation';
import '../mvp.css';
import './partners.css';

export default function PartnerLanding() {
  const { uz, toggleLanguage } = useLanguage();
  const [owner, setOwner] = useState(false);
  const t = (ru: string, uzText: string) => (uz ? uzText : ru);

  useEffect(() => {
    let active = true;
    fetch('/api/auth', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        const user = (result as { user?: { role?: string } | null }).user;
        if (active)
          setOwner(user?.role === 'operator' || user?.role === 'admin');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const cabinetHref = owner
    ? viewHref('operator')
    : loginHref('operator', viewHref('operator'));

  return (
    <div className="mvp partners-page">
      <header className="partners-header">
        <a href="/" className="wordmark" aria-label="Maydonlar — главная">
          <Brand />
        </a>
        <nav aria-label={t('Навигация для партнёров', 'Hamkorlar menyusi')}>
          <a href="#how">{t('Как это работает', 'Qanday ishlaydi')}</a>
          <a href="#tools">{t('Возможности', 'Imkoniyatlar')}</a>
          <a href="/?view=catalog">{t('Экраны', 'Ekranlar')}</a>
        </nav>
        <div className="partners-header-actions">
          <button
            type="button"
            className="language"
            onClick={toggleLanguage}
            aria-label={t('Сменить язык', 'Tilni o‘zgartirish')}
          >
            {uz ? 'RU' : 'UZ'}
          </button>
          <a href={cabinetHref} className="partners-cabinet-link">
            {t('Кабинет партнёра', 'Hamkor kabineti')}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main className="partners-main">
        <section className="partners-hero" aria-labelledby="partners-title">
          <div className="partners-hero-copy">
            <p className="kicker">
              {t(
                'MAYDONLAR · ДЛЯ ВЛАДЕЛЬЦЕВ ЭКРАНОВ',
                'MAYDONLAR · EKRAN EGALARI UCHUN',
              )}
            </p>
            <h1 id="partners-title">
              {t('СВОБОДНЫЙ ЧАС ЭКРАНА —', 'BO‘SH VAQT —')}
              <br />
              <em>{t('упущенный доход.', 'boy berilgan daromad.')}</em>
            </h1>
            <p className="partners-lead">
              {t(
                'Добавьте экран в Maydonlar и укажите свободное время в расписании. Клиенты смогут заказывать и короткие размещения. Вы сами решаете, какие заказы принять.',
                'Ekraningizni Maydonlar’ga qo‘shing va bo‘sh vaqtlarini belgilang. Mijozlar qisqa vaqt uchun ham so‘rov yubora oladi. Qaysi so‘rovni qabul qilishni o‘zingiz tanlaysiz.',
              )}
            </p>
            <div className="partners-hero-actions">
              <a href={cabinetHref} className="primary">
                {t('Добавить экран', 'Ekran qo‘shish')}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <a href="#how" className="secondary">
                {t('Как это работает', 'Qanday ishlaydi')}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
            <p className="partners-small-note">
              {t(
                'Уже размещаете экраны? Войдите в кабинет и продолжайте работу.',
                'Ekranlaringiz bormi? Kabinetga kiring va ishni davom ettiring.',
              )}
            </p>
          </div>

          <div
            className="partners-preview"
            aria-label={t('Пример календаря экрана', 'Ekran jadvali namunasi')}
          >
            <div className="partners-preview-top">
              <span className="partners-preview-icon">
                <Monitor size={19} aria-hidden="true" />
              </span>
              <div>
                <strong>{t('Ваш LED-экран', 'LED ekraningiz')}</strong>
                <small>
                  {t('Расписание размещений', 'Joylashtirish jadvali')}
                </small>
              </div>
              <span className="partners-preview-dot" />
            </div>
            <div className="partners-preview-label">
              <span>{t('СВОБОДНОЕ ВРЕМЯ', 'BO‘SH VAQT')}</span>
              <CalendarDays size={17} aria-hidden="true" />
            </div>
            <div className="partners-preview-calendar">
              {[
                t('ПН', 'DU'),
                t('ВТ', 'SE'),
                t('СР', 'CH'),
                t('ЧТ', 'PA'),
                t('ПТ', 'JU'),
                t('СБ', 'SH'),
                t('ВС', 'YA'),
              ].map((day) => (
                <span className="partners-preview-day" key={day}>
                  {day}
                </span>
              ))}
              {[
                'free',
                'busy',
                'free',
                'free',
                'busy',
                'free',
                'free',
                'free',
                'free',
                'busy',
                'free',
                'free',
                'busy',
                'free',
              ].map((status, index) => (
                <span className={'partners-preview-slot ' + status} key={index}>
                  {status === 'busy'
                    ? t('Занято', 'Band')
                    : t('Свободно', 'Bo‘sh')}
                </span>
              ))}
            </div>
            <p className="partners-preview-earnings">
              {t(
                'Каждый свободный час — возможность дополнительного дохода.',
                'Har bir bo‘sh soat — qo‘shimcha daromad imkoniyati.',
              )}
            </p>
            <div className="partners-preview-bottom">
              <span className="partners-preview-request-icon">
                <ClipboardCheck size={19} aria-hidden="true" />
              </span>
              <div>
                <strong>{t('Новый заказ', 'Yangi so‘rov')}</strong>
                <small>
                  {t(
                    'Проверьте материал и время',
                    'Material va vaqtni tekshiring',
                  )}
                </small>
              </div>
              <ArrowUpRight size={20} aria-hidden="true" />
            </div>
          </div>
        </section>

        <section
          className="partners-steps"
          id="how"
          aria-label={t('Как это работает', 'Qanday ishlaydi')}
        >
          {[
            [
              '01',
              t('Добавьте экран', 'Ekranni qo‘shing'),
              t(
                'Место, формат, параметры и цену.',
                'Joylashuv, format, parametrlar va narx.',
              ),
            ],
            [
              '02',
              t('Откройте расписание', 'Jadvalni oching'),
              t(
                'Покажите свободные часы в расписании.',
                'Jadvaldagi bo‘sh soatlarni belgilang.',
              ),
            ],
            [
              '03',
              t('Принимайте заказы', 'So‘rovlarga javob bering'),
              t(
                'Согласовывайте материалы и отслеживайте статус.',
                'Rasm yoki videoni ko‘ring va so‘rovni qabul qilish-qilmaslikni tanlang.',
              ),
            ],
          ].map(([number, title, description]) => (
            <div key={number}>
              <span>{number}</span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </div>
          ))}
        </section>

        <section
          className="partners-tools"
          id="tools"
          aria-labelledby="partners-tools-title"
        >
          <div className="partners-tools-heading">
            <div>
              <p className="kicker">{t('ОДИН КАБИНЕТ', 'BITTA KABINET')}</p>
              <h2 id="partners-tools-title">
                {t(
                  'Всё по вашим экранам — в одном месте',
                  'Ekranlaringiz haqida hammasi bir joyda',
                )}
              </h2>
            </div>
            <p>
              {t(
                'Без сложного онбординга: начните с одного экрана и его расписания.',
                'Avval bitta ekran qo‘shing. Keyin uning bo‘sh vaqtlarini belgilang.',
              )}
            </p>
          </div>
          <div className="partners-tool-grid">
            {[
              [
                <CalendarDays size={26} key="calendar" aria-hidden="true" />,
                t('Календарь', 'Taqvim'),
                t(
                  'Свободные и занятые слоты по каждому экрану.',
                  'Har bir ekran uchun bo‘sh va band vaqtlar.',
                ),
              ],
              [
                <ClipboardCheck size={26} key="requests" aria-hidden="true" />,
                t('Заказы', 'So‘rovlar'),
                t(
                  'Материалы, согласование и статусы рядом с расписанием.',
                  'So‘rovlar, javoblaringiz va ekran jadvali bir joyda.',
                ),
              ],
              [
                <BarChart3 size={26} key="analytics" aria-hidden="true" />,
                t('Аналитика', 'Tahlil'),
                t(
                  'Занятость экранов и показатели размещений.',
                  'Ekran bandligi va joylashtirish ko‘rsatkichlari.',
                ),
              ],
            ].map(([icon, title, description]) => (
              <article key={String(title)}>
                <div className="partners-tool-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="partners-final">
          <div>
            <p className="kicker">
              {t('НАЧНИТЕ С ОДНОГО ЭКРАНА', 'BITTA EKRANDAN BOSHLANG')}
            </p>
            <h2>
              {t(
                'Покажите свой экран городу.',
                'Ekraningizni shaharga ko‘rsating.',
              )}
            </h2>
          </div>
          <a href={cabinetHref} className="primary">
            {t('Добавить экран', 'Ekran qo‘shish')}
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </section>
        <footer className="partners-footer">
          <span>MAYDONLAR / TASHKENT</span>
          <a href="/">← {t('На главную Maydonlar', 'Maydonlar bosh sahifasiga')}</a>
        </footer>
      </main>
    </div>
  );
}
