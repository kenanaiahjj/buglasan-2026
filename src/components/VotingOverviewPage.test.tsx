import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contestArenas, haraCandidates, pageantContent } from '../data/pageant';
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
    expect(html).toContain('Public voting overview');
    expect(html).toContain('Live simulation');
    expect(html).toContain('Currently leading');
    expect(html).toContain('Total votes');
    expect(html).toContain(pageantContent.votingDeadline);
    expect(html.match(/class="vote-overview__rank-row"/g)).toHaveLength(12);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Back to Hara sa Negros Oriental');
    expect(html).toContain('Festival Hub');
    expect(html).toContain('class="vote-overview__utility-button"');
    expect(html).toContain('class="vote-overview__hero vote-overview__animate"');
    expect(html).not.toContain('class="vote-overview__utility-button" style=');
    expect(html).not.toContain('class="vote-overview__hero vote-overview__animate" style=');
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
      vi.advanceTimersByTime(6000);
    });

    const updatedRows = container.querySelectorAll('.vote-overview__rank-row.vote-overview__update');
    expect(updatedRows).toHaveLength(1);
    expect(updatedRows[0]?.getAttribute('data-candidate-id')).toBe('c-01');

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
