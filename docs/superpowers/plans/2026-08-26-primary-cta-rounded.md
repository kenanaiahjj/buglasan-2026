# Fully rounded primary CTAs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the shared Buglasan primary CTA treatment from a squircle to a fully rounded pill.

**Architecture:** Keep the existing `.crown-floating-dots-button` selector and all component markup unchanged. Update the outer button and its inset highlight layer in the shared stylesheet so every existing primary CTA receives the same geometry.

**Tech Stack:** React, TypeScript, Vite, Vitest, CSS.

## Global Constraints

- Modify `src/styles.css` only for the production change.
- Preserve the existing secondary `.crown-button--quiet`, ivory, text, navigation, and icon controls.
- Preserve the existing generic `.button--primary` pill treatment.
- Keep the existing gradients, shadows, copy, layout, and interaction states unchanged.
- Preserve unrelated pre-existing worktree changes.

---

### Task 1: Round the shared primary CTA surface

**Files:**
- Create: `src/styles.test.ts`
- Modify: `src/styles.css:702-755`

**Interfaces:**
- Consumes: The existing `.crown-floating-dots-button` and `.crown-floating-dots-button::after` CSS selectors.
- Produces: A `999px` outer and inner radius that renders every shared primary CTA as a pill.

- [ ] **Step 1: Write the failing regression test**

Create `src/styles.test.ts` with a focused CSS contract test:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('primary CTA geometry', () => {
  it('uses pill radii for the CTA surface and inset highlight', () => {
    expect(styles).toMatch(/\.crown-floating-dots-button\s*\{[\s\S]*?border-radius:\s*999px;/);
    expect(styles).toMatch(/\.crown-floating-dots-button::after\s*\{[\s\S]*?border-radius:\s*999px;/);
  });
});
```

- [ ] **Step 2: Run the focused test and verify that it fails for the current squircle**

Run:

```bash
npm test -- src/styles.test.ts
```

Expected result: Vitest reports one failed test because the outer selector currently contains `border-radius: 12px` and the inset highlight currently contains `border-radius: 11px`.

- [ ] **Step 3: Implement the minimal CSS change**

In `src/styles.css`, change only the two radius declarations:

```css
.crown-floating-dots-button {
  /* existing declarations remain unchanged */
  border-radius: 999px;
}

.crown-floating-dots-button::after {
  /* existing declarations remain unchanged */
  border-radius: 999px;
}
```

Keep `.crown-floating-dots-button::before { border-radius: inherit; }` unchanged so its moving light layer follows the outer pill automatically.

- [ ] **Step 4: Run the focused regression test and verify that it passes**

Run:

```bash
npm test -- src/styles.test.ts
```

Expected result: Vitest reports one passed test and zero failures.

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected result: all Vitest tests pass, the Vite build exits with status 0, and `git diff --check` reports no whitespace errors.

- [ ] **Step 6: Review the final diff**

Run:

```bash
git diff -- src/styles.css src/styles.test.ts
git status --short
```

Expected result: the production diff contains only the two radius changes, the new regression test contains only the focused CSS contract, and unrelated existing changes remain present but unmodified.
