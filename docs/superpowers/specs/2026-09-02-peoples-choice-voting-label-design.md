# People’s Choice voting label and disclaimer

## Goal

Make it clear that the public voting views show a People’s Choice result, not the official final result.

## Scope

- Add a shared, non-interactive `People’s Choice` label to every contest subpage and voting overview.
- Place the label with the existing program identity so it reads as a designation for the current contest.
- Add the same disclaimer to every contest subpage and voting overview near the current voting status and deadline.
- Keep all voting, tally, ranking, routing, and data-source behavior unchanged.

## Copy

Label:

> People’s Choice

Disclaimer:

> People’s Choice voting reflects public preference only and does not determine the official final result.

## Visual treatment

Use one shared CSS treatment for both surfaces:

- Render `People’s Choice` in a cursive-capable system font stack.
- Use the existing bright gold design token for the label.
- Keep the label non-interactive and readable at narrow widths.
- Render the disclaimer in the existing sans-serif body style at a compact but readable size with a constrained measure and centered alignment.
- Keep the overview’s fixed 16:10 composition intact; the added copy must fit within the existing header and status regions without changing the standings layout.

## Component placement

- `src/components/HaraGallery.tsx`: add the label below the supplied program logo or text lockup, and add the disclaimer below the current voting-status line.
- `src/components/VotingOverviewPage.tsx`: add the label below the program title in the overview identity, and add the disclaimer below the deadline note in the clock block.
- `src/styles.css`: define the shared label and disclaimer styles, plus the small layout adjustments required by each host block.

## Verification

- Add component assertions that every contest subpage and overview includes both exact copy strings.
- Add CSS contract assertions for the gold color, cursive-capable font stack, readable disclaimer sizing, and responsive wrapping behavior.
- Run the focused tests, the full Vitest suite, `npm run build`, and `git diff --check`.
- Run the affected subpage and overview routes in a browser at desktop and narrow/mobile widths. Confirm that the label and disclaimer are visible, readable, and do not cover the roster, podium, countdown, or standings.

## Out of scope

- Changing the voting algorithm, tally source, ranking order, deadline, or official judging language.
- Adding a new font asset or a new design system token.
- Updating entry profiles or unrelated landing-page content.
