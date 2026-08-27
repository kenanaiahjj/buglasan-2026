import { entriesForArena } from './arenaEntries';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { haraCandidates } from '../data/pageant';
import {
  createSimulatedVotingSource,
  createVotingOverviewSnapshot,
  rankVotingOverviewEntries,
} from './votingOverview';

describe('voting overview calculations', () => {
  it('builds totals and deterministic ranking from the Hara tally', () => {
    const snapshot = createVotingOverviewSnapshot(
      'hara',
      entriesForArena('hara').slice(0, 3),
      { 'c-01': 10, 'c-02': 10, 'c-03': 3 },
      'simulation',
      123,
    );
    const ranked = rankVotingOverviewEntries(snapshot);

    expect(snapshot.totalVotes).toBe(23);
    expect(ranked.map((entry) => [entry.rank, entry.number, entry.votes])).toEqual([
      [1, '01', 10],
      [2, '02', 10],
      [3, '03', 3],
    ]);
    expect(ranked[0].voteShare).toBeCloseTo(10 / 23, 5);
    expect(ranked[1].gapToLeader).toBe(0);
    expect(ranked[2].gapToLeader).toBe(7);
  });
});

describe('simulated voting overview source', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-26T09:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits one deterministic update and stops after unsubscribe', () => {
    const source = createSimulatedVotingSource(
      'hara',
      { 'c-01': 10, 'c-02': 8, 'c-03': 3 },
      6000,
      entriesForArena('hara').slice(0, 3),
    );
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);

    vi.advanceTimersByTime(6000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(source.getSnapshot().totalVotes).toBe(23);
    expect(source.getSnapshot().source).toBe('simulation');

    unsubscribe();
    listener.mockClear();
    vi.advanceTimersByTime(12000);
    expect(listener).not.toHaveBeenCalled();
  });
});
