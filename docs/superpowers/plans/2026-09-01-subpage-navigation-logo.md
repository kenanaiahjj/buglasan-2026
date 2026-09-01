# Subpage navigation and logo scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the existing program-subpage navigation above each intro mark and enlarge only supplied image logos.

**Architecture:** Keep the shared `HaraGallery` intro. Render its action controls in a semantic navigation row before the conditional image logo or text lockup, keep voting-status copy after that mark, and scope the larger size to `.hara-gallery__logo`, which is rendered only when `arena.logo` exists.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Vite.

## Global Constraints

- Preserve the four current program IDs: `hara`, `booths`, `festival`, and `gandang`.
- Do not change the text lockup size used by programs without image artwork.
- Preserve existing button handlers, labels, search behavior, cards, voting flow, overview flow, and responsive breakpoints.
- Preserve unrelated dirty-worktree edits.

---

### Task 1: Add regression coverage

**Files:**
- Modify: `src/components/ContestSubpageView.test.tsx`
- Modify: `src/styles.test.ts`

- [x] **Step 1: Assert the Hara reading order**

In `renders Hara sa Dumaguete subpage with candidates and criteria`, assert that the rendered `.hara-gallery__actions` is a `<nav>` and appears before `.hara-gallery__logo`, which appears before `.hara-gallery__support`.

- [x] **Step 2: Assert the same order for every program**

In `gives all four programmes the same gallery chrome`, derive `markClass` as `arena.logo ? 'hara-gallery__logo' : 'hara-gallery__lockup'` and assert that the actions index is less than the mark index, and the mark index is less than the support index.

- [x] **Step 3: Assert the larger image-logo clamp**

In `centers the Hara mark inside the gallery intro` in `src/styles.test.ts`, require `.hara-gallery__logo` to contain `width: clamp(8rem, 16vw, 12rem);`.

- [x] **Step 4: Run the focused tests and verify the expected red state**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx src/styles.test.ts
```

Expected: FAIL because the current markup puts the logo before the action row, does not use a `<nav>`, and the current width is `clamp(5.75rem, 12vw, 8rem)`.

### Task 2: Implement the approved layout change

**Files:**
- Modify: `src/components/HaraGallery.tsx`
- Modify: `src/styles.css:1859-1916`

- [x] **Step 1: Render the action row before the program mark**

Inside `.hara-gallery__intro`, render the existing three buttons in `<nav aria-label={`${programName} navigation`} className="hara-gallery__actions">` first. Render the existing conditional `arena.logo` image or `.hara-gallery__lockup` second. Render `.hara-gallery__support` containing only the existing status paragraph third. Keep all labels, handlers, and copy unchanged.

- [x] **Step 2: Enlarge only image logos**

Change `.hara-gallery__logo` to `width: clamp(8rem, 16vw, 12rem);`. Add `margin-bottom: clamp(0.85rem, 1.8vw, 1.25rem);` to `.hara-gallery__actions` and set `.hara-gallery__support` to `margin-top: 0;` so the reordered groups keep a deliberate rhythm. Leave `.hara-gallery__lockup` unchanged.

- [x] **Step 3: Run the focused tests and verify green**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx src/styles.test.ts
```

Expected: all tests in both files pass.

### Task 3: Verify the complete change

**Files:**
- Verify: `src/components/HaraGallery.tsx`
- Verify: `src/styles.css`
- Verify: `src/components/ContestSubpageView.test.tsx`
- Verify: `src/styles.test.ts`

- [x] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: Vitest exits with code 0 and reports zero failed tests.

- [x] **Step 2: Run the production build**

```bash
npm run build
```

Expected: Vite exits with code 0.

- [x] **Step 3: Check the diff**

```bash
git diff --check
```

Expected: no output and exit code 0.

- [x] **Step 4: Inspect representative desktop and mobile subpages**

Start the preview with `npm run dev -- --host 127.0.0.1 --port 5175`. Inspect `#hara`, `#festival`, and `#booths` at desktop and narrow widths. Confirm the action row is above each mark, image logos are larger, the Booths text lockup is unchanged, the status remains below the mark, all actions still work, and narrow pages have no horizontal overflow or new browser errors.

- [x] **Step 5: Stop the preview server**

Stop the temporary Vite process after browser verification and report the exact evidence.
