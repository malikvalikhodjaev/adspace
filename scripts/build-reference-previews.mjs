import { readdir, mkdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../public/reference-screens/', import.meta.url));
const output = join(root, 'previews');
await mkdir(output, { recursive: true });

const photos = (await readdir(root)).filter((file) => /\.(jpe?g|png)$/i.test(file));
for (const photo of photos) {
  const target = join(output, `${basename(photo, extname(photo))}.webp`);
  await sharp(join(root, photo))
    .rotate()
    .resize(960, 540, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 90, effort: 6 })
    .toFile(target);
}

console.log(`Built ${photos.length} 960×540 catalogue previews; original photographs are unchanged.`);
