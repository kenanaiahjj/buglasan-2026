# Hara gallery controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add navigation, voting guidance, deadline status, search, and sorting to the Hara gallery while preserving its existing logo, twelve-card roster, layout, and staggered entrance.

**Architecture:** Keep the controls in `HaraGallery` because they only affect the Hara gallery. Extract the filter/sort calculation into a pure helper in `src/lib/haraGallery.ts` so its behavior is independently testable. Read the closing deadline from `pageantContent` and use native form controls plus a native `details` disclosure for accessible interaction.

**Tech Stack:** React 19, TypeScript, Vitest, Phosphor Icons, plain CSS, Vite.

## Global Constraints

- This change applies only to the Hara gallery at `#hara`.
- Keep the shared festival background and scene behavior unchanged.
- Keep the centered transparent Hara logo, twelve candidate records, candidate card layout, staggered entrance, and existing vote callbacks unchanged.
- Keep the removed Hara utility header, `Hara sa Dumaguete` page title, and `Voting Room` action removed.
- Use the centralized deadline `June 10, 2026 · 11:59 PM PHT`.
- Do not add a route, dependency, payment rule, or vote allowance copy.
- Use native controls with visible keyboard focus and reduced-motion support.

---

## File map

- Create `src/lib/haraGallery.ts` for the typed Hara sort key and pure candidate filtering/sorting helper.
- Create `src/lib/haraGallery.test.ts` for helper behavior tests.
- Modify `src/data/pageant.ts` to add the centralized voting deadline.
- Modify `src/components/HaraGallery.tsx` to render the navigation, voting guide, status, toolbar, and derived candidate list.
- Modify `src/components/ContestSubpageView.tsx` to pass the existing home callback into `HaraGallery`.
- Modify `src/components/ContestSubpageView.test.tsx` to assert the Hara controls and removed elements.
- Modify `src/styles.css` to style the support block, controls, status, toolbar, empty state, and responsive layout.
- Modify `src/styles.test.ts` to assert the Hara control layout and responsive contract.

## Task 1: Add and test the Hara candidate filter/sort helper

**Files:**

- Create: `src/lib/haraGallery.test.ts`
- Create: `src/lib/haraGallery.ts`

**Interfaces:**

- Consumes: `Candidate[]` from `src/data/pageant.ts`.
- Produces: `HaraSortKey = 'votes' | 'number' | 'name'` and `filterAndSortHaraCandidates(source, query, sort)` returning a new `Candidate[]`.

- [ ] **Step 1: Write the failing helper tests**

Create `src/lib/haraGallery.test.ts` with these tests:

```ts
import { describe, expect, it } from 'vitest';
import { haraCandidates } from '../data/pageant';
import { filterAndSortHaraCandidates } from './haraGallery';

describe('filterAndSortHaraCandidates', () => {
  it('keeps the candidate-number order by default', () => {
    const visible = filterAndSortHaraCandidates(haraCandidates, '', 'number');

    expect(visible.map((candidate) => candidate.number)).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
    ]);
  });

  it('searches candidate name, municipality, and advocacy', () => {
    expect(filterAndSortHaraCandidates(haraCandidates, 'jessa', 'number').map((candidate) => candidate.name)).toEqual(['Jessa Mae']);
    expect(filterAndSortHaraCandidates(haraCandidates, 'manjuyod', 'number').map((candidate) => candidate.name)).toEqual(['Kaye Nicole']);
    expect(filterAndSortHaraCandidates(haraCandidates, 'mangrove', 'number').map((candidate) => candidate.name)).toEqual(['Maria Angela', 'Beatrice Joy']);
  });

  it('sorts the complete roster by votes and name', () => {
    expect(filterAndSortHaraCandidates(haraCandidates, '', 'votes')[0].name).toBe('Jessa Mae');

    const byName = filterAndSortHaraCandidates(haraCandidates, '', 'name');
    expect(byName[0].name).toBe('Aira Mae');
    expect(byName.at(-1)?.name).toBe('Shaira');
  });

  it('returns an empty list when no candidate matches', () => {
    expect(filterAndSortHaraCandidates(haraCandidates, 'does-not-exist', 'number')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the helper tests and verify the expected failure**

Run:

```bash
npm test -- src/lib/haraGallery.test.ts
```

Expected result: FAIL because `src/lib/haraGallery.ts` does not exist yet.

- [ ] **Step 3: Implement the minimal pure helper**

Create `src/lib/haraGallery.ts` with:

```ts
import type { Candidate } from '../data/pageant';

