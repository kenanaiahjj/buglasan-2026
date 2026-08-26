# Fully rounded primary CTAs

## Status

Approved in conversation on August 26, 2026.

## Goal

Make every primary Buglasan call-to-action read as a fully rounded pill instead of a squircle.

## Root cause

The shared `.crown-floating-dots-button` selector in `src/styles.css` sets `border-radius: 12px`. The selector is applied to the primary CTAs in the landing-page header, mobile navigation, hero, voting chapter, and closing callout. Its inset highlight layer uses a separate `11px` radius, so it must be updated with the outer surface.

## Decision

Update the shared primary CTA rule to use `border-radius: 999px` and update its `::after` highlight layer to use `border-radius: 999px`. Keep the existing `::before` `border-radius: inherit` declaration, interaction states, gradients, shadows, copy, and layout unchanged.

## Scope

- Modify `src/styles.css` only for the production change.
- Preserve the existing secondary `.crown-button--quiet`, ivory, text, navigation, and icon controls.
- Preserve the existing generic `.button--primary` pill treatment.
- Add a focused regression test that asserts the shared primary CTA and inner highlight use pill radii.

## Verification

Run the focused regression test, the full Vitest suite, and `npm run build`. Confirm the worktree diff contains only the intended style/test change plus this design record, and preserve unrelated pre-existing worktree changes.
