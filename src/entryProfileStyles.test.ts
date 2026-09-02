// @ts-expect-error The browser app excludes Node types; Vitest runs this test in Node.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const testProcess = (globalThis as typeof globalThis & { process: { cwd(): string } }).process;
const css = readFileSync(`${testProcess.cwd()}/src/styles.css`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const rule = (selector: string) => {
  const rules = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  const declarations: string[] = [];

  for (const match of rules) {
    const selectors = match[1].split(',').map((candidate: string) => candidate.trim());
    if (selectors.includes(selector)) declarations.push(match[2]);
  }

  return declarations.join('\n');
};

describe('entry profile styles', () => {
  it('uses a responsive two-column profile shell without horizontal overflow', () => {
    expect(rule('.entry-profile__card')).toMatch(/display:\s*grid/);
    expect(rule('.entry-profile__card')).toMatch(/grid-template-columns:/);
    expect(rule('.entry-profile')).toMatch(/overflow-x:\s*clip/);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*720px\)[\s\S]*\.entry-profile__card\s*\{[^}]*grid-template-columns:\s*1fr/,
    );
  });

  it('centers Home while keeping the programme return control at the start', () => {
    expect(rule('.entry-profile__nav')).toMatch(/display:\s*grid/);
    expect(rule('.entry-profile__nav')).toMatch(/grid-template-columns:\s*1fr\s+auto\s+1fr/);
  });

  it('keeps primary actions touch-sized and stretches the roster link over its card', () => {
    expect(rule('.entry-profile__vote')).toMatch(/min-height:\s*44px/);
    expect(rule('.entry-profile__share')).toMatch(/min-height:\s*44px/);

    /* The card-wide hit area is its own element, not the button's `::after`.
       As a pseudo it collapsed to the button: `.crown-floating-dots-button`
       sets `position: relative`, `overflow: hidden`, `isolation: isolate` and
       a `filter`, so the pseudo took the button as its containing block or was
       clipped to it, and every point on the photo, the name and the vote count
       hit-tested to the image or a div. Overriding three of the four did not
       recover it. */
    expect(rule('.hara-gallery-card__surface')).toMatch(/position:\s*absolute/);
    expect(rule('.hara-gallery-card__surface')).toMatch(/inset:\s*0/);

    /* The surface is the control, so it sits on top — above the pill, which is
       decorative and is not drawn at all where a pointer can show the vote
       cursor instead. */
    const link = rule('.hara-gallery-card .subpage-entry-link');
    const linkZ = Number(/z-index:\s*(\d+)/.exec(link)?.[1]);
    const surfaceZ = Number(/z-index:\s*(\d+)/.exec(rule('.hara-gallery-card__surface'))?.[1]);
    expect(surfaceZ).toBeGreaterThan(linkZ);
    expect(rule('.hara-gallery-card__surface:focus-visible')).toMatch(/outline:/);

    /* Hidden on a fine pointer, and only there: the same condition
       `VoteCursor` gates itself on, so the pill goes exactly where the cursor
       replaces it. */
    expect(css).toMatch(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)[\s\S]*?\.hara-gallery-card \.subpage-entry-link\s*\{[^}]*display:\s*none/,
    );
  });

  it('suppresses nonessential profile motion when reduced motion is requested', () => {
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.entry-profile__card\s*\{[^}]*animation:\s*none/,
    );
  });
});
