# Buglasan arena consistency design

## Status

Approved in conversation on August 26, 2026.

## Decision

The landing page and linked arena flow will show four valid Buglasan programs:

1. Hara sa Dumaguete
2. LGU Booth Contest
3. Festival of Festivals
4. Gandang NegOrense

The fabricated Pyro-Musical program will be removed. The fabricated `Street
Dance Showdown` label will be replaced by the real `Festival of Festivals`
identity. Existing festival-contingent records will remain as the prototype
entries for that program, but their code names and UI labels will no longer
describe a standalone street-dance contest.

## Data boundary

The repository contains one demo pageant candidate roster. The update will not
invent a second official roster for Gandang NegOrense. The existing roster will
remain available to the pageant surfaces until a separate source roster is
provided.

## Scope

- Update the `ContestArena` ID union and all arena records.
- Rename `streetDanceContingents` to `festivalContingents` and update its
  normalized voting entries.
- Remove `culturalEvents` and the Pyro-only rendering path.
- Update hash routes, arena navigation, reducer seeds, voting configuration,
  tests, icon branches, card glow classes, and copy.
- Preserve the established green, gold, ivory, and arena-accent visual system.
- Recalculate the total-entry copy from the remaining four valid programs.

## Non-goals

- Do not add a backend, persistence, authentication, or new route library.
- Do not create new contestant names, vote totals, dates, or venues.
- Do not change the Three.js scene or unrelated dashboard behavior.

## Verification

Run the focused Vitest suites, the full test suite, `npm run build`, and a
browser check of the landing page and each valid hash route. Confirm that the
removed names do not appear in rendered markup or source references.
