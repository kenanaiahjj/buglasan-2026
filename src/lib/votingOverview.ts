import { type ContestArena } from '../data/pageant';
import { entriesForArena, type VoteEntry } from './arenaEntries';

export type VotingOverviewEntry = {
  id: string;
  number: string;
  name: string;
  location: string;
  image: string;
  votes: number;
};

export type VotingOverviewSnapshot = {
  arenaId: ContestArena['id'];
  entries: VotingOverviewEntry[];
  totalVotes: number;
  updatedAt: number;
  source: 'simulation' | 'api';
};

export type RankedVotingOverviewEntry = VotingOverviewEntry & {
  rank: number;
  voteShare: number;
  gapToLeader: number;
};

export type VotingOverviewSource = {
  getSnapshot: () => VotingOverviewSnapshot;
  subscribe: (listener: (snapshot: VotingOverviewSnapshot) => void) => () => void;
};

const SIMULATION_TARGETS = [0, 1, 2, 0, 2, 1] as const;
const SIMULATION_INCREMENTS = [2, 1, 3, 1, 2, 1] as const;

/* The four programmes hold different records — a candidate, a booth, a
   contingent — but arenaEntries already flattens all of them to one shape, so
   the overview reads from that rather than from Candidate directly. `origin`
   is the town or district in every case, which is what the standings show. */
function createEntry(entry: VoteEntry, votes: number): VotingOverviewEntry {
  return {
    id: entry.id,
    number: entry.number,
    name: entry.name,
    location: entry.origin,
    image: entry.image ?? '',
    votes,
  };
}

export function createVotingOverviewSnapshot(
  arenaId: ContestArena['id'],
  source_entries: VoteEntry[],
  tallies: Record<string, number>,
  source: VotingOverviewSnapshot['source'],
  updatedAt = Date.now(),
): VotingOverviewSnapshot {
  const entries = source_entries.map((entry) => createEntry(entry, tallies[entry.id] ?? entry.votes));
  const totalVotes = entries.reduce((sum, entry) => sum + entry.votes, 0);

  return {
    arenaId,
    entries,
    totalVotes,
    updatedAt,
    source,
  };
}

export function rankVotingOverviewEntries(snapshot: VotingOverviewSnapshot): RankedVotingOverviewEntry[] {
  const sortedEntries = [...snapshot.entries].sort((left, right) => {
    if (right.votes !== left.votes) {
      return right.votes - left.votes;
    }

    return Number(left.number) - Number(right.number);
  });

  const leaderVotes = sortedEntries[0]?.votes ?? 0;

  return sortedEntries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    voteShare: snapshot.totalVotes === 0 ? 0 : entry.votes / snapshot.totalVotes,
    gapToLeader: leaderVotes - entry.votes,
  }));
}

export function createSimulatedVotingSource(
  arenaId: ContestArena['id'],
  initialTallies: Record<string, number>,
  intervalMs = 6000,
  /* Defaults to the whole programme. Overridable so the deterministic tick
     can be tested against a small, fixed set rather than the live roster. */
  candidates: VoteEntry[] = entriesForArena(arenaId),
): VotingOverviewSource {
  let tallies = { ...initialTallies };
  let updatedAt = Date.now();
  let snapshot = createVotingOverviewSnapshot(arenaId, candidates, tallies, 'simulation', updatedAt);
  const listeners = new Set<(snapshot: VotingOverviewSnapshot) => void>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let sequenceIndex = 0;

  const emit = () => {
    snapshot = createVotingOverviewSnapshot(arenaId, candidates, tallies, 'simulation', updatedAt);
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const tick = () => {
    if (candidates.length === 0) {
      return;
    }

    const targetIndex = SIMULATION_TARGETS[sequenceIndex % SIMULATION_TARGETS.length] % candidates.length;
    const increment = SIMULATION_INCREMENTS[sequenceIndex % SIMULATION_INCREMENTS.length];
    const candidate = candidates[targetIndex];

    tallies = {
      ...tallies,
      [candidate.id]: (tallies[candidate.id] ?? candidate.votes) + increment,
    };
    updatedAt = Date.now();
    sequenceIndex += 1;
    emit();
  };

  const start = () => {
    if (timer === null && listeners.size > 0) {
      timer = setInterval(tick, intervalMs);
    }
  };

  const stop = () => {
    if (timer !== null && listeners.size === 0) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      start();

      return () => {
        listeners.delete(listener);
        stop();
      };
    },
  };
}
