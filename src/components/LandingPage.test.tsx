import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialVoterState } from '../state/voterState';
import * as festivalWorld from '../scene/festivalWorld';
import { getRenderPixelRatios } from '../scene/renderQuality';
import * as festivalScene from './FestivalScene';
import { LandingPage } from './LandingPage';

describe('LandingPage Crown of Light contract', () => {
  let previousHash = '';
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    previousHash = window.location.hash;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)' ? false : query === '(pointer: fine)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    window.location.hash = previousHash;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it('renders the official logo, scene, and voting guidance', () => {
    const html = renderToStaticMarkup(<LandingPage state={initialVoterState} dispatch={() => undefined} />);

    expect(html).toContain('src="/assets/buglasan-hero-2026-official.png"');
    /* The 3198px original is the <img> fallback; the <source> carries WebP
       variants, because a phone decoding the original spends ~21 MB on a mark
       drawn at 54vw. */
    expect(html).toContain('type="image/webp"');
    expect(html).toContain('/assets/buglasan-hero-2026-official-640.webp 640w');
    expect(html).toContain('src="/assets/buglasan-hero-2026-official.png"');
    expect(html).not.toContain('buglasan-hero-2024-fallback');
    expect(html).toContain('alt="Buglasan Festival 2026"');
    expect(html).toContain('data-centerpiece="official-logo"');
    expect(html).toContain('aria-label="Crown of Light festival scene"');
    expect(html).toContain('Celebrate Buglasan 2026 and the people, places, and traditions of Negros Oriental.');
    /* Not "below": below is four plaques on a desktop and one button on a
       phone. Both affordances render; CSS picks. */
    expect(html).toContain('To vote, choose a contest.');
    expect(html).toContain('class="hero-intro__instruction"');
    expect(html).toContain('class="hero-actions"');
    expect((html.match(/class="hero-arena-card hero-arena-card--/g) ?? []).length).toBe(4);
    expect(html).not.toContain('class="crown-header__cta-button crown-floating-dots-button"');
    const header = html.match(/<header class="crown-header"[\s\S]*?<\/header>/)?.[0] ?? '';
    expect(header).not.toContain('Vote now');
    expect(header).toContain('class="crown-header__marks hero-official-marks hero-official-marks--header"');
    expect(html).toContain('class="crown-nav__link crown-quiet-control"');
    expect(html).toContain('<span>Home</span>');
    expect(html).not.toContain('<span>Festival</span>');
    expect(html).not.toContain('crown-portal-button');
    expect(html).not.toContain('Twenty-five town festivals converge on Dumaguete');
    expect(html).toContain('hero-official-marks--header');
    expect(html).toContain('/assets/official-marks/negros-oriental-tourism-logo.png');
    expect(html).toContain('/assets/official-marks/province-of-negros-oriental-seal-transparent.png');
    const hero = html.match(/<section class="crown-hero[\s\S]*?<\/section>/)?.[0] ?? '';
    expect(hero).not.toContain('hero-official-marks');
    /* The hero carries both affordances and lets CSS choose: the plaques
       above 1024px, this CTA below it. Rendering only one of them would mean
       a JS breakpoint, and a breakpoint that can be wrong. */
    expect(hero).toContain('class="hero-actions"');
    expect(hero).toContain('Choose a contest');
    expect(html).toContain('/assets/program-logos/hara-sa-negros-oriental-2026-transparent.png');
    expect(html).toContain('/assets/program-logos/gandang-negorense-queen-size.webp');
    expect(html).toContain('/assets/program-logos/festival-of-festivals-transparent.png');
    /* `home`, not `festival`: the hero's anchor used to collide with the
       Festival of Festivals arena id, so Home opened a programme page. */
    expect(html).toContain('id="home"');
    expect(html).not.toContain('id="contests"');
    expect(html).not.toContain('href="#contests"');
    expect(html).not.toContain('Four Grand Programs.');
    expect(html).not.toContain('programme-index');
    expect(html).not.toContain('id="vote"');
    expect(html).not.toContain('One clear choice. Made in four steps.');
    expect(html).not.toContain('See the four programs');
  });

  it('renders the four current Buglasan program screens on the landing page', () => {
    const html = renderToStaticMarkup(<LandingPage state={initialVoterState} dispatch={() => undefined} />);

    for (const name of ['Hara sa Negros Oriental', 'LGU Booth Contest', 'Festival of Festivals', 'Gandang NegOrense']) {
      expect(html).toContain(name);
    }
    for (const id of ['hara', 'booths', 'festival', 'gandang']) {
      expect(html).toContain(`hero-arena-card--${id}`);
    }
    expect(html).not.toContain('Arena 01');
    expect(html).not.toContain('Flagship Pageant');
    expect(html).not.toContain('Open Arena');
    expect(html).not.toContain('Street Dance Showdown');
    expect(html).not.toContain('Pyro-Musical');

    /* The hero plaques are now the single programme browse surface. */
    expect((html.match(/class="hero-arena-card /g) ?? []).length).toBe(4);
    expect(html).not.toContain('programme-row');
    for (const gone of [
      'contest-screen-card',
      'PROGRAM 01',
      'Voting Open',
      'contests-footer-callout',
      'View program',
    ]) {
      expect(html).not.toContain(gone);
    }
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

  it('opens the shared how-to-vote guide from the landing navigation', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const originalIntersectionObserver = globalThis.IntersectionObserver;

    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });

    try {
      window.location.hash = '#contests';

      await act(async () => {
        root.render(<LandingPage state={initialVoterState} dispatch={() => undefined} />);
      });

      const howToVote = Array.from(container.querySelectorAll('button.crown-nav__link')).find((button) =>
        button.textContent?.includes('How to vote'),
      );

      expect(howToVote).toBeDefined();
      expect(container.querySelector('#vote')).toBeNull();

      await act(async () => {
        howToVote?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(document.body.querySelector('.vote-flow')).not.toBeNull();
      expect(document.body.querySelector('.vote-flow__title')?.textContent).toBe('How to vote');
    } finally {
      await act(async () => {
        root.unmount();
      });
      Object.defineProperty(globalThis, 'IntersectionObserver', {
        configurable: true,
        value: originalIntersectionObserver,
      });
      container.remove();
    }
  });

  it('keeps the contest picker available from the mobile navigation', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const originalIntersectionObserver = globalThis.IntersectionObserver;

    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });

    try {
      window.location.hash = '#contests';

      await act(async () => {
        root.render(<LandingPage state={initialVoterState} dispatch={() => undefined} />);
      });

      const menuButton = container.querySelector<HTMLButtonElement>('.crown-menu-button');

      expect(menuButton).not.toBeNull();

      await act(async () => {
        menuButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      const cta = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Choose a contest'),
      );

      expect(cta).toBeDefined();

      await act(async () => {
        cta?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      const picker = document.body.querySelector('.contest-picker__panel');
      expect(picker).not.toBeNull();
      expect(picker?.getAttribute('role')).toBe('dialog');
      expect(picker?.textContent).toContain('Choose a contest');
      expect(picker?.textContent).toContain('Hara sa Negros Oriental');
      expect(picker?.textContent).toContain('LGU Booth Contest');
      expect(picker?.textContent).toContain('Festival of Festivals');
      expect(picker?.textContent).toContain('Gandang NegOrense');
      expect(picker?.textContent).toContain('22 candidates');
      expect(picker?.textContent).toContain('23 booths');
      expect(picker?.textContent).toContain('10 contingents');
      expect(picker?.textContent).toContain('16 candidates');
      /* The picker is the plaques now, not a bottom sheet of list rows — same
         `hero-arena-card` markup the desktop hero uses, on a scroll-snapping
         rail. Reusing the class is the point: the arch cannot drift. */
      expect(picker?.querySelectorAll('.contest-picker__card')).toHaveLength(4);
      expect(picker?.querySelectorAll('.hero-arena-card__niche')).toHaveLength(4);
      expect(picker?.querySelectorAll('.contest-picker__card-count')).toHaveLength(4);
      expect(picker?.querySelector('img[src="/assets/program-logos/hara-sa-negros-oriental-2026-transparent.png"]')).not.toBeNull();
      expect(picker?.querySelector('img[src="/assets/program-logos/festival-of-festivals-transparent.png"]')).not.toBeNull();
      expect(picker?.querySelector('img[src="/assets/program-logos/gandang-negorense-queen-size.webp"]')).not.toBeNull();
      // Programmes with no supplied logo fall back to the arch emblem.
      expect(picker?.querySelector('.hero-arena-card__emblem svg')).not.toBeNull();
    } finally {
      await act(async () => {
        root.unmount();
      });
      Object.defineProperty(globalThis, 'IntersectionObserver', {
        configurable: true,
        value: originalIntersectionObserver,
      });
      container.remove();
    }
  });

  it('adds the scrolled header state once the landing page moves past the hero', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const originalIntersectionObserver = globalThis.IntersectionObserver;

    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });

    await act(async () => {
      root.render(<LandingPage state={initialVoterState} dispatch={() => undefined} />);
    });

    expect(container.querySelector('.crown-header')?.classList.contains('is-scrolled')).toBe(false);

    await act(async () => {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 96 });
      window.dispatchEvent(new Event('scroll'));
    });

    expect(container.querySelector('.crown-header')?.classList.contains('is-scrolled')).toBe(true);

    await act(async () => {
      root.unmount();
    });
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: originalIntersectionObserver,
    });
    container.remove();
  });

  it('renders the Hara voting overview for the #hara/overview hash route', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    window.location.hash = '#hara/overview';

    await act(async () => {
      root.render(<LandingPage state={initialVoterState} dispatch={() => undefined} />);
    });

    expect(container.innerHTML).toContain('Hara sa Negros Oriental 2026');
    expect(container.innerHTML).not.toContain('Live simulation');
    expect(container.innerHTML).not.toContain('Buglasan Festival 2026');
    expect(container.innerHTML).not.toContain('class="hara-gallery"');

    await act(async () => {
      root.unmount();
    });
    container.remove();
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

  it('freezes pointer input for the background scene on quiet subpages', () => {
    expect(festivalScene.getScenePointer({ x: 0.8, y: -0.4 }, true)).toEqual({ x: 0, y: 0 });
    expect(festivalScene.getScenePointer({ x: 0.8, y: -0.4 }, false)).toEqual({ x: 0.8, y: -0.4 });
  });

  it('keeps multisampling enabled for the crisp 3D hero overlay', () => {
    expect(festivalScene.FESTIVAL_RENDERER_OPTIONS.antialias).toBe(true);
  });

  it('allocates extra pixels to the logo overlay on a DPR-1 desktop', () => {
    expect(getRenderPixelRatios(1, 'high')).toEqual({ overlay: 1.25, scene: 1 });
  });
});
