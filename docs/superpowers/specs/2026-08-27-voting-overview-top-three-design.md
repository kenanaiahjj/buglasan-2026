# Voting overview top-three podium

## Goal

Make the overview show the top three entries at a glance instead of giving the featured treatment only to the current leader. Keep the complete ranked list available for everyone else.

## Scope

This change applies to the existing `VotingOverviewPage` for all supported Buglasan programs. It changes presentation only. The existing snapshot source, sorting, vote calculations, simulation, routing, countdown, and full ranking remain unchanged.

## Design

The overview keeps its fixed event-display composition and full ranking panel. The featured area becomes a podium block:

- Rank 1 keeps the larger featured card and the `Leading` treatment.
- Ranks 2 and 3 render as compact podium cards in the same featured area.
- Each podium card shows rank, portrait, entry number, name, location, and current votes.
- If a program has fewer than three entries, the podium renders only the entries that exist.
- The existing metrics and full ordered ranking list remain visible.

Use the existing ranked entries as the single source of truth. Derive the podium with `rankedEntries.slice(0, 3)` so it follows the same sorting and live updates as the ranking list. Keep the current update markers and motion behavior scoped to the existing overview.

## Responsive behavior

On the fixed 16:9 board, keep rank 1 visually dominant and arrange ranks 2 and 3 as compact cards beside or below it within the left rail. On narrower displays, stack the podium cards in document order: rank 1, rank 2, rank 3. Do not add horizontal scrolling or hide the full ranking.

## Accessibility

Keep each podium entry as a semantic `article` with a meaningful heading and portrait alternative text. Expose the rank and vote total as visible text. Do not communicate rank by color alone.

## Testing

Add a focused component test that renders a known ranking and verifies that the podium contains the first three entry names and rank labels. Verify that a fourth-place entry still appears in the full ranking but not in the podium. Preserve the existing all-program and live-update tests.

## Out of scope

- Changing the voting API or simulation source.
- Changing the order or content of the full ranking list.
- Redesigning the Hara gallery, dashboard, routing, or other program pages.
- Adding new podium data or hard-coded candidate names.
