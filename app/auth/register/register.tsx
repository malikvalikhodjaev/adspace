'use client';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  MonitorPlay,
  MapPin,
  ShieldCheck,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
export default function Register({
  signedIn,
  email,
  returnTo,
}: {
  signedIn: boolean;
  email: string;
  returnTo: '/a' | '/b';
}) {
  const [uz, setUz] = useState(false),
    [first, setFirst] = useState(''),
    [last, setLast] = useState(''),
    [type, setType] = useState('business'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const t = (ru: string, uzText: string) => (uz ? uzText : ru);
  useEffect(() => {
    document.documentElement.lang = uz ? 'uz' : 'ru';
  }, [uz]);
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    void fetch('/api/workspace')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (!active || !data) return;
        const profile = (
          data as { workspace: { profile: { name: string; type: string } } }
        ).workspace.profile;
        const parts = profile.name.split(' ');
        setFirst(parts.shift() || '');
        setLast(parts.join(' '));
        setType(profile.type);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [signedIn]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const name = [first.trim(), last.trim()].filter(Boolean).join(' ');
      if (!name || name.length > 100)
        throw Error(
          t(
            'Укажите имя длиной до 100 символов',
            '100 belgigacha ism kiriting',
          ),
        );
      const r = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'profile',
          role: 'advertiser',
          name,
          type,
        }),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok)
        throw Error(
          result.error ||
            t('Не удалось сохранить профиль', 'Profil saqlanmadi'),
        );
      location.assign(returnTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setBusy(false);
    }
  }
  return (
    <div className="join-page">
      <div className="join-strip">
        <span>
          MAYDONLAR <i />{' '}
          {t('НАРУЖНАЯ РЕКЛАМА ОНЛАЙН', 'TASHQI REKLAMA ONLAYN')}
        </span>
        <a href={returnTo}>
          {t('Посмотреть экраны', 'Ekranlarni ko‘rish')}{' '}
          <ArrowUpRight size={15} />
        </a>
      </div>
      <header className="join-header">
        <a href={'/auth/register?returnTo=' + returnTo} className="wordmark">
          maydonlar
          <span className="brand-dot" /> <sup>UZ</sup>
        </a>
        <div>
          <span>
            {t('Уже знакомы с платформой?', 'Platformani bilasizmi?')}
          </span>
          <a href={returnTo}>{t('В кабинет', 'Kabinetga')}</a>
          <button onClick={() => setUz(!uz)}>{uz ? 'RU' : 'UZ'}</button>
        </div>
      </header>
      <main className="join-layout">
        <section
          className="join-story"
          aria-label={t('Как работает Maydonlar', 'Maydonlar qanday ishlaydi')}
        >
          <div className="welcome-heading">
            <span className="join-kicker">
              {t('ГОРОД — ВАША АУДИТОРИЯ', 'SHAHAR — SIZNING AUDITORIYANGIZ')}
            </span>
            <h1>
              {t('Большой экран.', 'Katta ekran.')}
              <br />
              {t('Ваши возможности.', 'Sizning imkoniyatlaringiz.')}
            </h1>
          </div>
          <div className="join-step highlighted">
            <span className="join-step-icon">
              <MonitorPlay size={30} strokeWidth={1.4} />
            </span>
            <div>
              <h2>
                {t(
                  'Будьте там, где вас увидят',
                  'Sizni ko‘radigan joyda bo‘ling',
                )}
              </h2>
              <p>
                {t(
                  'Размещайте рекламу на LED-экранах Ташкента. Выберите место, которое подходит вашему бизнесу.',
                  'Toshkent LED ekranlarida reklama joylashtiring. Biznesingizga mos manzilni tanlang.',
                )}
              </p>
            </div>
            <span className="step-number">01</span>
          </div>
          <div className="join-step">
            <span className="join-step-icon">
              <MapPin size={30} strokeWidth={1.4} />
            </span>
            <div>
              <h2>
                {t(
                  'Планируйте всё в одном месте',
                  'Barchasini bir joyda rejalashtiring',
                )}
              </h2>
              <p>
                {t(
                  'Сравните площадки на карте, выберите даты и сразу узнайте стоимость вашей кампании.',
                  'Maydonlarni xaritada solishtiring, sanalarni tanlang va kampaniya narxini darhol biling.',
                )}
              </p>
            </div>
            <span className="step-number">02</span>
          </div>
          <div className="join-step">
            <span className="join-step-icon">
              <ShieldCheck size={30} strokeWidth={1.4} />
            </span>
            <div>
              <h2>
                {t('Следите за каждым этапом', 'Har bir bosqichni kuzating')}
              </h2>
              <p>
                {t(
                  'Загрузите материал, отправьте запрос владельцу экрана и следите за размещением в личном кабинете.',
                  'Materialni yuklang, so‘rovni ekran egasiga yuboring va joylashtirishni kabinetda kuzating.',
                )}
              </p>
            </div>
            <span className="step-number">03</span>
          </div>
          <div className="join-bottom">
            <span className="join-city">
              TASHKENT <span>↗</span>
            </span>
            <p>
              {t(
                'От первого экрана до медиаплана по всему городу.',
                'Birinchi ekrandan butun shahar mediaplanigacha.',
              )}
            </p>
            <span className="join-pager">
              <b />
              <i />
              <i />
            </span>
          </div>
        </section>
        <section className="join-card" aria-labelledby="join-title">
          <div className="join-form-header">
            <span className="join-kicker">
              {t('НАЧНЁМ С ВАС', 'SIZDAN BOSHLAYMIZ')}
            </span>
            <h2 id="join-title">
              {t('Создайте свой профиль', 'Profilingizni yarating')}
            </h2>
            <p>
              {t(
                'Ваша следующая кампания начинается здесь.',
                'Keyingi kampaniyangiz shu yerdan boshlanadi.',
              )}
            </p>
          </div>
          <form onSubmit={submit}>
            <div className="join-fields">
              <label>
                {t('Имя', 'Ism')}
                <input
                  autoComplete="given-name"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  maxLength={50}
                  required
                  disabled={!signedIn}
                />
              </label>
              <label>
                {t('Фамилия', 'Familiya')}
                <input
                  autoComplete="family-name"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  maxLength={49}
                  disabled={!signedIn}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  readOnly
                  aria-describedby="identity-note"
                  placeholder={
                    signedIn ? '' : t('После входа', 'Kirgandan keyin')
                  }
                />
              </label>
              <label>
                {t('Страна', 'Mamlakat')}
                <input value={t('Узбекистан', 'O‘zbekiston')} readOnly />
              </label>
            </div>
            <div className="join-type">
              <label id="profile-type-label">
                {t('Вы размещаете рекламу как', 'Siz reklama joylashtirasiz')}
              </label>
              <Select
                value={type}
                onValueChange={(v) => v && setType(String(v))}
                disabled={!signedIn}
              >
                <SelectTrigger aria-labelledby="profile-type-label">
                  <SelectValue>
                    {type === 'business'
                      ? t('Компания', 'Kompaniya')
                      : type === 'ip'
                        ? t(
                            'Индивидуальный предприниматель',
                            'Yakka tartibdagi tadbirkor',
                          )
                        : t('Частное лицо', 'Jismoniy shaxs')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">
                    {t('Компания', 'Kompaniya')}
                  </SelectItem>
                  <SelectItem value="ip">
                    {t(
                      'Индивидуальный предприниматель',
                      'Yakka tartibdagi tadbirkor',
                    )}
                  </SelectItem>
                  <SelectItem value="person">
                    {t('Частное лицо', 'Jismoniy shaxs')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="identity-note" id="identity-note">
              <ShieldCheck size={18} />
              <p>
                {signedIn
                  ? t(
                      'Вы вошли через ChatGPT. Этот профиль сохранится в вашем аккаунте Maydonlar.',
                      'ChatGPT orqali kirdingiz. Profil Maydonlar hisobingizda saqlanadi.',
                    )
                  : t(
                      'Войдите через ChatGPT, чтобы создать профиль и сохранять кампании.',
                      'Profil yaratish va kampaniyalarni saqlash uchun ChatGPT orqali kiring.',
                    )}
              </p>
            </div>
            {error && (
              <p className="join-error" role="alert">
                {error}
              </p>
            )}
            {signedIn ? (
              <button className="join-submit" disabled={busy || !first.trim()}>
                {busy
                  ? t('Сохраняем…', 'Saqlanmoqda…')
                  : t(
                      'Создать профиль и выбрать экраны',
                      'Profil yaratish va ekran tanlash',
                    )}
                <ArrowRight size={18} />
              </button>
            ) : (
              <a
                className="join-submit"
                target="_top"
                href={
                  '/signin-with-chatgpt?return_to=' +
                  encodeURIComponent('/auth/register?returnTo=' + returnTo)
                }
              >
                {t('Продолжить с ChatGPT', 'ChatGPT orqali davom etish')}
                <ArrowRight size={18} />
              </a>
            )}
            <div className="join-divider">
              <span />
              {t('или сначала', 'yoki avval')}
              <span />
            </div>
            <a className="browse-first" href={returnTo}>
              {t(
                'Посмотреть рекламные поверхности',
                'Reklama maydonlarini ko‘rish',
              )}
              <ChevronRight size={17} />
            </a>
          </form>
          <div className="join-note">
            <Check size={16} />
            <span>
              {t(
                'Сейчас оплата не списывается. Показ на физическом экране подтверждается отдельно.',
                'Hozircha to‘lov olinmaydi. Haqiqiy ekrandagi ko‘rsatish alohida tekshiriladi.',
              )}
            </span>
          </div>
        </section>
      </main>
      <footer className="join-footer">
        <span>© {new Date().getFullYear()} Maydonlar</span>
        <span>{t('Ташкент, Узбекистан', 'Toshkent, O‘zbekiston')}</span>
      </footer>
    </div>
  );
}
