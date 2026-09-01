import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { contestArenas, haraCandidates, lguBooths, pageantContent } from '../data/pageant';
import { ARENA_VOTING, entriesForArena } from '../lib/arenaEntries';
import { ContestSubpageView } from './ContestSubpageView';
import { HaraGallery } from './HaraGallery';

describe('ContestSubpageView', () => {
  it('keeps the voting deadline centralized, with its ISO twin in step', () => {
    /* The gallery prints votingDeadline; the overview board counts down
       against votingDeadlineISO. If the two drift, the wall promises a
       different moment than the copy does — so pin them to each other
       rather than to a literal date that has to be edited in two places. */
    const parsed = Date.parse(pageantContent.votingDeadlineISO);
    expect(Number.isNaN(parsed)).toBe(false);

    const shownDate = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Asia/Manila',
      year: 'numeric',
    }).format(parsed);
    expect(pageantContent.votingDeadline.startsWith(shownDate)).toBe(true);
  });

  it('uses the current participant totals for every programme', () => {
    expect(Object.fromEntries(contestArenas.map((arena) => [arena.id, arena.totalEntries]))).toEqual({
      hara: 22,
      booths: 23,
      festival: 10,
      gandang: 16,
    });
  });

  it('provides a mock entry for every announced participant total', () => {
    for (const arena of contestArenas) {
      const entries = entriesForArena(arena.id);

      expect(entries).toHaveLength(arena.totalEntries);
      expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
      expect(new Set(entries.map((entry) => entry.number)).size).toBe(entries.length);
    }
  });

  it('centers the Hara logo and keeps the supplied gallery records', () => {
    const hara = contestArenas.find((a) => a.id === 'hara')!;
    const html = renderToStaticMarkup(
      <ContestSubpageView
        arena={hara}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onOpenEntry={() => undefined}
        onOpenOverview={() => undefined}
        onSwitchArena={() => undefined}
        tallies={{}}
      />,
    );

    expect(hara.totalEntries).toBe(22);
    expect(html).toContain('class="hara-gallery__logo"');
    expect(html).toContain('/assets/program-logos/hara-sa-negros-oriental-2026-transparent.png');
    expect(html.match(/class="hara-gallery-card"/g)).toHaveLength(22);
    expect(html.match(/crown-floating-dots-button/g)).toHaveLength(22);
    expect(html).not.toContain('--hara-card-rotation');
  });

  it('renders Hara sa Dumaguete subpage with candidates and criteria', () => {
    const hara = contestArenas.find((a) => a.id === 'hara')!;
    const html = renderToStaticMarkup(
      <ContestSubpageView
        arena={hara}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onOpenEntry={() => undefined}
        onOpenOverview={() => undefined}
        onSwitchArena={() => undefined}
        tallies={{}}
      />,
    );

    expect(html).toContain('class="hara-gallery hara-gallery--portrait"');
    expect(html).toContain('aria-label="Hara sa Negros Oriental entries"');
    expect(html).toContain('>Home</span>');
    expect(html).toContain('How to vote');
    expect(html).toContain('Overview');
    expect(html).toContain('class="hara-gallery__home crown-quiet-control"');
    expect(html).toContain('class="hara-gallery__how-to crown-quiet-control"');
    expect(html).toContain('class="hara-gallery__overview crown-quiet-control"');
    expect(html).toMatch(/<nav\b[^>]*class="hara-gallery__actions"/);
    expect(html.indexOf('class="hara-gallery__actions"')).toBeLessThan(
      html.indexOf('class="hara-gallery__logo"'),
    );
    expect(html.indexOf('class="hara-gallery__logo"')).toBeLessThan(
      html.indexOf('class="hara-gallery__support"'),
    );
    expect(html).toContain('aria-label="Open the Hara sa Negros Oriental voting overview"');
    /* The steps moved into the vote dialog, which is closed until asked for,
       so "How to vote" is a button here rather than a disclosure carrying its
       own copy. */
    expect(html).not.toContain('<details');
    expect(html).not.toContain('class="vote-flow"');
    expect(html).toContain('Voting is open');
    expect(html).not.toContain('class="hara-gallery__status-live"><span');
    expect(html).toContain(pageantContent.votingDeadline);
    expect(html).toContain('aria-label="Search candidates or town"');
    expect(html).not.toContain('Most votes');
    expect(html).not.toContain('Entry number');
    expect(html).not.toContain('>Name</button>');
    expect(html).not.toContain('aria-label="Sort candidates"');
    expect(html).not.toMatch(/class="hara-gallery-card__location"><svg/);
    expect(html).not.toContain('hara-gallery__sort');
    expect(html).not.toContain('hara-gallery__count');
    expect(html).not.toContain('22 of 22 candidates');
    expect(html).not.toContain('aria-live="polite"');
    expect(html).not.toContain('id="hara-gallery-title"');
    expect(html).not.toContain('class="subpage-header');
    expect(html).not.toContain('Festival Hub');
    expect(html).not.toContain('Voting Room');
    expect(html).not.toContain('subpage-hero');
    expect(html).not.toContain('subpage-tabs-bar');
    expect(html).not.toContain('subpage-arena-nav');
    expect(html.match(/class="hara-gallery-card"/g)).toHaveLength(haraCandidates.length);

    for (const candidate of haraCandidates) {
      expect(html).toContain(candidate.name);
      expect(html).toContain(candidate.location);
      expect(html).toContain(candidate.image);
      expect(html).toContain(`View ${candidate.name}`);
    }
  });

  it('keeps status and location labels text-only across every contest subpage', () => {
    for (const arena of contestArenas) {
      const html = renderToStaticMarkup(
        <ContestSubpageView
          arena={arena}
          dispatch={() => undefined}
          onBackToHub={() => undefined}
          onOpenEntry={() => undefined}
          onOpenOverview={() => undefined}
          onSwitchArena={() => undefined}
          tallies={{}}
        />,
      );

      expect(html).not.toContain('class="hara-gallery__status-live"><span');
      expect(html).not.toMatch(/class="hara-gallery-card__location"><svg/);
      expect(html).toMatch(
        /<button[^>]*class="hara-gallery__home crown-quiet-control"[^>]*><span>Home<\/span><\/button>/,
      );

      const cardMarkup = html.match(/<article[^>]*class="hara-gallery-card"[\s\S]*?<\/article>/g) ?? [];
      expect(cardMarkup).toHaveLength(arena.totalEntries);
      /* The card remains a semantic article with exactly one keyboard stop:
         the visible profile link. A second, `aria-hidden` link covers the card
         so pointers can tap anywhere — it is the only `tabindex` allowed here,
         and it must be -1. This replaced a stretched `::after` on the button,
         which collapsed to the button's own box and left most of the card
         dead to a click. */
      expect(cardMarkup.every((card) => !card.includes('role="button"'))).toBe(true);
      expect(cardMarkup.every((card) => !/tabindex="(?!-1")/.test(card))).toBe(true);
      expect(cardMarkup.every((card) => /class="hara-gallery-card__surface"[^>]*href="#/.test(card)
        || /href="#[^"]*"[^>]*class="hara-gallery-card__surface"/.test(card))).toBe(true);
      expect(cardMarkup.every((card) => !/<article[^>]*aria-label=/.test(card))).toBe(true);
      expect(cardMarkup.every((card) => /<article[^>]*aria-labelledby="/.test(card))).toBe(true);
      expect(cardMarkup.every((card) => /<h2 id="[^"]+"/.test(card))).toBe(true);
      expect(cardMarkup.every((card) => card.includes('<a'))).toBe(true);
      expect(cardMarkup.every((card) => !card.includes('<button'))).toBe(true);
    }
  });

  it('opens an individual page from anywhere on the card, with one keyboard stop', async () => {
    const originalMatchMedia = window.matchMedia;
    const onOpenEntry = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      const hara = contestArenas.find((arena) => arena.id === 'hara')!;

      await act(async () => {
        root.render(
          <HaraGallery
            arena={hara}
            onBackToHub={() => undefined}
            onHowToVote={() => undefined}
            onOpenEntry={onOpenEntry}
            onOpenOverview={() => undefined}
            tallies={{}}
          />,
        );
      });

      const card = container.querySelector<HTMLElement>('.hara-gallery-card');
      const entry = entriesForArena('hara')[0];

      expect(card?.getAttribute('role')).toBeNull();
      expect(card?.hasAttribute('tabindex')).toBe(false);

      /* The card surface is the link and the only one. The visible pill is
         decorative — it is not drawn where the vote cursor runs, so it cannot
         be what carries navigation or the accessible name. */
      const surface = card?.querySelector<HTMLAnchorElement>('.hara-gallery-card__surface');
      expect(surface?.tagName).toBe('A');
      expect(surface?.getAttribute('href')).toBe(`#hara/${entry.id}`);
      expect(surface?.getAttribute('aria-hidden')).toBeNull();
      expect(surface?.textContent).toContain(`View ${entry.name}`);

      const pill = card?.querySelector('.subpage-entry-link');
      expect(pill?.tagName).toBe('SPAN');
      expect(pill?.getAttribute('aria-hidden')).toBe('true');

      // One stop, and it is the surface.
      const focusable = [...(card?.querySelectorAll('a,button') ?? [])].filter(
        (el) => (el as HTMLElement).tabIndex >= 0,
      );
      expect(focusable).toEqual([surface]);

      // The card asks for the hero's vote cursor over it.
      expect(card?.hasAttribute('data-vote-cursor')).toBe(true);

      await act(async () => {
        surface?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      expect(onOpenEntry).toHaveBeenCalledOnce();
      expect(onOpenEntry).toHaveBeenCalledWith(entry.id);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      });
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    }
  });

  it('renders LGU Booths subpage with pavilions', () => {
    const booths = contestArenas.find((a) => a.id === 'booths')!;
    const html = renderToStaticMarkup(
      <ContestSubpageView
        arena={booths}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onOpenEntry={() => undefined}
        onOpenOverview={() => undefined}
        onSwitchArena={() => undefined}
        tallies={{}}
      />,
    );

    expect(html).toContain('LGU Booth Contest');
    expect(html).toContain('Freedom Park Architectural Expo');
    expect(html).toContain('Dumaguete City');
    expect(html).toContain('Valencia');
    // No supplied logo for this programme, so the intro falls back to type.
    expect(html).toContain('class="hara-gallery__lockup"');
    expect(html).not.toContain('class="hara-gallery__logo"');
    expect(html.match(/class="hara-gallery-card"/g)).toHaveLength(lguBooths.length);
    // Nouns follow the programme, not Hara.
    expect(html).toContain('aria-label="Search booths or town"');
    expect(html).not.toContain('hara-gallery__sort');
    expect(html).not.toContain('hara-gallery__count');
    expect(html).not.toContain(`${lguBooths.length} of 23 booths`);
  });

  it('uses remote past-event imagery with local fallbacks for booth and festival placeholders', () => {
    expect(entriesForArena('booths').every((entry) => entry.image?.startsWith('https://'))).toBe(true);
    expect(entriesForArena('festival').every((entry) => entry.image?.startsWith('https://'))).toBe(true);

    const booths = contestArenas.find((a) => a.id === 'booths')!;
    const boothsHtml = renderToStaticMarkup(
      <ContestSubpageView
        arena={booths}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onOpenEntry={() => undefined}
        onOpenOverview={() => undefined}
        onSwitchArena={() => undefined}
        tallies={{}}
      />,
    );
    expect(boothsHtml).toContain('alt="Past Buglasan booth photo"');
    expect(boothsHtml).toContain('data-fallback-src="/assets/entries/booth-01.svg"');

    const festival = contestArenas.find((a) => a.id === 'festival')!;
    const festivalHtml = renderToStaticMarkup(
      <ContestSubpageView
        arena={festival}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onOpenEntry={() => undefined}
        onOpenOverview={() => undefined}
        onSwitchArena={() => undefined}
        tallies={{}}
      />,
    );
    expect(festivalHtml).toContain('alt="Past Buglasan festival contingent photo"');
    expect(festivalHtml).toContain('data-fallback-src="/assets/entries/festival-01.svg"');
  });

  it('gives all four programmes the same gallery chrome', () => {
    for (const arena of contestArenas) {
      const html = renderToStaticMarkup(
        <ContestSubpageView
          arena={arena}
          dispatch={() => undefined}
          onBackToHub={() => undefined}
          onOpenEntry={() => undefined}
          onOpenOverview={() => undefined}
          onSwitchArena={() => undefined}
          tallies={{}}
        />,
      );

      const entries = entriesForArena(arena.id);
      const markClass = arena.logo ? 'hara-gallery__logo' : 'hara-gallery__lockup';
      expect(html.indexOf('class="hara-gallery__actions"')).toBeLessThan(
        html.indexOf(`class="${markClass}"`),
      );
      expect(html.indexOf(`class="${markClass}"`)).toBeLessThan(
        html.indexOf('class="hara-gallery__support"'),
      );
      expect(html).toContain(`id="subpage-${arena.id}"`);
      /* Booths are buildings and contingents are lines of dancers, so those
         two get a wide card; the pageants keep the portrait. */
      const shape = arena.id === 'booths' || arena.id === 'festival' ? 'landscape' : 'portrait';
      expect(html).toContain(`class="hara-gallery hara-gallery--${shape}"`);
      expect(ARENA_VOTING[arena.id].cardShape).toBe(shape);
      expect(html).toContain('>Home</span>');
      expect(html).toContain('How to vote');
      expect(html).toContain('Voting is open');
      expect(html).toContain('Overview');
      expect(html).not.toContain('Most votes');
      expect(html).not.toContain('Entry number');
      expect(html).not.toContain('>Name</button>');
      expect(html).not.toContain('hara-gallery__sort');
      expect(html).not.toContain('hara-gallery__count');
      expect(html.match(/class="hara-gallery-card"/g)).toHaveLength(entries.length);
      // The old tabbed layout is gone from every programme, not just Hara.
      expect(html).not.toContain('subpage-hero');
      expect(html).not.toContain('subpage-tabs-bar');
      expect(html).not.toContain('subpage-arena-nav');
    }
  });

  it('renders Festival of Festivals and Gandang NegOrense subpages', () => {
    const festival = contestArenas.find((a) => a.id === 'festival');
    expect(festival).toBeDefined();
    const festivalHtml = renderToStaticMarkup(
      <ContestSubpageView
        arena={festival!}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onOpenEntry={() => undefined}
        onOpenOverview={() => undefined}
        onSwitchArena={() => undefined}
        tallies={{}}
      />,
    );
    expect(festivalHtml).toContain('<h1>Festival of Festivals</h1>');
    expect(festivalHtml).toContain('<p>Province-Wide Cultural Showdown</p>');
    expect(festivalHtml).toContain('/assets/program-logos/festival-of-festivals-2026.webp');
    expect(festivalHtml).toContain('Sandurot Festival');

    const gandang = contestArenas.find((a) => a.id === 'gandang');
    expect(gandang).toBeDefined();
    const gandangHtml = renderToStaticMarkup(
      <ContestSubpageView
        arena={gandang!}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onOpenEntry={() => undefined}
        onOpenOverview={() => undefined}
        onSwitchArena={() => undefined}
        tallies={{}}
      />,
    );
    expect(gandangHtml).toContain('Gandang NegOrense');
    expect(gandangHtml).toContain('/assets/program-logos/gandang-negorense-queen-size.webp');
    expect(gandangHtml).toContain('Maria Angela');
    expect(gandangHtml).not.toContain('Pyro-Musical');
  });

  it('assigns each subpage its dedicated color theme with matching --arena style', () => {
    const expectedColors: Record<string, string> = {
      gandang: '#38bdf8', // Blue
      booths: '#c084fc',  // Purple
      festival: '#f97316', // Orange
      hara: '#f7d377',    // Gold (as is)
    };

    for (const arena of contestArenas) {
      const html = renderToStaticMarkup(
        <ContestSubpageView
          arena={arena}
          dispatch={() => undefined}
          onBackToHub={() => undefined}
          onOpenEntry={() => undefined}
          onOpenOverview={() => undefined}
          onSwitchArena={() => undefined}
          tallies={{}}
        />,
      );

      expect(arena.accentColor).toBe(expectedColors[arena.id]);
      expect(html).toContain(`class="contest-subpage contest-subpage--${arena.id}"`);
      expect(html).toContain(`--arena:${expectedColors[arena.id]}`);
    }
  });
});
