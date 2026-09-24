'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Grid2X2, Pause, Play } from 'lucide-react';
import Brand from '../../brand';
import TashkentClock from '../../tashkent-clock';
import useLanguage from '../../use-language';
import { devshowHref, loginHref } from '@/lib/navigation';
import '../../mvp.css';
import './display-grid.css';

type Item = {
  campaign: string;
  name: string;
  asset: string;
  mime: string;
  seconds: number;
  url: string;
};
type Manifest = {
  screen: string;
  serverTime: string;
  expires: number;
  items: Item[];
};

export default function DisplayGrid({ screenId }: { screenId: string }) {
  const { uz, toggleLanguage } = useLanguage();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<'' | 'auth' | 'forbidden' | 'network'>('');
  const [now, setNow] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(true);
  const grid = useRef<HTMLDivElement>(null);
  const t = (ru: string, uzText: string) => (uz ? uzText : ru);

  useEffect(() => {
    let active = true;
    async function sync() {
      try {
        const response = await fetch(
          '/api/display?screen=' + encodeURIComponent(screenId),
          { cache: 'no-store' },
        );
        if (!response.ok) {
          if (active) {
            setManifest(null);
            setError(
              response.status === 401
                ? 'auth'
                : response.status === 403
                  ? 'forbidden'
                  : 'network',
            );
          }
          return;
        }
        const result = (await response.json()) as Manifest;
        if (!active) return;
        setManifest(result);
        setClockOffset(Date.parse(result.serverTime) - Date.now());
        setError('');
      } catch {
        if (active) {
          setManifest(null);
          setError('network');
        }
      }
    }
    void sync();
    const polling = setInterval(() => void sync(), 10000);
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(polling);
      clearInterval(clock);
    };
  }, [screenId]);

  const signature = manifest?.items.map((item) => item.asset).join('|') || '';
  useEffect(() => setCursor(0), [signature]);
  useEffect(() => {
    if (!playing || (manifest?.items.length || 0) < 2) return;
    const rotation = setInterval(() => setCursor((value) => value + 1), 8000);
    return () => clearInterval(rotation);
  }, [playing, signature, manifest?.items.length]);
  useEffect(() => {
    for (const video of grid.current?.querySelectorAll('video') || []) {
      if (playing) void video.play().catch(() => {});
      else video.pause();
    }
  }, [playing, cursor, signature]);

  const current =
    manifest && manifest.expires > now + clockOffset ? manifest.items : [];
  const visible = Array.from({ length: 4 }, (_, index) =>
    index < current.length ? current[(cursor + index) % current.length] : null,
  );
  const status =
    error === 'auth'
      ? t('Войдите в кабинет владельца', 'Ekran egasi kabinetiga kiring')
      : error === 'forbidden'
        ? t('Нет доступа к этому экрану', 'Bu ekranga kirish huquqi yo‘q')
        : error === 'network'
          ? t('Нет связи с сервером', 'Server bilan aloqa yo‘q')
          : manifest && manifest.expires <= now + clockOffset
            ? t('Обновляем расписание…', 'Jadval yangilanmoqda…')
            : current.length
              ? t(
                  'Сетка обновляется автоматически',
                  'Setka avtomatik yangilanadi',
                )
              : t(
                  'Ожидаем активные размещения',
                  'Faol joylashtirishlar kutilmoqda',
                );

  return (
    <div className="mvp display-page">
      <header className="display-header">
        <a href="/" className="wordmark" aria-label="Maydonlar — bosh sahifa">
          <Brand />
        </a>
        <a href="/?view=operator" className="display-back">
          <ArrowLeft size={17} aria-hidden="true" />
          {t('Мои экраны', 'Ekranlarim')}
        </a>
        <button type="button" className="language" onClick={toggleLanguage}>
          {uz ? 'RU' : 'UZ'}
        </button>
      </header>

      <main className="display-main">
        <div className="display-heading">
          <div>
            <p className="kicker">
              {t('ПО КАЛЕНДАРЮ ЭКРАНА', 'EKRAN TAQVIMI BO‘YICHA')}
            </p>
            <h1>{t('Сетка эфира', 'Efir setkasi')}</h1>
            <p>
              {t(
                'Материалы, которые сейчас активны по расписанию.',
                'Hozir jadval bo‘yicha faol bo‘lgan materiallar.',
              )}
            </p>
          </div>
          <div className="display-heading-status">
            <Grid2X2 size={19} aria-hidden="true" />
            <span>
              {manifest?.screen || t('Экран', 'Ekran')}
              <small>
                {current.length} {t('активных материалов', 'faol material')}
              </small>
            </span>
          </div>
        </div>

        <div className="display-time-bar">
          <TashkentClock instantMs={now ? now + clockOffset : 0} uz={uz} />
          <p>
            {t(
              'Показ сверяется с этим временем. Расписание обновляется примерно каждые 10 секунд.',
              'Ko‘rsatish shu vaqtga qarab ishlaydi. Jadval taxminan har 10 soniyada yangilanadi.',
            )}
          </p>
        </div>

        <section
          className="display-stage"
          aria-label={t('Сетка материалов', 'Materiallar setkasi')}
        >
          <div className="display-stage-top">
            <span
              className={
                'display-live-dot' + (current.length ? ' is-active' : '')
              }
              aria-hidden="true"
            />
            <strong>
              {t('По текущему расписанию', 'Joriy jadval bo‘yicha')}
            </strong>
            <span>{manifest?.screen || 'MAYDONLAR'}</span>
          </div>
          <div className="display-grid" ref={grid}>
            {visible.map((item, index) => (
              <div
                className={'display-tile' + (item ? ' has-media' : '')}
                key={
                  item ? `${index}-${item.asset}-${cursor}` : `empty-${index}`
                }
              >
                {item ? (
                  <>
                    {item.mime.startsWith('video/') ? (
                      <video
                        src={item.url}
                        autoPlay={playing}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img src={item.url} alt={item.name} />
                    )}
                    <span className="display-tile-label">
                      <b>{String(index + 1).padStart(2, '0')}</b>
                      <span>{item.name}</span>
                    </span>
                  </>
                ) : (
                  <span className="display-tile-empty">
                    <span className="display-tile-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{t('Нет размещения', 'Joylashtirish yo‘q')}</span>
                  </span>
                )}
              </div>
            ))}
            {(error === 'auth' || error === 'forbidden') && (
              <div className="display-gate">
                <strong>{status}</strong>
                <p>
                  {t(
                    'Сетка доступна владельцу этого экрана.',
                    'Setka ushbu ekran egasiga ochiq.',
                  )}
                </p>
                <a
                  href={
                    error === 'auth'
                      ? loginHref(
                          'operator',
                          devshowHref(screenId),
                        )
                      : '/?view=operator'
                  }
                >
                  {error === 'auth'
                    ? t('Войти', 'Kirish')
                    : t('Мои экраны', 'Ekranlarim')}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
          <div className="display-stage-bottom">
            <span>{status}</span>
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              disabled={current.length < 2}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing
                ? t('Пауза сетки', 'Setkani to‘xtatish')
                : t('Продолжить', 'Davom ettirish')}
            </button>
          </div>
        </section>

        <div className="display-note">
          <p>
            {t(
              'Это просмотр сетки для владельца. Показы на LED идут в отдельном плеере: каждый материал — во весь экран, по календарю. Просмотр этой страницы не засчитывается как показ.',
              'Bu ekran egasi uchun setka ko‘rinishi. LED pleyerda har bir material taqvim bo‘yicha butun ekranda ko‘rsatiladi. Bu sahifani ko‘rish namoyish sifatida hisoblanmaydi.',
            )}
          </p>
          <a
            href={
              error === 'auth'
                ? loginHref(
                    'operator',
                    devshowHref(screenId),
                  )
                : '/?view=operator'
            }
          >
            {error === 'auth'
              ? t('Войти', 'Kirish')
              : t('Открыть кабинет', 'Kabinetni ochish')}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </main>
    </div>
  );
}
