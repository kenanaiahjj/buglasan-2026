# Voting overview top-three podium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact top-three podium to the existing voting overview while keeping the complete ranked list visible.

**Architecture:** Keep `rankedEntries` as the single source of truth in `VotingOverviewPage`. Derive `podiumEntries` with `rankedEntries.slice(0, 3)`, render rank 1 with the existing featured leader treatment, and render ranks 2 and 3 as compact cards beside it. Add scoped CSS for the desktop podium and a container-query layout that stacks the entries at narrow frame sizes. No data, routing, or voting-source changes are required.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, server-rendered component markup tests, existing CSS custom properties, and CSS container queries.

## Global Constraints

- This change applies to the existing `VotingOverviewPage` for all supported Buglasan programs.
- It changes presentation only. The existing snapshot source, sorting, vote calculations, simulation, routing, countdown, and full ranking remain unchanged.
- Rank 1 keeps the larger featured card and the `Leading` treatment.
- Ranks 2 and 3 render as compact podium cards in the same featured area.
- Each podium card shows rank, portrait, entry number, name, location, and current votes.
- If a program has fewer than three entries, the podium renders only the entries that exist.
- The existing metrics and full ordered ranking list remain visible.
- Use the existing ranked entries as the single source of truth. Derive the podium with `rankedEntries.slice(0, 3)` so it follows the same sorting and live updates as the ranking list.
- Keep the current update markers and motion behavior scoped to the existing overview.
- Do not add horizontal scrolling or hide the full ranking.
- Keep each podium entry as a semantic `article` with a meaningful heading and portrait alternative text.
- Expose the rank and vote total as visible text. Do not communicate rank by color alone.
- Preserve unrelated dirty-worktree changes and stage only the files listed in each task if a commit is explicitly requested.

---

### Task 1: Add the failing top-three component test

**Files:**
- Modify: `src/components/VotingOverviewPage.test.tsx` after the existing `renders the simulated Hara standings for event display` test

**Interfaces:**
- Consumes: the existing `VotingOverviewPage` render helper and Hara tally fixture.
- Produces: a regression test that requires three podium entries while preserving fourth place in the full ranking.

- [ ] **Step 1: Write the failing test**

Add this test to `describe('VotingOverviewPage', () => { ... })`:

```tsx
  it('shows the top three entries in the podium and keeps fourth place in the full ranking', () => {
    const html = renderToStaticMarkup(
      <VotingOverviewPage
        arena={getHaraArena()}
        onBackToProgram={() => undefined}
        onBackToHub={() => undefined}
        tallies={getTallies()}
      />,
    );
    const document = new DOMParser().parseFromString(html, 'text/html');
    const podium = document.querySelector('.vote-overview__podium');

    expect(podium).not.toBeNull();
    expect(podium!.querySelectorAll('.vote-overview__podium-entry')).toHaveLength(3);
    expect(podium!.textContent).toContain('Leading');
    expect(podium!.textContent).toContain('Rank 2');
    expect(podium!.textContent).toContain('Rank 3');
    expect(podium!.textContent).toContain('Jessa Mae');
    expect(podium!.textContent).toContain('Maria Angela');
    expect(podium!.textContent).toContain('Charmine');
    expect(podium!.textContent).not.toContain('Shaira');
    expect(html).toContain('Shaira');
  });
```

The fixture ranks `Jessa Mae` first, `Maria Angela` second, `Charmine` third, and `Shaira` fourth. The test checks the visible podium boundary instead of relying on DOM position in the full ranking.

- [ ] **Step 2: Run the focused test to verify it fails for the expected reason**

Run:

```bash
npm test -- src/components/VotingOverviewPage.test.tsx -t "shows the top three entries"
```

Expected: Vitest fails because `.vote-overview__podium` and `.vote-overview__podium-entry` do not exist in the current markup.

Do not change production code before observing this failure.

---

### Task 2: Render the top-three podium from ranked entries

**Files:**
- Modify: `src/components/VotingOverviewPage.tsx` near the existing `leader` derivation and featured leader markup
- Test: `src/components/VotingOverviewPage.test.tsx`

**Interfaces:**
- Consumes: `rankedEntries`, `programName`, `cfg`, the existing `Ticker`, and the existing leader presentation.
- Produces: a `section.vote-overview__podium` with one `.vote-overview__podium-entry` for each available entry in `rankedEntries.slice(0, 3)`.

- [ ] **Step 1: Derive the podium from the existing ranked list**

Replace the current leader derivation with:

```tsx
  const podiumEntries = rankedEntries.slice(0, 3);
  const leader = podiumEntries[0];
  const totalEntries = rankedEntries.length;
```

Keep `leaderVotes` derived from `leader` and leave the full `rankedEntries.map(...)` unchanged.

- [ ] **Step 2: Replace the leader-only rail block with the podium markup**

