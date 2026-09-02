# Entry Profile Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the entry profile's two-control navigation with a clearer contest return label, centered Home action, and compact mobile treatment while keeping Share beside Vote.

**Architecture:** Keep the contextual contest return and Home in `EntryProfilePage`'s existing grid. Preserve Share beside Vote and leave `shareEntryPage`, its live status, and its manual-copy fallback unchanged. Collapse only the visible contest label at the mobile breakpoint.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, jsdom

## Global Constraints

- Preserve the existing hash-route callbacks and share fallback behavior.
- Keep all navigation controls at least 44 px high.
- Keep the full contest destination in each back control's accessible name.
- Use the current contest data as the source of program labels.
- Do not change the vote flow.

---

### Task 1: Build the responsive detail navigation

**Files:**
- Modify: `src/components/EntryProfilePage.tsx`
- Modify: `src/components/EntryProfilePage.test.tsx`
- Modify: `src/styles.css`
- Modify: `src/entryProfileStyles.test.ts`

**Interfaces:**
- Consumes: `EntryProfilePageProps.onBackToProgram`, `EntryProfilePageProps.onBackToHome`, and `shareEntryPage(payload)`
- Produces: `.entry-profile__nav-program` and `.entry-profile__nav-home` controls, with `.entry-profile__share` retained beside Vote

- [x] **Step 1: Write the failing component tests**

```tsx
expect(navButtons.map((button) => button.textContent?.trim())).toEqual([
  'Festival of FestivalsFestivals',
  'Home',
]);
expect(nav?.querySelector('.entry-profile__nav-program')?.getAttribute('aria-label')).toBe(
  'Back to Festival of Festivals',
);
expect(nav?.querySelector('.entry-profile__share')).toBeNull();
expect(shell.querySelector('.entry-profile__content .entry-profile__share')).not.toBeNull();
```

- [x] **Step 2: Write the failing CSS contract tests**

```ts
expect(rule('.entry-profile__nav-program')).toMatch(/justify-self:\s*start/);
expect(rule('.entry-profile__nav-home')).toMatch(/justify-self:\s*center/);
expect(css).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*\.entry-profile__nav\s*\{[^}]*position:\s*sticky/);
```

- [x] **Step 3: Run the focused tests and confirm they fail for the missing named controls and mobile rule**

Run: `npm test -- src/components/EntryProfilePage.test.tsx src/entryProfileStyles.test.ts`

Expected: FAIL because the named grid placements and compact mobile behavior do not exist.

- [x] **Step 4: Implement the navigation markup and responsive styles**

```tsx
<nav aria-label={`${entry.name} navigation`} className="entry-profile__nav">
  <button aria-label={`Back to ${programName}`} className="entry-profile__nav-program" onClick={onBackToProgram} type="button">
    <ArrowLeft aria-hidden="true" size={16} />
    <span className="entry-profile__nav-program-full">{programName}</span>
    <span aria-hidden="true" className="entry-profile__nav-program-compact">{compactProgramName}</span>
  </button>
  <button className="entry-profile__nav-home" onClick={onBackToHome} type="button">
    <House aria-hidden="true" size={16} />
    <span>Home</span>
  </button>
</nav>
```

Use `justify-self: start` and `justify-self: center` for the two named controls. At `max-width: 720px`, make the nav sticky, show the compact contest label, and preserve the full accessible name with `aria-label`. Leave Share beside Vote in `.entry-profile__actions`.

- [x] **Step 5: Run the focused tests and confirm they pass**

Run: `npm test -- src/components/EntryProfilePage.test.tsx src/entryProfileStyles.test.ts`

Expected: PASS with 9 tests.

- [x] **Step 6: Verify the complete change**

Run: `npm test -- --maxWorkers=1`

Expected: PASS with no failed tests. Run the suite with one worker because the two existing overview timer tests can exceed their 5-second timeout when every file runs in parallel. Existing jsdom canvas warnings can remain if the suite still exits successfully.

Run: `npm run build`

Expected: PASS.

Run: `git diff --check`

Expected: no output and exit code 0.

Inspect `#booths/booth-01` at desktop and mobile widths. Confirm that the contest return stays at the leading edge, Home stays centered, the mobile label fits, Share remains beside Vote and announces its result, and Vote still opens the existing modal.

- [x] **Step 7: Commit the implementation**

```bash
git add docs/superpowers/plans/2026-09-02-entry-profile-navigation.md src/components/EntryProfilePage.tsx src/components/EntryProfilePage.test.tsx src/styles.css src/entryProfileStyles.test.ts
git commit -m "feat: improve entry profile navigation"
```
