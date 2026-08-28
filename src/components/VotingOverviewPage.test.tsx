import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contestArenas, haraCandidates, pageantContent } from '../data/pageant';
import { ARENA_VOTING, entriesForArena } from '../lib/arenaEntries';
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

  it('renders the simulated Hara standings for event display', () => {
    const hara = getHaraArena();
    const html = renderToStaticMarkup(
      <VotingOverviewPage
        arena={hara}
        onBackToProgram={() => undefined}
        onBackToHub={() => undefined}
        tallies={getTallies()}
      />,
    );

    expect(html).toContain('Hara sa Negros Oriental');
    expect(html).toContain(ARENA_VOTING.hara.prompt);
    expect(html).toContain('Live simulation');
    expect(html).toContain('Leading');
    expect(html).toContain('Total votes cast');
    expect(html).toContain('Votes per minute');
    expect(html).toContain('Lead margin');
    expect(html).toContain('Towns represented');
    expect(html).toContain('Biggest climb');
    expect(html).toContain('Tightest race');
    expect(html).toContain(pageantContent.votingDeadline);
    expect(html.match(/class="vote-overview__rank-row"/g)).toHaveLength(haraCandidates.length);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Back to Hara sa Negros Oriental');
    expect(html).toContain('Festival Hub');
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
