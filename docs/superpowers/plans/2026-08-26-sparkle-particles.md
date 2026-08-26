# Ambient sparkle particles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace square-looking ambient particle sprites with soft four-point sparkles that twinkle independently.

**Architecture:** Keep the existing `THREE.Points` geometry and vertex shader. Change only `particleFragmentShader` so each point sprite combines a faint halo, compact core, and tapered horizontal/vertical rays driven by the existing time and phase inputs.

**Tech Stack:** TypeScript, Three.js, GLSL, Vitest, Vite.

## Global Constraints

- Keep the existing GPU point-sprite system, particle count, positions, drift, cursor repulsion, warm/cool palette, additive blending, and reduced-motion behavior.
- Replace the particle fragment falloff with a faint radial halo, compact luminous core, and thin horizontal and vertical rays.
- Drive brightness with the existing per-particle phase and time uniform so particles twinkle out of sync.
- Keep the effect restrained; sparkles must read as small points of light rather than large lens flares or decorative icons.
- Do not change the 3D logo, background shaders, fireworks, particle count, scene layout, image assets, or DOM.

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
