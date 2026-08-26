# Hara voting overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate `#hara/overview` full-screen leaderboard that presents simulated Hara voting standings through an API-ready snapshot source.

**Architecture:** Keep `LandingPage` as the hash-driven view coordinator. Add a focused `VotingOverviewPage` that consumes a replaceable `VotingOverviewSource`, and keep ranking, percentage, and leader-gap calculations in `src/lib/votingOverview.ts`. Seed the simulation from the existing Hara candidate records and `state.arenaTallies.hara`; a future API can implement the same snapshot and subscription contract without changing the page layout.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, GSAP `enter`, Phosphor icons, existing CSS custom properties, and the existing quiet `FestivalScene` background.

## Global Constraints

- Use the existing quiet festival background; do not reintroduce fireworks, the 3D logo, particles, shaders, or landing-page hover illustrations.
- Keep the Hara gallery at `#hara` and add the overview at `#hara/overview`.
- Use simulated updates seeded from existing Hara vote totals; do not add a network request, authentication, persistence, WebSocket, or server-side voting logic.
- Keep the simulation label explicit as `Live simulation`; do not present simulated totals as official real-time results.
- Do not invent electorate size, turnout, or other metrics unsupported by current data.
- Keep the overview utility control flat like the main navigation: no pill border, capsule radius, or filled surface.
- Leave the other three program pages, the landing scene, candidate card structure, vote limits, and payment behavior unchanged.
- Respect `prefers-reduced-motion: reduce` for page entry, update emphasis, and staggered rendering.
- Preserve unrelated dirty-worktree changes and stage only the files listed in each task.

---

### Task 1: Create the voting overview snapshot and simulation boundary

**Files:**
- Create: `src/lib/votingOverview.ts`
- Test: `src/lib/votingOverview.test.ts`

**Interfaces:**
- Consumes: `Candidate` and `ContestArena['id']` from `src/data/pageant.ts`, plus a `Record<string, number>` tally map.
- Produces: `VotingOverviewEntry`, `VotingOverviewSnapshot`, `RankedVotingOverviewEntry`, `VotingOverviewSource`, `createVotingOverviewSnapshot`, `rankVotingOverviewEntries`, and `createSimulatedVotingSource`.

- [ ] **Step 1: Write the failing data-contract tests**

Create tests for totals, deterministic ties, shares, leader gaps, simulation updates, and subscription cleanup:

~~~ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { haraCandidates } from '../data/pageant';
import {
  createSimulatedVotingSource,
  createVotingOverviewSnapshot,
  rankVotingOverviewEntries,
} from './votingOverview';

describe('voting overview calculations', () => {
  it('builds totals and deterministic ranking from the Hara tally', () => {
    const snapshot = createVotingOverviewSnapshot(
      'hara',
      haraCandidates.slice(0, 3),
      { 'c-01': 10, 'c-02': 10, 'c-03': 3 },
      'simulation',
      123,
    );
    const ranked = rankVotingOverviewEntries(snapshot);

    expect(snapshot.totalVotes).toBe(23);
    expect(ranked.map((entry) => [entry.rank, entry.number, entry.votes])).toEqual([
      [1, '01', 10],
      [2, '02', 10],
      [3, '03', 3],
    ]);
    expect(ranked[0].voteShare).toBeCloseTo(10 / 23, 5);
    expect(ranked[1].gapToLeader).toBe(0);
    expect(ranked[2].gapToLeader).toBe(7);
  });
});

describe('simulated voting overview source', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-26T09:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits one deterministic update and stops after unsubscribe', () => {
    const source = createSimulatedVotingSource(
      haraCandidates.slice(0, 3),
      { 'c-01': 10, 'c-02': 8, 'c-03': 3 },
      6000,
    );
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);

    vi.advanceTimersByTime(6000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(source.getSnapshot().totalVotes).toBe(23);
    expect(source.getSnapshot().source).toBe('simulation');

    unsubscribe();
    listener.mockClear();
    vi.advanceTimersByTime(12000);
    expect(listener).not.toHaveBeenCalled();
  });
});
~~~

- [ ] **Step 2: Run the data tests to verify the expected failure**

