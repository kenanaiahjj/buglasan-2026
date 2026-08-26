# Buglasan 3D hero logo sharpness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the loaded 3D Buglasan hero logo's edge clarity on desktop and mobile without changing the supplied GLB or the atmosphere's adaptive quality budget.

**Architecture:** A pure render-quality helper will calculate separate pixel ratios for the crisp overlay and the lower-cost atmosphere render targets. `FestivalScene` will use those ratios during resize and tier changes. `festivalWorld` will raise anisotropy only for imported logo color textures while retaining the source PBR materials.

**Tech Stack:** React, TypeScript, Three.js, Vitest, Vite.

## Global Constraints

- Keep `/assets/buglasan-hero-2026.glb` as the 3D hero source.
- Keep `BUGLASAN_HERO_MATERIAL_MODE` set to `source`.
- Keep the existing adaptive tiers, scene scale, layout, motion, and fallback image behavior.
- Use a 1.25 minimum overlay pixel ratio, with caps of 2.0 for high, 1.5 for medium, and 1.25 for low.
- Keep the atmosphere pixel-ratio caps at 1.75 for high, 1.25 for medium, and 1.0 for low.

---

### Task 1: Add tested render-ratio calculation

**Files:**
- Create: `src/scene/renderQuality.ts`
- Test: `src/scene/renderQuality.test.ts`

**Interfaces:**
- Produces `RenderQualityTier`, `TIER_DPR`, `TIER_SCENE_DPR`, `TIER_SCENE_SCALE`, and `getRenderPixelRatios(devicePixelRatio, tier)` for `FestivalScene`.

- [ ] **Step 1: Write the failing test**

Create `src/scene/renderQuality.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getRenderPixelRatios } from './renderQuality';

describe('getRenderPixelRatios', () => {
  it('supersamples a DPR-1 overlay without increasing the atmosphere target', () => {
    expect(getRenderPixelRatios(1, 'high')).toEqual({ overlay: 1.25, scene: 1 });
  });

  it('keeps the overlay bounded on a high-DPR low-power device', () => {
    expect(getRenderPixelRatios(3, 'low')).toEqual({ overlay: 1.25, scene: 1 });
  });

  it('uses the tier caps for high and medium output', () => {
    expect(getRenderPixelRatios(3, 'high')).toEqual({ overlay: 2, scene: 1.75 });
    expect(getRenderPixelRatios(3, 'medium')).toEqual({ overlay: 1.5, scene: 1.25 });
  });

  it('normalizes invalid or sub-unit device ratios', () => {
    expect(getRenderPixelRatios(0, 'high')).toEqual({ overlay: 1.25, scene: 1 });
    expect(getRenderPixelRatios(Number.NaN, 'medium')).toEqual({ overlay: 1.25, scene: 1 });
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npx vitest run src/scene/renderQuality.test.ts
```

Expected: FAIL because `src/scene/renderQuality.ts` does not exist yet.

- [ ] **Step 3: Implement the minimal helper**

Create `src/scene/renderQuality.ts`:

```ts
export type RenderQualityTier = 'high' | 'medium' | 'low';

export const TIER_DPR: Record<RenderQualityTier, number> = { high: 2, medium: 1.5, low: 1.25 };
export const TIER_SCENE_DPR: Record<RenderQualityTier, number> = { high: 1.75, medium: 1.25, low: 1 };
export const TIER_SCENE_SCALE: Record<RenderQualityTier, number> = { high: 1, medium: 0.85, low: 0.68 };

export function getRenderPixelRatios(devicePixelRatio: number, tier: RenderQualityTier) {
  const safeDevicePixelRatio = Number.isFinite(devicePixelRatio) ? Math.max(1, devicePixelRatio) : 1;

  return {
    overlay: Math.min(Math.max(safeDevicePixelRatio, 1.25), TIER_DPR[tier]),
    scene: Math.min(safeDevicePixelRatio, TIER_SCENE_DPR[tier]),
  };
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
npx vitest run src/scene/renderQuality.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit the helper and its tests**

```bash
git add src/scene/renderQuality.ts src/scene/renderQuality.test.ts
git commit -m "test: define hero render quality ratios"
```

### Task 2: Wire the sharper overlay and texture sampling

**Files:**
- Modify: `src/components/FestivalScene.tsx:6-20, 87-99`
- Modify: `src/scene/festivalWorld.ts:358-430`
- Test: `src/components/LandingPage.test.tsx` (existing hero contracts)

**Interfaces:**
- Consumes `getRenderPixelRatios`, `TIER_SCENE_SCALE`, and `RenderQualityTier` from `src/scene/renderQuality.ts`.
- Produces a default framebuffer sized from the overlay ratio and a post-process scene target sized from the atmosphere ratio.

- [ ] **Step 1: Add the integration contract assertion**

Extend `src/components/LandingPage.test.tsx` with a contract that imports the render helper and confirms the desktop overlay is supersampled while the scene remains at its existing DPR-1 size:

```ts
import { getRenderPixelRatios } from '../scene/renderQuality';