export type HaraSortKey = 'votes' | 'number' | 'name';

const candidateNumber = (candidate: Candidate) => Number.parseInt(candidate.number, 10);

export function filterAndSortHaraCandidates(
  source: Candidate[],
  query: string,
  sort: HaraSortKey,
): Candidate[] {
  const needle = query.trim().toLocaleLowerCase();
  const matched = needle
    ? source.filter((candidate) =>
        [candidate.name, candidate.location, candidate.advocacy ?? '']
          .some((field) => field.toLocaleLowerCase().includes(needle)),
      )
    : [...source];

  return matched.sort((left, right) => {
    if (sort === 'votes') {
      return right.votes - left.votes || candidateNumber(left) - candidateNumber(right);
    }
    if (sort === 'name') {
      return left.name.localeCompare(right.name) || candidateNumber(left) - candidateNumber(right);
    }
    return candidateNumber(left) - candidateNumber(right);
  });
}
```

- [ ] **Step 4: Run the helper tests and verify they pass**

Run:

```bash
npm test -- src/lib/haraGallery.test.ts
```

Expected result: 1 test file and 4 tests pass.

- [ ] **Step 5: Commit the helper**

```bash
git add -- src/lib/haraGallery.ts src/lib/haraGallery.test.ts
git commit -m "feat: add Hara candidate filtering"
```

## Task 2: Add the centralized voting deadline

**Files:**

- Modify: `src/data/pageant.ts:78-86`
- Modify: `src/components/ContestSubpageView.test.tsx`

**Interfaces:**

- Consumes: the existing `pageantContent` object.
- Produces: `pageantContent.votingDeadline` with the exact display value `June 10, 2026 · 11:59 PM PHT`.

- [ ] **Step 1: Add a failing data contract**

Import `pageantContent` in `src/components/ContestSubpageView.test.tsx` and add this test before the existing Hara tests:

```tsx
it('keeps the Hara voting deadline centralized in pageant content', () => {
  expect((pageantContent as { votingDeadline?: string }).votingDeadline).toBe('June 10, 2026 · 11:59 PM PHT');
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx
```

Expected result: FAIL because `pageantContent.votingDeadline` is undefined.

- [ ] **Step 3: Add the centralized deadline**

In `src/data/pageant.ts`, add the property after `votingWindow`:

```ts
  votingWindow: 'May 20, 2026 — June 10, 2026',
  votingDeadline: 'June 10, 2026 · 11:59 PM PHT',
  countdown: { days: '06', hours: '12', minutes: '45' },
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx
```

Expected result: the new deadline test passes; any existing Hara control assertions remain unchanged until Task 3.

- [ ] **Step 5: Commit the data contract**

```bash
git add -- src/data/pageant.ts src/components/ContestSubpageView.test.tsx
git commit -m "feat: centralize Hara voting deadline"
```

## Task 3: Add Hara navigation, voting guidance, status, and toolbar markup

**Files:**

- Modify: `src/components/HaraGallery.tsx`
- Modify: `src/components/ContestSubpageView.tsx:93-100`
- Modify: `src/components/ContestSubpageView.test.tsx`

**Interfaces:**

- Consumes: `onBackToHub`, `haraCandidates`, `pageantContent.votingDeadline`, `HaraSortKey`, and `filterAndSortHaraCandidates`.
- Produces: a Hara page with `Back to home`, native `How to vote`, open status, deadline, search, sort buttons, live count, and filtered cards.

- [ ] **Step 1: Extend the Hara component contract tests**

In the Hara subpage test, add these assertions after the existing `class="hara-gallery"` assertion:

```tsx
    expect(html).toContain('Back to home');
    expect(html).toContain('How to vote');
    expect(html).toContain('Sign in');
    expect(html).toContain('Voting is open');
    expect(html).toContain('June 10, 2026 · 11:59 PM PHT');
    expect(html).toContain('aria-label="Search candidates or town"');
    expect(html).toContain('Most votes');
    expect(html).toContain('Candidate number');
    expect(html).toContain('Name');
    expect(html).toContain('12 of 12 candidates');
    expect(html).toContain('aria-live="polite"');
```

Keep these removal assertions in the same test:

```tsx
    expect(html).not.toContain('id="hara-gallery-title"');
    expect(html).not.toContain('class="subpage-header');
    expect(html).not.toContain('Festival Hub');
    expect(html).not.toContain('Voting Room');
```

- [ ] **Step 2: Run the Hara component test and verify the expected failure**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx
```

Expected result: FAIL because the new controls are not rendered.

- [ ] **Step 3: Add local filtering state and imports**

Update `src/components/HaraGallery.tsx` imports and props to this shape:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/icons/MagnifyingGlass';
import { MapPin } from '@phosphor-icons/react/dist/icons/MapPin';
import { enter } from '../lib/enter';
import { filterAndSortHaraCandidates, type HaraSortKey } from '../lib/haraGallery';
import { haraCandidates, pageantContent, type ContestArena } from '../data/pageant';

type HaraGalleryProps = {
  arena: ContestArena;
  onBackToHub: () => void;
  onVote: (id: ContestArena['id']) => void;
};

const cardRotations = [-1.2, 1.1, -0.6, 0.8, -1, 1.4, -0.7, 1, -0.9, 0.6, -0.5, 1.2];
const sortOptions: Array<[HaraSortKey, string]> = [
  ['votes', 'Most votes'],
  ['number', 'Candidate number'],
  ['name', 'Name'],
];

export function HaraGallery({ arena, onBackToHub, onVote }: HaraGalleryProps) {
  const galleryRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<HaraSortKey>('number');
  const visibleCandidates = useMemo(
    () => filterAndSortHaraCandidates(haraCandidates, query, sort),
    [query, sort],
  );
```

Retain the existing `useEffect` that animates `.hara-gallery-card__motion`.

- [ ] **Step 4: Add the support block and toolbar before the card grid**

Replace the current empty `.hara-gallery__intro` contents and add the support block and toolbar immediately before `.hara-gallery__grid`:

```tsx
      <div className="hara-gallery__intro">
        {arena.logo && (
          <img
            alt="Hara sa Negros Oriental 2026"
            className="hara-gallery__logo"
            decoding="async"
            height={447}
            loading="eager"
            src={arena.logo}
            width={447}
          />
        )}

        <div className="hara-gallery__support">
          <div className="hara-gallery__actions">
            <button className="hara-gallery__home" onClick={onBackToHub} type="button">
              <ArrowLeft aria-hidden="true" size={15} weight="bold" />
              <span>Back to home</span>
            </button>

            <details className="hara-gallery__how-to">
              <summary>How to vote</summary>
              <ol>
                <li><strong>Sign in</strong> with your email or mobile number.</li>
                <li><strong>Choose</strong> the candidate you want to support.</li>
                <li><strong>Review</strong> your selection before submitting.</li>
                <li><strong>Confirm</strong> your vote in the voting room.</li>
              </ol>
            </details>
          </div>

          <p className="hara-gallery__status" role="status">
            <span className="hara-gallery__status-live"><span aria-hidden="true" />Voting is open</span>
            <span>Ends {pageantContent.votingDeadline}</span>
          </p>
        </div>
      </div>

      <div className="hara-gallery__toolbar">
        <label className="hara-gallery__search">
          <MagnifyingGlass aria-hidden="true" size={16} />
          <span className="visually-hidden">Search candidates or town</span>
          <input
            aria-label="Search candidates or town"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search candidates or town"
            type="search"
            value={query}
          />
        </label>

        <div className="hara-gallery__sort" aria-label="Sort candidates" role="group">
          {sortOptions.map(([key, label]) => (
            <button
              aria-pressed={sort === key}
              className={sort === key ? 'is-active' : undefined}
              key={key}
              onClick={() => setSort(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <p className="hara-gallery__count" aria-live="polite">
          {visibleCandidates.length} of {haraCandidates.length} candidates
        </p>
      </div>
```

- [ ] **Step 5: Render the derived list and empty state**

Replace `haraCandidates.map` with this complete block:

```tsx
      {visibleCandidates.length === 0 ? (
        <p className="hara-gallery__empty" role="status">
          No candidates match <strong>“{query}”</strong>.{' '}
          <button onClick={() => setQuery('')} type="button">Clear search</button>
        </p>
      ) : (
        <div className="hara-gallery__grid" aria-label="Hara sa Dumaguete contestants">
          {visibleCandidates.map((candidate, index) => (
            <article
              className="hara-gallery-card"
              key={candidate.id}
              style={{ '--hara-card-rotation': `${cardRotations[index]}deg` } as CSSProperties}
            >
              <div className="hara-gallery-card__motion">
                <div className="hara-gallery-card__media">
                  <img
                    alt={`${candidate.name} representing ${candidate.location}`}
                    decoding="async"
                    height={512}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    src={candidate.image}
                    width={512}
                  />
                  <span aria-label={`Candidate ${candidate.number}`} className="hara-gallery-card__number">
                    {candidate.number}
                  </span>
                  <div className="hara-gallery-card__caption">
                    <span className="hara-gallery-card__location">
                      <MapPin aria-hidden="true" size={13} weight="fill" />
                      {candidate.location}
                    </span>
                    <h2>{candidate.name}</h2>
                  </div>
                </div>

                <div className="hara-gallery-card__body">
                  {candidate.advocacy && <p>{candidate.advocacy}</p>}
                  <div className="hara-gallery-card__footer">
                    <span>{candidate.votes.toLocaleString()} votes</span>
                    <button
                      aria-label={`Vote for ${candidate.name}`}
                      className="subpage-vote-btn"
                      onClick={() => onVote(arena.id)}
                      type="button"
                    >
                      Vote for {candidate.name}
                      <ArrowRight aria-hidden="true" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
```

Use the candidate's current filtered `index` for the existing rotation array. The
empty state button only clears `query`; it does not reset the selected sort.

- [ ] **Step 6: Pass the home callback into `HaraGallery`**

Update the Hara branch in `src/components/ContestSubpageView.tsx`:

```tsx
        <HaraGallery
          arena={arena}
          onBackToHub={onBackToHub}
          onVote={onVote}
        />
```

- [ ] **Step 7: Run the focused component tests and verify they pass**

Run:

```bash
npm test -- src/components/ContestSubpageView.test.tsx src/lib/haraGallery.test.ts
```

Expected result: 2 test files pass, including the controls, removal contract, roster count, and helper behavior.

- [ ] **Step 8: Commit the Hara behavior**

```bash
git add -- src/components/HaraGallery.tsx src/components/ContestSubpageView.tsx src/components/ContestSubpageView.test.tsx src/lib/haraGallery.ts src/lib/haraGallery.test.ts
git commit -m "feat: add Hara gallery controls"
```

## Task 4: Style the controls and responsive states

**Files:**

- Modify: `src/styles.css:1535-1708`
- Modify: `src/styles.test.ts`

**Interfaces:**

- Consumes: the class names emitted by `HaraGallery`.
- Produces: centered logo support controls, quiet status treatment, usable search/sort toolbar, empty state, visible focus states, and narrow-screen wrapping.

- [ ] **Step 1: Write the failing style contracts**

Add this test to the Hara gallery section in `src/styles.test.ts`:

```ts
  it('styles the Hara support block and candidate toolbar', () => {
    expect(styles).toMatch(/\.hara-gallery__support\s*\{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(/\.hara-gallery__status-live\s*\{[\s\S]*?color:/);
    expect(styles).toMatch(/\.hara-gallery__toolbar\s*\{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(/\.hara-gallery__search\s*\{[\s\S]*?min-height:\s*42px;/);
    expect(styles).toMatch(/\.hara-gallery__sort\s+button\.is-active/);
    expect(styles).toMatch(/\.hara-gallery__empty\s*\{/);
    expect(styles).toMatch(/@media \(max-width:\s*640px\)[\s\S]*?\.hara-gallery__toolbar\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
  });
```

- [ ] **Step 2: Run the style test and verify the expected failure**

Run:

```bash
npm test -- src/styles.test.ts
```

Expected result: FAIL because the new Hara control selectors do not exist.

- [ ] **Step 3: Add the desktop styles**

Insert these rules after `.hara-gallery__logo` and before `.hara-gallery__grid` in `src/styles.css`:

```css
.hara-gallery__support {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  width: min(1240px, 100%);
  margin-top: clamp(0.8rem, 1.8vw, 1.25rem);
}

.hara-gallery__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.55rem;
}

.hara-gallery__home,
.hara-gallery__how-to summary {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 36px;
  padding: 0 0.85rem;
  border: 1px solid rgba(224, 178, 84, 0.35);
  border-radius: 999px;
  color: var(--crown-ivory);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 650;
  background: rgba(2, 12, 7, 0.48);
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
}

.hara-gallery__home:hover,
.hara-gallery__how-to summary:hover,
.hara-gallery__how-to[open] summary {
  border-color: rgba(247, 211, 119, 0.72);
  background: rgba(18, 45, 28, 0.7);
}

.hara-gallery__home:focus-visible,
.hara-gallery__how-to summary:focus-visible,
.hara-gallery__sort button:focus-visible,
.hara-gallery__empty button:focus-visible,
.hara-gallery__search:focus-within {
  outline: 2px solid var(--crown-gold-light);
  outline-offset: 3px;
}

.hara-gallery__how-to {
  position: relative;
}

.hara-gallery__how-to summary {
  list-style: none;
}

.hara-gallery__how-to summary::-webkit-details-marker {
  display: none;
}

.hara-gallery__how-to ol {
  position: absolute;
  z-index: 2;
  top: calc(100% + 0.55rem);
  left: 50%;
  width: min(310px, calc(100vw - 2rem));
  margin: 0;
  padding: 0.85rem 1rem 0.85rem 2rem;
  border: 1px solid rgba(224, 178, 84, 0.3);
  border-radius: 14px;
  color: rgba(245, 244, 232, 0.78);
  background: rgba(2, 12, 7, 0.95);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.3);
  transform: translateX(-50%);
}

.hara-gallery__how-to li {
  padding: 0.2rem 0;
  font-size: 0.78rem;
  line-height: 1.45;
}

.hara-gallery__how-to li::marker {
  color: var(--crown-gold-light);
  font-weight: 700;
}

.hara-gallery__how-to strong {
  color: var(--crown-ivory);
}

.hara-gallery__status {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem 1rem;
  margin: 0;
  color: rgba(225, 232, 220, 0.72);
  font-size: 0.76rem;
  line-height: 1.4;
  text-align: center;
}

.hara-gallery__status-live {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  color: #70f19a;
  font-weight: 700;
}

.hara-gallery__status-live span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px rgba(112, 241, 154, 0.12);
}

.hara-gallery__toolbar {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) auto auto;
  align-items: center;
  gap: 0.7rem;
  width: min(1240px, 100%);
  margin: 0 auto 1.2rem;
}

.hara-gallery__search {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 42px;
  padding: 0 0.9rem;
  border: 1px solid rgba(224, 178, 84, 0.25);
  border-radius: 999px;
  color: rgba(247, 211, 119, 0.78);
  background: rgba(2, 12, 7, 0.54);
  transition: border-color 180ms ease, background 180ms ease;
}

.hara-gallery__search:focus-within {
  border-color: rgba(247, 211, 119, 0.7);
  background: rgba(5, 21, 12, 0.74);
}

.hara-gallery__search input {
  width: 100%;
  border: 0;
  color: var(--crown-ivory);
  font: inherit;
  font-size: 0.82rem;
  background: transparent;
  outline: 0;
}

.hara-gallery__search input::placeholder {
  color: rgba(225, 232, 220, 0.5);
}

.hara-gallery__sort {
  display: flex;
  gap: 0.15rem;
  padding: 3px;
  border: 1px solid rgba(224, 178, 84, 0.24);
  border-radius: 999px;
  background: rgba(2, 12, 7, 0.42);
}

.hara-gallery__sort button {
  min-height: 34px;
  padding: 0 0.7rem;
  border: 0;
  border-radius: 999px;
  color: rgba(225, 232, 220, 0.62);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 650;
  background: transparent;
  cursor: pointer;
  transition: color 180ms ease, background 180ms ease;
}

.hara-gallery__sort button:hover,
.hara-gallery__sort button.is-active {
  color: var(--crown-ivory);
  background: rgba(224, 178, 84, 0.18);
}

.hara-gallery__count {
  margin: 0;
  color: rgba(225, 232, 220, 0.58);
  font-size: 0.72rem;
  white-space: nowrap;
}

.hara-gallery__empty {
  width: min(1240px, 100%);
  margin: 4rem auto;
  color: rgba(225, 232, 220, 0.72);
  font-size: 0.9rem;
  text-align: center;
}

.hara-gallery__empty strong {
  color: var(--crown-ivory);
}

.hara-gallery__empty button {
  padding: 0;
  border: 0;
  color: var(--crown-gold-light);
  font: inherit;
  background: transparent;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
```

- [ ] **Step 4: Add narrow-screen styles and reduced-motion coverage**

Add these declarations to the existing Hara responsive sections:

```css
@media (max-width: 640px) {
  .hara-gallery__toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .hara-gallery__sort {
    justify-content: stretch;
  }

  .hara-gallery__sort button {
    flex: 1 1 0;
    padding-inline: 0.35rem;
  }

  .hara-gallery__count {
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hara-gallery__home,
  .hara-gallery__how-to summary,
  .hara-gallery__search,
  .hara-gallery__sort button {
    transition: none;
  }
}
```

- [ ] **Step 5: Run the style test and verify it passes**

Run:

```bash
npm test -- src/styles.test.ts
```

Expected result: the Hara gallery style tests pass.

- [ ] **Step 6: Commit the visual treatment**

```bash
git add -- src/styles.css src/styles.test.ts
git commit -m "feat: style Hara gallery controls"
```

## Task 5: Run the complete verification pass

**Files:**

- Verify: `src/components/HaraGallery.tsx`
- Verify: `src/components/ContestSubpageView.tsx`
- Verify: `src/lib/haraGallery.ts`
- Verify: `src/data/pageant.ts`
- Verify: `src/styles.css`

**Interfaces:**

- Consumes: the complete Hara gallery implementation from Tasks 1–4.
- Produces: a verified desktop and mobile Hara route with working controls and no regressions.

- [ ] **Step 1: Run the complete automated test suite**

Run:

```bash
npm test
```

Expected result: all test files and tests pass.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected result: TypeScript compilation and Vite production build pass.

- [ ] **Step 3: Check the diff**

Run:

```bash
git diff --check
```

Expected result: no whitespace errors.

- [ ] **Step 4: Verify the desktop browser route**

Open `http://127.0.0.1:5174/#hara` and confirm:

1. The logo remains centered and the removed header/title/`Voting Room` elements remain absent.
2. `Back to home` is directly below the logo and invokes the existing hub callback.
3. `How to vote` opens with four readable steps and closes with the native disclosure control.
4. `Voting is open` and `Ends June 10, 2026 · 11:59 PM PHT` are visible.
5. The search field filters by candidate name, municipality, and advocacy.
6. `Most votes`, `Candidate number`, and `Name` change the visible order.
7. The result count updates and the empty state clears the query.
8. All twelve cards remain available when the query is empty.

- [ ] **Step 5: Verify the narrow browser route and keyboard path**

Use a narrow viewport and confirm:

1. The search field occupies the first toolbar row.
2. Sort controls wrap below it without horizontal overflow.
3. The support actions remain reachable without hover.
4. Keyboard focus is visible on the home action, disclosure, search input, sort buttons, vote buttons, and clear action.
5. Reduced motion still leaves the cards visible without entrance animation.

- [ ] **Step 6: Commit the verified implementation**

```bash
git add -- src/components/HaraGallery.tsx src/components/ContestSubpageView.tsx src/components/ContestSubpageView.test.tsx src/data/pageant.ts src/lib/haraGallery.ts src/lib/haraGallery.test.ts src/styles.css src/styles.test.ts
git commit -m "feat: complete Hara gallery controls"
```
