# Hara voting overview

**Status:** Approved direction; awaiting written-spec review

## Summary

Add a separate full-screen overview page for Hara sa Dumaguete. Visitors open it from a new flat `Overview` utility control beside `How to vote` in the Hara gallery. The page presents a display-friendly view of the current pageant standings: the leader, the next two candidates, the full ranking, vote totals, vote share, the gap between the top candidates, voting status, and the voting deadline.

The first version uses simulated updates seeded from the existing Hara candidate vote totals. The overview reads through a stable voting snapshot contract so a future API or real-time subscription can replace the simulation without changing the page layout.

## Experience goals

- Make the current Hara standings understandable within a few seconds on a venue display.
- Let online visitors open the same overview from the Hara candidate page.
- Clearly identify the current leader and show how close the next candidates are.
- Make simulated data recognizable during prototyping without weakening the visual presentation.
- Keep the page consistent with the existing dark Hara background and flat, text-based utility controls.
- Avoid inventing electorate size, turnout, or other metrics that the current data does not support.

## Navigation and page structure

### Hara gallery entry point

Add `Overview` to the existing Hara utility actions, beside `How to vote`. It uses the same flat navigation treatment as `Back to home` and `How to vote`: no pill border, capsule radius, or filled surface. It can include a small chart icon, but the text label remains the primary cue.

Opening the control changes the hash to `#hara/overview` and transitions to a separate full-screen overview page. The existing Hara gallery remains available at `#hara`.

### Overview page shell

Use the existing quiet festival background behind the page. Do not reintroduce the landing page's fireworks, 3D logo, particles, shaders, or hover illustrations. Keep the overview content inside a full-height shell with a compact utility row:

- `Back to Hara` returns to the candidate gallery.
- `Festival Hub` returns to the main contest hub.
- A small `Live simulation` status identifies the prototype data source.
- The page title is `Hara sa Negros Oriental` with the supporting line `Public voting overview`.

Do not add arena numbering, decorative eyebrow labels, random chips, or a second contest hero block.

### Standings composition

Arrange the content as a broadcast-style scoreboard:

1. A prominent leader panel with the candidate portrait, name, hometown, vote total, vote share, and lead over second place.
2. Compact second- and third-place panels that preserve the same candidate identity fields with less visual weight.
3. A full ranked list for all 12 Hara candidates. Each row shows rank, candidate number, portrait, name, hometown, votes, percentage share, and a proportional horizontal bar.
4. A compact metrics strip with total counted votes, number of candidates, current leader, and voting deadline.

The ranking must remain legible at a distance. The leader treatment should use scale, spacing, and hierarchy in addition to color so the result is not communicated by color alone.

## Data and simulation contract

Create a small data boundary for the overview rather than embedding vote calculations in the page component. The shape should be equivalent to:

```ts
type VotingOverviewEntry = {
  id: string;
  number: string;
  name: string;
  location: string;
  image: string;
  votes: number;
};

type VotingOverviewSnapshot = {
  arenaId: ContestArena['id'];
  entries: VotingOverviewEntry[];
  totalVotes: number;
  updatedAt: number;
  source: 'simulation' | 'api';
};

type VotingOverviewSource = {
  getSnapshot: () => VotingOverviewSnapshot;
  subscribe: (listener: (snapshot: VotingOverviewSnapshot) => void) => () => void;
};
```

The exact implementation can use the project's existing types when that avoids duplication, but the page must consume a snapshot-like shape with a replaceable source.

### Initial data

- Seed the Hara overview from `haraCandidates` and the current `arenaTallies.hara` state.
- Keep candidate identity, location, portrait, and number sourced from existing data.
- Compute total votes, rank, percentage share, and the leader gap from the snapshot at render time.
- Break equal vote totals by candidate number so the list remains deterministic.

### Simulated updates

The prototype source starts with the current tally and emits one to three deterministic vote increments every six seconds. Updates must:

- preserve candidate identity and never create new candidates;
- update only vote totals and `updatedAt`;
- keep the ranking sorted after each update;
- expose `source: 'simulation'` so the UI can label the state accurately;
- clean up its interval when the overview unmounts; and
- avoid a dramatic reorder animation or flashing screen on every tick.

The future API adapter must implement the same snapshot and subscription behavior. This first version does not add a network request, authentication, persistence, WebSocket, or server-side voting logic.

## Motion and interaction

- Use the existing page-entry transition when opening the overview.
- Stagger the first render of the leader, podium, metrics, and ranking regions lightly.
- When a simulated update changes a row, use a short opacity or background emphasis to show the update without shifting the entire layout.
- Keep the leaderboard in normal document flow so the page can scroll on smaller screens.
- Respect `prefers-reduced-motion: reduce` by disabling stagger and update emphasis while keeping the content and status changes available.

## Responsive and display behavior

- On desktop and tablet, place the leader panel in the left two-thirds of the top row, place the second- and third-place panels in the right third, and place the full ranking below.
- On mobile, stack the leader, metrics, podium, and ranking into one readable column.
- Keep controls and status text within the viewport width at every breakpoint.
- Use high-contrast text and sufficiently large numerals for event-screen viewing.
- Do not rely on hover to expose a candidate's rank or vote total.

## Accessibility

- Use one page heading and landmark regions with descriptive labels.
- Render the ranking as an ordered list or semantically equivalent structure.
- Announce meaningful data refreshes with a polite live region, without reading the entire ranking aloud on every simulation tick.
- Keep both back controls keyboard reachable with visible focus styles.
- Provide meaningful alternative text for the leader and ranking portraits.
- Make the simulation label explicit in text, not only through a color or animated indicator.

## Implementation boundaries

Expected changes are limited to:

- Hara gallery utility navigation and its route callback.
- Hash synchronization and view selection for `#hara/overview`.
- A focused overview page component and its presentation styles.
- A small overview data/simulation module with unit tests.
- Component and styling tests for navigation, ranking, and metrics.

Leave the other three program pages, the landing page scene, candidate card structure, vote limits, and payment behavior unchanged.

## Verification plan

1. Test snapshot ranking, total calculation, percentage calculation, tie ordering, and leader-gap calculation.
2. Test that the Hara gallery exposes `Overview` and that activating it opens the overview route.
3. Test that the overview renders 12 candidates, identifies the leader, and labels the source as simulation.
4. Test simulation cleanup so the interval does not continue after unmount.
5. Run the focused test suite and production build.
6. Run `git diff --check`.
7. Verify the live route at desktop, tablet, and mobile widths.
8. Verify the back controls, reduced-motion presentation, no horizontal overflow, and no browser console errors.

## Non-goals

- Do not build the production voting API.
- Do not claim that the simulated totals are official or real-time results.
- Do not add turnout or electorate metrics without source data.
- Do not add an admin-only view or authentication flow.
- Do not redesign the Hara candidate gallery or the other contest pages.
