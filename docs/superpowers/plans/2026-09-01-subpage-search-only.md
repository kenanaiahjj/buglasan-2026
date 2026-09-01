# Program subpage search-only controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep search as the only roster control on all four Buglasan program subpages by removing sort controls, sort state, and the visible entry count.

**Architecture:** Keep filtering local to `HaraGallery`. Replace the current filter-and-sort helper with a search-only `filterHaraCandidates(source, query)` helper that returns a new array in the supplied source order. Remove only the component markup and CSS that render or support sorting and result counts; leave cards, voting, navigation, status, and responsive grid behavior intact.

**Tech Stack:** React, TypeScript, Vite, Vitest, and the existing component-scoped CSS in `src/styles.css`.

## Global Constraints

- Apply the change to the shared `HaraGallery` used by `hara`, `booths`, `festival`, and `gandang`.
- Keep the search input, icon, clear action, empty state, and case-insensitive matching against entry name, origin, and blurb.
- Preserve the existing supplied source order, program logo or lockup, status/deadline copy, navigation actions, cards, vote actions, live tallies, responsive layout, and motion.
- Remove `Entry number` and `Name` sorting controls, sort state, sort-option data, the `X of Y` result count, and CSS used only by those controls.
- Do not add a route, dependency, alternate sort, hidden sort state, or replacement count announcement.
- Use native controls and retain keyboard focus styles and reduced-motion behavior.
- Run focused tests, the full test suite, `npm run build`, `git diff --check`, and browser checks at desktop and narrow widths before reporting completion.

## File map

- `src/lib/haraGallery.ts`: owns the pure search-only entry filtering helper.
- `src/lib/haraGallery.test.ts`: verifies source-order preservation, matching fields, and no-match behavior.
- `src/components/HaraGallery.tsx`: owns query state and renders the single search control above the grid.
- `src/components/ContestSubpageView.test.tsx`: verifies that all program subpages keep search and no longer render sort/count UI.
- `src/styles.css`: owns the toolbar's one-column layout and removes sort/count-only CSS.
- `src/styles.test.ts`: verifies the simplified toolbar contract and absence of removed selector blocks.

---

### Task 1: Replace the filter-and-sort helper with search-only filtering

**Files:**
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/lib/haraGallery.test.ts`
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/lib/haraGallery.ts`

**Interfaces:**
- Consumes: `VoteEntry[]` from `src/lib/arenaEntries.ts` and a user query string.
- Produces: `filterHaraCandidates(source: VoteEntry[], query: string): VoteEntry[]` for `HaraGallery`.

- [ ] **Step 1: Write the failing search-only tests**

Replace the sort-oriented test contract with the following search contract. Use a dynamic module assertion during the RED step so the missing new export produces an assertion failure instead of a test-import error:

```ts
import { entriesForArena, type VoteEntry } from './arenaEntries';
import { describe, expect, it } from 'vitest';

type SearchFilter = (source: VoteEntry[], query: string) => VoteEntry[];

async function loadSearchFilter(): Promise<SearchFilter> {
  const module = (await import('./haraGallery')) as { filterHaraCandidates?: SearchFilter };
  expect(module.filterHaraCandidates).toBeTypeOf('function');
  return module.filterHaraCandidates!;
}

describe('filterHaraCandidates', () => {
  it('returns a new array in the supplied source order when the query is empty', async () => {
    const filter = await loadSearchFilter();
    const source = entriesForArena('hara').slice(0, 3).reverse();

    const visible = filter(source, '');

    expect(visible).toEqual(source);
    expect(visible).not.toBe(source);
  });

  it('searches entry name, origin, and blurb case-insensitively', async () => {
    const filter = await loadSearchFilter();
    const source = entriesForArena('hara');

    expect(filter(source, 'JESSA').map((entry) => entry.name)).toEqual(['Jessa Mae']);
    expect(filter(source, '  MANJUYOD  ').map((entry) => entry.name)).toEqual(['Kaye Nicole']);
    expect(filter(source, 'mangrove').map((entry) => entry.name)).toEqual([
      'Maria Angela',
      'Beatrice Joy',
      'Dana Faye',
    ]);
  });

  it('returns an empty list when no entry matches', async () => {
    const filter = await loadSearchFilter();

    expect(filter(entriesForArena('hara'), 'does-not-exist')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the helper tests and verify RED**

Run:

```bash
npx vitest run src/lib/haraGallery.test.ts
```

Expected result: FAIL because `filterHaraCandidates` is not exported by the current helper module.

- [ ] **Step 3: Implement the minimal search-only helper**

Replace `src/lib/haraGallery.ts` with this focused implementation:

```ts
import type { VoteEntry } from './arenaEntries';

/**
 * Filters a programme's entries for the gallery without changing their source
 * order. Search matches the entry name, town or district, and supporting copy.
 */
