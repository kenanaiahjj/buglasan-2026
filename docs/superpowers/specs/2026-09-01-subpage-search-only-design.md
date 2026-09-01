# Program subpage search-only controls design

## Goal

Reduce visual and interaction noise on the four program subpages by keeping the
search field as the only roster control. Visitors can still find an entry by
name, town, district, or supporting description without choosing a sort mode or
reading a separate roster count.

## Scope

This change applies to the shared `HaraGallery` used by the `hara`, `booths`,
`festival`, and `gandang` subpages.

Keep the following unchanged:

- the search input, icon, clear action, and empty state;
- case-insensitive matching against entry name, origin, and blurb;
- the existing source order, which is the program's entry-number order;
- the program logo or lockup, status/deadline copy, and navigation actions;
- entry cards, vote actions, live tally display, responsive layout, and motion;
- the full voting overview page and all landing-page controls.

Remove the following from every program subpage:

- the `Entry number` and `Name` sorting controls;
- sort state and sort-option data in `HaraGallery`;
- the result count, including its `aria-live` announcement;
- CSS that exists only for the removed sort controls or result count.

## Component and data design

Keep query state local to `HaraGallery`. Derive the visible entries with
`useMemo`, using a search-only helper named `filterHaraCandidates` (the existing
helper name may be updated to reflect that it no longer sorts). The helper
returns a new array in the original source order when the query is empty or when
entries match.

The helper continues to trim and lowercase the query, then checks the entry's
`name`, `origin`, and `blurb` fields. No alternate sort order or hidden sort
state remains after the change.

## Interaction and accessibility

- Keep the search input as a real labeled `type="search"` control.
- Keep the clear button available only when a query exists.
- Keep the no-match message and its `Clear search` action.
- Keep the existing keyboard focus styles and reduced-motion behavior.
- Do not replace the removed result count with another announcement. The empty
  state remains a status message when no entries match.

## Testing and verification

Update the component contract to verify that every subpage keeps search and no
longer renders sort labels or the `X of Y` count. Update the pure-helper tests
to verify source-order preservation, name/origin/blurb matching, and the empty
result case. Remove tests that only exercise deleted sort modes.

Run the focused tests, the full test suite, the production build, and
`git diff --check`. In the browser, inspect a program subpage at desktop and
narrow widths, confirm that only search remains above the grid, search for a
matching and non-matching entry, clear the query, and confirm that card voting
and navigation still work.

## Non-goals

Do not change the roster data, card presentation, vote flow, overview route,
program-specific nouns, background scene, or responsive card grid.
