/**
 * GLSL for the Crown of Light stage.
 *
 * Everything here is authored in linear-ish space and composited by
 * `postFragmentShader`, which owns tone mapping, bloom, vignette and dither.
 * Nothing in this file should call `discard`: the glow layers are additively
 * blended, so a black fragment is already a no-op and keeping early-Z intact
 * is worth more than the skipped blend.
 */

/* ------------------------------------------------------------------ *
 * Shared chunks
 * ------------------------------------------------------------------ */

const NOISE = /* glsl */ `
  vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
  }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // Value noise — cheaper than simplex and smooth enough for atmosphere.
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // Octave count is the single biggest fragment cost in the backdrop, so the
  // low-power build halves it rather than dropping the effect entirely.
  #ifdef QUALITY_LOW
    #define FBM_OCTAVES 2
  #else
    #define FBM_OCTAVES 4
  #endif

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < FBM_OCTAVES; i++) {
      v += a * vnoise(p);
      p = rot * p * 2.02;
      a *= 0.5;
    }
    return v;
  }
`;

/** Interleaved-gradient noise. Ordered, tiny, and kills gradient banding. */
const DITHER = /* glsl */ `
  float ign(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
  }
`;

/* ------------------------------------------------------------------ *
 * Backdrop — the sky, the sea glow and the crown's light shafts
 * ------------------------------------------------------------------ */

