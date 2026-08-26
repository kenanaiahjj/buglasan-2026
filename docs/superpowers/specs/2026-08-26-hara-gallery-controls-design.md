# Hara gallery controls design

## Goal

Make the Hara sa Negros Oriental gallery easier to understand and browse without
bringing back the removed subpage header or page title. The page should lead with
the supplied transparent Hara logo, give visitors a clear way home, explain the
voting flow on demand, expose the current voting deadline, and make the twelve
contestants searchable and sortable.

## Scope

This change applies only to the Hara gallery at `#hara`.

Keep the following unchanged:

- the shared festival background and scene behavior;
- the centered transparent Hara logo and its source artwork;
- the twelve candidate records and current candidate card layout;
- the staggered candidate entrance animation;
- candidate vote buttons and their existing `onVote` callback;
- the other program subpages and the full voting page.

The removed Hara utility header, `Hara sa Dumaguete` page title, and `Voting Room`
button stay removed.

## Layout

Place a compact control block directly below the Hara logo:

1. A `Back to home` button uses the existing `onBackToHub` callback and returns to
   the festival hub.
2. A `How to vote` disclosure opens inline guidance. The guidance contains four
   short steps: sign in, choose a candidate, review the choice, and confirm the
   vote. It does not state a vote allowance or payment rule that the current
   prototype does not enforce.
3. A status line presents `Voting is open` and the centralized deadline
   `June 10, 2026 · 11:59 PM PHT`.

The logo remains visually centered. The control block may use the existing gold
accent for emphasis, but it must remain quieter than the candidate actions.

Place the candidate toolbar immediately above the grid:

- a labeled search input with a search icon and the placeholder `Search
  candidates or town`;
- sort controls with `Most votes`, `Candidate number`, and `Name` options;
- a live result count such as `12 of 12 candidates`.

The default sort is `Candidate number`, which preserves the existing visual order
and the staggered composition. Search is case-insensitive and matches candidate
name, municipality, and advocacy. When no candidates match, show a concise empty
state with a `Clear search` action.

## Component and data design

Keep behavior local to `HaraGallery` because search and sort only affect this
gallery. Store the query and sort key with React state, derive visible candidates
with `useMemo`, and retain the existing source order as the default result.

Add the voting deadline to the centralized pageant content data rather than
duplicating the date in JSX. The current project content already establishes
June 10, 2026 at 11:59 PM as the closing time; display the timezone as PHT so the
deadline is unambiguous for this Philippine event.

Pass `onBackToHub` back into `HaraGallery` now that the Hara header is removed.
Do not add a new route or dependency. Use native form controls and a native
`details` disclosure for the voting guide.

## Interaction and accessibility

- Use a real `label` for the search input and a clear accessible name for the
  sort control group.
- Expose the result count through `aria-live="polite"` so filtering changes are
  announced without interrupting the user.
- Keep all controls keyboard reachable with visible focus styles.
- Make the `How to vote` disclosure usable with keyboard and without hover.
- Preserve the existing reduced-motion behavior for candidate entrances.
- Keep the toolbar wrapped and usable on narrow screens; the search input gets
  the full available width before sort controls wrap below it.

## Testing and verification

Add component contracts for:

- the home action, voting disclosure, open status, deadline, search input, sort
  options, and live count;
- the absence of the removed Hara header, page title, and `Voting Room` action;
- the unchanged twelve-card roster.

Extract a small pure `filterAndSortHaraCandidates` helper for the derived list
and test it directly. Verify that the default order is `01` through `12`, that
name/location/advocacy queries filter correctly, and that the empty state clears
back to the full list.

Run `npm test`, `npm run build`, and `git diff --check`. In the browser, verify
the `#hara` route at desktop and a narrow viewport, including keyboard focus,
search, each sort option, the disclosure, the home action, and the deadline
copy.
