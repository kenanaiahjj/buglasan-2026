# Voting overview responsive board and live bar edges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the voting overview readable outside a wallboard viewport and add a lightweight animated luminous edge to every ranking bar.

**Architecture:** Keep the existing VotingOverviewPage data flow and wide 16:9 composition. Add one render-time CSS custom property for deterministic bar-edge phase, then put the visual effect and responsive fallback in src/styles.css. Extend the existing raw CSS contracts and overview tests without changing ranking, simulation, routing, or vote behavior.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, CSS container units, CSS media queries, CSS keyframes, existing GSAP motion utilities.

## Global constraints

- Apply this change to Hara, Gandang, Booths, and Festival.
- Keep wide presentation mode as a centered 16:9 event-display board.
- Use the outer overview shell as a scroll safety net; never hide content when the board exceeds the viewport.
- Use adaptive flow mode at max-width 64rem, max-aspect-ratio 4 / 3, or max-height 42rem.
- Animate only the decorative bar edge with CSS transform and opacity.
- Keep the bar decoration aria-hidden and disable its animation for reduced motion.
- Do not replace the CSS effect with WebGL or add a rendering dependency.
- Do not change vote totals, ranking order, simulation timing, API contracts, or routes.
- Preserve the top-three podium and complete ranking.
- Preserve unrelated dirty-worktree edits and stage only feature hunks.

---

### Task 1: Add failing responsive and bar-edge contracts

**Files:**

- Modify: src/components/VotingOverviewPage.test.tsx
- Modify: src/styles.test.ts

**Interfaces:**

- Consumes: Existing server-rendered overview markup and the raw src/styles.css import used by style tests.
- Produces: Failing assertions for the render-time bar phase and CSS responsive/motion contracts.

- [ ] **Step 1: Add the component assertion.**

In the existing top-three test, after the podium and full-ranking assertions, add:

~~~ts
    const barFills = [...document.querySelectorAll('.vote-overview__rank-bar-fill')];
    expect(barFills).toHaveLength(haraCandidates.length);
    expect(barFills[0].getAttribute('style')).toContain('--bar-edge-delay:');
~~~

This verifies that every ranking bar receives a deterministic phase without asserting a simulated vote value.

- [ ] **Step 2: Add the failing CSS contract.**

Add this test to src/styles.test.ts:

