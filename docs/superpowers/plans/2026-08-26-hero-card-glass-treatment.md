# Hero program card glass treatment implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder and restyle only the hero program cards as black glass with gold default lighting and accent-colored hover/focus states.

**Architecture:** Add a small ordered view of the existing `contestArenas` collection for the hero row. Keep the existing card markup and CSS hooks. Move the default light leak and ray to a shared gold source-light token, then switch those layers to the card's existing accent variables on hover or focus.

**Tech Stack:** React, TypeScript, CSS, Vitest, Vite.

## Global constraints

- Preserve existing program data and all non-hero program ordering.
- Preserve the current button semantics, click handlers, logos, copy, and mobile horizontal scroller.
- Use explicit CSS transitions and preserve reduced-motion behavior.
- Do not stage unrelated dirty-worktree files.

---

### Task 1: Lock order and surface contracts

**Files:**
- Modify: `src/components/LandingPage.test.tsx`
- Modify: `src/styles.test.ts`

- [ ] Assert the hero card class order is Hara, Gandang, Booths, Festival.
- [ ] Assert the base card uses the black-glass colors, blur, and gold source-light token.
- [ ] Assert accent color variables appear only in hover/focus glow and light layers.
- [ ] Run focused tests and confirm the new assertions fail before implementation.

### Task 2: Implement the hero-row order and visual system

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/styles.css`

- [ ] Build a typed hero-only order from the existing arena data and map it in the hero row.
- [ ] Set the default card surface to near-black glass with warm-gold border and source-light wash.
- [ ] Switch the light leak, ray, outline, border, and restrained glow to the existing arena accent on hover and focus.
- [ ] Keep the hover lift and spotlight behavior, add a visible focus ring, and disable perimeter animation for reduced motion.

### Task 3: Verify the result

- [ ] Run focused tests, the full test suite, `npm run build`, and `git diff --check`.
- [ ] At desktop width, confirm the requested order and black/gold default treatment.
- [ ] At mobile width, confirm the horizontal card scroller and focus state remain usable without overflow.
- [ ] Check browser logs for new errors.
