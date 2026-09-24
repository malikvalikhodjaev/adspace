'use client';
import { useEffect, useRef, useState } from 'react';
import Brand from '../../brand';
type Media = { id: string; mime: string; name: string; url: string };
type Manifest = {
  revision: number;
  expires: number;
  serverTime: number;
  asset: Media | null;
};
type Frame = { revision: number; asset: Media | null; src: string };
export default function RemotePlayer({ screenId }: { screenId: string }) {
  const [frame, setFrame] = useState<Frame | null>(null),
    [status, setStatus] = useState('Подключение к пульту…'),
    [full, setFull] = useState(false),
    [valid, setValid] = useState(false);
  const token = useRef(''),
    desired = useRef<Manifest | null>(null),
    applied = useRef(-1),
    started = useRef(-1),
    lease = useRef(0),
    offset = useRef(0),
    frameRef = useRef<Frame | null>(null);
  frameRef.current = frame;
  async function ack(
    revision: number,
    asset: string | null,
    phase: string,
    error = '',
  ) {
    try {
      await fetch('/api/remote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token.current,
        },
        body: JSON.stringify({
          action: 'ack',
          screen: screenId,
          revision,
          asset,
          phase,
          error,
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {}
  }
  function displayed() {
    if (
      !frame ||
      desired.current?.revision !== frame.revision ||
      started.current === frame.revision
    )
      return;
    started.current = frame.revision;
    setStatus(
      frame.asset ? 'На экране · версия ' + frame.revision : 'Экран очищен',
    );
    void ack(frame.revision, frame.asset?.id || null, 'displayed');
  }
  useEffect(() => {
    const sessionKey = 'adspace-remote-' + screenId;
    desired.current = null;
    applied.current = -1;
    started.current = -1;
    lease.current = 0;
    setFrame(null);
    setValid(false);
    token.current =
      location.hash.slice(1) || sessionStorage.getItem(sessionKey) || '';
    if (location.hash) {
      sessionStorage.setItem(sessionKey, token.current);
      history.replaceState(null, '', location.pathname);
    }
    let cancelled = false,
      polling = false,
      loading = -1,
      retryAt = 0,
      download: AbortController | undefined;
    async function prepare(m: Manifest) {
      download?.abort();
      const controller = new AbortController();
      download = controller;
      loading = m.revision;
      void ack(m.revision, m.asset?.id || null, 'received');
      setStatus(m.asset ? 'Загружаю новый файл…' : 'Очищаю экран…');
      let src = '';
      try {
        if (m.asset) {
          let cache: Cache | undefined;
          try {
            cache = await caches.open(
              'adspace-remote-' + screenId + '-' + token.current.slice(0, 12),
            );
          } catch {}
          let response = await cache?.match(m.asset.url);
          if (!response) {
            response = await fetch(m.asset.url, {
              headers: { Authorization: 'Bearer ' + token.current },
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(45000),
              ]),
            });
            if (!response.ok)
              throw Error(
                'Файл не загрузился. Повторная попытка автоматически.',
              );
            if (cache)
              await cache.put(m.asset.url, response.clone()).catch(() => {});
          }
          src = URL.createObjectURL(await response.blob());
          // Keep the previous frame until the replacement is decoded and ready.
          await new Promise<void>((resolve, reject) => {
            const media = m.asset!.mime.startsWith('video/')
              ? document.createElement('video')
              : new Image();
            const timer = setTimeout(
              () =>
                finish(
                  Error(
                    'Файл не декодируется. Для видео используйте MP4/H.264.',
                  ),
                ),
              20000,
            );
            const abort = () => finish(Error('Загрузка отменена'));
            let done = false;
            function finish(error?: Error) {
              if (done) return;
              done = true;
              clearTimeout(timer);
              controller.signal.removeEventListener('abort', abort);
              media.onload = null;
              media.onerror = null;
              if (media instanceof HTMLVideoElement) {
                media.onloadeddata = null;
                media.removeAttribute('src');
                media.load();
              }
              error ? reject(error) : resolve();
            }
            controller.signal.addEventListener('abort', abort, { once: true });
            media.onerror = () =>
              finish(
                Error(
                  'Браузер не поддерживает этот файл. Для видео используйте MP4/H.264.',
                ),
              );
            if (media instanceof HTMLVideoElement) {
              media.muted = true;
              media.preload = 'auto';
              media.onloadeddata = () => finish();
            } else media.onload = () => finish();
            media.src = src;
            if (controller.signal.aborted) abort();
          });
          if (cache) {
            const keys = await cache.keys();
            for (const key of keys)
              if (
                !key.url.endsWith(m.asset.url) &&
                !key.url.endsWith(frameRef.current?.asset?.url || '__none__')
              )
                await cache.delete(key);
          }
        }
        if (
          cancelled ||
          controller.signal.aborted ||
          desired.current?.revision !== m.revision
        ) {
          if (src) URL.revokeObjectURL(src);
          return;
        }
        applied.current = m.revision;
        started.current = -1;
        setFrame({ revision: m.revision, asset: m.asset, src });
      } catch (e) {
        if (src) URL.revokeObjectURL(src);
        if (
          !cancelled &&
          !controller.signal.aborted &&
          desired.current?.revision === m.revision
        ) {
          const message = (e as Error).message;
          setStatus(message);
          retryAt = Date.now() + 5000;
          void ack(m.revision, m.asset?.id || null, 'error', message);
        }
      } finally {
        if (loading === m.revision) loading = -1;
      }
    }
    async function sync() {
      if (polling || cancelled) return;
      polling = true;
      try {
        const r = await fetch('/api/remote?device=1&screen=' + screenId, {
          headers: { Authorization: 'Bearer ' + token.current },
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
        if (cancelled) return;
        if (!r.ok) {
          if (r.status === 401) {
            lease.current = 0;
            download?.abort();
            applied.current = -1;
            setFrame(null);
            setValid(false);
          }
          throw Error(
            r.status === 401
              ? 'Ссылка отозвана. Получите новую в LED-пульте.'
              : 'Нет связи с пультом. Переподключаюсь…',
          );
        }
        const m = (await r.json()) as Manifest;
        if (cancelled) return;
        offset.current = m.serverTime - Date.now();
        lease.current = m.expires;
        setValid(true);
        const changed = desired.current?.revision !== m.revision;
        desired.current = m;
        if (changed) retryAt = 0;
        if (
          applied.current !== m.revision &&
          loading !== m.revision &&
          Date.now() >= retryAt
        )
          void prepare(m);
        else if (applied.current === m.revision) {
          setStatus(
            m.asset
              ? 'На экране · версия ' + m.revision
              : 'Ожидание команды из пульта',
          );
          // Retry confirmation if its first HTTP request was lost.
          if (started.current === m.revision)
            void ack(m.revision, m.asset?.id || null, 'displayed');
        }
      } catch (e) {
        if (!cancelled) setStatus((e as Error).message);
      } finally {
        polling = false;
      }
    }
    void sync();
    const poll = setInterval(() => void sync(), 2000),
      clock = setInterval(() => {
        if (lease.current && Date.now() + offset.current >= lease.current) {
          download?.abort();
          applied.current = -1;
          lease.current = 0;
          setFrame(null);
          setValid(false);
          setStatus('Связь потеряна. Ожидание команды с сервера.');
        }
      }, 1000);
    const focus = () => void sync();
    window.addEventListener('online', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      cancelled = true;
      download?.abort();
      clearInterval(poll);
      clearInterval(clock);
      window.removeEventListener('online', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [screenId]);
  useEffect(
    () => () => {
      if (frame?.src) URL.revokeObjectURL(frame.src);
    },
    [frame],
  );
  useEffect(() => {
    if (frame && !frame.asset) displayed();
  }, [frame]);
  useEffect(() => {
    const fn = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);
  function mediaError() {
    if (!frame) return;
    applied.current = -1;
    started.current = -1;
    setStatus('Ошибка воспроизведения. Выберите другой файл в пульте.');
    void ack(
      frame.revision,
      frame.asset?.id || null,
      'error',
      'Браузер не смог воспроизвести файл',
    );
  }
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--player-background)',
        color: 'var(--player-foreground)',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'Arial',
        overflow: 'hidden',
      }}
    >
      {valid && frame?.asset ? (
        frame.asset.mime.startsWith('video/') ? (
          <video
            key={frame.revision}
            src={frame.src}
            autoPlay
            loop
            muted
            playsInline
            onPlaying={displayed}
            onError={mediaError}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <img
            key={frame.revision}
            src={frame.src}
            alt="Удалённо управляемый материал"
            onLoad={displayed}
            onError={mediaError}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )
      ) : (
        <section style={{ textAlign: 'center', padding: 30 }}>
          <h1 style={{ fontSize: 34, marginBottom: 12 }}>
            <Brand />
          </h1>
          <p role="status">{status}</p>
          <p style={{ opacity: 0.6, marginTop: 14 }}>
            Пульт меняет содержимое этого экрана удалённо.
          </p>
        </section>
      )}
      <aside
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 15,
          alignItems: 'center',
          padding: full ? '5px 10px' : '14px 20px',
          borderRadius: 9,
          background: 'var(--player-footer)',
          fontSize: full ? 11 : 14,
        }}
      >
        <div>
          <strong>LED-плеер</strong>
          {!full && <p>{status} · обновление без перезагрузки</p>}
        </div>
        {!full && (
          <button
            onClick={() =>
              void document.documentElement
                .requestFullscreen()
                .catch(() => setStatus('Полный экран недоступен'))
            }
            style={{
              border: 0,
              borderRadius: 6,
              background: 'var(--brand-soft)',
              color: '#51252a',
              padding: '12px 16px',
              cursor: 'pointer',
            }}
          >
            Полный экран
          </button>
        )}
      </aside>
    </main>
  );
}