Run:

~~~bash
npm test -- src/lib/votingOverview.test.ts
~~~

Expected: Vitest fails because the module and its exports do not exist yet.

- [ ] **Step 3: Implement the data boundary**

Export these exact types and function signatures:

~~~ts
export type VotingOverviewEntry = {
  id: string;
  number: string;
  name: string;
  location: string;
  image: string;
  votes: number;
};

export type VotingOverviewSnapshot = {
  arenaId: ContestArena['id'];
  entries: VotingOverviewEntry[];
  totalVotes: number;
  updatedAt: number;
  source: 'simulation' | 'api';
};

export type RankedVotingOverviewEntry = VotingOverviewEntry & {
  rank: number;
  voteShare: number;
  gapToLeader: number;
};

export type VotingOverviewSource = {
  getSnapshot: () => VotingOverviewSnapshot;
  subscribe: (listener: (snapshot: VotingOverviewSnapshot) => void) => () => void;
};

export function createVotingOverviewSnapshot(
  arenaId: ContestArena['id'],
  candidates: Candidate[],
  tallies: Record<string, number>,
  source: VotingOverviewSnapshot['source'],
  updatedAt?: number,
): VotingOverviewSnapshot;

export function rankVotingOverviewEntries(
  snapshot: VotingOverviewSnapshot,
): RankedVotingOverviewEntry[];

export function createSimulatedVotingSource(
  candidates: Candidate[],
  initialTallies: Record<string, number>,
  intervalMs?: number,
): VotingOverviewSource;
~~~

Map identity fields from `Candidate` and use `tallies[candidate.id] ?? candidate.votes` for each entry. Sum mapped votes for `totalVotes`. Sort by descending votes and then ascending numeric candidate number. Calculate `voteShare` as `votes / totalVotes`, using `0` when the total is zero. Calculate `gapToLeader` as `leaderVotes - entry.votes`.

Implement the simulator with fixed target and increment sequences instead of `Math.random()`. Use target indexes `[0, 1, 2, 0, 2, 1]` and increments `[2, 1, 3, 1, 2, 1]`, looping when the sequence ends. Start the six-second interval when the first listener subscribes. Each tick updates one existing candidate by one to three votes and refreshes `updatedAt`. Clear the interval when the final listener unsubscribes. Keep `source: 'simulation'` in every emitted snapshot.

- [ ] **Step 4: Run the data tests to verify the implementation**

Run:

~~~bash
npm test -- src/lib/votingOverview.test.ts
~~~

Expected: both tests pass with no timer leaks.

- [ ] **Step 5: Commit the isolated data-layer change**

~~~bash
git add src/lib/votingOverview.ts src/lib/votingOverview.test.ts
git commit -m "feat: add Hara voting overview data source"
~~~

### Task 2: Build the full-screen overview component

**Files:**
- Create: `src/components/VotingOverviewPage.tsx`
- Test: `src/components/VotingOverviewPage.test.tsx`

**Interfaces:**
- Consumes: `ContestArena`, `state.arenaTallies.hara`, `pageantContent.votingDeadline`, `haraCandidates`, `createSimulatedVotingSource`, `rankVotingOverviewEntries`, and `enter`.
- Produces: `VotingOverviewPage` with props `{ arena: ContestArena; tallies: Record<string, number>; onBackToHara: () => void; onBackToHub: () => void }`.

- [ ] **Step 1: Write the failing component test**

~~~tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { contestArenas, haraCandidates, pageantContent } from '../data/pageant';
import { VotingOverviewPage } from './VotingOverviewPage';

describe('VotingOverviewPage', () => {
  it('renders the simulated Hara standings for event display', () => {
    const hara = contestArenas.find((arena) => arena.id === 'hara')!;
    const html = renderToStaticMarkup(
      <VotingOverviewPage
        arena={hara}
        onBackToHara={() => undefined}
        onBackToHub={() => undefined}
        tallies={Object.fromEntries(haraCandidates.map((candidate) => [candidate.id, candidate.votes]))}
      />,
    );

    expect(html).toContain('Hara sa Negros Oriental');
    expect(html).toContain('Public voting overview');
    expect(html).toContain('Live simulation');
    expect(html).toContain('Currently leading');
    expect(html).toContain('Total votes');
    expect(html).toContain(pageantContent.votingDeadline);
    expect(html.match(/class="hara-overview__rank-row"/g)).toHaveLength(12);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Back to Hara');
    expect(html).toContain('Festival Hub');
  });
});
~~~

