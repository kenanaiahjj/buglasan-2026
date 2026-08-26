# Ambient sparkle particles design

**Date:** August 26, 2026

## Goal

Replace the square-looking ambient particle sprites in the Buglasan hero with soft, star-like sparkles that twinkle independently.

## Design

- Keep the existing GPU point-sprite system, particle count, positions, drift, cursor repulsion, warm/cool palette, additive blending, and reduced-motion behavior.
- Replace the particle fragment falloff with three layered shapes:
  - a faint radial halo;
  - a compact luminous core;
  - thin horizontal and vertical rays that taper toward the sprite edge.
- Drive brightness with the existing per-particle phase and time uniform so particles twinkle out of sync.
- Keep the effect restrained. Sparkles should read as small points of light, not large lens flares or decorative icons.

## Out of scope

- Do not change the 3D logo, background shaders, fireworks, particle count, or scene layout.
- Do not add image assets or DOM elements.

## Acceptance criteria

- The particle fragment shader no longer produces square-looking sprites.
- The live hero shows soft four-point sparkles with varied twinkle timing at desktop and mobile widths.
- Existing particle movement and pointer interaction remain active.
- Unit tests pass, the production build succeeds, and browser verification reports no new console errors or horizontal overflow.
