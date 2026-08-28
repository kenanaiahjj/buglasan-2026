import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { contestArenas, haraCandidates, lguBooths, pageantContent } from '../data/pageant';
import { ARENA_VOTING, entriesForArena } from '../lib/arenaEntries';
import { ContestSubpageView } from './ContestSubpageView';

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
        onOpenOverview={() => undefined}
        onSwitchArena={() => undefined}
        tallies={{}}
      />,
    );

    expect(html).toContain('class="hara-gallery hara-gallery--portrait"');
    expect(html).toContain('aria-label="Hara sa Negros Oriental entries"');
    expect(html).toContain('Back to home');
    expect(html).toContain('How to vote');
    expect(html).toContain('Overview');
    expect(html).toContain('class="hara-gallery__home crown-quiet-control"');
    expect(html).toContain('class="hara-gallery__how-to crown-quiet-control"');
    expect(html).toContain('class="hara-gallery__overview crown-quiet-control"');
    expect(html).toContain('aria-label="Open the Hara sa Negros Oriental voting overview"');
    /* The steps moved into the vote dialog, which is closed until asked for,
       so "How to vote" is a button here rather than a disclosure carrying its
       own copy. */
    expect(html).not.toContain('<details');
    expect(html).not.toContain('class="vote-flow"');
    expect(html).toContain('Voting is open');
    expect(html).toContain(pageantContent.votingDeadline);
    expect(html).toContain('aria-label="Search candidates or town"');
    expect(html).not.toContain('Most votes');
    expect(html).toContain('Entry number');
    expect(html).toContain('Name');
    expect(html).toContain('22 of 22 candidates');
    expect(html).toContain('aria-live="polite"');
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
      expect(html).toContain(`Vote for ${candidate.name}`);
    }
  });

  it('renders LGU Booths subpage with pavilions', () => {
    const booths = contestArenas.find((a) => a.id === 'booths')!;
    const html = renderToStaticMarkup(
      <ContestSubpageView
        arena={booths}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
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
    expect(html).toContain(`${lguBooths.length} of 23 booths`);
    expect(html).toContain('aria-label="Search booths or town"');
  });

  it('gives all four programmes the same gallery chrome', () => {
    for (const arena of contestArenas) {
      const html = renderToStaticMarkup(
        <ContestSubpageView
          arena={arena}
          dispatch={() => undefined}
          onBackToHub={() => undefined}
          onOpenOverview={() => undefined}
          onSwitchArena={() => undefined}
          tallies={{}}
        />,
      );

      const entries = entriesForArena(arena.id);
      expect(html).toContain(`id="subpage-${arena.id}"`);
      /* Booths are buildings and contingents are lines of dancers, so those
         two get a wide card; the pageants keep the portrait. */
      const shape = arena.id === 'booths' || arena.id === 'festival' ? 'landscape' : 'portrait';
      expect(html).toContain(`class="hara-gallery hara-gallery--${shape}"`);
      expect(ARENA_VOTING[arena.id].cardShape).toBe(shape);
      expect(html).toContain('Back to home');
      expect(html).toContain('How to vote');
      expect(html).toContain('Voting is open');
      expect(html).toContain('Overview');
      expect(html).not.toContain('Most votes');
      expect(html).toContain('Entry number');
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
        onOpenOverview={() => undefined}
        onSwitchArena={() => undefined}
        tallies={{}}
      />,
    );
    expect(festivalHtml).toContain('Festival of Festivals');
    expect(festivalHtml).toContain('/assets/program-logos/festival-of-festivals-transparent.png');
    expect(festivalHtml).toContain('Sandurot Festival');

    const gandang = contestArenas.find((a) => a.id === 'gandang');
    expect(gandang).toBeDefined();
    const gandangHtml = renderToStaticMarkup(
      <ContestSubpageView
        arena={gandang!}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
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
