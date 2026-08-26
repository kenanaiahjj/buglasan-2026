# Buglasan hero edge framing design

## Status

Approved in conversation on August 26, 2026.

## Goal

Frame the desktop and tablet hero with a subtle Buglasan-specific atmosphere
without competing with the official logo, hero copy, program cards, or voting
actions.

## Decision

Use two large tree silhouettes built from the existing festival landmark
assets:

- Place the palm cluster at the extreme left edge and the Dumaguete acacia at
  the extreme right edge.
- Shift most of each asset beyond the viewport so only the outer silhouette
  enters the hero frame.
- Use a dark green grading filter and low opacity, with a broad mask that fades
  toward the hero center.
- Do not add a ridge, hut horizon, glow blobs, or other decorative objects to
  this frame. The existing WebGL scene already supplies the festival light and
  depth.

The treatment is decorative only. It must not receive pointer events or add
content for assistive technology.

## Architecture

Add one `hero-edge-frame` decorative wrapper inside the existing
`.crown-hero--living-green` section. The wrapper contains two decorative
images: `palm-cluster.svg` and `dumaguete-acacia.svg`. CSS controls their
placement, grading, opacity, masking, and responsive visibility.

The wrapper sits behind the hero content and above the fixed WebGL scene. The
existing `.hero-stage-reserve`, `.hero-lockup`, and `.hero-arena-cards` remain
unchanged so the new layer cannot alter the hero layout or interaction flow.

## Responsive behavior

- Desktop and tablet (`min-width: 861px`): show the complete edge frame.
- Mobile (`max-width: 860px`): hide the decorative wrapper so the compact hero
  stays focused and horizontally uncluttered.
- Reduced motion: use no animation for the decorative layer. The layer is
  static, so no additional motion behavior is required.

## Visual constraints

- Use no borders, chips, eyebrow labels, or new text.
- Keep the inner fade broad enough that the logo and hero actions remain clear.
- Keep the tree silhouettes subtle enough that they frame the hero at a glance,
  not as additional illustrations placed beside it.
- Preserve the current green, gold, and dark hero palette.
- Keep the existing `overflow: clip` behavior on the landing shell; do not
  introduce horizontal scrolling.

## Accessibility and interaction

The wrapper uses `aria-hidden="true"`, and each decorative image uses an empty
`alt` attribute. `pointer-events: none` prevents the assets from intercepting
clicks. The existing semantic hero heading, copy, actions, and program cards
remain the only interactive or meaningful content in the new layer.

## Verification

- Run the focused and full Vitest suites.
- Run `npm run build` and `git diff --check`.
- Inspect the running landing page at desktop/tablet widths and confirm the
  frame fades into the hero rather than forming a visible panel or border.
- Inspect a mobile width and confirm the decorative wrapper is hidden.
- Confirm the four program cards and hero actions remain clickable and their
  layout is unchanged.
