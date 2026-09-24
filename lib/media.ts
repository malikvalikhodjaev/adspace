export function inspectMedia(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (at: number, n: number) =>
    String.fromCharCode(...bytes.slice(at, at + n));
  if (
    bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => bytes[i] === x)
  )
    return {
      mime: 'image/png',
      width: v.getUint32(16),
      height: v.getUint32(20),
      seconds: 0,
    };
  if (bytes.length < 16 || text(4, 4) !== 'ftyp')
    throw Error('Поддерживаются PNG и MP4');
  let width = 0,
    height = 0,
    seconds = 0;
  function walk(start: number, end: number, depth: number) {
    if (depth > 8) return;
    for (let p = start; p + 8 <= end;) {
      let size = v.getUint32(p);
      const type = text(p + 4, 4);
      if (size === 0) size = end - p;
      if (size < 8 || p + size > end) break;
      if (['moov', 'trak', 'mdia'].includes(type))
        walk(p + 8, p + size, depth + 1);
      if (type === 'mvhd') {
        const ver = bytes[p + 8],
          scaleAt = p + (ver === 1 ? 28 : 20),
          durAt = scaleAt + 4;
        if (durAt + (ver === 1 ? 8 : 4) <= p + size) {
          const scale = v.getUint32(scaleAt),
            duration =
              ver === 1 ? Number(v.getBigUint64(durAt)) : v.getUint32(durAt);
          if (scale) seconds = duration / scale;
        }
      }
      if (type === 'tkhd' && size >= 84) {
        const w = v.getUint32(p + size - 8) / 65536,
          h = v.getUint32(p + size - 4) / 65536;
        if (w && h) {
          width = w;
          height = h;
        }
      }
      p += size;
    }
  }
  walk(0, bytes.length, 0);
  if (!width || !height || !seconds)
    throw Error('Не удалось прочитать параметры MP4');
  return { mime: 'video/mp4', width, height, seconds };
}
