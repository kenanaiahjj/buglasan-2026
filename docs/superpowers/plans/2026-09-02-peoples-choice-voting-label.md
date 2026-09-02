# People’s Choice voting label and disclaimer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a consistent gold cursive `People’s Choice` designation and an official-result disclaimer to every contest subpage and voting overview without changing voting behavior.

**Architecture:** Keep the two approved strings in a small shared copy module. Render the label beside each program identity and the disclaimer below each surface’s current voting status/deadline. Use shared CSS classes with overview-specific container-query sizing so the existing 16:10 wallboard and responsive subpage remain intact.

**Tech Stack:** React, TypeScript, CSS, Vitest, Vite, browser verification through the local development server.

## Global Constraints

- The label must render exactly as `People’s Choice`.
- The disclaimer must render exactly as `People’s Choice voting reflects public preference only and does not determine the official final result.`
- The label must use a cursive-capable system font stack and `var(--gold-bright)`.
- The disclaimer must remain readable, centered, and constrained in measure.
- The overview must keep its fixed 16:10 composition and existing standings layout.
- Do not change voting algorithms, tally sources, ranking order, deadlines, routing, or unrelated landing-page content.
- Preserve unrelated worktree changes and stage only files belonging to this task.

---

### Task 1: Add failing copy and style regression tests

