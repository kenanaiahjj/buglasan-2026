import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { contestArenas, haraCandidates, pageantContent } from '../data/pageant';
import { ContestSubpageView } from './ContestSubpageView';

describe('ContestSubpageView', () => {
  it('keeps the Hara voting deadline centralized in pageant content', () => {
    expect((pageantContent as { votingDeadline?: string }).votingDeadline).toBe('June 10, 2026 · 11:59 PM PHT');
  });

  it('centers the Hara logo and renders a twelve-contestant gallery', () => {
    const hara = contestArenas.find((a) => a.id === 'hara')!;
    const html = renderToStaticMarkup(
      <ContestSubpageView
        arena={hara}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onSwitchArena={() => undefined}
        onVote={() => undefined}
      />,
    );

    expect(hara.totalEntries).toBe(12);
    expect(html).toContain('class="hara-gallery__logo"');
    expect(html).toContain('/assets/program-logos/hara-sa-negros-oriental-2026-transparent.png');
    expect(html.match(/class="hara-gallery-card"/g)).toHaveLength(12);
  });

  it('renders Hara sa Dumaguete subpage with candidates and criteria', () => {
    const hara = contestArenas.find((a) => a.id === 'hara')!;
    const html = renderToStaticMarkup(
      <ContestSubpageView
        arena={hara}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onSwitchArena={() => undefined}
        onVote={() => undefined}
      />,
    );

    expect(html).toContain('class="hara-gallery"');
    expect(html).toContain('aria-label="Hara sa Dumaguete contestants"');
    expect(html).toContain('Back to home');
    expect(html).toContain('How to vote');
    expect(html).toContain('Sign in');
    expect(html).toContain('Voting is open');
    expect(html).toContain('June 10, 2026 · 11:59 PM PHT');
    expect(html).toContain('aria-label="Search candidates or town"');
    expect(html).toContain('Most votes');
    expect(html).toContain('Candidate number');
    expect(html).toContain('Name');
    expect(html).toContain('12 of 12 candidates');
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
        onSwitchArena={() => undefined}
        onVote={() => undefined}
      />,
    );

    expect(html).toContain('LGU Booth Contest');
    expect(html).toContain('Freedom Park Architectural Expo');
    expect(html).toContain('Dumaguete City');
    expect(html).toContain('Valencia');
  });

  it('renders Festival of Festivals and Gandang NegOrense subpages', () => {
    const festival = contestArenas.find((a) => a.id === 'festival');
    expect(festival).toBeDefined();
    const festivalHtml = renderToStaticMarkup(
      <ContestSubpageView
        arena={festival!}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onSwitchArena={() => undefined}
        onVote={() => undefined}
      />,
    );
    expect(festivalHtml).toContain('Festival of Festivals');
    expect(festivalHtml).toContain('Sandurot Festival');

    const gandang = contestArenas.find((a) => a.id === 'gandang');
    expect(gandang).toBeDefined();
    const gandangHtml = renderToStaticMarkup(
      <ContestSubpageView
        arena={gandang!}
        dispatch={() => undefined}
        onBackToHub={() => undefined}
        onSwitchArena={() => undefined}
        onVote={() => undefined}
      />,
    );
    expect(gandangHtml).toContain('Gandang NegOrense');
    expect(gandangHtml).toContain('/assets/program-logos/gandang-negorense-queen-size.webp');
    expect(gandangHtml).toContain('Maria Angela');
    expect(gandangHtml).not.toContain('Pyro-Musical');
  });
});
