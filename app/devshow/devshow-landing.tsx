'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Grid2X2, Monitor, Play } from 'lucide-react';
import Brand from '../brand';
import TashkentClock from '../tashkent-clock';
import useLanguage from '../use-language';
import type { Surface, User } from '@/lib/model';
import '../mvp.css';
import './devshow.css';

const examples = [
  { uz: 'Surat', ru: 'Фото', tone: 'photo', copyUz: 'Shaharda sizning lahzangiz', copyRu: 'Ваш момент в городе' },
  { uz: 'Tabrik', ru: 'Поздравление', tone: 'greeting', copyUz: 'Bugun sizning kuningiz!', copyRu: 'Сегодня ваш день!' },
  { uz: 'E’lon', ru: 'Объявление', tone: 'announcement', copyUz: 'Barchaga ko‘rinadigan xabar', copyRu: 'Сообщение для города' },
];

export default function DevshowLanding() {
  const { uz, toggleLanguage } = useLanguage();
  const [cursor, setCursor] = useState(0);
  const [now, setNow] = useState(0);
  const [screens, setScreens] = useState<Surface[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const t = (ru: string, uzText: string) => (uz ? uzText : ru);

  useEffect(() => {
    const timer = setInterval(() => setCursor((current) => current + 1), 8000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);
  useEffect(() => {
    let active = true;
    void fetch('/api/workspace', { cache: 'no-store' })
      .then((response) => response.json() as Promise<{ user?: User | null; surfaces?: Surface[] }>)
      .then((data) => {
        if (!active) return;
        const account = data.user || null;
        setUser(account);
        setScreens(
          account?.role === 'operator' || account?.role === 'admin'
            ? (data.surfaces || []).filter((screen) => account.role === 'admin' || screen.owner === account.id)
            : [],
        );
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <div className="mvp devshow-page">
      <header className="devshow-header">
        <a href="/" className="wordmark" aria-label="Maydonlar — bosh sahifa"><Brand /></a>
        <div className="devshow-header-actions">
          <a href="/" className="devshow-back"><ArrowLeft size={17} /> {t('На главную', 'Bosh sahifaga')}</a>
          <button type="button" className="language" onClick={toggleLanguage}>{uz ? 'RU' : 'UZ'}</button>
        </div>
      </header>

      <main className="devshow-main">
        <section className="devshow-hero">
          <div>
            <p className="kicker">MAYDONLAR · DEVSHOW</p>
            <h1>{t('Посмотрите, как работает сетка.', 'Efir setkasi qanday ishlashini ko‘ring.')}</h1>
            <p className="devshow-lead">
              {t('Здесь — пример показа в четырёх ячейках. Он помогает проверить макет; размещение по календарю и настоящий LED-плеер работают отдельно.', 'Bu yerda to‘rt katakli namoyish namunasi bor. U ko‘rinishni tekshirishga yordam beradi; taqvimdagi joylashtirish va LED pleyer alohida ishlaydi.')}
            </p>
            <div className="devshow-actions">
              <a className="primary" href="/?view=operator">{t('Мои экраны', 'Ekranlarim')} <ArrowUpRight size={17} /></a>
              <a className="secondary" href="/?view=catalog">{t('Посмотреть экраны', 'Ekranlarni ko‘rish')}</a>
            </div>
          </div>
          <div className="devshow-preview" aria-label={t('Пример сетки показа', 'Namoyish setkasi namunasi')}>
            <div className="devshow-preview-top"><Grid2X2 size={16} /> DEVSHOW <span><i /> {t('Демонстрация', 'Namuna')}</span></div>
            <div className="devshow-clock-bar">
              <TashkentClock instantMs={now} uz={uz} className="tashkent-clock--demo" />
              <span>{t('Здесь пример, не реальный показ', 'Bu namuna, haqiqiy ko‘rsatish emas')}</span>
            </div>
            <div className="devshow-preview-grid">
              {Array.from({ length: 4 }, (_, index) => {
                const example = index === 3 ? null : examples[(cursor + index) % examples.length];
                return (
                  <div className={`devshow-example ${example?.tone || 'empty'}`} key={index}>
                    <span className="devshow-example-number">{String(index + 1).padStart(2, '0')}</span>
                    {example ? (
                      <>
                        <span className="devshow-example-art" aria-hidden="true" />
                        <strong>{uz ? example.copyUz : example.copyRu}</strong>
                        <small>{uz ? example.uz : example.ru}</small>
                      </>
                    ) : (
                      <><Monitor size={35} strokeWidth={1.3} /><strong>{t('Свободная ячейка', 'Bo‘sh katak')}</strong></>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="devshow-preview-bottom"><Play size={15} fill="currentColor" /> {t('Пример автоматически меняется', 'Namuna avtomatik almashadi')}</div>
          </div>
        </section>

        <section className="devshow-owned">
          <div>
            <p className="kicker">{t('ВАШ ЭКРАН', 'SIZNING EKRANINGIZ')}</p>
            <h2>{t('Проверить свою сетку', 'O‘z setkangizni tekshiring')}</h2>
            <p>{t('Владелец видит в ней материалы, которые сейчас активны по расписанию. Сам просмотр не считается показом.', 'Ekran egasi jadval bo‘yicha hozir faol materiallarni ko‘radi. Bu sahifani ko‘rish namoyish sifatida hisoblanmaydi.')}</p>
          </div>
          {screens.length ? (
            <div className="devshow-screen-list">
              {screens.map((screen) => (
                <a key={screen.id} href={'/devshow/' + encodeURIComponent(screen.id)}>
                  <Monitor size={20} /> <span><strong>{screen.name}</strong><small>{screen.address}</small></span><ArrowUpRight size={18} />
                </a>
              ))}
            </div>
          ) : (
            <a className="devshow-owner-link" href={user ? '/?view=operator' : '/login?role=operator&next=%2Fdevshow'}>
              {user ? t('Открыть мои экраны', 'Ekranlarimni ochish') : t('Войти как владелец экрана', 'Ekran egasi sifatida kirish')} <ArrowUpRight size={17} />
            </a>
          )}
        </section>
      </main>
    </div>
  );
}
