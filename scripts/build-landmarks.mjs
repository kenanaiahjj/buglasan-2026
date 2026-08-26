/**
 * Landmark line-art builder.
 *
 * The skyline is drawn as glowing line work on a night sky, composited with
 * additive blending. That inverts normal shading logic: ink cannot darken a
 * surface here, only add light. So density *is* illumination — a lit plane
 * carries a white contour and close hatching, a plane turned away from the
 * light carries a few dim hairlines, and a true void carries nothing at all.
 * Light falls consistently from the upper left across the whole set.
 *
 * THE WEIGHT LADDER
 *   contour   silhouette and ground — the only lines that survive at 1/8 scale
 *   structure primary members: roof planes, columns, hulls, trunks
 *   detail    openings, balusters, ribs, tracery
 *   hair      hatching, coursing, texture — resolves to tone at distance
 *
 * The ratio between contour and hair is roughly 6:1. That spread is the whole
 * point: the previous set ran 2.0 to 1.4 and read as an icon sheet.
 *
 * THE COLOUR ROLES
 *   white     lit edges only, and whole pieces that sit far enough back to
 *             read as moonlit rather than coloured. Blooms hardest.
 *   key       the piece's identity gradient, full chroma
 *   shade     a second, deeper ramp for recessive detail so a piece separates
 *             from itself instead of ramping uniformly corner to corner
 *
 * Intrinsic width/height are set above the viewBox so the rasteriser gives us
 * headroom on retina; the drawing coordinates stay in viewBox units.
 *
 * Run: npm run art:landmarks
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'public/assets/landmarks');

/* ------------------------------------------------------------------ *
 * numbers
 * ------------------------------------------------------------------ */

/** Deterministic PRNG — the art must not churn between builds. */
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
const mix = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

/** Point along a polyline, t in 0..1 by arc length. */
function along(points, t) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    segs.push(d);
    total += d;
  }
  let target = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      return mix(points[i], points[i + 1], segs[i] ? target / segs[i] : 0);
    }
    target -= segs[i];
  }
  return points[points.length - 1];
}

/* ------------------------------------------------------------------ *
 * path emitters
 * ------------------------------------------------------------------ */

const M = (p) => `M${n(p[0])} ${n(p[1])}`;
const L = (p) => `L${n(p[0])} ${n(p[1])}`;
const Q = (c, p) => `Q${n(c[0])} ${n(c[1])} ${n(p[0])} ${n(p[1])}`;

const poly = (pts, close = false) => pts.map((p, i) => (i ? L(p) : M(p))).join(' ') + (close ? ' Z' : '');
const seg = (a, b) => `${M(a)} ${L(b)}`;

/**
 * Hatch the band between two rails.
 *
 * Each line runs from a point on rail A to the matching point on rail B, then
 * gets trimmed by a random fraction from the far end. The ragged ends are what
 * separate drawn hatching from a machined gradient — a perfectly rectangular
 * hatch block reads as a screen tint, not as ink.
 */
function hatch(railA, railB, opts = {}) {
  const { count = 10, seed = 1, minLen = 0.55, maxLen = 1, jitter = 0.35, fromEnd = true } = opts;
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const base = (i + 0.5) / count;
    const t = Math.min(0.995, Math.max(0.005, base + (rand() - 0.5) * (jitter / count)));
    const a = along(railA, t);
    const b = along(railB, t);
    const len = lerp(minLen, maxLen, rand());
    const [p, q] = fromEnd ? [a, mix(a, b, len)] : [mix(b, a, len), b];
    out.push(seg(p, q));
  }
  return out.join(' ');
}

/** A fan of gullies falling from one apex across a spread of base points. */
function fan(apex, baseA, baseB, opts = {}) {
  const { count = 9, seed = 7, t0 = 0.14, t1 = 0.9, jitter = 0.5 } = opts;
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const s = (i + 0.5) / count;
    const foot = mix(baseA, baseB, Math.min(1, Math.max(0, s + (rand() - 0.5) * (jitter / count))));
    const start = lerp(t0, t0 + 0.16, rand());
    const end = lerp(t1 - 0.28, t1, rand());
    out.push(seg(mix(apex, foot, start), mix(apex, foot, end)));
  }
  return out.join(' ');
}

/** Evenly spaced verticals — colonnades, balusters, piles, palings. */
function comb(x0, x1, yTop, yBot, count, opts = {}) {
  const { seed = 3, sway = 0 } = opts;
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = lerp(x0, x1, count === 1 ? 0.5 : i / (count - 1));
    const drift = sway ? (rand() - 0.5) * sway : 0;
    out.push(seg([x, yTop], [x + drift, yBot]));
  }
  return out.join(' ');
}

/** Horizontal coursing with broken joints — coral block, shiplap, decking. */
function courses(x0, x1, y0, y1, count, opts = {}) {
  const { seed = 5, minLen = 0.7 } = opts;
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const y = lerp(y0, y1, (i + 0.5) / count);
    const a = lerp(x0, x1, rand() * (1 - minLen) * 0.5);
    const b = lerp(x1, x0, rand() * (1 - minLen) * 0.5);
    out.push(seg([a, y], [b, y]));
  }
  return out.join(' ');
}

/* ------------------------------------------------------------------ *
 * organic forms
 * ------------------------------------------------------------------ */

/**
 * Recursive bifurcating limb. The old acacia was a stick with four spokes;
 * a real one forks three or four times before it reaches the canopy, and the
 * taper is what sells the scale.
 */
function limb(x, y, angle, len, depth, out, rand, opts = {}) {
  const { spread = 0.55, shrink = 0.68, minLen = 8 } = opts;
  const x2 = x + Math.cos(angle) * len;
  const y2 = y + Math.sin(angle) * len;
  const bend = (rand() - 0.5) * 0.3;
  const cx = lerp(x, x2, 0.5) + Math.cos(angle + Math.PI / 2) * len * bend;
  const cy = lerp(y, y2, 0.5) + Math.sin(angle + Math.PI / 2) * len * bend;
  out.push({ d: `${M([x, y])} ${Q([cx, cy], [x2, y2])}`, depth });
  if (depth <= 0 || len < minLen) return;
  const forks = rand() > 0.55 ? 3 : 2;
  for (let i = 0; i < forks; i++) {
    const off = (i / Math.max(1, forks - 1) - 0.5) * 2 * spread * lerp(0.7, 1.3, rand());
    limb(x2, y2, angle + off, len * shrink * lerp(0.82, 1.12, rand()), depth - 1, out, rand, opts);
  }
}

/** Scalloped cloud-shaped crown edge, the way an acacia actually silhouettes. */
function crown(cx, cy, rx, ry, lobes, rand) {
  const pts = [];
  for (let i = 0; i <= lobes; i++) {
    const a = Math.PI + (i / lobes) * Math.PI;
    const wob = lerp(0.86, 1.14, rand());
    pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
  }
  let d = M(pts[0]);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
      const mx = lerp(prev[0], cur[0], 0.5);
    const my = Math.min(prev[1], cur[1]) - ry * 0.22 * lerp(0.6, 1.3, rand());
    d += ` ${Q([mx, my], cur)}`;
  }
  return d;
}

/**
 * Leaf mass, as clumps rather than an outline.
 *
 * A single scalloped contour reads as a balloon on a stick — the first pass
 * of this drawing proved it. Foliage only reads as foliage when it is made of
 * many small overlapping arcs at varying density, so the canopy is built as a
 * scatter of short cupped strokes inside an elliptical envelope, biased
 * toward the lit upper left and thinning at the edges.
 */
function foliage(cx, cy, rx, ry, opts = {}) {
  const { count = 60, seed = 1, lit = -1, size = 0.16, edge = 0.9 } = opts;
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    // Rejection-free polar placement, denser toward the middle of the mass.
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * edge;
    const x = cx + Math.cos(a) * rx * rr;
    const y = cy + Math.sin(a) * ry * rr;
    // Bias the clumps that survive toward the lit side.
    const side = (x - cx) / rx;
    if (lit !== 0 && side * lit < -0.15 && rand() < 0.45) continue;
    const s = rx * size * lerp(0.55, 1.15, rand()) * lerp(0.7, 1, 1 - rr);
    // One short dash per clump, angled at random.
    //
    // Anything with internal structure at this size acquires an identity it
    // has no business having: cupped strokes all opening one way became a
    // flock of birds, rotating them into arcs became curls, and joining two
    // or three at a point became a scatter of darts. A lone dash is the only
    // mark small enough to stay a mark, and at density they add up to tone.
    const ang = rand() * Math.PI;
    const l = s * lerp(0.8, 1.4, rand());
    out.push(seg([x - Math.cos(ang) * l, y - Math.sin(ang) * l * 0.8], [x + Math.cos(ang) * l, y + Math.sin(ang) * l * 0.8]));
  }
  return out.join(' ');
}

/**
 * Palm frond: an arching rachis with leaflets combed off both sides,
 * longest at the shoulder and shortening toward the tip. The previous palms
 * were bare arcs, which is why they read as ferns.
 */
function frond(x, y, angle, len, opts = {}) {
  const { droop = 0.9, leaflets = 8, seed = 2, leafLen = 0.17 } = opts;
  const rand = mulberry32(seed);
  const tipX = x + Math.cos(angle) * len;
  const tipY = y + Math.sin(angle) * len + droop * len * 0.5;
  const cx = x + Math.cos(angle) * len * 0.55;
  const cy = y + Math.sin(angle) * len * 0.55 - droop * len * 0.08;
  const rachis = `${M([x, y])} ${Q([cx, cy], [tipX, tipY])}`;

  const at = (t) => {
    const u = 1 - t;
    return [u * u * x + 2 * u * t * cx + t * t * tipX, u * u * y + 2 * u * t * cy + t * t * tipY];
  };
  // Leaflets are short, sparse and swept. The first pass combed thirteen long
  // curves off each of eleven fronds and the crown turned into a mesh; the
  // second made them straight and evenly spaced and they turned into a comb.
  // What reads as a palm is a handful of strokes per frond, each trailing
  // back toward the tip, drooping under its own weight, and varying in
  // length enough that no two sit parallel.
  const blades = [];
  for (let i = 0; i < leaflets; i++) {
    const t = 0.16 + (i / leaflets) * 0.8 + (rand() - 0.5) * 0.05;
    const p = at(t);
    const q = at(Math.min(1, t + 0.03));
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const m = Math.hypot(dx, dy) || 1;
    const scale = Math.sin(t * Math.PI) * leafLen * len * lerp(0.7, 1.2, rand());
    for (const side of [1, -1]) {
      const nx = (-dy / m) * side;
      const ny = (dx / m) * side;
      // Heavy axial component: a leaflet leaves the rachis at a shallow angle
      // and follows the frond outward rather than standing off it.
      const sweep = lerp(1.0, 1.5, rand());
      const ex = p[0] + nx * scale * 0.62 + (dx / m) * scale * sweep;
      const ey = p[1] + ny * scale * 0.62 + (dy / m) * scale * sweep + scale * 0.42;
      // Control point pulled toward the rachis so the leaflet bows outward.
      const bx = p[0] + nx * scale * 0.42 + (dx / m) * scale * sweep * 0.45;
      const by = p[1] + ny * scale * 0.42 + (dy / m) * scale * sweep * 0.45;
      blades.push(`${M(p)} ${Q([bx, by], [ex, ey])}`);
    }
  }
  return { rachis, blades: blades.join(' ') };
}

/**
 * Spinner dolphin in mid-arc.
 *
 * Getting this to stop reading as a fish came down to three things: depth,
 * fluke and beak. A dolphin is far more slender than instinct suggests —
 * under a fifth of its length at the deepest point, where a fish silhouette
 * is nearer a third. Its fluke is horizontal and swept, not a vertical fan.
 * And the crease where the long rostrum meets the rounded melon is the single
 * mark that names the animal; without it the head is just a snout.
 */
