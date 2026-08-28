import { entriesForArena } from './arenaEntries';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countdownFrom,
  createSimulatedVotingSource,
  createVotingOverviewSnapshot,
  planSimulationTick,
  rankVotingOverviewEntries,
  summariseVotingOverview,
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

describe('missing counts', () => {
  /* VOTING_API.md promises that an entry the server did not mention has zero
     votes. Falling back to the seeded placeholder there would mix real counts
     with invented ones, and the board would look right while being wrong. */
  it('reads an entry the server omitted as zero, not as its seed', () => {
    const roster = entriesForArena('hara').slice(0, 3);
    const seeded = roster[2].votes;
    expect(seeded).toBeGreaterThan(0);

    const fromApi = createVotingOverviewSnapshot('hara', roster, { 'c-01': 10, 'c-02': 4 }, 'api', 1);
    expect(fromApi.entries.map((entry) => entry.votes)).toEqual([10, 4, 0]);
    expect(fromApi.totalVotes).toBe(14);
  });

  /* The simulation has no server to omit anything, so the seed is its
     starting point and must survive. */
  it('keeps the seed for the simulation', () => {
    const roster = entriesForArena('hara').slice(0, 3);
    const simulated = createVotingOverviewSnapshot('hara', roster, { 'c-01': 10 }, 'simulation', 1);

    expect(simulated.entries[0].votes).toBe(10);
    expect(simulated.entries[2].votes).toBe(roster[2].votes);
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

  function build() {
    return createSimulatedVotingSource(
      'hara',
      { 'c-01': 10, 'c-02': 8, 'c-03': 3 },
      6000,
      entriesForArena('hara').slice(0, 3),
    );
  }

  it('emits on each tick and stops after unsubscribe', () => {
    const source = build();
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);

    vi.advanceTimersByTime(6000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(source.getSnapshot().totalVotes).toBeGreaterThan(21);
    expect(source.getSnapshot().source).toBe('simulation');
    expect(source.getSnapshot().votesPerMinute).toBeGreaterThan(0);

    unsubscribe();
    listener.mockClear();
    vi.advanceTimersByTime(12000);
    expect(listener).not.toHaveBeenCalled();
  });

  /* The board is watched for minutes at a time, so the sequence has to be
     reproducible: same inputs, same run. A rehearsal that does not match the
     night is worse than no rehearsal. */
  it('replays the same sequence for two independently built sources', () => {
    const readFive = () => {
      const source = build();
      const totals: number[] = [];
      const unsubscribe = source.subscribe(() => totals.push(source.getSnapshot().totalVotes));
      vi.advanceTimersByTime(6000 * 5);
      unsubscribe();
      return totals;
    };

    const first = readFive();
    const second = readFive();

    expect(first).toHaveLength(5);
    expect(second).toEqual(first);
    // Strictly increasing: every tick adds votes, none ever removes them.
    expect(first.every((total, index) => index === 0 || total > first[index - 1])).toBe(true);
  });

  it('moves between one and three entries per tick', () => {
    const random = mulberryLike();
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const moves = planSimulationTick(random, 12);
      expect(moves.length).toBeGreaterThanOrEqual(1);
      expect(moves.length).toBeLessThanOrEqual(3);
      for (const move of moves) {
        expect(move.index).toBeGreaterThanOrEqual(0);
        expect(move.index).toBeLessThan(12);
        expect(move.increment).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

/** A cheap stand-in for the module's own PRNG, so the plan can be exercised. */
function mulberryLike(): () => number {
  let seed = 7;
  return () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
}

describe('overview summary', () => {
  const ranked = rankVotingOverviewEntries(
    createVotingOverviewSnapshot(
      'hara',
      entriesForArena('hara').slice(0, 4),
      { 'c-01': 100, 'c-02': 70, 'c-03': 68, 'c-04': 20 },
      'simulation',
      123,
    ),
  );

  it('reports the lead margin and the closest pair anywhere in the table', () => {
    const summary = summariseVotingOverview(ranked);

    expect(summary.leadMargin).toBe(30);
    expect(summary.leadMarginShare).toBeCloseTo(30 / 258, 5);
    // 70 vs 68 is tighter than 100 vs 70, and it is the race worth watching.
    expect(summary.tightestGap?.gap).toBe(2);
    expect(summary.tightestGap?.upper.number).toBe('02');
    expect(summary.tightestGap?.lower.number).toBe('03');
    expect(summary.originCount).toBe(4);
  });

  it('reads an empty field without inventing a leader', () => {
    const summary = summariseVotingOverview([]);

    expect(summary.leadMargin).toBe(0);
    expect(summary.tightestGap).toBeNull();
    expect(summary.originCount).toBe(0);
  });
});

describe('countdown', () => {
  const target = Date.parse('2026-10-24T23:59:00+08:00');

  it('breaks the remaining time into display parts', () => {
    const now = Date.parse('2026-10-22T21:58:57+08:00');
    expect(countdownFrom(target, now)).toEqual({
      days: 2,
      hours: 2,
      minutes: 0,
      seconds: 3,
      closed: false,
    });
  });

  it('closes rather than counting backwards once the deadline passes', () => {
    const summary = countdownFrom(target, target + 60_000);

    expect(summary.closed).toBe(true);
    expect(summary).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