- [ ] **Step 2: Run the component test to verify the expected failure**

~~~bash
npm test -- src/components/VotingOverviewPage.test.tsx
~~~

Expected: Vitest fails because the component does not exist yet.

- [ ] **Step 3: Implement the page and snapshot subscription**

Use `useMemo(() => createSimulatedVotingSource(haraCandidates, tallies), [arena.id, tallies])` and `useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot)`. Derive the sorted entries with `rankVotingOverviewEntries(snapshot)`. Render one `main` landmark with the heading `Hara sa Negros Oriental`, the exact supporting line `Public voting overview`, visible `Live simulation` text, and the note `Prototype standings update automatically for demonstration.`

The page must contain:

- a utility header with `Back to Hara` and `Festival Hub` buttons;
- a metrics region with `Total votes`, `Candidates`, `Leader`, and `Voting ends`;
- a `Currently leading` article showing the leader's portrait, number, name, location, formatted votes, percentage share, and lead text;
- second- and third-place articles showing rank, portrait, name, location, and formatted votes;
- an ordered list with exactly one `hara-overview__rank-row` per ranked entry;
- ranking rows containing rank, number, portrait, name, location, formatted votes, percentage text, and a proportional bar;
- a polite live region containing the source label and refresh time without announcing the entire ranking on each update.

Use `aria-label` values for the metrics, standings, and ranking sections. Use meaningful portrait alt text. Express a positive leader gap as `Lead by N votes`; show `Tied for the lead` when the gap is zero. Keep all vote values derived from the snapshot.

- [ ] **Step 4: Run the component test to verify it passes**

~~~bash
npm test -- src/components/VotingOverviewPage.test.tsx
~~~

Expected: one test passes and the markup contains 12 ranking rows.

- [ ] **Step 5: Commit the isolated overview component**

~~~bash
git add src/components/VotingOverviewPage.tsx src/components/VotingOverviewPage.test.tsx
git commit -m "feat: add Hara voting overview page"
~~~

### Task 3: Connect Hara navigation and hash routing

**Files:**
- Modify: `src/components/HaraGallery.tsx`
- Modify: `src/components/ContestSubpageView.tsx`
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/ContestSubpageView.test.tsx`
- Modify: `src/components/LandingPage.test.tsx`

**Interfaces:**
- Consumes: `VotingOverviewPage` from Task 2 and `state.arenaTallies.hara`.
- Produces: an `Overview` action beside `How to vote`, `#hara/overview` recognition, and back navigation to `#hara` and `#contests`.

- [ ] **Step 1: Write failing navigation assertions**

Pass an `onOpenOverview` callback in the Hara test render and add:

~~~tsx
expect(html).toContain('Overview');
expect(html).toContain('aria-label="Open Hara voting overview"');
~~~

Add a `LandingPage` route test that sets `window.location.hash = '#hara/overview'`, renders the page using the existing test setup, and asserts `Hara sa Negros Oriental`, `Live simulation`, and the absence of `class="hara-gallery"`. Restore the prior hash in cleanup.

- [ ] **Step 2: Run navigation tests to verify the expected failure**

~~~bash
npm test -- src/components/ContestSubpageView.test.tsx src/components/LandingPage.test.tsx
~~~

Expected: the tests fail because the callback and hash route are not wired.

- [ ] **Step 3: Add the Hara overview control**

Add `onOpenOverview: () => void` to `HaraGalleryProps` and `ContestSubpageViewProps`. Import the Phosphor `ChartBar` icon and render this control after the `How to vote` details:

~~~tsx
<button
  aria-label="Open Hara voting overview"
  className="hara-gallery__overview"
  onClick={onOpenOverview}
  type="button"
>
  <ChartBar aria-hidden="true" size={15} weight="bold" />
  <span>Overview</span>
