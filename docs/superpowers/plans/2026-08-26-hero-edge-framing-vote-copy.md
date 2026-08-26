# Buglasan hero edge framing and vote-policy copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Superseded for the hero-frame portion by the user request on August 26, 2026. The tree frame was removed; the vote-fact cleanup remains implemented.

**Goal:** Remove the unsupported “Verified / One vote per person” fact from the arena voting hero while preserving the existing landing scene.

**Architecture:** Keep the existing fixed WebGL scene and hero layout unchanged. Add one decorative, pointer-transparent wrapper inside the hero that layers two existing tree landmark SVGs behind the hero content and pushes them mostly beyond the viewport edges; CSS handles silhouette grading, opacity, masks, and responsive visibility. Remove only the unsupported trust fact from `ArenaVotingPage`; leave the existing prototype voting state and payment-free demo mechanics unchanged until a payment flow is specified.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, static SVG assets, CSS media queries and masks.

## Global Constraints

- Use the existing assets `/assets/landmarks/palm-cluster.svg` and `/assets/landmarks/dumaguete-acacia.svg`.
- Show the complete edge frame at `min-width: 861px`; hide it at `max-width: 860px`.
- Keep the frame decorative with `aria-hidden="true"`, empty image `alt` values, and `pointer-events: none`.
- Keep the inner fade broad enough that the logo, hero copy, actions, and program cards stay clear.
- Add no borders, chips, eyebrow labels, or new text.
- Preserve the existing `overflow: clip` behavior and do not introduce horizontal scrolling.
- Remove the screenshot’s unsupported trust fact without changing the existing voting reducer, payment behavior, or allowance rules.
- Preserve the existing green, gold, dark, sans-serif visual system.

---

## File map

- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/LandingPage.tsx` — add the decorative hero frame markup.
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ArenaVotingPage.tsx` — remove the `ShieldCheck` import and the unsupported trust fact.
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.css` — style the frame and remove dead trust-fact rules.
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/LandingPage.test.tsx` — assert that the two approved tree assets are rendered.
- Create: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ArenaVotingPage.test.tsx` — assert that the unsupported trust fact is absent from the voting hero.

## Task 1: Add regression coverage for the requested output

**Files:**

- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/LandingPage.test.tsx`
- Create: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ArenaVotingPage.test.tsx`

**Interfaces:**

- Consumes: the existing server-renderable `LandingPage` and `ArenaVotingPage` components.
- Produces: tests that fail until the edge-frame markup exists and the unsupported trust fact is removed.

- [ ] **Step 1: Extend the landing contract test with the decorative asset requirements**

Add the following assertions to the existing `renders the official logo, scene, primary action, and five narrative chapters` test after the existing logo assertions:

```tsx
expect(html).toContain('class="hero-edge-frame"');
for (const asset of [
  '/assets/landmarks/palm-cluster.svg',
  '/assets/landmarks/dumaguete-acacia.svg',
]) {
  expect(html).toContain(`src="${asset}"`);
}
```

- [ ] **Step 2: Add a focused voting-hero contract test**

Create `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ArenaVotingPage.test.tsx` with this exact content:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { contestArenas } from '../data/pageant';
import { initialVoterState } from '../state/voterState';
import { ArenaVotingPage } from './ArenaVotingPage';

describe('ArenaVotingPage', () => {
  it('does not present one vote per person as a voting fact', () => {
    const arena = contestArenas.find((item) => item.id === 'hara')!;
    const html = renderToStaticMarkup(
      <ArenaVotingPage
        arena={arena}
        arenas={contestArenas}
        dispatch={() => undefined}
        onBack={() => undefined}
        onSwitchArena={() => undefined}
        state={initialVoterState}
      />,
    );

    expect(html).not.toContain('vote-hero__fact--trust');
    expect(html).not.toContain('>Verified</dt>');
    expect(html).not.toContain('<dd>One vote per person</dd>');
  });
});
```

- [ ] **Step 3: Run the focused tests and verify the new assertions fail**

Run:

```bash
npx vitest run src/components/LandingPage.test.tsx src/components/ArenaVotingPage.test.tsx
```

Expected: the new landing assertions fail because `.hero-edge-frame` and its asset images do not exist yet, and the new voting test fails because `ArenaVotingPage` still renders the trust fact.

## Task 2: Add the decorative hero frame markup

**Files:**

- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/LandingPage.tsx:342-346`

**Interfaces:**

- Consumes: existing landmark files under `/public/assets/landmarks`.
- Produces: one `hero-edge-frame` decorative layer positioned before `.hero-stage-reserve`.

- [ ] **Step 1: Insert the decorative wrapper at the start of the living-green hero**

Immediately inside the existing `<section className="crown-hero crown-hero--living-green" ...>` and before `.hero-stage-reserve`, insert:

```tsx
        <div className="hero-edge-frame" aria-hidden="true">
          <img
            alt=""
            className="hero-edge-frame__asset hero-edge-frame__asset--palm"
            decoding="async"
            src="/assets/landmarks/palm-cluster.svg"
          />
          <img
            alt=""
            className="hero-edge-frame__asset hero-edge-frame__asset--acacia"
            decoding="async"
            src="/assets/landmarks/dumaguete-acacia.svg"
          />
        </div>
