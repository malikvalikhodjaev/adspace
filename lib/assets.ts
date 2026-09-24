import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { dataDir, database, state } from './store';
import { digest } from './auth';
import { sees, owns, staff } from './workflow';
import type { Asset, User } from './model';
const exec = promisify(execFile);
export function assetPath(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw Error('Неверный файл');
  return join(dataDir, 'media', id);
}
export function assetById(id: string) {
  return database().prepare('SELECT * FROM assets WHERE id=?').get(id) as
    | Asset
    | undefined;
}
export function mayRead(a: Asset, u?: User) {
  const s = state();
  return (
    s.surfaces.some((x) => x.photoId === a.id && x.status === 'published') ||
    (!!u &&
      (a.owner === u.id ||
        staff(u) ||
        s.campaigns.some((c) => c.assetId === a.id && sees(u, c, s)) ||
        s.surfaces.some((x) => x.photoId === a.id && owns(u, x))))
  );
}
export async function inspect(path: string) {
  const { stdout } = await exec(
    process.env.FFPROBE_PATH || 'ffprobe',
    [
      '-v',
      'error',
      '-protocol_whitelist',
      'file,pipe',
      '-show_streams',
      '-show_format',
      '-of',
      'json',
      path,
    ],
    { timeout: 20000, maxBuffer: 1048576, windowsHide: true },
  );
  const p = JSON.parse(stdout);
  const v = p.streams?.find((x: any) => x.codec_type === 'video');
  if (!v || v.width < 1 || v.height < 1 || v.width > 8192 || v.height > 8192)
    throw Error('Не удалось прочитать изображение или видео');
  const image = ['png', 'mjpeg'].includes(v.codec_name);
  const mime =
    v.codec_name === 'png'
      ? 'image/png'
      : v.codec_name === 'mjpeg'
        ? 'image/jpeg'
        : p.format.format_name.includes('webm')
          ? 'video/webm'
          : 'video/mp4';
  if (!image && !['h264', 'vp8', 'vp9', 'hevc', 'av1'].includes(v.codec_name))
    throw Error('Неподдерживаемый видеокодек');
  const seconds = image ? 0 : Number(p.format.duration || v.duration);
  const [num, den] = String(v.avg_frame_rate || '0/1')
    .split('/')
    .map(Number);
  const fps = image ? 0 : num / (den || 1);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 300)
    throw Error('Исходное видео должно быть не длиннее 5 минут');
  return {
    mime,
    width: v.width as number,
    height: v.height as number,
    seconds,
    fps,
  };
}
export async function saveAsset(owner: string, name: string, bytes: Buffer) {
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const mp4 = bytes.toString('ascii', 4, 8) === 'ftyp';
  const webm = bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
  if (!png && !jpg && !mp4 && !webm)
    throw Error('Поддерживаются PNG, JPG, MP4 и WebM');
  const id = randomUUID(),
    path = assetPath(id);
  await mkdir(join(dataDir, 'media'), { recursive: true, mode: 0o700 });
  await writeFile(path, bytes, { mode: 0o600 });
  try {
    const m = await inspect(path);
    const hash = digest(bytes);
    const asset: Asset = {
      id,
      owner,
      name: name.slice(0, 150),
      ...m,
      size: bytes.length,
      hash,
    };
    database()
      .prepare('INSERT INTO assets VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(
        id,
        owner,
        asset.name,
        m.mime,
        m.width,
        m.height,
        m.seconds,
        bytes.length,
        hash,
        m.fps,
      );
    return asset;
  } catch (e) {
    await unlink(path);
    throw e;
  }
}
let processing = 0;
export async function renderAsset(u: User, input: Record<string, any>) {
  if (processing >= 2)
    throw Error('Обработка занята. Попробуйте через минуту.');
  const source = assetById(String(input.assetId));
  if (!source || source.owner !== u.id) throw Error('Файл не найден');
  const screen = state().surfaces.find((x) => x.id === input.screenId);
  if (!screen || screen.status !== 'published') throw Error('Экран недоступен');
  const mode = input.mode;
  if (!['cover', 'contain', 'stretch'].includes(mode))
    throw Error('Выберите способ подгонки');
  const values = [
    input.zoom,
    input.x,
    input.y,
    input.trimStart,
    input.duration,
  ];
  if (values.some((x) => typeof x !== 'number' || !Number.isFinite(x)))
    throw Error('Проверьте настройки');
  const { zoom, x, y, trimStart, duration } = input;
  if (
    zoom < 1 ||
    zoom > 3 ||
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1 ||
    trimStart < 0 ||
    duration <= 0 ||
    duration > screen.seconds ||
    (source.seconds && trimStart + duration > source.seconds + 0.05)
  )
    throw Error('Проверьте границы кадра и длительность');
  const width = screen.width,
    height = screen.height;
  const filter =
    mode === 'stretch'
      ? `scale=${width}:${height}`
      : mode === 'contain'
        ? `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`
        : `scale=${Math.ceil((width * zoom) / 2) * 2}:${Math.ceil((height * zoom) / 2) * 2}:force_original_aspect_ratio=increase,crop=${width}:${height}:(iw-ow)*${x}:(ih-oh)*${y}`;
  const video = source.seconds > 0;
  const out = join(dataDir, 'media', randomUUID() + (video ? '.mp4' : '.png'));
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-protocol_whitelist',
    'file,pipe',
    '-threads',
    '2',
    '-filter_threads',
    '1',
  ];
  if (video) args.push('-ss', String(trimStart));
  args.push('-i', assetPath(source.id), '-vf', filter + ',setsar=1');
  if (video)
    args.push(
      '-t',
      String(duration),
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(screen.fps),
      '-movflags',
      '+faststart',
      '-threads',
      '2',
    );
  else args.push('-frames:v', '1', '-c:v', 'png');
  args.push('-y', out);
  processing++;
  try {
    await exec(process.env.FFMPEG_PATH || 'ffmpeg', args, {
      timeout: 180000,
      maxBuffer: 1048576,
      windowsHide: true,
    });
    const bytes = await readFile(out);
    if (bytes.length > screen.maxMb * 1048576)
      throw Error('Готовый файл превышает лимит экрана');
    return await saveAsset(
      u.id,
      source.name.replace(/\.[^.]+$/, '') +
        '-' +
        width +
        'x' +
        height +
        (video ? '.mp4' : '.png'),
      bytes,
    );
  } finally {
    processing--;
    await unlink(out).catch(() => {});
  }
}
