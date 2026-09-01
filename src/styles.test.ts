// @ts-expect-error The browser app excludes Node types; Vitest runs this test in Node.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const testProcess = (globalThis as typeof globalThis & { process: { cwd(): string } }).process;
const styles = readFileSync(`${testProcess.cwd()}/src/styles.css`, 'utf8');

describe('primary CTA geometry', () => {
  it('uses pill radii for the CTA surface and inset highlight', () => {
    expect(styles).toMatch(/\.crown-floating-dots-button\s*\{[^}]*border-radius:\s*999px;/);
    expect(styles).toMatch(/\.crown-floating-dots-button::after\s*\{[^}]*border-radius:\s*999px;/);
  });
});
describe('scrolled landing header', () => {
  it('adds a dark blurred surface behind the fixed navigation', () => {
    const headerBlock = styles.match(/\.crown-header\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const scrolledBlock = styles.match(/\.crown-header\.is-scrolled\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(headerBlock).toContain('backdrop-filter: blur(0) saturate(100%);');
    expect(headerBlock).toContain('transition:');
    expect(scrolledBlock).toContain('background-color: rgba(1, 8, 5, .78);');
    expect(scrolledBlock).toContain('backdrop-filter: blur(16px) saturate(125%);');
    expect(scrolledBlock).toContain('box-shadow:');
    expect(scrolledBlock).not.toContain('inset 0 -1px 0 rgba(255, 255, 255, .06)');
  });
});
describe('home voting cue', () => {
  it('uses a larger gold treatment with a restrained glow', () => {
    const cueBlock = styles.match(/\.hero-intro__instruction\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const glowBlock = styles.match(/\.hero-intro__instruction::after\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(cueBlock).toContain('color: var(--gold-bright);');
    expect(cueBlock).toMatch(/font-size:\s*clamp\(/);
    expect(cueBlock).toContain('text-shadow:');
    expect(glowBlock).toContain('filter: blur(');
    expect(glowBlock).toContain('animation: heroIntroGoldGlow');
    expect(styles).toMatch(/@keyframes heroIntroGoldGlow\s*\{[\s\S]*?opacity:/);
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.hero-intro__instruction::after[\s\S]*?animation:\s*none;/,
    );
  });
});
describe('mobile landing footer', () => {
  it('removes the footer from the mobile composition', () => {
    const mobileBlock = styles.match(/@media \(max-width:\s*760px\) \{([\s\S]*?)\n\}/)?.[1] ?? '';

    /* The footer is gone at every width, not hidden at some of them — no
       element, no rules, nothing to override. */
    expect(styles).not.toContain('crown-footer');
  });
});
describe('voting overview podium', () => {
  it('keeps first place featured and stacks the podium at narrow frame sizes', () => {
    const podiumName = styles.match(/\.vote-overview__podium-card-name\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(styles).toMatch(/\.vote-overview__podium\s*\{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(
      /\.vote-overview__podium\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.15fr\)\s+minmax\(0,\s*\.85fr\);/,
    );
    expect(styles).toMatch(
      /\.vote-overview__podium-secondary\s*\{[\s\S]*?grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
    );
    expect(styles).toMatch(/\.vote-overview__podium-card\s*\{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(
      /@container \(max-width:\s*40rem\)[\s\S]*?\.vote-overview__podium\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
    );
    expect(styles).toMatch(
      /@container \(max-width:\s*40rem\)[\s\S]*?\.vote-overview__podium-secondary\s*\{[\s\S]*?display:\s*contents;/,
    );
    expect(podiumName).toContain('white-space: normal;');
  });

  it('gives secondary portraits a full-width square media slot', () => {
    const cardBlock = styles.match(/\.vote-overview__podium-card\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const mediaBlock = styles.match(/\.vote-overview__podium-card-media\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(cardBlock).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(cardBlock).toContain('grid-template-rows: minmax(0, 1fr) auto;');
    expect(cardBlock).not.toContain('grid-template-columns: 4.2cqw minmax(0, 1fr);');
    expect(mediaBlock).toContain('aspect-ratio: 1 / 1;');
  });
});

describe('voting overview wallboard and live bar edges', () => {
  it('lets dense standings rows shrink around their content', () => {
    const rowBlock = styles.match(/\.vote-overview__rank-row\s*\{(?=\s*position:)([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(rowBlock).toContain('grid-template-rows: minmax(0, 1fr);');
    expect(rowBlock).toContain('min-height: 0;');
  });

  it('extends the overview to 16:10 so a full candidate field stays readable', () => {
    const frameBlock = styles.match(/\.vote-overview__frame\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(styles).toMatch(/\.vote-overview\s*\{[\s\S]*?overflow:\s*auto;/);
    expect(frameBlock).toContain('width: min(100vw, calc(100dvh * 16 / 10));');
    expect(frameBlock).toContain('height: min(100dvh, calc(100vw * 10 / 16));');
    expect(frameBlock).not.toContain('16 / 9');
    expect(styles).toMatch(/\.vote-overview__rank-bar-fill\s*\{[\s\S]*?position:\s*relative;/);
    expect(styles).toMatch(/\.vote-overview__rank-bar-fill::after\s*\{[\s\S]*?animation:\s*voteOverviewBarEdge/);
    expect(styles).toMatch(/@keyframes voteOverviewBarEdge\s*\{[\s\S]*?transform:/);
    expect(styles).not.toMatch(
      /@media \(max-width:\s*64rem\),\s*\(max-aspect-ratio:\s*4\s*\/\s*3\),\s*\(max-height:\s*42rem\)[\s\S]*?\.vote-overview__frame\s*\{[\s\S]*?height:\s*auto;/,
    );
    expect(styles).not.toMatch(/@media \(max-width:\s*40rem\)[\s\S]*?\.vote-overview__podium\s*\{/);
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.vote-overview__rank-bar-fill::after[\s\S]*?animation:\s*none;/,
    );
  });

  it('turns each bar end into a soft animated light cap', () => {
    const sparkBlock = styles.match(/\.vote-overview__rank-bar-fill::before\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const edgeBlock = styles.match(/\.vote-overview__rank-bar-fill::after\s*\{(?=\s*top:)([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(sparkBlock).toContain('box-shadow:');
    expect(sparkBlock).toContain('animation: voteOverviewBarSpark');
    expect(edgeBlock).toContain('mix-blend-mode: screen;');
    expect(edgeBlock).toMatch(/filter:\s*blur\([^)]*\);/);
    expect(edgeBlock).toMatch(/box-shadow:\s*0 0 \.8cqw/);
    expect(edgeBlock).toContain('animation: voteOverviewBarEdge');
    expect(edgeBlock).not.toContain('border:');
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.vote-overview__rank-bar-fill::before,[\s\S]*?\.vote-overview__rank-bar-fill::after[\s\S]*?animation:\s*none;/,
    );
  });
});

describe('shared quiet control hover treatment', () => {
  it('uses one flat hover component for landing navigation and gallery controls', () => {
    expect(styles).toMatch(
      /\.crown-quiet-control\s*\{[\s\S]*?transition:\s*color 0\.22s ease, background 0\.22s ease, transform 0\.22s ease;/,
    );
    expect(styles).toMatch(
      /\.crown-quiet-control:hover\s*\{[\s\S]*?color:\s*var\(--crown-gold-light\);[\s\S]*?background:\s*rgba\(255, 255, 255, 0\.06\);[\s\S]*?transform:\s*translateY\(-1px\);/,
    );
    expect(styles).toMatch(/\.crown-nav__link\s*\{[\s\S]*?border-radius:\s*0;/);
    expect(styles).not.toMatch(/\.crown-nav__link:hover\s*\{/);
    expect(styles).not.toMatch(/\.hara-gallery__home:hover,/);
  });

  it('keeps the how-to-vote button on the shared nav type scale', () => {
    const navButtonBlock = styles.match(/\.crown-nav button\.crown-nav__link\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(navButtonBlock).not.toContain('font: inherit;');
  });
});

describe('native voting location select', () => {
  it('keeps the opened option list readable against the dark modal', () => {
    const optionBlock = styles.match(/\.vote-flow__field select option\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(styles).toContain('.vote-flow__field select { color-scheme: dark; }');
    expect(optionBlock).toContain('color: var(--ink);');
    expect(optionBlock).toContain('background: var(--surface-2);');
  });
});

describe('official mark pair sizing', () => {
  it('uses a smaller shared slot and corrects the seal canvas whitespace', () => {
    const markBlock = styles.match(/\.hero-official-marks img\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(styles).toMatch(
      /\.hero-official-marks\s*\{[\s\S]*?--hero-mark-size:\s*clamp\(5\.5rem,\s*9vw,\s*7\.5rem\);/,
    );
    expect(markBlock).toContain('width: var(--hero-mark-size);');
    expect(markBlock).toContain('height: var(--hero-mark-size);');
    expect(markBlock).toContain('object-fit: contain;');
    expect(styles).toMatch(
      /\.hero-official-marks__seal\s*\{[\s\S]*?transform:\s*scale\(1\.5\);[\s\S]*?transform-origin:\s*center;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*860px\)[\s\S]*?\.hero-official-marks\s*\{[\s\S]*?--hero-mark-size:\s*clamp\(5rem,\s*20vw,\s*7rem\);/,
    );
  });
});

describe('landing header mark utility', () => {
  it('keeps the official marks compact and aligned to the right header track', () => {
    const headerMarks = styles.match(/\.crown-header__marks\.hero-official-marks\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(headerMarks).toContain('--hero-mark-size: clamp(2.5rem, 3.8vw, 3.5rem);');
    expect(headerMarks).toContain('width: auto;');
    expect(headerMarks).toContain('justify-self: end;');
    expect(headerMarks).toContain('margin: 0;');
    expect(styles).toMatch(
      /\.crown-header__marks\.hero-official-marks \.hero-official-marks__seal\s*\{[\s\S]*?transform:\s*scale\(1\.22\);/,
    );
    expect(styles).toMatch(
      /\.crown-header__marks\.hero-official-marks \.hero-official-marks__tourism\s*\{[\s\S]*?transform:\s*scale\(\.78\);/,
    );
  });
});

describe('hero arena card treatment', () => {
  it('builds each plaque as an arched niche over a name plate', () => {
    /* Anchored on the base rule, not the first `.hero-arena-card {` in the
       file — the breakpoint overrides now sit above it. */
    const cardBlock = styles.match(/\.hero-arena-card \{\n  position: relative;([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(cardBlock).toContain('min-height: 300px;');
    expect(cardBlock).toContain('overflow: hidden;');
    expect(styles).toContain('--hero-card-source-light: rgba(247, 211, 119, .28);');
    expect(styles).toMatch(/\.hero-arena-cards\s*\{[\s\S]*?gap:\s*clamp\(1rem, 1\.8vw, 2rem\);/);
    /* The glass logo chamber it replaced is gone. `::before` is reused on
       mobile as the highlight overlay, so check for the chamber's own
       giveaway rather than the pseudo-element. */
    expect(styles).not.toMatch(/\.hero-arena-card::before \{[^}]*border-radius: 110px/);
    expect(styles).toContain('.hero-arena-card__arch-edge');
    expect(styles).toContain('.hero-arena-card__plate');
  });

  it('uses a compact niche ratio without changing the supplied programme marks', () => {
    const niche = styles.match(/\.hero-arena-card__niche\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(niche).toMatch(/aspect-ratio:\s*100\s*\/\s*116;/);
    expect(niche).toContain('min-height: 0;');
  });

  it('keeps the plaque compact without shrinking its readable title', () => {
    const plate = styles.match(/\.hero-arena-card__plate\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(plate).toContain('gap: .85rem;');
    expect(plate).toContain('padding: 1.4rem 1rem 1.6rem;');
  });

  it('fits the programme mark inside the niche rather than clamping its axes', () => {
    const logo = styles.match(/\.hero-arena-card__logo\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    // max-width/max-height clamp the two axes independently and hand back a
    // squashed box for object-fit to letterbox inside. 100%/100% does not.
    expect(logo).toContain('object-fit: contain;');
    expect(logo).toContain('width: 100%;');
    expect(logo).toContain('height: 100%;');
    expect(logo).not.toContain('position: absolute;');
    // The emblem scales against the arch too, so two columns do not leave it
    // a stamp in the middle of a doorway.
    expect(styles).toMatch(/\.hero-arena-card__emblem svg \{[\s\S]*?width:\s*54%;/);
  });

  it('greys the programme marks at rest and lights only the pointed-at card', () => {
    const logo = styles.match(/\.hero-arena-card__logo\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const emblem = styles.match(/\.hero-arena-card__emblem\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(logo).toMatch(/filter:\s*grayscale\(1\)/);
    // The emblem has no colour to drain, so it greys down the ink ramp.
    expect(emblem).toMatch(/color:\s*color-mix\(in oklch, var\(--ink-dim\)/);
    expect(styles).toMatch(
      /\.hero-arena-card:hover \.hero-arena-card__logo,[\s\S]*?filter:\s*grayscale\(0\)/,
    );
    expect(styles).toMatch(
      /\.hero-arena-card:hover \.hero-arena-card__emblem,[\s\S]*?color:\s*var\(--gold-bright\);/,
    );
  });

  it('keeps each program color reserved for hover or focus glow', () => {
    expect(styles).toMatch(/\.hero-arena-card:hover \.hero-arena-card__light-leak,[\s\S]*?var\(--leak-primary/);
    expect(styles).toMatch(/\.hero-arena-card:hover \.hero-arena-card__ray,[\s\S]*?var\(--leak-primary/);
    expect(styles).toMatch(/\.hero-arena-card:hover,[\s\S]*?var\(--arena-accent/);
    expect(styles).toMatch(/\.hero-arena-card:hover \.hero-arena-card__arch-edge,[\s\S]*?stroke:\s*var\(--gold-bright\);/);
  });

  it('lets the plaque row bridge into the next chapter with an on-brand vote cursor', () => {
    // The bridge is a negative bottom margin, not one particular triple of
    // values — pinning the literal made a deliberate change to how far the
    // row sits below the fold read as a regression.
    expect(styles).toMatch(/\.hero-arena-cards\s*\{[\s\S]*?margin-bottom:\s*clamp\(\s*-[\d.]+rem,\s*-[\d.]+vh,\s*-[\d.]+rem\s*\);/);
    // The row rests low and climbs on hover; the travel is the peek.
    expect(styles).toMatch(/\.hero-arena-card\s*\{[\s\S]*?transform:\s*translateY\(var\(--card-rest/);
    expect(styles).toMatch(/\.hero-arena-card:hover,[\s\S]*?transform:\s*translateY\(-\d+px\);/);
    expect(styles).toContain('cursor: url("data:image/svg+xml,');
    expect(styles).toContain('VOTE%20NOW');
    /* The hero used to be pinned to 1080px on a phone, which guaranteed a
       scroll on a page whose only content is the hero. It is one viewport
       now, and the landing root clips so nothing can grow it back. */
    expect(styles).toMatch(
      /@media \(max-width:\s*1180px\)[\s\S]*?\.crown-landing \{\s*height: 100dvh;\s*overflow: hidden;/,
    );
    expect(styles).toMatch(/@media \(max-width:\s*1180px\)[\s\S]*?\.crown-hero \{[\s\S]*?height: 100dvh;/);
    expect(styles).not.toContain('min-height: 1080px');
  });

  /* The plaques are a desktop affordance. Stacked on a phone each one is
     most of a screen, so below 1180px they come out and a single CTA opens
     the contest picker instead. The cut is 1180px, not 1024: below that the
     four fell to a 2x2 grid 1300px tall, taller than any laptop screen. */
  it('swaps the plaques for one CTA below 1180px', () => {
    expect(styles).toContain('.hero-actions { display: none; }');
    expect(styles).toMatch(
      /@media \(max-width:\s*1180px\)[\s\S]*?\.crown-hero \.hero-arena-cards \{ display: none; \}[\s\S]*?\.hero-actions \{\s*display: flex;/,
    );
  });

  it('carries no per-card animation for a surface that no longer renders', () => {
    // The cards used to cycle a highlight on touch — four cards repainting
    // forever next to a WebGL scene, at widths where they are now hidden.
    for (const gone of [
      'mobileCardSequence',
      'mobileHighlight',
      'mobileLogoSequence',
      'mobileOutlineSequence',
      'mobileLeakSequence',
    ]) {
      expect(styles).not.toContain(gone);
    }
  });
});

describe('entry card shape', () => {
  /* Two of the four programmes photograph one person standing; the other two
     photograph a building and a line of dancers. A tall crop of either throws
     away the thing being judged. */
  it('widens the cell, the card and the frame together for the wide programmes', () => {
    expect(styles).toMatch(
      /\.hara-gallery--landscape \.hara-gallery__grid \{\s*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 23rem\), 27rem\)\);/,
    );
    expect(styles).toContain('.hara-gallery--landscape .hara-gallery-card { max-width: 27rem; }');
    expect(styles).toContain('.hara-gallery--landscape .hara-gallery-card__media { aspect-ratio: 4 / 3; }');
    // Portrait stays the default, so nothing had to change for Hara.
    expect(styles).toMatch(/\.hara-gallery-card__media \{[\s\S]*?aspect-ratio: 1 \/ 1\.12;/);
  });

  it('drops a column at the breakpoints rather than crushing the wide cards', () => {
    expect(styles).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*?\.hara-gallery--landscape \.hara-gallery__grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*?\.hara-gallery--landscape \.hara-gallery__grid \{ grid-template-columns: minmax\(0, 1fr\); \}/,
    );
  });
});

describe('vote cursor', () => {
  it('hides the native pointer only once the follower is actually running', () => {
    // The bitmap cursor stays as the fallback: if the component never mounts
    // — no JS, a coarse pointer — the document is never marked and the old
    // cursor is what shows, so the affordance is never simply missing.
    expect(styles).toContain('cursor: url("data:image/svg+xml,');
    expect(styles).toContain('VOTE%20NOW');
    expect(styles).toMatch(
      /:root\.has-vote-cursor \.hero-arena-card:hover,[\s\S]*?cursor:\s*none;/,
    );
  });

  it('animates the pill and takes its glow from the hovered programme', () => {
    expect(styles).toMatch(/@property --vote-cursor-sweep\s*\{[\s\S]*?syntax:\s*"<angle>";/);
    expect(styles).toMatch(/\.vote-cursor__rim\s*\{[\s\S]*?animation:\s*voteCursorSweep/);
    expect(styles).toMatch(/@keyframes voteCursorSweep\s*\{\s*to \{ --vote-cursor-sweep: 360deg; \}/);
    expect(styles).toMatch(/\.vote-cursor__glow\s*\{[\s\S]*?var\(--vote-cursor-accent/);
    expect(styles).toMatch(/\.vote-cursor\s*\{[\s\S]*?pointer-events:\s*none;/);
  });

  it('stops the self-running motion under reduced motion but keeps the pill', () => {
    const reduced = styles.match(
      /@media \(prefers-reduced-motion: reduce\) \{\n  \/\* The pill still appears([\s\S]*?)\n\}/,
    )?.[1] ?? '';

    expect(reduced).toContain('.vote-cursor__spark,');
    expect(reduced).toContain('animation: none;');
    expect(reduced).not.toContain('.vote-cursor__label');
  });
});

describe('Hara gallery card sizing', () => {
  it('gives candidate portraits enough vertical room for the full head', () => {
    expect(styles).toMatch(
      /\.hara-gallery__grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*15rem\),\s*16rem\)\);/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*?\.hara-gallery__grid\s*\{\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
    );
    expect(styles).toMatch(/\.hara-gallery-card\s*\{[\s\S]*?max-width:\s*16rem;/);
    expect(styles).toMatch(/\.hara-gallery-card__media\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1\.12;/);
  });

  it('centers the Hara mark inside the gallery intro', () => {
    expect(styles).toMatch(/\.hara-gallery__intro\s*\{[\s\S]*?display:\s*grid;[\s\S]*?justify-items:\s*center;/);
    expect(styles).toMatch(/\.hara-gallery__logo\s*\{[\s\S]*?margin:\s*0\s+auto/);

    const logoBlock = styles.match(/\.hara-gallery__logo\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    expect(logoBlock).toContain('object-fit: contain;');
    expect(logoBlock).not.toMatch(/border:|border-radius:|box-shadow:/);
    expect(styles).toMatch(
      /\.hara-gallery__logo\s*\{[\s\S]*?width:\s*clamp\(8rem,\s*16vw,\s*12rem\);/,
    );
  });

  it('styles the Hara support block and search-only toolbar', () => {
    expect(styles).toMatch(/\.hara-gallery__support\s*\{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(/\.hara-gallery__status-live\s*\{[\s\S]*?color:/);
    expect(styles).not.toMatch(/\.hara-gallery__status-live span\s*\{/);
    expect(styles).toMatch(/\.hara-gallery__toolbar\s*\{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(/\.hara-gallery__toolbar\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(styles).toMatch(/\.hara-gallery__search\s*\{[\s\S]*?min-height:\s*42px;/);
    expect(styles).not.toMatch(/\.hara-gallery__sort/);
    expect(styles).not.toMatch(/\.hara-gallery__count/);
    expect(styles).toMatch(/\.hara-gallery__empty\s*\{/);
    expect(styles).toMatch(/@media \(max-width:\s*640px\)[\s\S]*?\.hara-gallery__toolbar\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
  });

  it('uses flat main-page utility controls instead of pills', () => {
    // Tolerates extra selectors sharing the rule (e.g. __overview) — the
    // contract is the declarations, not the exact selector list.
    const utilityBlock = styles.match(/\.hara-gallery__home,[\s\S]*?\.hara-gallery__how-to\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(utilityBlock).toContain('min-height: 44px;');
    expect(utilityBlock).toContain('border: 0;');
    expect(utilityBlock).toContain('border-radius: 0;');
    expect(utilityBlock).toContain('background: transparent;');
    expect(utilityBlock).toContain('text-transform: uppercase;');
    expect(styles).toMatch(
      /\.crown-quiet-control:hover\s*\{[\s\S]*?color:\s*var\(--crown-gold-light\);/,
    );
  });

  it('keeps candidate cards aligned in a uniform grid', () => {
    const cardBlock = styles.match(/\.hara-gallery-card\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(cardBlock).not.toMatch(/\brotate:/);
    expect(styles).not.toMatch(/\.hara-gallery-card:nth-child/);
  });

  it('keeps booth reference photos opaque instead of blending them as SVG artwork', () => {
    expect(styles).toMatch(
      /\.contest-subpage--booths \.hara-gallery-card__media img\s*\{[\s\S]*?mix-blend-mode:\s*normal;/,
    );
  });
});

describe('landing programme index removal', () => {
  it('keeps the redundant lower programme surface out of the stylesheet', () => {
    for (const gone of [
      '.contests-chapter',
      '.programme-index',
      '.programme-row',
      '.contest-screen-card',
      '.contest-screens-grid',
      '.contests-footer-callout',
    ]) {
      expect(styles).not.toContain(gone);
    }
  });
});

describe('subpage color themes', () => {
  it('defines distinct color theme variables for each subpage while keeping hara as is', () => {
    // Hara (coronation gold)
    expect(styles).toMatch(/\.contest-subpage--hara\s*\{[\s\S]*?--subpage-accent:\s*#f7d377;/);
    // Gandang (blue)
    expect(styles).toMatch(/\.contest-subpage--gandang\s*\{[\s\S]*?--subpage-accent:\s*#38bdf8;/);
    // Booths (purple)
    expect(styles).toMatch(/\.contest-subpage--booths\s*\{[\s\S]*?--subpage-accent:\s*#c084fc;/);
    // Festival of Festivals (fiesta orange)
    expect(styles).toMatch(/\.contest-subpage--festival\s*\{[\s\S]*?--subpage-accent:\s*#fb923c;/);
  });

  it('keeps hero arena cards in sync with the arena color themes', () => {
    expect(styles).toMatch(/\.hero-arena-card--booths\s*\{[\s\S]*?--arena-accent:\s*#c084fc;/);
    expect(styles).toMatch(/\.hero-arena-card--gandang\s*\{[\s\S]*?--arena-accent:\s*#38bdf8;/);
    expect(styles).toMatch(/\.hero-arena-card--festival\s*\{[\s\S]*?--arena-accent:\s*#fb923c;/);
    expect(styles).toMatch(/\.hero-arena-card--hara\s*\{[\s\S]*?--arena-accent:\s*#fde047;/);
  });

  it('tints the 3D scene background effects, shaders, and canvas per subpage while keeping hara as is', () => {
    // Booths: Purple canvas filter and tint overlay
    expect(styles).toMatch(/\.festival-scene--booths\s+\.festival-scene__canvas\s*\{[\s\S]*?filter:\s*hue-rotate\(115deg\)/);
    expect(styles).toMatch(/\.festival-scene--booths\s+\.festival-scene__tint\s*\{[\s\S]*?mix-blend-mode:\s*color;/);

    // Gandang: Blue canvas filter and tint overlay
    expect(styles).toMatch(/\.festival-scene--gandang\s+\.festival-scene__canvas\s*\{[\s\S]*?filter:\s*hue-rotate\(55deg\)/);
    expect(styles).toMatch(/\.festival-scene--gandang\s+\.festival-scene__tint\s*\{[\s\S]*?mix-blend-mode:\s*color;/);

    // Festival of Festivals: Orange canvas filter and tint overlay
    expect(styles).toMatch(/\.festival-scene--festival\s+\.festival-scene__canvas\s*\{[\s\S]*?filter:\s*hue-rotate\(230deg\)/);
    expect(styles).toMatch(/\.festival-scene--festival\s+\.festival-scene__tint\s*\{[\s\S]*?mix-blend-mode:\s*color;/);

    // Hara: Kept 100% as is (no filter, no tint)
    expect(styles).toMatch(/\.festival-scene--hara\s+\.festival-scene__canvas\s*\{[\s\S]*?filter:\s*none;/);
    expect(styles).toMatch(/\.festival-scene--hara\s+\.festival-scene__tint\s*\{[\s\S]*?display:\s*none;/);
  });

  it('gives the home scene a warm gold wash that fades into the dark edge', () => {
    const homeBlock = styles.match(/\.festival-scene--home\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(homeBlock).toContain('var(--gold-deep)');
    expect(homeBlock).toContain('var(--gold-bright)');
    expect(homeBlock).toContain('#020B06');
  });
});