```

- [ ] **Step 2: Confirm the markup remains decorative**

Check that the wrapper has `aria-hidden="true"`, all four images have `alt=""`, and the wrapper is outside `.hero-lockup` and `.hero-arena-cards`. Do not add a heading, label, button, link, or new copy.

## Task 3: Style and constrain the frame

**Files:**

- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.css:726-776`
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.css:2551-2572`

**Interfaces:**

- Consumes: the four classes emitted by `LandingPage.tsx`.
- Produces: a static, low-contrast desktop/tablet frame behind the hero content and no trust-fact-specific CSS.

- [ ] **Step 1: Add the frame base, glows, and asset placement before `.hero-stage-reserve`**

Insert this CSS immediately before the existing `.hero-stage-reserve` rule:

```css
.hero-edge-frame {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  isolation: isolate;
}

.hero-edge-frame__asset {
  position: absolute;
  display: block;
  pointer-events: none;
  user-select: none;
  filter: grayscale(.9) saturate(.2) brightness(.3) contrast(1.16);
}

.hero-edge-frame__asset--palm {
  bottom: clamp(-7rem, -10vh, -3rem);
  left: clamp(-26rem, -24vw, -12rem);
  height: min(92vh, 760px);
  width: auto;
  opacity: .28;
  mask-image: linear-gradient(to right, #000 0%, rgba(0, 0, 0, .86) 28%, transparent 100%);
  transform: scaleX(-1);
}

.hero-edge-frame__asset--acacia {
  right: clamp(-26rem, -24vw, -12rem);
  bottom: clamp(-6rem, -9vh, -2rem);
  height: min(84vh, 700px);
  width: auto;
  opacity: .24;
  mask-image: linear-gradient(to left, #000 0%, rgba(0, 0, 0, .86) 30%, transparent 100%);
}

.hero-stage-reserve,
.hero-lockup,
.hero-arena-cards {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 2: Hide the frame at the existing mobile breakpoint**

Add this rule inside the existing `@media (max-width: 860px)` block immediately before its `.hero-stage-reserve` rule:

```css
  .hero-edge-frame { display: none; }
```

- [ ] **Step 3: Remove dead trust-fact styles**

Delete these two existing rules from the arena voting section:

```css
.vote-hero__fact--trust dt svg { color: var(--mint); }
.vote-hero__fact--trust dd { color: var(--ink-muted); font-size: .78rem; font-weight: 460; }
```

Do not change the shared `.vote-hero__facts` layout because the remaining four facts still use it.

## Task 4: Remove the unsupported vote fact

**Files:**

- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ArenaVotingPage.tsx:19-24,199-205`

**Interfaces:**

- Consumes: the existing arena voting page.
- Produces: the same voting page without a `Verified` or `One vote per person` fact.

- [ ] **Step 1: Remove the unused icon import**

Delete this import:

```tsx
import { ShieldCheck } from '@phosphor-icons/react/dist/icons/ShieldCheck';
```

- [ ] **Step 2: Remove the trust fact from the hero facts list**

Delete this JSX block and leave `Leading` as the final child of `.vote-hero__facts`:

```tsx
          <div className="vote-hero__fact--trust">
            <dt>
              <ShieldCheck aria-hidden="true" size={13} weight="fill" />
              Verified
            </dt>
            <dd>One vote per person</dd>
          </div>
```

Do not change `ARENA_VOTING`, `voterReducer`, or the payment-free demo allowance in this pass; removing an unsupported claim is the requested change, while paid-vote behavior requires a separate product flow.

## Task 5: Verify the implementation in code and the browser

**Files:**

- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/LandingPage.tsx`
- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ArenaVotingPage.tsx`
- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.css`
- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/LandingPage.test.tsx`
- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ArenaVotingPage.test.tsx`

**Interfaces:**

- Consumes: the completed implementation.
- Produces: passing tests, a successful production build, and browser-confirmed responsive behavior.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npx vitest run src/components/LandingPage.test.tsx src/components/ArenaVotingPage.test.tsx
```

Expected: both suites pass.

- [ ] **Step 2: Run the full test suite, build, and diff check**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: all Vitest tests pass, the Vite build completes, and `git diff --check` prints no whitespace errors.

- [ ] **Step 3: Inspect desktop/tablet landing behavior in the running app**

At `http://127.0.0.1:5174/`, inspect a desktop viewport and a tablet-width viewport. Confirm that the enlarged palm and acacia silhouettes enter from the extreme outer edges, the center remains clear, and the hero actions and program cards remain clickable.

- [ ] **Step 4: Inspect mobile and voting behavior**

Inspect a viewport at `860px` or narrower and confirm the `.hero-edge-frame` is not visible and no horizontal scrollbar appears. Open an arena voting page and confirm the hero facts show Dates, Total votes, Entries, and Leading only; the `Verified` label and `One vote per person` copy must be absent.

- [ ] **Step 5: Review the scoped diff**

Run:

```bash
git diff -- src/components/LandingPage.tsx src/components/ArenaVotingPage.tsx src/styles.css src/components/LandingPage.test.tsx src/components/ArenaVotingPage.test.tsx
```

Expected: only the approved decorative frame, the requested trust-fact removal, and their regression coverage appear in the diff.
