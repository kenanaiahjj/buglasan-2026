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
  it('keeps cards black and glassy with a restrained gold source light by default', () => {
    const cardBlock = styles.match(/\.hero-arena-card\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(cardBlock).toContain('rgba(4, 5, 5, .86)');
    expect(cardBlock).toContain('rgba(0, 2, 2, .98)');
    expect(cardBlock).toContain('backdrop-filter: blur(36px) saturate(190%)');
    expect(styles).toContain('--hero-card-source-light: rgba(247, 211, 119, .28);');
  });

  it('keeps each program color reserved for hover or focus glow', () => {
    expect(styles).toMatch(/\.hero-arena-card:hover \.hero-arena-card__light-leak,[\s\S]*?var\(--leak-primary/);
    expect(styles).toMatch(/\.hero-arena-card:hover \.hero-arena-card__ray,[\s\S]*?var\(--leak-primary/);
    expect(styles).toMatch(/\.hero-arena-card:hover,[\s\S]*?0 0 12px var\(--arena-accent/);
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
});
