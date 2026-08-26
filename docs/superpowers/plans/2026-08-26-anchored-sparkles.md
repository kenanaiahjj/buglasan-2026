# Anchored hero sparkles implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Buglasan hero sparkles fixed around the 3D logo while they twinkle in place.

**Architecture:** Keep `THREE.Points` and the existing sparkle fragment shader. Feed the point geometry from a small deterministic layout, remove particle position drift and cursor repulsion from the vertex shader, and remove the particle group's time rotation. Keep `uTime` only for sparkle size and brightness animation.

**Tech Stack:** TypeScript, Three.js, GLSL, Vitest, Vite.

## Global constraints

- Use a curated, deterministic sparkle layout around the hero logo.
- Keep the existing warm/cool palette, additive blending, and reduced-motion behavior.
- Do not change the 3D logo, fireworks, landmark motion, image assets, or DOM.
- Preserve the separate backdrop star-field animation.

---

### Task 1: Define the no-drift contract

**Files:**
- Modify: `src/scene/shaders.test.ts`
- Test: `src/components/LandingPage.test.tsx`

- [ ] Import `particleVertexShader` and assert that the vertex shader retains the time-based pulse but no longer contains orbital movement or cursor-repulsion calculations.
- [ ] Assert that the exported sparkle layout has unique positions and enough anchors to frame the logo.
- [ ] Run the focused tests and confirm they fail before the implementation changes.

### Task 2: Implement anchored sparkle positions

**Files:**
- Modify: `src/scene/festivalWorld.ts`

- [ ] Add an exported, deterministic `BUGLASAN_SPARKLE_LAYOUT` with positions, scales, and phases placed around the logo perimeter.
- [ ] Build the particle attributes from that layout instead of `Math.random()`.
- [ ] Select a reduced subset on low-power devices without changing the anchor coordinates.

### Task 3: Remove particle movement while preserving twinkle

**Files:**
- Modify: `src/scene/shaders.ts`
- Modify: `src/scene/festivalWorld.ts`

- [ ] Remove the vertex shader's time-based x/y/z offsets and cursor push.
- [ ] Remove the unused particle `uMouse` uniform and update call.
- [ ] Remove `particles.rotation.y` from the render update.
- [ ] Keep `uTime`, `aPhase`, and a restrained point-size pulse for in-place twinkle.

### Task 4: Verify the live result

- [ ] Run focused tests, the full test suite, `npm run build`, and `git diff --check`.
- [ ] At desktop and mobile widths, confirm sparkles stay arranged around the logo, twinkle without drifting, and do not create horizontal overflow.
- [ ] Check browser logs for new errors.
- [ ] Leave pre-existing untracked production files unstaged unless they are explicitly isolated and safe to stage.
