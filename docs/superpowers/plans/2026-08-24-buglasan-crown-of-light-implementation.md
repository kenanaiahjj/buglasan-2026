# Buglasan Crown of Light implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public Buglasan page as the approved Crown of Light Three.js experience while preserving the existing login and voter dashboard flow.

**Architecture:** `LandingPage` owns semantic chapter content and GSAP-scoped DOM choreography. `FestivalScene` owns a landing-only Three.js renderer whose camera reads pure interpolation helpers from `landingSceneMath.ts` and receives GSAP ScrollTrigger progress. The supplied logo is the real masthead asset and central stage focal point. The existing reducer remains the only navigation and voting state boundary.

**Tech Stack:** React, TypeScript, Vite, Vitest, Three.js, GSAP ScrollTrigger, `@gsap/react`, Phosphor Icons, CSS, in-app browser verification.

## Global constraints

- Use the supplied Buglasan Festival 2026 logo without redrawing it.
- Do not copy or embed Kage assets, Japanese motifs, or source code.
- Three.js must mount only on the landing view and dispose on unmount.
- GSAP must use `useGSAP` with scoped selectors and automatic cleanup.
- Cap renderer pixel ratio at `1.5` and provide reduced-motion and WebGL-failure fallbacks.
- Preserve the existing login, dashboard, and one-vote demo behavior.
- Keep all core controls keyboard-accessible and at least `44px` high.
- Do not replace real assets with CSS, div, emoji, inline-SVG, or placeholder artwork.

---

### Task 1: Scene math and landing contract

**Files:**
- Create: `src/scene/landingSceneMath.test.ts`
- Create: `src/scene/landingSceneMath.ts`
- Create: `src/components/LandingPage.test.tsx`

**Interfaces:**
- Produces `progressForScroll(scrollY: number, anchors: number[]): number`.
- Produces `interpolateCamera(stops: CameraStop[], progress: number): CameraStop`.
- Verifies the landing renders the official logo, primary CTA, WebGL canvas, and five section anchors.

- [ ] **Step 1: Write failing math tests**

```ts
expect(progressForScroll(150, [0, 100, 300])).toBe(1.25);
expect(interpolateCamera(stops, 0.5).position).toEqual([5, 10, 15]);
```

- [ ] **Step 2: Run the focused test and confirm module-not-found failure**

Run: `npm test -- src/scene/landingSceneMath.test.ts`

- [ ] **Step 3: Implement clamped piecewise progress and linear camera interpolation**

The helpers must return the first or last stop outside the range and must not mutate inputs.

- [ ] **Step 4: Run the focused test and full reducer suite**

Run: `npm test -- src/scene/landingSceneMath.test.ts src/state/voterState.test.ts`

- [ ] **Step 5: Write the failing landing contract test**

Use `renderToStaticMarkup` and assert the expected logo `src`, CTA label, canvas accessible name, and IDs `festival`, `candidates`, `vote`, `coronation`, and `updates`.

### Task 2: Assets and festival scene

**Files:**
- Create: `public/assets/buglasan-festival-2026-logo.png`
- Create: `src/components/FestivalScene.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- `FestivalScene` consumes `sectionSelector?: string` and renders `<canvas className="festival-scene__canvas">`.
- The scene reads section anchors, updates camera progress, and exposes no voting state.

- [ ] **Step 1: Copy the supplied logo into `public/assets` and verify its dimensions**

Run `file public/assets/buglasan-festival-2026-logo.png` and retain the source pixels.

- [ ] **Step 2: Install Three.js, GSAP, the GSAP React hook, and Phosphor Icons**

Run: `npm install three @types/three gsap @gsap/react @phosphor-icons/react`

- [ ] **Step 3: Implement the renderer lifecycle**

Create the renderer with antialiasing, `powerPreference: 'high-performance'`, ACES tone mapping, `Math.min(devicePixelRatio, 1.5)`, resize handling, visibility pause, and complete geometry/material/renderer disposal.

- [ ] **Step 4: Build the Crown of Light world**

Use reusable Three.js `BufferGeometry`, `MeshStandardMaterial`, `LineBasicMaterial`, instanced light points, stage platforms, translucent pavilion sails, parol spokes, sugarcane blade meshes, fog, and warm key lights. Keep geometry count and particle count bounded.

- [ ] **Step 5: Wire GSAP camera chapters and reduced motion**

Create one scoped GSAP ScrollTrigger for the landing narrative, map its progress to five camera stops, use scrub smoothing for section handoffs, and skip scroll/pointer updates when reduced motion is requested. Kill the trigger and dispose the Three.js world on unmount.

### Task 3: Approved landing composition

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/BrandMark.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `BrandMark` gains `official?: boolean`; official mode renders `/assets/buglasan-festival-2026-logo.png` with descriptive alt text.
- Every vote entry dispatches `{ type: 'navigate', view: 'login' }`.

- [ ] **Step 1: Recompose the header and hero**

Render the official logo, compact fixed navigation, approved headline, two actions, voting status, a large illuminated official-logo centerpiece instead of the generated BUGLASAN 2026 title, chapter rail, and candidate procession over `FestivalScene`.

- [ ] **Step 2: Build five semantic chapters**

Render the approved candidate, voting, coronation, and update sections with existing data and real portrait imagery. Keep the candidate chapter vermilion and the rest of the page black-green/gold.

- [ ] **Step 3: Add menu and reveal behavior**

Use React state for the mobile menu and Escape handling. Use scoped `useGSAP` timelines and ScrollTrigger for once-only reveals, logo handoffs, and chapter transitions; keep content visible by default and disable nonessential motion for reduced-motion users.

- [ ] **Step 4: Implement responsive styles**

Match the selected `1440 × 1024` target at desktop, collapse the chapter rail below `1100px`, use the off-canvas menu below `760px`, and prevent horizontal overflow at `390 × 844`.

- [ ] **Step 5: Run the landing contract test and production build**

Run: `npm test -- src/components/LandingPage.test.tsx && npm run build`

### Task 4: Browser verification and design QA

**Files:**
- Create: `design-qa.md`
- Modify: files identified by visual QA.

**Interfaces:**
- The complete journey remains landing → login → dashboard → candidate selection → vote confirmation.

- [ ] **Step 1: Verify the desktop first fold at `1440 × 1024`**

Check logo fidelity, hero hierarchy, scene framing, CTA visibility, chapter rail alignment, candidate procession, and console logs.

- [ ] **Step 2: Verify mobile at `390 × 844`**

Check menu open/close/Escape behavior, logo legibility, 44px controls, tall scene framing, candidate scrolling, and zero horizontal page overflow.

- [ ] **Step 3: Verify the voter journey**

Use `juan@example.com` and `secret`, select candidate 02, confirm the vote, and verify the count changes from `1,980` to `1,981` with no second vote.

- [ ] **Step 4: Compare implementation and selected reference**

Create a side-by-side comparison at the same viewport, record P0–P3 findings in `design-qa.md`, fix all P0–P2 issues, and repeat until `final result: passed`.

- [ ] **Step 5: Run final verification**

Run: `npm test && npm run build && git diff --check`.

Expected: all tests pass, the build exits `0`, Git reports no whitespace errors, and the browser console has no errors.

## Self-review

- The plan covers every approved chapter, the supplied logo, the Three.js lifecycle, fallbacks, responsive behavior, the linked voting journey, and visual QA.
- No new backend or production-auth scope is introduced.
- New behavior is covered by test-first cycles before implementation.