export function filterHaraCandidates(source: VoteEntry[], query: string): VoteEntry[] {
  const needle = query.trim().toLocaleLowerCase();

  if (!needle) return [...source];

  return source.filter((candidate) =>
    [candidate.name, candidate.origin, candidate.blurb ?? '']
      .some((field) => field.toLocaleLowerCase().includes(needle)),
  );
}
```

Remove `HaraSortKey`, `candidateNumber`, the sort parameter, and all vote/name/number sorting branches. Run the same helper test command and confirm PASS.

- [ ] **Step 4: Simplify the test import after the export exists**

After the helper passes, replace the dynamic loader with a direct import so the permanent test has a simple contract:

```ts
import { filterHaraCandidates } from './haraGallery';
```

Remove `SearchFilter`, `loadSearchFilter`, and each `await loadSearchFilter()` call. Call `filterHaraCandidates(...)` directly in the three tests. Run:

```bash
npx vitest run src/lib/haraGallery.test.ts
```

Expected result: all helper tests PASS.

- [ ] **Step 5: Commit the helper change**

```bash
git add src/lib/haraGallery.ts src/lib/haraGallery.test.ts
git commit -m "refactor: make subpage roster filtering search-only"
```

---

### Task 2: Remove sort/count markup and state from the shared gallery

**Files:**
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/ContestSubpageView.test.tsx`
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/components/HaraGallery.tsx`

**Interfaces:**
- Consumes: `filterHaraCandidates(source, query)` from Task 1.
- Produces: one labeled search field above the unchanged program entry grid.

- [ ] **Step 1: Write the failing subpage markup assertions**

In the Hara subpage test, keep the existing search assertion and replace the old positive sort/count assertions with:

```ts
expect(html).toContain('aria-label="Search candidates or town"');
expect(html).not.toContain('Entry number');
expect(html).not.toContain('>Name</button>');
expect(html).not.toContain('aria-label="Sort candidates"');
expect(html).not.toContain('hara-gallery__sort');
expect(html).not.toContain('hara-gallery__count');
expect(html).not.toContain('22 of 22 candidates');
expect(html).not.toContain('aria-live="polite"');
```

In the booths test, retain the search assertion and add:

```ts
expect(html).not.toContain('hara-gallery__sort');
expect(html).not.toContain('hara-gallery__count');
expect(html).not.toContain(`${lguBooths.length} of 23 booths`);
```

In the all-programmes chrome test, change the existing `Entry number` assertion to:

```ts
expect(html).not.toContain('Entry number');
expect(html).not.toContain('>Name</button>');
expect(html).not.toContain('hara-gallery__sort');
expect(html).not.toContain('hara-gallery__count');
```

- [ ] **Step 2: Run the component test and verify RED**

Run:

```bash
npx vitest run src/components/ContestSubpageView.test.tsx
```

Expected result: FAIL because the current `HaraGallery` still renders sorting controls and result counts.

- [ ] **Step 3: Remove sort state and markup from `HaraGallery`**

Update the import and local state:

```ts
import { filterHaraCandidates } from '../lib/haraGallery';
```

Delete `sortOptions`, replace the state/derived list with:

```ts
const [query, setQuery] = useState('');
const cfg = ARENA_VOTING[arena.id];
const programName = arenaDisplayName(arena);
const roster = useMemo(() => entriesForArena(arena.id), [arena.id]);
const visibleCandidates = useMemo(
  () => filterHaraCandidates(roster, query),
  [roster, query],
);
```

Keep the program-reset effect, but reset only the query:

```ts
// Search is per-programme state; switching programmes should not carry one
// roster's query onto another.
useEffect(() => {
  setQuery('');
}, [arena.id]);
```

Inside `.hara-gallery__toolbar`, keep the existing labeled search `<label>` unchanged and remove the entire `.hara-gallery__sort` group and `.hara-gallery__count` paragraph. The toolbar must contain only this search label:

```tsx
<div className="hara-gallery__toolbar">
  <label className="hara-gallery__search">
    <MagnifyingGlass aria-hidden="true" className="hara-gallery__search-icon" size={16} weight="bold" />
    <span className="visually-hidden">{`Search ${cfg.noun} or town`}</span>
    <input
      aria-label={`Search ${cfg.noun} or town`}
      onChange={(event) => setQuery(event.target.value)}
      placeholder={`Search ${cfg.noun} or town`}
      type="search"
      value={query}
    />
    {query.length > 0 && (
      <button
        aria-label="Clear search query"
        className="hara-gallery__search-clear"
        onClick={() => setQuery('')}
        type="button"
      >
        <X aria-hidden="true" size={13} weight="bold" />
      </button>
    )}
  </label>
</div>
```

Do not change the no-match branch, card mapping, vote callback, navigation buttons, status copy, or animation effect.

- [ ] **Step 4: Run the focused component and helper tests**

Run:

```bash
npx vitest run src/lib/haraGallery.test.ts src/components/ContestSubpageView.test.tsx
```

Expected result: all tests PASS, with all four subpages still rendering their full entry rosters and search labels.

- [ ] **Step 5: Commit the component change**

```bash
git add src/components/HaraGallery.tsx src/components/ContestSubpageView.test.tsx
git commit -m "feat: keep only search on program subpages"
```

---

### Task 3: Remove orphaned sort/count CSS and update style contracts

**Files:**
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.test.ts`
- Modify: `/Users/kenanaiahjolmfc/Documents/ChatGPT/Buglasan/src/styles.css`

