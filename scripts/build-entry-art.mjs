/**
 * Placeholder art for entries that have no photograph yet.
 *
 * The booths and the festival contingents were pointing at candidate
 * headshots, so a municipal pavilion was represented by a portrait of a woman
 * and so was a dance troupe. That is worse than an obvious placeholder: it
 * reads as real data and quietly misinforms.
 *
 * These are deliberately illustrations, in the same line-art language as the
 * skyline, so nobody mistakes them for photography. Each is seeded from its
 * index, so a booth looks like itself between builds but no two are alike.
 *
 * Composition rule: every piece has to survive a 46px circular crop, because
 * the overview ranking uses one. That means a single bold central silhouette
 * and detail kept away from the corners.
 *
 * Run: npm run art:entries
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public/assets/entries');
/* A wide frame, because the subjects are wide.
   A pavilion is a building and a contingent is a line of dancers; the tall
   canvas this started on cropped the eaves off one and the ends off the
   other. 4:3 matches `.hara-gallery--landscape .hara-gallery-card__media`. */
const W = 1000;
const H = 750;

/* Deterministic PRNG — the art must not churn between builds. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v) => Math.round(v * 10) / 10;
const lerp = (a, b, t) => a + (b - a) * t;
const p = (d, extra = '') => `<path d="${d}"${extra} />`;
const seg = (x1, y1, x2, y2) => `M${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}`;

function g(attrs, children) {
  const a = Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `  <g ${a}>\n${children.filter(Boolean).map((c) => `    ${c}`).join('\n')}\n  </g>`;
}

/* Each entry gets one hue off the festival palette, spread so neighbours in a
   grid never repeat. */
const PALETTES = [
  { key: ['#fde68a', '#f59e0b', '#b45309'], glow: '#f7d377' },
  { key: ['#bbf7d0', '#4ade80', '#15803d'], glow: '#4ade80' },
  { key: ['#bfdbfe', '#60a5fa', '#1d4ed8'], glow: '#60a5fa' },
  { key: ['#fbcfe8', '#f472b6', '#be185d'], glow: '#f472b6' },
  { key: ['#ddd6fe', '#a78bfa', '#6d28d9'], glow: '#a78bfa' },
  { key: ['#fed7aa', '#fb923c', '#c2410c'], glow: '#fb923c' },
];

