'use client';
import { useEffect, useRef, useState } from 'react';
import Brand from '../../brand';
import TashkentClock from '../../tashkent-clock';
import useLanguage from '../../use-language';
type Item = {
  campaign: string;
  asset: string;
  mime: string;
  seconds: number;
  perPlay?: boolean;
  url: string;
};
type Manifest = {
  screen: string;
  expires: number;
  serverTime: string;
  items: Item[];
};
export default function Player({ screenId }: { screenId: string }) {
  const { uz } = useLanguage();
  const [manifest, setManifest] = useState<Manifest | null>(null),
    [index, setIndex] = useState(0),
    [src, setSrc] = useState(''),
    [status, setStatus] = useState('Подключение…'),
    [now, setNow] = useState(Date.now()),
    [fullscreen, setFullscreen] = useState(false),
    [clockReady, setClockReady] = useState(false);
  const token = useRef(''),
    offset = useRef(0),
    started = useRef(false),
    exhausted = useRef(new Set<string>()),
    video = useRef<HTMLVideoElement>(null),
    generation = useRef(0);
  const item =
    manifest && manifest.expires > now + offset.current
      ? manifest.items[index % Math.max(1, manifest.items.length)]
      : undefined;
  useEffect(() => {
    setClockReady(true);
    token.current =
      location.hash.slice(1) ||
      sessionStorage.getItem('adspace-player-' + screenId) ||
      '';
    if (location.hash) {
      sessionStorage.setItem('adspace-player-' + screenId, token.current);
      history.replaceState(null, '', location.pathname);
    }
    let cancelled = false;
    const key = 'adspace-manifest-' + screenId;
    const old = sessionStorage.getItem(key);
    if (old) {
      try {
        const cached = JSON.parse(old) as Manifest;
        if (!cached.items.some((entry) => entry.perPlay)) setManifest(cached);
      } catch {}
    }
    async function sync() {
      try {
        const r = await fetch('/api/player?screen=' + screenId, {
          headers: { Authorization: 'Bearer ' + token.current },
        });
        if (!r.ok) {
          if (r.status === 401) {
            sessionStorage.removeItem(key);
            setManifest(null);
          }
          throw Error(
            r.status === 401
              ? 'Получите ссылку плеера в кабинете оператора'
              : 'Нет связи с сервером',
          );
        }
        const m = (await r.json()) as Manifest;
        if (cancelled) return;
        offset.current = Date.parse(m.serverTime) - Date.now();
        setManifest(m);
        sessionStorage.setItem(key, JSON.stringify(m));
        setStatus(
          m.items.length ? 'Воспроизведение' : 'Нет активных размещений',
        );
      } catch (e) {
        if (!cancelled) setStatus((e as Error).message);
      }
    }
    void sync();
    const poll = setInterval(() => void sync(), 10000),
      clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [screenId]);
  useEffect(() => {
    const gen = ++generation.current;
    started.current = false;
    setSrc('');
    if (!item) return;
    let object = '';
    const current = item;
    void (async () => {
      try {
        const cache = await caches.open(
          'adspace-player-' + screenId + '-' + token.current.slice(0, 12),
        );
        let r = await cache.match(current.url);
        if (!r) {
          r = await fetch(current.url, {
            headers: { Authorization: 'Bearer ' + token.current },
          });
          if (!r.ok) throw Error('Не удалось загрузить креатив');
          await cache.put(current.url, r.clone());
        }
        object = URL.createObjectURL(await r.blob());
        if (gen === generation.current) setSrc(object);
        else URL.revokeObjectURL(object);
      } catch (e) {
        if (gen === generation.current) setStatus((e as Error).message);
      }
    })();
    return () => {
      generation.current++;
      if (object) URL.revokeObjectURL(object);
    };
  }, [item?.asset, item?.campaign, index, screenId]);
  useEffect(() => {
    if (!src || !item) return;
    const timer = setTimeout(
      () => advance(item.campaign),
      Math.max(1, item.seconds) * 1000,
    );
    return () => clearTimeout(timer);
  }, [src, index, item?.seconds]);
  function advance(campaign: string) {
    if (exhausted.current.has(campaign)) {
      exhausted.current.delete(campaign);
      setManifest((current) => current
        ? { ...current, items: current.items.filter((entry) => entry.campaign !== campaign) }
        : current);
      setIndex(0);
    } else setIndex((i) => i + 1);
  }
  function played() {
    if (started.current || !item) return;
    started.current = true;
    if (item.perPlay) exhausted.current.add(item.campaign);
    void fetch('/api/player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token.current,
      },
      body: JSON.stringify({
        action: 'played',
        screen: screenId,
        campaign: item.campaign,
        asset: item.asset,
        eventId: crypto.randomUUID(),
        seconds: item.seconds,
      }),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json() as { remaining: number | null };
        if (result.remaining === 0) exhausted.current.add(item.campaign);
      })
      .catch(() => {});
  }
  async function full() {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
    } catch {
      setStatus('Полноэкранный режим недоступен в этом браузере');
    }
  }
  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        color: 'var(--player-foreground)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
        fontFamily: 'Arial',
      }}
    >
      {item && src ? (
        item.mime.startsWith('video/') ? (
          <video
            key={item.asset + ':' + index}
            ref={video}
            src={src}
            autoPlay
            muted
            playsInline
            onPlaying={played}
            onEnded={() => advance(item.campaign)}
            onError={() => setStatus('Ошибка воспроизведения')}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <img
            key={item.asset + ':' + index}
            src={src}
            onLoad={played}
            alt="Рекламный материал"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )
      ) : (
        <div style={{ textAlign: 'center', padding: 30 }}>
          <p style={{ marginBottom: 15 }}><Brand /></p>
          <p>
            {manifest && manifest.expires <= now + offset.current
              ? 'Связь потеряна. Ожидание актуального расписания.'
              : status}
          </p>
        </div>
      )}
      {!fullscreen && (
        <aside
          style={{
            position: 'absolute',
            bottom: 18,
            left: 18,
            right: 18,
            background: 'var(--player-footer)',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 15,
            fontSize: 14,
            borderRadius: 8,
          }}
        >
          <div>
            {manifest?.screen || 'LED Player'} · {status}
            <small style={{ display: 'block', color: 'var(--player-muted)' }}>
              Выход из полного экрана — Esc
            </small>
          </div>
          <TashkentClock
            instantMs={clockReady ? now + offset.current : 0}
            uz={uz}
            className="tashkent-clock--player"
          />
          <button
            onClick={() => void full()}
            style={{
              background: 'var(--brand-soft)',
              color: '#51252a',
              padding: '10px 15px',
              border: 0,
              borderRadius: 5,
            }}
          >
            Полный экран
          </button>
        </aside>
      )}
    </main>
  );
}
