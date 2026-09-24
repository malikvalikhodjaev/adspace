'use client';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Monitor,
  Search,
  Plus,
  Check,
  LayoutGrid,
  Map,
  FileVideo,
  ArrowRight,
  ShieldCheck,
  Download,
  QrCode,
  Upload,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  initial,
  quote,
  type Workspace,
  type Campaign,
  type Role,
} from '@/lib/domain';
import { money, type Surface } from '@/lib/catalog';
import CityMap from './city-map';
import OperatorTools from './operator-tools';
import QRScanner from './qr-scanner';
const statuses: Record<string, [string, string]> = {
  draft: ['Ожидает оплаты', 'To‘lov kutilmoqda'],
  moderation: ['На модерации', 'Tekshirilmoqda'],
  approved: ['Одобрено', 'Tasdiqlandi'],
  revision: ['Нужна доработка', 'Tuzatish kerak'],
  live: ['В эфире', 'Efirda'],
  completed: ['Завершено', 'Yakunlandi'],
  refunded: ['Отменено / возврат', 'Bekor qilindi / qaytarildi'],
  dispute: ['Открыт спор', 'Nizo ochiq'],
};
const roles: Record<Role, [string, string]> = {
  advertiser: ['Рекламодатель', 'Reklama beruvchi'],
  operator: ['Оператор', 'Operator'],
  moderator: ['Модератор', 'Moderator'],
  admin: ['Администратор', 'Administrator'],
};
function Picker({
  value,
  items,
  onChange,
  label,
}: {
  value: string;
  items: { value: string; label: string }[];
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => v !== null && onChange(String(v))}
    >
      <SelectTrigger aria-label={label} className="picker">
        <SelectValue>{items.find((i) => i.value === value)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export default function Platform({ variant = 'b' }: { variant?: 'a' | 'b' }) {
  const basePath = '/' + variant;
  useEffect(() => {
    document.documentElement.dataset.design = variant;
  }, [variant]);
  const [w, setW] = useState<Workspace>(initial),
    [lang, setLang] = useState<'ru' | 'uz'>('ru'),
    [view, setView] = useState('catalog'),
    [role, setRole] = useState<Role>('advertiser'),
    [q, setQ] = useState(''),
    [district, setDistrict] = useState('all'),
    [budget, setBudget] = useState(''),
    [reach, setReach] = useState(''),
    [map, setMap] = useState(false),
    [detail, setDetail] = useState<Surface | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [booking, setBooking] = useState(false),
    [start, setStart] = useState(
      new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    ),
    [end, setEnd] = useState(
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    ),
    [name, setName] = useState(''),
    [asset, setAsset] = useState(''),
    [assets, setAssets] = useState<
      { id: string; name: string; mime: string }[]
    >([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [user, setUser] = useState(''),
    [ready, setReady] = useState(false),
    [active, setActive] = useState<Campaign | null>(null),
    [note, setNote] = useState(''),
    [qr, setQr] = useState(''),
    [price, setPrice] = useState(''),
    [key, setKey] = useState('');
  const t = (ru: string, uz: string) => (lang === 'ru' ? ru : uz);
  const api = async (action: Record<string, unknown>) => {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...action, role }),
      });
      const d = (await r.json()) as {
        workspace: Workspace;
        error: string;
        user: string;
        id: string;
        name: string;
        mime: string;
      };
      if (!r.ok) throw Error(d.error);
      setW(d.workspace);
      if (active)
        setActive(
          d.workspace.campaigns.find((c: Campaign) => c.id === active.id) ||
            null,
        );
      setMessage(t('Изменения сохранены', 'O‘zgarishlar saqlandi'));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      return false;
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    try {
      const r = await fetch('/api/workspace');
      const d = (await r.json()) as {
        workspace: Workspace;
        error: string;
        user: string;
        id: string;
        name: string;
        mime: string;
      };
      if (!r.ok) throw Error(d.error);
      setW(d.workspace);
      setUser(d.user);
      setReady(true);
      const a = await fetch('/api/assets');
      if (a.ok) setAssets(await a.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  };
  useEffect(() => {
    void refresh();
    const p = new URLSearchParams(location.search);
    if (p.get('surface'))
      setDetail(
        initial().surfaces.find((s) => s.id === p.get('surface')) || null,
      );
    const v = p.get('view');
    if (v && ['campaigns', 'operator', 'moderator', 'admin'].includes(v)) {
      setView(v);
      if (v !== 'campaigns') setRole(v as Role);
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if ('serviceWorker' in navigator)
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  useEffect(() => {
    if (!detail) return;
    let live = true;
    import('qrcode')
      .then((m) =>
        m.toDataURL(location.origin + basePath + '?surface=' + detail.id, {
          width: 200,
          margin: 1,
        }),
      )
      .then((url) => {
        if (live) setQr(url);
      });
    setPrice(String(detail.price));
    return () => {
      live = false;
    };
  }, [detail]);
  useEffect(() => {
    const ctx = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!ctx) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      ctx.registerTool(
        {
          name: 'search_ad_surfaces',
          description: 'Filter visible catalog; does not book or pay.',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: (input: { query: unknown }) => {
            if (typeof input.query !== 'string' || input.query.length > 100)
              throw Error('Invalid query');
            setView('catalog');
            setQ(input.query);
            return { query: input.query };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  const list = w.surfaces.filter(
    (s) =>
      (s.name + s.district + s.address + s.id)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (district === 'all' || s.district === district) &&
      (!budget || s.price <= Number(budget)) &&
      (!reach || s.reach >= Number(reach)) &&
      !w.blocked.includes(s.operator) &&
      !w.campaigns.some(
        (c) =>
          !['refunded', 'completed'].includes(c.status) &&
          c.surfaceIds.includes(s.id) &&
          c.start <= end &&
          c.end >= start,
      ) &&
      !(w.unavailable || []).some(
        (b) => b.id === s.id && b.start <= end && b.end >= start,
      ),
  );
  const toggle = (id: string) =>
    setSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  let total = 0;
  try {
    total = quote(w, selected, start, end);
  } catch {}
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await fetch('/api/assets', { method: 'POST', body: form });
      const d = (await r.json()) as {
        workspace: Workspace;
        error: string;
        user: string;
        id: string;
        name: string;
        mime: string;
      };
      if (!r.ok) throw Error(d.error);
      setAsset(d.id);
      setAssets((a) => [{ id: d.id, name: d.name, mime: d.mime }, ...a]);
      setMessage(
        t('Креатив проверен и сохранён', 'Kreativ tekshirildi va saqlandi'),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };
  const go = (v: string) => {
    setView(v);
    setRole(
      (['operator', 'moderator', 'admin'].includes(v)
        ? v
        : 'advertiser') as Role,
    );
    history.replaceState(
      null,
      '',
      v === 'catalog' ? basePath : basePath + '?view=' + v,
    );
    setError('');
  };
  const run = (action: string) =>
    active && api({ action, id: active.id, note, assetId: asset });
  const report = (c: Campaign) => {
    const rows = [
      ['Maydonlar', 'ТЕСТОВЫЙ ОТЧЁТ — не акт и не чек'],
      ['Кампания', c.name],
      ['Период', c.start + ' — ' + c.end],
      ['Сумма UZS', String(c.total)],
      ['Статус', statuses[c.status][0]],
      ['Подтверждение', c.proof || 'Нет'],
      ['Показы', 'CMS не подключена'],
      ...c.events.map((e) => [
        e.at,
        e.role + ' / ' + e.action + ' / ' + e.note,
      ]),
    ];
    const csv =
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
        .join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maydonlar-' + c.id.slice(0, 8) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  const filtered = w.campaigns.filter((c) =>
    view === 'moderator' ? c.status === 'moderation' : true,
  );
  return (
    <>
      <header className="top">
        <a className="brand" href={basePath}>
          <b>M</b>maydonlar<sup>UZ</sup>
        </a>
        <nav>
          {[
            ['catalog', 'Поверхности', 'Maydonlar'],
            ['campaigns', 'Мои кампании', 'Kampaniyalarim'],
            ['operator', 'Для операторов', 'Operatorlar'],
            ['moderator', 'Модерация', 'Moderatsiya'],
            ['admin', 'Финансы', 'Moliya'],
          ].map(([v, ru, uz]) => (
            <a
              key={v}
              className={view === v ? 'active' : ''}
              href={basePath + '?view=' + v}
              onClick={(e) => {
                e.preventDefault();
                go(v);
              }}
            >
              {t(ru, uz)}
            </a>
          ))}
        </nav>
        <a
          className="account-link"
          href={'/auth/register?returnTo=' + basePath}
        >
          {t('Мой профиль', 'Mening profilim')}
        </a>
        <button
          className="lang"
          onClick={() => setLang(lang === 'ru' ? 'uz' : 'ru')}
        >
          {lang === 'ru' ? 'UZ' : 'RU'}
        </button>
      </header>
      <main
        data-variant={variant}
        className={view === 'catalog' ? 'catalog-main' : 'workspace-main'}
      >
        <div className="sandbox">
          <ShieldCheck size={16} />
          {t(
            'Тестовая среда · Условные оплаты и показы · Данные только вашего аккаунта',
            'Sinov muhiti · Test to‘lovlar va namoyishlar · Ma’lumotlar faqat sizga ochiq',
          )}
        </div>
        {error && (
          <div className="alert" role="alert">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}
        {message && (
          <div className="success" role="status">
            {message}
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}
        {!ready && (
          <div className="notice">
            <a
              href={
                '/signin-with-chatgpt?return_to=' + encodeURIComponent(basePath)
              }
              target="_top"
            >
              {t('Войти для сохранения заявок', 'Saqlash uchun kirish')} →
            </a>
            <button className="plain" onClick={() => void refresh()}>
              <RefreshCw size={16} />
              {t('Повторить', 'Qayta urinish')}
            </button>
          </div>
        )}
        {view === 'catalog' ? (
          <>
            {variant === 'b' ? (
              <>
                {' '}
                <section className="city-hero" aria-labelledby="city-title">
                  <div className="hero-copy">
                    <div className="eyebrow">
                      {t(
                        'ТАШКЕНТ / ЦИФРОВАЯ НАРУЖНАЯ РЕКЛАМА',
                        'TOSHKENT / RAQAMLI TASHQI REKLAMA',
                      )}
                    </div>
                    <h1 id="city-title">
                      {t('ГОРОД УВИДИТ', 'SHAHAR KO‘RADI')}
                      <br />
                      <em>{t('ваш бренд.', 'brendingizni.')}</em>
                    </h1>
                    <p>
                      {t(
                        'Выберите LED-экран, загрузите креатив и спланируйте размещение. Весь путь — в одном кабинете.',
                        'LED ekran tanlang, kreativ yuklang va joylashtirishni rejalashtiring. Barcha bosqichlar bitta kabinetda.',
                      )}
                    </p>
                    <a className="hero-jump" href="#screens">
                      {t('Подобрать экраны', 'Ekranlarni tanlash')}{' '}
                      <ArrowRight size={18} />
                    </a>
                  </div>
                  <figure className="city-art">
                    <img
                      src="/tashkent-city-collage.png"
                      width="1448"
                      height="1086"
                      alt={t(
                        'Иллюстрация Ташкента с цифровыми рекламными экранами',
                        'Raqamli reklama ekranlari bilan Toshkent illyustratsiyasi',
                      )}
                    />
                    <figcaption>
                      {t(
                        'КОНЦЕПТ ГОРОДА · НЕ ФОТО РЕАЛЬНЫХ ПОВЕРХНОСТЕЙ',
                        'SHAHAR KONSEPTI · HAQIQIY MAYDONLAR SURATI EMAS',
                      )}
                    </figcaption>
                  </figure>
                </section>
                <div className="city-facts">
                  <div>
                    <strong>
                      {w.surfaces.length.toString().padStart(2, '0')}
                    </strong>
                    <span>
                      {t(
                        'экранов в тестовом каталоге',
                        'sinov katalogidagi ekranlar',
                      )}
                    </span>
                  </div>
                  <div>
                    <strong>
                      {Math.min(
                        ...w.surfaces.map((s) => s.price),
                      ).toLocaleString('ru-RU')}{' '}
                      <small>UZS</small>
                    </strong>
                    <span>
                      {t(
                        'от / сутки · тестовый тариф',
                        'dan / kun · test tarifi',
                      )}
                    </span>
                  </div>
                  <div>
                    <strong>
                      15 <small>{t('СЕК', 'SONIYA')}</small>
                    </strong>
                    <span>
                      {t(
                        'максимальная длина ролика',
                        'rolikning maksimal uzunligi',
                      )}
                    </span>
                  </div>
                  <div>
                    <strong>02</strong>
                    <span>
                      {t(
                        'независимые проверки креатива',
                        'mustaqil kreativ tekshiruvi',
                      )}
                    </span>
                  </div>
                </div>
                <div id="screens" className="section-kicker">
                  <span>01 / {t('ПОДБОР ПОВЕРХНОСТЕЙ', 'MAYDON TANLASH')}</span>
                  <span>TASHKENT, UZ</span>
                </div>
              </>
            ) : (
              <>
                <div className="eyebrow">
                  {t('РЕКЛАМА В ГОРОДЕ / 01', 'SHAHAR REKLAMASI / 01')}
                </div>
                <div className="heading">
                  <div>
                    <h1>
                      {t('Ваш бренд. На виду.', 'Brendingiz. Ko‘z o‘ngida.')}
                    </h1>
                    <p>
                      {t(
                        'Найдите экран и спланируйте размещение в Ташкенте.',
                        'Toshkentda ekran toping va reklamani rejalashtiring.',
                      )}
                    </p>
                  </div>
                  <span className="pilot">● {t('Пилот LED', 'LED pilot')}</span>
                </div>
              </>
            )}
            <div className="searchbar">
              <Search size={20} />
              <input
                aria-label="Поиск площадки"
                placeholder={t(
                  'Название, район, адрес или ID экрана',
                  'Nomi, tuman, manzil yoki ekran ID',
                )}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <QRScanner
                uz={lang === 'uz'}
                onFound={(id) => {
                  const s = w.surfaces.find((x) => x.id === id);
                  if (s) setDetail(s);
                  else setError(t('Экран не найден', 'Ekran topilmadi'));
                }}
              />
            </div>
            <div className="filters">
              <Picker
                label="Район"
                value={district}
                onChange={setDistrict}
                items={[
                  { value: 'all', label: t('Все районы', 'Barcha tumanlar') },
                  ...Array.from(new Set(w.surfaces.map((s) => s.district))).map(
                    (d) => ({ value: d, label: d }),
                  ),
                ]}
              />
              <input
                type="number"
                min="0"
                aria-label="Максимальная цена"
                placeholder={t('Бюджет за сутки, сум', 'Kunlik byudjet, so‘m')}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <input
                type="number"
                min="0"
                aria-label="Минимальный охват"
                placeholder={t('Охват от, чел./день', 'Qamrov, kishi/kun')}
                value={reach}
                onChange={(e) => setReach(e.target.value)}
              />
              <button
                className="plain"
                onClick={() => {
                  setQ('');
                  setDistrict('all');
                  setBudget('');
                  setReach('');
                }}
              >
                {t('Сбросить', 'Tozalash')}
              </button>
            </div>
            <div className="date-search">
              <span>{t('Доступны в период', 'Davrda mavjud')}</span>
              <input
                aria-label="Начало периода поиска"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <span>—</span>
              <input
                aria-label="Конец периода поиска"
                type="date"
                min={start}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <div className="catalog-heading">
              <h2>
                {variant === 'a'
                  ? t('Рекламные поверхности', 'Reklama maydonlari')
                  : t('НАЙДИТЕ СВОЙ ЭКРАН', 'EKRANINGIZNI TOPING')}{' '}
                <small>{list.length}</small>
              </h2>
              <button className="secondary" onClick={() => setMap(!map)}>
                {map ? <LayoutGrid size={17} /> : <Map size={17} />}{' '}
                {map ? t('Каталог', 'Katalog') : t('На карте', 'Xaritada')}
              </button>
            </div>
            {map && <CityMap surfaces={list} onSelect={setDetail} />}
            <div className="catalog-grid">
              {list.map((s, i) => (
                <article className="surface" key={s.id}>
                  <button
                    className={'screen-art scene-' + i}
                    onClick={() => setDetail(s)}
                    aria-label={s.name}
                  >
                    <Monitor size={68} strokeWidth={1} />
                    <span className="tag">{s.kind}</span>
                    <span className="screen-caption">
                      {t('Демонстрационная поверхность', 'Namuna maydon')}
                    </span>
                  </button>
                  <div className="surface-body">
                    <div className="meta">
                      {s.district} · {s.size}
                    </div>
                    <h3>
                      <button
                        className="text-button"
                        onClick={() => setDetail(s)}
                      >
                        {s.name}
                      </button>
                    </h3>
                    <p>{s.address}</p>
                    <div className="spec">
                      <span>1920 × 1080 px</span>
                      <span>{t('До 15 сек', '15 soniyagacha')}</span>
                    </div>
                    <div className="card-bottom">
                      <div>
                        <strong>{money(s.price)}</strong>
                        <span> / {t('сутки', 'kun')}</span>
                      </div>
                      <button
                        className={selected.includes(s.id) ? 'selected' : ''}
                        aria-label={
                          t('В медиаплан', 'Mediaplanga') + ' ' + s.name
                        }
                        onClick={() => toggle(s.id)}
                      >
                        {selected.includes(s.id) ? (
                          <Check size={20} />
                        ) : (
                          <Plus size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!list.length && (
              <div className="empty">
                {t(
                  'Экранов нет. Измените фильтры.',
                  'Ekranlar yo‘q. Filtrlarni o‘zgartiring.',
                )}
              </div>
            )}
            {selected.length > 0 && (
              <div className="planbar">
                <div>
                  <strong>
                    {t('В медиаплане', 'Mediaplanda')}: {selected.length}
                  </strong>
                  <p>
                    {money(
                      w.surfaces
                        .filter((s) => selected.includes(s.id))
                        .reduce((n, s) => n + s.price, 0),
                    )}{' '}
                    / {t('сутки', 'kun')}
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    setKey(crypto.randomUUID());
                    setBooking(true);
                    setRole('advertiser');
                  }}
                >
                  {t('Оформить кампанию', 'Kampaniya yaratish')}{' '}
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
            {variant === 'b' && (
              <>
                {' '}
                <section className="city-process">
                  <div className="eyebrow">
                    02 / {t('КАК ЭТО РАБОТАЕТ', 'BU QANDAY ISHLAYDI')}
                  </div>
                  <h2>
                    {t('ОТ ЭКРАНА — К КАМПАНИИ', 'EKRANDAN KAMPANIYAGACHA')}
                  </h2>
                  <div className="process-grid">
                    <article>
                      <b>01</b>
                      <h3>
                        {t('Найдите нужное место', 'Kerakli joyni toping')}
                      </h3>
                      <p>
                        {t(
                          'Выберите район и даты. Сравните экраны на карте и добавьте подходящие в медиаплан.',
                          'Tuman va sanalarni tanlang. Ekranlarni xaritada solishtiring va mediaplanga qo‘shing.',
                        )}
                      </p>
                    </article>
                    <article>
                      <b>02</b>
                      <h3>
                        {t(
                          'Рассчитайте размещение',
                          'Joylashtirishni hisoblang',
                        )}
                      </h3>
                      <p>
                        {t(
                          'Стоимость за выбранный период видна до заявки. Загрузите PNG или ролик MP4 до 15 секунд.',
                          'Tanlangan davr narxi arizadan oldin ko‘rinadi. PNG yoki 15 soniyagacha MP4 yuklang.',
                        )}
                      </p>
                    </article>
                    <article>
                      <b>03</b>
                      <h3>{t('Пройдите проверку', 'Tekshiruvdan o‘ting')}</h3>
                      <p>
                        {t(
                          'Платформа проверяет контент, оператор — технические параметры. История и тестовый отчёт сохраняются в кампании.',
                          'Platforma kontentni, operator esa texnik parametrlarni tekshiradi. Tarix va test hisoboti kampaniyada saqlanadi.',
                        )}
                      </p>
                    </article>
                  </div>
                </section>
                <footer className="city-footer">
                  <strong>maydonlar.</strong>
                  <span>
                    TASHKENT · UZBEKISTAN
                    <br />
                    {t(
                      'Городские экраны. Прямой выбор.',
                      'Shahar ekranlari. To‘g‘ridan-to‘g‘ri tanlov.',
                    )}
                  </span>
                </footer>
              </>
            )}
          </>
        ) : (
          <>
            <div className="eyebrow">
              {roles[role][lang === 'ru' ? 0 : 1]} /{' '}
              {t('ТЕСТОВЫЙ КАБИНЕТ', 'SINOV KABINETI')}
            </div>
            <div className="heading">
              <div>
                <h1>
                  {view === 'campaigns'
                    ? t('Мои кампании', 'Kampaniyalarim')
                    : view === 'operator'
                      ? t('Управление экранами', 'Ekranlarni boshqarish')
                      : view === 'moderator'
                        ? t('Очередь модерации', 'Moderatsiya navbati')
                        : t('Финансы и контроль', 'Moliya va nazorat')}
                </h1>
                <p>{user}</p>
              </div>
              <button className="secondary" onClick={() => void refresh()}>
                <RefreshCw size={16} />
                {t('Обновить', 'Yangilash')}
              </button>
            </div>
            {view === 'admin' && (
              <>
                <div className="stats">
                  {[
                    [
                      t('Условный GMV', 'Test GMV'),
                      w.campaigns
                        .filter((c) => c.ledger.some((l) => l.kind === 'hold'))
                        .reduce((n, c) => n + c.total, 0),
                    ],
                    [
                      t('Возвраты', 'Qaytarishlar'),
                      w.campaigns.reduce(
                        (n, c) =>
                          n +
                          c.ledger
                            .filter((l) => l.kind === 'refund')
                            .reduce((a, l) => a + l.amount, 0),
                        0,
                      ),
                    ],
                    [
                      t('Комиссия нетто', 'Sof komissiya'),
                      w.campaigns.reduce(
                        (n, c) =>
                          n +
                          c.ledger
                            .filter((l) => l.kind === 'fee')
                            .reduce((a, l) => a + l.amount, 0) -
                          c.ledger
                            .filter((l) => l.kind === 'fee_reversal')
                            .reduce((a, l) => a + l.amount, 0),
                        0,
                      ),
                    ],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <p>{label}</p>
                      <strong>{money(Number(value))}</strong>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <h2>
                    {t('Операторы и комиссия', 'Operatorlar va komissiya')}
                  </h2>
                  <label>
                    {t(
                      'Комиссия новых сделок, %',
                      'Yangi bitimlar komissiyasi, %',
                    )}
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={w.commission}
                      onChange={(e) =>
                        setW({ ...w, commission: Number(e.target.value) })
                      }
                    />
                  </label>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void api({ action: 'commission', value: w.commission })
                    }
                  >
                    {t('Сохранить', 'Saqlash')}
                  </button>
                  {Array.from(new Set(w.surfaces.map((s) => s.operator))).map(
                    (o) => (
                      <div className="operator-row" key={o}>
                        <span>{o}</span>
                        <button
                          disabled={busy}
                          className="secondary"
                          onClick={() =>
                            void api({ action: 'block', operator: o })
                          }
                        >
                          {w.blocked.includes(o)
                            ? t('Возобновить', 'Tiklash')
                            : t('Приостановить', 'To‘xtatish')}
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </>
            )}
            {view === 'campaigns' && (
              <details className="panel">
                <summary>
                  {t('Профиль рекламодателя', 'Reklama beruvchi profili')}
                </summary>
                <label>
                  {t('Имя или компания', 'Ism yoki kompaniya')}
                  <input
                    value={w.profile.name}
                    onChange={(e) =>
                      setW({
                        ...w,
                        profile: { ...w.profile, name: e.target.value },
                      })
                    }
                  />
                </label>
                <Picker
                  label="Тип профиля"
                  value={w.profile.type}
                  onChange={(v) =>
                    setW({ ...w, profile: { ...w.profile, type: v } })
                  }
                  items={[
                    { value: 'person', label: t('Физлицо', 'Jismoniy shaxs') },
                    { value: 'ip', label: t('ИП', 'YTT') },
                    { value: 'business', label: t('Юрлицо', 'Yuridik shaxs') },
                  ]}
                />
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => void api({ action: 'profile', ...w.profile })}
                >
                  {t('Сохранить', 'Saqlash')}
                </button>
              </details>
            )}
            {view === 'operator' && (
              <OperatorTools save={api} uz={lang === 'uz'} />
            )}
            {view === 'operator' && (
              <div className="operator-grid">
                {w.surfaces.map((s) => (
                  <button
                    key={s.id}
                    className="panel text-left"
                    onClick={() => setDetail(s)}
                  >
                    <Monitor size={22} />
                    <h3>{s.name}</h3>
                    <p>
                      {money(s.price)} / {t('сутки', 'kun')}
                    </p>
                    <span>
                      {t('Тариф, календарь и QR', 'Tarif, taqvim va QR')} →
                    </span>
                  </button>
                ))}
              </div>
            )}
            <h2 className="catalog-heading">
              {t('Заявки', 'Arizalar')} <small>{filtered.length}</small>
            </h2>
            {!filtered.length ? (
              <div className="empty">
                <FileVideo size={34} />
                <h3>{t('Пока нет заявок', 'Hozircha arizalar yo‘q')}</h3>
                <p>
                  {t(
                    'Соберите медиаплан в каталоге.',
                    'Katalogda mediaplan tuzing.',
                  )}
                </p>
                <button className="primary" onClick={() => go('catalog')}>
                  {t('Выбрать экраны', 'Ekran tanlash')}
                </button>
              </div>
            ) : (
              <div className="campaign-list">
                {filtered.map((c) => (
                  <button
                    className="campaign"
                    key={c.id}
                    onClick={() => {
                      setActive(c);
                      setNote('');
                      setAsset(c.assetId);
                    }}
                  >
                    <FileVideo />
                    <div>
                      <h3>{c.name}</h3>
                      <p>
                        {c.start} — {c.end} · {c.surfaceIds.length}{' '}
                        {t('экр.', 'ekr.')}
                      </p>
                    </div>
                    <span className={'badge ' + c.status}>
                      {statuses[c.status][lang === 'ru' ? 0 : 1]}
                    </span>
                    <strong>{money(c.total)}</strong>
                    <ArrowUpRight size={20} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <aside className="notice">
          {t(
            'Поверхности, цены и охват — демонстрационные данные. Оплаты, возвраты и показ имитируются; платёжные системы и CMS не подключены.',
            'Maydonlar, narxlar va qamrov namunaviy. To‘lovlar, qaytarishlar va namoyish test rejimida; to‘lov tizimlari va CMS ulanmagan.',
          )}
        </aside>
      </main>
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="wide-dialog">
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          {detail && (
            <>
              <DialogTitle>{detail.name}</DialogTitle>
              <DialogDescription>
                {detail.address} · {detail.operator}
              </DialogDescription>
              <div className="detail-spec">
                <div>
                  <p>{t('Тариф за сутки', 'Kunlik tarif')}</p>
                  <strong>{money(detail.price)}</strong>
                </div>
                <div>
                  <p>{t('Размер', 'O‘lcham')}</p>
                  <strong>{detail.size}</strong>
                </div>
                <div>
                  <p>{t('Тестовый охват', 'Test qamrovi')}</p>
                  <strong>
                    {detail.reach.toLocaleString()} / {t('день', 'kun')}
                  </strong>
                </div>
              </div>
              <p>
                {t(
                  'PNG или MP4 до 15 сек; 1920 × 1080; до 25 МБ. Один пакет ротации на сутки. Охват не равен числу показов.',
                  'PNG yoki 15 soniyagacha MP4; 1920 × 1080; 25 MB gacha. Kunlik bitta rotatsiya paketi. Qamrov namoyishlar soniga teng emas.',
                )}
              </p>
              <h3>{t('Занятые периоды', 'Band davrlar')}</h3>
              {w.campaigns
                .filter(
                  (c) =>
                    c.surfaceIds.includes(detail.id) &&
                    !['refunded', 'completed'].includes(c.status),
                )
                .map((c) => (
                  <p key={c.id}>
                    {c.start} — {c.end}
                  </p>
                ))}
              {!w.campaigns.some(
                (c) =>
                  c.surfaceIds.includes(detail.id) &&
                  !['refunded', 'completed'].includes(c.status),
              ) && (
                <p>{t('Тестовый календарь свободен', 'Sinov taqvimi bo‘sh')}</p>
              )}
              <a
                href={
                  'https://www.openstreetmap.org/?mlat=' +
                  detail.lat +
                  '&mlon=' +
                  detail.lng +
                  '#map=16/' +
                  detail.lat +
                  '/' +
                  detail.lng
                }
                target="_blank"
                rel="noreferrer"
              >
                {t('Открыть на карте', 'Xaritada ochish')} ↗
              </a>
              <div className="qr-row">
                {qr && (
                  <img
                    src={qr}
                    width="130"
                    height="130"
                    alt="QR-код поверхности"
                  />
                )}
                <div>
                  <p>ID: {detail.id}</p>
                  <a className="plain" href={qr} download={detail.id + '.png'}>
                    <Download size={16} />
                    {t('Скачать QR', 'QR yuklash')}
                  </a>
                  <p>
                    {t(
                      'Сканируйте камерой телефона',
                      'Telefon kamerasi bilan skanerlang',
                    )}
                  </p>
                </div>
              </div>
              {(w.unavailable || [])
                .filter((b) => b.id === detail.id)
                .map((b) => (
                  <p key={b.start + b.end}>
                    {t('Закрыто оператором', 'Operator yopgan')}: {b.start} —{' '}
                    {b.end}
                  </p>
                ))}
              {role === 'operator' ? (
                <>
                  <details>
                    <summary>
                      {t(
                        'Закрыть или открыть период',
                        'Davrni yopish yoki ochish',
                      )}
                    </summary>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        await api({
                          action: 'unavailable',
                          id: detail.id,
                          start: f.get('start'),
                          end: f.get('end'),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          {t('Начало', 'Boshlanish')}
                          <input name="start" type="date" required />
                        </label>
                        <label>
                          {t('Конец', 'Tugash')}
                          <input name="end" type="date" required />
                        </label>
                      </div>
                      <p className="micro">
                        {t(
                          'Повтор тех же дат открывает период. Существующие заявки сохраняются.',
                          'Bir xil sanalarni qaytarish davrni ochadi.',
                        )}
                      </p>
                      <button className="secondary" disabled={busy}>
                        {t('Изменить доступность', 'Mavjudlikni o‘zgartirish')}
                      </button>
                    </form>
                  </details>
                  <label>
                    {t('Тариф, сум за сутки', 'Tarif, so‘m/kun')}
                    <input
                      type="number"
                      min="10000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={busy}
                    className="primary"
                    onClick={async () => {
                      if (
                        await api({
                          action: 'surface',
                          id: detail.id,
                          price: Number(price),
                        })
                      )
                        setDetail({ ...detail, price: Number(price) });
                    }}
                  >
                    {t('Сохранить тариф', 'Tarifni saqlash')}
                  </button>
                </>
              ) : (
                <button
                  className="primary"
                  onClick={() => {
                    if (!selected.includes(detail.id))
                      setSelected([...selected, detail.id]);
                    setDetail(null);
                    setKey(crypto.randomUUID());
                    setBooking(true);
                    setRole('advertiser');
                  }}
                >
                  {t('Выбрать даты и креатив', 'Sana va kreativ tanlash')}
                  <ArrowRight size={17} />
                </button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={booking} onOpenChange={setBooking}>
        <DialogContent className="wide-dialog">
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <DialogTitle>
            {t('Новая рекламная кампания', 'Yangi reklama kampaniyasi')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Комиссия удерживается из суммы размещения.',
              'Komissiya joylashtirish summasidan olinadi.',
            )}
          </DialogDescription>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await api({
                  action: 'create',
                  key,
                  name,
                  surfaceIds: selected,
                  start,
                  end,
                  assetId: asset,
                })
              ) {
                setBooking(false);
                setSelected([]);
                go('campaigns');
              }
            }}
          >
            <label>
              {t('Название кампании', 'Kampaniya nomi')}
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                {t('Начало', 'Boshlanish')}
                <input
                  required
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                {t('Окончание включительно', 'Tugash kuni ham kiradi')}
                <input
                  required
                  type="date"
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
            <div className="chosen">
              {w.surfaces
                .filter((s) => selected.includes(s.id))
                .map((s) => (
                  <div key={s.id}>
                    <span>{s.name}</span>
                    <button type="button" onClick={() => toggle(s.id)}>
                      ×
                    </button>
                  </div>
                ))}
            </div>
            <label className="upload">
              <Upload size={24} />
              {t('Загрузить PNG или MP4', 'PNG yoki MP4 yuklash')}
              <span>1920 × 1080 · ≤ 15 sec · ≤ 25 MB</span>
              <input
                type="file"
                accept="image/png,video/mp4"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
            {assets.length > 0 && (
              <Picker
                label="Библиотека креативов"
                value={asset}
                onChange={setAsset}
                items={assets.map((a) => ({ value: a.id, label: a.name }))}
              />
            )}
            <a href="/test-creative.png" download className="plain">
              {t('Скачать тестовый креатив PNG', 'Test PNG kreativini yuklash')}
            </a>
            <div className="cost">
              <span>{t('Итого за период', 'Davr uchun jami')}</span>
              <strong>{money(total)}</strong>
            </div>
            <p className="micro">
              {t('В том числе комиссия', 'Shundan komissiya')}:{' '}
              {money(Math.round((total * w.commission) / 100))} ({w.commission}
              %)
            </p>
            <button
              className="primary full"
              disabled={busy || !asset || !selected.length || !total || !ready}
              type="submit"
            >
              {busy
                ? t('Сохраняем…', 'Saqlanmoqda…')
                : t('Создать заявку', 'Ariza yaratish')}
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="wide-dialog">
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          {active && (
            <>
              <DialogTitle>{active.name}</DialogTitle>
              <DialogDescription>
                {active.start} — {active.end} · {money(active.total)}
              </DialogDescription>
              <span className={'badge ' + active.status}>
                {statuses[active.status][lang === 'ru' ? 0 : 1]}
              </span>
              <div className="approvals">
                <span>
                  {active.content === 'approved' ? '✓' : '○'}{' '}
                  {t('Контентная проверка', 'Kontent tekshiruvi')}
                </span>
                <span>
                  {active.technical === 'approved' ? '✓' : '○'}{' '}
                  {t('Техническая проверка', 'Texnik tekshiruv')}
                </span>
              </div>
              <a
                target="_blank"
                rel="noreferrer"
                className="secondary"
                href={'/api/assets?id=' + active.assetId}
              >
                <FileVideo size={16} />
                {t('Открыть креатив', 'Kreativni ochish')}
              </a>
              <label>
                {t(
                  'Комментарий / подтверждение / причина',
                  'Izoh / tasdiq / sabab',
                )}
                <textarea
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <div className="actions">
                {role === 'advertiser' && active.status === 'draft' && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void run('pay')}
                  >
                    {t(
                      'Провести тестовую оплату',
                      'Test to‘lovini amalga oshirish',
                    )}
                  </button>
                )}
                {role === 'moderator' &&
                  active.status === 'moderation' &&
                  active.content !== 'approved' && (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void run('content')}
                    >
                      {t('Одобрить контент', 'Kontentni tasdiqlash')}
                    </button>
                  )}
                {role === 'operator' &&
                  active.status === 'moderation' &&
                  active.technical !== 'approved' && (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void run('technical')}
                    >
                      {t(
                        'Подтвердить техпроверку',
                        'Texnik tekshiruvni tasdiqlash',
                      )}
                    </button>
                  )}
                {['moderator', 'operator'].includes(role) &&
                  active.status === 'moderation' && (
                    <>
                      <button
                        className="secondary"
                        disabled={busy || !note.trim()}
                        onClick={() => void run('revision')}
                      >
                        {t('На доработку', 'Tuzatishga')}
                      </button>
                      <button
                        className="danger"
                        disabled={busy || !note.trim()}
                        onClick={() => void run('reject')}
                      >
                        {t('Отклонить и вернуть', 'Rad etish va qaytarish')}
                      </button>
                    </>
                  )}
                {role === 'advertiser' && active.status === 'revision' && (
                  <>
                    <label className="upload">
                      {t('Новый креатив', 'Yangi kreativ')}
                      <input
                        type="file"
                        accept="image/png,video/mp4"
                        onChange={(e) => void upload(e.target.files?.[0])}
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={busy || !asset || asset === active.assetId}
                      onClick={() => void run('resubmit')}
                    >
                      {t('Отправить повторно', 'Qayta yuborish')}
                    </button>
                  </>
                )}
                {role === 'operator' && active.status === 'approved' && (
                  <button
                    className="primary"
                    disabled={busy || !note.trim()}
                    onClick={() => void run('start')}
                  >
                    {t(
                      'Подтвердить тестовый старт',
                      'Test boshlanishini tasdiqlash',
                    )}
                  </button>
                )}
                {role === 'operator' && active.status === 'live' && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void run('complete')}
                  >
                    {t(
                      'Завершить тестовый показ',
                      'Test namoyishini yakunlash',
                    )}
                  </button>
                )}
                {role === 'advertiser' &&
                  ['live', 'approved'].includes(active.status) && (
                    <button
                      className="danger"
                      disabled={busy || !note.trim()}
                      onClick={() => void run('dispute')}
                    >
                      {t('Открыть спор', 'Nizo ochish')}
                    </button>
                  )}
                {role === 'admin' && active.status === 'dispute' && (
                  <button
                    className="primary"
                    disabled={busy || !note.trim()}
                    onClick={() => void run('resolve')}
                  >
                    {t(
                      'Разрешить спор с возвратом',
                      'Nizoni qaytarish bilan hal qilish',
                    )}
                  </button>
                )}
                {role === 'advertiser' &&
                  ['draft', 'moderation', 'revision', 'approved'].includes(
                    active.status,
                  ) && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => void run('cancel')}
                    >
                      {t('Отменить заявку', 'Arizani bekor qilish')}
                    </button>
                  )}
              </div>
              <button className="plain" onClick={() => report(active)}>
                <Download size={16} />
                {t('Скачать тестовый отчёт CSV', 'Test hisobotini CSV yuklash')}
              </button>
              <h3>{t('Журнал средств · тест', 'Mablag‘lar jurnali · test')}</h3>
              {active.ledger.map((l, i) => (
                <div className="ledger" key={i}>
                  <span>
                    {
                      (
                        {
                          hold: t('Удержано', 'Ushlandi'),
                          release: t(
                            'Начислено оператору',
                            'Operatorga hisoblandi',
                          ),
                          fee: t('Комиссия', 'Komissiya'),
                          refund: t('Возврат', 'Qaytarish'),
                          reversal: t(
                            'Сторно начисления',
                            'Hisoblashni bekor qilish',
                          ),
                          fee_reversal: t(
                            'Сторно комиссии',
                            'Komissiyani bekor qilish',
                          ),
                        } as Record<string, string>
                      )[l.kind]
                    }
                  </span>
                  <strong>{money(l.amount)}</strong>
                </div>
              ))}
              <h3>{t('История заявки', 'Ariza tarixi')}</h3>
              <ol className="timeline">
                {active.events.map((e, i) => (
                  <li key={i}>
                    <strong>{e.action}</strong> ·{' '}
                    {roles[e.role][lang === 'ru' ? 0 : 1]}
                    <p>{e.note}</p>
                    <small>
                      {new Date(e.at).toLocaleString(
                        lang === 'ru' ? 'ru-RU' : 'uz-UZ',
                      )}
                    </small>
                  </li>
                ))}
              </ol>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
