# Task 3 Report: Connect Hara navigation and hash routing

## Scope

- Task brief: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/.superpowers/sdd/task-3-brief.md`
- Working tree root: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan`
- Preserved unrelated dirty files: `src/styles.css`, `src/styles.test.ts`

## Changed files

- `src/components/HaraGallery.tsx`
- `src/components/ContestSubpageView.tsx`
- `src/components/LandingPage.tsx`
- `src/components/ContestSubpageView.test.tsx`
- `src/components/LandingPage.test.tsx`
- `.superpowers/sdd/task-3-report.md`

## RED evidence

### Test edits made first

- Added `onOpenOverview={() => undefined}` to the `ContestSubpageView` Hara render paths in `src/components/ContestSubpageView.test.tsx`.
- Added the required Hara assertions:
  - `expect(html).toContain('Overview');`
  - `expect(html).toContain('aria-label="Open Hara voting overview"');`
- Added a `LandingPage` hash-route test in `src/components/LandingPage.test.tsx` that:
  - sets `window.location.hash = '#hara/overview'`
  - mounts the page with a client render
  - asserts `Hara sa Negros Oriental`
  - asserts `Live simulation`
  - asserts the absence of `class="hara-gallery"`
  - restores the previous hash in cleanup

### Focused RED command

```bash
npm test -- src/components/ContestSubpageView.test.tsx src/components/LandingPage.test.tsx
```

### Focused RED result

- Exit code: `1`
- `src/components/ContestSubpageView.test.tsx` failed because the Hara markup did not yet include `Overview`.
- Failure excerpt:

```text
AssertionError: expected ... to contain 'Overview'
```

- `src/components/LandingPage.test.tsx` also failed on the new route test before implementation. The first run surfaced a jsdom harness gap:

```text
TypeError: window.matchMedia is not a function
```

- I fixed that test harness issue by stubbing `matchMedia` in the test file, then implemented the route behavior in production code.

## GREEN implementation

- Added `onOpenOverview: () => void` to `HaraGalleryProps`.
- Added the `Overview` control to `HaraGallery` with:
  - `aria-label="Open Hara voting overview"`
  - `className="hara-gallery__overview"`
  - `ChartBar` icon
- Added `onOpenOverview: () => void` to `ContestSubpageViewProps`.
- Passed `onOpenOverview` through the Hara branch from `ContestSubpageView` to `HaraGallery`.
- Added `activeOverview` state to `LandingPage`.
- Recognized `#hara/overview` before plain arena hash handling.
- Added `openOverview` and `closeOverview`.
- Reset `activeOverview` in `openSubpage`, `openVoting`, and `closeSubpage`.
- Rendered `VotingOverviewPage` between the voting and subpage branches with:
  - `arena={activeArena}`
  - `tallies={state.arenaTallies.hara}`
  - `onBackToHara={closeOverview}`
  - `onBackToHub={closeSubpage}`
- Passed `openOverview` into `ContestSubpageView`.
- Kept the scene mounted and quiet while overview/subpage/vote overlays are active.

## GREEN evidence

### Focused GREEN command

```bash
npm test -- src/components/ContestSubpageView.test.tsx src/components/LandingPage.test.tsx
```

### Focused GREEN result

- Exit code: `0`
- Result:

```text
Test Files  2 passed (2)
Tests  19 passed (19)
```

- jsdom emitted the existing canvas warning twice during the landing-page client render:

```text
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
```

- The tests still passed.

## Full-suite evidence

### Full-suite command

```bash
npm test
```

### Full-suite result

- Exit code: `0`
- Result:

```text
Test Files  12 passed (12)
Tests  63 passed (63)
```

- The same existing jsdom canvas warning appeared twice during the suite.

## Commit

- Commit created after verification: `feat: route Hara voting overview`

## Self-review

- The route precedence matches the brief: `#hara/overview` resolves before the plain arena branch.
- `Back to Hara` returns to `#hara`.
- `Festival Hub` returns to `#contests`.
- The voting overview uses the seeded live tallies from `state.arenaTallies.hara`.
- Other program branches remain unchanged.
- The landing scene still stays mounted and only switches to quiet mode while an overlay is active.
- Only the brief-listed component/test files were changed, plus this required report file.

## Concerns

- `src/styles.css` already had unrelated dirty changes and was outside the brief’s allowed file list, so I did not add the `.hara-gallery__overview` selector there. The new control is functional and covered by tests, but its dedicated styling is not part of this task’s code changes.