export const backdropVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const backdropFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uIntensity;

  ${NOISE}
  ${DITHER}

  // Rotating volumetric shafts fanning out from the crown.
  float crownShafts(vec2 p, float t) {
    float a = atan(p.y, p.x);
    float r = length(p);
    // Three overlaid fans at different rates read as volume, not as a pinwheel.
    float s = sin(a * 9.0 + t * 0.13) * 0.5 + 0.5;
    s *= sin(a * 5.0 - t * 0.09) * 0.5 + 0.5;
    s = pow(s, 2.6);
    // Shafts are born just outside the logo and die before the frame edge.
    float radial = smoothstep(0.02, 0.22, r) * smoothstep(1.05, 0.30, r);
    return s * radial;
  }

  void main() {
    // The quad is locked to the camera and cut slightly oversize, so the
    // parallax happens in the sampling rather than by moving the mesh.
    vec2 uv = (vUv - 0.5) / 1.08 + 0.5;
    uv -= vec2(uMouse.x * 0.022, uMouse.y * 0.014);

    // --- vertical ground: obsidian sky over an emerald sea pool ---
    // Linear-light values solved so the composite lands on the intended
    // sRGB swatches (#050b08 → #1b5c3e) after exposure, ACES and encode.
    vec3 skyDeep    = vec3(0.0034, 0.0061, 0.0048);
    vec3 skyMid     = vec3(0.0053, 0.0122, 0.0079);
    vec3 seaGlow    = vec3(0.0070, 0.0324, 0.0180);
    vec3 seaHot     = vec3(0.0137, 0.0595, 0.0352);
    vec3 floorAnchor= vec3(0.0022, 0.0048, 0.0039);

    // Slow fluid undulation on the horizon pool.
    float swell = fbm(vec2(uv.x * 2.4 + uTime * 0.035, uv.y * 1.6 - uTime * 0.02)) - 0.5;

    vec2 glowCenter = vec2(0.5 + uMouse.x * 0.05, 0.205 + uMouse.y * 0.03);
    vec2 dGlow = (uv - glowCenter) * vec2(1.02, 1.72);
    float glowDist = length(dGlow) + swell * 0.16;

    float pool = smoothstep(0.80, 0.0, glowDist);

    vec3 col = mix(skyDeep, skyMid, smoothstep(0.92, 0.30, uv.y));
    col = mix(col, seaGlow, pool * 0.9);
    col = mix(col, seaHot, pow(pool, 2.6) * 0.72);
    col = mix(floorAnchor, col, smoothstep(0.0, 0.14, uv.y));

    // --- aurora ribbons drifting across the upper field ---
    vec2 ap = vec2(uv.x * 2.1 - uTime * 0.016, uv.y * 3.4);
    float ribbon = fbm(ap);
    ribbon = smoothstep(0.52, 0.86, ribbon);
    float ribbonBand = smoothstep(0.32, 0.75, uv.y) * smoothstep(1.02, 0.78, uv.y);
    col += vec3(0.0221, 0.0746, 0.0457) * ribbon * ribbonBand * 0.42;

    // --- the crown's light shafts ---
    vec2 crownP = (uv - vec2(0.5, 0.565)) * vec2(1.35, 1.0);
    float shafts = crownShafts(crownP, uTime);
    // Break the fan with drifting noise so it reads as haze, not geometry.
    shafts *= 0.45 + 0.55 * fbm(crownP * 3.1 + vec2(uTime * 0.05, -uTime * 0.03));
    col += vec3(0.0577, 0.0395, 0.0164) * shafts * 0.62;
    col += vec3(0.0153, 0.0441, 0.0290) * shafts * 0.26;

    // --- a faint high star field, fading out toward the sea ---
    #ifndef QUALITY_LOW
      vec2 sp = uv * vec2(160.0, 96.0);
      vec2 starCell = fract(sp) - 0.5;
      vec2 starId = floor(sp);
      float starSeed = hash12(starId);
      float starMask = smoothstep(0.9915, 1.0, starSeed);
      float starDistance = length(starCell);
      float starCore = exp(-starDistance * starDistance * 46.0);
      float starRayX = exp(-abs(starCell.y) * 38.0) * exp(-abs(starCell.x) * 4.0);
      float starRayY = exp(-abs(starCell.x) * 38.0) * exp(-abs(starCell.y) * 4.0);
      float starRays = max(starRayX, starRayY) * smoothstep(0.48, 0.08, starDistance);
      float star = (starCore * 0.76 + starRays * 0.24) * smoothstep(0.46, 0.0, starDistance) * starMask;
      float twinkle = 0.6 + 0.4 * sin(uTime * 1.7 + hash12(starId + 3.3) * 62.8);
      col += vec3(0.2100, 0.2400, 0.2600) * star * twinkle * smoothstep(0.52, 1.0, uv.y) * 0.55;
    #endif

    col *= uIntensity;

    // Ordered dither before the 8-bit write; this is what removes the
    // stair-stepping the old radial gradient showed across the whole sky.
    col += (ign(gl_FragCoord.xy) - 0.5) / 255.0;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ------------------------------------------------------------------ *
 * Landmarks — Dumaguete silhouettes revealed by a cursor torch
 * ------------------------------------------------------------------ */

export const landmarkVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  uniform vec2 uMouse;
  uniform float uParallax;

  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.x += uMouse.x * uParallax;
    pos.y += uMouse.y * (uParallax * 0.6);
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const landmarkFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  uniform sampler2D uTexture;
  uniform vec2 uMouse;
  uniform float uTime;
  uniform float uPresence;
  /* 0 until the pointer is actually on the page, 1 once it is. Without this
     the torch sits parked at screen centre on load, lighting the middle of
     the skyline before anyone has moved a mouse. */
  uniform float uTorch;
  /* Torch centre in world space. It has to be computed on the CPU, where the
     stage's fit scale and vertical offset are known — deriving it from uMouse
     in here assumes an unscaled world and the pool drifts off the cursor at
     every viewport except one. */
  uniform vec2 uTorchPos;
  /* xy = centre of the wordmark in world space, z = its radius.
     The skyline is held back inside this circle. */
  uniform vec3 uKeepOut;
  /* Resting level. Near zero where there is a cursor to reveal with, lifted a
     little on touch, which has no hover to offer and would otherwise never
     see the skyline at all. */
  uniform float uRest;

  /* The skyline is atmosphere, never subject. At rest it is barely there —
     a suggestion of a coastline, not a drawing you read — and the cursor
     lifts a pool of it as you sweep across. Even lit it stops at MAX_REVEAL,
     so the wordmark and the type in front of it always win. */
  const float MAX_REVEAL = 0.8;

  void main() {
    vec4 tex = texture2D(uTexture, vUv);

    // Torch cone tracking the cursor through world space.
    float dist = length(vWorldPosition.xy - uTorchPos);

    /* A tighter pool than before, and squared so it falls away fast at the
       rim. The old cone reached nearly five units with a linear-ish edge,
       which lit most of the stage at once and left the whole layer reading
       as permanently on. */
    /* Full brightness at the centre, falling away fast at the rim. Squaring
       the whole curve (the first attempt) dimmed the middle of the pool too,
       and the reveal stopped being worth hovering for. */
    float spread = pow(smoothstep(3.9, 0.2, dist), 1.7);
    float core = smoothstep(1.7, 0.0, dist);

    // A slow breath keeps the resting state from looking like a dead layer.
    float rest = uRest * (1.0 + 0.22 * sin(uTime * 0.5 + vWorldPosition.x * 0.4));
    float reveal = min(rest + spread * MAX_REVEAL * uTorch, MAX_REVEAL) * uPresence;

    /* Protect the focal point.
       
       The torch follows the cursor, and the cursor spends most of its time
       near the middle of the hero — which is exactly where the wordmark is.
       So the loudest thing on the page kept lighting a cathedral directly
       behind the mark. Whatever else "premium" means, it does not mean
       detail competing with the logo for the same pixels. The skyline fades
       out inside the mark's radius and returns just beyond it. */
    float keep = smoothstep(uKeepOut.z * 0.55, uKeepOut.z * 1.5, length(vWorldPosition.xy - uKeepOut.xy));
    reveal *= mix(0.06, 1.0, keep);

    // Shimmer travelling along the drawn strokes.
    float shimmer = 1.0 + 0.09 * sin(vUv.x * 22.0 + vUv.y * 15.0 - uTime * 1.4 + dist * 1.6);

    // Warm gold in the torch core, cool emerald at the edge of the cone: the
    // silhouettes pick up the stage lighting instead of self-illuminating.
    vec3 warm = vec3(1.00, 0.80, 0.44);
    vec3 cool = vec3(0.24, 0.66, 0.48);
    vec3 lit = mix(cool, warm, core);

    // The torch warms the piece toward gold at its core, but only as a partial
    // mix: each landmark carries its own gradient and that colour is its
    // identity in the scatter, so the lighting must not overwrite it.
    vec3 col = tex.rgb * (0.8 + core * 1.3) * shimmer;
    col = mix(col, col * lit * 1.85, 0.36);
    col += lit * spread * uTorch * 0.12;

    gl_FragColor = vec4(col * reveal, tex.a * reveal);
  }
`;

/* ------------------------------------------------------------------ *
 * Fireworks — slow perimeter bursts framing the crown
 * ------------------------------------------------------------------ */

export const fireworksVertexShader = /* glsl */ `
  varying vec2 vUv;
  uniform vec2 uMouse;

  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.x += uMouse.x * 0.25;
    pos.y += uMouse.y * 0.15;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const fireworksFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;

  ${NOISE}

  const float CYCLE = 11.0;
  const float RISE = 3.4;
  const float BLOOM = 6.6;

  /**
   * One shell: rises from the sea line, detonates, and weeps.
   *
   * The whole body is guarded by a bounding-radius test. Seven shells used to
   * evaluate 36 ray streamers each for every pixel on screen; now a pixel only
   * pays for the shells whose current envelope actually contains it.
   */
  vec3 shell(vec2 p, vec2 center, float startTime, vec3 color, float seed) {
    float t = mod(uTime - startTime, CYCLE);
    if (t > RISE + BLOOM) return vec3(0.0);
    // Ease the last moments so the shell does not blink out on the cycle edge.
    float life = smoothstep(RISE + BLOOM, RISE + BLOOM - 0.9, t);

    float startX = center.x + sin(seed * 7.7) * 0.12;

    if (t < RISE) {
      // --- ascent ---
      float launch = t / RISE;
      vec2 rocket = mix(vec2(startX, -1.22), center, pow(launch, 0.72));
      vec2 d = p - rocket;

      // Bounds have to fade, not clip. A hard early return here cut the
      // trail off mid-value and drew the straight edges the burst was
      // showing: the window below reaches zero before the early-out does.
      float window = smoothstep(0.15, 0.05, abs(d.x))
                   * smoothstep(-0.66, -0.50, d.y)
                   * smoothstep(0.14, 0.03, d.y);
      if (window <= 0.0) return vec3(0.0);

      float head = 0.0030 / (length(d * vec2(1.0, 0.85)) + 0.0032);
      float tail = smoothstep(0.016, 0.0, abs(d.x))
                 * smoothstep(0.0, -0.42, d.y)
                 * smoothstep(-0.52, -0.02, d.y);
      float spark = 0.5 + 0.5 * sin(p.y * 58.0 - uTime * 13.0 + seed * 10.0);
      float fadeIn = smoothstep(0.0, 0.18, t);
      return (color * 1.25 + vec3(0.95, 0.82, 0.46))
           * (head * 0.14 + tail * spark * 0.36) * fadeIn * window * life;
    }

    // --- bloom ---
    float bt = t - RISE;
    float progress = bt / BLOOM;

    vec2 d = p - center;
    d.y += progress * progress * 0.135;          // gravity droop

    float dist = length(d);

    // The spark term is a 1/x falloff, so it never truly reaches zero and
    // clipping it at a radius leaves a visible disc edge. Push the bound out
    // and roll the whole burst off smoothly inside it instead.
    float maxR = 0.62 * (1.0 - exp(-bt * 0.55)) + 0.16;
    float envelope = smoothstep(maxR, maxR * 0.68, dist);
    if (envelope <= 0.0) return vec3(0.0);

    vec3 col = vec3(0.0);

    // Detonation flash — tight and short. A wide soft disc here reads as a
    // lens smudge rather than an explosion.
    float flash = exp(-bt * 7.5) * 0.30;
    col += (color * 0.7 + vec3(0.55, 0.48, 0.30)) * flash * smoothstep(0.20, 0.0, dist);

    float fade = smoothstep(1.0, 0.10, progress);
    float angle = atan(d.y, d.x);

    // Two nested crowns: a wide outer shell and a tighter inner pistil. The
    // inner one is the first thing to go when the fragment budget is tight.
    #ifdef QUALITY_LOW
      #define SHELL_LAYERS 1
    #else
      #define SHELL_LAYERS 2
    #endif

    for (int layer = 0; layer < SHELL_LAYERS; layer++) {
      float rays = layer == 0 ? 34.0 : 17.0;
      float step = 6.28318 / rays;
      // Hash the wrapped ray index, not the raw angle: atan flips sign across
      // -x, so ±pi hashed to two different seeds and the two halves of the
      // burst met along a seam.
      float index = mod(floor(angle / step + 0.5), rays);
      float snapped = index * step;
      float rs = hash12(vec2(index, seed + float(layer) * 5.1));

      float v0 = (layer == 0 ? 0.36 : 0.20) + rs * (layer == 0 ? 0.17 : 0.07);
      float radius = v0 * (1.0 - exp(-bt * 0.58));

      vec2 sparkPos = vec2(cos(snapped), sin(snapped)) * radius;
      float sd = length(d - sparkPos);

      float twinkle = 0.7 + 0.3 * sin(bt * 9.0 + rs * 25.0);
      float point = (0.0021 / (sd + 0.0022)) * fade * twinkle;
      float streak = smoothstep(0.015, 0.0, sd) * fade * 0.32;

      // Streamers cool from their own hue toward ember as they fall.
      vec3 ember = mix(color, vec3(1.0, 0.46, 0.13), smoothstep(0.25, 1.0, progress) * 0.7);
      col += ember * point * (layer == 0 ? 0.36 : 0.24);
      col += (ember * 0.65 + vec3(0.32, 0.24, 0.11)) * streak * (layer == 0 ? 0.24 : 0.16);
    }

    return col * envelope * life;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(2.4, 2.0);

    vec3 c = vec3(0.0);
    c += shell(p, vec2(-0.62,  0.52), 0.0, vec3(1.00, 0.78, 0.22), 1.1); // gold
    c += shell(p, vec2( 0.65,  0.58), 3.2, vec3(0.22, 0.78, 1.00), 2.3); // azure
    c += shell(p, vec2(-0.75,  0.08), 6.4, vec3(1.00, 0.28, 0.65), 3.7); // rose
    c += shell(p, vec2( 0.72, -0.04), 9.0, vec3(0.25, 0.95, 0.55), 4.9); // emerald
    #ifndef QUALITY_LOW
      c += shell(p, vec2(-0.48, -0.45), 4.8, vec3(1.00, 0.52, 0.18), 5.5); // coral
      c += shell(p, vec2( 0.50, -0.42), 8.0, vec3(0.68, 0.45, 1.00), 6.8); // violet
      c += shell(p, vec2( 0.02,  0.72), 1.6, vec3(1.00, 0.92, 0.60), 7.4); // white-gold
    #endif

    gl_FragColor = vec4(c, clamp(length(c) * 1.15, 0.0, 0.94));
  }
`;

/* ------------------------------------------------------------------ *
 * Ambient motes
 * ------------------------------------------------------------------ */

/** The larger, soft-focus motes that drift through the atmosphere. */
export const floatingOrbVertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uPixelRatio;

  attribute float aScale;
  attribute float aPhase;

  varying float vPhase;

  void main() {
    vPhase = aPhase;
    vec3 pos = position;

    float angle = uTime * 0.24 + aPhase;
    pos.x += sin(angle + pos.y * 0.35) * 0.7;
    pos.z += cos(angle + pos.y * 0.35) * 0.7;
    pos.y += sin(uTime * 0.6 + aPhase) * 0.4;

    // Keep the atmospheric orbs responsive to the pointer, behind the fixed
    // logo sparkles.
    vec2 mouseWorld = vec2(uMouse.x * 4.0, uMouse.y * 2.6);
    vec2 away = pos.xy - mouseWorld;
    float distanceFromMouse = length(away);
    if (distanceFromMouse < 3.2) {
      pos.xy += (away / max(distanceFromMouse, 0.001)) * (1.0 - distanceFromMouse / 3.2) * 1.2;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float pulse = 0.82 + 0.24 * sin(uTime * 2.6 + aPhase * 6.28);
    gl_PointSize = clamp(
      (aScale * pulse * 34.0 * uPixelRatio) / max(-mvPosition.z, 0.6),
      1.0,
      48.0 * uPixelRatio
    );
  }
`;

export const floatingOrbFragmentShader = /* glsl */ `
  precision mediump float;

  varying float vPhase;
  uniform highp float uTime;

  void main() {
    vec2 q = (gl_PointCoord - 0.5) * 2.0;
    float distanceFromCenter = length(q);
    float orb = exp(-distanceFromCenter * distanceFromCenter * 3.4);
    float core = exp(-distanceFromCenter * distanceFromCenter * 18.0);

    vec3 magenta = vec3(0.92, 0.22, 0.56);
    vec3 emerald = vec3(0.28, 0.94, 0.68);
    vec3 col = mix(magenta, emerald, 0.5 + 0.5 * sin(vPhase * 2.7));
    float twinkle = 0.78 + 0.22 * sin(uTime * 1.8 + vPhase * 6.28);
    float glow = orb * 0.24 + core * 0.52;

    gl_FragColor = vec4(col * (0.72 + twinkle * 0.28), glow * twinkle * 0.24);
  }
`;

export const particleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;

  attribute float aScale;
  attribute float aPhase;

  varying float vPhase;

  void main() {
    vPhase = aPhase;
    vec3 pos = position;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // The anchor stays still; only its apparent intensity breathes.
    float pulse = 0.88 + 0.18 * sin(uTime * 3.4 + aPhase * 6.28);
    gl_PointSize = clamp(
      (aScale * pulse * 32.0 * uPixelRatio) / max(-mvPosition.z, 0.6),
      1.0,
      56.0 * uPixelRatio
    );
  }
`;

export const particleFragmentShader = /* glsl */ `
  precision mediump float;

  varying float vPhase;
  // Vertex shaders default to highp, so a bare uniform float uTime here
  // would be mediump and the program would fail to link with
  // "Precisions of uniform 'uTime' differ between VERTEX and FRAGMENT".
  // Locals and varyings stay mediump; only the shared uniform is pinned.
  uniform highp float uTime;

  void main() {
    vec2 q = (gl_PointCoord - 0.5) * 2.0;
    float distanceFromCenter = length(q);

    // A soft veil prevents the sprite from ending at a visible square edge.
    float halo = exp(-distanceFromCenter * distanceFromCenter * 2.8);
    float core = exp(-distanceFromCenter * distanceFromCenter * 24.0);

    // Thin rays create a restrained four-point sparkle.
    float rayX = exp(-abs(q.y) * 24.0) * exp(-abs(q.x) * 2.2);
    float rayY = exp(-abs(q.x) * 24.0) * exp(-abs(q.y) * 2.2);
    float rays = max(rayX, rayY) * smoothstep(1.15, 0.18, distanceFromCenter);

    vec3 warm = vec3(0.98, 0.92, 0.74);
    vec3 cool = vec3(0.42, 0.96, 0.78);
    vec3 col = mix(warm, cool, 0.5 + 0.5 * sin(vPhase * 3.14));

    float twinkle = 0.62 + 0.38 * sin(uTime * 2.1 + vPhase * 6.28);
    float sparkle = halo * 0.12 + core * 0.72 + rays * 0.36;
    gl_FragColor = vec4(col * (0.82 + twinkle * 0.28), sparkle * twinkle * 0.34);
  }
`;

/* ------------------------------------------------------------------ *
 * Post — bloom extract, separable blur, final composite
 * ------------------------------------------------------------------ */

export const fullscreenVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const brightPassFragmentShader = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform float uThreshold;
  uniform float uKnee;

  void main() {
    vec3 c = texture2D(uScene, vUv).rgb;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    // Soft knee so the bloom ramps in instead of popping at the threshold.
    float soft = clamp(lum - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-5);
    float contribution = max(soft, lum - uThreshold) / max(lum, 1e-5);
    gl_FragColor = vec4(c * contribution, 1.0);
  }
`;

/** 9-tap gaussian, run once horizontally and once vertically. */
export const blurFragmentShader = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uSource;
  uniform vec2 uDirection;

  void main() {
    vec3 sum = texture2D(uSource, vUv).rgb * 0.227027;
    vec2 o1 = uDirection * 1.3846153846;
    vec2 o2 = uDirection * 3.2307692308;
    sum += (texture2D(uSource, vUv + o1).rgb + texture2D(uSource, vUv - o1).rgb) * 0.3162162162;
    sum += (texture2D(uSource, vUv + o2).rgb + texture2D(uSource, vUv - o2).rgb) * 0.0702702703;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

export const postFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uScene;
  uniform sampler2D uBloom;
  uniform float uBloomStrength;
  uniform float uExposure;
  uniform float uAberration;
  uniform float uVignette;

  ${DITHER}

  // ACES filmic, Narkowicz fit.
  vec3 aces(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv;
    vec2 fromCenter = uv - 0.5;
    float r2 = dot(fromCenter, fromCenter);

    // Lateral chromatic aberration, zero at the centre, strongest in the
    // corners — reads as a real lens rather than a global RGB split.
    vec2 shift = fromCenter * r2 * uAberration;
    vec3 col;
    col.r = texture2D(uScene, uv + shift).r;
    col.g = texture2D(uScene, uv).g;
    col.b = texture2D(uScene, uv - shift).b;

    col += texture2D(uBloom, uv).rgb * uBloomStrength;

    // Everything upstream is authored in linear light; grading happens once,
    // here, so bloom sums energy rather than gamma-encoded bytes.
    col = aces(col * uExposure);
    col *= 1.0 - uVignette * smoothstep(0.12, 0.72, r2);

    // Linear -> sRGB. This material is raw, so the renderer will not do it.
    col = mix(col * 12.92, 1.055 * pow(max(col, 1e-5), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));

    col += (ign(gl_FragCoord.xy) - 0.5) / 255.0;

    gl_FragColor = vec4(col, 1.0);
  }
`;
