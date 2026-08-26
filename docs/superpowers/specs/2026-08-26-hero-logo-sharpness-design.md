# Buglasan 3D hero logo sharpness design

**Date:** August 26, 2026

## Goal

Make the loaded 3D Buglasan hero logo look slightly sharper on desktop and mobile while preserving the supplied GLB, its authored PBR materials, its layout, and its existing fallback behavior.

## Approaches considered

1. **Targeted overlay supersampling (recommended).** Render the logo overlay at a modestly higher internal pixel ratio than the atmosphere. This improves edge coverage without forcing the expensive background shaders to use the same resolution.
2. **Raise the whole renderer resolution.** This is simpler, but it spends the extra pixels on the backdrop, particles, bloom, and landmarks even though the request is limited to the logo.
3. **Re-export or regenerate the logo asset.** This could change the supplied brand artwork and would make the result less deterministic, so it is out of scope.

## Chosen design

- Add a small, pure render-quality helper that calculates two ratios per quality tier:
  - an overlay ratio with a 1.25 minimum and tier caps of 2.0, 1.5, and 1.25;
  - the existing device-pixel-ratio cap for the atmosphere render targets.
- Use the overlay ratio for the default framebuffer and the atmosphere ratio for `PostPipeline.setSize()`.
- Keep adaptive tier changes intact. When the scene drops quality, the logo remains at the tier's bounded overlay ratio rather than reverting to a browser-DPR-only render.
- Apply the renderer's supported anisotropy limit to imported logo color textures. This improves oblique texture sampling without replacing or mutating the authored material pipeline.
- Do not change the model source, model scale, camera stops, logo position, fallback image, motion behavior, or route structure.

## Acceptance criteria

- A DPR-1 desktop preview uses a higher-resolution logo overlay than the current one.
- A high-DPR mobile preview retains a bounded overlay ratio instead of being forced to the low tier's previous ratio of 1.
- The atmosphere keeps its existing quality ratios and adaptive downgrade behavior.
- Existing logo-source, material-pipeline, lighting, and multisampling contracts remain valid.
- Unit tests cover the ratio boundaries, the build succeeds, and the live preview shows the GLB with no new console errors at desktop and mobile widths.
