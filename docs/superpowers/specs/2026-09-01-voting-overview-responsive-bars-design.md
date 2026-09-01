# Voting overview responsive board and live bar edges

**Status:** Approved direction; awaiting written-spec review

## Goal

Make the voting overview readable in both wallboard and ordinary browser
viewports. The current overview is composed inside a fixed 16:9 frame with
hidden overflow, so shorter, portrait, or narrow viewports can hide content.
Add a restrained continuous motion treatment to the end of every ranking bar so
the board feels live without changing standings data or distracting from names
and vote totals.

## Scope

This change applies to `VotingOverviewPage` for all four supported programs:
Hara, Gandang, Booths, and Festival. It changes layout and decorative motion
only. The replaceable overview source, ranking calculations, top-three podium,
countdown, simulated updates, routes, and vote actions remain unchanged.

## Responsive composition

### Wide presentation mode

Keep the existing cinematic wallboard treatment when the viewport is a wide
landscape display:

- Compose the board inside a centered 16:9 frame.
- Keep the podium rail and complete ranking side by side.
- Keep the complete ranking inside its dedicated panel.
- Avoid visible scrollbars when the board fits the viewport.
- Use the outer overview shell as a safety-net scroll container if an unusual
  browser size still produces content larger than the viewport.

The wide mode remains suitable for an event display and keeps the current
visual hierarchy: rank 1 is featured, ranks 2 and 3 are compact, and the full
ranking remains visible.

### Adaptive flow mode

Switch to a normal document-flow layout when the viewport is narrow, portrait,
or unusually short. Use the existing CSS breakpoint system with a concrete
fallback for `max-width: 64rem`, `max-aspect-ratio: 4 / 3`, or
`max-height: 42rem`.

In flow mode:

- Let the outer shell scroll vertically instead of clipping its contents.
- Make the frame full width with `height: auto` and a minimum height based on
  the viewport.
- Stack the header content and countdown when they no longer fit comfortably.
- Stack the podium rail above the ranking panel.
- Keep metrics in a two-column grid when readable, then collapse them to one
  column at the smallest width.
- Give ranking rows an intrinsic minimum height instead of dividing a fixed
  panel height among every entry.
- Keep every entry, vote total, share, and bar available in document order.
- Prevent horizontal overflow and keep the operator controls within the safe
  viewport area.

The fallback is allowed to be taller than the viewport. Scrolling is the
recovery mechanism for a normal browser; it does not alter the no-scroll
wallboard composition on wide screens.

## Animated ranking-bar edge

Treat the existing proportional fill as the visual indicator of relative
standing. Add one CSS pseudo-element to each fill as a shader-like trailing
edge:

- Place a narrow luminous cap at the fill's right edge.
- Use a soft gradient and glow that match the program accent.
- Animate only `transform` and `opacity`, with a slow, low-contrast breathing
  and micro-shift cycle.
- Keep the effect clipped to the row so it never becomes a detached decoration.
- Offset the cycle slightly by row position so all bars do not pulse in exact
  unison.
- Keep the bar width calculation in React and do not introduce a new data or
  rendering dependency.

The effect is decorative and must remain `aria-hidden`. Under
`prefers-reduced-motion: reduce`, disable the animation while retaining a
static, low-intensity edge or the existing fill alone.

## Component and data boundaries

No ranking or source changes are required. `VotingOverviewPage` continues to
derive the podium and rows from `rankedEntries`. If a small CSS custom property
is needed for bar phase, derive it from `entry.rank` at render time; do not add
phase state or timers to the component.

## Accessibility

- Keep the ordered ranking semantics and visible text unchanged.
- Keep the bar decoration hidden from assistive technology.
- Preserve visible focus styles for board controls.
- Ensure flow mode has no horizontal scrolling or clipped interactive content.
- Respect reduced-motion preferences for the new bar animation and existing
  overview motion.

## Testing and verification

Add focused style contracts for:

- the wide 16:9 frame and overflow safety net;
- the adaptive flow breakpoint and stacked body;
- intrinsic ranking-row sizing in flow mode;
- the animated bar-edge pseudo-element and keyframes; and
- the reduced-motion override.

Preserve existing component coverage for the top-three podium, full ranking,
live updates, all four programs, and reduced-motion update markers.

Verify the rendered `#hara/overview` route at a wide landscape viewport and a
narrow or portrait viewport. Confirm that all ranking rows are reachable, the
document has no horizontal overflow, the bar edge moves in normal motion mode,
and the edge is static when reduced motion is enabled. Run the full test suite,
production build, and `git diff --check` before handoff.

## Non-goals

- Do not replace the CSS effect with a WebGL shader or add a rendering library.
- Do not change vote totals, ranking order, simulation timing, or API contracts.
- Do not remove the top-three podium or the complete ranking.
- Do not redesign the Hara gallery, landing page, or other program pages.