~~~ts
describe('voting overview responsive board and live bar edges', () => {
  it('keeps wide content safe and provides a readable flow fallback', () => {
    expect(styles).toMatch(/\.vote-overview\s*\{[\s\S]*?overflow:\s*auto;/);
    expect(styles).toMatch(/\.vote-overview__rank-bar-fill\s*\{[\s\S]*?position:\s*relative;/);
    expect(styles).toMatch(/\.vote-overview__rank-bar-fill::after\s*\{[\s\S]*?animation:\s*voteOverviewBarEdge/);
    expect(styles).toMatch(/@keyframes voteOverviewBarEdge\s*\{[\s\S]*?transform:/);
    expect(styles).toMatch(
      /@media \(max-width:\s*64rem\),\s*\(max-aspect-ratio:\s*4\s*\/\s*3\),\s*\(max-height:\s*42rem\)[\s\S]*?\.vote-overview__frame\s*\{[\s\S]*?height:\s*auto;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*64rem\),\s*\(max-aspect-ratio:\s*4\s*\/\s*3\),\s*\(max-height:\s*42rem\)[\s\S]*?\.vote-overview__body\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*64rem\),\s*\(max-aspect-ratio:\s*4\s*\/\s*3\),\s*\(max-height:\s*42rem\)[\s\S]*?\.vote-overview__rank-row\s*\{[\s\S]*?height:\s*auto;/,
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.vote-overview__rank-bar-fill::after[\s\S]*?animation:\s*none;/,
    );
  });
});
~~~

- [ ] **Step 3: Run the focused tests and confirm the red state.**

Run:

~~~bash
npx vitest run src/components/VotingOverviewPage.test.tsx src/styles.test.ts
~~~

Expected: FAIL because the current component does not emit --bar-edge-delay, the shell still uses hidden overflow, and the new bar-edge and adaptive-flow CSS do not exist. Existing unrelated tests must continue to run.

- [ ] **Step 4: Stage only the new test hunks and commit the red contracts.**

Use interactive staging so the concurrent imagery assertion in src/styles.test.ts is not included:

~~~bash
git add -p -- src/components/VotingOverviewPage.test.tsx src/styles.test.ts
git diff --cached --check
git commit -m "test: define responsive overview bar contracts"
~~~

Do not stage HaraGallery.tsx, pageant.ts, arenaEntries.ts, styles.css, or either untracked plan in this task.

### Task 2: Add deterministic bar-edge phase to the overview markup

**Files:**

- Modify: src/components/VotingOverviewPage.tsx near the existing rank-bar-fill style object.

**Interfaces:**

- Consumes: entry.rank from rankedEntries and the existing proportional width style.
- Produces: A --bar-edge-delay custom property on each rank-bar-fill span.

- [ ] **Step 1: Add the render-time style property.**

Change the existing fill style object to:

~~~tsx
                          style={{
                            ['--bar-edge-delay' as string]: \`\${(entry.rank % 7) * -0.16}s\`,
                            width: \`\${Math.max(leaderVotes === 0 ? 0 : (entry.votes / leaderVotes) * 100, 2)}%\`,
                          }}
~~~

Do not add state, effects, timers, or data fields. The phase is deterministic from the rendered rank.

- [ ] **Step 2: Run the component test.**

Run:

~~~bash
npx vitest run src/components/VotingOverviewPage.test.tsx
~~~

Expected: PASS, including the new phase assertion. The style contract remains red until Task 3.

- [ ] **Step 3: Stage and commit the markup change.**

~~~bash
git add -p -- src/components/VotingOverviewPage.tsx
git diff --cached --check
git commit -m "feat: phase overview bar edge motion"
~~~

Keep unrelated dirty-worktree changes unstaged.

### Task 3: Implement the adaptive layout and premium bar edge

**Files:**

- Modify: src/styles.css in the overview styles block around .vote-overview.

**Interfaces:**

- Consumes: Existing overview class names, --bar-edge-delay, and the program accent variable.
- Produces: An overflow-safe wide board, readable flow fallback, and reduced-motion-safe trailing edge.

- [ ] **Step 1: Replace hidden shell overflow.**

In .vote-overview, replace hidden overflow with:

~~~css
  overflow: auto;
  overscroll-behavior: contain;
~~~

Leave the wide 16:9 frame sizing unchanged.

- [ ] **Step 2: Add the animated luminous edge.**

Add position: relative to .vote-overview__rank-bar-fill and add this rule after it:

~~~css
.vote-overview__rank-bar-fill::after {
  content: "";
  position: absolute;
  top: -22%;
  right: -0.2cqw;
  width: 1.55cqw;
  height: 144%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in oklch, var(--arena, var(--gold)) 30%, var(--crown-ivory)) 48%,
    transparent
  );
  box-shadow: 0 0 0.65cqw color-mix(in oklch, var(--arena, var(--gold)) 62%, transparent);
  opacity: 0.42;
  pointer-events: none;
  transform: translate3d(-0.28cqw, 0, 0) scaleX(0.8);
  animation: voteOverviewBarEdge 2.8s var(--ease-out) infinite;
  animation-delay: var(--bar-edge-delay, 0s);
}

@keyframes voteOverviewBarEdge {
  0%, 100% {
    opacity: 0.24;
    transform: translate3d(-0.5cqw, 0, 0) scaleX(0.72);
  }
  50% {
    opacity: 0.9;
    transform: translate3d(0.08cqw, 0, 0) scaleX(1.24);
  }
}
~~~

Keep the row overflow hidden so the glow stays attached to each bar. Animate only transform and opacity.

- [ ] **Step 3: Add the adaptive flow layout.**

Add this media query after the overview utility styles and before the reduced-motion media query:

~~~css
@media (max-width: 64rem), (max-aspect-ratio: 4 / 3), (max-height: 42rem) {
  .vote-overview { place-items: start; }
  .vote-overview__frame { width: 100%; height: auto; min-height: 100dvh; }
  .vote-overview__board {
    grid-template-rows: auto;
    height: auto;
    min-height: 100dvh;
    padding: clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2.5rem) 6rem;
    gap: clamp(1.25rem, 4vw, 2rem);
  }
  .vote-overview__hero {
    align-items: flex-start;
    flex-direction: column;
    gap: 1.25rem;
  }
  .vote-overview__identity { width: 100%; align-items: flex-start; }
  .vote-overview__crest { height: clamp(3.5rem, 12vw, 6rem); max-width: 4.5rem; }
  .vote-overview__title { font-size: clamp(1.8rem, 7vw, 3rem); white-space: normal; }
  .vote-overview__supporting { font-size: clamp(.8rem, 2.1vw, 1rem); line-height: 1.4; }
  .vote-overview__clock { width: 100%; text-align: left; }
  .vote-overview__countdown { justify-content: flex-start; }
  .vote-overview__countdown b { font-size: clamp(1.25rem, 5vw, 1.8rem); }
  .vote-overview__body { grid-template-columns: 1fr; gap: 1.25rem; }
  .vote-overview__rail { gap: 1.25rem; }
  .vote-overview__leader { min-height: clamp(22rem, 65vw, 32rem); }
  .vote-overview__candidate-name { font-size: clamp(1.8rem, 6vw, 2.7rem); }
  .vote-overview__candidate-votes { font-size: clamp(1.3rem, 4vw, 1.8rem); }
  .vote-overview__metric { padding: .9rem; }
  .vote-overview__ranking { padding: 1rem; }
  .vote-overview__ranking-list {
    justify-content: flex-start;
    gap: .5rem;
  }
  .vote-overview__rank-row {
    height: auto;
    min-height: 3.7rem;
    padding: .55rem .6rem;
  }
  .vote-overview__ticker {
    grid-template-columns: 1fr;
    gap: .7rem;
  }
  .vote-overview__ticker-item:last-child { justify-content: flex-start; }
  .vote-overview__utility {
    left: max(1rem, env(safe-area-inset-left));
    right: max(1rem, env(safe-area-inset-right));
    bottom: max(1rem, env(safe-area-inset-bottom));
    flex-wrap: wrap;
  }
}

@media (max-width: 40rem) {
  .vote-overview__podium {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  .vote-overview__podium-secondary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: auto;
  }
  .vote-overview__ranking-head,
  .vote-overview__rank-row {
    grid-template-columns: 1.9rem 2rem 2.4rem minmax(6rem, 1fr) 4.6rem 3rem;
    gap: .35rem;
  }
  .vote-overview__rank { font-size: 1rem; }
  .vote-overview__rank-name { font-size: .9rem; }
  .vote-overview__rank-location { font-size: .65rem; }
  .vote-overview__rank-votes { font-size: .86rem; }
  .vote-overview__rank-share { font-size: .68rem; }
  .vote-overview__rank-portrait { height: 2.25rem; }
  .vote-overview__podium-card {
    grid-template-columns: 7rem minmax(0, 1fr);
    grid-template-rows: 1fr;
    align-items: center;
  }
}
~~~

- [ ] **Step 4: Add the reduced-motion override.**

Extend the existing reduced-motion block with:

~~~css
  .vote-overview__rank-bar-fill::after {
    animation: none;
    opacity: .3;
    transform: none;
  }
~~~

Preserve the existing live indicator and transition resets.

- [ ] **Step 5: Run focused tests.**

~~~bash
npx vitest run src/components/VotingOverviewPage.test.tsx src/styles.test.ts
~~~

Expected: PASS, including the existing unrelated tests.

- [ ] **Step 6: Stage only feature hunks and commit.**

~~~bash
git add -p -- src/components/VotingOverviewPage.tsx src/styles.css
git diff --cached --check
git commit -m "feat: make voting overview responsive and alive"
~~~

Use interactive staging to avoid the concurrent imagery changes in the same files.

### Task 4: Verify wide, adaptive, and reduced-motion behavior

**Files:**

- Inspect: src/components/VotingOverviewPage.tsx
- Inspect: src/styles.css
- Inspect: src/components/VotingOverviewPage.test.tsx
- Inspect: src/styles.test.ts

**Interfaces:**

- Consumes: The committed responsive board and bar-edge implementation.
- Produces: Verified test, build, browser, and worktree evidence.

- [ ] **Step 1: Run the complete test suite.**

~~~bash
npm test -- --run
~~~

Expected: all test files pass. Existing jsdom canvas warnings may remain from unrelated scene tests.

- [ ] **Step 2: Build the production bundle.**

~~~bash
npm run build
~~~

Expected: TypeScript and Vite production build complete successfully.

- [ ] **Step 3: Check whitespace and feature markers.**

~~~bash
git diff --check
git grep -n "voteOverviewBarEdge\|--bar-edge-delay\|max-aspect-ratio: 4 / 3" -- src/components/VotingOverviewPage.tsx src/styles.css
~~~

Expected: no whitespace errors and all markers are present.

- [ ] **Step 4: Verify the wide preview.**

Start the local preview with npm run dev -- --host 127.0.0.1 --port 5175 and open http://127.0.0.1:5175/#hara/overview. Confirm the centered 16:9 board, complete ranking, and luminous trailing edges. Inspect the DOM for 22 rows and zero horizontal overflow.

- [ ] **Step 5: Verify adaptive flow.**

Set the browser viewport to 390x844 and reload. Confirm the header, podium, metrics, complete ranking, and ticker appear in document flow. Confirm all 22 rows remain reachable and document scroll width does not exceed viewport width.

- [ ] **Step 6: Verify reduced motion and console output.**

Use reduced-motion emulation if available, reload, and confirm the bar edge is static. Read the preview console and report existing Vite or Three.js warnings accurately.

- [ ] **Step 7: Preserve unrelated worktree changes.**

Run git status --short and git log --oneline -6. Confirm only feature files were committed and the unrelated imagery edits remain in place.

