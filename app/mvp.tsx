'use client';
import { useEffect, useState } from 'react';
import {
  Monitor,
  ArrowUpRight,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  MapPin,
  Play,
  Layers,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  labels,
  roleLabels,
  dayCount,
  tashkent,
  timeValid,
  capacityAvailable,
  type State,
  type Surface,
  type Campaign,
  type Reservation,
  type User,
  type Asset,
} from '@/lib/model';
import { money } from '@/lib/catalog';
import { referenceScreens } from '@/lib/reference-screens';
import { compactDateRange } from '@/lib/date-labels';
import {
  auditActionLabel,
  auditNoteLabel,
  auditRoleLabel,
  auditTimeLabel,
} from '@/lib/audit-labels';
import { cityByCode, cityOptions, districtOptions, locationSource } from '@/lib/locations';
import { commonDurations, maxPlaysPerDay, placementTotal, playDurations, tariff } from '@/lib/pricing';
import CityMap from './city-map';
import QRScanner from './qr-scanner';
import CreativeEditor from './creative-editor';
import ServiceInfo from './service-info';
import Landing from './landing';
import AvailabilityCalendar from './availability-calendar';
import ScreenAnalytics from './screen-analytics';
import Brand from './brand';
import useLanguage from './use-language';
import {
  occasions,
  occasionById,
  occasionFromSearch,
  placementNameForOccasion,
  catalogHref,
  type OccasionId,
} from '@/lib/occasions';
import {
  viewFromSearch,
  viewHref,
  loginHref,
  calendarHref,
  devshowHref,
} from '@/lib/navigation';
import { Choice, request, uploadFile } from './controls';
import './mvp.css';
type ViewData = State & {
  user: User | null;
  reservations: Reservation[];
  media: Record<string, string>;
  users: User[];
  players: { screen: string; last_seen: string | null }[];
  playback: { campaign: string; count: number; last: string }[];
};
const empty: ViewData = {
  surfaces: [],
  campaigns: [],
  blocked: [],
  unavailable: [],
  commission: 15,
  user: null,
  reservations: [],
  media: {},
  users: [],
  players: [],
  playback: [],
};
export default function Mvp({
  initialView = 'home',
}: {
  initialView?: string;
}) {
  const { uz, toggleLanguage } = useLanguage();
  const [data, setData] = useState(empty),
    [loaded, setLoaded] = useState(false),
    [view, setView] = useState(initialView),
    [occasion, setOccasion] = useState<OccasionId | ''>(''),
    [placementOpen, setPlacementOpen] = useState(false),
    [q, setQ] = useState(''),
    [cityFilter, setCityFilter] = useState('all'),
    [district, setDistrict] = useState('all'),
    [budget, setBudget] = useState(''),
    [reach, setReach] = useState(''),
    [map, setMap] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [detailId, setDetailId] = useState(''),
    [referenceId, setReferenceId] = useState(''),
    [calendarId, setCalendarId] = useState(''),
    [calendarDay, setCalendarDay] = useState(''),
    [calendarReturnView, setCalendarReturnView] = useState('operator'),
    [preview, setPreview] = useState(false),
    [campaignId, setCampaignId] = useState(''),
    [surfaceEdit, setSurfaceEdit] = useState<Surface | true | null>(null),
    [booking, setBooking] = useState(false),
    [placementName, setPlacementName] = useState(''),
    [asset, setAsset] = useState<Asset | null>(null),
    [library, setLibrary] = useState<Asset[]>([]),
    [start, setStart] = useState(tashkent().slice(0, 10)),
    [end, setEnd] = useState(tashkent().slice(0, 10)),
    [from, setFrom] = useState('09:00'),
    [to, setTo] = useState('23:00'),
    [playSeconds, setPlaySeconds] = useState(10),
    [playsPerDay, setPlaysPerDay] = useState(10),
    [note, setNote] = useState(''),
    [accepted, setAccepted] = useState(false),
    [terms, setTerms] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [playerLink, setPlayerLink] = useState('');
  const t = (ru: string, uzText: string) => (uz ? uzText : ru);
  const user = data.user,
    admin = user?.role === 'admin',
    advertiser = admin || user?.role === 'advertiser',
    moderator = admin || user?.role === 'moderator',
    operator = admin || user?.role === 'operator';
  const detail = data.surfaces.find((x) => x.id === detailId),
    referenceDetail = referenceScreens.find((x) => x.id === referenceId),
    calendarSurface = data.surfaces.find((x) => x.id === calendarId),
    active = data.campaigns.find((x) => x.id === campaignId),
    picked = data.surfaces.filter((x) => selected.includes(x.id));
  const selectedOccasion = occasionById(occasion);
  const mine = (s: Surface) => admin || s.owner === user?.id;
  const ownedActiveSurfaceIds = active?.surfaceIds.filter((id) =>
    data.surfaces.some((screen) => screen.id === id && screen.owner === user?.id),
  ) || [];
  const ownerCanAccept =
    user?.role === 'operator' &&
    active?.status === 'moderation' &&
    ownedActiveSurfaceIds.some((id) => !active.technical[id]);
  const badge = (status: string) => (
    <span className={'status status-' + status}>
      {labels[status]?.[uz ? 1 : 0] || status}
    </span>
  );
  async function refresh() {
    try {
      setData(await request('/api/workspace'));
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
    function syncLocation() {
      if (
        location.pathname === '/' &&
        new URLSearchParams(location.search).get('view') === 'admin'
      )
        history.replaceState(null, '', '/admin');
      setView(viewFromSearch(location.search, location.pathname));
      setOccasion(occasionFromSearch(location.search));
      setPlacementOpen(location.hash === '#ideas');
      setDetailId(new URLSearchParams(location.search).get('surface') || '');
      setCalendarId(new URLSearchParams(location.search).get('screen') || '');
      setCalendarDay(new URLSearchParams(location.search).get('day') || '');
      setCalendarReturnView(
        new URLSearchParams(location.search).get('back') === 'admin'
          ? 'admin'
          : 'operator',
      );
      setPreview(new URLSearchParams(location.search).get('preview') === '1');
      setError('');
    }
    syncLocation();
    addEventListener('popstate', syncLocation);
    addEventListener('hashchange', syncLocation);
    const id = setInterval(() => void refresh(), 15000);
    return () => {
      clearInterval(id);
      removeEventListener('popstate', syncLocation);
      removeEventListener('hashchange', syncLocation);
    };
  }, []);
  useEffect(() => {
    if (
      !loaded ||
      !advertiser ||
      new URLSearchParams(location.search).get('resume') !== '1'
    )
      return;
    try {
      const raw = sessionStorage.getItem('adspace-order');
      if (raw) {
        const draft = JSON.parse(raw);
        const ids = Array.isArray(draft.ids)
          ? draft.ids.filter(
              (id: unknown) =>
                typeof id === 'string' &&
                data.surfaces.some(
                  (s) => s.id === id && s.status === 'published',
                ),
            )
          : [];
        if (
          ids.length &&
          [draft.start, draft.end].every(
            (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
          ) &&
          [draft.from, draft.to].every(
            (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v),
          )
        ) {
          setSelected(ids);
          setOccasion(
            occasionById(draft.occasion)?.id ||
              occasionFromSearch(location.search),
          );
          setPlacementName(
            placementNameForOccasion(
              '',
              occasionById(draft.occasion)?.id ||
                occasionFromSearch(location.search),
              uz,
            ),
          );
          setStart(draft.start);
          setEnd(draft.end);
          setFrom(draft.from);
          setTo(draft.to);
          if (Number.isInteger(draft.playSeconds)) setPlaySeconds(draft.playSeconds);
          if (Number.isInteger(draft.playsPerDay)) setPlaysPerDay(draft.playsPerDay);
          setBooking(true);
        }
      }
    } catch {
    } finally {
      try {
        sessionStorage.removeItem('adspace-order');
      } catch {}
      history.replaceState(
        null,
        '',
        catalogHref(occasionFromSearch(location.search)),
      );
    }
  }, [loaded, user?.id]);
  useEffect(() => {
    document.documentElement.lang = uz ? 'uz' : 'ru';
  }, [uz]);
  useEffect(() => {
    if (user)
      request('/api/assets')
        .then(setLibrary)
        .catch(() => {});
  }, [user?.id, asset?.id]);
  useEffect(() => {
    setAccepted(false);
    setTerms('');
    if (active)
      fetch(
        '/api/contracts?id=' +
          active.id +
          (active.status === 'revision' && asset ? '&asset=' + asset.id : ''),
      )
        .then((r) => (r.ok ? r.text() : ''))
        .then(setTerms)
        .catch(() => {});
  }, [campaignId, asset?.id, active?.status]);
  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const d = await request('/api/workspace', body);
      setData(d);
      setMessage(t('Сохранено', 'Saqlandi'));
      return d as ViewData;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function go(v: string) {
    setView(v);
    history.pushState(
      null,
      '',
      v === 'catalog' ? catalogHref(occasion) : viewHref(v),
    );
    setDetailId('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function openCalendar(screen: Surface, owner = false, day = '') {
    setCalendarId(screen.id);
    setCalendarDay(day);
    setCalendarReturnView(view === 'admin' ? 'admin' : 'operator');
    setDetailId('');
    setView(owner ? 'owner-calendar' : 'calendar');
    setError('');
    history.pushState(
      null,
      '',
      calendarHref(
        screen.id,
        owner,
        day,
        view === 'admin' ? 'admin' : undefined,
      ),
    );
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function browse(occasionId?: OccasionId) {
    setPlacementOpen(false);
    setOccasion(occasionId || '');
    setView('catalog');
    setDetailId('');
    setError('');
    history.pushState(null, '', catalogHref(occasionId));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function startPlacement() {
    setPlacementOpen(true);
    history.pushState(null, '', location.pathname + location.search + '#ideas');
  }
  function closePlacement() {
    setPlacementOpen(false);
    if (location.hash === '#ideas')
      history.replaceState(null, '', location.pathname + location.search);
  }
  function checkout(ids = selected, period: { start: string; end: string; from: string; to: string; playSeconds?: number; playsPerDay?: number } = { start, end, from, to }) {
    const screens = data.surfaces.filter((s) => ids.includes(s.id));
    const durations = commonDurations(screens);
    if (period.playSeconds) setPlaySeconds(period.playSeconds);
    else if (durations.length && !durations.includes(playSeconds as 10 | 15 | 30)) setPlaySeconds(durations[0]);
    if (period.playsPerDay) setPlaysPerDay(period.playsPerDay);
    let periodValid = false;
    try {
      dayCount(period.start, period.end);
      periodValid =
        timeValid(period.from) &&
        timeValid(period.to) &&
        period.from < period.to;
    } catch {}
    if (
      !periodValid ||
      !screens.length ||
      screens.some(
        (s) =>
          s.status !== 'published' ||
          period.from < s.opens ||
          period.to > s.closes ||
          data.unavailable.some(
            (x) =>
              x.id === s.id && x.start <= period.end && x.end >= period.start,
          ) ||
          !capacityAvailable(
            { campaigns: data.reservations },
            s,
            period.start,
            period.end,
            period.from,
            period.to,
          ),
      )
    ) {
      setError(
        t(
          'На выбранное время нет мест. Откройте календарь экрана и выберите свободное время.',
          'Tanlangan vaqtda joy yo‘q. Ekran taqvimidan bo‘sh vaqtni tanlang.',
        ),
      );
      return;
    }
    if (!advertiser) {
      try {
        sessionStorage.setItem(
          'adspace-order',
          JSON.stringify({ ids, ...period, occasion }),
        );
      } catch {}
      location.assign(loginHref('advertiser', catalogHref(occasion, true)));
      return;
    }
    setAsset(null);
    setPlacementName(placementNameForOccasion('', occasion, uz));
    setBooking(true);
  }
  function choose(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  const visible = data.surfaces.filter(
    (s) =>
      s.status === 'published' &&
      !data.blocked.includes(s.owner) &&
      (s.name + s.address + s.district + s.operator + (cityByCode(s.cityCode || '1726')?.uz || ''))
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (cityFilter === 'all' || (s.cityCode || '1726') === cityFilter) &&
      (district === 'all' || district === s.district) &&
      (!budget || s.price <= +budget) &&
      (!reach || s.reach >= +reach),
  );
  const referenceVisible = referenceScreens.filter(
    (s) =>
      [s.name, s.place, s.placeRu, s.description, s.descriptionRu, s.supplier].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase()) &&
      (cityFilter === 'all' || (s.cityCode === undefined ? '1726' : s.cityCode) === cityFilter) &&
      district === 'all' &&
      !budget &&
      !reach,
  );
  const bookingDurations = commonDurations(picked);
  const bookingSeconds = bookingDurations.includes(playSeconds as 10 | 15 | 30)
    ? playSeconds
    : bookingDurations[0] || 0;
  const perPlayBooking = picked.length > 0 && picked.every((s) => s.pricingMode === 'per-play');
  const countFits = !perPlayBooking || picked.every((s) => playsPerDay <= maxPlaysPerDay(s, from, to, bookingSeconds));
  let total = 0;
  try {
    total = placementTotal(picked, dayCount(start, end), bookingSeconds, playsPerDay);
  } catch {}
  const campaigns = data.campaigns
    .filter((c) => view !== 'campaigns' || c.owner === user?.id)
    .filter(
      (c) =>
        view !== 'operator' ||
        admin ||
        c.surfaceIds.some((id) =>
          data.surfaces.some((s) => s.id === id && s.owner === user?.id),
        ),
    )
    .filter(
      (c) =>
        view !== 'moderator' ||
        ['moderation', 'revision', 'dispute'].includes(c.status),
    )
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) || a.created.localeCompare(b.created),
    );
  const pendingOwnerCampaigns = user?.role === 'operator'
    ? data.campaigns.filter(
        (c) =>
          c.status === 'moderation' &&
          c.surfaceIds.some(
            (id) =>
              !c.technical[id] &&
              data.surfaces.some((screen) => screen.id === id && screen.owner === user?.id),
          ),
      )
    : [];
  async function player(s: Surface) {
    setBusy(true);
    setError('');
    try {
      const r = await request('/api/player', { action: 'token', screen: s.id });
      setPlayerLink(location.origin + r.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function report(c: Campaign) {
    const playback = data.playback.find((x) => x.campaign === c.id);
    const rows = [
      ['Размещение', c.name],
      [
        'Период',
        c.start + ' — ' + c.end + ' ' + c.from + '–' + c.to + ' Asia/Tashkent',
      ],
      ['Статус', labels[c.status][0]],
      ['Расчётная стоимость UZS', String(c.total)],
      ['Сигналы запуска браузерного плеера', String(playback?.count || 0)],
      ['Ограничение', 'Не подтверждает наружный показ или охват'],
      ...c.events.map((x) => [
        x.at,
        x.role + ' / ' + x.action + ' / ' + x.note,
      ]),
    ];
    download(
      'maydonlar-' + c.id + '.csv',
      '\uFEFF' +
        rows
          .map((r) =>
            r
              .map(
                (v) =>
                  '"' +
                  (/^[=+@-]/.test(v) ? "'" : '') +
                  v.replace(/"/g, '""') +
                  '"',
              )
              .join(';'),
          )
          .join('\r\n'),
      'text/csv',
    );
  }
  return (
    <div className="mvp">
      <header className="app-header market-header">
        <a
          href="/"
          className="wordmark"
          aria-label="Maydonlar — главная"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              go('home');
            }
          }}
        >
          <Brand />
        </a>
        <nav aria-label={t('Основная навигация', 'Asosiy menyu')}>
          {[
            ['catalog', t('Смотреть экраны', 'Ekranlar')],
            ...(advertiser
              ? [['campaigns', t('Мои размещения', 'Joylashtirishlarim')]]
              : []),

          ].map(([v, label]) => (
            <a
              key={v}
              href={viewHref(v)}
              aria-current={view === v ? 'page' : undefined}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  go(v);
                }
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          {operator && (
            <a
              className="secondary"
              href={viewHref('operator')}
              aria-current={view === 'operator' ? 'page' : undefined}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  go('operator');
                }
              }}
            >
              <Monitor size={16} />
              {t('Мои экраны', 'Ekranlarim')}
            </a>
          )}
          <a className="secondary header-partners-link" href="/partners">
            {t('Стать партнёром', 'Hamkor bo‘lish')}
          </a>
          <a
            className="primary"
            href="/#ideas"
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                startPlacement();
              }
            }}
          >
            {t('Разместить', 'Joylashtirish')} <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="header-account">
          <button className="language" onClick={toggleLanguage}>
            {uz ? 'RU' : 'UZ'}
          </button>
          {user ? (
            <>
              <span>
                {user.name}
                <small>{roleLabels[user.role][uz ? 1 : 0]}</small>
              </span>
              <button
                aria-label={t('Выйти', 'Chiqish')}
                onClick={async () => {
                  await request('/api/auth', { action: 'logout' });
                  location.assign('/');
                }}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <a
              className="account-login"
              href={
                view === 'admin'
                  ? '/login?next=%2Fadmin&method=email'
                  : loginHref('advertiser')
              }
            >
              {t('Войти', 'Kirish')} <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      </header>
      <main className="app-main">
        {view !== 'home' && (
          <div className="location-line">
            <span className="location-dot" />
            {t('Ташкент', 'Toshkent')}
            <span>
              {t(
                'Выбор экранов · Согласование · Управление показом',
                'Ekran tanlash · Egasiga yuborish · Ko‘rsatish',
              )}
            </span>
          </div>
        )}
        {error && (
          <div role="alert" className="alert">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}
        {message && (
          <div role="status" className="success">
            {message}
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}
        {view === 'home' ? (
          <Landing uz={uz} browse={browse} startPlacement={startPlacement} />
        ) : !loaded ? (
          <p role="status">
            {t('Загружаем площадки…', 'Maydonlar yuklanmoqda…')}
          </p>
        ) : view === 'catalog' ? (
          <>
            <section className="catalog-intro">
              <div>
                <p className="kicker">
                  {t('ЭКРАНЫ ДЛЯ ВАШЕГО МОМЕНТА', 'SIZ UCHUN EKRANLAR')}
                </p>
                <h1>
                  {t('Найдите свой', 'O‘zingizga mos')}{' '}
                  <em>{t('экран.', 'ekran.')}</em>
                </h1>
                <p>
                  {t(
                    'Выберите место. Загрузите картинку или видео. Задайте время показа.',
                    'Joy tanlang. Rasm yoki video yuklang. Qachon ko‘rsatilishini belgilang.',
                  )}
                </p>
              </div>
              <div className="intro-count">
                <strong>{(referenceVisible.length + visible.length).toString().padStart(2, '0')}</strong>
                <span>{t('экранов в каталоге', 'katalogdagi ekranlar')}</span>
              </div>
            </section>
            {selectedOccasion && (
              <div className="occasion-context" role="status">
                <div>
                  <span className="occasion-context-label">
                    {t('Ваш повод', 'Siz tanlagan sabab')}
                  </span>
                  <strong>{selectedOccasion.title[uz ? 1 : 0]}</strong>
                  <p>{selectedOccasion.description[uz ? 1 : 0]}</p>
                </div>
                <a
                  className="text-button"
                  href="/#ideas"
                  onClick={(e) => {
                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      startPlacement();
                    }
                  }}
                >
                  {t('Выбрать другой повод', 'Boshqa sabab tanlash')}
                </a>
              </div>
            )}
            <div className="catalog-toolbar">
              <p>
                {t(
                  'Смотрите экраны и их параметры. У подключённых владельцев можно выбрать время показа.',
                  'Ekranlar va ularning o‘lchamlarini ko‘ring. Maydonlar’ga ulangan ekranlarda ko‘rsatish vaqtini tanlash mumkin.',
                )}
              </p>
              <button className="secondary" onClick={() => setMap(!map)}>
                <MapPin size={16} />
                {map ? t('Список', 'Ro‘yxat') : t('На карте', 'Xaritada')}
              </button>
            </div>
            <details className="catalog-filters">
              <summary>
                {t(
                  'Фильтры и предварительное время',
                  'Filtrlar va taxminiy vaqt',
                )}
              </summary>
              <div className="filters">
                <label className="search-field">
                  <Search size={19} />
                  <input
                    aria-label={t('Поиск экрана', 'Ekran qidirish')}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t(
                      'Название, адрес или район',
                      'Nom, manzil yoki tuman',
                    )}
                  />
                </label>
                <Choice
                  label={t('Город', 'Shahar')}
                  value={cityFilter}
                  onChange={(value) => { setCityFilter(value); setDistrict('all'); }}
                  options={[
                    ['all', t('Все города', 'Barcha shaharlar')],
                    ...cityOptions(uz).filter(([code]) => data.surfaces.some((surface) => (surface.cityCode || '1726') === code)),
                  ]}
                />
                <Choice
                  label={t('Район', 'Tuman')}
                  value={district}
                  onChange={setDistrict}
                  options={[
                    ['all', t('Все районы', 'Barcha tumanlar')],
                    ...Array.from(
                      new Set(data.surfaces.filter((surface) => cityFilter === 'all' || (surface.cityCode || '1726') === cityFilter).map((x) => x.district).filter(Boolean)),
                    ).map((x) => [x, x] as [string, string]),
                  ]}
                />
                <label>
                  {t('Цена до, сум', 'Narx, so‘mgacha')}
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </label>
                <label>
                  {t('Охват от / день', 'Qamrov, kundan')}
                  <input
                    type="number"
                    min="0"
                    value={reach}
                    onChange={(e) => setReach(e.target.value)}
                  />
                </label>
                <QRScanner uz={uz} onFound={setDetailId} />
              </div>
              <div className="period-bar">
                <Clock size={18} />
                <label>
                  {t('Дата начала', 'Boshlanish sanasi')}
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    min={tashkent().slice(0, 10)}
                  />
                </label>
                <label>
                  {t('Дата окончания', 'Tugash sanasi')}
                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    min={start}
                  />
                </label>
                <label>
                  {t('Ежедневно с', 'Har kuni')}
                  <input
                    type="time"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>
                <label>
                  {t('Ежедневно до', 'Har kuni gacha')}
                  <input
                    type="time"
                    value={to === '24:00' ? '23:59' : to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
                <span>{t('Время Ташкента', 'Toshkent vaqti')}</span>
              </div>
            </details>
            {map && (
              <CityMap surfaces={visible} onSelect={(s) => setDetailId(s.id)} />
            )}
            <div className="screen-grid">
              {referenceVisible.map((s) => (
                <article key={s.id} className="screen-card screen-card-reference">
                  <button
                    type="button"
                    className="screen-visual"
                    onClick={() => setReferenceId(s.id)}
                    aria-label={t('Подробнее об экране ', 'Ekran haqida ma’lumot: ') + s.name}
                  >
                    <img src={s.photo} alt={`${s.name}: ${uz ? s.place : s.placeRu}`} loading="lazy" />
                    <span className="visual-arrow"><ArrowUpRight size={22} /></span>
                  </button>
                  <div className="screen-copy">
                    <div className="card-meta"><span>{s.supplier || '7Media'}</span></div>
                    <h2><button type="button" onClick={() => setReferenceId(s.id)}>{s.name}</button></h2>
                    <p>{uz ? s.place : s.placeRu}</p>
                    <div className="spec-row">
                      <span>{t('Уличный LED', 'Tashqi LED')}</span>
                      <span>{s.size}</span>
                      <span>{s.resolution}</span>
                      <span>{uz ? s.hours : s.hoursRu}</span>
                    </div>
                    <div className="card-bottom">
                      <div>
                        <strong>{t('Цена по запросу', 'Narx so‘rov bo‘yicha')}</strong>
                        <small>{t('По каталогу оператора', 'Operator katalogidan')}</small>
                      </div>
                      <button
                        type="button"
                        className="add-button"
                        aria-label={t('Открыть описание ', 'Ma’lumotni ochish: ') + s.name}
                        onClick={() => setReferenceId(s.id)}
                      >
                        <ArrowUpRight size={20} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {visible.map((s, i) => (
                <article key={s.id} className="screen-card">
                  <button
                    className={'screen-visual tone-' + (i % 3)}
                    onClick={() => setDetailId(s.id)}
                  >
                    {s.photoId ? (
                      <img src={'/api/assets?id=' + s.photoId} alt={s.name} />
                    ) : (
                      <div className="spec-display">
                        <Monitor size={42} strokeWidth={1} />
                        <strong>
                          {s.width} × {s.height}
                        </strong>
                        <span>{s.kind}</span>
                      </div>
                    )}
                    <span className="visual-arrow">
                      <ArrowUpRight size={22} />
                    </span>
                  </button>
                  <div className="screen-copy">
                    <div className="card-meta">
                      <span>{s.district}</span>
                    </div>
                    <h2>
                      <button onClick={() => setDetailId(s.id)}>
                        {s.name}
                      </button>
                    </h2>
                    <p>{s.address}</p>
                    <div className="spec-row">
                      <span>{s.kind === 'Уличный LED' ? t('Уличный LED', 'Tashqi LED') : s.kind === 'Indoor LED' ? t('В помещении', 'Bino ichida') : s.kind}</span>
                      <span>{s.size}</span>
                      <span>{s.width} × {s.height} px</span>
                      <span>
                        ≤ {s.seconds} {t('сек', 'soniya')}
                      </span>
                      <span>
                        {s.opens}–{s.closes}
                      </span>
                    </div>
                    <button
                      className="calendar-card-link"
                      onClick={() => openCalendar(s)}
                    >
                      <Clock size={16} />{' '}
                      {t('Посмотреть свободное время', 'Bo‘sh vaqtni ko‘rish')}
                    </button>
                    <div className="card-bottom">
                      <div>
                        <strong>{s.pricingMode === 'per-play' ? t('от ', 'boshlab ') : ''}{money(s.price)}</strong>
                        <small>
                          {s.pricingMode === 'per-play'
                            ? t('за один показ', 'bir ko‘rsatish uchun')
                            : t('за сутки', 'kuniga')}
                        </small>
                      </div>
                      <button
                        className={
                          selected.includes(s.id)
                            ? 'selected add-button'
                            : 'add-button'
                        }
                        aria-label={t('Выбрать ', 'Tanlash ') + s.name}
                        onClick={() => choose(s.id)}
                      >
                        {selected.includes(s.id) ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <Plus size={21} />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!visible.length && !referenceVisible.length && (
              <div className="empty">
                <Monitor />
                <h2>{t('Нет подходящих экранов', 'Mos ekran topilmadi')}</h2>
                <p>
                  {t(
                    'Измените фильтры каталога.',
                    'Katalog filtrlarini o‘zgartiring.',
                  )}
                </p>
              </div>
            )}
            {!!selected.length && (
              <div className="order-summary">
                <Layers />
                <div>
                  <strong>
                    {t('Выбрано экранов', 'Tanlangan ekranlar')}:{' '}
                    {selected.length}
                  </strong>
                  <small>
                    {compactDateRange(start, end)} · {money(total)}
                  </small>
                </div>
                <button className="primary" onClick={() => checkout()}>
                  {t('Оформить размещение', 'Joylashtirishni rasmiylashtirish')}{' '}
                  <ArrowUpRight size={18} />
                </button>
                <button className="text-button" onClick={() => setSelected([])}>
                  ×
                </button>
              </div>
            )}
          </>
        ) : view === 'calendar' || (view === 'owner-calendar' && operator) ? (
          calendarSurface &&
          (view !== 'calendar' || calendarSurface.status === 'published') &&
          (view !== 'owner-calendar' || mine(calendarSurface)) ? (
            <AvailabilityCalendar
              key={`${view}-${calendarSurface.id}-${calendarDay}`}
              surface={calendarSurface}
              reservations={data.reservations}
              campaigns={data.campaigns}
              unavailable={data.unavailable}
              initialDay={calendarDay}
              backToAdmin={calendarReturnView === 'admin'}
              owner={view === 'owner-calendar'}
              uz={uz}
              busy={busy}
              onBack={() =>
                go(view === 'owner-calendar' ? calendarReturnView : 'catalog')
              }
              onReserve={(period) => {
                setStart(period.start);
                setEnd(period.end);
                setFrom(period.from);
                setTo(period.to);
                if (period.playSeconds) setPlaySeconds(period.playSeconds);
                if (period.playsPerDay) setPlaysPerDay(period.playsPerDay);
                setSelected([calendarSurface.id]);
                checkout([calendarSurface.id], period);
              }}
              onToggleUnavailable={(period) =>
                void act({ action: 'unavailable', ...period })
              }
              onOpenCampaign={(id) => setCampaignId(id)}
            />
          ) : (
            <div className="empty">
              <h1>{t('Экран не найден', 'Ekran topilmadi')}</h1>
              <button
                className="secondary"
                onClick={() =>
                  go(view === 'owner-calendar' ? 'operator' : 'catalog')
                }
              >
                {t('Назад к экранам', 'Ekranlarga qaytish')}
              </button>
            </div>
          )
        ) : !user ? (
          <div className="empty">
            <h1>{t('Войдите в аккаунт', 'Hisobingizga kiring')}</h1>
            <a
              href={
                view === 'admin'
                  ? '/login?next=%2Fadmin&method=email'
                  : loginHref(
                      view === 'operator' || view === 'owner-calendar'
                        ? 'operator'
                        : 'advertiser',
                      view === 'owner-calendar'
                        ? calendarHref(calendarId, true)
                        : viewHref(view),
                    )
              }
              className="primary"
            >
              {t('Войти', 'Kirish')}
            </a>
          </div>
        ) : (view === 'campaigns' && !advertiser) ||
          ((view === 'operator' || view === 'owner-calendar') && !operator) ||
          (view === 'moderator' && !moderator) ||
          (view === 'admin' && !admin) ? (
          <div className="empty">
            <h1>{t('Отдельный кабинет', 'Alohida kabinet')}</h1>
            <p>
              {view === 'operator' || view === 'owner-calendar'
                ? t(
                    'Этот раздел — для владельцев экранов. Войдите в аккаунт владельца, чтобы добавлять экраны и принимать заявки.',
                    'Bu bo‘lim ekran egalari uchun. Ekran qo‘shish va so‘rovlarga javob berish uchun ekran egasi hisobiga kiring.',
                  )
                : view === 'campaigns'
                  ? t(
                      'Фото, поздравления и реклама размещаются из кабинета автора. Для работы со своими экранами откройте кабинет владельца.',
                      'Suratlar, tabriklar va reklama muallif kabinetidan joylashtiriladi. Ekranlar uchun ekran egasi kabinetini oching.',
                    )
                  : t(
                      'У вашего аккаунта нет доступа к этому разделу.',
                      'Hisobingizda bu bo‘limga kirish huquqi yo‘q.',
                    )}
            </p>
            <div className="button-row">
              <button
                className="primary"
                onClick={() => go(operator ? 'operator' : 'catalog')}
              >
                {operator
                  ? t('Мои экраны', 'Ekranlarim')
                  : t('Смотреть экраны', 'Ekranlar')}
              </button>
              <a
                className="secondary"
                href={
                  view === 'admin'
                    ? '/login?next=%2Fadmin&method=email'
                    : loginHref(
                        view === 'operator' || view === 'owner-calendar'
                          ? 'operator'
                          : 'advertiser',
                      )
                }
              >
                {t('Войти другим аккаунтом', 'Boshqa hisob bilan kirish')}
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="page-heading">
              <div>
                <p className="kicker">{roleLabels[user.role][uz ? 1 : 0]}</p>
                <h1>
                  {view === 'campaigns'
                    ? t('Мои размещения', 'Joylashtirishlarim')
                    : view === 'operator'
                      ? t('Мои экраны', 'Ekranlarim')
                    : view === 'moderator'
                        ? t('Запросы', 'So‘rovlar')
                        : t('Управление', 'Boshqaruv')}
                </h1>
              </div>
              <button className="secondary" onClick={() => void refresh()}>
                <RefreshCw size={17} />
                {t('Обновить', 'Yangilash')}
              </button>
            </div>
            {view === 'operator' && operator && (
              <>
                {user?.role === 'operator' && <section className="panel owner-requests">
                  <h2>
                    {t('Ждут вашего подтверждения', 'Sizdan javob kutayotganlar')}{' '}
                    <span>{pendingOwnerCampaigns.length}</span>
                  </h2>
                  {pendingOwnerCampaigns.length ? (
                    pendingOwnerCampaigns.map((c) => (
                      <button
                        className="campaign-row"
                        key={c.id}
                        onClick={() => {
                          setCampaignId(c.id);
                          setNote('');
                        }}
                      >
                        <CampaignPreview
                          assetId={c.assetId}
                          mime={data.media[c.id]}
                          name={c.name}
                          uz={uz}
                        />
                        <div>
                          <strong>{c.name}</strong>
                          <small>{compactDateRange(c.start, c.end)} · {c.from}–{c.to}</small>
                        </div>
                        <strong>{money(c.total)}</strong>
                        <ArrowUpRight size={18} />
                      </button>
                    ))
                  ) : (
                    <p className="muted">
                      {t('Новых запросов на размещение нет.', 'Hozir yangi so‘rovlar yo‘q.')}
                    </p>
                  )}
                </section>}
                <ScreenAnalytics
                  surfaces={data.surfaces.filter(mine)}
                  reservations={data.reservations}
                  campaigns={data.campaigns}
                  unavailable={data.unavailable}
                  uz={uz}
                  onOpenCalendar={(screen, day) =>
                    openCalendar(screen, true, day)
                  }
                />
                <button
                  className="primary"
                  onClick={() => setSurfaceEdit(true)}
                >
                  <Plus size={18} />
                  {t('Добавить экран', 'Ekran qo‘shish')}
                </button>
                <div className="screen-grid operator-screens">
                  {data.surfaces.filter(mine).map((s) => (
                    <article className="panel" key={s.id}>
                      {badge(
                        ['pending', 'revision'].includes(s.status)
                          ? 'draft'
                          : s.status,
                      )}
                      <h2>{s.name}</h2>
                      <p>
                        {s.address} · {money(s.price)}
                      </p>
                      {s.status === 'published' && !s.photoId && (
                        <p className="muted">
                          {t('Добавьте фото: пока в каталоге показана карточка без снимка.', 'Surat qo‘shing: hozir katalogda ekran suratsiz ko‘rinadi.')}
                        </p>
                      )}
                      <div className="button-row">
                        <a
                          className="secondary"
                          href={
                            '/?surface=' +
                            encodeURIComponent(s.id) +
                            '&preview=1'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t(
                            'Посмотреть как посетитель',
                            'Mehmon sifatida ko‘rish',
                          )}{' '}
                          ↗
                        </a>
                        {['draft', 'pending', 'revision', 'paused'].includes(
                          s.status,
                        ) && (
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={() =>
                              void act({ action: 'surface-publish', id: s.id })
                            }
                          >
                            {t('Опубликовать', 'Saytga chiqarish')}
                          </button>
                        )}
                        <button
                          className="text-button"
                          onClick={() => openCalendar(s, true)}
                        >
                          {t('Календарь', 'Taqvim')}
                        </button>
                        <button
                          className="text-button"
                          onClick={() => {
                            setDetailId(s.id);
                            setPlayerLink('');
                          }}
                        >
                          {t('Управление', 'Boshqarish')}
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setSurfaceEdit(s)}
                        >
                          {t('Изменить', 'Tahrirlash')}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
            {view === 'moderator' && moderator && (
              <p className="muted">
                {t(
                  'Отдельная проверка платформой не требуется. Запрос подтверждает владелец экрана в своём кабинете.',
                  'Platformaning alohida tekshiruvi talab qilinmaydi. So‘rovni ekran egasi o‘z kabinetida tasdiqlaydi.',
                )}
              </p>
            )}
            {view === 'admin' && admin && (
              <>
                <ScreenAnalytics
                  surfaces={data.surfaces}
                  reservations={data.reservations}
                  campaigns={data.campaigns}
                  unavailable={data.unavailable}
                  uz={uz}
                  onOpenCalendar={(screen, day) =>
                    openCalendar(screen, true, day)
                  }
                />
                <div className="metric-grid">
                  {[
                    [
                      t('Расчётный оборот', 'Hisoblangan aylanma'),
                      data.campaigns
                        .filter((c) => c.ledger.some((l) => l.kind === 'hold'))
                        .reduce((n, c) => n + c.total, 0),
                    ],
                    [
                      t('Возвраты', 'Qaytarishlar'),
                      data.campaigns.reduce(
                        (n, c) =>
                          n +
                          c.ledger
                            .filter((l) => l.kind === 'refund')
                            .reduce((n, l) => n + l.amount, 0),
                        0,
                      ),
                    ],
                    [
                      t('Комиссия нетто', 'Sof komissiya'),
                      data.campaigns.reduce(
                        (n, c) =>
                          n +
                          c.ledger.reduce(
                            (n, l) =>
                              n +
                              (l.kind === 'fee'
                                ? l.amount
                                : l.kind === 'fee_reversal'
                                  ? -l.amount
                                  : 0),
                            0,
                          ),
                        0,
                      ),
                    ],
                  ].map(([label, value]) => (
                    <div className="panel" key={String(label)}>
                      <p>{label}</p>
                      <strong>{money(Number(value))}</strong>
                    </div>
                  ))}
                </div>
                <section className="panel">
                  <h2>{t('Аккаунты и доступ', 'Hisoblar va ruxsatlar')}</h2>
                  {data.users.map((u) => (
                    <div className="review-row" key={u.id}>
                      <div>
                        <strong>{u.name}</strong>
                        <p>
                          {u.email} · {u.organization}
                        </p>
                      </div>
                      <Choice
                        value={u.role}
                        label={'Роль ' + u.name}
                        disabled={u.id === user.id || busy}
                        options={Object.entries(roleLabels).map(
                          ([key, label]) => [key, label[uz ? 1 : 0]],
                        )}
                        onChange={(role) =>
                          void act({ action: 'user-role', id: u.id, role })
                        }
                      />
                      {u.role === 'operator' && (
                        <button
                          className="secondary"
                          onClick={() =>
                            void act({ action: 'block', owner: u.id })
                          }
                        >
                          {data.blocked.includes(u.id)
                            ? t('Разблокировать', 'Tiklash')
                            : t('Приостановить', 'To‘xtatish')}
                        </button>
                      )}
                    </div>
                  ))}
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act({
                        action: 'commission',
                        value: Number(
                          new FormData(e.currentTarget).get('commission'),
                        ),
                      });
                    }}
                  >
                    <label>
                      {t(
                        'Комиссия новых размещений, %',
                        'Yangi joylashtirishlar komissiyasi, %',
                      )}
                      <input
                        name="commission"
                        type="number"
                        min="0"
                        max="30"
                        defaultValue={data.commission}
                      />
                    </label>
                    <button className="secondary" disabled={busy}>
                      {t('Сохранить', 'Saqlash')}
                    </button>
                  </form>
                </section>
              </>
            )}
            <h2 className="list-heading">
              {view === 'operator'
                ? t('Заявки на размещение', 'Kelgan so‘rovlar')
                : t('Размещения', 'Joylashtirishlar')}{' '}
              <span>{campaigns.length}</span>
            </h2>
            <div className="campaign-list">
              {campaigns.map((c) => (
                <button
                  className="campaign-row"
                  key={c.id}
                  onClick={() => {
                    setCampaignId(c.id);
                    setNote('');
                    setAsset(null);
                    setAccepted(false);
                  }}
                >
                  <CampaignPreview
                    assetId={c.assetId}
                    mime={data.media[c.id]}
                    name={c.name}
                    uz={uz}
                  />
                  <div>
                    <strong>{c.name}</strong>
                    <small>
                      {compactDateRange(c.start, c.end)} · {c.from}–{c.to}
                    </small>
                  </div>
                  {badge(c.status)}
                  <strong>{money(c.total)}</strong>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            </div>
            {!campaigns.length && (
              <div className="empty">
                <Layers />
                <h2>
                  {t('Пока нет размещений', 'Hozircha joylashtirish yo‘q')}
                </h2>
                <p>
                  {t(
                    'Новые размещения и их статусы появятся здесь.',
                    'Yangi so‘rovlar va ularning holati shu yerda ko‘rinadi.',
                  )}
                </p>
              </div>
            )}
          </>
        )}
        <footer className="app-footer">
          <span>MAYDONLAR / TASHKENT</span>
          <a className="app-footer-partners" href="/partners">
            {t('Стать партнёром', 'Hamkor bo‘lish')}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
          <ServiceInfo uz={uz} />
        </footer>
      </main>
      <Dialog
        open={placementOpen}
        onOpenChange={(open) => !open && closePlacement()}
      >
        <DialogContent className="mvp placement-dialog">
          <DialogTitle>
            {t('Что хотите показать?', 'Nimani ko‘rsatmoqchisiz?')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Выберите подходящий вариант — подскажем, как подготовить материал. Это не ограничивает выбор экранов.',
              'Mos variantni tanlang — material tayyorlash bo‘yicha yordam beramiz. Bu ekran tanlashni cheklamaydi.',
            )}
          </DialogDescription>
          <div className="placement-options">
            {occasions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => browse(item.id)}
              >
                {item.title[uz ? 1 : 0]}
                <ArrowUpRight size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="placement-skip"
            onClick={() => browse()}
          >
            {t(
              'Пока не знаю — посмотреть экраны',
              'Hozircha bilmayman — ekranlarni ko‘rish',
            )}
          </button>
          <p className="placement-note">
            {t(
              'Все материалы проходят согласование. Для личных фото и посланий нужно согласие людей, которых они касаются.',
              'Rasm yoki videoni ekran egasi ko‘rib chiqadi. Shaxsiy surat va xabarlar uchun undagi odamlarning roziligi kerak.',
            )}
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId('')}>
        <DialogContent className="mvp wide-dialog">
          {detail && (
            <>
              <DialogTitle>{detail.name}</DialogTitle>
              <DialogDescription>
                {detail.demo
                  ? detail.operator.replace(/^Demo /, '')
                  : detail.operator}{' '}
                · {detail.address}
              </DialogDescription>
              {preview && detail.status !== 'published' && (
                <p className="muted">
                  {t(
                    'Предпросмотр: эту карточку пока видите только вы. После публикации она появится в каталоге.',
                    'Hozircha bu kartani faqat siz ko‘rasiz. Saytga chiqarganingizdan keyin uni boshqalar ham ko‘radi.',
                  )}
                </p>
              )}
              {error && (
                <p className="alert" role="alert">
                  {error}
                </p>
              )}
              {detail.photoId && (
                <img
                  className="surface-photo"
                  src={'/api/assets?id=' + detail.photoId}
                  alt={detail.name}
                />
              )}
              <div className="spec-sheet">
                <p>
                  {t('Работает', 'Ish vaqti')}
                  <strong>
                    {detail.opens}–{detail.closes}
                  </strong>
                </p>
                <p>
                  {detail.pricingMode === 'per-play'
                    ? t('Цена за один показ', 'Bir ko‘rsatish narxi')
                    : t('Тариф за сутки', 'Kunlik narx')}
                  <strong>{detail.pricingMode === 'per-play' ? t('от ', 'boshlab ') : ''}{money(detail.price)}</strong>
                  {detail.pricingMode === 'per-play' && <span>{detail.tariffs?.map((item) => `${item.seconds} ${t('сек', 'soniya')} — ${money(item.price)}`).join(' · ')}</span>}
                </p>
              </div>
              <details className="terms screen-settings">
                <summary>
                  {t('Параметры показа', 'Ko‘rsatish sozlamalari')}
                </summary>
                <div className="spec-sheet">
                  <p>
                    {t('Разрешение', 'Ruxsat')}
                    <strong>
                      {detail.width} × {detail.height} px · {detail.fps} FPS
                    </strong>
                  </p>
                  <p>
                    {t('Формат', 'Format')}
                    <strong>
                      PNG / JPG / MP4 · ≤ {detail.maxMb} MB · ≤ {detail.seconds}{' '}
                      {t('сек', 'soniya')}
                    </strong>
                  </p>
                  <p>
                    {t('Размер', 'O‘lcham')}
                    <strong>
                      {detail.size} · {detail.kind}
                    </strong>
                  </p>
                  <p>
                    {t('Одновременных размещений', 'Bir vaqtdagi joylashtirishlar')}
                    <strong>{detail.slots}</strong>
                  </p>
                </div>
              </details>
              {(detail.lat !== 41.31 || detail.lng !== 69.27) && (
                <a
                  className="text-button"
                  href={
                    'https://www.openstreetmap.org/?mlat=' +
                    detail.lat +
                    '&mlon=' +
                    detail.lng +
                    '#map=17/' +
                    detail.lat +
                    '/' +
                    detail.lng
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('Открыть на карте', 'Xaritada ochish')} ↗
                </a>
              )}
              {detail.status === 'published' && <Qr id={detail.id} />}
              <button
                className="secondary"
                type="button"
                onClick={() =>
                  openCalendar(detail, operator && mine(detail) && !preview)
                }
              >
                <Clock size={16} />
                {operator && mine(detail) && !preview
                  ? t('Календарь экрана', 'Ekran taqvimi')
                  : t('Календарь свободного времени', 'Bo‘sh vaqt taqvimi')}
              </button>
              {data.reservations.some((c) =>
                c.surfaceIds.includes(detail.id),
              ) && (
                <h3>
                  {t('Занятые интервалы', 'Band vaqtlar')}
                </h3>
              )}
              {data.reservations
                .filter((c) => c.surfaceIds.includes(detail.id))
                .map((c) => (
                  <p key={c.id}>
                    {compactDateRange(c.start, c.end)} · {c.from}–{c.to} ·{' '}
                    {t(
                      `Занимает 1 из ${detail.slots} мест в расписании`,
                      `Jadvaldagi ${detail.slots} o‘rindan 1 tasi band`,
                    )}
                  </p>
                ))}
              {data.unavailable
                .filter((x) => x.id === detail.id)
                .map((x) => (
                  <p key={x.start}>
                    {t('Закрыто', 'Yopiq')}: {compactDateRange(x.start, x.end)}
                  </p>
                ))}
              {operator && mine(detail) && !preview ? (
                <>
                  <p className="muted">
                    {t(
                      'Принятые размещения автоматически появляются в расписании и показываются плеером в выбранное время.',
                      'Siz qabul qilgan so‘rovlar jadvalga o‘zi qo‘shiladi. Pleyer rasm yoki videoni belgilangan vaqtda ko‘rsatadi.',
                    )}
                  </p>
                  <div className="button-row">
                    <a
                      className="secondary"
                      href={devshowHref(detail.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('Смотреть сетку эфира', 'Ekran jadvalini ko‘rish')}
                      <ArrowUpRight size={16} />
                    </a>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void player(detail)}
                    >
                      <Play size={16} />
                      {t('Выдать ссылку плеера', 'Pleyer havolasini olish')}
                    </button>
                    {['published', 'paused'].includes(detail.status) && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          void act({
                            action:
                              detail.status === 'published'
                                ? 'surface-pause'
                                : 'surface-resume',
                            id: detail.id,
                          })
                        }
                      >
                        {detail.status === 'published'
                          ? t('Снять с публикации', 'Ekranni vaqtincha to‘xtatish')
                          : t('Опубликовать снова', 'Ekranni qayta yoqish')}
                      </button>
                    )}
                  </div>
                  <p className="muted">
                    {t(
                      'Новая ссылка заменяет прежнюю. Открывайте её только на устройстве показа.',
                      'Yangi havola eskisi o‘rniga ishlaydi. Uni faqat ekran ulangan qurilmada oching.',
                    )}
                  </p>
                  {playerLink && (
                    <a
                      className="player-link"
                      href={playerLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('Открыть LED-плеер', 'Pleyerni ochish')} ↗
                    </a>
                  )}
                  <p>
                    {t('Последняя связь', 'Oxirgi aloqa')}:{' '}
                    {data.players.find((p) => p.screen === detail.id)
                      ?.last_seen || '—'}
                  </p>
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void act({
                        action: 'unavailable',
                        id: detail.id,
                        start: f.get('start'),
                        end: f.get('end'),
                      });
                    }}
                  >
                    <label>
                      {t('Закрыть с', 'Yopish sanasi')}
                      <input type="date" name="start" required />
                    </label>
                    <label>
                      {t('По', 'Gacha')}
                      <input type="date" name="end" required />
                    </label>
                    <button className="secondary" disabled={busy}>
                      {t('Закрыть / открыть даты', 'Yopish / ochish')}
                    </button>
                  </form>
                </>
              ) : (
                detail.status === 'published' && (
                  <button
                    className="primary"
                    onClick={() => {
                      if (!selected.includes(detail.id))
                        setSelected([...selected, detail.id]);
                      setDetailId('');
                      go('catalog');
                    }}
                  >
                    {t('Выбрать экран', 'Ekran tanlash')}
                  </button>
                )
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!referenceDetail} onOpenChange={(open) => !open && setReferenceId('')}>
        <DialogContent className="mvp wide-dialog reference-dialog">
          {referenceDetail && (
            <>
              <DialogTitle>{referenceDetail.name}</DialogTitle>
              <DialogDescription>{uz ? referenceDetail.place : referenceDetail.placeRu}</DialogDescription>
              <img
                className="reference-detail-photo"
                src={referenceDetail.photo}
                alt={`${referenceDetail.name}: ${uz ? referenceDetail.place : referenceDetail.placeRu}`}
              />
              {(uz ? referenceDetail.description : referenceDetail.descriptionRu) && (
                <p>{uz ? referenceDetail.description : referenceDetail.descriptionRu}</p>
              )}
              <div className="spec-sheet">
                <p>{t('Цена на Maydonlar', 'Maydonlar narxi')}<strong>{t('По запросу', 'So‘rov bo‘yicha')}</strong></p>
                <p>{t('Размер экрана', 'Ekran o‘lchami')}<strong>{referenceDetail.size}</strong></p>
                <p>{t('Разрешение', 'Ruxsati')}<strong>{referenceDetail.resolution}</strong></p>
                <p>{t('Время работы', 'Ish vaqti')}<strong>{uz ? referenceDetail.hours : referenceDetail.hoursRu}</strong></p>
              </div>
              <p className="reference-source">
                {t('Источник', 'Manba')}: {referenceDetail.source}, {t('стр.', 'bet')} {referenceDetail.page}.
              </p>
              <p className="reference-availability">
                {t(
                  'Экран показан для ознакомления. Владелец ещё не подключил его календарь и цену за один показ к Maydonlar, поэтому отправить запрос пока нельзя.',
                  'Bu ekran bilan tanishishingiz mumkin. Egasi hali Maydonlar’ga taqvim va bir ko‘rsatish narxini qo‘shmagan. Hozircha so‘rov yuborib bo‘lmaydi.',
                )}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!surfaceEdit}
        onOpenChange={(o) => !o && setSurfaceEdit(null)}
      >
        <DialogContent className="mvp wide-dialog">
          <DialogTitle>
            {t('Карточка LED-экрана', 'LED ekran kartasi')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Добавьте главное об экране. Можно сохранить черновик или сразу опубликовать.',
              'Ekran haqidagi asosiy maʼlumotni kiriting. Keyin saqlang yoki darhol saytga chiqaring.',
            )}
          </DialogDescription>
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
          {surfaceEdit && (
            <SurfaceForm
              value={surfaceEdit === true ? undefined : surfaceEdit}
              busy={busy}
              uz={uz}
              save={async (surface, submit) => {
                if (
                  await act({
                    action: 'surface-save',
                    id: surfaceEdit === true ? undefined : surfaceEdit.id,
                    surface,
                    submit,
                  })
                )
                  setSurfaceEdit(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={booking} onOpenChange={setBooking}>
        <DialogContent className="mvp wide-dialog">
          <DialogTitle>
            {t('Оформить размещение', 'Joylashtirishni rasmiylashtirish')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Подготовьте материал для выбранных экранов. Даты и время — по Ташкенту.',
              'Tanlangan ekranlar uchun material tayyorlang. Sana va vaqt — Toshkent bo‘yicha.',
            )}
          </DialogDescription>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get('name');
              const d = await act({
                action: 'create',
                key: crypto.randomUUID(),
                name,
                surfaceIds: selected,
                start,
                end,
                from,
                to,
                assetId: asset?.id,
                playSeconds: perPlayBooking ? bookingSeconds : undefined,
                playsPerDay: perPlayBooking ? playsPerDay : undefined,
              });
              if (d) {
                setBooking(false);
                setCampaignId(d.campaigns[0].id);
                setSelected([]);
                go('campaigns');
              }
            }}
          >
            <label>
              {t('Повод', 'Sabab')}
              <Choice
                label={t('Повод', 'Sabab')}
                value={occasion}
                options={[
                  ['', t('Без повода / другое', 'Boshqa sabab')],
                  ...occasions.map(
                    (item) =>
                      [item.id, item.title[uz ? 1 : 0]] as [string, string],
                  ),
                ]}
                onChange={(value) => {
                  setOccasion(occasionById(value)?.id || '');
                  setPlacementName((current) =>
                    placementNameForOccasion(current, value, uz),
                  );
                  history.replaceState(null, '', catalogHref(value));
                }}
              />
            </label>
            {selectedOccasion && (
              <p className="occasion-form-hint">
                {selectedOccasion.hint[uz ? 1 : 0]}
              </p>
            )}
            <label>
              {t('Название размещения', 'Joylashtirish nomi')}
              <input
                name="name"
                required
                maxLength={100}
                value={placementName}
                onChange={(e) => setPlacementName(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                {t('Начало', 'Boshlanish')}
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </label>
              <label>
                {t('Конец включительно', 'Tugash kuni ham')}
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  min={start}
                  required
                />
              </label>
              <label>
                {t('С', 'Dan')}
                <input
                  type="time"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  required
                />
              </label>
              <label>
                {t('До', 'Gacha')}
                <input
                  type="time"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                />
              </label>
            </div>
            {perPlayBooking && (
              <div className="form-grid play-booking">
                <label>
                  {t('Длительность одного показа', 'Bir ko‘rsatish davomiyligi')}
                  <Choice
                    value={String(bookingSeconds)}
                    onChange={(value) => setPlaySeconds(Number(value))}
                    label={t('Длительность показа', 'Ko‘rsatish davomiyligi')}
                    options={bookingDurations.map((seconds) => [String(seconds), `${seconds} ${t('секунд', 'soniya')}`])}
                  />
                </label>
                <label>
                  {t('Показов в день на каждом экране', 'Har bir ekranda kuniga ko‘rsatishlar soni')}
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={playsPerDay}
                    onChange={(event) => setPlaysPerDay(Number(event.target.value))}
                    required
                  />
                </label>
                <p className="muted">{t('Цена за один показ', 'Bir ko‘rsatish narxi')}: {picked.map((s) => `${s.name} — ${money(tariff(s, bookingSeconds)?.price || 0)}`).join('; ')}. {t('Число показов должно помещаться в выбранное время.', 'Ko‘rsatishlar soni tanlangan vaqtga sig‘ishi kerak.')}</p>
              </div>
            )}
            <div className="selected-screens">
              {picked.map((s) => (
                <span key={s.id}>
                  {s.name}
                  <button type="button" onClick={() => choose(s.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            {picked[0] && (
              <CreativeEditor screen={picked[0]} onSaved={setAsset} uz={uz} durationLimit={perPlayBooking ? bookingSeconds : undefined} />
            )}
            <label>
              {t(
                'Или готовый материал из библиотеки',
                'Yoki saqlangan rasm yoki videoni tanlang',
              )}
              <Choice
                value={asset?.id || ''}
                label={t('Выберите файл', 'Fayl tanlang')}
                options={library.map((a) => [a.id, a.name])}
                onChange={(id) =>
                  setAsset(library.find((a) => a.id === id) || null)
                }
              />
            </label>
            {asset && (
              <p className="success">
                ✓ {asset.name} · {asset.width} × {asset.height}
              </p>
            )}
            <div className="booking-total">
              <span>{t('Итого за период', 'Davr uchun jami')}</span>
              <strong>{money(total)}</strong>
            </div>
            {!countFits && <p role="alert" className="alert">{t('Уменьшите число показов или увеличьте выбранное время.', 'Ko‘rsatishlar sonini kamaytiring yoki vaqtni uzaytiring.')}</p>}
            <p className="muted">
              {t(
                'Комиссия включена. Следующий шаг — условия размещения и согласование.',
                'Komissiya narxga kiradi. Keyin shartlarni o‘qib, so‘rovni ekran egasiga yuborasiz.',
              )}
            </p>
            <button
              className="primary full"
              disabled={busy || !asset || !picked.length || !total || !countFits || (perPlayBooking && asset.seconds > bookingSeconds)}
            >
              {t('Продолжить к условиям', 'Shartlarga o‘tish')}
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!active} onOpenChange={(o) => !o && setCampaignId('')}>
        <DialogContent className="mvp wide-dialog">
          {active && (
            <>
              <DialogTitle>{active.name}</DialogTitle>
              <DialogDescription>
                {compactDateRange(active.start, active.end)} · {active.from}–{active.to} ·{' '}
                {money(active.total)}
              </DialogDescription>
              {error && (
                <p role="alert" className="alert">
                  {error}
                </p>
              )}
              {badge(active.status)}
              {active.status === 'draft' && (active.owner === user?.id || admin) && (
                <p className="notice">
                  {t(
                    'Это черновик. Владелец экрана ещё не получил запрос. Подтвердите условия ниже и отправьте размещение на согласование.',
                    'Bu hali yuborilmagan. Pastdagi shartlarni o‘qib, so‘rovni ekran egasiga yuboring.',
                  )}
                </p>
              )}
              {active.status === 'moderation' && active.owner === user?.id && (
                <p className="notice">
                  {t(
                    'Запрос отправлен. Ждём подтверждения владельца экрана.',
                    'So‘rov ekran egasiga yuborildi. Javobini kutyapmiz.',
                  )}
                </p>
              )}
              {['scheduled', 'live'].includes(active.status) && (
                <p className="notice">
                  {t(
                    'Размещение принято владельцем. Плеер покажет материал в выбранные даты и часы, если экран подключён.',
                    'Ekran egasi qabul qildi. Ekran ulangan bo‘lsa, rasm yoki video belgilangan vaqtda ko‘rsatiladi.',
                  )}
                </p>
              )}
              <div className="approval-grid">
                <span>
                  {active.surfaceIds.every((id) => active.technical[id])
                    ? '✓'
                    : '○'}{' '}
                  {t(
                    'Подтверждение владельца экрана',
                    'Ekran egasining javobi',
                  )}
                </span>
              </div>
              {user?.role === 'operator' && active.status === 'moderation' && ownedActiveSurfaceIds.length > 0 && (
                <p className="muted">
                  {ownerCanAccept
                    ? t(
                        'Проверьте материал, даты и время. Если всё подходит для вашего экрана, примите размещение ниже.',
                        'Rasm yoki videoni, sana va vaqtni ko‘ring. Hammasi to‘g‘ri bo‘lsa, quyida qabul qiling.',
                      )
                    : t(
                        'Вы приняли размещение для своего экрана. Ожидаем подтверждения остальных владельцев, если экранов несколько.',
                        'Bu ekran uchun qabul qildingiz. Boshqa ekranlar bo‘lsa, ularning egalaridan javob kutyapmiz.',
                      )}
                </p>
              )}
              <a
                className="secondary"
                href={'/api/assets?id=' + active.assetId}
                target="_blank"
                rel="noreferrer"
              >
                {t('Открыть материал', 'Rasm yoki videoni ko‘rish')} ↗
              </a>
              {(active.owner === user?.id || admin) &&
                active.status === 'revision' && (
                  <CreativeEditor
                    key={active.id}
                    screen={data.surfaces.find(
                      (s) => s.id === active.surfaceIds[0],
                    )!}
                    onSaved={setAsset}
                    uz={uz}
                  />
                )}
              {(active.owner === user?.id || admin) &&
                ['draft', 'revision'].includes(active.status) && (
                  <>
                    <details className="terms" open>
                      <summary>
                        {t('Условия размещения', 'Joylashtirish shartlari')}
                      </summary>
                      <pre>
                        {terms ||
                          t('Загрузка условий…', 'Shartlar yuklanmoqda…')}
                      </pre>
                    </details>
                    <p className="muted">
                      {t(
                        'Деньги не списываются. Подтверждение заявки не является электронной подписью.',
                        'Pul yechilmaydi. Arizani tasdiqlash elektron imzo hisoblanmaydi.',
                      )}
                    </p>
                    <label className="check-row">
                      <Checkbox
                        checked={accepted}
                        onCheckedChange={setAccepted}
                      />
                      <span>
                        {t(
                          'Я прочитал условия и подтверждаю отправку заявки на согласование.',
                          'Shartlarni o‘qidim va so‘rovni ekran egasiga yuborishga roziman.',
                        )}
                      </span>
                    </label>
                    <button
                      className="primary"
                      disabled={
                        busy ||
                        !accepted ||
                        !terms ||
                        (active.status === 'revision' && !asset)
                      }
                      onClick={() =>
                        void act({
                          action:
                            active.status === 'draft' ? 'submit' : 'resubmit',
                          id: active.id,
                          accepted,
                          assetId: asset?.id,
                        })
                      }
                    >
                      {t(
                        'Отправить на согласование',
                        'Ekran egasiga yuborish',
                      )}
                    </button>
                  </>
                )}
              <label>
                {t('Комментарий или причина', 'Izoh yoki sabab')}
                <textarea
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <div className="button-row">
                {ownerCanAccept && (
                  <button
                    disabled={busy}
                    className="primary"
                    onClick={() =>
                      void act({ action: 'technical', id: active.id, note })
                    }
                  >
                    {t(
                      'Принять размещение',
                      'Qabul qilish',
                    )}
                  </button>
                )}
                {user?.role === 'operator' && ownedActiveSurfaceIds.length > 0 &&
                  active.status === 'moderation' &&
                  [
                    ['revision', t('На доработку', 'Tuzatishga qaytarish')],
                    [
                      'reject',
                      t('Отклонить и вернуть', 'Rad etish'),
                    ],
                  ].map(([action, label]) => (
                    <button
                      key={action}
                      disabled={busy || !note.trim()}
                      className="secondary"
                      onClick={() => void act({ action, id: active.id, note })}
                    >
                      {label}
                    </button>
                  ))}
                {(moderator || operator) &&
                  ['scheduled', 'live', 'paused'].includes(active.status) && (
                    <button
                      disabled={
                        busy || (active.status !== 'paused' && !note.trim())
                      }
                      className="secondary"
                      onClick={() =>
                        void act({
                          action:
                            active.status === 'paused' ? 'resume' : 'pause',
                          id: active.id,
                          note,
                        })
                      }
                    >
                      {active.status === 'paused'
                        ? t('Возобновить', 'Tiklash')
                        : t('Приостановить', 'To‘xtatish')}
                    </button>
                  )}
                {(active.owner === user?.id || admin) &&
                  ['draft', 'moderation', 'revision', 'scheduled'].includes(
                    active.status,
                  ) && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        void act({ action: 'cancel', id: active.id, note })
                      }
                    >
                      {t('Отменить размещение', 'Joylashtirishni bekor qilish')}
                    </button>
                  )}
                {(active.owner === user?.id || admin) &&
                  ['scheduled', 'live', 'paused'].includes(active.status) && (
                    <button
                      disabled={busy || !note.trim()}
                      className="secondary"
                      onClick={() =>
                        void act({ action: 'dispute', id: active.id, note })
                      }
                    >
                      {t('Открыть спор', 'Nizo ochish')}
                    </button>
                  )}
                {admin && active.status === 'dispute' && (
                  <button
                    className="primary"
                    disabled={busy || !note.trim()}
                    onClick={() =>
                      void act({ action: 'resolve', id: active.id, note })
                    }
                  >
                    {t('Разрешить с возвратом', 'Qaytarish bilan hal qilish')}
                  </button>
                )}
              </div>
              <div className="button-row">
                <button className="text-button" onClick={() => report(active)}>
                  {t('Скачать отчёт CSV', 'CSV hisobotini yuklash')}
                </button>
                {!!active.contracts.length && (
                  <a
                    className="text-button"
                    href={'/api/contracts?id=' + active.id + '&download=1'}
                  >
                    {t(
                      'Скачать подтверждённые условия',
                      'Qabul qilingan shartlarni yuklash',
                    )}
                  </a>
                )}
              </div>
              <p>
                {t('Сигналов запуска плеера', 'Pleyer boshlanish signallari')}:{' '}
                {data.playback.find((x) => x.campaign === active.id)?.count ||
                  0}
              </p>
              <h3>{t('История размещения', 'Joylashtirish tarixi')}</h3>
              <ol className="audit-list">
                {active.events.map((e, i) => (
                  <li key={i}>
                    <time dateTime={e.at}>{auditTimeLabel(e.at)}</time>
                    <strong>{auditActionLabel(e.action, uz)}</strong>
                    <span>{auditRoleLabel(e.role, uz)}{e.note ? ` · ${auditNoteLabel(e.note, uz)}` : ''}</span>
                  </li>
                ))}
              </ol>
              <details>
                <summary>
                  {t(
                    'Расчёты по размещению',
                    'Joylashtirish bo‘yicha hisob-kitoblar',
                  )}
                </summary>
                <p className="muted">
                  {t(
                    'Расчётные записи, без движения денег.',
                    'Hisob yozuvlari, pul o‘tkazilmaydi.',
                  )}
                </p>
                {active.ledger.map((l, i) => (
                  <p key={i}>
                    {l.kind}: {money(l.amount)}
                  </p>
                ))}
              </details>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function CampaignPreview({
  assetId,
  mime,
  name,
  uz,
}: {
  assetId: string;
  mime?: string;
  name: string;
  uz: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [assetId]);
  const source = '/api/assets?id=' + encodeURIComponent(assetId);
  const description = `${uz ? 'Joylashtirish materiali' : 'Материал размещения'}: ${name}`;
  return (
    <span className="campaign-preview" role="img" aria-label={description}>
      {!failed && mime?.startsWith('image/') ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : !failed && mime?.startsWith('video/') ? (
        <>
          <video
            src={source}
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
            onLoadedMetadata={(event) => {
              if (event.currentTarget.duration > 0.1)
                event.currentTarget.currentTime = 0.1;
            }}
            onError={() => setFailed(true)}
          />
          <Play className="campaign-preview-play" size={15} aria-hidden="true" />
        </>
      ) : (
        <Monitor size={21} aria-hidden="true" />
      )}
    </span>
  );
}
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function Qr({ id }: { id: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true;
    import('qrcode')
      .then((m) =>
        m.toDataURL(location.origin + '/?surface=' + id, {
          width: 180,
          margin: 1,
        }),
      )
      .then((s) => {
        if (active) setSrc(s);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return src ? (
    <div className="qr-block">
      <img src={src} width={140} height={140} alt="QR" />
      <a href={src} download={'maydonlar-' + id + '.png'}>
        QR ↓
      </a>
    </div>
  ) : null;
}
function SurfaceForm({
  value,
  busy,
  uz,
  save,
}: {
  value?: Surface;
  busy: boolean;
  uz: boolean;
  save: (surface: Record<string, unknown>, submit: boolean) => Promise<void>;
}) {
  const [photoId, setPhotoId] = useState(value?.photoId || ''),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(''),
    [kind, setKind] = useState(value?.kind || 'Уличный LED');
  const [cityCode, setCityCode] = useState(value?.cityCode || '1726');
  const [perPlay, setPerPlay] = useState(!value || value.pricingMode === 'per-play');
  const [tariffPrices, setTariffPrices] = useState<Record<number, string>>(
    Object.fromEntries(playDurations.map((seconds) => [seconds, String(value?.tariffs?.find((item) => item.seconds === seconds)?.price || '')])),
  );
  const [districtCode, setDistrictCode] = useState(value?.districtCode || '');
  const [lat, setLat] = useState(String(value?.lat ?? 41.31));
  const [lng, setLng] = useState(String(value?.lng ?? 69.27));
  const city = cityByCode(cityCode);
  const t = (r: string, u: string) => (uz ? u : r);
  const defaults: Record<string, unknown> = {
    name: '',
    address: '',
    district: '',
    lat: 41.31,
    lng: 69.27,
    price: 150000,
    reach: 0,
    size: '4 × 2.25 м',
    width: 1920,
    height: 1080,
    seconds: value?.seconds ?? 30,
    fps: 25,
    maxMb: 25,
    slots: 6,
    opens: '09:00',
    closes: '23:00',
    ...value,
  };
  const basicFields = [
    ['name', 'Название', 'Nomi', 'text'],
    ['address', 'Адрес', 'Manzil', 'text'],
    ...(!perPlay ? [[
      'price',
      'Существующий тариф за сутки, сум',
      'Amaldagi kunlik narx, so‘m',
      'number',
    ]] : []),
    ['opens', 'Начало работы', 'Ish boshlanishi', 'text'],
    ['closes', 'Окончание работы', 'Ish tugashi', 'text'],
  ];
  const advancedFields = [
    ['size', 'Физический размер', 'Jismoniy o‘lcham', 'text'],
    ['lat', 'Широта', 'Kenglik', 'number'],
    ['lng', 'Долгота', 'Uzunlik', 'number'],
    [
      'reach',
      'Охват в день, оценка оператора',
      'Kunlik qamrov, operator bahosi',
      'number',
    ],
    ['width', 'Ширина, пиксели', 'Kenglik, piksel', 'number'],
    ['height', 'Высота, пиксели', 'Balandlik, piksel', 'number'],
    [
      'seconds',
      'Длительность ролика, сек',
      'Video davomiyligi, soniya',
      'number',
    ],
    ['fps', 'Частота кадров, FPS', 'Kadr chastotasi, FPS', 'number'],
    ['maxMb', 'Макс. файл, МБ', 'Maks. fayl, MB', 'number'],
    ['slots', 'Одновременных размещений', 'Bir vaqtdagi joylashtirishlar', 'number'],
  ];
  const fields = [...basicFields, ...advancedFields];
  const renderField = ([id, ru, u, type]: string[]) => (
    <label key={id}>
      {t(ru, u)}
      <input
        name={id}
        type={type}
        step={['lat', 'lng'].includes(id) ? 'any' : '1'}
        {...(id === 'lat'
          ? { value: lat, onChange: (e) => setLat(e.target.value) }
          : id === 'lng'
            ? { value: lng, onChange: (e) => setLng(e.target.value) }
            : { defaultValue: String(defaults[id]) })}
        required
        maxLength={150}
      />
    </label>
  );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement;
        const f = new FormData(e.currentTarget);
        const surface: Record<string, unknown> = {
          kind,
          photoId,
          pricingMode: perPlay ? 'per-play' : 'daily-rotation',
          tariffs: perPlay
            ? playDurations
                .filter((seconds) => tariffPrices[seconds]?.trim())
                .map((seconds) => ({ seconds, price: Number(tariffPrices[seconds]) }))
            : undefined,
          cityCode,
          districtCode: city?.districts.length ? districtCode : '',
          district: city?.districts.find((item) => item.code === districtCode)?.uz || '',
        };
        for (const [id, , , type] of fields)
          surface[id] = type === 'number' ? Number(f.get(id)) : f.get(id);
        await save(surface, submitter.value === 'submit');
      }}
    >
      <div className="form-grid">
        {basicFields.slice(0, 2).map(renderField)}
        <label>
          {t('Город', 'Shahar')}
          <Choice
            value={cityCode}
            onChange={(code) => {
              setCityCode(code);
              const next = cityByCode(code);
              setDistrictCode(next?.districts.length === 1 ? next.districts[0].code : '');
              if (code !== (value?.cityCode || '1726')) {
                setLat('');
                setLng('');
              } else {
                setLat(String(value?.lat ?? 41.31));
                setLng(String(value?.lng ?? 69.27));
              }
            }}
            label={t('Город', 'Shahar')}
            options={cityOptions(uz)}
          />
        </label>
        {city && city.districts.length > 0 ? (
          <label>
            {t('Район', 'Tuman')}
            <Choice
              value={districtCode}
              onChange={setDistrictCode}
              label={t('Выберите район', 'Tumanni tanlang')}
              options={districtOptions(city, uz)}
            />
          </label>
        ) : (
          <p className="muted">{t('У этого города нет района в справочнике.', 'Bu shahar uchun tumanni tanlash shart emas.')}</p>
        )}
        {basicFields.slice(2).map(renderField)}
        {cityCode !== '1726' && advancedFields.filter(([id]) => id === 'lat' || id === 'lng').map(renderField)}
      </div>
      {value && !perPlay && (
        <div className="tariff-note">
          <p>{t('У этого экрана сохранён старый тариф за сутки. Новые тарифы за показ включатся только после вашего выбора.', 'Bu ekranda eski kunlik narx saqlangan. Ko‘rsatish narxiga faqat o‘zingiz o‘tsangiz o‘zgaradi.')}</p>
          <button className="secondary" type="button" onClick={() => setPerPlay(true)}>{t('Настроить цену за показ', 'Ko‘rsatish narxini sozlash')}</button>
        </div>
      )}
      {perPlay && (
        <fieldset className="play-tariffs">
          <legend>{t('Цена за один показ', 'Bir marta ko‘rsatish narxi')}</legend>
          <p className="muted">{t('Для нужной длительности укажите цену в сумах. Покупатель сам выберет количество показов; итоговая сумма зависит от их числа и дат.', 'Kerakli davomiylik uchun narxni so‘mda kiriting. Xaridor ko‘rsatishlar sonini tanlaydi; jami summa son va sanalarga bog‘liq.')}</p>
          <div className="form-grid">
            {playDurations.map((seconds) => (
              <label key={seconds}>
                {seconds} {t('секунд · сум за показ', 'soniya · bir ko‘rsatish narxi, so‘m')}
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder={t('Не предлагать', 'Taklif qilinmaydi')}
                  value={tariffPrices[seconds]}
                  onChange={(event) => setTariffPrices((current) => ({ ...current, [seconds]: event.target.value }))}
                />
              </label>
            ))}
          </div>
          <p className="muted">{t('Оставьте ненужные варианты пустыми. Максимальная длительность ролика задаётся в дополнительных параметрах.', 'Keraksiz variantlarni bo‘sh qoldiring. Rolikning eng uzoq davomiyligi qo‘shimcha parametrlarda belgilanadi.')}</p>
        </fieldset>
      )}
      <p className="muted">
        {t('Города и районы — по классификатору СОАТО Национального комитета по статистике. Укажите точные координаты экрана.', 'Shahar va tumanlar Statistika qo‘mitasining SOATO tasniflagichidan. Ekranning aniq koordinatalarini kiriting.')}{' '}
        <a href={locationSource} target="_blank" rel="noreferrer">{t('Источник · 2022', 'Manba · 2022')}</a>
      </p>
      <label className="file-button">
        {t('Фото экрана для каталога', 'Katalog uchun ekran surati')}
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setUploading(true);
            try {
              setPhotoId((await uploadFile(f)).id);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setUploading(false);
            }
          }}
        />
      </label>
      {photoId && (
        <img
          className="surface-photo"
          src={'/api/assets?id=' + photoId}
          alt={t('Фото поверхности', 'Maydon surati')}
        />
      )}
      <details className="terms screen-settings">
        <summary>
          {t(
            'Дополнительные параметры экрана',
            'Ekranning qo‘shimcha parametrlari',
          )}
        </summary>
        <p className="muted">
          {t(
            'Проверьте перед показом: разрешение, максимальную длительность ролика и точные координаты экрана. Одновременно можно принять несколько размещений.',
            'Ekran o‘lchami, video davomiyligi va joylashuvini tekshiring. Bir vaqtda bir nechta so‘rovni qabul qilish mumkin.',
          )}
        </p>
        <div className="form-grid">{advancedFields.filter(([id]) => cityCode === '1726' || (id !== 'lat' && id !== 'lng')).map(renderField)}</div>
        <label>
          {t('Тип экрана', 'Ekran turi')}
          <Choice
            value={kind}
            onChange={setKind}
            label={t('Тип экрана', 'Ekran turi')}
            options={[
              ['Уличный LED', t('Уличный LED', 'Tashqi LED')],
              ['Indoor LED', t('В помещении', 'Bino ichida')],
            ]}
          />
        </label>
      </details>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <button
          className="secondary"
          value="draft"
          disabled={busy || uploading}
        >
          {value?.status === 'published' || value?.status === 'paused'
            ? t('Сохранить изменения', 'O‘zgarishlarni saqlash')
            : t('Сохранить черновик', 'Qoralamani saqlash')}
        </button>
        {value?.status !== 'published' && (
          <button
            className="primary"
            value="submit"
            disabled={busy || uploading}
          >
            {t('Опубликовать', 'Saytga chiqarish')}
          </button>
        )}
      </div>
    </form>
  );
}
