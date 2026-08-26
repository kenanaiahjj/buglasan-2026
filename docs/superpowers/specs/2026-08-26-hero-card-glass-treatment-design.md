# Hero program card glass treatment design

**Date:** August 26, 2026

## Goal

Make the four program cards beneath the Buglasan hero read as a single black-glass family with a subtle gold light source, then reserve each program's color for interaction.

## Design

- Keep the hero cards in the existing clickable button structure and preserve the current logos, labels, actions, and responsive carousel behavior.
- Use a charcoal-to-black translucent plaque surface with a thin warm-gold edge and a low-opacity gold wash from the top edge in the default state.
- Add a raised semicircular chamber behind each centered logo. Keep the logo grayscale and slightly subdued at rest, then restore its authored color on hover or keyboard focus.
- Center the program name as a large, balanced stack. Keep the supporting tagline and action visually quiet so the logo and title carry the card.
- Keep each program's existing accent color out of the default surface. On hover or keyboard focus, introduce that color through the logo, top light leak, inner ray, perimeter outline, and restrained halo while keeping the structural rim gold.
- Retain the existing lift and pointer-driven spotlight behavior, but keep the hover treatment interruptible and disable the orbit animation under reduced motion.
- Order only the hero card row as Hara sa Dumaguete, Gandang NegOrense, LGU Booth Contest, and Festival of Festivals. Keep the source data order unchanged for the full program chapter and subpage navigation.

## Out of scope

- Do not change the program data, card copy, logos, voting behavior, or full contest-screen cards.
- Do not change the WebGL scene or page-level background.
- Do not introduce new assets or a new component library.

## Acceptance criteria

- The hero row renders in the requested order: Hara, Gandang, LGU Booth, Festival of Festivals.
- All four hero cards use the centered logo-plaque layout and are visibly black/gray at rest with only a restrained gold tint.
- Logos are grayscale at rest and reveal their authored program colors on hover and keyboard focus.
- Hover and keyboard focus reveal the current program color through the logo, encapsulating outline, and glow while the main rim stays gold.
- The card remains readable, clickable, keyboard-focusable, and responsive at desktop and mobile widths.
- Reduced-motion users receive the color and focus state without a rotating perimeter animation.
- Unit tests pass, the production build succeeds, and browser checks report no new console errors or horizontal overflow.
