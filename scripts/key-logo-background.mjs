/**
 * Knock a flat background out of logo artwork and rebuild real alpha.
 *
 * Artwork arrives flattened onto a solid colour — black in the 2024 mark,
 * white in the 2026 one. Naively thresholding that away leaves either a hard
 * jagged cutout or a halo of the old background baked into every
 * anti-aliased edge, and once the texture is mipmapped that halo spreads.
 *
 * The fix is to treat the flatten as what it was: a composite. Every pixel is
 *
 *     C = F·a + M·(1-a)
 *
 * for foreground F, alpha a and matte M. One equation, two unknowns, so it
 * needs one assumption. The usable one for saturated artwork is that wherever
 * there is ink, at least one channel of F is at full strength — true of brush
 * lettering in vivid colour, false of pastels and near-greys. Under it the
 * matte-relative magnitude of a pixel gives a directly, and F falls out by
 * dividing back through.
 *
 * Four passes:
 *   1. Detect   Sample the border to find M, so black and white artwork take
 *               the same path.
 *   2. Alpha    a from the per-pixel distance from M, then a soft ramp so the
 *               interior goes fully opaque and only the true edge stays
 *               fractional. Without that ramp mid-tone ink ends up
 *               semi-transparent and the whole mark looks washed out.
 *   3. Unmatte  F = (C - M·(1-a)) / a, restoring the colour the matte diluted.
 *   4. Bleed    Push F outward into the transparent region, so bilinear
 *               filtering and mipmap generation never average the empty
 *               pixels back into the edge.
 *
 * Then trim to the ink bounds and report the aspect ratio, which is what the
 * scene needs to size the plane without stretching.
 *
 * Usage:
 *   node scripts/key-logo-background.mjs <input> <out-basename> [options]
 *
 * Options:
 *   --matte auto|black|white|#rrggbb   default auto
 *   --lo <0..1>    alpha ramp start, default 0.04
 *   --hi <0..1>    alpha ramp end,   default 0.32
 *   --no-trim      keep the original canvas
 */

import sharp from 'sharp';
import path from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const INPUT = positional[0];
const OUT = positional[1];
if (!INPUT || !OUT) {
  console.error('usage: node scripts/key-logo-background.mjs <input> <out-basename> [--matte auto|black|white|#rrggbb]');
  process.exit(1);
}
const LO = Number(flag('lo', 0.04));
const HI = Number(flag('hi', 0.32));
const TRIM = !has('no-trim');

/* ------------------------------------------------------------------ */

const src = sharp(INPUT).ensureAlpha();
const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

/** Median of the outermost ring — robust to a stray signature or watermark. */
function detectMatte() {
  const px = [];
  const edge = (x, y) => {
    const i = (y * width + x) * channels;
    px.push([data[i], data[i + 1], data[i + 2]]);
  };
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 256))) {
    edge(x, 0);
    edge(x, height - 1);
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 256))) {
    edge(0, y);
    edge(width - 1, y);
  }
  const med = (k) => {
    const v = px.map((p) => p[k]).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  return [med(0), med(1), med(2)];
}

const matteArg = String(flag('matte', 'auto')).toLowerCase();
let M;
if (matteArg === 'auto') M = detectMatte();
else if (matteArg === 'black') M = [0, 0, 0];
else if (matteArg === 'white') M = [255, 255, 255];
else {
  const h = matteArg.replace('#', '');
  M = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/* The largest possible distance from the matte along each channel — a pixel
   sitting that far away is certainly fully opaque ink. */
const span = [Math.max(M[0], 255 - M[0]), Math.max(M[1], 255 - M[1]), Math.max(M[2], 255 - M[2])];

const out = Buffer.alloc(width * height * 4);
const smoothstep = (lo, hi, x) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

for (let p = 0; p < width * height; p++) {
  const i = p * channels;
  const c = [data[i], data[i + 1], data[i + 2]];
  const srcA = channels === 4 ? data[i + 3] / 255 : 1;

  // How far this pixel sits from the matte, as a fraction of the maximum.
  let raw = 0;
  for (let k = 0; k < 3; k++) raw = Math.max(raw, Math.abs(c[k] - M[k]) / (span[k] || 1));

  // Ramp: solid through the interior, fractional only at the true edge.
  const a = smoothstep(LO, HI, raw) * srcA;
  const o = p * 4;
  if (a <= 0.0005) {
    out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
    continue;
  }
  // F = (C - M(1-a)) / a
  for (let k = 0; k < 3; k++) {
    const f = (c[k] - M[k] * (1 - a)) / a;
    out[o + k] = Math.max(0, Math.min(255, Math.round(f)));
  }
  out[o + 3] = Math.round(a * 255);
}

/* ---- bleed: fill transparent pixels with the nearest opaque colour ---- */
{
  const A = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) A[p] = out[p * 4 + 3] > 8 ? 1 : 0;
  for (let pass = 0; pass < 6; pass++) {
    const next = A.slice();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (A[p]) continue;
        let r = 0, g = 0, b = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const q = ny * width + nx;
            if (!A[q]) continue;
            r += out[q * 4]; g += out[q * 4 + 1]; b += out[q * 4 + 2]; cnt++;
          }
        }
        if (!cnt) continue;
        out[p * 4] = Math.round(r / cnt);
        out[p * 4 + 1] = Math.round(g / cnt);
        out[p * 4 + 2] = Math.round(b / cnt);
        next[p] = 1; // colour only; alpha stays 0
      }
    }
    A.set(next);
  }
}

/* ---- trim to the ink, write out ---- */
let img = sharp(out, { raw: { width, height, channels: 4 } });
let box = { left: 0, top: 0, width, height };
if (TRIM) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (out[(y * width + x) * 4 + 3] > 6) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX >= minX) {
    box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
    img = img.extract(box);
  }
}

const base = OUT.replace(/\.(png|webp)$/i, '');
await img.clone().png({ compressionLevel: 9 }).toFile(`${base}.png`);
await img.clone().webp({ quality: 92, alphaQuality: 100 }).toFile(`${base}.webp`);

const pct = ((box.width * box.height) / (width * height)) * 100;
console.log(`matte     rgb(${M.join(', ')})${matteArg === 'auto' ? ' (detected)' : ''}`);
console.log(`source    ${width}x${height}`);
console.log(`trimmed   ${box.width}x${box.height}  (${pct.toFixed(0)}% of canvas kept)`);
console.log(`aspect    ${(box.width / box.height).toFixed(4)}   // LOGO_ASPECT`);
console.log(`wrote     ${path.relative(process.cwd(), base)}.png / .webp`);