it('allocates extra pixels to the logo overlay on a DPR-1 desktop', () => {
  expect(getRenderPixelRatios(1, 'high')).toEqual({ overlay: 1.25, scene: 1 });
});
```

Run:

```bash
npx vitest run src/components/LandingPage.test.tsx
```

Expected: PASS, because Task 1 already provides the pure ratio contract and this assertion protects it at the landing-page test boundary.

- [ ] **Step 2: Wire separate ratios into `FestivalScene`**

Replace the local tier constants with the helper import, keep `TIER_ORDER` local, and track both ratios:

```ts
import {
  getRenderPixelRatios,
  TIER_SCENE_SCALE,
  type RenderQualityTier,
} from '../scene/renderQuality';

type Tier = RenderQualityTier;
const TIER_ORDER: Tier[] = ['low', 'medium', 'high'];
```

Inside the effect, replace the single ratio assignment with:

```ts
let currentPixelRatio = 1;
let currentScenePixelRatio = 1;

const applySize = () => {
  viewWidth = Math.max(1, host.clientWidth);
  viewHeight = Math.max(1, host.clientHeight);
  const ratios = getRenderPixelRatios(window.devicePixelRatio || 1, tier);
  currentPixelRatio = ratios.overlay;
  currentScenePixelRatio = ratios.scene;

  renderer.setPixelRatio(currentPixelRatio);
  renderer.setSize(viewWidth, viewHeight, false);
  post.setSize(viewWidth, viewHeight, currentScenePixelRatio, TIER_SCENE_SCALE[tier]);

  camera.aspect = viewWidth / viewHeight;
  camera.updateProjectionMatrix();
};
```

Keep `currentPixelRatio` as the particle pixel-ratio input in `stage.update()`. The adaptive tier path continues to call `post.setQuality(tier)` and `applySize()`.

- [ ] **Step 3: Apply anisotropy to imported logo color textures**

Before the GLTF load callback, calculate a bounded renderer capability:

```ts
const logoTextureAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
```

Inside the existing material loop, after capturing the authored material state, update only color maps:

```ts
const standardMaterial = material as THREE.MeshStandardMaterial;
if (standardMaterial.map && standardMaterial.map.anisotropy < logoTextureAnisotropy) {
  standardMaterial.map.anisotropy = logoTextureAnisotropy;
  standardMaterial.map.needsUpdate = true;
}
```

Do not replace the material or change its base color, roughness, metallic values, transparency, or depth-write state.

- [ ] **Step 4: Run the focused integration test**

Run:

```bash
npx vitest run src/components/LandingPage.test.tsx src/scene/renderQuality.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: Vitest exits with zero failures, Vite produces a build, and `git diff --check` reports no whitespace errors.

- [ ] **Step 6: Verify the live desktop and mobile render**

Open the local preview at `http://127.0.0.1:5175/` and verify:

- At 1280×720, `.festival-scene` has `is-ready`, the fallback opacity is `0`, and the canvas internal width is greater than its 1280px CSS width.
- At 390×844, the same GLB is ready, the canvas has no horizontal overflow, and the console has no new errors.
- The logo stays centered in the hero and remains visible during the existing scroll-to-header handoff.

- [ ] **Step 7: Commit the implementation**

```bash
git add src/components/FestivalScene.tsx src/scene/festivalWorld.ts src/scene/renderQuality.ts src/scene/renderQuality.test.ts src/components/LandingPage.test.tsx
git commit -m "feat: sharpen the 3D hero logo render"
```
