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

describe('hero arena card treatment', () => {
  it('builds each plaque as an arched niche over a name plate', () => {
    const cardBlock = styles.match(/\.hero-arena-card\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(cardBlock).toContain('min-height: 336px;');
    expect(cardBlock).toContain('overflow: hidden;');
    expect(styles).toContain('--hero-card-source-light: rgba(247, 211, 119, .28);');
    expect(styles).toMatch(/\.hero-arena-cards\s*\{[\s\S]*?gap:\s*clamp\(1rem, 1\.8vw, 2rem\);/);
    // The glass chamber it replaced is gone, not merely hidden.
    expect(styles).not.toContain('.hero-arena-card::before');
    expect(styles).toContain('.hero-arena-card__arch-edge');
    expect(styles).toContain('.hero-arena-card__plate');
  });

  /* The arch is drawn in a 100x128 viewBox and scaled with
     preserveAspectRatio="none". That is only safe while the box it scales
     into carries the same ratio — otherwise the apex skews. */
  it('matches the niche box to the arch viewBox so the apex cannot skew', () => {
    const niche = styles.match(/\.hero-arena-card__niche\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(niche).toMatch(/aspect-ratio:\s*100\s*\/\s*128;/);
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
    // The chapter blends out of the hero with a dark, top-down ramp and no
    // dividing rule. Its frost veil sits behind the content, so the scene
    // remains present without competing with the copy.
    expect(styles).toMatch(/\.contests-chapter\s*\{[\s\S]*?z-index:\s*1;[\s\S]*?isolation:\s*isolate;[\s\S]*?linear-gradient\(180deg,[\s\S]*?rgba\(1, 7, 4, \.66\)/);
    expect(styles).toMatch(/\.contests-chapter::before\s*\{[\s\S]*?backdrop-filter:\s*blur\(18px\) saturate\(78%\);/);
    expect(styles).toMatch(/\.contests-chapter\s*>\s*\.chapter-shell\s*\{[\s\S]*?position:\s*relative;[\s\S]*?z-index:\s*1;/);
    expect(styles).not.toMatch(/\.contests-chapter\s*\{[^}]*border-top:[^}]*rgba\(247, 211, 119/);
    expect(styles).toContain('cursor: url("data:image/svg+xml,');
    expect(styles).toContain('VOTE%20NOW');
    expect(styles).toMatch(/@media \(max-width:\s*760px\)[\s\S]*?\.crown-hero\s*\{\s*min-height:\s*1080px;\s*padding:\s*122px 18px 3rem;/);
  });

  it('stacks the hero arena cards on mobile and defines sequential appearance rules', () => {
    const mobileBlock = styles.match(/@media \(max-width:\s*760px\) \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(mobileBlock).toMatch(/\.hero-arena-cards\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(mobileBlock).not.toMatch(/\.hero-arena-cards\s*\{[\s\S]*?scroll-snap-type:/);
    expect(mobileBlock).toMatch(/\.hero-arena-card\s*\{[\s\S]*?width:\s*100%;/);
    expect(mobileBlock).toMatch(/\.hero-arena-card\s*\{[\s\S]*?--card-rest:\s*0px;/);
    expect(mobileBlock).toMatch(/animation:\s*mobileCardSequence 12s ease-in-out infinite;/);
    expect(mobileBlock).toMatch(/@keyframes mobileCardSequence/);
    expect(mobileBlock).toMatch(/@keyframes mobileOutlineSequence/);
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
  });

  it('styles the Hara support block and candidate toolbar', () => {
    expect(styles).toMatch(/\.hara-gallery__support\s*\{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(/\.hara-gallery__status-live\s*\{[\s\S]*?color:/);
    expect(styles).toMatch(/\.hara-gallery__toolbar\s*\{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(/\.hara-gallery__search\s*\{[\s\S]*?min-height:\s*42px;/);
    expect(styles).toMatch(/\.hara-gallery__sort\s+button\.is-active/);
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
});

describe('programme index treatment', () => {
  it('sets the programmes as a bill rather than a grid of cards', () => {
    // Cards, and everything that had to be invented to fill them, are gone.
    for (const gone of [
      '.contest-screen-card',
      '.contest-screens-grid',
      '.contests-footer-callout',
    ]) {
      expect(styles).not.toContain(gone);
    }

    const row = styles.match(/\.programme-row\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    // Hairline rules, no box: a row is not a card and must not grow one.
    expect(row).toContain('border-bottom: 1px solid var(--line-soft);');
    expect(row).toContain('background: none;');
    expect(row).not.toMatch(/box-shadow/);
    expect(row).not.toMatch(/border-radius/);
  });

  it('keeps the row reachable and legible on a phone', () => {
    expect(styles).toMatch(/\.programme-row:focus-visible \{[\s\S]*?outline:\s*2px solid/);
    // Facts drop under the name rather than squeezing the column.
    expect(styles).toMatch(
      /@media \(max-width:\s*720px\)[\s\S]*?\.programme-row__facts \{[\s\S]*?grid-row:\s*3;/,
    );
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
});
