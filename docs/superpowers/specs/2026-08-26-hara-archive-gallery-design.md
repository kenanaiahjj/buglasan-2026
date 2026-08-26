# Hara sa Dumaguete archive gallery

**Status:** Approved direction; implementation pending written-spec review

## Summary

When a visitor opens Hara sa Dumaguete, replace the standard contest-detail layout with a full-screen contestant gallery inspired by the archive interaction on [inspiring.nk.studio/es](https://inspiring.nk.studio/es). The gallery should feel like a composed visual field rather than a conventional three-column content section. Each of the six existing Hara contestants enters in sequence, remains readable, and provides an accessible path to vote.

The other program pages keep their current treatment. This change applies only to the Hara route.

## Reference direction

The reference page uses a dark, atmospheric viewport with a minimal utility bar and an offset field of image-led cards. Cards vary slightly in position and rotation, creating an editorial archive composition that invites exploration. The Buglasan implementation should borrow that composition and pacing, not copy the reference site’s branding, text, assets, or navigation.

## Experience goals

- Make the six Hara contestants the primary content on the page.
- Preserve the existing Buglasan visual language and the shared quiet background used on program subpages.
- Make the gallery feel intentional and premium without adding decorative labels that do not carry meaning.
- Keep contestant information and voting actions clear at a glance.
- Make the route transition and card entrance feel connected to the landing experience.

## Page structure

### Stable shell

Keep the existing subpage route and the shared quiet festival scene mounted behind the page. The quiet scene remains the background treatment: no fireworks, no 3D logo, particles, shaders, or landing-page hover illustrations should appear on the Hara subpage.

Retain the existing top-level navigation affordances:

- `Festival Hub` returns to the program hub.
- `Voting Room` remains available for the broader voting flow.

Do not add a second hero title block, arena number, eyebrow label, random chip, or large metadata strip to this gallery page.

### Gallery stage

Use a full-viewport stage below the compact utility bar. The stage contains the six existing Hara candidates from `src/data/pageant.ts` and uses their existing portrait assets and candidate metadata.

On desktop and tablet, arrange the cards as an offset two-row field with three cards per row. The field can extend visually beyond a strict grid through controlled translation and slight rotation, but every card must remain discoverable and its primary content must not be clipped. Keep enough breathing room around the field for the dark background to remain visible.

Each card includes:

- The existing candidate portrait.
- Candidate name.
- Hometown or location.
- The existing advocacy or talent detail where it is already part of the candidate data.
- A clear `Vote now` action connected to the existing vote handler.

Use semantic links or buttons for navigation and voting. Do not make the entire card the only interactive target.

### Mobile layout

At mobile widths, remove the large desktop perspective offsets and rotations that could cause clipping. Use a readable two-column gallery when space allows, then collapse to a single column at the smallest supported width. Preserve the same card order and content hierarchy.

## Motion behavior

### Route transition

Use the existing page-transition behavior when entering the Hara route. The background shell should remain visually continuous while the gallery content enters above it.

### Staggered card entrance

Animate the six cards with the existing GSAP-safe entrance helper or an equivalent scoped animation. Cards enter in data order with an approximately 80 ms stagger. The entrance can combine:

- Opacity from 0 to 1.
- A short vertical rise.
- A restrained scale change.
- A small rotation settling to each card’s final composition angle.

Keep the motion short and editorial. Do not add a perpetual animation loop, automatic carousel, or attention-grabbing bounce.

### Interaction states

On hover or keyboard focus, lift only the active card slightly above the field and increase its visual clarity. Preserve its final rotation and use a restrained outline or shadow to establish focus. Do not cause neighboring cards to jump or reflow.

The focus treatment must be visible without relying on color alone. Keyboard users must be able to reach the card’s vote action and activate it normally.

### Reduced motion

When `prefers-reduced-motion: reduce` is active, render cards in their final positions without the entrance animation and avoid transition-heavy hover effects. Keep focus styles and all interactions available.

## Implementation approach

Add a dedicated Hara gallery component, or an explicitly isolated Hara branch that is equivalent in responsibility, within the existing contest-subpage flow. Prefer a dedicated component if it keeps `ContestSubpageView` readable.

The gallery must:

- Reuse the existing candidate data and image paths.
- Reuse the existing navigation and voting callbacks.
- Keep the existing `#hara` route behavior.
- Leave the LGU Booth Contest, Festival of Festivals, and Gandang NegOrense rendering branches unchanged unless a shared type or callback requires a mechanical adjustment.
- Avoid introducing external image URLs, new brand assets, or per-program background colors in this change.

Keep animation selectors and refs scoped to the gallery so that entering Hara does not alter landing-page or other subpage motion.

## Verification plan

Before reporting the implementation complete:

1. Add or update a component test that confirms the Hara route renders all six contestants, their existing data, and an accessible vote action for each card.
2. Run the full test suite with `npm test`.
3. Run the production build with `npm run build`.
4. Run `git diff --check`.
5. Verify the live local route in the browser at desktop, tablet, and mobile widths.
6. Confirm that the Hara route keeps the quiet background and that the landing route still restores the 3D logo, particles, shaders, fireworks, and hover illustrations.
7. Check the browser console for errors while entering Hara, focusing cards, and activating a vote action.
8. Verify the reduced-motion presentation with the browser’s motion preference emulation.

## Non-goals

- Do not redesign the landing page.
- Do not restyle the other three program subpages.
- Do not add program-specific background colors yet.
- Do not change the 3D logo’s structure, model, materials, or lighting.
- Do not invent contestant names, locations, schedules, vote rules, or other event data.
- Do not clone the reference site’s branding, copy, assets, or code.
