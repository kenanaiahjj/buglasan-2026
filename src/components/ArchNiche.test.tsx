import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { contestArenas } from '../data/pageant';
import { ArchNiche } from './ArchNiche';

describe('ArchNiche', () => {
  it('uses a smooth rounded arch without a pointed apex', () => {
    const html = renderToStaticMarkup(<ArchNiche arena={contestArenas[0]} blockClass="hero-arena-card" />);
    const silhouettePaths = [...html.matchAll(/class="hero-arena-card__arch-(?:fill|weave)" d="([^"]+)"/g)].map(
      ([, path]) => path,
    );

    expect(silhouettePaths).toHaveLength(2);
    expect(silhouettePaths[0]).toContain('C6 37 22 19 50 19C78 19 94 37 94 61');
    expect(silhouettePaths[0]).not.toContain('47 14');
    expect(silhouettePaths[1]).toBe(silhouettePaths[0]);
  });
});
