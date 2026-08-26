# Anchored hero sparkles design

**Date:** August 26, 2026

## Goal

Make the Buglasan hero sparkles feel intentional and decorative instead of like drifting particles.

## Design

- Keep the existing GPU point-sprite system and four-point sparkle fragment treatment.
- Replace randomized particle positions with a deterministic layout that frames the 3D logo from the outer edges.
- Remove particle-layer orbital drift, scene rotation, and cursor repulsion. Each sparkle stays in its authored position.
- Keep time-based brightness and a restrained point-size pulse so each sparkle twinkles in place.
- Use fewer, larger-spaced anchors on low-power devices while preserving the same visual framing.
- Keep the backdrop star field independent; its background twinkle can continue to animate behind the anchored hero sparkles.

## Out of scope

- Do not change the 3D logo model, logo placement, fireworks, landmark motion, or DOM layout.
- Do not add image assets or DOM elements.
- Do not remove the hero's existing logo parallax or lighting response.

## Acceptance criteria

- Hero sparkles use a stable, curated set of positions around the logo.
- Particle position calculations contain no time-driven drift or cursor displacement.
- Sparkle brightness and size still vary over time, with phases out of sync.
- The live hero reads as a quiet frame around the logo at desktop and mobile widths.
- Unit tests pass, the production build succeeds, and browser verification reports no new console errors or horizontal overflow.