function dolphin(x, y, len, rot, flip = 1) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const P = ([u, v]) => {
    const a = u * len;
    const b = v * len * flip;
    return [x + a * c - b * s, y + a * s + b * c];
  };

  // u runs 0 at the snout to 1 at the fluke tips — the flukes are part of the
  // length, not an extra beyond it. Letting the tail run past u = 1 stretched
  // these into billfish. The rostrum is short and stubby for the same reason:
  // about an eighth of the body, and drawn any longer it becomes a bill.
  const back =
    `${M(P([0, 0.004]))} ` +
    `${Q(P([0.035, -0.014]), P([0.075, -0.021]))} ` + // blunt tip
    `${Q(P([0.1, -0.024]), P([0.115, -0.026]))} ` + // short rostrum, held level
    `${Q(P([0.2, -0.088]), P([0.3, -0.099]))} ` + // melon rises abruptly
    `${Q(P([0.48, -0.101]), P([0.66, -0.076]))} ` + // back
    `${Q(P([0.8, -0.046]), P([0.875, -0.019]))}`; // peduncle
  // Belly: deepest just behind the flipper, tapering evenly to the tail stock.
  const belly =
    `${M(P([0.875, 0.015]))} ` +
    `${Q(P([0.76, 0.048]), P([0.58, 0.084]))} ` +
    `${Q(P([0.4, 0.096]), P([0.24, 0.064]))} ` + // deep chest falling away fast
    `${Q(P([0.16, 0.038]), P([0.115, 0.024]))} ` + // under the jaw
    `${Q(P([0.06, 0.016]), P([0, 0.004]))}`; // lower jaw
  const body = `${back} ${belly}`;

  // Falcate dorsal: leading edge swept back, trailing edge concave.
  const dorsal =
    `${M(P([0.4, -0.1]))} ${Q(P([0.47, -0.196]), P([0.56, -0.208]))} ` +
    `${Q(P([0.535, -0.142]), P([0.55, -0.09]))}`;
  // Fluke: two lobes, raked hard back, trailing edges concave, notch shallow.
  // A tuna carries the same two lobes and reads as a fish because they stand
  // square to the body and the notch cuts deep between them.
  const fluke =
    `${M(P([0.875, -0.019]))} ${Q(P([0.945, -0.058]), P([1.0, -0.086]))} ` + // upper lobe
    `${Q(P([0.96, -0.03]), P([0.945, 0.004]))} ` + // shallow notch
    `${Q(P([0.975, 0.04]), P([0.995, 0.076]))} ` + // lower lobe
    `${Q(P([0.945, 0.042]), P([0.875, 0.015]))} Z`;
  // The cape: the boundary between dark back and pale belly. One line does
  // more for the form than any amount of cross-hatching, and hatching laid
  // across the body instead of along it reads unmistakably as ribs.
  const cape =
    `${M(P([0.17, -0.026]))} ${Q(P([0.36, 0.032]), P([0.56, 0.018]))} ` +
    `${Q(P([0.74, -0.006]), P([0.855, -0.016]))}`;
  const flipper = `${M(P([0.3, 0.082]))} ${Q(P([0.38, 0.172]), P([0.47, 0.2]))} ${Q(P([0.4, 0.12]), P([0.375, 0.092]))}`;
  // The melon crease - the mark that says dolphin rather than fish.
  const crease = `${M(P([0.122, -0.032]))} ${Q(P([0.13, -0.008]), P([0.118, 0.022]))}`;
  const eye = `${M(P([0.185, -0.054]))} ${L(P([0.203, -0.06]))}`;
  const blowhole = `${M(P([0.27, -0.096]))} ${L(P([0.293, -0.098]))}`;
  const mouth = `${M(P([0.012, 0.006]))} ${Q(P([0.06, 0.018]), P([0.115, 0.02]))}`;
  return { body, back, belly, dorsal, fluke, flipper, cape, crease, eye, blowhole, mouth };
}

/** Sea: long, slack, mostly-parallel swells with varied length and sag. */
function swell(y, x0, x1, count, opts = {}) {
  const { seed = 11, amp = 8, step = 14, minSpan = 0.45 } = opts;
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const yy = y + i * step * lerp(0.8, 1.2, rand());
    const span = lerp(minSpan, 1, rand());
    const a = lerp(x0, x1, (1 - span) * rand());
    const b = a + (x1 - x0) * span;
    const waves = 3;
    let d = M([a, yy]);
    for (let w = 0; w < waves; w++) {
      const t0 = w / waves;
      const t1 = (w + 1) / waves;
      const p1 = [lerp(a, b, t1), yy + (w % 2 ? amp : -amp) * 0.25 * lerp(0.5, 1.5, rand())];
      const cp = [lerp(a, b, (t0 + t1) / 2), yy + (w % 2 ? -amp : amp) * lerp(0.5, 1.3, rand())];
      d += ` ${Q(cp, p1)}`;
    }
    out.push(d);
  }
  return out.join(' ');
}

/* ------------------------------------------------------------------ *
 * document assembly
 * ------------------------------------------------------------------ */

function grad(id, stops, x1, y1, x2, y2) {
  const body = stops.map(([o, c]) => `    <stop offset="${o}" stop-color="${c}" />`).join('\n');
  return `  <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">\n${body}\n  </linearGradient>`;
}

/**
 * @param w,h        viewBox extent — the drawing coordinate system
 * @param scale      intrinsic size multiplier; raster headroom for retina
 * @param ladder     stroke weights for this piece
 */
function doc({ w, h, scale, key, shade, ladder, body, note }) {
  const gk = grad('gk', key.stops, ...(key.axis ?? [0, 0, w, h]));
  const gs = grad('gs', shade.stops, ...(shade.axis ?? [w, 0, 0, h]));
  const { contour, structure, detail, hair } = ladder;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}"
     fill="none" stroke-linejoin="round" stroke-linecap="round">
  <!-- ${note}
       weights  contour ${contour}  structure ${structure}  detail ${detail}  hair ${hair}
       light from the upper left; density is illumination -->
  <defs>
${gk}
${gs}
  </defs>