**Files:**
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ContestSubpageView.test.tsx`
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/VotingOverviewPage.test.tsx`
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.test.ts`

**Interfaces:**
- Consumes: The existing static markup render tests for all `contestArenas`.
- Produces: Exact-copy and CSS contracts that fail until the new label and disclaimer are rendered and styled.

- [ ] **Step 1: Write the failing subpage assertions**

In the existing `keeps status and location labels text-only across every contest subpage` test, add these exact assertions inside the `for (const arena of contestArenas)` loop after `const html = renderToStaticMarkup(...)`:

```tsx
expect(html).toContain('<p class="people-choice-mark">People’s Choice</p>');
expect(html).toContain(
  '<p class="people-choice-disclaimer">People’s Choice voting reflects public preference only and does not determine the official final result.</p>',
);
```

- [ ] **Step 2: Write the failing overview assertions**

In the existing `composes every programme inside one fixed 16:9 frame` test in `src/components/VotingOverviewPage.test.tsx`, add these assertions inside its `for (const arena of contestArenas)` loop:

```tsx
expect(html).toContain('<p class="people-choice-mark">People’s Choice</p>');
expect(html).toContain(
  '<p class="people-choice-disclaimer">People’s Choice voting reflects public preference only and does not determine the official final result.</p>',
);
expect(html.indexOf('class="people-choice-mark"')).toBeLessThan(html.indexOf('class="vote-overview__clock"'));
expect(html.indexOf('class="vote-overview__clock-note"')).toBeLessThan(html.indexOf('class="people-choice-disclaimer"'));
```

- [ ] **Step 3: Write the failing CSS contracts**

Append this test block to `src/styles.test.ts`:

```tsx
describe('People’s Choice label and disclaimer', () => {
  it('uses gold cursive type and readable surface-specific disclaimer sizing', () => {
    const labelBlock = styles.match(/\.people-choice-mark\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const disclaimerBlock = styles.match(/\.people-choice-disclaimer\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(labelBlock).toContain('color: var(--gold-bright);');
    expect(labelBlock).toContain(
      'font-family: "Snell Roundhand", "Brush Script MT", "Segoe Script", cursive;',
    );
    expect(labelBlock).toContain('white-space: nowrap;');
    expect(disclaimerBlock).toContain('font-size: .72rem;');
    expect(disclaimerBlock).toContain('line-height: 1.45;');
    expect(disclaimerBlock).toContain('max-width: 40rem;');
    expect(styles).toMatch(
      /\.vote-overview__identity-type \.people-choice-mark\s*\{[\s\S]*?font-size: 1\.25cqw;/,
    );
    expect(styles).toMatch(
      /\.vote-overview__clock \.people-choice-disclaimer\s*\{[\s\S]*?font-size: \.58cqw;/,
    );
  });
});
```

- [ ] **Step 4: Run the focused tests and confirm they fail for the missing feature**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx src/components/VotingOverviewPage.test.tsx src/styles.test.ts
```

Expected: the existing tests run, and the new assertions fail because the markup and CSS classes do not exist yet. Do not change the assertions to match the pre-implementation output.

---

### Task 2: Implement the shared copy and responsive presentation

**Files:**
- Create: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/lib/votingCopy.ts`
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/HaraGallery.tsx`
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/VotingOverviewPage.tsx`
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.css`

**Interfaces:**
- Consumes: `ContestArena`, the existing gallery intro/support markup, and the overview identity/clock markup.
- Produces: `PEOPLE_CHOICE_LABEL` and `PEOPLE_CHOICE_DISCLAIMER` constants plus `.people-choice-mark` and `.people-choice-disclaimer` presentation contracts.

- [ ] **Step 1: Add the shared copy constants**

Create `src/lib/votingCopy.ts` with:

```ts
export const PEOPLE_CHOICE_LABEL = 'People’s Choice';

export const PEOPLE_CHOICE_DISCLAIMER =
  'People’s Choice voting reflects public preference only and does not determine the official final result.';
```

- [ ] **Step 2: Render the label and disclaimer on contest subpages**

In `src/components/HaraGallery.tsx`, import the two constants:

```tsx
import { PEOPLE_CHOICE_DISCLAIMER, PEOPLE_CHOICE_LABEL } from '../lib/votingCopy';
```

Place the label immediately after the existing logo/lockup conditional and before `.hara-gallery__support`:

```tsx
<p className="people-choice-mark">{PEOPLE_CHOICE_LABEL}</p>
```

Place the disclaimer as the second child of `.hara-gallery__support`, after the existing status paragraph:

```tsx
<p className="people-choice-disclaimer">{PEOPLE_CHOICE_DISCLAIMER}</p>
```

The resulting order in the intro must be: navigation, supplied logo or text lockup, `People’s Choice`, voting status/deadline, disclaimer.

- [ ] **Step 3: Render the label and disclaimer on voting overviews**

In `src/components/VotingOverviewPage.tsx`, import the same constants:

```tsx
import { PEOPLE_CHOICE_DISCLAIMER, PEOPLE_CHOICE_LABEL } from '../lib/votingCopy';
```

Add the label directly after the existing overview title inside `.vote-overview__identity-type`:

```tsx
<p className="people-choice-mark">{PEOPLE_CHOICE_LABEL}</p>
```

Add the disclaimer directly after the existing `.vote-overview__clock-note` paragraph:

```tsx
<p className="people-choice-disclaimer">{PEOPLE_CHOICE_DISCLAIMER}</p>
```

- [ ] **Step 4: Add the shared and host-specific CSS**

Add the shared rules after `.hara-gallery__lockup p` in `src/styles.css`:

```css
.people-choice-mark {
  margin: 0;
  color: var(--gold-bright);
  font-family: "Snell Roundhand", "Brush Script MT", "Segoe Script", cursive;
  font-size: clamp(1.25rem, 2.2vw, 1.8rem);
  font-style: normal;
  font-weight: 400;
  letter-spacing: .01em;
  line-height: 1;
  text-shadow: 0 0 18px color-mix(in oklch, var(--gold) 35%, transparent);
  white-space: nowrap;
}

.people-choice-disclaimer {
  max-width: 40rem;
  margin: 0;
  color: var(--crown-muted);
  font-family: var(--font-sans);
  font-size: .72rem;
  line-height: 1.45;
  text-align: center;
}

.hara-gallery__intro > .people-choice-mark {
  margin: 0 auto clamp(1rem, 2vw, 1.4rem);
}

.vote-overview__identity-type .people-choice-mark {
  margin-top: .55cqh;
  font-size: 1.25cqw;
}

.vote-overview__clock .people-choice-disclaimer {
  max-width: 18cqw;
  margin-top: .55cqh;
  margin-left: auto;
  font-size: .58cqw;
  line-height: 1.35;
}
```

The gold token is intentionally `var(--gold-bright)` rather than the arena accent, so the designation remains gold on the purple, orange, and blue contest surfaces.

- [ ] **Step 5: Run the focused tests and confirm the implementation passes**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx src/components/VotingOverviewPage.test.tsx src/styles.test.ts
```

Expected: PASS, including all existing assertions and the new exact-copy/style contracts.

- [ ] **Step 6: Commit the focused implementation**

Run:

```bash
git add src/lib/votingCopy.ts src/components/HaraGallery.tsx src/components/VotingOverviewPage.tsx src/styles.css src/components/ContestSubpageView.test.tsx src/components/VotingOverviewPage.test.tsx src/styles.test.ts
git commit -m "feat: clarify peoples choice voting status"
```

Expected: one commit containing only the implementation and its regression coverage.

---

### Task 3: Run full verification and inspect the live routes

**Files:**
- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/HaraGallery.tsx`
- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/VotingOverviewPage.tsx`
- Verify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.css`

**Interfaces:**
- Consumes: The focused implementation commit from Task 2.
- Produces: Verified test, build, diff, and browser evidence for all four contest variants.

- [ ] **Step 1: Run the complete test suite**

Run:

```bash
npm test
```

Expected: Vitest exits with code 0 and no failed tests.

- [ ] **Step 2: Build the production bundle**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 3: Check whitespace and inspect the final diff**

Run:

```bash
git diff --check HEAD~1..HEAD
git show --stat --oneline HEAD
git status --short
```

Expected: `git diff --check` prints no errors, the implementation commit lists only the scoped files, and the worktree contains no unexpected changes.

- [ ] **Step 4: Verify the subpage route in a browser**

Start the local Vite server with:

```bash
npm run dev -- --host 127.0.0.1
```

Open the Hara subpage route (`#hara`) and at least one non-Hara variant (`#booths`). Confirm at desktop and approximately 390px-wide viewport sizes that:

- `People’s Choice` appears below the program identity in gold cursive type.
- The full disclaimer appears below the voting status/deadline and wraps without clipping.
- The label and disclaimer do not overlap the search field, cards, or navigation.
- The existing roster remains usable and the page still scrolls normally.

- [ ] **Step 5: Verify the overview route in a browser**

Open the overview route for Hara (`#vote-hara/overview`) and one non-Hara variant (`#vote-booths/overview`). Confirm that:

- `People’s Choice` appears below the program title in gold cursive type.
- The disclaimer appears under the deadline note in the clock block.
- The fixed 16:10 frame still contains the podium, metrics, countdown, and complete standings without overlap or unintended scrolling inside the frame.
- The text remains legible at the desktop and narrow viewport sizes.

- [ ] **Step 6: Report any pre-existing browser warnings separately**

If the existing Three.js shader warning appears during the browser check, report it as a pre-existing caveat rather than attributing it to this copy and styling change.
