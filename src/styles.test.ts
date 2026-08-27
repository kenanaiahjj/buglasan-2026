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

describe('hero arena card treatment', () => {
  it('uses a charcoal-to-black plaque surface with a restrained gold source light', () => {
    const cardBlock = styles.match(/\.hero-arena-card\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(cardBlock).toContain('min-height: 336px;');
    expect(cardBlock).toContain('rgba(72, 73, 78, .75)');
    expect(cardBlock).toContain('rgba(8, 10, 12, .78)');
    expect(cardBlock).toContain('backdrop-filter: blur(26px) saturate(135%);');
    expect(cardBlock).toContain('overflow: hidden;');
    expect(styles).toContain('--hero-card-source-light: rgba(247, 211, 119, .28);');
    expect(styles).toMatch(/\.hero-arena-cards\s*\{[\s\S]*?gap:\s*clamp\(1rem, 1\.8vw, 2rem\);/);
  });

  it('keeps the logo chamber contained inside the card', () => {
    const chamberBlock = styles.match(/\.hero-arena-card::before\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(chamberBlock).toContain('top: .8rem;');
    expect(chamberBlock).toContain('height: 128px;');
    expect(chamberBlock).not.toContain('top: -');
    expect(chamberBlock).toContain('border: 1px solid rgba(247, 211, 119, .55);');
    expect(chamberBlock).toContain('backdrop-filter: blur(18px) saturate(135%);');
    expect(styles).toMatch(/\.hero-arena-card__logo\s*\{[\s\S]*?left:\s*50%;[\s\S]*?transform:\s*translateX\(-50%\);/);
    expect(styles).toMatch(/\.hero-arena-card__name\s*\{[\s\S]*?margin:\s*1\.5rem auto 0;[\s\S]*?text-align:\s*center;[\s\S]*?font-weight:\s*700;/);
    expect(styles).toMatch(/\.hero-arena-card--hara \.hero-arena-card__name\s*\{[\s\S]*?max-width:\s*14ch;/);
  });

  it('keeps logos grayscale at rest and restores authored color on hover or focus', () => {
    expect(styles).toMatch(/\.hero-arena-card__logo\s*\{[\s\S]*?filter:\s*grayscale\(1\) brightness\(\.72\) contrast\(1\.18\);/);
    expect(styles).toMatch(/\.hero-arena-card:hover \.hero-arena-card__logo,[\s\S]*?\.hero-arena-card:focus-visible \.hero-arena-card__logo[\s\S]*?filter:\s*grayscale\(0\) saturate\(1\.15\) brightness\(1\.05\);/);
  });

  it('keeps each program color reserved for hover or focus glow', () => {
    expect(styles).toMatch(/\.hero-arena-card:hover \.hero-arena-card__light-leak,[\s\S]*?var\(--leak-primary/);
    expect(styles).toMatch(/\.hero-arena-card:hover \.hero-arena-card__ray,[\s\S]*?var\(--leak-primary/);
    expect(styles).toMatch(/\.hero-arena-card:hover,[\s\S]*?0 0 12px var\(--arena-accent/);
    expect(styles).toMatch(/\.hero-arena-card:hover,[\s\S]*?border-color:\s*rgba\(247, 211, 119, \.82\);/);
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
});

describe('Hara gallery card sizing', () => {
  it('keeps candidate cards at the compact reference scale', () => {
    expect(styles).toMatch(
      /\.hara-gallery__grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*15rem\),\s*16rem\)\);/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*?\.hara-gallery__grid\s*\{\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
    );
    expect(styles).toMatch(/\.hara-gallery-card\s*\{[\s\S]*?max-width:\s*16rem;/);
    expect(styles).toMatch(/\.hara-gallery-card__media\s*\{[\s\S]*?aspect-ratio:\s*1\.28;/);
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
    const utilityBlock = styles.match(/\.hara-gallery__home,[\s\S]*?\.hara-gallery__how-to summary\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(utilityBlock).toContain('min-height: 44px;');
    expect(utilityBlock).toContain('border: 0;');
    expect(utilityBlock).toContain('border-radius: 0;');
    expect(utilityBlock).toContain('background: transparent;');
    expect(utilityBlock).toContain('text-transform: uppercase;');
    expect(styles).toMatch(
      /\.hara-gallery__home:hover,[\s\S]*?\.hara-gallery__how-to summary:hover,\s*\.hara-gallery__how-to\[open\] summary\s*\{[\s\S]*?color:\s*var\(--crown-gold-light\);/,
    );
  });

  it('keeps candidate cards aligned in a uniform grid', () => {
    const cardBlock = styles.match(/\.hara-gallery-card\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(cardBlock).not.toMatch(/\brotate:/);
    expect(styles).not.toMatch(/\.hara-gallery-card:nth-child/);
  });
});
