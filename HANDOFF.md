# Buglasan Festival 2026 — handoff

Vite + React 19 + TypeScript. Three.js/GSAP hero. No backend, no router library.
`npm run dev` · `npm run build` (tsc -b + vite) · `npm test` (vitest, 20 passing).

---

## Architecture in one screen

```
App.tsx            useReducer(voterState) → LandingPage | LoginScreen | DashboardPage
LandingPage.tsx    owns hash routing + renders one of three things:
                     #vote-<arena>  → ArenaVotingPage   (the ballot)
                     #<arena>       → ContestSubpageView (info/criteria/schedule)
                     otherwise      → the landing page itself
```

Programs are `hara | booths | festival | gandang` (`src/data/pageant.ts`, `contestArenas`).

| File | Role |
|---|---|
| `src/state/voterState.ts` | reducer. Dashboard flow **and** `arenaVotes`/`arenaTallies` |
| `src/lib/arenaEntries.ts` | normalises 4 record types → one `VoteEntry`; `ARENA_VOTING` config |
| `src/components/ArenaVotingPage.tsx` | the voting screen, one component for all 4 arenas |
| `src/scene/festivalWorld.ts` | Three.js scene; `LANDMARKS[]` scatter, logo, torch uniforms |
| `src/scene/shaders.ts` | GLSL. Landmark reveal lives in `landmarkFragmentShader` |
| `scripts/build-landmarks.mjs` | **generates** the 17 landmark SVGs (`npm run art:landmarks`) |
| `src/styles.css` | ~2940 lines, one file. Tokens in `:root` |

---

## Non-obvious things that will bite you

**Landmark SVGs are generated, not hand-authored.** Editing
`public/assets/landmarks/*.svg` directly is wasted work — `npm run art:landmarks`
overwrites all 17. Change `scripts/build-landmarks.mjs`.

**Landmark plane aspect must match its SVG viewBox**, or the art stretches.
`scratch/render/aspect.mjs` checks every entry. `scratch/render/layout.mjs <aspect>`
reports off-frame clipping and overlap; the layout is currently clean from 1.3
through 2.2. Re-run both after touching `LANDMARKS[]`.

**The landing page's ScrollTrigger must stand down on sub-routes.** Its guards
check `activeSubpage || activeVote`. Add a third route and you must add it to all
four guards in `LandingPage.tsx` or the hero stays pinned and fights scrolling.

**Additive blending in the scene inverts shading.** Ink can only add light, so
density *is* illumination — lit planes get white contours and close hatching,
shadowed planes get fewer lines. Do not reach for dark = shadow.

**`--arena` is confined to state.** The voting page sets one accent per arena and
uses it only on the cast button, voted ring and rank bars. Surfaces stay on the
site's green ramp so the four programs read as one product. Don't theme surfaces.

**`scroll-behavior: smooth` is on `html`.** Reading `window.scrollY` right after
`scrollTo` returns a mid-animation value. Set `scrollBehavior='auto'` first when
scripting scroll in tests or browser automation.

---

## State model

```ts
arenaVotes:   Record<ArenaId, string[]>              // entry ids this person backed
arenaTallies: Record<ArenaId, Record<string, number>> // live public counts
```

Actions: `castArenaVote`, `undoArenaVote`. Allowance is per arena
(`ARENA_VOTING[id].allowance`) — booths is 3, the rest 1. The reducer enforces
the limit and rejects duplicates; the disabled button is only a courtesy.

Deliberately kept **separate** from the dashboard's `selectedCandidateId` /
`voteConfirmed` / `votesByCandidate`. They answer different questions and merging
them breaks the dashboard.

---

## What is done

- **Landmark line art** — 17 SVGs rebuilt on a 4-tier stroke ladder (~6:1 contour
  to hair), white/gradient/shade colour roles, hatching. Belltower, cathedral,
  Rizal Boulevard, Silliman Hall and Silliman Portal were redrawn from user
  reference photos; earlier versions were factually wrong about the buildings.
- **Hover reveal** — skyline rests near-invisible (`uRest` 0.022, or 0.06 where
  there is no hover); a `uTorch` uniform gates the cursor pool so nothing shows
  until the pointer is actually on the page.
- **Scatter** — cut 32 → 10 pieces, 0 clipped at any common desktop aspect.
- **Hero logo** — 2024 wordmark keyed off black by
  `scripts/key-logo-background.mjs`, served at 1600px + a 596px fallback.
- **Voting pages** — all four programs, with confirm dialog, undo window, and
  working search/sort, empty state, and rankings.
- **Card hover illustration** — the 3D crown/booth/dancer/firework component was
  removed entirely (component + 383 lines of CSS).

---

## What is expected next

Ordered by how much they matter.

1. **Votes do not persist.** They live in reducer state and reset on reload.
   Needs a backend or at minimum `localStorage`. Until then the tallies are a
   demo. This is the single biggest gap.

2. **Voting has no identity check** despite the UI promising "one vote per
   person". Right now a refresh grants a fresh ballot. Either wire the existing
   login flow into the ballot or drop the claim from the copy — shipping it as-is
   is a promise the product does not keep.

3. **Booth and contingent photos are wrong.** `lguBooths` and
   `festivalContingents` both point `image` at
   `/assets/candidates/candidate-02.webp`, so booths render as portraits of
   women. Needs real photography in `src/data/pageant.ts`.

4. **Data volume is short of the mockups.** 6 candidates, 6 booths, and 4
   Festival of Festivals contingents versus 12/23/8 in the reference designs.
   The "View all (23)" affordance in the mockups was not built because there is
   nothing to page to.

5. **Year mismatch, deliberate and visible.** Hero art reads FESTIVAL 2024; the
   title, copy and data all say 2026. The user asked for the 2024 art "for now".
   Confirm before changing either.

6. **Nav mark still shows the 2026 lockup** (`BrandMark.tsx`). Left alone on
   purpose — the hero swap was the request. Swap if you want consistency.

7. **Gandang NegOrense currently uses the shared demo candidate roster.** A
   separate official roster was not supplied, so the prototype does not invent
   new candidates or vote totals for that program.

---

## Verification habits that caught real bugs here

- Check keyed/transparent art over **white**, not just the dark stage — a black
  fringe is invisible on dark and ships broken.
- Assert in the DOM after UI removal (`querySelectorAll` count === 0); a
  screenshot only proves the part you photographed.
- After deleting a component, restart the dev server — Vite HMR keeps a stale
  record and reports a 404 that is not a real fault.
- The browser pane's `backdrop-filter` elements produce black-band screenshot
  artifacts. Verify layout with `getBoundingClientRect`, not the image.

---

## Scratch (untracked, safe to delete)

`scratch/render/` — `contact.mjs` (all-landmark sheet), `zoom.mjs` (close-ups),
`scene.mjs` (composites the scatter at true scale), `aspect.mjs`, `layout.mjs`.
Genuinely useful for any further art or scatter work.
