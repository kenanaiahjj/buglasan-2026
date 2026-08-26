/**
 * Rewrites every raster asset in public/assets as WebP and re-encodes the
 * PNG originals that are still referenced by path (the official logo is
 * asserted by src in LandingPage.test.tsx, so its .png has to survive).
 *
 * Run with: npm run optimize:images
 */
import { readdir, stat, rename, unlink } from 'node:fs/promises';
import { join, extname, basename, dirname } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('../public/assets/', import.meta.url).pathname;

// Assets whose .png path is referenced by a test contract or by a
// <picture> fallback: keep the PNG, but re-encode it far smaller.
const KEEP_PNG = new Set(['buglasan-festival-2026-logo.png']);

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (/\.png$/i.test(entry.name)) out.push(p);
  }
  return out;
}

let before = 0;
let after = 0;

for (const file of await walk(ROOT)) {
  const src = await stat(file);
  before += src.size;

  const webp = join(dirname(file), `${basename(file, extname(file))}.webp`);
  await sharp(file).webp({ quality: 82, effort: 6 }).toFile(webp);
  const w = await stat(webp);
  after += w.size;
  console.log(`${basename(webp).padEnd(34)} ${kb(src.size).padStart(8)} → ${kb(w.size).padStart(8)}`);

  if (KEEP_PNG.has(basename(file))) {
    // Quantised PNG fallback for the one path a test pins.
    const tmp = `${file}.tmp`;
    await sharp(file).png({ compressionLevel: 9, palette: true, quality: 88 }).toFile(tmp);
    await rename(tmp, file);
    after += (await stat(file)).size;
  } else {
    await unlink(file);
  }
}

console.log(`\ntotal ${kb(before)} → ${kb(after)}`);
