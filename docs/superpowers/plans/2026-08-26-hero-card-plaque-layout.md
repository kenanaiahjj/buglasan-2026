# Hero program card plaque layout implementation plan

> **For agentic workers:** Follow the repository's existing card markup and test conventions. Keep unrelated dirty-worktree changes untouched.

**Goal:** Rework the four hero program cards to match the supplied monochrome plaque reference: charcoal/black card bodies, a raised logo chamber, centered stacked titles, a gold structural rim, and colored logos on hover or focus.

**Architecture:** Preserve `heroContestArenas`, the existing button elements, program assets, click handlers, and mobile carousel. Implement the new composition through the existing hero-card CSS hooks and add contract tests for the default and interactive logo filters.

**Tech Stack:** React, TypeScript, CSS, Vitest, Vite.

## Tasks

### Task 1: Lock the visual contracts

- Add focused CSS assertions for the plaque surface, raised logo chamber, centered title, grayscale default logo, and colored hover/focus logo.
- Run the focused style tests and confirm the new assertions fail before changing production CSS.

### Task 2: Implement the plaque composition

- Give each card a charcoal-to-black surface and persistent gold rim.
- Add a semicircular upper chamber with a soft gold edge.
- Center and enlarge the logo, applying grayscale at rest and the authored color on hover/focus.
- Center the title stack and quiet the tagline/action without removing the card's accessible button behavior.
- Preserve the existing accent halo and reduced-motion behavior.

### Task 3: Verify the interaction and responsive states

- Run focused tests, the full test suite, the production build, and `git diff --check`.
- Verify desktop order, grayscale default, colored hover/focus, mobile carousel containment, and browser logs.
