# Buglasan Crown of Light redesign

## Status

Approved on August 24, 2026. The user selected the third generated direction, “Crown of Light,” and supplied the Buglasan Festival 2026 logo for the masthead.

## Goal

Replace the current public landing page with a cinematic, chaptered Buglasan festival experience inspired by the spatial storytelling and implementation discipline of ThreeUI’s Kage page. Keep the existing landing → login → voter dashboard journey and demo voting behavior intact.

## Design direction

The landing page presents a nocturnal Negros Oriental festival world, not a Japanese-themed reskin. The central visual is an illuminated ceremonial pavilion built from parol-like radial geometry, capiz-inspired translucent surfaces, woven patterns, sugarcane silhouettes, warm lantern light, and tropical atmosphere.

The approved first fold contains:

- The supplied Buglasan Festival 2026 logo in the upper-left masthead.
- A minimal fixed navigation with Festival, Candidates, Vote, Coronation, Updates, Login, and Vote now.
- The headline “Your vote. Their moment.” with one short supporting sentence.
- A primary “Enter the voting room” action and a secondary “Explore the festival” action.
- A visible online-voting status and one-vote-per-day rule.
- A large illuminated presentation of the supplied Buglasan Festival 2026 logo as the scene centerpiece; the generated BUGLASAN 2026 title is removed.
- A slim chapter rail on wide screens.
- A six-candidate procession strip leading into the next chapter.

## Page narrative

The public page uses five scroll chapters:

1. **Festival:** The Crown of Light hero and primary vote action.
2. **Candidates:** A saturated vermilion-and-gold portrait chapter introducing all six candidates.
3. **Vote:** A concise four-step explanation of login, selection, confirmation, and return voting.
4. **Coronation:** The festival story, voting window, countdown, and official event context.
5. **Updates:** Announcements and the closing call to enter the voting room.

Each chapter changes the camera framing and scene lighting while retaining one shared Three.js world. The 3D scene stays decorative and cannot block navigation, content, or voting.

## Assets

- Use the supplied logo file as the real brand asset in both the masthead and the central stage presentation. Do not redraw, reinterpret, or replace the logo.
- Use the existing candidate portrait source in `public/assets/candidate-portraits.png`; expose each portrait through measured crops that retain the source aspect ratio.
- Do not copy Kage’s temple, fonts, Japanese writing, source assets, or scene geometry.
- Use Phosphor Icons for new landing-page controls; do not hand-draw new interface icons.

## Three.js behavior

- Mount Three.js only while the landing page is active.
- Build the pavilion procedurally from reusable geometries and materials.
- Use GSAP ScrollTrigger to interpolate a small camera rig from measured section anchors and choreograph chapter handoffs.
- Add subtle pointer parallax only on fine pointers.
- Cap device pixel ratio at `1.5` and reduce particle count on narrow or low-power devices.
- Pause rendering when the document is hidden and dispose all GPU resources on unmount.
- Scope GSAP with `useGSAP`, revert its context on unmount, and kill all ScrollTriggers when the landing route exits.
- Respect `prefers-reduced-motion`: render a stable scene, remove scroll interpolation, and keep all content visible.
- If WebGL initialization fails, keep the complete HTML experience over a static dark festival backdrop.

## Interaction and routing

- `Enter the voting room`, `Vote now`, and candidate vote actions navigate to the existing login screen.
- Header and chapter-rail links scroll to real page sections.
- The mobile menu is a labeled button with `aria-expanded`, closes after navigation, closes on Escape, and locks background scrolling while open.
- The existing demo login, candidate selection, vote confirmation, rankings, mechanics, FAQs, and announcements remain functional.

## Responsive behavior

- Desktop uses a full-width fixed visual world, left-aligned hero copy, right-side chapter rail, and a horizontal candidate procession.
- Tablet keeps the visual world but removes the side rail and reduces scene complexity.
- Mobile uses a compact masthead, an off-canvas menu, stacked hero copy, a stable tall-camera composition, and a horizontally scrollable candidate procession with labeled controls.
- No viewport may introduce horizontal page overflow. Interactive controls remain at least `44px` high and form text remains at least `16px` on mobile.

## Visual system

- Base: near-black green and deep emerald.
- Primary metallic accent: antique gold.
- Text: warm ivory with high-contrast green-tinted supporting text.
- Chapter accent: one committed vermilion field for the candidate chapter.
- Typography: a sharp display serif paired with a restrained humanist sans; no more than two families.
- Avoid gradient text, glass-card collages, oversized rounded panels, repeated eyebrow labels, decorative metric cards in the hero, and generic pageant crowns.

## Verification requirements

- Unit-test camera progress and interpolation helpers before scene implementation.
- Unit-test the landing markup for the supplied logo, primary CTA, canvas fallback semantics, and five chapter anchors.
- Run the full Vitest suite and production build.
- Verify desktop and mobile journeys in the in-app browser, including menu, scroll chapters, login, vote confirmation, reduced-motion behavior, horizontal overflow, and console errors.
- Compare a `1440 × 1024` implementation capture against the selected revised visual target and record the result in `design-qa.md`.

## Out of scope

- A production authentication service, database, payment flow, analytics, content management system, or real vote submission API.
- Recreating or embedding the Kage source page.
- Changing the approved dashboard information architecture or demo voting rules.
