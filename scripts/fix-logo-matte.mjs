/**
 * Removes the white matte from the official wordmark.
 *
 * The supplied artwork was cut out of a white background, so every
 * semi-transparent edge pixel still carries near-white RGB (measured mean:
 * 224,226,225). Composited over the dark stage that reads as a jagged white
 * halo around the letterforms. Three passes fix it:
 *
 *   1. Un-matte     C = F·a + W·(1-a)  ⇒  F = (C - W·(1-a)) / a, with W white.
 *   2. Erode        The white is not only in the semi-transparent pixels: mean
 *                   luminance of *opaque* pixels measured 219 one pixel in from
 *                   the edge, 186 at two, 137 at three, settling near 112 from
 *                   four inward. That is a white glow baked into the supplied
 *                   artwork, which no un-matting can recover. So the mask is
 *                   rebuilt from a distance field and pulled in past the ring —
 *                   about three pixels on a 972px-wide mark, well under a
 *                   half-percent of the letterform.
 *   3. Bleed        Push RGB outward into the transparent region so mipmap
 *                   generation and bilinear filtering never average the
 *                   background into the edge — this is what keeps the mark
 *                   clean once it shrinks into the header.
 *
 * Run with: npm run fix:logo
 */
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const SOURCE = new URL('../public/assets/buglasan-logo-transparent.webp', import.meta.url).pathname;

/** Matte colour the artwork was cut out of. */
const MATTE = [255, 255, 255];

/** Source alpha above this counts as inside the mark. */
const MASK_THRESHOLD = 0.5;

/** Pixels to pull the mask in by, to clear the baked-in white glow. */
const ERODE = 3.1;

/** Width of the rebuilt anti-aliased edge, in pixels. */
const FEATHER = 1.5;

/** How far to push colour into the transparent region, in pixels. */
const BLEED = 14;

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const smoothstep = (lo, hi, x) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

const { data, info } = await sharp(await readFile(SOURCE))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const px = width * height;

/* ---- 1. rebuild the mask from a distance field ----------------------- */
const alpha = new Float32Array(px);
for (let i = 0; i < px; i++) alpha[i] = data[i * 4 + 3] / 255;

// Chamfer 3-4 distance transform: distance, in pixels, from each interior
// point to the nearest point outside the mark. Two sweeps, forward and back.
const FAR = 1e9;
const inside = new Float32Array(px);
for (let i = 0; i < px; i++) inside[i] = alpha[i] >= MASK_THRESHOLD ? FAR : 0;

const D1 = 1;
const D2 = Math.SQRT2;
const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : inside[y * width + x]);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (inside[i] === 0) continue;
    inside[i] = Math.min(
      inside[i],
      at(x - 1, y) + D1,
      at(x, y - 1) + D1,
      at(x - 1, y - 1) + D2,
      at(x + 1, y - 1) + D2,
    );
  }
}
for (let y = height - 1; y >= 0; y--) {
  for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x;
    if (inside[i] === 0) continue;
    inside[i] = Math.min(
      inside[i],
      at(x + 1, y) + D1,
      at(x, y + 1) + D1,
      at(x + 1, y + 1) + D2,
      at(x - 1, y + 1) + D2,
    );
  }
}

const outAlpha = new Float32Array(px);
for (let i = 0; i < px; i++) {
  outAlpha[i] = smoothstep(ERODE - FEATHER / 2, ERODE + FEATHER / 2, inside[i]);
}

/* ---- 2. un-matte the colour ----------------------------------------- */
const rgb = new Uint8ClampedArray(px * 3);
for (let i = 0; i < px; i++) {
  const a = alpha[i];
  for (let c = 0; c < 3; c++) {
    const composited = data[i * 4 + c];
    // Below this the division amplifies noise into garbage; those pixels are
    // transparent anyway and get their colour from the bleed pass.
    rgb[i * 3 + c] = a > 0.12 ? clamp255((composited - MATTE[c] * (1 - a)) / a) : composited;
  }
}

/* ---- 3. bleed colour outward ---------------------------------------- */
const solid = new Uint8Array(px);
for (let i = 0; i < px; i++) solid[i] = outAlpha[i] > 0.02 ? 1 : 0;

const next = new Uint8Array(solid);
for (let step = 0; step < BLEED; step++) {
  let grew = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (solid[i]) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          const j = yy * width + xx;
          if (!solid[j]) continue;
          r += rgb[j * 3];
          g += rgb[j * 3 + 1];
          b += rgb[j * 3 + 2];
          n++;
        }
      }
      if (!n) continue;
      rgb[i * 3] = r / n;
      rgb[i * 3 + 1] = g / n;
      rgb[i * 3 + 2] = b / n;
      next[i] = 1;
      grew++;
    }
  }
  solid.set(next);
  if (!grew) break;
}

/* ---- write ----------------------------------------------------------- */
const out = Buffer.alloc(px * 4);
for (let i = 0; i < px; i++) {
  out[i * 4] = rgb[i * 3];
  out[i * 4 + 1] = rgb[i * 3 + 1];
  out[i * 4 + 2] = rgb[i * 3 + 2];
  out[i * 4 + 3] = Math.round(outAlpha[i] * 255);
}

// Near-lossless with an untouched alpha channel: lossy ringing around a hard
// alpha edge would reintroduce exactly the fringe we just removed, but full
// lossless costs ~5x the bytes for artwork this flat.
const encoded = await sharp(out, { raw: { width, height, channels: 4 } })
  .webp({ quality: 92, alphaQuality: 100, smartSubsample: false, effort: 6 })
  .toBuffer();

await writeFile(SOURCE, encoded);

let edge = 0;
let sum = 0;
for (let i = 0; i < px; i++) {
  const a = out[i * 4 + 3];
  if (a > 8 && a < 200) {
    edge++;
    sum += (out[i * 4] + out[i * 4 + 1] + out[i * 4 + 2]) / 3;
  }
}
console.log(`edge pixels: ${edge}  mean luminance: ${edge ? (sum / edge).toFixed(0) : 'n/a'} (was 225)`);
console.log(`wrote ${(encoded.length / 1024).toFixed(0)} kB`);
