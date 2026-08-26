# Buglasan arena consistency implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Buglasan arena model and UI with the four valid programs: Hara sa Dumaguete, LGU Booth Contest, Festival of Festivals, and Gandang NegOrense.

**Architecture:** Keep the existing local-data and reducer architecture. Change the shared arena ID union first, then update every consumer so TypeScript prevents stale Pyro or Street Dance branches from surviving. Reuse the current candidate and festival-contingent demo records without fabricating a new roster.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, GSAP, Three.js, and the existing CSS system.

## Global constraints

- Preserve the existing landing → subpage/voting flow.
- Remove Pyro and the standalone Street Dance identity from data and UI.
- Use `Festival of Festivals` and `Gandang NegOrense` with that spelling.
- Do not change the Three.js scene or unrelated dashboard behavior.
- Verify with focused tests, the full test suite, and the production build.

### Task 1: Lock the four-arena contract with failing tests

**Files:**
- Modify: `src/components/LandingPage.test.tsx`
- Modify: `src/components/ContestSubpageView.test.tsx`
- Modify: `src/state/arenaVoting.test.ts`

- [ ] **Step 1: Replace stale arena assertions**

Assert the four valid card IDs and names:

```ts
for (const name of ['Hara sa Dumaguete', 'LGU Booth Contest', 'Festival of Festivals', 'Gandang NegOrense']) {
  expect(html).toContain(name);
}
for (const id of ['hara', 'booths', 'festival', 'gandang']) {
  expect(html).toContain(`id="contest-card-${id}"`);
}
expect(html).not.toContain('Street Dance Showdown');
expect(html).not.toContain('Pyro-Musical');
```

- [ ] **Step 2: Update subpage and reducer expectations**

Replace `streetdance` and `pyro` fixture lookups with `festival` and `gandang`, assert the new titles, and assert that `entriesForArena` and `ARENA_VOTING` cover exactly the four valid IDs.

- [ ] **Step 3: Run the focused tests and confirm the expected red failure**

Run:

```bash
npm test -- src/components/LandingPage.test.tsx src/components/ContestSubpageView.test.tsx src/state/arenaVoting.test.ts
```

Expected result: failures identify stale arena IDs and rendered names before production code changes.

### Task 2: Update the source data and normalized arena entries

**Files:**
- Modify: `src/data/pageant.ts`
- Modify: `src/lib/arenaEntries.ts`
- Modify: `src/state/voterState.ts`

- [ ] **Step 1: Change the arena ID union and records**

Use `hara | booths | festival | gandang`. Set the visible titles to the four approved names. Remove the Pyro record and the `culturalEvents` data that only supported it.

- [ ] **Step 2: Rename festival-contingent data**

Rename the type and export to `FestivalContingent` and `festivalContingents`. Keep the existing record fields and values, but update presentation labels to refer to festival contingents and festival presentation slots.

- [ ] **Step 3: Normalize the four entry sources**

Keep candidates for the pageant data, booths for the LGU program, festival contingents for Festival of Festivals, and the existing candidate roster as the available Gandang NegOrense demo roster. Remove all Pyro normalization and closed-voting configuration.

- [ ] **Step 4: Update reducer arena seeds**

Seed `arenaVotes` and `arenaTallies` from `['hara', 'booths', 'festival', 'gandang']` so no stale state keys survive.

- [ ] **Step 5: Run focused state tests**

Run:

```bash
npm test -- src/state/arenaVoting.test.ts
```

Expected result: the state suite passes with four valid arena keys.

### Task 3: Update landing, card, subpage, and vote navigation

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/ContestCard.tsx`
- Modify: `src/components/ContestSubpageView.tsx`
- Modify: `src/components/ArenaVotingPage.tsx`

- [ ] **Step 1: Update hash routing and icon branches**

Replace stale route IDs and Fire icon branches with `festival` and `gandang`. Preserve all existing ScrollTrigger guards for subpage and vote state.

- [ ] **Step 2: Update visible copy**

Replace “four arenas” descriptions that mention street contingents or Pyro with copy that names the four approved programs. Keep the cards data-driven.

- [ ] **Step 3: Update subpage content branches**

Render Festival of Festivals from `festivalContingents`, remove the Pyro events branch, and render the existing pageant roster for Gandang NegOrense without inventing new records.

- [ ] **Step 4: Update voting navigation**

Ensure the arena switcher and ballot headings use the new IDs and names. Confirm there is no route or control that targets `streetdance` or `pyro`.

- [ ] **Step 5: Run component tests**

Run:

```bash
npm test -- src/components/LandingPage.test.tsx src/components/ContestSubpageView.test.tsx
```

Expected result: the updated landing and subpage contracts pass.

### Task 4: Remove stale visual selectors and verify the app

**Files:**
- Modify: `src/styles.css`
- Modify: `HANDOFF.md` only if the arena contract is documented as current

- [ ] **Step 1: Rename arena-specific CSS selectors**

Replace `.hero-arena-card--streetdance`, `.hero-arena-card--pyro`, `.contest-screen-card--streetdance`, and `.contest-screen-card--pyro` with selectors for `festival` and `gandang`, preserving the existing visual treatment.

- [ ] **Step 2: Search for stale names and IDs**

Run:

```bash
rg -n -i 'streetdance|street dance|pyro|pyro-musical|culturalEvents|streetDanceContingents' src HANDOFF.md
```

Expected result: no stale arena implementation references remain. Historical documentation may be updated or explicitly marked as superseded.

- [ ] **Step 3: Run the complete verification suite**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected result: all tests pass, the TypeScript/Vite build exits successfully, and `git diff --check` reports no whitespace errors.

- [ ] **Step 4: Browser-check the four routes**

Start the dev server, inspect the landing page, then open `#hara`, `#booths`, `#festival`, and `#gandang`. Confirm the four names render, Pyro and Street Dance do not render, and there is no browser console error or horizontal overflow at desktop and mobile widths.