</button>
~~~

Include the new class in the existing flat utility-control selector and focus selector. Leave the `How to vote` details popup unchanged.

- [ ] **Step 4: Add the hash state and render branch**

In `LandingPage`, add `const [activeOverview, setActiveOverview] = useState(false)`. Recognize `hara/overview` before the plain arena-id branch:

~~~ts
if (hash === 'hara/overview') {
  setActiveOverview(true);
  setActiveSubpage('hara');
  setActiveVote(null);
  window.scrollTo(0, 0);
} else if (hash.startsWith('vote-') && arenaIds.includes(hash.slice(5))) {
  setActiveOverview(false);
  setActiveVote(hash.slice(5) as ContestArena['id']);
  setActiveSubpage(null);
  window.scrollTo(0, 0);
} else if (arenaIds.includes(hash)) {
  setActiveOverview(false);
  setActiveSubpage(hash as ContestArena['id']);
  setActiveVote(null);
  window.scrollTo(0, 0);
}
~~~

Add `openOverview` and `closeOverview`:

~~~ts
const openOverview = () => {
  setActiveOverview(true);
  setActiveSubpage('hara');
  setActiveVote(null);
  window.location.hash = 'hara/overview';
  window.scrollTo(0, 0);
};

const closeOverview = () => {
  setActiveOverview(false);
  setActiveSubpage('hara');
  setActiveVote(null);
  window.location.hash = 'hara';
  window.scrollTo(0, 0);
};
~~~

Reset `activeOverview` in `openSubpage`, `openVoting`, and `closeSubpage`. Render `VotingOverviewPage` after the `activeVote` branch and before the `activeSubpage` branch, passing `activeArena`, `state.arenaTallies.hara`, `closeOverview`, and `closeSubpage`. Pass `openOverview` into `ContestSubpageView`. Keep `quiet={Boolean(activeSubpage || activeVote)}` so the existing quiet scene remains mounted.

- [ ] **Step 5: Run navigation tests to verify they pass**

~~~bash
npm test -- src/components/ContestSubpageView.test.tsx src/components/LandingPage.test.tsx
~~~

Expected: the Hara gallery exposes `Overview`, `#hara/overview` renders the overview, and `#hara` still renders the gallery.

- [ ] **Step 6: Commit the navigation integration**

~~~bash
git add src/components/HaraGallery.tsx src/components/ContestSubpageView.tsx src/components/LandingPage.tsx src/components/ContestSubpageView.test.tsx src/components/LandingPage.test.tsx
git commit -m "feat: route Hara voting overview"
~~~

### Task 4: Style the overview for event displays and responsive screens

**Files:**
- Modify: `src/styles.css`
- Modify: `src/styles.test.ts`

**Interfaces:**
- Consumes: the overview class names emitted by Task 2 and the flat utility-control styles from the previous Hara work.
- Produces: a full-height broadcast scoreboard with responsive layout, visible focus, update emphasis, and reduced-motion behavior.

- [ ] **Step 1: Write the failing style assertions**

Add:

