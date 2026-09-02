import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contestArenas, haraCandidates, pageantContent } from '../data/pageant';
import { ARENA_VOTING, arenaDisplayName, entriesForArena } from '../lib/arenaEntries';
import { VotingOverviewPage } from './VotingOverviewPage';

function getHaraArena() {
  return contestArenas.find((arena) => arena.id === 'hara')!;
}

function getTallies() {
  return Object.fromEntries(haraCandidates.map((candidate) => [candidate.id, candidate.votes]));
}

const originalMatchMedia = window.matchMedia;

function setReducedMotion(enabled: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? enabled : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('VotingOverviewPage', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('renders a clean titled Hara standings board', () => {
    const hara = getHaraArena();
    const html = renderToStaticMarkup(
      <VotingOverviewPage
        arena={hara}
        onBackToProgram={() => undefined}
        onBackToHub={() => undefined}
        tallies={getTallies()}
      />,
    );

    expect(html).toContain('Hara sa Negros Oriental 2026');
    expect(html).not.toContain(ARENA_VOTING.hara.prompt);
    expect(html).not.toContain('Live simulation');
    expect(html).not.toContain('Buglasan Festival 2026');
    expect(html).toContain('Leading');
    expect(html).toContain('Total votes cast');
    expect(html).toContain('Votes per minute');
    expect(html).toContain('Lead margin');
    expect(html).toContain('Towns represented');
    expect(html).not.toContain('Biggest climb');
    expect(html).not.toContain('Tightest race');
    expect(html).toContain(pageantContent.votingDeadline);
    expect(html.match(/class="vote-overview__rank-row"/g)).toHaveLength(haraCandidates.length);
    expect(html).not.toContain('vote-overview__ticker');
    expect(html).not.toContain('aria-live="polite"');
    expect(html).toContain('Back to Hara sa Negros Oriental');
    expect(html).toContain('>Home</button>');
    expect(html).not.toContain('Festival Hub');
    expect(html).toContain('class="vote-overview__utility-button"');
    expect(html).toContain('class="vote-overview__hero vote-overview__animate"');
    expect(html).not.toContain('class="vote-overview__utility-button" style=');
    expect(html).not.toContain('class="vote-overview__hero vote-overview__animate" style=');
  });

  it('shows the top three entries in the podium and keeps fourth place in the full ranking', () => {
    const html = renderToStaticMarkup(
      <VotingOverviewPage
        arena={getHaraArena()}
        onBackToProgram={() => undefined}
        onBackToHub={() => undefined}
        tallies={getTallies()}
      />,
    );
    const document = new DOMParser().parseFromString(html, 'text/html');
    const podium = document.querySelector('.vote-overview__podium');

    expect(podium).not.toBeNull();
    expect(podium!.querySelectorAll('.vote-overview__podium-entry')).toHaveLength(3);
    expect(podium!.textContent).toContain('Leading');
    expect(podium!.textContent).toContain('Rank 2');
    expect(podium!.textContent).toContain('Rank 3');
    expect(podium!.textContent).toContain('Jessa Mae');
    expect(podium!.textContent).toContain('Maria Angela');
    expect(podium!.textContent).toContain('Charmine');
    expect(podium!.textContent).not.toContain('Shaira');
    expect(html).toContain('Shaira');

    expect(podium!.querySelector('.vote-overview__leader .vote-overview__podium-rank-badge--gold')?.textContent).toBe(
      'Leading',
    );
    expect(
      podium!.querySelector('.vote-overview__podium-card[data-rank="2"] .vote-overview__podium-rank-badge--silver')
        ?.textContent,
    ).toBe('Rank 2');
    expect(
      podium!.querySelector('.vote-overview__podium-card[data-rank="3"] .vote-overview__podium-rank-badge--bronze')
        ?.textContent,
    ).toBe('Rank 3');
    expect(podium!.querySelector('.vote-overview__leader .vote-overview__podium-candidate-badge')?.textContent).toBe(
      '#02',
    );
    expect(podium!.querySelector('.vote-overview__podium-card[data-rank="2"] .vote-overview__podium-candidate-badge')?.textContent).toBe(
      '#01',
    );
    expect(podium!.querySelector('.vote-overview__podium-card[data-rank="3"] .vote-overview__podium-candidate-badge')?.textContent).toBe(
      '#03',
    );

    const barFills = [...document.querySelectorAll('.vote-overview__rank-bar-fill')];
    expect(barFills).toHaveLength(haraCandidates.length);
    /* Width, and only width. The bar carried a `--bar-edge-delay` here to
       stagger a per-row glow pulse; the outline is static now, so a delay in
       the markup would be a value nothing reads. */
    expect(barFills[0].getAttribute('style')).toContain('width:');
    expect(barFills[0].getAttribute('style')).not.toContain('--bar-edge-delay');
  });

  /* The whole point of the rebuild: the board is composed at wall proportions
     and never scrolls, so anything that would push content out of the frame
     is a defect rather than a scrollbar. */
  it('composes every programme inside one fixed 16:9 frame', () => {
    for (const arena of contestArenas) {
      const html = renderToStaticMarkup(
        <VotingOverviewPage
          arena={arena}
          onBackToProgram={() => undefined}
          onBackToHub={() => undefined}
          tallies={{}}
        />,
      );

      const entries = entriesForArena(arena.id);
      expect(html).toContain('class="vote-overview__frame"');
      expect(html).toContain('class="vote-overview__board"');
      // The row count is handed to CSS so the rows divide the panel evenly.
      expect(html).toContain(`--rows:${entries.length}`);
      expect(html.match(/class="vote-overview__rank-row"/g)).toHaveLength(entries.length);
      expect(html).toContain(ARENA_VOTING[arena.id].originLabel);
      expect(html).toContain(`${arenaDisplayName(arena)} 2026`);
      expect(html).toContain('<p class="people-choice-mark">People’s Choice</p>');
      expect(html).toContain(
        '<p class="people-choice-disclaimer">People’s Choice voting reflects public preference only and does not determine the official final result.</p>',
      );
      expect(html.indexOf('class="people-choice-mark"')).toBeLessThan(html.indexOf('class="vote-overview__clock"'));
      expect(html.indexOf('class="vote-overview__clock-note"')).toBeLessThan(
        html.indexOf('class="people-choice-disclaimer"'),
      );
      expect(html).not.toContain(ARENA_VOTING[arena.id].prompt);
      expect(html).not.toContain('Live simulation');
      expect(html).not.toContain('Buglasan Festival 2026');
      expect(html).not.toContain('vote-overview__ticker');

      const document = new DOMParser().parseFromString(html, 'text/html');
      const firstRowIdentity = document.querySelector('.vote-overview__rank-row .vote-overview__rank-name');
      expect(firstRowIdentity?.querySelector('.vote-overview__rank-name-primary')?.textContent).toBeTruthy();
      expect(firstRowIdentity?.querySelector('.vote-overview__rank-name-meta')?.textContent).toMatch(
        /^#\d+ · .+$/,
      );
      expect(html).not.toContain('vote-overview__rank-location');
    }
  });

  it('counts down to the deadline, or declares the standings final', () => {
    const closed = Date.parse(pageantContent.votingDeadlineISO) < Date.now();
    const html = renderToStaticMarkup(
      <VotingOverviewPage
        arena={getHaraArena()}
        onBackToProgram={() => undefined}
        onBackToHub={() => undefined}
        tallies={getTallies()}
      />,
    );

    if (closed) {
      expect(html).toContain('Final standings');
      expect(html).not.toContain('class="vote-overview__countdown"');
    } else {
      expect(html).toContain('class="vote-overview__countdown"');
      expect(html).toContain('Voting closes in');
      expect(html).not.toContain('Final standings');
    }
  });

  it('adds and clears update markers only for rows whose vote totals changed', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <VotingOverviewPage
          arena={getHaraArena()}
          onBackToProgram={() => undefined}
          onBackToHub={() => undefined}
          tallies={getTallies()}
        />,
      );
    });

    expect(container.querySelectorAll('.vote-overview__rank-row.vote-overview__update')).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    /* Each tick moves one to three entries — a single-target tick makes a wall
       board look stalled — so the marker count is a range, not a number. */
    const updatedRows = container.querySelectorAll('.vote-overview__rank-row.vote-overview__update');
    expect(updatedRows.length).toBeGreaterThanOrEqual(1);
    expect(updatedRows.length).toBeLessThanOrEqual(3);
    const rosterIds = new Set(haraCandidates.map((candidate) => candidate.id));
    for (const row of updatedRows) {
      expect(rosterIds.has(row.getAttribute('data-candidate-id') ?? '')).toBe(true);
    }

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(container.querySelectorAll('.vote-overview__rank-row.vote-overview__update')).toHaveLength(0);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('suppresses update markers in reduced-motion mode', () => {
    setReducedMotion(true);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <VotingOverviewPage
          arena={getHaraArena()}
          onBackToProgram={() => undefined}
          onBackToHub={() => undefined}
          tallies={getTallies()}
        />,
      );
    });

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(container.querySelectorAll('.vote-overview__rank-row.vote-overview__update')).toHaveLength(0);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
