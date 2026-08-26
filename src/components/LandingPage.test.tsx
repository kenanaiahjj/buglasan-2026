import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { initialVoterState } from '../state/voterState';
import * as festivalWorld from '../scene/festivalWorld';
import { getRenderPixelRatios } from '../scene/renderQuality';
import * as festivalScene from './FestivalScene';
import { LandingPage } from './LandingPage';

describe('LandingPage Crown of Light contract', () => {
  it('renders the official logo, scene, primary action, and five narrative chapters', () => {
    const html = renderToStaticMarkup(<LandingPage state={initialVoterState} dispatch={() => undefined} />);

    expect(html).toContain('src="/assets/buglasan-hero-2026-official.png"');
    expect(html).toContain('srcSet="/assets/buglasan-hero-2026-official.png"');
    expect(html).not.toContain('buglasan-hero-2024-fallback');
    expect(html).toContain('alt="Buglasan Festival 2026"');
    expect(html).toContain('data-centerpiece="official-logo"');
    expect(html).toContain('aria-label="Crown of Light festival scene"');
    expect(html).toContain('Enter the voting room');
    expect(html).toContain('class="crown-button crown-floating-dots-button"');
    expect(html).toContain('class="crown-header__cta-button crown-floating-dots-button"');
    expect(html).not.toContain('crown-portal-button');
    expect(html).toContain('/assets/program-logos/hara-sa-negros-oriental-2026-transparent.png');
    expect(html).toContain('/assets/program-logos/gandang-negorense-queen-size.webp');
    for (const id of ['festival', 'contests', 'vote']) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('renders the four current Buglasan program screens on the landing page', () => {
    const html = renderToStaticMarkup(<LandingPage state={initialVoterState} dispatch={() => undefined} />);

    for (const name of ['Hara sa Dumaguete', 'LGU Booth Contest', 'Festival of Festivals', 'Gandang NegOrense']) {
      expect(html).toContain(name);
    }
    for (const id of ['hara', 'booths', 'festival', 'gandang']) {
      expect(html).toContain(`id="contest-card-${id}"`);
    }
    expect(html).not.toContain('Arena 01');
    expect(html).not.toContain('Flagship Pageant');
    expect(html).not.toContain('Open Arena');
    expect(html).not.toContain('Street Dance Showdown');
    expect(html).not.toContain('Pyro-Musical');
  });

  it('gives each program card a contained hover outline layer', () => {
    const html = renderToStaticMarkup(<LandingPage state={initialVoterState} dispatch={() => undefined} />);

    expect((html.match(/hero-arena-card__outline/g) ?? []).length).toBe(4);
  });

  it('keeps the hero plaque cards focused on logo and title', () => {
    const html = renderToStaticMarkup(<LandingPage state={initialVoterState} dispatch={() => undefined} />);

    expect(html).not.toContain('hero-arena-card__tagline');
    expect(html).not.toContain('hero-arena-card__action');
  });

  it('uses the supplied Hara sa Negros Oriental name on the hero plaque', () => {
    const html = renderToStaticMarkup(<LandingPage state={initialVoterState} dispatch={() => undefined} />);

    expect(html).toContain('aria-label="Open Hara sa Negros Oriental program"');
    expect(html).toContain('<strong class="hero-arena-card__name">Hara sa Negros Oriental</strong>');
  });

  it('orders the hero program cards as Hara, Gandang, Booths, then Festival', () => {
    const html = renderToStaticMarkup(<LandingPage state={initialVoterState} dispatch={() => undefined} />);
    const order = ['hara', 'gandang', 'booths', 'festival'].map((id) => html.indexOf(`hero-arena-card--${id}`));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('keeps the supplied low-poly logo model as the hero source', () => {
    expect(festivalWorld.BUGLASAN_HERO_MODEL_SRC).toBe('/assets/buglasan-hero-2026.glb');
  });

  it('keeps the 3D logo on its authored material pipeline', () => {
    expect(festivalWorld.BUGLASAN_HERO_MATERIAL_MODE).toBe('source');
  });

  it('gives the hero an upper-left source light for illumination', () => {
    const lighting = festivalWorld.BUGLASAN_HERO_LIGHTING;

    expect(lighting.sourcePosition[0]).toBeLessThan(0);
    expect(lighting.sourcePosition[1]).toBeGreaterThan(0);
    expect(lighting.sourceIntensity).toBeGreaterThan(20);
    expect(lighting.keyIntensity).toBeGreaterThan(3.5);
  });

  it('uses a curated sparkle layout around the hero logo', () => {
    const layout = (festivalWorld as typeof festivalWorld & {
      BUGLASAN_SPARKLE_LAYOUT?: readonly { position: readonly [number, number, number] }[];
    }).BUGLASAN_SPARKLE_LAYOUT;

    expect(layout).toBeDefined();
    if (!layout) return;

    expect(layout.length).toBeGreaterThanOrEqual(12);
    expect(new Set(layout.map((item) => item.position.join(','))).size).toBe(layout.length);
    expect(layout.some((item) => item.position[0] < -3)).toBe(true);
    expect(layout.some((item) => item.position[0] > 3)).toBe(true);
    expect(layout.some((item) => item.position[1] > 2)).toBe(true);
    expect(layout.some((item) => item.position[1] < -1.5)).toBe(true);
  });

  it('keeps the floating orb layer alongside anchored sparkles', () => {
    const source = festivalWorld.buildFestivalWorld.toString();

    expect(source).toContain('floatingOrbVertexShader');
    expect(source).toContain('orbParticles');
    expect(source).toContain('orbParticles.rotation.y');
  });

  it('keeps multisampling enabled for the crisp 3D hero overlay', () => {
    expect(festivalScene.FESTIVAL_RENDERER_OPTIONS.antialias).toBe(true);
  });

  it('allocates extra pixels to the logo overlay on a DPR-1 desktop', () => {
    expect(getRenderPixelRatios(1, 'high')).toEqual({ overlay: 1.25, scene: 1 });
  });
});