function doc({ body, pal, note, shift = 0 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
     fill="none" stroke-linejoin="round" stroke-linecap="round">
  <!-- ${note} — generated placeholder, not photography -->
  <defs>
    <linearGradient id="k" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}">
      <stop offset="0%" stop-color="${pal.key[0]}" />
      <stop offset="52%" stop-color="${pal.key[1]}" />
      <stop offset="100%" stop-color="${pal.key[2]}" />
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="46%" r="52%">
      <stop offset="0%" stop-color="${pal.glow}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${pal.glow}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#071409" />
  <rect width="${W}" height="${H}" fill="url(#halo)" />
  <!-- The subject sits on its own baseline; the shift lifts it into the
       middle of the shorter canvas without touching the composition's own
       numbers. Backticks are forbidden here: this is inside a template. -->
  <g transform="translate(0 ${shift})">
${body}
  </g>
</svg>
`;
}

/* ------------------------------------------------------------------ *
 * Booth — a municipal pavilion
 * ------------------------------------------------------------------ */
function pavilion(index) {
  const rand = mulberry32(1000 + index * 7);
  const pal = PALETTES[index % PALETTES.length];
  const cx = W / 2;
  const ground = 700;
  const tiers = rand() > 0.5 ? 3 : 2;
  const baseHalf = lerp(252, 296, rand());
  const postCount = 4 + Math.floor(rand() * 2);

  const roofs = [];
  const ridges = [];
  let half = baseHalf;
  let y = 430;
  for (let t = 0; t < tiers; t++) {
    /* Pitch as a fraction of the span, not a fixed rise: a wider eave with
       the old rise flattens into a lid. */
    const apex = y - half * lerp(0.4, 0.47, rand());
    roofs.push(p(`M${n(cx - half)} ${n(y)} L${n(cx)} ${n(apex)} L${n(cx + half)} ${n(y)}`));
    // Eave line, oversailing the roof below it.
    ridges.push(p(seg(cx - half - 14, y, cx + half + 14, y)));
    // Thatch: courses running with the pitch, lit side only.
    const courses = [];
    for (let i = 1; i < 6; i++) {
      const f = i / 6;
      courses.push(seg(cx - half * (1 - f) - 4, lerp(y, apex, f), cx - 6, lerp(y, apex, f)));
    }
    roofs.push(p(courses.join(' '), ' stroke-opacity=".34" stroke-width="1.1"'));
    half *= lerp(0.6, 0.7, rand());
    y = apex + lerp(14, 22, rand());
  }

  const finialY = y - 26;
  const posts = [];
  for (let i = 0; i < postCount; i++) {
    const x = lerp(cx - baseHalf + 34, cx + baseHalf - 34, i / (postCount - 1));
    posts.push(seg(x, 438, x, ground));
    // Bamboo nodes.
    for (let k = 1; k < 4; k++) posts.push(seg(x - 7, lerp(438, ground, k / 4), x + 7, lerp(438, ground, k / 4)));
  }

  const lanterns = [];
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * lerp(140, 172, rand());
    const ly = 470 + rand() * 26;
    lanterns.push(p(seg(x, 438, x, ly - 16)));
    lanterns.push(`<ellipse cx="${n(x)}" cy="${n(ly)}" rx="15" ry="19" />`);
    lanterns.push(p(seg(x, ly + 19, x, ly + 30)));
  }

  const body = [
    // Roof mass
    g({ stroke: 'url(#k)', 'stroke-width': 3.4, 'stroke-opacity': 0.95 }, roofs),
    g({ stroke: 'url(#k)', 'stroke-width': 2.4, 'stroke-opacity': 0.8 }, ridges),
    // Finial
    g({ stroke: '#ffffff', 'stroke-width': 2.4, 'stroke-opacity': 0.75 }, [
      p(seg(cx, finialY, cx, finialY - 34)),
      `<circle cx="${cx}" cy="${n(finialY - 44)}" r="9" />`,
    ]),
    // Posts and platform
    g({ stroke: 'url(#k)', 'stroke-width': 2.6, 'stroke-opacity': 0.85 }, [p(posts.join(' '))]),
    g({ stroke: 'url(#k)', 'stroke-width': 3.8, 'stroke-opacity': 0.9 }, [
      p(seg(cx - baseHalf - 26, ground, cx + baseHalf + 26, ground)),
    ]),
    g({ stroke: 'url(#k)', 'stroke-width': 1.6, 'stroke-opacity': 0.45 }, [
      p(seg(cx - baseHalf - 8, ground + 22, cx + baseHalf + 8, ground + 22)),
    ]),
    // Lanterns under the eave — the warm marks that say "open for visitors"
    g({ stroke: '#ffffff', 'stroke-width': 1.8, 'stroke-opacity': 0.62 }, lanterns),
    // Signboard
    g({ stroke: 'url(#k)', 'stroke-width': 2.2, 'stroke-opacity': 0.8 }, [
      p(`M${n(cx - 96)} ${n(ground - 132)} L${n(cx - 96)} ${n(ground - 78)} L${n(cx + 96)} ${n(ground - 78)} L${n(cx + 96)} ${n(ground - 132)} Z`),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': 1.4, 'stroke-opacity': 0.4 }, [
      p([0, 1, 2].map((i) => seg(cx - 72, ground - 118 + i * 14, cx + 72 - i * 30, ground - 118 + i * 14)).join(' ')),
    ]),
    // Produce baskets at the foot
    g({ stroke: 'url(#k)', 'stroke-width': 1.8, 'stroke-opacity': 0.6 }, [
      p(`M${n(cx - baseHalf + 18)} ${n(ground)} q18 -30 40 0 Z`),
      p(`M${n(cx + baseHalf - 58)} ${n(ground)} q22 -36 46 0 Z`),
    ]),
  ].join('\n');

  return doc({ body, pal, shift: -34, note: `LGU pavilion ${String(index + 1).padStart(2, '0')}` });
}

/* ------------------------------------------------------------------ *
 * Festival contingent — a costumed dancer
 * ------------------------------------------------------------------ */
function dancer(index) {
  const rand = mulberry32(5000 + index * 11);
  const pal = PALETTES[(index + 2) % PALETTES.length];
  const cx = W / 2;
  const ground = 726;

  /* One dancer is a costume; three is a contingent. The two behind are drawn
     at hair weight so the lead still owns the silhouette when this is cropped
     to a 46px circle. */
  const figure = (fx, scale, headY, opacity, weight, withFans) => {
    const s = scale;
    const head = 26 * s;
    const shoulderY = headY + head + 26 * s;
    const waistY = shoulderY + 96 * s;
    const hemY = ground;
    const shoulder = 42 * s;
    const waist = 30 * s;
    const hem = 104 * s;

    const parts = [];
    parts.push(`<circle cx="${n(fx)}" cy="${n(headY)}" r="${n(head)}" />`);
    // Bodice: shoulders in to a waist.
    parts.push(
      p(`M${n(fx - shoulder)} ${n(shoulderY)} L${n(fx + shoulder)} ${n(shoulderY)} ` +
        `L${n(fx + waist)} ${n(waistY)} L${n(fx - waist)} ${n(waistY)} Z`),
    );
    // Skirt: bell, not a trapezoid — the curve is what reads as fabric.
    parts.push(
      p(`M${n(fx - waist)} ${n(waistY)} C${n(fx - waist - 26 * s)} ${n(lerp(waistY, hemY, 0.55))} ` +
        `${n(fx - hem + 16 * s)} ${n(lerp(waistY, hemY, 0.8))} ${n(fx - hem)} ${n(hemY)} ` +
        `L${n(fx + hem)} ${n(hemY)} C${n(fx + hem - 16 * s)} ${n(lerp(waistY, hemY, 0.8))} ` +
        `${n(fx + waist + 26 * s)} ${n(lerp(waistY, hemY, 0.55))} ${n(fx + waist)} ${n(waistY)} Z`),
    );
    // Arms, raised and tapering.
    const handY = headY - 30 * s;
    const handX = 118 * s;
    parts.push(p(`M${n(fx - shoulder + 4 * s)} ${n(shoulderY + 8 * s)} Q${n(fx - handX * 0.92)} ${n(shoulderY - 24 * s)} ${n(fx - handX)} ${n(handY)}`));
    parts.push(p(`M${n(fx + shoulder - 4 * s)} ${n(shoulderY + 8 * s)} Q${n(fx + handX * 0.92)} ${n(shoulderY - 24 * s)} ${n(fx + handX)} ${n(handY)}`));

    // Headdress: a radiating crown of beaded spines.
    const rays = 11;
    const crown = [];
    for (let i = 0; i < rays; i++) {
      const t = i / (rays - 1);
      const a = lerp(-Math.PI * 0.94, -Math.PI * 0.06, t);
      const len = lerp(58 * s, 108 * s, Math.sin(t * Math.PI));
      const x2 = fx + Math.cos(a) * len;
      const y2 = headY - head * 0.5 + Math.sin(a) * len;
      crown.push(seg(fx, headY - head * 0.6, x2, y2));
      crown.push(`M${n(x2)} ${n(y2)} m-${n(5 * s)} 0 a${n(5 * s)} ${n(5 * s)} 0 1 0 ${n(10 * s)} 0 a${n(5 * s)} ${n(5 * s)} 0 1 0 -${n(10 * s)} 0`);
    }

    // Fans: a wedge with ribs, which is what the hands actually hold.
    const fans = [];
    if (withFans) {
      for (const side of [-1, 1]) {
        const hx = fx + side * handX;
        const r = 62 * s;
        const a0 = -Math.PI * 0.86;
        const a1 = -Math.PI * 0.18;
        const pts = [];
        for (let i = 0; i <= 5; i++) {
          const a = lerp(a0, a1, i / 5);
          pts.push([hx + Math.cos(a) * r * side, handY + Math.sin(a) * r]);
        }
        fans.push(p(`M${n(hx)} ${n(handY)} ` + pts.map((q) => `L${n(q[0])} ${n(q[1])}`).join(' ') + ' Z'));
        for (const q of pts) fans.push(seg(hx, handY, q[0], q[1]));
      }
    }

    return { parts, crown, fans };
  };

  const backL = figure(cx - 232, 0.62, 344, 0.34, 1.6, false);
  const backR = figure(cx + 232, 0.62, 344, 0.34, 1.6, false);
  const lead = figure(cx, 1, 266, 0.95, 3.4, true);

  const body = [
    // The two behind, quiet.
    g({ stroke: 'url(#k)', 'stroke-width': 1.7, 'stroke-opacity': 0.32 }, [
      ...backL.crown.map((d) => p(d)), ...backL.parts,
      ...backR.crown.map((d) => p(d)), ...backR.parts,
    ]),
    // Lead dancer.
    g({ stroke: 'url(#k)', 'stroke-width': 2, 'stroke-opacity': 0.7 }, [p(lead.crown.join(' '))]),
    g({ stroke: 'url(#k)', 'stroke-width': 3.4, 'stroke-opacity': 0.95 }, lead.parts),
    g({ stroke: '#ffffff', 'stroke-width': 1.5, 'stroke-opacity': 0.5 }, lead.fans),
    // Sash and skirt pleats.
    g({ stroke: 'url(#k)', 'stroke-width': 1.5, 'stroke-opacity': 0.45 }, [
      p(`M${cx - 34} ${396} Q${cx} ${416} ${cx + 34} ${396}`),
      p([-2, -1, 0, 1, 2].map((i) => `M${n(cx + i * 16)} ${430} Q${n(cx + i * 30)} ${580} ${n(cx + i * 44)} ${ground - 4}`).join(' ')),
    ]),
    // Street.
    g({ stroke: 'url(#k)', 'stroke-width': 3.4, 'stroke-opacity': 0.8 }, [p(seg(cx - 372, ground, cx + 372, ground))]),
    g({ stroke: 'url(#k)', 'stroke-width': 1.5, 'stroke-opacity': 0.3 }, [p(seg(cx - 428, ground + 28, cx + 428, ground + 28))]),
    // Confetti.
    g({ stroke: '#ffffff', 'stroke-width': 1.6, 'stroke-opacity': 0.3 }, [
      p(
        Array.from({ length: 18 }, () => {
          const x = lerp(50, W - 50, rand());
          const y = lerp(70, 640, rand());
          const sz = lerp(4, 11, rand());
          return seg(x, y, x + sz, y - sz);
        }).join(' '),
      ),
    ]),
  ].join('\n');

  return doc({ body, pal, shift: -74, note: `Festival contingent ${String(index + 1).padStart(2, '0')}` });
}

/* ------------------------------------------------------------------ */

mkdirSync(OUT, { recursive: true });

/* Emit exactly what the data references, so a re-run neither leaves spares
   behind nor misses an entry someone has just added. */
const source = readFileSync(path.join(process.cwd(), 'src/data/pageant.ts'), 'utf8');
const wanted = new Set([...source.matchAll(/\/assets\/entries\/([\w-]+)\.svg/g)].map((m) => m[1]));

const builders = { booth: pavilion, festival: dancer };
const written = [];
for (const name of [...wanted].sort()) {
  const [kind, num] = name.split('-');
  const build = builders[kind];
  if (!build) {
    console.warn(`skipping ${name}: no builder for "${kind}"`);
    continue;
  }
  writeFileSync(path.join(OUT, `${name}.svg`), build(Number(num) - 1), 'utf8');
  written.push(name);
}

if (written.length === 0) {
  console.warn('no /assets/entries references found in src/data/pageant.ts — nothing to build');
} else {
  console.log(`entry art: wrote ${written.length} files to ${path.relative(process.cwd(), OUT)}`);
}