Replace the `{leader ? (...) : null}` block inside `.vote-overview__rail` with:

```tsx
              {podiumEntries.length > 0 ? (
                <section
                  aria-label={`${programName} top three`}
                  className="vote-overview__podium vote-overview__animate"
                >
                  {leader ? (
                    <article className="vote-overview__podium-entry vote-overview__leader">
                      <div className="vote-overview__leader-media">
                        <img alt={`${leader.name} of ${leader.location}`} src={leader.image} />
                        <span className="vote-overview__leader-badge">Leading</span>
                      </div>
                      <div className="vote-overview__leader-type">
                        <p className="vote-overview__candidate-number">
                          {titleCase(cfg.nounSingular)} {leader.number} · {leader.location}
                        </p>
                        <h2 className="vote-overview__candidate-name">{leader.name}</h2>
                        <div className="vote-overview__leader-figures">
                          <p>
                            <Ticker className="vote-overview__candidate-votes" value={leader.votes} />
                            <span className="vote-overview__figure-label">votes</span>
                          </p>
                          <p>
                            <strong className="vote-overview__candidate-votes">{formatShare(leader.voteShare)}</strong>
                            <span className="vote-overview__figure-label">of all votes</span>
                          </p>
                        </div>
                      </div>
                    </article>
                  ) : null}

                  <div className="vote-overview__podium-secondary">
                    {podiumEntries.slice(1).map((entry) => (
                      <article
                        className="vote-overview__podium-entry vote-overview__podium-card"
                        data-rank={entry.rank}
                        key={entry.id}
                      >
                        <div className="vote-overview__podium-card-media">
                          <img alt={`${entry.name} of ${entry.location}`} src={entry.image} />
                          <span className="vote-overview__podium-card-rank">Rank {entry.rank}</span>
                        </div>
                        <div className="vote-overview__podium-card-type">
                          <p className="vote-overview__candidate-number">
                            {titleCase(cfg.nounSingular)} {entry.number}
                          </p>
                          <h3 className="vote-overview__podium-card-name">{entry.name}</h3>
                          <p className="vote-overview__podium-card-location">{entry.location}</p>
                          <p className="vote-overview__podium-card-votes">
                            <Ticker className="vote-overview__candidate-votes" value={entry.votes} />
                            <span className="vote-overview__figure-label">votes</span>
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
```

Keep the metrics block immediately after this section and keep the full ranking section unchanged. Use the same `Ticker` and image alt-text conventions as the existing leader card. Do not hard-code candidate names or votes in production markup.

- [ ] **Step 3: Run the focused component tests to verify the markup**

Run:

```bash
npm test -- src/components/VotingOverviewPage.test.tsx -t "top three|simulated Hara standings|fixed 16:9"
```

Expected: the new podium test and the existing focused overview tests pass. The full ranking still contains 12 Hara rows and the fixed-frame test still passes for every program.

- [ ] **Step 4: Run the complete component test file**

Run:

```bash
npm test -- src/components/VotingOverviewPage.test.tsx
```

Expected: all `VotingOverviewPage` tests pass, including live update markers, reduced-motion behavior, countdown behavior, and the new podium assertion.

---

### Task 3: Style the podium and add its responsive contract

**Files:**
- Modify: `src/styles.test.ts` in a new `voting overview podium` describe block
- Modify: `src/styles.css` after the existing leader styles and before the metric tile styles

**Interfaces:**
- Consumes: the class names emitted by Task 2 and the existing fixed-size `.vote-overview__frame` container.
- Produces: a desktop two-column podium with a large first-place card, stacked runner-up cards, and a narrow-frame stack in rank order.

- [ ] **Step 1: Write the failing style contract test**

Add this block to `src/styles.test.ts`:

```ts
describe('voting overview podium', () => {
  it('keeps first place featured and stacks the podium at narrow frame sizes', () => {
    expect(styles).toMatch(/\.vote-overview__podium\s*\{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(
      /\.vote-overview__podium\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.15fr\)\s+minmax\(0,\s*\.85fr\);/,
    );
    expect(styles).toMatch(
      /\.vote-overview__podium-secondary\s*\{[\s\S]*?grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
    );
    expect(styles).toMatch(/\.vote-overview__podium-card\s*\{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(
      /@container \(max-width:\s*40rem\)[\s\S]*?\.vote-overview__podium\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
    );
    expect(styles).toMatch(
      /@container \(max-width:\s*40rem\)[\s\S]*?\.vote-overview__podium-secondary\s*\{[\s\S]*?display:\s*contents;/,
    );
  });
});
```

- [ ] **Step 2: Run the focused style test to verify it fails**

Run:

```bash
npm test -- src/styles.test.ts -t "voting overview podium"
```

Expected: Vitest fails because the new podium selectors and container-query rules are not present.

