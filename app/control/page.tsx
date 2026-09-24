'use client';
import { useEffect, useState } from 'react';
import { Choice, request, uploadFile } from '../controls';
import type { Asset, Surface, User } from '@/lib/model';
import ServiceInfo from '../service-info';
import Brand from '../brand';
import '../mvp.css';
type Remote = {
  screen: string;
  name: string;
  width: number;
  height: number;
  maxMb: number;
  paired: boolean;
  assetId: string | null;
  revision: number;
  applied: number;
  lastSeen: string | null;
  phase: string;
  error: string;
  online: boolean;
  events: { revision: number; action: string; at: string }[];
  url?: string;
};
export default function Control() {
  const [screens, setScreens] = useState<Surface[]>([]),
    [screen, setScreen] = useState(''),
    [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [remote, setRemote] = useState<Remote | null>(null),
    [asset, setAsset] = useState<Asset | null>(null),
    [link, setLink] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    void request('/api/workspace')
      .then((d: any) => {
        setUser(d.user);
        const own = d.surfaces.filter(
          (s: Surface) =>
            d.user?.role === 'admin' ||
            (d.user?.role === 'operator' && s.owner === d.user.id),
        );
        setScreens(own);
        const id = new URLSearchParams(location.search).get('screen');
        setScreen(
          own.some((s: Surface) => s.id === id) ? id : own[0]?.id || '',
        );
        setReady(true);
      })
      .catch((e) => {
        setError(e.message);
        setReady(true);
      });
  }, []);
  useEffect(() => {
    setRemote(null);
    setAsset(null);
    setLink('');
    setError('');
    setCopied(false);
    if (!screen) return;
    let cancelled = false,
      pending = false;
    async function poll() {
      if (pending) return;
      pending = true;
      try {
        const r = (await request(
          '/api/remote?screen=' + encodeURIComponent(screen),
        )) as Remote;
        if (!cancelled)
          setRemote((previous) =>
            !previous || r.revision >= previous.revision ? r : previous,
          );
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        pending = false;
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [screen]);
  async function command(action: 'pair' | 'show' | 'clear') {
    if (!remote) return;
    setBusy(true);
    setError('');
    try {
      const r = (await request('/api/remote', {
        action,
        screen,
        assetId: asset?.id,
        key: crypto.randomUUID(),
        expectedRevision: remote.revision,
      })) as Remote;
      setRemote({ ...remote, ...r });
      if (r.url) {
        setLink(location.origin + r.url);
        setCopied(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const status = !remote?.paired
    ? 'Экран ещё не подключён'
    : !remote.online
      ? 'Плеер офлайн — команда сохранена'
      : remote.phase === 'error'
        ? 'Ошибка на плеере'
        : remote.applied === remote.revision && remote.phase === 'displayed'
          ? remote.assetId
            ? 'Плеер подтвердил показ'
            : 'Плеер подключён · экран пуст'
          : remote.phase === 'received'
            ? 'Плеер скачивает файл'
            : 'Ожидаем подтверждения плеера';
  return (
    <main className="mvp remote-control">
      <header className="app-header">
        <a href="/" className="wordmark" aria-label="Maydonlar — главная">
          <Brand />
        </a>
        <a href="/?view=operator">← Мои экраны</a>
        <span className="muted">LED-пульт</span>
      </header>
      <div className="remote-content">
        <p className="kicker">УПРАВЛЯЙТЕ С ДРУГОГО УСТРОЙСТВА</p>
        <h1>
          Один экран.
          <br />
          <em>Любая картинка.</em>
        </h1>
        <p className="remote-lead">
          Откройте плеер на телевизоре или втором компьютере. Меняйте файл здесь
          — изображение там обновится само, обычно за 2–3 секунды плюс загрузка.
        </p>
        {!ready ? (
          <p>Загрузка пульта…</p>
        ) : !user ? (
          <a className="primary" href="/login?next=/control">
            Войти в кабинет
          </a>
        ) : !screens.length ? (
          <section className="remote-panel">
            <h2>Сначала добавьте свой экран</h2>
            <p>
              Пульт доступен оператору и администратору. Управлять плеером можно
              сразу после создания своего экрана.
            </p>
            <a className="primary" href="/?view=operator">
              Перейти к экранам
            </a>
          </section>
        ) : (
          <>
            <label className="remote-select">
              Экран
              <Choice
                label="Управляемый экран"
                value={screen}
                disabled={busy}
                onChange={setScreen}
                options={screens.map((s) => [s.id, s.name])}
              />
            </label>
            <div className="remote-grid">
              <section className="remote-panel">
                <p className="kicker">01 · ПОДКЛЮЧЕНИЕ</p>
                <h2>Откройте плеер один раз</h2>
                <p>
                  Выдайте приватную ссылку и откройте её на устройстве
                  воспроизведения. После этого обновлять страницу вручную не
                  нужно.
                </p>
                <button
                  className="secondary"
                  disabled={busy || !remote}
                  onClick={() => void command('pair')}
                >
                  {remote?.paired
                    ? 'Выдать новую ссылку плеера'
                    : 'Подключить плеер'}
                </button>
                {remote?.paired && (
                  <small className="muted">
                    Новая ссылка отключает старую. Для смены картинки новую
                    ссылку выдавать не нужно.
                  </small>
                )}
                {link && (
                  <div className="remote-link">
                    <label>
                      Приватная ссылка
                      <input readOnly value={link} />
                    </label>
                    <div className="button-row">
                      <a
                        className="primary"
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть плеер ↗
                      </a>
                      <button
                        className="secondary"
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(link)
                            .then(() => setCopied(true))
                            .catch(() =>
                              setError('Скопируйте ссылку из поля вручную'),
                            )
                        }
                      >
                        {copied ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
              <section className="remote-panel">
                <p className="kicker">02 · СМЕНА СОДЕРЖИМОГО</p>
                <h2>Что показать сейчас?</h2>
                <label className="file-button">
                  {busy ? 'Подождите…' : 'Выбрать изображение или MP4'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,video/mp4"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setBusy(true);
                      setError('');
                      setAsset(null);
                      void uploadFile(file)
                        .then(setAsset)
                        .catch((e) => setError(e.message))
                        .finally(() => setBusy(false));
                    }}
                  />
                </label>
                <small className="muted">
                  PNG, JPG или MP4 · до {Math.min(25, remote?.maxMb || 25)} МБ.
                  Видео проигрывается без звука по кругу. Для совместимости —
                  H.264.
                </small>
                {asset && (
                  <>
                    <div className="remote-preview">
                      {asset.mime.startsWith('image/') ? (
                        <img
                          src={'/api/assets?id=' + asset.id}
                          alt="Выбранный материал"
                        />
                      ) : (
                        <video
                          src={'/api/assets?id=' + asset.id}
                          controls
                          muted
                          playsInline
                        />
                      )}
                    </div>
                    <p>
                      {asset.name} · {asset.width} × {asset.height}
                    </p>
                  </>
                )}
                <div className="button-row">
                  <button
                    className="primary"
                    disabled={busy || !asset || !remote}
                    onClick={() => void command('show')}
                  >
                    Показать на экране
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || !remote?.assetId}
                    onClick={() => void command('clear')}
                  >
                    Очистить экран
                  </button>
                </div>
                <p className="muted">
                  Выбор файла ещё не меняет плеер. Команда отправляется только
                  кнопкой «Показать».
                </p>
              </section>
            </div>
            <section className="remote-panel remote-status" aria-live="polite">
              <p className="kicker">ОБРАТНАЯ СВЯЗЬ ОТ ПЛЕЕРА</p>
              <h2>{status}</h2>
              {remote && (
                <p>
                  Отправлена версия {remote.revision} · подтверждена{' '}
                  {remote.applied}
                  {remote.lastSeen
                    ? ' · последний отклик ' +
                      new Date(remote.lastSeen).toLocaleTimeString('ru-RU')
                    : ''}
                </p>
              )}
              {remote?.error && <p className="alert">{remote.error}</p>}
              <small className="muted">
                Плеер подтверждает загрузку изображения или запуск видео. Если
                он закрыт, последняя команда применится при подключении.
              </small>
            </section>
            <p className="remote-note">
              Прямое управление работает отдельно от общего расписания и не
              меняет размещения или их согласования. Файл скачивается при смене;
              повтор видео — с устройства. Если связь пропала более чем на
              минуту, показ останавливается до восстановления.
            </p>
          </>
        )}
        <ServiceInfo />
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