**Interfaces:**
- Consumes: the single-child `.hara-gallery__toolbar` markup from Task 2.
- Produces: a one-column toolbar with the existing search focus treatment and no sort/count-only selectors.

- [ ] **Step 1: Write the failing CSS contract**

In `src/styles.test.ts`, update the toolbar contract to assert the simplified layout and removed selectors:

```ts
it('styles the Hara support block and search-only toolbar', () => {
  expect(styles).toMatch(/\.hara-gallery__support\s*\{[\s\S]*?display:\s*grid;/);
  expect(styles).toMatch(/\.hara-gallery__status-live\s*\{[\s\S]*?color:/);
  expect(styles).toMatch(/\.hara-gallery__toolbar\s*\{[\s\S]*?display:\s*grid;/);
  expect(styles).toMatch(/\.hara-gallery__toolbar\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  expect(styles).toMatch(/\.hara-gallery__search\s*\{[\s\S]*?min-height:\s*42px;/);
  expect(styles).not.toMatch(/\.hara-gallery__sort/);
  expect(styles).not.toMatch(/\.hara-gallery__count/);
  expect(styles).toMatch(/\.hara-gallery__empty\s*\{/);
  expect(styles).toMatch(/@media \(max-width:\s*640px\)[\s\S]*?\.hara-gallery__toolbar\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
});
```

- [ ] **Step 2: Run the style test and verify RED**

Run:

```bash
npx vitest run src/styles.test.ts
```

Expected result: FAIL because the current toolbar uses three columns and still contains sort/count selector blocks.

- [ ] **Step 3: Remove only the obsolete CSS**

Make these exact edits in `src/styles.css`:

1. Remove `.hara-gallery__sort button:focus-visible,` from the shared focus selector.
2. Change the toolbar declaration from:

```css
grid-template-columns: minmax(12rem, 1fr) auto auto;
```

to:

```css
grid-template-columns: minmax(0, 1fr);
```

3. Delete the complete `.hara-gallery__sort`, `.hara-gallery__sort button`, `.hara-gallery__sort button:hover`, `.hara-gallery__sort button.is-active`, `.hara-gallery__count`, and `.hara-gallery__count-chip` blocks.
4. In the `max-width: 640px` media query, delete the `.hara-gallery__sort`, `.hara-gallery__sort button`, and `.hara-gallery__count` rules. Keep the toolbar, grid, and card responsive rules.
5. In the reduced-motion media query, remove `.hara-gallery__sort button` from the transition override. Keep `.hara-gallery__search` and all card transition overrides.

- [ ] **Step 4: Run style tests and check for orphaned references**

Run:

```bash
npx vitest run src/styles.test.ts
rg -n "hara-gallery__sort|hara-gallery__count|HaraSortKey|filterAndSortHaraCandidates|Entry number|22 of 22 candidates" src
```

Expected result: the style test passes, and the `rg` command returns no matches in `src`.

- [ ] **Step 5: Commit the CSS change**

```bash
git add src/styles.css src/styles.test.ts
git commit -m "style: simplify program subpage toolbar"
```

---

### Task 4: Run the complete verification pass

**Files:**
- No source changes expected. Revisit earlier files only if a verification failure identifies a regression.

- [ ] **Step 1: Run the full test suite**

```bash
npm test -- --run
```

Expected result: Vitest exits with code 0 and reports no failed tests.

- [ ] **Step 2: Build the production bundle**

```bash
npm run build
```

Expected result: TypeScript and Vite both exit with code 0.

- [ ] **Step 3: Check the diff for whitespace errors and inspect the final diff**

```bash
git diff --check
git status --short --branch
git diff HEAD~3..HEAD -- src/components/HaraGallery.tsx src/components/ContestSubpageView.test.tsx src/lib/haraGallery.ts src/lib/haraGallery.test.ts src/styles.css src/styles.test.ts
```

Expected result: `git diff --check` exits cleanly, the intended source/test/style files are the only implementation changes, and no unrelated worktree edits are overwritten.

- [ ] **Step 4: Verify the subpages in the browser**

Start the local preview:

```bash
npm run dev -- --host 127.0.0.1 --port 5175
```

Use the in-app browser to inspect `#hara` and at least one non-Hara subpage at a desktop viewport and a narrow viewport. Confirm all of the following:

- the toolbar shows only the search field;
- no sort controls or `X of Y` count appear;
- a name, town/district, and description query filter the cards;
- a no-match query shows `Clear search`, and clearing restores the full roster;
- card `Vote` buttons still open the existing vote flow;
- `Back to home`, `How to vote`, and `Overview` still work;
- no horizontal overflow appears at the narrow viewport;
- the browser console has no new errors or warnings from this change.

- [ ] **Step 5: Stop the preview server and report evidence**

Stop the temporary Vite process, then report the exact test, build, diff, and browser verification results. Do not claim completion without fresh command output and the browser checks above.