- [ ] **Step 3: Add the minimal desktop and narrow-frame styles**

Insert this block after `.vote-overview__candidate-votes` and before the `metric tiles` comment:

```css
/* --- top-three podium ------------------------------------------------ */
.vote-overview__podium {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr);
  gap: .8cqw;
  min-height: 0;
}
.vote-overview__podium-secondary {
  display: grid;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: .8cqh;
  min-height: 0;
}
.vote-overview__podium-card {
  display: grid;
  grid-template-columns: 4.2cqw minmax(0, 1fr);
  gap: .65cqw;
  min-height: 0;
  padding: .7cqh .65cqw;
  overflow: hidden;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-lg);
  background: color-mix(in oklch, var(--surface) 76%, transparent);
}
.vote-overview__podium-card-media {
  position: relative;
  min-height: 0;
}
.vote-overview__podium-card-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 22%;
  border-radius: var(--radius-md);
  background: var(--surface-2);
}
.vote-overview__podium-card-rank {
  position: absolute;
  top: .35cqh;
  left: .35cqw;
  padding: .25cqh .3cqw;
  border-radius: 999px;
  color: oklch(0.2 0.03 152);
  font-size: .52cqw;
  font-weight: 720;
  letter-spacing: .08em;
  text-transform: uppercase;
  background: var(--arena, var(--gold));
}
.vote-overview__podium-card-type {
  display: grid;
  align-content: center;
  min-width: 0;
}
.vote-overview__podium-card-name {
  margin-top: .3cqh;
  font-family: var(--font-display);
  font-size: 1.2cqw;
  font-weight: 400;
  line-height: 1.04;
  letter-spacing: -.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vote-overview__podium-card-location {
  margin-top: .22cqh;
  color: var(--ink-dim);
  font-size: .64cqw;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vote-overview__podium-card-votes {
  display: flex;
  align-items: baseline;
  gap: .3cqw;
  margin-top: .55cqh;
}
.vote-overview__podium-card-votes .vote-overview__candidate-votes {
  font-size: 1.05cqw;
}
.vote-overview__podium-card-votes .vote-overview__figure-label {
  font-size: .52cqw;
}

@container (max-width: 40rem) {
  .vote-overview__podium {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1.35fr);
    grid-auto-rows: minmax(0, .65fr);
  }
  .vote-overview__podium-secondary {
    display: contents;
  }
}
```

The outer podium uses the existing frame container. `display: contents` on narrow frames promotes the two secondary articles into the podium grid, which makes the document order rank 1, rank 2, rank 3 without duplicating markup. The base styles remain scoped to `.vote-overview__*` and do not alter the full ranking.

- [ ] **Step 4: Run the focused style tests to verify the styles pass**

Run:

```bash
npm test -- src/styles.test.ts -t "voting overview podium"
```

Expected: the new style contract passes with no failures.

- [ ] **Step 5: Run the component and style tests together**

Run:

```bash
npm test -- src/components/VotingOverviewPage.test.tsx src/styles.test.ts
```

Expected: both files pass, including all existing tests in those files.

---

### Task 4: Verify the full change and preserve the worktree boundary

**Files:**
- Inspect: `src/components/VotingOverviewPage.tsx`
- Inspect: `src/components/VotingOverviewPage.test.tsx`
- Inspect: `src/styles.css`
- Inspect: `src/styles.test.ts`

**Interfaces:**
- Consumes: the completed component, style, and test changes from Tasks 1–3.
- Produces: fresh test, build, diff, responsive, and browser evidence for the overview route.

- [ ] **Step 1: Run the complete test suite**

Run:

```bash
npm test
```

Expected: Vitest exits with code 0 and reports no failed tests.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite both exit with code 0.

- [ ] **Step 3: Check the diff for whitespace errors**

Run:

```bash
git diff --check
```

Expected: the command prints no whitespace errors.

- [ ] **Step 4: Inspect the scoped diff and worktree status**

Run:

```bash
git diff -- src/components/VotingOverviewPage.tsx src/components/VotingOverviewPage.test.tsx src/styles.css src/styles.test.ts
git status --short
```

Confirm that the new change is limited to the podium markup, its focused tests, and its scoped styles. Do not stage or revert the other pre-existing modified and untracked files in the worktree. Do not commit the overlapping production files unless the user explicitly requests a commit after reviewing the diff.

- [ ] **Step 5: Verify the overview route in the browser**

Start the app with:

```bash
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/#hara/overview` in the in-app browser and verify:

- the large rank-1 card still says `Leading`;
- rank-2 and rank-3 cards show their rank, portrait, name, location, and votes;
- the full ranking still shows all 12 Hara entries, including rank 4;
- the page has no horizontal overflow at desktop and narrow frame sizes; and
- the browser console has no new errors while the page loads and the simulation updates.

Stop the dev server after the browser checks finish.
