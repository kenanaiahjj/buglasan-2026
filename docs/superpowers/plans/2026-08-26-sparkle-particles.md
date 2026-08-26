# Ambient sparkle particles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace square-looking ambient particle sprites with soft four-point sparkles that twinkle independently.

**Architecture:** Keep the existing `THREE.Points` geometry and vertex shader. Change `particleFragmentShader` so each point sprite combines a faint halo, compact core, and tapered horizontal/vertical rays. Also update the backdrop star field to use cell-local coordinates and the same smooth sparkle profile instead of a uniform square cell.

**Tech Stack:** TypeScript, Three.js, GLSL, Vitest, Vite.

## Global Constraints

- Keep the existing GPU point-sprite system, particle count, positions, drift, cursor repulsion, warm/cool palette, additive blending, and reduced-motion behavior.
- Replace the particle fragment falloff with a faint radial halo, compact luminous core, and thin horizontal and vertical rays.
- Drive brightness with the existing per-particle phase and time uniform so particles twinkle out of sync.
- Keep the effect restrained; sparkles must read as small points of light rather than large lens flares or decorative icons.
- Do not change the 3D logo, fireworks, particle count, scene layout, image assets, or DOM.

---

### Task 1: Define the sparkle shader contract

**Files:**
- Create: `src/scene/shaders.test.ts`
- Modify: `src/scene/shaders.ts` (after the test fails)

**Interfaces:**
- Consumes the existing exported `particleFragmentShader` string.
- Produces a fragment shader containing the named halo, core, ray, and twinkle layers.

- [ ] **Step 1: Write the failing test**

Create `src/scene/shaders.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { particleFragmentShader } from './shaders';

describe('ambient sparkle particle shader', () => {
  it('builds a soft four-point sparkle instead of a circular square-edged mote', () => {
    expect(particleFragmentShader).toContain('float halo');
    expect(particleFragmentShader).toContain('float core');
    expect(particleFragmentShader).toContain('float rayX');
    expect(particleFragmentShader).toContain('float rayY');
    expect(particleFragmentShader).toContain('float rays');
    expect(particleFragmentShader).toContain('float twinkle');
    expect(particleFragmentShader).not.toContain('smoothstep(0.25, 0.0, d2)');
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npx vitest run src/scene/shaders.test.ts
```

Expected: FAIL because the current fragment shader has no `halo`, `core`, `rayX`, or `rayY` layers.

### Task 2: Implement and verify the sparkle fragment shader

**Files:**
- Modify: `src/scene/shaders.ts:454-477`
- Test: `src/scene/shaders.test.ts`

**Interfaces:**
- Consumes `uTime` and `vPhase` from the existing particle pipeline.
- Produces `gl_FragColor` with a soft four-point sparkle and the existing warm/cool particle color mix.

- [ ] **Step 1: Replace only the particle fragment body**

Keep the current precision, varying, and `uTime` declarations. Replace the `main()` body with:

```glsl
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
```

Do not change the vertex shader, `gl_PointSize`, `particleCount`, point positions, or update loop.

- [ ] **Step 2: Run the focused test to verify it passes**

Run:

```bash
npx vitest run src/scene/shaders.test.ts
```

Expected: 1 test passes.

- [ ] **Step 3: Run the full test suite and production build**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: all tests pass, the production build exits with code 0, and `git diff --check` reports no whitespace errors.

- [ ] **Step 4: Verify the live desktop and mobile render**

Open the local preview at `http://127.0.0.1:5175/` and check:

- At 1280×720, the particles read as soft four-point sparkles rather than squares.
- At 390×844, the sparkle effect remains subtle and does not create horizontal overflow.
- The particle field still drifts, responds to pointer movement, and twinkles at varied times.
- The scene has no new console errors.

- [ ] **Step 5: Commit the shader test and implementation**

Because `src/scene/shaders.ts` is already an untracked user file in this checkout, stage only this file and the new focused test if committing does not include unrelated work. Otherwise, leave the implementation in the working tree and report that it was not staged.

### Task 3: Remove square backdrop star cells

**Files:**
- Modify: `src/scene/shaders.ts:150-157`
- Test: `src/scene/shaders.test.ts`

**Interfaces:**
- Consumes the existing `uTime`, `uv`, and `hash12()` backdrop inputs.
- Produces soft local star falloffs with no uniform full-cell opacity.

- [ ] **Step 1: Add the failing backdrop contract assertion**

Extend `src/scene/shaders.test.ts` to import `backdropFragmentShader` and assert that the star field computes a local cell coordinate and smooth falloff:

```ts
import { backdropFragmentShader, particleFragmentShader } from './shaders';

it('uses local smooth coordinates for the backdrop star field', () => {
  expect(backdropFragmentShader).toContain('vec2 starCell = fract(sp) - 0.5');
  expect(backdropFragmentShader).toContain('float starDistance');
  expect(backdropFragmentShader).toContain('float starCore');
  expect(backdropFragmentShader).toContain('float starRays');
  expect(backdropFragmentShader).not.toContain('float star = hash12(floor(sp));');
});
```

Run:

```bash
npx vitest run src/scene/shaders.test.ts
```

Expected: FAIL because the current backdrop uses a uniform value for each `floor(sp)` cell.

- [ ] **Step 2: Replace the cell fill with a local sparkle falloff**

Replace the current `star` assignment block with:

```glsl
      vec2 starGrid = uv * vec2(160.0, 96.0);
      vec2 starCell = fract(starGrid) - 0.5;
      vec2 starId = floor(starGrid);
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
```

Keep the quality guard and the rest of the backdrop shader unchanged.

- [ ] **Step 3: Run focused tests, full tests, and the build**

Run:

```bash
npx vitest run src/scene/shaders.test.ts
npm test
npm run build
git diff --check
```

Expected: the focused shader tests pass, all tests pass, the build exits with code 0, and no whitespace errors are reported.

- [ ] **Step 4: Verify the square artifact is gone in the live preview**

At 1280×720 and 390×844, confirm the field contains only soft star points and four-point sparkles, with no gray square cells, no horizontal overflow, and no new console errors.
