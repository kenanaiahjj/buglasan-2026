# Vote confirmation card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Turn the existing confirmed-payment state into a responsive, accessible card that identifies the voted entry, its program category, the votes added, and the updated total.

**Architecture:** Keep \`VoteFlowModal\` as the only owner of the success-state markup. Reuse \`chosen\`, \`arenaDisplayName(arena)\`, \`draft.quantity\`, and \`confirmedTotal\`; add only presentation classes and a category label. Keep payment, reducer, receipt, and tally behavior unchanged.

**Tech Stack:** React 19, TypeScript, Vitest, existing CSS custom properties and \`color-mix()\` styling.

## Global Constraints

- Apply the success-card treatment to Hara, Gandang, Booths, and Festival.
- Use the existing selected entry and arena data; do not add API fields or global state.
- Keep \`Total votes\` server-backed with the current fallback while the tally refresh is pending.
- Keep the result inside the existing \`role="status"\` live region.
- Use a heading for the entry name and a semantic definition list for vote totals.
- Keep the card responsive and prevent horizontal overflow.
- Preserve failed-payment, hosted-checkout, idempotency, focus, and navigation behavior.
- Preserve unrelated dirty-worktree changes and stage only feature files.

---

### Task 1: Define the success-card contract with failing tests

**Files:**

- Modify: \`src/components/VoteFlowModal.test.tsx\`

**Interfaces:**

- Consumes: The existing \`stubApi\`, \`fillSupporter\`, and confirmed vote flow.
- Produces: Assertions for the dedicated card, Hara’s category label, and non-pageant category labels.

- [ ] **Step 1: Add the shared arena-entry import.**

Update the imports:

~~~tsx
import { entriesForArena } from '../lib/arenaEntries';
~~~

Keep the existing \`contestArenas\` and \`haraCandidates\` import.

- [ ] **Step 2: Extend the existing confirmed-vote test.**

After the existing \`Vote successful\` assertion, add:

~~~tsx
expect(q('.vote-flow__success-card')).not.toBeNull();
expect(q('.vote-flow__success-card')?.getAttribute('aria-labelledby')).toBeTruthy();
expect(q('.vote-flow__success-candidate-copy h3')?.textContent).toBe(haraCandidates[0].name);
expect(q('.vote-flow__success-category')?.textContent).toBe('Hara sa Negros Oriental');
expect(q('.vote-flow__success-stats dd')?.textContent).toBe('55');
~~~

Keep the existing image, total, receipt, and phone assertions.

- [ ] **Step 3: Add category coverage for Booths and Festival.**

Add this test after the existing confirmed-vote test:

~~~tsx
it.each([
  ['booths', 'LGU Booth Contest'],
  ['festival', 'Festival of Festivals'],
] as const)('labels the confirmation card with the %s program', async (arenaId, category) => {
  const arena = contestArenas.find((candidate) => candidate.id === arenaId)!;
  const entry = entriesForArena(arena.id)[0];

  mount(
    <VoteFlowModal
      api={stubApi().api}
      arena={arena}
      dispatch={() => undefined}
      entryId={entry.id}
      mode="flow"
      onClose={() => undefined}
    />,
  );

  await fillSupporter();
  await clickAsync(nextButton());
  await clickAsync(nextButton());

  expect(q('.vote-flow__success-category')?.textContent).toBe(category);
});
~~~

This drives the same confirmed path for both non-pageant categories and proves the label comes from the arena passed to the modal.

- [ ] **Step 4: Run the focused tests and confirm the red state.**

Run:

~~~bash
npm test -- src/components/VoteFlowModal.test.tsx
~~~

Expected: FAIL because the success state has no \`.vote-flow__success-card\` or \`.vote-flow__success-category\` yet. Existing payment-flow assertions must still run.

- [ ] **Step 5: Commit the failing contract.**

~~~bash
git add src/components/VoteFlowModal.test.tsx
git diff --cached --check
git commit -m "test: define vote confirmation card contract"
~~~

Do not stage existing changes in \`src/styles.css\`, \`src/data/pageant.ts\`, or other files.

### Task 2: Add the category and card semantics to the success state

**Files:**

- Modify: \`src/components/VoteFlowModal.tsx\`

**Interfaces:**

- Consumes: \`chosen\`, \`programName\`, \`draft.quantity\`, \`confirmedTotal\`, and \`titleId\` already available in the component.
- Produces: \`.vote-flow__success-card\`, \`.vote-flow__success-category\`, an accessible entry heading, and the existing stats in one result card.

- [ ] **Step 1: Wrap the confirmed result in a labeled section.**

In the \`step === 'done'\` branch, keep the live region and success kicker, then place the selected entry and stats inside this section:

~~~tsx
<section
  aria-labelledby={\`\${titleId}-success-entry\`}
  className="vote-flow__success-card"
>
  {chosen !== null && (
    <div className="vote-flow__success-candidate">
      {chosen.image !== null && (
        <img
          alt={\`\${chosen.name}, entry \${chosen.number}\`}
          className="vote-flow__success-image"
          decoding="async"
          height={88}
          src={chosen.image}
          width={88}
        />
      )}
      <div className="vote-flow__success-candidate-copy">
        <p className="vote-flow__success-label">You voted for</p>
        <h3 id={\`\${titleId}-success-entry\`}>{chosen.name}</h3>
        <p className="vote-flow__success-category">{programName}</p>
        <p>#{chosen.number} · {chosen.origin}</p>
      </div>
    </div>
  )}
  <dl className="vote-flow__success-stats">
    <div>
      <dt>Votes added</dt>
      <dd>{draft.quantity.toLocaleString('en-PH')}</dd>
    </div>
    <div>
      <dt>Total votes</dt>
      <dd>{confirmedTotal === null ? 'Updating…' : confirmedTotal.toLocaleString('en-PH')}</dd>
    </div>
  </dl>
</section>
~~~

Keep the existing receipt note after the section. Keep the stats rendering even if \`chosen\` is unexpectedly null.

- [ ] **Step 2: Run the focused tests after the markup change.**

Run:

~~~bash
npm test -- src/components/VoteFlowModal.test.tsx
~~~

Expected: The new card, heading, category, quantity, and total assertions pass once the markup exists. The card may still have the old visual treatment until Task 3.

### Task 3: Style the result as one responsive premium card

**Files:**

- Modify: \`src/styles.css\`

**Interfaces:**

- Consumes: Existing \`--arena\`, \`--gold\`, surface, line, and typography tokens.
- Produces: One accent-tinted confirmation card with compact identity and stats, responsive at the existing mobile breakpoint.

- [ ] **Step 1: Add the outer card treatment.**

Insert before \`.vote-flow__success-candidate\`:

~~~css
.vote-flow__success-card {
  display: grid;
  width: 100%;
  gap: .75rem;
  margin: .2rem 0 .15rem;
  padding: .85rem;
  border: 1px solid color-mix(in oklch, var(--arena, var(--gold)) 48%, transparent);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(145deg, color-mix(in oklch, var(--arena, var(--gold)) 12%, transparent), transparent 58%),
    color-mix(in oklch, var(--surface-2) 64%, transparent);
  box-shadow: 0 0 1.6rem color-mix(in oklch, var(--arena, var(--gold)) 12%, transparent);
}
~~~

- [ ] **Step 2: Flatten the identity block into the outer card.**

Replace the existing \`.vote-flow__success-candidate\` declarations with:

~~~css
.vote-flow__success-candidate {
  display: flex;
  align-items: center;
  width: 100%;
  gap: .8rem;
  margin: 0;
  padding: 0;
  text-align: left;
}
~~~

Update the copy selectors:

~~~css
.vote-flow__success-candidate-copy { min-width: 0; }
.vote-flow__success-label { margin: 0 0 .15rem; color: var(--ink-dim); font-size: .7rem; }
.vote-flow__success-candidate-copy h3 { margin: 0; color: var(--ink); font-size: 1.08rem; font-weight: 650; }
.vote-flow__success-category { margin: .2rem 0 0; color: var(--arena, var(--gold)); font-size: .76rem; font-weight: 620; }
.vote-flow__success-candidate-copy p:last-child { margin: .15rem 0 0; color: var(--ink-muted); font-size: .72rem; }
~~~

- [ ] **Step 3: Keep stats inside the card.**

Change only the success-stats margin so the definition list aligns with the card:

~~~css
.vote-flow__success-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
  gap: .55rem;
  margin: 0;
}
~~~

Keep the existing stat tiles, numeric formatting, and no-motion rules.

- [ ] **Step 4: Add the narrow-screen fallback.**

Inside the existing \`@media (max-width: 520px)\` block, add:

~~~css
  .vote-flow__success-card { padding: .75rem; }
  .vote-flow__success-image { flex-basis: 4rem; width: 4rem; height: 4rem; }
~~~

Add a very narrow fallback:

~~~css
@media (max-width: 360px) {
  .vote-flow__success-stats { grid-template-columns: 1fr; }
}
~~~

- [ ] **Step 5: Run the focused tests and check the CSS diff.**

Run:

~~~bash
npm test -- src/components/VoteFlowModal.test.tsx
git diff --check
~~~

Expected: All modal tests pass, including Hara, Booths, and Festival category labels. \`git diff --check\` produces no output.

- [ ] **Step 6: Commit the implementation.**

~~~bash
git add src/components/VoteFlowModal.tsx src/styles.css
git diff --cached --check
git commit -m "feat: add vote confirmation card"
~~~

### Task 4: Verify all affected surfaces

**Files:**

- Verify: \`src/components/VoteFlowModal.tsx\`
- Verify: \`src/components/VoteFlowModal.test.tsx\`
- Verify: \`src/styles.css\`

**Interfaces:**

- Consumes: The completed confirmation card and existing four-program routes.
- Produces: Evidence that the presentation change does not regress payment or navigation behavior.

- [ ] **Step 1: Run the related component tests.**

~~~bash
npm test -- src/components/VoteFlowModal.test.tsx src/components/ContestSubpageView.test.tsx
~~~

Expected: PASS.

- [ ] **Step 2: Run the production build.**

~~~bash
npm run build
~~~

Expected: PASS with no TypeScript or bundling errors.

- [ ] **Step 3: Inspect the rendered Festival and Booth flows.**

Use the existing local preview at \`http://localhost:5173/\`. Open a Festival entry and a Booth entry, advance to the payment step, and confirm that the success-state UI uses the selected entry image/name and the correct category label. Resize to a narrow viewport and confirm the card remains inside the modal with no horizontal overflow.

- [ ] **Step 4: Run final diff checks.**

~~~bash
git diff --check
git status --short
~~~

Expected: no whitespace errors. Existing unrelated modified files remain untouched and are not included in the feature commits.
