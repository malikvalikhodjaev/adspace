'use client';
import { useEffect, useRef, useState } from 'react';
import type { Asset, Surface } from '@/lib/model';
import { request, uploadFile } from './controls';
export default function CreativeEditor({
  screen,
  onSaved,
  uz = false,
  durationLimit,
}: {
  screen: Surface;
  onSaved: (a: Asset) => void;
  uz?: boolean;
  durationLimit?: number;
}) {
  const t = (r: string, u: string) => (uz ? u : r);
  const limit = durationLimit || screen.seconds;
  const [source, setSource] = useState<Asset | null>(null),
    [mode, setMode] = useState('contain'),
    [zoom, setZoom] = useState(1),
    [x, setX] = useState(0.5),
    [y, setY] = useState(0.5),
    [trimStart, setTrimStart] = useState(0),
    [duration, setDuration] = useState(limit),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [recording, setRecording] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    camera = useRef<HTMLVideoElement>(null),
    recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => {
    setDuration(Math.min(source?.seconds || limit, limit));
  }, [limit, source?.seconds]);
  async function upload(f?: File) {
    if (!f) return;
    setBusy(true);
    setError('');
    try {
      const a = await uploadFile(f);
      setSource(a);
      setTrimStart(0);
      setDuration(Math.min(a.seconds || limit, limit));
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function record() {
    setError('');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (camera.current) {
        camera.current.srcObject = stream.current;
        await camera.current.play();
      }
      const type = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(
        (x) => MediaRecorder.isTypeSupported(x),
      );
      const r = new MediaRecorder(
        stream.current,
        type ? { mimeType: type } : {},
      );
      recorder.current = r;
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        setRecording(false);
        void upload(
          new File(
            chunks,
            'camera.' + (r.mimeType.includes('mp4') ? 'mp4' : 'webm'),
            { type: r.mimeType },
          ),
        );
      };
      r.start();
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === 'recording') r.stop();
      }, limit * 1000);
    } catch {
      setError(
        t(
          'Камера недоступна. Разрешите доступ или загрузите готовый файл.',
          'Kamera mavjud emas. Ruxsat bering yoki fayl yuklang.',
        ),
      );
      stream.current?.getTracks().forEach((t) => t.stop());
    }
  }
  async function render() {
    if (!source) return;
    setBusy(true);
    setError('');
    try {
      const a = await request('/api/render', {
        assetId: source.id,
        screenId: screen.id,
        mode,
        zoom,
        x,
        y,
        trimStart,
        duration,
      });
      onSaved(a);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const style = {
    width: '100%',
    height: '100%',
    objectFit: (mode === 'stretch' ? 'fill' : mode) as
      | 'fill'
      | 'cover'
      | 'contain',
    objectPosition: `${x * 100}% ${y * 100}%`,
    transform: mode === 'cover' ? `scale(${zoom})` : undefined,
    transformOrigin: `${x * 100}% ${y * 100}%`,
  };
  return (
    <section className="creative-editor">
      <h3>{t('Материал для экрана', 'Ekran uchun material')}</h3>
      <p>
        {screen.width} × {screen.height} px · {screen.fps} FPS · ≤{' '}
        {limit} {t('сек', 'soniya')} · ≤ {screen.maxMb} MB
      </p>
      <div className="button-row">
        <label className="file-button">
          {t('Загрузить фото или видео', 'Rasm yoki video yuklash')}
          <input
            type="file"
            accept="image/png,image/jpeg,video/mp4,video/webm"
            disabled={busy || recording}
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => (recording ? recorder.current?.stop() : void record())}
        >
          {recording
            ? t('Остановить запись', 'Yozishni to‘xtatish')
            : t('Снять видео', 'Video olish')}
        </button>
      </div>
      <video
        ref={camera}
        hidden={!recording}
        muted
        playsInline
        className="camera-preview"
      />
      {source && (
        <>
          <div
            className="editor-frame"
            style={{ aspectRatio: `${screen.width}/${screen.height}` }}
          >
            {source.mime.startsWith('video/') ? (
              <video
                ref={video}
                src={'/api/assets?id=' + source.id}
                controls
                muted
                playsInline
                style={style}
                onLoadedMetadata={() => {
                  if (video.current) video.current.currentTime = trimStart;
                }}
                onTimeUpdate={() => {
                  if (
                    video.current &&
                    video.current.currentTime >= trimStart + duration
                  )
                    video.current.currentTime = trimStart;
                }}
              />
            ) : (
              <img
                src={'/api/assets?id=' + source.id}
                alt={t('Предпросмотр материала', 'Material ko‘rinishi')}
                style={style}
              />
            )}
          </div>
          <div className="fit-options">
            {[
              ['cover', t('Заполнить с обрезкой', 'Kesib to‘ldirish')],
              ['contain', t('Целиком с полями', 'Chegaralar bilan')],
              ['stretch', t('Растянуть', 'Cho‘zish')],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                className={mode === id ? 'selected' : ''}
                onClick={() => {
                  setMode(id);
                  setZoom(1);
                  setX(0.5);
                  setY(0.5);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'cover' && (
            <div className="form-grid">
              {[
                ['Масштаб', 'Masshtab', zoom, setZoom, 1, 3],
                ['По горизонтали', 'Gorizontal', x, setX, 0, 1],
                ['По вертикали', 'Vertikal', y, setY, 0, 1],
              ].map(([ru, uzText, value, set, min, max]) => (
                <label key={String(ru)}>
                  {t(String(ru), String(uzText))}
                  <input
                    type="range"
                    min={Number(min)}
                    max={Number(max)}
                    step="0.01"
                    value={Number(value)}
                    onChange={(e) =>
                      (set as (n: number) => void)(Number(e.target.value))
                    }
                  />
                </label>
              ))}
            </div>
          )}
          {!!source.seconds && (
            <div className="form-grid">
              <label>
                {t('Начало фрагмента, сек', 'Boshlanish, soniya')}
                <input
                  type="number"
                  min="0"
                  max={Math.max(0, source.seconds - duration)}
                  step="0.1"
                  value={trimStart}
                  onChange={(e) => {
                    setTrimStart(Number(e.target.value));
                    if (video.current)
                      video.current.currentTime = Number(e.target.value);
                  }}
                />
              </label>
              <label>
                {t('Длительность, сек', 'Davomiylik, soniya')}
                <input
                  type="number"
                  min="0.1"
                  max={Math.min(limit, source.seconds - trimStart)}
                  step="0.1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </label>
            </div>
          )}
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void render()}
          >
            {busy
              ? t('Подготавливаем файл…', 'Fayl tayyorlanmoqda…')
              : t('Сохранить готовый материал', 'Tayyor materialni saqlash')}
          </button>
        </>
      )}
      {busy && !source && (
        <p role="status">
          {t('Загружаем и проверяем файл…', 'Fayl tekshirilmoqda…')}
        </p>
      )}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