~~~ts
it('styles the Hara overview as a full-screen scoreboard', () => {
  expect(styles).toMatch(/\.hara-overview\s*\{[\s\S]*?min-height:\s*100dvh;/);
  expect(styles).toMatch(/\.hara-overview__standings\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*2fr\)\s+minmax\(18rem,\s*1fr\);/);
  expect(styles).toMatch(/\.hara-overview__rank-row\s*\{[\s\S]*?display:\s*grid;/);
  expect(styles).toMatch(/\.hara-overview__rank-bar\s*\{[\s\S]*?transform-origin:\s*left;/);
  expect(styles).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.hara-overview__update/);
});
~~~

Update the utility selector to include `.hara-gallery__overview` and retain `border: 0`, `border-radius: 0`, and `background: transparent`.

- [ ] **Step 2: Run the style test to verify the expected failure**

~~~bash
npm test -- src/styles.test.ts -t "Hara overview"
~~~

Expected: the focused test fails because the overview selectors do not exist.

- [ ] **Step 3: Add the overview styles**

Add the overview rules after the Hara gallery rules and before the generic subpage header. The core layout must include:

~~~css
.hara-overview {
  min-height: 100dvh;
  padding: clamp(1.5rem, 4vw, 3.5rem) clamp(1.25rem, 4vw, 4rem) 5rem;
  color: var(--crown-ivory);
}

.hara-overview__inner,
.hara-overview__header,
.hara-overview__metrics,
.hara-overview__standings,
.hara-overview__ranking {
  width: min(1240px, 100%);
  margin-inline: auto;
}

.hara-overview__standings {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(18rem, 1fr);
  gap: clamp(1rem, 2vw, 1.5rem);
}

.hara-overview__ranking ol {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hara-overview__rank-row {
  display: grid;
  grid-template-columns: 2rem 2.5rem minmax(10rem, 1fr) minmax(8rem, 1.4fr) auto;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.hara-overview__rank-bar {
  transform-origin: left;
  transition: transform 360ms var(--ease-out-soft), background 180ms ease;
}

.hara-overview__update {
  animation: hara-overview-update 650ms ease both;
}
~~~

Give the leader panel the strongest border and type scale. Stack second and third place in the right column. Set rank bar width from `entry.voteShare` through a CSS custom property or a transform. Use `font-variant-numeric: tabular-nums` for vote counts. Add visible focus styles to both utility buttons. Use transparent surfaces that blend with the quiet background.

Below `900px`, set `.hara-overview__standings { grid-template-columns: 1fr; }`. Below `640px`, switch each rank row to a two-line grid and keep text columns at `min-width: 0`. Under reduced motion, set overview transitions and `.hara-overview__update` animation to `none`.

- [ ] **Step 4: Run the Hara style tests to verify they pass**

~~~bash
npm test -- src/styles.test.ts -t "Hara gallery|Hara overview"
~~~

Expected: the utility, gallery, uniform-card, and overview style assertions pass.

- [ ] **Step 5: Commit the styling change**

~~~bash
git add src/styles.css src/styles.test.ts
git commit -m "feat: style Hara voting overview"
~~~

### Task 5: Run integrated verification and inspect the live routes

**Files:**
- Modify: no additional production files unless an integrated test identifies a defect in Tasks 1–4.
- Test: the focused files from Tasks 1–4.

**Interfaces:**
- Consumes: the committed data, component, route, and style changes.
- Produces: evidence that the Hara gallery, overview route, simulation lifecycle, responsive layout, and unchanged landing scene work together.

- [ ] **Step 1: Run the focused regression suite**

~~~bash
npm test -- src/lib/votingOverview.test.ts src/components/VotingOverviewPage.test.tsx src/components/ContestSubpageView.test.tsx src/components/LandingPage.test.tsx src/lib/haraGallery.test.ts
npm test -- src/styles.test.ts -t "Hara gallery|Hara overview"
~~~

Expected: all focused tests pass. If the existing unrelated hero-arena grayscale assertion fails in the full suite, leave that assertion unchanged and report it separately.

- [ ] **Step 2: Run the production build and diff check**

~~~bash
npm run build
git diff --check
~~~

Expected: the build exits with code 0 and `git diff --check` prints no errors.

- [ ] **Step 3: Verify the Hara gallery entry in the live browser**

At `http://127.0.0.1:5174/#hara`, confirm the flat `Overview` control appears after `How to vote`, activating it changes the hash to `#hara/overview`, the quiet background remains unchanged, and all 12 uniform cards remain present.

- [ ] **Step 4: Verify the event-display overview in the live browser**

At `http://127.0.0.1:5174/#hara/overview`, confirm the page fills the viewport without horizontal overflow, shows `Live simulation`, the leader, second place, third place, total votes, and deadline, and contains 12 ranked rows. Wait six seconds and confirm a vote count changes without a full-page flash. Confirm `Back to Hara` returns to `#hara`, `Festival Hub` returns to `#contests`, and the browser console has no errors.

- [ ] **Step 5: Verify responsive and reduced-motion behavior**

Inspect desktop, tablet, and mobile widths. Confirm the leader and ranking remain readable, the rows do not overflow, and all controls stay within the viewport. Emulate reduced motion and confirm the overview remains visible without stagger or update animation.