${body.trim()}
</svg>
`;
}

/* Shorthand for a stroked group. */
function g(attrs, children) {
  const a = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `  <g ${a}>\n${children
    .filter(Boolean)
    .map((c) => `    ${c}`)
    .join('\n')}\n  </g>`;
}

const p = (d, extra = {}) => {
  const a = Object.entries(extra)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('');
  return `<path d="${d}"${a} />`;
};

const files = {};
const emit = (name, contents) => {
  files[name] = contents;
};

/* ================================================================== *
 * 1. Mt Talinis — the Cuernos de Negros, twin horns over the strait
 * ================================================================== */
{
  const w = 720;
  const h = 340;
  const base = 300;
  const ladder = { contour: 3.6, structure: 2.2, detail: 1.3, hair: 0.62 };

  const S1 = [296, 74];
  const saddle = [352, 166];
  const S2 = [410, 100];
  const leftFoot = [148, base];
  const rightFoot = [548, base];

  const leftFace = [leftFoot, [196, 254], [236, 190], [266, 132], S1];
  const leftBack = [S1, [314, 104], [330, 136], saddle];
  const rightFront = [saddle, [372, 146], [392, 120], S2];
  const rightFace = [S2, [436, 146], [462, 196], [496, 244], rightFoot];

  const ridge = [...leftFace, ...leftBack.slice(1), ...rightFront.slice(1), ...rightFace.slice(1)];

  // Back ranges sit in haze: hair weight, white, no hatching. Distance is
  // drawn by removing information, not by dimming a copy of the same line.
  const farLeft = poly([[0, 296], [64, 236], [104, 264], [158, 208], [206, 250], [252, 300]]);
  const farRight = poly([[454, 300], [500, 240], [542, 268], [598, 206], [640, 252], [688, 224], [720, 246]]);
  const midRange = poly([[86, 300], [150, 226], [196, 258], [244, 214], [286, 262], [318, 300]]);

  const body = [
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(farLeft),
      p(farRight),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.22 }, [
      p(farLeft),
      p(midRange),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.55 }, [p(midRange)]),

    // Gullies on the lit western flank. They start well down the ridge and
    // stop short of the base — a fan converging on the summit reads as a
    // spiderweb, which is exactly what the first pass produced.
    // One fan only. Layering a second fan and a white one over the same face
    // crossed three sets of lines at three different angles and the flank
    // picked up a woven texture, like netting stretched over the mountain.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.42 }, [
      p(fan(S1, [172, base], [288, base], { count: 7, seed: 21, t0: 0.38, t1: 0.88 })),
    ]),
    // Terrace contours run across the fall lines, so they are kept few and
    // confined to the shoulder where they read as benches in the slope.
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.24 }, [
      p(hatch([[266, 128], [244, 186]], [[300, 140], [286, 192]], { count: 3, seed: 24, minLen: 0.45 })),
    ]),

    // The shaded eastern flank keeps only enough line to hold the form.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.34 }, [
      p(fan(S2, [462, base], [534, base], { count: 4, seed: 25, t0: 0.38, t1: 0.84 })),
      p(fan([368, 152], [316, 240], [346, base], { count: 3, seed: 26, t0: 0.3, t1: 0.8 })),
    ]),

    // Ridge profile. The lit edge is white over the gradient so the crest
    // catches a rim of light the way a real skyline does at dusk.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.95 }, [
      p(poly(ridge)),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.62 }, [
      p(poly(leftFace.slice(1))),
      p(poly(rightFront)),
    ]),

    // Cloud shelf caught on the saddle — the one horizontal in a vertical piece.
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.26 }, [
      p(swell(196, 226, 470, 3, { seed: 31, amp: 5, step: 15, minSpan: 0.6 })),
    ]),

    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.85 }, [
      p(seg([0, base], [720, base])),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      p(swell(314, 20, 700, 2, { seed: 32, amp: 6, step: 16 })),
    ]),
  ].join('\n');

  emit(
    'mt-talinis.svg',
    doc({
      w, h, scale: 1.6, ladder, body,
      note: 'Cuernos de Negros — twin horns, west flank lit, east flank held back',
      key: { stops: [['0%', '#a7f3d0'], ['34%', '#2dd4bf'], ['70%', '#0ea5e9'], ['100%', '#1e40af']] },
      shade: { stops: [['0%', '#64748b'], ['55%', '#334155'], ['100%', '#1e293b']] },
    }),
  );
}

/* ================================================================== *
 * 2. Dumaguete Cathedral — St Catherine of Alexandria
 *
 * The first drawing gave this twin bell towers built into the facade. It has
 * none — the campanario stands apart across the plaza, and that separation
 * is the most-photographed fact about the place. What the cathedral actually
 * presents is a single Baroque frontispiece: a wide lower stage pierced by
 * one deep arched portal, a narrower upper stage carrying a rose window,
 * scrolled volutes ramping between the two with a statue standing on each,
 * and a pediment over the whole with a cross on its apex.
 * ================================================================== */
{
  const w = 580;
  const h = 460;
  const ground = 426;
  const cx = 290;
  const ladder = { contour: 4.2, structure: 2.4, detail: 1.35, hair: 0.6 };

  const entab = 254; // cornice dividing the two stages
  const upTop = 142; // springing of the pediment
  const apex = 74;   // a shallow rake; a steep one turns the facade into a barn
  const lowL = 54, lowR = 526;
  const upL = 182, upR = 398;

  /* Robed figure on a pedestal: two folds, a head, one raised arm. At this
     size that is the whole statue, and the pair standing clear against the
     sky is a large part of the facade's silhouette. */
  const statue = (x, base, s, arm) =>
    [
      g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.72 }, [
        p(`M${n(x - 14 * s)} ${n(base)} L${n(x - 12 * s)} ${n(base - 13 * s)} L${n(x + 12 * s)} ${n(base - 13 * s)} L${n(x + 14 * s)} ${n(base)}`),
      ]),
      g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.75 }, [
        p(`${M([x - 11 * s, base - 13 * s])} ${Q([x - 10 * s, base - 30 * s], [x - 5 * s, base - 43 * s])}`),
        p(`${M([x + 11 * s, base - 13 * s])} ${Q([x + 10 * s, base - 30 * s], [x + 5 * s, base - 43 * s])}`),
        p(`${M([x - 5 * s, base - 43 * s])} ${Q([x, base - 47 * s], [x + 5 * s, base - 43 * s])}`),
        p(`${M([x - 8 * s, base - 24 * s])} ${Q([x, base - 20 * s], [x + 8 * s, base - 24 * s])}`),
        `<circle cx="${n(x)}" cy="${n(base - 50 * s)}" r="${n(6 * s)}" />`,
        p(
          arm > 0
            ? `${M([x + 8 * s, base - 36 * s])} ${Q([x + 17 * s, base - 44 * s], [x + 18 * s, base - 58 * s])}`
            : `${M([x - 8 * s, base - 36 * s])} ${Q([x - 17 * s, base - 44 * s], [x - 18 * s, base - 58 * s])}`,
        ),
      ]),
    ].join('\n');

  /* Volute: an S ramping from the upper stage out to the corner of the lower,
     finishing in a tight scroll. */
  const volute = (x0, y0, d) =>
    `${M([x0, y0])} ` +
    `C${n(x0 + d * 10)} ${n(y0 + 34)} ${n(x0 + d * 40)} ${n(y0 + 24)} ${n(x0 + d * 54)} ${n(y0 + 54)} ` +
    `C${n(x0 + d * 64)} ${n(y0 + 76)} ${n(x0 + d * 80)} ${n(y0 + 70)} ${n(x0 + d * 86)} ${n(y0 + 92)}`;

  const body = [
    // Coursed stone across both stages, reading on the lit left and dropping
    // to almost nothing on the right.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.36 }, [
      p(courses(62, cx - 8, entab + 12, ground - 10, 12, { seed: 41 })),
      p(courses(188, cx - 6, upTop + 14, entab - 14, 8, { seed: 42 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.17 }, [
      p(courses(cx + 8, 518, entab + 12, ground - 10, 12, { seed: 43 })),
      p(courses(cx + 6, 392, upTop + 14, entab - 14, 8, { seed: 44 })),
    ]),

    // Tympanum, hatched across the full rake and thinning to the right.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(hatch([[upL - 6, upTop - 6], [cx, apex + 8]], [[upR + 6, upTop - 6], [cx, apex + 8]], { count: 7, seed: 45, minLen: 0.78 })),
    ]),

    // Outline of the whole frontispiece: lower stage, volutes, upper stage,
    // pediment. One continuous read.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.95 }, [
      p(poly([[lowL, ground], [lowL, entab], [upL, entab], [upL, upTop], [upR, upTop], [upR, entab], [lowR, entab], [lowR, ground]])),
      p(poly([[upL - 12, upTop], [cx, apex], [upR + 12, upTop]])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.structure, 'stroke-opacity': 0.7 }, [
      p(poly([[upL - 14, upTop - 4], [cx, apex - 6], [cx + 12, apex + 2]])),
      p(seg([lowL - 8, entab], [cx, entab])),
    ]),
    // Cornices: the pediment bed mould, the main entablature, the plinth band.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.9 }, [
      p(seg([upL - 20, upTop], [upR + 20, upTop])),
      p(seg([lowL - 10, entab], [lowR + 10, entab])),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.7 }, [
      p(seg([upL - 14, upTop + 11], [upR + 14, upTop + 11])),
      p(seg([lowL - 4, entab + 13], [lowR + 4, entab + 13])),
      p(seg([lowL + 6, 300], [112, 300])),
      p(seg([468, 300], [lowR - 6, 300])),
    ]),

    // Cross on the apex.
    g({ stroke: '#ffffff', 'stroke-width': ladder.structure, 'stroke-opacity': 0.85 }, [
      p(`M${cx} ${apex} L${cx} 18 M${cx - 13} 32 L${cx + 13} 32`),
    ]),

    // Volutes and the statues standing on them.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.85 }, [
      p(volute(upL, 166, -1)),
      p(volute(upR, 166, 1)),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(volute(upL + 11, 174, -1)),
      p(volute(upR - 11, 174, 1)),
    ]),
    statue(98, entab - 2, 1, -1),
    statue(482, entab - 2, 1, 1),

    // Rose window: rim, foiled inner ring, radiating tracery.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.9 }, [
      `<circle cx="${cx}" cy="196" r="44" />`,
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.7 }, [
      `<circle cx="${cx}" cy="196" r="52" />`,
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.55 }, [
      `<circle cx="${cx}" cy="196" r="17" />`,
      p(
        Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return seg([cx + Math.cos(a) * 17, 196 + Math.sin(a) * 17], [cx + Math.cos(a) * 43, 196 + Math.sin(a) * 43]);
        }).join(' '),
      ),
    ]),

    // Paired pilasters on the upper stage, flanking the window.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.65 }, [
      p([206, 220, 360, 374].map((x) => seg([x, entab - 8], [x, upTop + 14])).join(' ')),
      p([206, 220, 360, 374].map((x) => seg([x - 6, upTop + 14], [x + 6, upTop + 14])).join(' ')),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      p([206, 360].map((x) => seg([x - 3, entab - 12], [x - 3, upTop + 18])).join(' ')),
    ]),

    // The portal: a deep arched opening, an inner order, and the lit doorway
    // at the back of it. On the real building this is the brightest thing on
    // the facade after dark.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.9 }, [
      p(`M${cx - 68} ${ground} L${cx - 68} 322 A68 68 0 0 1 ${cx + 68} 322 L${cx + 68} ${ground}`),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.7 }, [
      p(`M${cx - 54} ${ground} L${cx - 54} 326 A54 54 0 0 1 ${cx + 54} 326 L${cx + 54} ${ground}`),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.6 }, [
      p(`M${cx - 34} ${ground} L${cx - 34} 336 A34 34 0 0 1 ${cx + 34} 336 L${cx + 34} ${ground}`),
      p(seg([cx - 34, 300], [cx + 34, 300])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.34 }, [
      p(comb(cx - 24, cx + 24, 306, ground - 6, 4, { seed: 47 })),
    ]),
    // Keystone.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.7 }, [
      p(`M${cx - 9} 250 L${cx - 7} 268 L${cx + 7} 268 L${cx + 9} 250 Z`),
    ]),

    // Side bays: a pilaster pair and a tall window on each flank.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.62 }, [
      p([84, 96, 484, 496].map((x) => seg([x, entab + 6], [x, ground])).join(' ')),
      p(`M126 ${ground} L126 320 A22 22 0 0 1 170 320 L170 ${ground}`),
      p(`M410 ${ground} L410 320 A22 22 0 0 1 454 320 L454 ${ground}`),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.42 }, [
      p(`M134 ${ground} L134 324 A14 14 0 0 1 162 324 L162 ${ground}`),
      p(seg([84 - 3, entab + 10], [84 - 3, ground])),
    ]),

    // Plinth: the heaviest line, so the building sits down.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.92 }, [
      p(seg([34, ground], [546, ground])),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.45 }, [
      p(seg([22, 440], [558, 440])),
    ]),
  ].join('\n');

  emit(
    'dumaguete-cathedral.svg',
    doc({
      w, h, scale: 1.55, ladder, body,
      note: 'St Catherine of Alexandria — one Baroque frontispiece, no attached towers',
      key: { stops: [['0%', '#fef3c7'], ['30%', '#fdba74'], ['66%', '#fb7185'], ['100%', '#9f1239']] },
      shade: { stops: [['0%', '#9a3412'], ['60%', '#7c2d12'], ['100%', '#431407']] },
    }),
  );
}
/* ================================================================== *
 * 3. Negros Oriental Provincial Capitol
 * ================================================================== */
{
  const w = 620;
  const h = 400;
  const ground = 356;
  const ladder = { contour: 4.0, structure: 2.3, detail: 1.3, hair: 0.6 };
  const colX = [232, 264, 296, 328, 360, 392];

  const body = [
    // Tympanum relief. Hatching only the lit half leaves a hard vertical
    // seam down the middle of the pediment, so the lines run right across it
    // and thin out toward the shaded rake instead.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(hatch([[206, 188], [310, 106]], [[398, 188], [310, 106]], { count: 9, seed: 51, minLen: 0.75, maxLen: 1 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.24 }, [
      p(hatch([[214, 188], [310, 112]], [[404, 188], [310, 112]], { count: 7, seed: 52, minLen: 0.3, maxLen: 0.6, fromEnd: false })),
      p(courses(236, 388, 210, 312, 9, { seed: 53, minLen: 0.55 })),
    ]),

    // Wing wall coursing — lit wing reads, shaded wing is barely there.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.34 }, [
      p(courses(44, 196, 200, 316, 11, { seed: 54 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.16 }, [
      p(courses(424, 576, 200, 316, 11, { seed: 55 })),
    ]),

    // Silhouette.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.95 }, [
      p(poly([[40, ground], [40, 190], [198, 190], [310, 100], [422, 190], [580, 190], [580, ground]])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.structure, 'stroke-opacity': 0.7 }, [
      p(poly([[196, 194], [310, 96], [318, 102]])),
      p(seg([34, 188], [200, 188])),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.72 }, [
      p(seg([206, 190], [414, 190])),
      p(seg([210, 178], [410, 178])),
      p(seg([420, 188], [586, 188])),
    ]),

    // Colonnade. A column has to be drawn as a shaft with two sides — the
    // first pass drew one centreline with a highlight beside it and a cap
    // across the top, and six of those read as pins, not architecture.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.9 }, [
      p(colX.map((x) => seg([x + 5, 206], [x + 5, 312])).join(' ')),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.6 }, [
      p(colX.map((x) => seg([x - 5, 206], [x - 5, 312])).join(' ')),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.32 }, [
      p(colX.map((x) => seg([x, 210], [x, 308])).join(' ')),
    ]),
    // Capitals and bases: a plinth block top and bottom, wider than the shaft.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.8 }, [
      p(colX.map((x) => `M${x - 7} 206 L${x - 7} 199 L${x + 7} 199 L${x + 7} 206`).join(' ')),
      p(colX.map((x) => `M${x - 8} 312 L${x - 8} 320 L${x + 8} 320 L${x + 8} 312`).join(' ')),
      p(seg([222, 320], [402, 320])),
    ]),

    // Wing fenestration — two storeys, upper sills catching light.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.62 }, [
      ...[62, 110, 158, 432, 480, 528].flatMap((x) => [
        p(`M${x} 214 L${x} 250 L${x + 30} 250 L${x + 30} 214 Z`),
        p(`M${x} 278 L${x} 320 L${x + 30} 320 L${x + 30} 278 Z`),
      ]),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      ...[62, 110, 158].flatMap((x) => [
        p(seg([x, 214], [x + 30, 214])),
        p(seg([x + 15, 214], [x + 15, 250])),
        p(seg([x + 15, 278], [x + 15, 320])),
      ]),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.32 }, [
      ...[432, 480, 528].flatMap((x) => [
        p(seg([x + 15, 214], [x + 15, 250])),
        p(seg([x + 15, 278], [x + 15, 320])),
      ]),
    ]),

    // Steps: three courses, widening, heaviest at the bottom.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.8 }, [
      p(seg([34, 320], [586, 320])),
      p(seg([24, 338], [596, 338])),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.9 }, [
      p(seg([14, ground], [606, ground])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.3 }, [
      p(comb(236, 388, 320, ground, 7, { seed: 56 })),
    ]),
  ].join('\n');

  emit(
    'negros-capitol.svg',
    doc({
      w, h, scale: 1.6, ladder, body,
      note: 'Provincial Capitol — six-column portico, flanking wings',
      key: { stops: [['0%', '#d9f99d'], ['32%', '#4ade80'], ['68%', '#22d3ee'], ['100%', '#0369a1']] },
      shade: { stops: [['0%', '#0e7490'], ['60%', '#155e75'], ['100%', '#164e63']] },
    }),
  );
}

/* ================================================================== *
 * 4. Campanario de Dumaguete — the belfry
 *
 * The first attempt drew this as four straight-sided storeys stacked square
 * on square. It is nothing of the sort: it is a truncated cone of coral
 * block, battered hardest at the plinth, ringed by heavy cornices that sag
 * visibly in the middle because you are always looking up at them, and
 * capped by a small square bell chamber under a dome. Half its character is
 * the vegetation that has taken root along every ledge.
 * ================================================================== */
{
  const w = 420;
  const h = 640;
  const ladder = { contour: 3.8, structure: 2.3, detail: 1.3, hair: 0.6 };
  const cx = 210;
  const ground = 604;

  // Half-width at each cornice. Every band is narrower than the one below,
  // and the taper is steepest in the plinth.
  // The batter is not uniform. Almost all of it is spent in the plinth, which
  // splays out hard at the ground; above the first cornice the tower is very
  // nearly a cylinder. Tapering evenly from base to belfry — the first
  // attempt at this — produces a lighthouse, not a campanario.
  const S = [
    { y: ground, hw: 182 },
    { y: 466, hw: 130 },
    { y: 368, hw: 120 },
    { y: 272, hw: 110 },
    { y: 196, hw: 101 },
  ];

  /* A horizontal ring seen from below sags in the middle: the near edge of
     the circle sits lower than the far edge. That sag is the whole reason
     the tower reads as round rather than flat. */
  const ring = (y, hw, k = 0.23) => `${M([cx - hw, y])} ${Q([cx, y + hw * k], [cx + hw, y])}`;

  /* Coral coursing follows the same curvature, thins as it rises, and breaks
     its joints so the wall does not read as ruled paper. */
  const coursing = (i, count, seed) => {
    const a = S[i];
    const b = S[i + 1];
    const rand = mulberry32(seed);
    const out = [];
    for (let k = 1; k < count; k++) {
      const t = k / count;
      const y = lerp(a.y, b.y, t);
      const hw = lerp(a.hw, b.hw, t) * lerp(0.9, 0.99, rand());
      const off = (rand() - 0.5) * hw * 0.25;
      out.push(`${M([cx - hw + off, y])} ${Q([cx + off * 0.4, y + hw * 0.15], [cx + hw + off, y])}`);
    }
    return out.join(' ');
  };

  /* Vertical joints, staggered course to course. */
  const joints = (i, seed) => {
    const a = S[i];
    const b = S[i + 1];
    const rand = mulberry32(seed);
    const out = [];
    for (let k = 0; k < 14; k++) {
      const t = 0.08 + rand() * 0.84;
      const y = lerp(a.y, b.y, t);
      const hw = lerp(a.hw, b.hw, t);
      const u = (rand() - 0.5) * 1.7;
      const x = cx + u * hw;
      // Sag the course line the joint sits on, so joints stay on the surface.
      const sag = hw * 0.15 * (1 - u * u);
      out.push(seg([x, y + sag], [x, y + sag - lerp(6, 13, rand())]));
    }
    return out.join(' ');
  };

  const wallL = (i) => seg([cx - S[i].hw, S[i].y], [cx - S[i + 1].hw, S[i + 1].y]);
  const wallR = (i) => seg([cx + S[i].hw, S[i].y], [cx + S[i + 1].hw, S[i + 1].y]);

  const body = [
    // Masonry, lit on the left and held back on the right.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      p(coursing(0, 9, 60)),
      p(coursing(1, 7, 61)),
      p(coursing(2, 6, 62)),
      p(coursing(3, 5, 63)),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.3 }, [
      p(joints(0, 64)),
      p(joints(1, 65)),
      p(joints(2, 66)),
      p(joints(3, 67)),
    ]),

    // The battered profile — the single line that has to survive at any size.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.95 }, [
      p(wallL(0)),
      p(wallR(0)),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.92 }, [
      p(wallL(1)), p(wallR(1)),
      p(wallL(2)), p(wallR(2)),
      p(wallL(3)), p(wallR(3)),
    ]),
    // Sun on the left flank of every storey.
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.5 }, [
      p(seg([cx - S[0].hw + 7, S[0].y - 12], [cx - S[1].hw + 6, S[1].y + 8])),
      p(seg([cx - S[1].hw + 6, S[1].y - 6], [cx - S[2].hw + 5, S[2].y + 6])),
      p(seg([cx - S[2].hw + 5, S[2].y - 6], [cx - S[3].hw + 5, S[3].y + 6])),
    ]),

    // Cornice rings. Each is drawn twice — the moulding and its shadow line —
    // and the upper of the two catches the light.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.95 }, [
      ...S.slice(0, 4).map((s2, i) => p(ring(s2.y, s2.hw + (i === 0 ? 8 : 7)))),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      ...S.slice(1, 4).map((s2) => p(ring(s2.y - 9, s2.hw + 3))),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.45 }, [
      ...S.slice(1, 4).map((s2) => p(ring(s2.y + 7, s2.hw + 5))),
    ]),

    // Openings: an arched light low down, a rectangular one at mid height,
    // a lozenge above it. All set on the sagging course they belong to.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.8 }, [
      p(`M${cx - 26} 348 L${cx - 26} 306 A26 26 0 0 1 ${cx + 26} 306 L${cx + 26} 348 Z`),
      p(`M${cx - 22} 236 L${cx} 212 L${cx + 22} 236 L${cx} 260 Z`),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.45 }, [
      p(`M${cx - 18} 344 L${cx - 18} 308 A18 18 0 0 1 ${cx + 18} 308`),
      p(`M${cx - 14} 236 L${cx} 220 L${cx + 14} 236`),
    ]),
    // A second lozenge on the turning-away face, foreshortened.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(`M${cx + 58} 244 L${cx + 70} 226 L${cx + 80} 242 L${cx + 68} 260 Z`),
    ]),

    // Bell chamber: a small square storey set back on the platform, with an
    // arched opening on the face toward us and a narrower one on the face
    // turning away.
    // The bell chamber is set well back from the shaft below it, standing on
    // an open platform — that ledge, and the plants along it, is what you
    // actually see from the plaza.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.95 }, [
      p(seg([cx - 101, 190], [cx + 101, 190])),
      p(`M${cx - 60} 184 L${cx - 56} 104 L${cx + 56} 104 L${cx + 60} 184`),
      p(seg([cx - 68, 184], [cx + 68, 184])),
      p(seg([cx - 64, 104], [cx + 64, 104])),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.8 }, [
      p(`M${cx - 34} 178 L${cx - 34} 142 A18 18 0 0 1 ${cx + 2} 142 L${cx + 2} 178`),
      p(`M${cx + 20} 176 L${cx + 20} 146 A11 11 0 0 1 ${cx + 42} 146 L${cx + 42} 176`),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.42 }, [
      p(seg([cx - 58, 112], [cx + 58, 112])),
      p(comb(cx - 26, cx - 6, 148, 176, 2, { seed: 68 })),
    ]),

    // Dome and cross.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.95 }, [
      p(`${M([cx - 60, 104])} ${Q([cx, 34], [cx + 60, 104])}`),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(`${M([cx - 40, 96])} ${Q([cx, 46], [cx + 40, 96])}`),
      p(`${M([cx - 20, 90])} ${Q([cx, 58], [cx + 20, 90])}`),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(`${M([cx - 54, 98])} ${Q([cx - 34, 68], [cx - 18, 54])}`),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.structure, 'stroke-opacity': 0.85 }, [
      p(`M${cx} 36 L${cx} 8 M${cx - 11} 20 L${cx + 11} 20`),
    ]),

    // Growth on the ledges. Nothing else says "four hundred years old" as
    // economically, and on the real tower it is the first thing you see.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.55 }, [
      p(foliage(cx - 96, 452, 34, 17, { count: 26, seed: 70, lit: -1, size: 0.13 })),
      p(foliage(cx + 88, 456, 28, 14, { count: 20, seed: 71, lit: 1, size: 0.14 })),
      p(foliage(cx - 74, 356, 26, 13, { count: 18, seed: 72, lit: -1, size: 0.14 })),
      p(foliage(cx + 74, 358, 24, 12, { count: 16, seed: 73, lit: 1, size: 0.15 })),
      p(foliage(cx - 58, 262, 22, 11, { count: 14, seed: 74, lit: -1, size: 0.15 })),
      p(foliage(cx + 46, 190, 30, 13, { count: 18, seed: 75, lit: 1, size: 0.14 })),
      p(foliage(cx - 44, 188, 26, 12, { count: 15, seed: 76, lit: -1, size: 0.15 })),
    ]),
    // A few trailing stems hanging clear of the wall.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      p(`${M([cx - 96, 460])} ${Q([cx - 104, 486], [cx - 92, 508])}`),
      p(`${M([cx + 88, 462])} ${Q([cx + 98, 484], [cx + 90, 500])}`),
      p(`${M([cx - 74, 364])} ${Q([cx - 82, 384], [cx - 72, 400])}`),
    ]),

    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.85 }, [
      p(seg([cx - 196, ground], [cx + 196, ground])),
    ]),
  ].join('\n');

  emit(
    'dumaguete-belltower.svg',
    doc({
      w, h, scale: 1.55, ladder, body,
      note: 'Campanario — a battered cone of coral block under a domed bell chamber',
      key: { stops: [['0%', '#fef3c7'], ['30%', '#fcd34d'], ['66%', '#38bdf8'], ['100%', '#3730a3']] },
      shade: { stops: [['0%', '#57534e'], ['60%', '#44403c'], ['100%', '#292524']] },
    }),
  );
}
/* ================================================================== *
 * 5. Silliman Hall — the oldest American building in the country
 *
 * A long, low, two-storey box would miss it entirely. What identifies this
 * building is the lacework: a veranda running the full length on slender
 * paired posts, every bay closed at the head by a fretted bracket, a
 * balustrade beneath, and a square lantern tower breaking the roofline in
 * the middle with a flag on it.
 * ================================================================== */
{
  const w = 640;
  const h = 440;
  const ground = 398;
  const ladder = { contour: 3.8, structure: 2.2, detail: 1.25, hair: 0.58 };

  const bldL = 42, bldR = 598;
  const verTop = 282;   // veranda entablature
  const pierTop = 370;  // top of the masonry piers
  const eave = 188;     // upper-storey cornice
  const ridge = 112;    // a deep hipped roof; a shallow one reads as a shed
  const BAYS = 12;
  const postX = Array.from({ length: BAYS + 1 }, (_, i) => lerp(bldL + 16, bldR - 16, i / BAYS));

  /* The fretted bracket that closes the head of every bay. Two opposed
     scrolls meeting under a small pendant — repeated across the front, this
     is what reads as Silliman rather than as any other wooden house. */
  const bracket = (x0, x1, y) => {
    const m = (x0 + x1) / 2;
    const r = (x1 - x0) * 0.34;
    return (
      `${M([x0 + 3, y])} ${Q([x0 + r, y + 3], [m - 5, y + 13])} ` +
      `${M([x1 - 3, y])} ${Q([x1 - r, y + 3], [m + 5, y + 13])} ` +
      `${M([m, y + 12])} ${L([m, y + 20])}`
    );
  };

  const body = [
    // Roof: shingle courses running with the pitch, lit slope reading and
    // the far slope held back.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.38 }, [
      p(hatch([[bldL + 18, eave], [262, ridge]], [[262, eave], [262, ridge]], { count: 11, seed: 85, minLen: 0.6 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.2 }, [
      p(hatch([[bldR - 18, eave], [378, ridge]], [[378, eave], [378, ridge]], { count: 11, seed: 86, minLen: 0.5 })),
    ]),
    // Upper-storey weatherboard.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.3 }, [
      p(courses(bldL + 8, 300, eave + 10, verTop - 8, 9, { seed: 81 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.15 }, [
      p(courses(340, bldR - 8, eave + 10, verTop - 8, 9, { seed: 82 })),
    ]),

    // Hipped roof and the long eave line.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.95 }, [
      p(poly([[bldL, eave], [bldL + 58, ridge], [bldR - 58, ridge], [bldR, eave]])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.structure, 'stroke-opacity': 0.68 }, [
      p(poly([[bldL - 6, eave + 4], [bldL + 58, ridge - 4], [bldR - 58, ridge - 4]])),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.9 }, [
      p(seg([bldL - 8, eave], [bldR + 8, eave])),
    ]),

    // Dormers breaking the roof slope.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.75 }, [
      ...[120, 196, 444, 520].map((x) =>
        p(`M${x - 26} ${eave - 6} L${x - 26} ${eave - 32} L${x} ${eave - 54} L${x + 26} ${eave - 32} L${x + 26} ${eave - 6}`),
      ),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.45 }, [
      ...[120, 196].map((x) => p(`M${x - 13} ${eave - 10} L${x - 13} ${eave - 32} L${x + 13} ${eave - 32} L${x + 13} ${eave - 10} Z`)),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      ...[444, 520].map((x) => p(`M${x - 13} ${eave - 10} L${x - 13} ${eave - 32} L${x + 13} ${eave - 32} L${x + 13} ${eave - 10} Z`)),
    ]),

    // Lantern tower: square, glazed on every face, its own hipped cap, flag.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.92 }, [
      p(poly([[266, ridge], [266, 58], [374, 58], [374, ridge]])),
      p(seg([256, ridge], [384, ridge])),
      p(poly([[254, 58], [320, 18], [386, 58]])),
      p(seg([246, 58], [394, 58])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.6 }, [
      p(`M280 104 L280 70 L308 70 L308 104 Z`),
      p(`M332 104 L332 70 L360 70 L360 104 Z`),
      p(seg([254, 58], [320, 18])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.8 }, [
      p(seg([320, 18], [320, 2])),
      p(`M320 4 L354 10 L320 16 Z`),
    ]),

    // Upper-storey windows: tall sashes in every bay, lit on the left half of
    // the front and dropping back on the right. Without them the whole upper
    // floor reads as a blank band of siding.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.72 }, [
      p(
        Array.from({ length: 11 }, (_, i) => {
          const x = lerp(bldL + 30, bldR - 30, i / 10);
          return `M${n(x - 15)} ${verTop - 16} L${n(x - 15)} ${eave + 20} L${n(x + 15)} ${eave + 20} L${n(x + 15)} ${verTop - 16} Z`;
        }).join(' '),
      ),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(
        Array.from({ length: 6 }, (_, i) => {
          const x = lerp(bldL + 30, bldR - 30, i / 10);
          return `${seg([x, verTop - 16], [x, eave + 20])} ${seg([x - 15, lerp(eave + 20, verTop - 16, 0.42)], [x + 15, lerp(eave + 20, verTop - 16, 0.42)])}`;
        }).join(' '),
      ),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.42 }, [
      p(
        Array.from({ length: 5 }, (_, i) => {
          const x = lerp(bldL + 30, bldR - 30, (i + 6) / 10);
          return `${seg([x, verTop - 16], [x, eave + 20])} ${seg([x - 15, lerp(eave + 20, verTop - 16, 0.42)], [x + 15, lerp(eave + 20, verTop - 16, 0.42)])}`;
        }).join(' '),
      ),
    ]),

    // Veranda entablature and the balcony rail above it.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.9 }, [
      p(seg([bldL - 6, verTop], [bldR + 6, verTop])),
      p(seg([bldL - 2, verTop - 10], [bldR + 2, verTop - 10])),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(comb(bldL + 6, bldR - 6, verTop - 10, verTop, 42, { seed: 92 })),
    ]),

    // The veranda itself: paired posts, fretted brackets, balustrade, piers.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.88 }, [
      p(postX.map((x) => seg([x + 3, verTop], [x + 3, pierTop])).join(' ')),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.6 }, [
      p(postX.map((x) => seg([x - 3, verTop], [x - 3, pierTop])).join(' ')),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.72 }, [
      p(postX.slice(0, -1).map((x, i) => bracket(x + 4, postX[i + 1] - 4, verTop + 4)).join(' ')),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.72 }, [
      p(seg([bldL + 10, 328], [bldR - 10, 328])),
      p(seg([bldL + 10, pierTop], [bldR - 10, pierTop])),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.55 }, [
      p(comb(bldL + 16, bldR - 16, 330, pierTop - 2, 54, { seed: 89 })),
    ]),
    // Masonry piers.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.8 }, [
      p(postX.map((x) => `M${n(x - 9)} ${ground} L${n(x - 7)} ${pierTop} L${n(x + 7)} ${pierTop} L${n(x + 9)} ${ground}`).join(' ')),
    ]),

    // Steps up to the central entrance.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.7 }, [
      p(seg([272, pierTop], [368, pierTop])),
      p(seg([262, 384], [378, 384])),
      p(seg([252, ground], [388, ground])),
    ]),

    // Lawn.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.85 }, [
      p(seg([20, ground], [620, ground])),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.35 }, [
      p(swell(414, 10, 630, 2, { seed: 95, amp: 4, step: 12, minSpan: 0.85 })),
    ]),
  ].join('\n');

  emit(
    'silliman-hall.svg',
    doc({
      w, h, scale: 1.55, ladder, body,
      note: 'Silliman Hall — fretted veranda the full length, lantern tower and flag',
      key: { stops: [['0%', '#e0f2fe'], ['32%', '#7dd3fc'], ['68%', '#60a5fa'], ['100%', '#be123c']] },
      shade: { stops: [['0%', '#334155'], ['60%', '#1e293b'], ['100%', '#0f172a']] },
    }),
  );
}

/* ================================================================== *
 * 5b. Silliman Portal West — the campus gate
 *
 * This is a gate, not a building; the previous file drew a house under the
 * name. Two white piers of unequal height, each capped with a stone ball,
 * the taller one lettered vertically — and behind them the flame tree whose
 * crown covers the whole entrance and is easily the larger half of the view.
 * ================================================================== */
{
  const w = 500;
  const h = 540;
  const road = 488;
  const ladder = { contour: 4.0, structure: 2.4, detail: 1.35, hair: 0.62 };
  const rand = mulberry32(300);

  /* A pier: square shaft, moulded cap, stone ball. The lettering runs down
     the face, and since no glyph survives at this size it is set as a column
     of short marks — which is what the eye takes from it anyway. */
  const pier = (x, hw, top, ballR, marks) =>
    [
      g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.9 }, [
        p(`M${n(x - hw - 3)} ${road} L${n(x - hw)} ${n(top + 14)} L${n(x + hw)} ${n(top + 14)} L${n(x + hw + 3)} ${road}`),
      ]),
      // Cap mouldings.
      g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.85 }, [
        p(`M${n(x - hw - 6)} ${n(top + 14)} L${n(x + hw + 6)} ${n(top + 14)}`),
        p(`M${n(x - hw - 4)} ${n(top + 5)} L${n(x + hw + 4)} ${n(top + 5)}`),
        p(`M${n(x - hw + 2)} ${n(top + 5)} L${n(x - hw + 4)} ${n(top)} L${n(x + hw - 4)} ${n(top)} L${n(x + hw - 2)} ${n(top + 5)}`),
      ]),
      // Ball finial — the mark that names the gate.
      g({ stroke: '#ffffff', 'stroke-width': ladder.structure, 'stroke-opacity': 0.9 }, [
        `<circle cx="${n(x)}" cy="${n(top - ballR + 1)}" r="${n(ballR)}" />`,
      ]),
      g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
        p(`${M([x - ballR * 0.62, top - ballR * 1.3])} ${Q([x - ballR * 0.2, top - ballR * 1.85], [x + ballR * 0.35, top - ballR * 1.7])}`),
      ]),
      // Lit left arris, shaded right face.
      g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.6 }, [
        p(`M${n(x - hw + 4)} ${n(road - 6)} L${n(x - hw + 5)} ${n(top + 20)}`),
      ]),
      g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
        p(courses(x + hw * 0.15, x + hw - 3, top + 24, road - 8, 7, { seed: 301, minLen: 0.5 })),
      ]),
      // Vertical lettering.
      g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.62 }, [
        p(
          Array.from({ length: marks }, (_, i) => {
            const y = lerp(top + 44, road - 44, i / (marks - 1));
            const half = hw * 0.4 * lerp(0.6, 1, mulberry32(310 + i)());
            return seg([x - half, y], [x + half, y]);
          }).join(' '),
        ),
      ]),
    ].join('\n');

  const body = [
    // Flame-tree crown: a broad, flat, overhanging mass. Two tones of leaf
    // plus a scatter of white for the flowers catching the light.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(foliage(292, 158, 208, 82, { count: 260, seed: 302, lit: -1, size: 0.028 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.34 }, [
      p(foliage(380, 186, 128, 60, { count: 110, seed: 303, lit: 1, size: 0.035 })),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.3 }, [
      p(foliage(214, 132, 140, 58, { count: 90, seed: 304, lit: -1, size: 0.036 })),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.55 }, [
      p(crown(292, 152, 206, 78, 10, rand)),
    ]),

    // Limbs reaching out under the crown, and the trunk off to the right.
    (() => {
      const limbs = [];
      limb(438, 470, -Math.PI / 2 - 0.34, 96, 4, limbs, mulberry32(305), { spread: 0.7, shrink: 0.72, minLen: 7 });
      return g({ stroke: 'url(#gk)', 'stroke-opacity': 0.6 }, [
        ...limbs.map((l) => p(l.d, { 'stroke-width': n(ladder.hair + l.depth * 0.5) })),
      ]);
    })(),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.85 }, [
      p(`${M([428, road])} ${Q([432, 400], [438, 470 - 96 * 0.2])}`),
      p(`${M([456, road])} ${Q([450, 400], [444, 470 - 96 * 0.2])}`),
    ]),

    pier(292, 27, 268, 25, 8),
    pier(186, 21, 338, 19, 5),

    // Road, kerb and the shadow the gate throws across it.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.88 }, [
      p(seg([12, road], [488, road])),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.5 }, [
      p(seg([12, 504], [488, 504])),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.34 }, [
      p(hatch([[40, 508], [460, 508]], [[70, 528], [478, 528]], { count: 9, seed: 306, minLen: 0.4 })),
    ]),
  ].join('\n');

  emit(
    'silliman-portal.svg',
    doc({
      w, h, scale: 1.45, ladder, body,
      note: 'Portal West — two ball-capped piers under the flame tree',
      key: { stops: [['0%', '#fef9c3'], ['30%', '#fdba74'], ['64%', '#fb7185'], ['100%', '#15803d']] },
      shade: { stops: [['0%', '#166534'], ['60%', '#14532d'], ['100%', '#052e16']] },
    }),
  );
}
/* ================================================================== *
 * 6. Quezon Park gazebo — tiered roof, arcaded drum
 * ================================================================== */
{
  const w = 440;
  const h = 440;
  const ladder = { contour: 3.6, structure: 2.2, detail: 1.25, hair: 0.6 };
  const colX = [110, 162, 220, 278, 330];

  const body = [
    // Roof shingling follows the hip lines outward from the apex.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.42 }, [
      p(hatch([[84, 200], [220, 100]], [[220, 200], [220, 100]], { count: 9, seed: 100, minLen: 0.6 })),
      p(hatch([[118, 132], [220, 58]], [[220, 132], [220, 58]], { count: 6, seed: 101, minLen: 0.6 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.2 }, [
      p(hatch([[356, 200], [222, 100]], [[222, 200], [222, 100]], { count: 8, seed: 102, minLen: 0.5 })),
      p(hatch([[322, 132], [222, 58]], [[222, 132], [222, 58]], { count: 5, seed: 103, minLen: 0.5 })),
    ]),

    // Two roof tiers and the finial.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.95 }, [
      p(poly([[84, 200], [220, 100], [356, 200]])),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.92 }, [
      p(poly([[118, 132], [220, 58], [322, 132]])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.structure, 'stroke-opacity': 0.72 }, [
      p(poly([[84, 200], [220, 100], [228, 106]])),
      p(poly([[118, 132], [220, 58], [228, 64]])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.85 }, [
      p('M220 58 L220 26'),
      `<circle cx="220" cy="18" r="8" />`,
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      `<circle cx="220" cy="18" r="13" stroke-opacity="0.35" />`,
    ]),

    // Entablature.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.85 }, [
      p(seg([92, 200], [348, 200])),
      p(seg([96, 210], [344, 210])),
    ]),

    // Columns drawn as shafts: gradient on the shaded side, white on the lit.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.9 }, [
      p(colX.map((x) => seg([x + 4, 212], [x + 4, 348])).join(' ')),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.55 }, [
      p(colX.map((x) => seg([x - 4, 212], [x - 4, 348])).join(' ')),
    ]),

    // Arched heads between columns, with keystones.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.6 }, [
      p('M110 246 Q136 214 162 246 M162 246 Q191 212 220 246 M220 246 Q249 212 278 246 M278 246 Q304 214 330 246'),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.35 }, [
      p([136, 191, 249, 304].map((x, i) => seg([x, [216, 213, 213, 216][i]], [x, [224, 222, 222, 224][i]])).join(' ')),
    ]),

    // Balustrade.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.8 }, [
      p(seg([100, 296], [340, 296])),
      p(seg([100, 348], [340, 348])),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.6 }, [
      p(comb(106, 334, 300, 344, 17, { seed: 104 })),
    ]),

    // Stepped plinth.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.8 }, [
      p(seg([88, 348], [352, 348])),
      p(seg([78, 372], [362, 372])),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.9 }, [
      p(seg([68, 396], [372, 396])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.3 }, [
      p(comb(186, 254, 348, 396, 3, { seed: 105 })),
    ]),
  ].join('\n');

  emit(
    'quezon-gazebo.svg',
    doc({
      w, h, scale: 1.5, ladder, body,
      note: 'Quezon Park gazebo — two roof tiers over an arcaded drum',
      key: { stops: [['0%', '#fce7f3'], ['36%', '#f472b6'], ['74%', '#c084fc'], ['100%', '#7e22ce']] },
      shade: { stops: [['0%', '#701a75'], ['60%', '#581c87'], ['100%', '#3b0764']] },
    }),
  );
}

/* ================================================================== *
 * 7. Rizal Boulevard — the seafront promenade
 *
 * Two things were wrong before. The standards carried a cross-arm with a
 * pair of globes, which is a different fitting entirely: the boulevard's
 * lamps are single lanterns under a pyramidal cap on a fluted white column.
 * And the walk was drawn flat-on, which throws away the one thing everybody
 * photographs here — the paving, the seawall and the row of lamps all
 * running away together to a point down the shore.
 * ================================================================== */
{
  const w = 640;
  const h = 400;
  const ladder = { contour: 3.4, structure: 2.1, detail: 1.25, hair: 0.56 };
  const VP = [604, 226];
  const toVP = (pt, t) => mix(pt, VP, t);

  /* Lamp standard: stepped base, fluted shaft, one lantern, pyramidal cap. */
  const lamp = (x, base, s) => {
    const S = (v) => v * s;
    const lw = (b) => n(Math.max(0.5, b * Math.sqrt(s)));
    const top = base - S(116);
    return [
      g({ stroke: 'url(#gk)', 'stroke-width': lw(ladder.detail), 'stroke-opacity': 0.78 }, [
        p(`M${n(x - S(15))} ${n(base)} L${n(x - S(15))} ${n(base - S(8))} L${n(x + S(15))} ${n(base - S(8))} L${n(x + S(15))} ${n(base)}`),
        p(`M${n(x - S(10))} ${n(base - S(8))} L${n(x - S(10))} ${n(base - S(17))} L${n(x + S(10))} ${n(base - S(17))} L${n(x + S(10))} ${n(base - S(8))}`),
        p(`M${n(x - S(7))} ${n(base - S(17))} L${n(x - S(5.5))} ${n(base - S(26))} L${n(x + S(5.5))} ${n(base - S(26))} L${n(x + S(7))} ${n(base - S(17))}`),
      ]),
      // Shaft: shaded edge, lit edge, and one flute between them.
      g({ stroke: 'url(#gk)', 'stroke-width': lw(ladder.detail), 'stroke-opacity': 0.82 }, [
        p(seg([x + S(5.5), base - S(26)], [x + S(4), top + S(20)])),
      ]),
      g({ stroke: '#ffffff', 'stroke-width': lw(ladder.detail), 'stroke-opacity': 0.66 }, [
        p(seg([x - S(5.5), base - S(26)], [x - S(4), top + S(20)])),
      ]),
      g({ stroke: 'url(#gs)', 'stroke-width': lw(ladder.hair), 'stroke-opacity': 0.4 }, [
        p(seg([x, base - S(24)], [x, top + S(22)])),
      ]),
      // Lantern and cap — the silhouette that names the fitting.
      g({ stroke: '#ffffff', 'stroke-width': lw(ladder.detail), 'stroke-opacity': 0.88 }, [
        p(`M${n(x - S(11))} ${n(top + S(20))} L${n(x - S(14))} ${n(top + S(17))} L${n(x + S(14))} ${n(top + S(17))} L${n(x + S(11))} ${n(top + S(20))}`),
        p(`M${n(x - S(13))} ${n(top + S(17))} L${n(x - S(11))} ${n(top - S(16))} L${n(x + S(11))} ${n(top - S(16))} L${n(x + S(13))} ${n(top + S(17))} Z`),
      ]),
      g({ stroke: 'url(#gk)', 'stroke-width': lw(ladder.detail), 'stroke-opacity': 0.85 }, [
        p(`M${n(x - S(18))} ${n(top - S(16))} L${n(x)} ${n(top - S(38))} L${n(x + S(18))} ${n(top - S(16))} Z`),
        p(seg([x, top - S(38)], [x, top - S(47)])),
      ]),
      g({ stroke: '#ffffff', 'stroke-width': lw(ladder.hair), 'stroke-opacity': 0.45 }, [
        p(comb(x - S(5), x + S(5), top - S(13), top + S(14), 2, { seed: 131 })),
      ]),
    ].join('\n');
  };

  const bench = (x, y, s) =>
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.6 }, [
      p(`M${n(x)} ${n(y)} L${n(x)} ${n(y - 22 * s)} L${n(x + 42 * s)} ${n(y - 22 * s)} L${n(x + 42 * s)} ${n(y)}`),
      p(seg([x, y - 11 * s], [x + 42 * s, y - 11 * s])),
    ]);

  const tree = (cx, cy, rx, ry, trunkY, seed, lit) => {
    const r2 = mulberry32(seed);
    const limbs = [];
    limb(cx, trunkY, -Math.PI / 2, (trunkY - cy) * 0.42, 3, limbs, r2, { spread: 0.62, shrink: 0.7 });
    return [
      g({ stroke: lit ? 'url(#gk)' : 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': lit ? 0.5 : 0.3 }, [
        ...limbs.map((l) => p(l.d, { 'stroke-width': n(ladder.hair * (1 + l.depth * 0.7)) })),
      ]),
      g({ stroke: lit ? 'url(#gk)' : 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': lit ? 0.46 : 0.28 }, [
        p(foliage(cx, cy, rx, ry, { count: lit ? 150 : 100, seed: seed + 1, lit: -1, size: 0.036 })),
      ]),
      g({ stroke: lit ? '#ffffff' : 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': lit ? 0.24 : 0.16 }, [
        p(foliage(cx - rx * 0.3, cy - ry * 0.15, rx * 0.55, ry * 0.65, { count: 50, seed: seed + 2, lit: -1, size: 0.055 })),
      ]),
      g({ stroke: lit ? 'url(#gk)' : 'url(#gs)', 'stroke-width': ladder.detail, 'stroke-opacity': lit ? 0.58 : 0.34 }, [
        p(crown(cx, cy, rx, ry, 7, r2)),
      ]),
      g({ stroke: lit ? 'url(#gk)' : 'url(#gs)', 'stroke-width': ladder.structure, 'stroke-opacity': lit ? 0.82 : 0.48 }, [
        p(`${M([cx, trunkY])} ${Q([cx - 4, lerp(trunkY, cy, 0.5)], [cx, cy + ry * 0.7])}`),
      ]),
    ].join('\n');
  };

  /* Boulders below the seawall: irregular, and smaller as they recede. */
  const rocks = (seed) => {
    const rand = mulberry32(seed);
    const out = [];
    for (let i = 0; i < 26; i++) {
      const t = Math.pow(rand(), 0.55);
      const base = toVP([lerp(292, 640, rand()), lerp(392, 330, rand())], t * 0.72);
      const r = lerp(15, 3, t) * lerp(0.6, 1.3, rand());
      const pts = [];
      const sides = 5 + Math.floor(rand() * 2);
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2 + rand() * 0.4;
        pts.push([base[0] + Math.cos(a) * r * lerp(0.7, 1.25, rand()), base[1] + Math.sin(a) * r * 0.62 * lerp(0.7, 1.25, rand())]);
      }
      out.push(poly(pts, true));
    }
    return out.join(' ');
  };

  // Paving joints and the kerb lines all converge on one point.
  const converge = (from, count, spread, t0, t1) =>
    Array.from({ length: count }, (_, i) => {
      const a = [lerp(from[0], from[0] + spread, i / (count - 1)), from[1]];
      return seg(toVP(a, t0), toVP(a, t1));
    }).join(' ');

  const body = [
    tree(118, 152, 104, 42, 384, 121, true),
    tree(256, 124, 74, 30, 352, 122, false),

    // The walk. Outer kerb, seawall base, and the joints running between.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.9 }, [
      p(seg([96, 398], VP)),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.85 }, [
      p(seg([330, 398], VP)),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.34 }, [
      p(
        Array.from({ length: 7 }, (_, i) => seg([lerp(126, 306, (i + 1) / 8), 398], VP)).join(' '),
      ),
    ]),
    // Courses across the paving, spaced by the perspective series.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      p(
        Array.from({ length: 18 }, (_, i) => {
          const t = 1 - Math.pow(1 - i / 18, 2.3);
          return seg(toVP([96, 398], t), toVP([330, 398], t));
        }).join(' '),
      ),
    ]),

    // Seawall: coping, face, and the crazy-stone facing on it.
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.6 }, [
      p(seg([334, 386], VP)),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.8 }, [
      p(seg([352, 400], VP)),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.42 }, [
      p(converge([336, 396], 9, 240, 0.02, 0.16)),
    ]),

    // Rocks along the shore, then the strait beyond them.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [p(rocks(140))]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.36 }, [
      p(swell(268, 430, 640, 3, { seed: 126, amp: 5, step: 13, minSpan: 0.7 })),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.22 }, [
      p(swell(252, 470, 636, 2, { seed: 127, amp: 4, step: 11, minSpan: 0.8 })),
    ]),

    // The lamps, marching away down the walk.
    lamp(150, 392, 1),
    lamp(316, 344, 0.62),
    lamp(408, 312, 0.42),
    lamp(462, 292, 0.3),
    lamp(496, 278, 0.22),

    bench(176, 336, 1),
    bench(268, 300, 0.68),

    // Kerb line closing the lawn on the left.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.42 }, [
      p(seg([20, 372], VP)),
    ]),
  ].join('\n');

  emit(
    'rizal-boulevard.svg',
    doc({
      w, h, scale: 1.5, ladder, body,
      note: 'Rizal Boulevard — lanterns and seawall running away down the shore',
      key: { stops: [['0%', '#fed7aa'], ['28%', '#fb7185'], ['62%', '#818cf8'], ['100%', '#0ea5e9']] },
      shade: { stops: [['0%', '#3730a3'], ['60%', '#312e81'], ['100%', '#1e1b4b']] },
    }),
  );
}
/* ================================================================== *
 * 8. Acacia — one tree, properly branched
 * ================================================================== */
{
  const w = 420;
  const h = 380;
  const ladder = { contour: 3.4, structure: 2.6, detail: 1.3, hair: 0.6 };
  const rand = mulberry32(140);
  const trunkX = 198;
  const trunkY = 332;
  const forkY = 214;

  const limbs = [];
  limb(trunkX, forkY, -Math.PI / 2 - 0.06, 62, 4, limbs, rand, { spread: 0.68, shrink: 0.72, minLen: 6 });

  const body = [
    // Limbs first, so the canopy settles over them.
    g({ stroke: 'url(#gk)', 'stroke-opacity': 0.8 }, [
      ...limbs.map((l) => p(l.d, { 'stroke-width': n(ladder.hair + l.depth * 0.55) })),
    ]),

    // Canopy: leaf clumps, not a contour. Dense on the lit left, opening out
    // on the right so the branch structure shows through where it is dark.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(foliage(176, 122, 152, 46, { count: 170, seed: 141, lit: -1, size: 0.035 })),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.26 }, [
      p(foliage(138, 112, 106, 32, { count: 70, seed: 144, lit: -1, size: 0.045 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      p(foliage(278, 136, 110, 38, { count: 80, seed: 142, lit: 1, size: 0.04 })),
    ]),
    // One flat top edge holds the acacia's silhouette above all that texture.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.62 }, [
      p(crown(204, 126, 170, 50, 8, rand)),
    ]),

    // Trunk: one tapering column drawn as two matched edges. Both carry the
    // key gradient — giving one of them a white stroke of its own split the
    // trunk into two separate saplings — and the light is put on instead as
    // a short highlight tucked inside the left edge.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.9 }, [
      p(`${M([trunkX - 17, trunkY])} ${Q([trunkX - 13, 280], [trunkX - 7, forkY])}`),
      p(`${M([trunkX + 17, trunkY])} ${Q([trunkX + 13, 280], [trunkX + 7, forkY])}`),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.4 }, [
      p(`${M([trunkX - 10, trunkY - 22])} ${Q([trunkX - 8, 282], [trunkX - 3, forkY + 14])}`),
    ]),
    // Bark: four short fissures near the base, nothing more. A full hatch
    // between the trunk edges converges on the fork and fills the lower
    // trunk with a solid cone.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      p(
        hatch(
          [[trunkX - 11, 320], [trunkX + 11, 320]],
          [[trunkX - 8, 262], [trunkX + 8, 262]],
          { count: 4, seed: 143, minLen: 0.35, maxLen: 0.85 },
        ),
      ),
    ]),
    // Buttress roots, meeting the trunk edges rather than crossing them.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.65 }, [
      p(`${M([trunkX - 46, trunkY + 6])} ${Q([trunkX - 30, trunkY - 2], [trunkX - 16, trunkY - 20])}`),
      p(`${M([trunkX + 46, trunkY + 6])} ${Q([trunkX + 30, trunkY], [trunkX + 16, trunkY - 18])}`),
    ]),

    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.55 }, [
      p(seg([104, 338], [292, 338])),
    ]),
  ].join('\n');

  emit(
    'dumaguete-acacia.svg',
    doc({
      w, h, scale: 1.5, ladder, body,
      note: 'Acacia — flat crown, four generations of branching',
      key: { stops: [['0%', '#ecfccb'], ['34%', '#4ade80'], ['72%', '#14b8a6'], ['100%', '#0f766e']] },
      shade: { stops: [['0%', '#166534'], ['60%', '#14532d'], ['100%', '#052e16']] },
    }),
  );
}

/* ================================================================== *
 * 9. Village huts — a shoreline of nipa houses receding
 * ================================================================== */
{
  const w = 640;
  const h = 260;
  const ladder = { contour: 3.2, structure: 2.0, detail: 1.2, hair: 0.58 };

  /**
   * One hut. `s` scales the drawing but NOT the stroke: a distant hut is
   * small AND drawn with a proportionally heavier line, because at 1/5 scale
   * a proportionally-thinned stroke simply disappears.
   */
  const hut = (x, y, s, seed, detail) => {
    const S = (v) => v * s;
    const rand = mulberry32(seed);
    const eave = y - S(64);
    const ridge = y - S(134);
    const lit = detail >= 1;
    return [
      // Nipa thatch: courses running down the pitch. Only on the big ones.
      detail >= 2
        ? g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.42 }, [
            p(hatch([[x - S(78), eave], [x, ridge]], [[x, eave], [x, ridge]], { count: 7, seed, minLen: 0.55 })),
          ])
        : null,
      detail >= 2
        ? g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.22 }, [
            p(hatch([[x + S(78), eave], [x, ridge]], [[x, eave], [x, ridge]], { count: 6, seed: seed + 1, minLen: 0.45 })),
          ])
        : null,
      // Roof and wall silhouette.
      g({ stroke: 'url(#gk)', 'stroke-width': n(ladder.structure / Math.sqrt(s)), 'stroke-opacity': 0.92 }, [
        p(poly([[x - S(78), eave], [x, ridge], [x + S(78), eave]])),
        p(poly([[x - S(60), eave], [x - S(60), y], [x + S(60), y], [x + S(60), eave]])),
      ]),
      g({ stroke: '#ffffff', 'stroke-width': n(ladder.detail / Math.sqrt(s)), 'stroke-opacity': lit ? 0.5 : 0.7 }, [
        p(poly([[x - S(78), eave], [x, ridge], [x + S(8), ridge + S(6)]])),
      ]),
      g({ stroke: 'url(#gk)', 'stroke-width': n(ladder.detail / Math.sqrt(s)), 'stroke-opacity': 0.75 }, [
        p(seg([x - S(70), eave], [x + S(70), eave])),
      ]),
      // A lit doorway — the only warm mark on a dark shore.
      detail >= 1
        ? g({ stroke: '#ffffff', 'stroke-width': n(ladder.detail / Math.sqrt(s)), 'stroke-opacity': 0.55 }, [
            p(`M${n(x - S(20))} ${n(y)} L${n(x - S(20))} ${n(y - S(38))} L${n(x + S(20))} ${n(y - S(38))} L${n(x + S(20))} ${n(y)}`),
          ])
        : null,
      // Stilts.
      g({ stroke: 'url(#gk)', 'stroke-width': n(ladder.hair / s), 'stroke-opacity': 0.6 }, [
        p(
          [-0.78, -0.26, 0.26, 0.78]
            .slice(0, detail >= 1 ? 4 : 2)
            .map((f) => seg([x + S(60 * f), y], [x + S(60 * f) + (rand() - 0.5) * 3, y + S(38)]))
            .join(' '),
        ),
      ]),
      detail >= 2
        ? g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
            p(courses(x - S(56), x + S(56), y - S(56), y - S(6), 5, { seed: seed + 2 })),
          ])
        : null,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const body = [
    hut(96, 196, 1, 150, 2),
    hut(268, 184, 0.72, 153, 2),
    hut(398, 176, 0.5, 156, 1),
    hut(486, 172, 0.36, 159, 0),
    hut(552, 169, 0.27, 162, 0),
    hut(602, 167, 0.2, 165, 0),

    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.5 }, [
      p(swell(228, 0, 640, 1, { seed: 166, amp: 5, step: 0, minSpan: 1 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.42 }, [
      p(swell(240, 20, 620, 2, { seed: 167, amp: 6, step: 12 })),
    ]),
    // Lamp reflections under the two nearest huts.
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.28 }, [
      p(swell(236, 70, 122, 3, { seed: 168, amp: 3, step: 10, minSpan: 0.85 })),
      p(swell(232, 250, 288, 3, { seed: 169, amp: 2, step: 9, minSpan: 0.85 })),
    ]),
  ].join('\n');

  emit(
    'village-huts.svg',
    doc({
      w, h, scale: 1.4, ladder, body,
      note: 'Nipa houses on stilts, six of them receding along the shore',
      key: { stops: [['0%', '#fde68a'], ['32%', '#fb923c'], ['68%', '#f43f5e'], ['100%', '#86198f']] },
      shade: { stops: [['0%', '#9d174d'], ['60%', '#831843'], ['100%', '#4a044e']] },
    }),
  );
}

/* ================================================================== *
 * 10. The pier — harbour light, ferry at berth, piles
 * ================================================================== */
{
  const w = 560;
  const h = 340;
  const deck = 214;
  const ladder = { contour: 3.4, structure: 2.1, detail: 1.25, hair: 0.58 };

  const body = [
    // Harbour light: batter, coursing, gallery, lantern.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      p(courses(88, 110, 116, deck - 8, 9, { seed: 170 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.18 }, [
      p(courses(112, 132, 116, deck - 8, 8, { seed: 171 })),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.92 }, [
      p(poly([[84, deck], [92, 108], [128, 108], [136, deck]])),
      p(seg([86, 108], [134, 108])),
      p(poly([[94, 108], [94, 84], [126, 84], [126, 108]])),
      p(seg([90, 84], [130, 84])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.55 }, [
      p(seg([88, deck - 8], [95.5, 112])),
      p(seg([88, 160], [132, 160])),
    ]),
    // Lantern room: white, the brightest thing on the water.
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.9 }, [
      p('M98 84 Q110 58 122 84'),
      p('M110 58 L110 42'),
      p(comb(100, 120, 68, 84, 3, { seed: 172 })),
    ]),
    // The beam: two edges and one axis, kept short. Four evenly spaced rays
    // fanning the full width of the frame read as stray scratches rather
    // than as light leaving a lantern.
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.22 }, [
      p(seg([136, 90], [246, 66])),
      p(seg([136, 102], [242, 116])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.12 }, [
      p(seg([136, 96], [226, 92])),
    ]),

    // Ferry at berth.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.82 }, [
      p(poly([[300, deck], [318, 178], [470, 178], [488, deck]], true)),
      p(poly([[336, 178], [336, 138], [438, 138], [438, 178]])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(seg([318, 178], [470, 178])),
      // Portholes read as a row of small bright marks.
      p([348, 366, 384, 402, 420].map((x) => seg([x, 156], [x + 8, 156])).join(' ')),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.7 }, [
      p(poly([[404, 138], [404, 104], [420, 104], [420, 138]])),
      p(seg([370, 138], [370, 112])),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.35 }, [
      p(courses(306, 482, 186, 208, 4, { seed: 173, minLen: 0.75 })),
    ]),

    // Deck.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.9 }, [
      p(seg([18, deck], [542, deck])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.35 }, [
      p(seg([18, deck - 3], [542, deck - 3])),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.6 }, [
      p(seg([18, 226], [542, 226])),
    ]),
    // Piles: raked, varied length, the texture band of the piece.
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.6 }, [
      p(comb(50, 500, 226, 292, 12, { seed: 174, sway: 9 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.3 }, [
      p(seg([40, 258], [512, 258])),
      p(comb(74, 476, 236, 276, 11, { seed: 175, sway: 7 })),
    ]),

    // Bollards.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.65 }, [
      p('M182 214 L182 200 L194 200 L194 214'),
      p('M262 214 L262 200 L274 200 L274 214'),
    ]),

    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.36 }, [
      p(swell(300, 24, 536, 3, { seed: 176, amp: 7, step: 17 })),
    ]),
    // Lantern reflection, straight down from the light.
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.26 }, [
      p(swell(296, 88, 134, 4, { seed: 177, amp: 3, step: 12, minSpan: 0.85 })),
    ]),
  ].join('\n');

  emit(
    'dumaguete-pier.svg',
    doc({
      w, h, scale: 1.5, ladder, body,
      note: 'Pier head — harbour light, ferry at berth, raked piles',
      key: { stops: [['0%', '#fef3c7'], ['34%', '#fb923c'], ['72%', '#f43f5e'], ['100%', '#9d174d']] },
      shade: { stops: [['0%', '#7f1d1d'], ['60%', '#881337'], ['100%', '#4c0519']] },
    }),
  );
}

/* ================================================================== *
 * 11. Palms — rachis and leaflets, not bare arcs
 * ================================================================== */
{
  const w = 380;
  const h = 420;
  const ladder = { contour: 3.2, structure: 2.4, detail: 1.2, hair: 0.62 };

  const palm = (x, y, height, lean, seedBase, count, lit) => {
    const crownX = x + lean;
    const crownY = y - height;
    const fronds = [];
    for (let i = 0; i < count; i++) {
      // Fronds spread through the upper three-quarters of the circle only —
      // a full 180° sweep sends the outermost pair straight sideways and the
      // crown loses its arch.
      const a = Math.PI - 0.22 + (i / (count - 1)) * (Math.PI + 0.44);
      const angle = a + (i % 2 ? 0.09 : -0.07);
      const len = height * lerp(0.3, 0.42, ((i * 7) % 5) / 4);
      fronds.push({
        ...frond(crownX, crownY, angle, len, {
          droop: 0.8 + (i % 3) * 0.2,
          leaflets: 8,
          seed: seedBase + i,
          leafLen: 0.17,
        }),
        left: Math.cos(angle) < 0,
      });
    }
    return [
      // Leaflets first, under everything.
      g({ stroke: lit ? 'url(#gk)' : 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': lit ? 0.5 : 0.32 }, [
        ...fronds.filter((f) => !f.left).map((f) => p(f.blades)),
      ]),
      g({ stroke: lit ? '#ffffff' : 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': lit ? 0.34 : 0.22 }, [
        ...fronds.filter((f) => f.left).map((f) => p(f.blades)),
      ]),
      // Rachis: the structural line of each frond.
      g({ stroke: lit ? 'url(#gk)' : 'url(#gs)', 'stroke-width': ladder.detail, 'stroke-opacity': lit ? 0.85 : 0.5 }, [
        ...fronds.map((f) => p(f.rachis)),
      ]),
      // Trunk: heavy, tapering, with ring scars on the lit side.
      g({ stroke: lit ? 'url(#gk)' : 'url(#gs)', 'stroke-width': ladder.contour, 'stroke-opacity': lit ? 0.88 : 0.55 }, [
        p(`${M([x, y])} ${Q([x + lean * 0.15 - 12, lerp(y, crownY, 0.55)], [crownX, crownY])}`),
      ]),
      // Ring scars. Evenly spaced they read as a ladder, so they thin and
      // crowd toward the crown the way the real growth rings do.
      g({ stroke: lit ? '#ffffff' : 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': lit ? 0.36 : 0.22 }, [
        p(
          Array.from({ length: 9 }, (_, i) => {
            const t = 0.1 + (i / 9) ** 1.25 * 0.8;
            const cx = lerp(x, crownX, t) + Math.sin(t * Math.PI) * (lean * 0.15 - 12) * 0.9;
            const cy = lerp(y, crownY, t);
            const half = lerp(7, 3.5, t);
            return seg([cx - half, cy], [cx + half, cy - 1.5]);
          }).join(' '),
        ),
      ]),
      // Coconuts.
      lit
        ? g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.55 }, [
            `<circle cx="${n(crownX - 9)}" cy="${n(crownY + 15)}" r="5.5" />`,
            `<circle cx="${n(crownX + 8)}" cy="${n(crownY + 18)}" r="5" />`,
            `<circle cx="${n(crownX + 1)}" cy="${n(crownY + 25)}" r="4.5" />`,
          ])
        : null,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const body = [
    // The two crowns must not overlap or they merge into one shrub: the
    // shorter palm leans away and sits a full crown-width to the right.
    palm(268, 380, 214, 44, 180, 7, false),
    palm(130, 378, 306, -18, 200, 9, true),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.45 }, [
      p(seg([64, 384], [312, 384])),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.35 }, [
      p(swell(396, 40, 340, 1, { seed: 181, amp: 5, step: 0, minSpan: 1 })),
    ]),
  ].join('\n');

  emit(
    'palm-cluster.svg',
    doc({
      w, h, scale: 1.5, ladder, body,
      note: 'Two coconut palms — arching rachis, combed leaflets, ring scars',
      key: { stops: [['0%', '#ecfccb'], ['34%', '#84cc16'], ['70%', '#10b981'], ['100%', '#115e59']] },
      shade: { stops: [['0%', '#3f6212'], ['60%', '#365314'], ['100%', '#1a2e05']] },
    }),
  );
}

/* ================================================================== *
 * 12. Bangka — outriggers, which the old drawing did not have at all
 * ================================================================== */
{
  const w = 600;
  const h = 240;
  const ladder = { contour: 3.2, structure: 2.0, detail: 1.2, hair: 0.58 };

  /**
   * A bangka without its twin bamboo floats is just a canoe, and a float
   * drawn as one long arc under the hull is a rocking chair. Seen side-on the
   * outrigger resolves into three separate things: a slim spindle float
   * riding low and outboard on the near side, a matching one sitting higher
   * and dimmer behind the hull, and short raked spars joining each to the
   * gunwale. It is the gap between those two floats that reads as width.
   */
  const bangka = (x, y, s, seed, lit, detail = 2) => {
    const S = (v) => v * s;
    const sw = (base) => n(base / Math.sqrt(s));
    const sheer = y - S(22);
    const key = lit ? 'url(#gk)' : 'url(#gs)';
    // A float is a bamboo pole: dead straight for its whole length with the
    // ends whipped up. Drawing it as an arc echoing the hull stacked three
    // concentric crescents on top of each other and the boat read as a
    // rocking chair.
    const spindle = (yy, half, rise) =>
      `${M([x - S(half), yy - S(rise)])} ${Q([x - S(half * 0.78), yy], [x - S(half * 0.6), yy])} ` +
      `${L([x + S(half * 0.6), yy])} ${Q([x + S(half * 0.78), yy], [x + S(half), yy - S(rise)])}`;

    return [
      // Far float and its spars, behind the hull: higher on the page, dimmer,
      // and shorter, because it is further away.
      g({ stroke: 'url(#gs)', 'stroke-width': sw(ladder.hair), 'stroke-opacity': lit ? 0.5 : 0.32 }, [
        p(spindle(y - S(38), 88, 7)),
        p(seg([x - S(30), sheer + S(2)], [x - S(56), y - S(37)])),
        p(seg([x + S(32), sheer + S(2)], [x + S(58), y - S(37)])),
      ]),

      // Hull: a long shallow crescent with both stem and stern raked up.
      g({ stroke: key, 'stroke-width': sw(ladder.structure), 'stroke-opacity': lit ? 0.92 : 0.6 }, [
        p(
          `${M([x - S(92), sheer - S(16)])} ${Q([x - S(74), sheer - S(1)], [x - S(46), sheer])} ` +
            `${L([x + S(46), sheer])} ${Q([x + S(74), sheer - S(1)], [x + S(92), sheer - S(14)])}`,
        ),
        p(
          `${M([x - S(92), sheer - S(16)])} ${Q([x - S(52), y + S(4)], [x, y + S(7)])} ` +
            `${Q([x + S(52), y + S(4)], [x + S(92), sheer - S(14)])}`,
        ),
      ]),
      g({ stroke: lit ? '#ffffff' : 'url(#gs)', 'stroke-width': sw(ladder.hair), 'stroke-opacity': lit ? 0.5 : 0.28 }, [
        p(`${M([x - S(46), sheer + S(3)])} ${L([x + S(46), sheer + S(3)])}`),
      ]),

      // Near float, riding at the waterline well outboard, and its spars.
      g({ stroke: key, 'stroke-width': sw(ladder.detail), 'stroke-opacity': lit ? 0.85 : 0.5 }, [
        p(seg([x - S(28), sheer + S(2)], [x - S(70), y + S(30)])),
        p(seg([x + S(30), sheer + S(2)], [x + S(72), y + S(30)])),
        p(spindle(y + S(30), 112, 9)),
      ]),

      // Mast and lateen sail.
      detail >= 1
        ? g({ stroke: key, 'stroke-width': sw(ladder.structure), 'stroke-opacity': lit ? 0.9 : 0.55 }, [
            p(seg([x - S(34), sheer], [x - S(34), y - S(98)])),
            p(poly([[x - S(34), y - S(98)], [x + S(34), y - S(46)], [x - S(34), y - S(44)]], true)),
          ])
        : null,
      detail >= 2
        ? g({ stroke: lit ? '#ffffff' : 'url(#gs)', 'stroke-width': sw(ladder.hair), 'stroke-opacity': lit ? 0.4 : 0.24 }, [
            p(
              hatch(
                [[x - S(34), y - S(94)], [x - S(34), y - S(46)]],
                [[x + S(28), y - S(48)], [x - S(30), y - S(45)]],
                { count: 6, seed, minLen: 0.55 },
              ),
            ),
          ])
        : null,
      // Bamboo lashing across the hull.
      detail >= 2
        ? g({ stroke: 'url(#gs)', 'stroke-width': sw(ladder.hair), 'stroke-opacity': 0.45 }, [
            p(comb(x - S(34), x + S(34), sheer + S(2), y + S(2), 5, { seed: seed + 1 })),
          ])
        : null,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const body = [
    bangka(126, 140, 1, 190, true, 2),
    bangka(340, 122, 0.6, 193, false, 2),
    bangka(486, 110, 0.38, 196, false, 1),
    bangka(566, 104, 0.24, 199, false, 0),

    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.45 }, [
      p(swell(178, 0, 600, 2, { seed: 200, amp: 7, step: 16 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.3 }, [
      p(swell(206, 30, 570, 2, { seed: 201, amp: 6, step: 14 })),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.25 }, [
      p(swell(172, 60, 200, 3, { seed: 202, amp: 3, step: 11, minSpan: 0.85 })),
    ]),
  ].join('\n');

  emit(
    'bangka-flotilla.svg',
    doc({
      w, h, scale: 1.4, ladder, body,
      note: 'Bangka — twin bamboo outriggers, lateen sail, four hulls receding',
      key: { stops: [['0%', '#cffafe'], ['34%', '#22d3ee'], ['72%', '#3b82f6'], ['100%', '#5b21b6']] },
      shade: { stops: [['0%', '#1e40af'], ['60%', '#1e3a8a'], ['100%', '#172554']] },
    }),
  );
}

/* ================================================================== *
 * 13. Bais dolphins — spinners breaching
 * ================================================================== */
{
  const w = 520;
  const h = 300;
  const ladder = { contour: 3.2, structure: 2.0, detail: 1.2, hair: 0.58 };

  /** A few short strokes hung off the cape, running with the body's length. */
  const capeTone = (len, rot, x, y, seed, flip = 1) => {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const P = ([u, v]) => [x + u * len * c - v * len * flip * s, y + u * len * s + v * len * flip * c];
    return hatch(
      [P([0.26, -0.086]), P([0.46, -0.098]), P([0.7, -0.068])],
      [P([0.26, -0.012]), P([0.46, 0.01]), P([0.7, -0.002])],
      { count: 7, seed, minLen: 0.25, maxLen: 0.6 },
    );
  };

  const draw = (d, lit, s) => {
    const key = lit ? 'url(#gk)' : 'url(#gs)';
    const sw = (base) => n(base / Math.sqrt(s));
    return [
      g({ stroke: key, 'stroke-width': sw(ladder.structure), 'stroke-opacity': lit ? 0.95 : 0.6 }, [
        p(d.body),
        p(d.dorsal),
        p(d.fluke),
      ]),
      g({ stroke: lit ? 'url(#gk)' : 'url(#gs)', 'stroke-width': sw(ladder.detail), 'stroke-opacity': lit ? 0.6 : 0.34 }, [
        p(d.cape),
      ]),
      g({ stroke: lit ? '#ffffff' : 'url(#gs)', 'stroke-width': sw(ladder.detail), 'stroke-opacity': lit ? 0.65 : 0.4 }, [
        p(d.flipper),
        p(d.crease),
        p(d.mouth),
      ]),
      g({ stroke: '#ffffff', 'stroke-width': sw(ladder.detail), 'stroke-opacity': lit ? 0.9 : 0.5 }, [
        p(d.eye),
        p(d.blowhole),
      ]),
    ].join('\n');
  };

  const lead = dolphin(84, 232, 210, -0.78);
  const second = dolphin(276, 250, 140, -0.66);
  const third = dolphin(390, 258, 88, -0.52);

  const body = [
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.4 }, [
      p(capeTone(210, -0.78, 84, 232, 210)),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.26 }, [
      p(capeTone(140, -0.66, 276, 250, 211)),
    ]),

    draw(third, false, 0.45),
    draw(second, false, 0.7),
    draw(lead, true, 1),

    // Spray where each animal broke the surface, and its wake.
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.5 }, [
      p(fan([96, 244], [56, 272], [146, 266], { count: 7, seed: 213, t0: 0.05, t1: 0.75 })),
      p(fan([284, 256], [254, 276], [326, 272], { count: 5, seed: 214, t0: 0.05, t1: 0.7 })),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.contour, 'stroke-opacity': 0.55 }, [
      p(swell(258, 20, 500, 1, { seed: 215, amp: 8, step: 0, minSpan: 1 })),
    ]),
    g({ stroke: 'url(#gs)', 'stroke-width': ladder.hair, 'stroke-opacity': 0.38 }, [
      p(swell(272, 40, 480, 2, { seed: 216, amp: 7, step: 15 })),
    ]),
  ].join('\n');

  emit(
    'bais-dolphins.svg',
    doc({
      w, h, scale: 1.4, ladder, body,
      note: 'Bais spinners — three breaching, counter-shaded along the flank',
      key: { stops: [['0%', '#cffafe'], ['32%', '#38bdf8'], ['70%', '#818cf8'], ['100%', '#c026d3']] },
      shade: { stops: [['0%', '#1e40af'], ['60%', '#312e81'], ['100%', '#1e1b4b']] },
    }),
  );
}

/* ================================================================== *
 * Distant variants
 *
 * The same file cannot serve an 11-unit ridge and a 1.4-unit smudge on the
 * horizon: hatching that reads as tone up close turns to grey mush when it is
 * mipped down five levels. These three are drawn for the far field — few
 * lines, heavy relative weight, almost no colour. They are the "small and
 * white" end of the set, and they are what gives the scatter its depth.
 * ================================================================== */
{
  const w = 720;
  const h = 280;
  const ladder = { contour: 5.5, structure: 3.4, detail: 2.2, hair: 1.4 };
  /**
   * A far range is not a zigzag. Equal peaks joined by straight segments plot
   * as a line chart — which is precisely what the first attempt looked like.
   * Distance reads through three things instead: broad asymmetric masses with
   * one dominant summit each, concave slopes rather than straight ones, and
   * bands that get flatter and paler as they recede.
   */
  const range = (pts) => {
    let d = M(pts[0]);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      // Pull the control point toward the higher end so slopes hollow out.
      const t = a[1] < b[1] ? 0.72 : 0.28;
      d += ` ${Q([lerp(a[0], b[0], t), lerp(a[1], b[1], 0.12)], b)}`;
    }
    return d;
  };

  const body = [
    // Back band: flattest, palest, almost lost in the haze.
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.22 }, [
      p(range([[0, 214], [110, 176], [220, 190], [360, 158], [500, 184], [620, 170], [720, 188]])),
    ]),
    // Middle band: one clear summit left of centre, one lesser one right.
    g({ stroke: '#ffffff', 'stroke-width': ladder.detail, 'stroke-opacity': 0.3 }, [
      p(range([[0, 244], [96, 196], [188, 128], [286, 172], [372, 148], [470, 200], [578, 176], [668, 206], [720, 198]])),
    ]),
    // Front band: heaviest, and the only one carrying colour.
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.4 }, [
      p(range([[0, 262], [128, 224], [242, 186], [352, 226], [468, 204], [592, 232], [720, 222]])),
    ]),
    g({ stroke: '#ffffff', 'stroke-width': ladder.hair, 'stroke-opacity': 0.16 }, [
      p(swell(206, 120, 620, 2, { seed: 220, amp: 5, step: 20, minSpan: 0.7 })),
    ]),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.structure, 'stroke-opacity': 0.44 }, [
      p(seg([0, 264], [720, 264])),
    ]),
  ].join('\n');
  emit(
    'far-ridge.svg',
    doc({
      w, h, scale: 1.1, ladder, body,
      note: 'Far range — haze only, no detail, heavy relative weight',
      key: { stops: [['0%', '#a5b4fc'], ['50%', '#60a5fa'], ['100%', '#1e3a8a']] },
      shade: { stops: [['0%', '#334155'], ['100%', '#0f172a']] },
    }),
  );
}

{
  const w = 640;
  const h = 200;
  const ladder = { contour: 4.6, structure: 3.0, detail: 2.0, hair: 1.3 };
  const hut = (x, y, s, seed) => {
    const S = (v) => v * s;
    const rand = mulberry32(seed);
    // Pitch varies house to house — identical roofs read as a repeated icon.
    const peak = S(88) * lerp(0.88, 1.16, rand());
    const sw = n(ladder.structure * (0.75 / s) ** 0.5);
    return [
      g({ stroke: '#ffffff', 'stroke-width': sw, 'stroke-opacity': 0.5 }, [
        p(poly([[x - S(56), y - S(44)], [x, y - peak], [x + S(56), y - S(44)]])),
        p(poly([[x - S(40), y - S(44)], [x - S(40), y], [x + S(40), y], [x + S(40), y - S(44)]])),
      ]),
      // Stilts and their reflection: without them the houses float.
      g({ stroke: '#ffffff', 'stroke-width': n(sw * 0.7), 'stroke-opacity': 0.3 }, [
        p([-0.8, -0.28, 0.28, 0.8].map((f) => seg([x + S(40 * f), y], [x + S(40 * f), y + S(30)])).join(' ')),
      ]),
    ].join('\n');
  };
  const body = [
    hut(84, 148, 1, 231),
    hut(216, 142, 0.78, 232),
    hut(328, 137, 0.6, 233),
    hut(424, 133, 0.46, 234),
    hut(502, 130, 0.35, 235),
    hut(564, 128, 0.26, 236),
    hut(612, 126, 0.19, 237),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.42 }, [
      p(swell(172, 0, 640, 2, { seed: 230, amp: 6, step: 18, minSpan: 0.8 })),
    ]),
  ].join('\n');
  emit(
    'far-huts.svg',
    doc({
      w, h, scale: 1.1, ladder, body,
      note: 'Far shore — moonlit roofs, two strokes each',
      key: { stops: [['0%', '#fef3c7'], ['60%', '#fdba74'], ['100%', '#be123c']] },
      shade: { stops: [['0%', '#7f1d1d'], ['100%', '#450a0a']] },
    }),
  );
}

{
  const w = 600;
  const h = 180;
  const ladder = { contour: 4.4, structure: 2.8, detail: 1.9, hair: 1.2 };
  const boat = (x, y, s) => {
    const S = (v) => v * s;
    const sw = n(ladder.structure * (0.8 / s) ** 0.5);
    return [
      g({ stroke: '#ffffff', 'stroke-width': sw, 'stroke-opacity': 0.46 }, [
        p(`${M([x - S(60), y - S(12)])} ${Q([x, y + S(12)], [x + S(60), y - S(12)])}`),
        p(seg([x - S(28), y - S(12)], [x - S(28), y - S(62)])),
        p(poly([[x - S(28), y - S(62)], [x + S(26), y - S(30)], [x - S(28), y - S(28)]], true)),
      ]),
      g({ stroke: 'url(#gk)', 'stroke-width': n(sw * 0.6), 'stroke-opacity': 0.4 }, [
        p(seg([x - S(84), y - S(2)], [x + S(86), y - S(2)])),
      ]),
    ].join('\n');
  };
  const body = [
    boat(96, 112, 1),
    boat(268, 102, 0.66),
    boat(400, 95, 0.46),
    boat(498, 90, 0.32),
    boat(566, 87, 0.22),
    g({ stroke: 'url(#gk)', 'stroke-width': ladder.detail, 'stroke-opacity': 0.38 }, [
      p(swell(134, 0, 600, 2, { seed: 240, amp: 6, step: 20, minSpan: 0.8 })),
    ]),
  ].join('\n');
  emit(
    'far-bangka.svg',
    doc({
      w, h, scale: 1.1, ladder, body,
      note: 'Far flotilla — sails only, white on the horizon',
      key: { stops: [['0%', '#a5f3fc'], ['60%', '#38bdf8'], ['100%', '#1d4ed8']] },
      shade: { stops: [['0%', '#1e3a8a'], ['100%', '#172554']] },
    }),
  );
}

/* ------------------------------------------------------------------ */

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, contents] of Object.entries(files)) {
  writeFileSync(path.join(OUT_DIR, name), contents, 'utf8');
}
console.log(`landmarks: wrote ${Object.keys(files).length} files to ${path.relative(process.cwd(), OUT_DIR)}`);
