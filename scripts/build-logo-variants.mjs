/**
 * Make the logos affordable on a phone.
 *
 * Two separate problems, two separate fixes:
 *
 * 1. **The hero mark is 3198x1681.** It is the first thing a visitor decodes —
 *    `fetchPriority="high"` on the boot screen — and it renders a few hundred
 *    pixels wide. Decoded, it costs about 21 MB of RAM before anything else
 *    has loaded. So it gets narrower WebP variants and a `srcset`; the
 *    original stays as the last entry for browsers without WebP.
 *
 * 2. **The programme logos are heavy for their size** — 616 KB for a 483x512
 *    PNG. Those are referenced by exact filename all over the app, so they are
 *    re-encoded in place at the same pixel dimensions. Same URL, same layout,
 *    same picture, fewer bytes.
 *
 * `npm run art:logos`. Idempotent: re-encoding an already-encoded file
 * converges rather than degrading, because sharp reads the decoded pixels.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ASSETS = path.join(process.cwd(), 'public/assets');
const LOGOS = path.join(ASSETS, 'program-logos');

/* Widths the hero mark is actually drawn at: the boot screen and the scene
   fallback on a phone, a tablet, and a wide desktop. Nothing above 1440 —
   beyond that the WebGL model has taken over anyway. */
const HERO_WIDTHS = [640, 960, 1440];
const HERO_SOURCE = path.join(ASSETS, 'buglasan-hero-2026-official.png');

const kb = (bytes) => `${Math.round(bytes / 1024)}K`;

async function buildHeroVariants() {
  const before = statSync(HERO_SOURCE).size;
  const written = [];

  for (const width of HERO_WIDTHS) {
    const out = path.join(ASSETS, `buglasan-hero-2026-official-${width}.webp`);
    await sharp(HERO_SOURCE)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 86, effort: 6 })
      .toFile(out);
    written.push(`${path.basename(out)} (${kb(statSync(out).size)})`);
  }

  console.log(`hero mark: ${kb(before)} original -> ${written.join(', ')}`);
}

async function shrinkProgrammeLogos() {
  const files = readdirSync(LOGOS).filter((f) => /\.(png|webp)$/.test(f) && !f.includes('-source'));

  for (const file of files) {
    const full = path.join(LOGOS, file);
    const before = statSync(full).size;
    const input = readFileSync(full);
    const image = sharp(input);
    const { width, height, format } = await image.metadata();

    /* Same dimensions, better encoder settings. A palette PNG with a real
       quantisation pass is typically a third of a full-colour one at a size
       nobody can tell apart at 120px on a phone. */
    const encoded = format === 'webp'
      ? await sharp(input).webp({ quality: 88, effort: 6 }).toBuffer()
      : await sharp(input).png({ palette: true, quality: 90, effort: 9, compressionLevel: 9 }).toBuffer();

    if (encoded.length < before) {
      writeFileSync(full, encoded);
      console.log(`  ${file.padEnd(48)} ${width}x${height}  ${kb(before)} -> ${kb(encoded.length)}`);
    } else {
      console.log(`  ${file.padEnd(48)} ${width}x${height}  ${kb(before)} (already minimal)`);
    }
  }
}

await buildHeroVariants();
console.log('programme logos:');
await shrinkProgrammeLogos();
