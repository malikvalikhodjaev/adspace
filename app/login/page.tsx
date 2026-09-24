'use client';
import { useEffect, useState } from 'react';
import { request } from '../controls';
import { loginDestination } from '@/lib/navigation';
import Brand from '../brand';
import useLanguage from '../use-language';
import '../mvp.css';
export default function Login() {
  const { uz, toggleLanguage } = useLanguage();
  const [register, setRegister] = useState(false),
    [role, setRole] = useState('advertiser'),
    [error, setError] = useState(''),
    [emailError, setEmailError] = useState(''),
    [busy, setBusy] = useState(false),
    [phone, setPhone] = useState(''),
    [code, setCode] = useState(''),
    [shownCode, setShownCode] = useState(''),
    [name, setName] = useState(''),
    [emailOpen, setEmailOpen] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setRole(p.get('role') === 'operator' ? 'operator' : 'advertiser');
    setEmailOpen(p.get('method') === 'email');
  }, []);
  const t = (r: string, u: string) => (uz ? u : r);
  function enter(userRole: 'advertiser' | 'operator' | 'moderator' | 'admin') {
    const next = new URLSearchParams(location.search).get('next');
    location.assign(loginDestination(next, userRole));
  }
  return (
    <main className="mvp login-page">
      <a href="/" className="wordmark" aria-label="Maydonlar — главная">
        <Brand />
      </a>
      <button className="language" onClick={toggleLanguage}>
        {uz ? 'RU' : 'UZ'}
      </button>
      <section className="login-card">
        <p className="kicker">
          MAYDONLAR ·{' '}
          {role === 'operator'
            ? t('КАБИНЕТ ВЛАДЕЛЬЦА ЭКРАНОВ', 'EKRAN EGASI KABINETI')
            : t('КАБИНЕТ РАЗМЕЩЕНИЙ', 'JOYLASHTIRISH KABINETI')}
        </p>
        <h1>{t('Войти в Maydonlar', 'Maydonlar platformasiga kirish')}</h1>
        <p>
          {role === 'operator'
            ? t(
                'Добавляйте экраны, принимайте заявки и управляйте показом.',
                'Ekran qo‘shing, so‘rovlarga javob bering va ko‘rsatish vaqtini boshqaring.',
              )
            : t(
                'Размещайте свои фото, поздравления и рекламу. Следите за согласованием и расписанием.',
                'Surat, tabrik yoki reklamangizni joylashtiring. Ekran egasining javobi va vaqtini shu yerda ko‘ring.',
              )}
        </p>
        {shownCode ? (
          <form
            className="phone-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                const result = await request('/api/auth', {
                  action: 'phone-complete',
                  code,
                  name,
                });
                enter(result.user.role);
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            <p className="muted">
              {t('Номер', 'Raqam')}: <strong>{phone}</strong>
            </p>
            <div className="phone-code" aria-live="polite">
              <span>{t('Код для входа', 'Kirish kodi')}</span>
              <strong>{shownCode}</strong>
              <small>
                {t(
                  'Код показан здесь; SMS не отправляется. Этот профиль доступен только в данном браузере.',
                  'Kod shu yerda ko‘rsatiladi; SMS yuborilmaydi. Bu profil faqat shu brauzerda ochiladi.',
                )}
              </small>
            </div>
            <label>
              {t('Введите код', 'Kodni kiriting')}
              <input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </label>
            <label>
              {t(
                'Как к вам обращаться (необязательно)',
                'Sizga qanday murojaat qilaylik (ixtiyoriy)',
              )}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={100}
              />
            </label>
            {error && (
              <p role="alert" className="alert">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? t('Подождите…', 'Kuting…')
                : t('Продолжить', 'Davom etish')}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setShownCode('');
                setCode('');
                setError('');
              }}
            >
              {t('Изменить номер', 'Raqamni o‘zgartirish')}
            </button>
          </form>
        ) : (
          <form
            className="phone-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                const result = await request('/api/auth', {
                  action: 'phone-start',
                  phone,
                  role,
                });
                setPhone(result.phone);
                setShownCode(result.code);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              {t('Номер телефона', 'Telefon raqami')}
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+998 90 123 45 67"
                required
              />
            </label>
            {error && (
              <p role="alert" className="alert">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? t('Подождите…', 'Kuting…')
                : t('Показать код', 'Kodni ko‘rsatish')}
            </button>
            <p className="muted">
              {t(
                'Пока код появится на этой странице, без SMS.',
                'Hozircha kod SMSsiz shu sahifada ko‘rsatiladi.',
              )}
            </p>
          </form>
        )}
        <details
          className="login-fallback"
          open={emailOpen}
          onToggle={(e) => setEmailOpen(e.currentTarget.open)}
        >
          <summary>{t('Войти через email', 'Email orqali kirish')}</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setEmailError('');
              const f = new FormData(e.currentTarget);
              try {
                const result = await request('/api/auth', {
                  action: register ? 'register' : 'login',
                  email: f.get('email'),
                  password: f.get('password'),
                  name: f.get('name'),
                  organization: f.get('organization'),
                  role,
                });
                enter(result.user.role);
              } catch (e) {
                setEmailError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            {register && (
              <>
                <label>
                  {t('Имя', 'Ism')}
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  {t('Организация (необязательно)', 'Tashkilot (ixtiyoriy)')}
                  <input
                    name="organization"
                    autoComplete="organization"
                    maxLength={150}
                  />
                </label>
              </>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                maxLength={254}
              />
            </label>
            <label>
              {t('Пароль — от 10 символов', 'Parol — kamida 10 belgi')}
              <input
                name="password"
                type="password"
                minLength={10}
                maxLength={200}
                required
                autoComplete={register ? 'new-password' : 'current-password'}
              />
            </label>
            {emailError && (
              <p role="alert" className="alert">
                {emailError}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? t('Подождите…', 'Kuting…')
                : register
                  ? t('Зарегистрироваться', 'Ro‘yxatdan o‘tish')
                  : t('Войти', 'Kirish')}
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => setRegister(!register)}
          >
            {register
              ? t('Уже есть аккаунт? Войти', 'Hisobingiz bormi? Kirish')
              : t('Создать новый аккаунт', 'Yangi hisob yaratish')}
          </button>
        </details>
        <div className="login-links">
          <a href={role === 'operator' ? '/partners' : '/'}>
            ←{' '}
            {role === 'operator'
              ? t('Партнёрам', 'Hamkorlarga')
              : t('На главную', 'Bosh sahifaga')}
          </a>
          {role !== 'operator' && (
            <a href="/partners">
              {t(
                'Владеете экраном? Стать партнёром',
                'Ekraningiz bormi? Hamkor bo‘ling',
              )}
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
