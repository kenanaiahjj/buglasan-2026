import { type ContestArena } from '../data/pageant';
import { entriesForArena, type VoteEntry } from './arenaEntries';
import { resolveVotingApi, type VotingApi } from './votingApi';
import { isLiveVoting } from './votingConfig';

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
  /** Votes counted in the trailing minute. 0 until the board has run that long. */
  votesPerMinute: number;
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

/* The board is watched for minutes at a time by a room full of people, so the
   simulation has to behave like real turnout rather than a metronome: several
   entries moving at once, most ticks a trickle, the occasional block of votes
   that actually reorders the standings. Seeded so it stays reproducible —
   two sources built from the same inputs emit the same sequence. */
const SIMULATION_SEED = 0x62756731;
const MOMENTUM_WINDOW_MS = 60_000;
const BURST_CHANCE = 0.14;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
  votesPerMinute = 0,
): VotingOverviewSnapshot {
  /* An entry the server did not mention has zero votes — that is what
     VOTING_API.md promises. Falling back to the seeded placeholder there would
     mix real counts with invented ones and the board would look right while
     being wrong. The simulation has no server to omit anything, so it keeps
     the seed as its starting point. */
  const entries = source_entries.map((entry) => {
    const counted = tallies[entry.id];
    return createEntry(entry, counted ?? (source === 'api' ? 0 : entry.votes));
  });
  const totalVotes = entries.reduce((sum, entry) => sum + entry.votes, 0);

  return {
    arenaId,
    entries,
    totalVotes,
    updatedAt,
    source,
    votesPerMinute,
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

export type OverviewSummary = {
  /** Distinct towns (or districts) with an entry in the race. */
  originCount: number;
  /** Votes between first and second. The margin is the drama. */
  leadMargin: number;
  /** The same margin in share points, which survives a growing total. */
  leadMarginShare: number;
  /* The closest pair anywhere in the table, not just at the top — on a
     full-roster board the race worth watching is often outside the podium. */
  tightestGap: {
    gap: number;
    upper: RankedVotingOverviewEntry;
    lower: RankedVotingOverviewEntry;
  } | null;
};

export function summariseVotingOverview(ranked: RankedVotingOverviewEntry[]): OverviewSummary {
  const [leader, runnerUp] = ranked;
  let tightestGap: OverviewSummary['tightestGap'] = null;

  for (let index = 1; index < ranked.length; index += 1) {
    const upper = ranked[index - 1];
    const lower = ranked[index];
    const gap = upper.votes - lower.votes;

    if (tightestGap === null || gap < tightestGap.gap) {
      tightestGap = { gap, upper, lower };
    }
  }

  return {
    originCount: new Set(ranked.map((entry) => entry.location)).size,
    leadMargin: leader && runnerUp ? leader.votes - runnerUp.votes : 0,
    leadMarginShare: leader && runnerUp ? leader.voteShare - runnerUp.voteShare : 0,
    tightestGap,
  };
}

export type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  closed: boolean;
};

export function countdownFrom(targetMs: number, nowMs: number): Countdown {
  /* A target that is not a finite number means nobody told us when voting
     ends — a server that omitted `votingClosesAt`, or an unparseable date.
     Arithmetic on it yields NaN, and NaN never equals 0, so the board would
     print "NaN days" under the label "Voting closes in" rather than closing.
     Zeros and an open state; the caller decides whether to show a clock. */
  if (!Number.isFinite(targetMs) || !Number.isFinite(nowMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, closed: false };
  }

  const remaining = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(remaining / 1000);

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor(totalSeconds / 3_600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
    closed: remaining === 0,
  };
}

/** How many entries move on a single tick, and by how much. */
export function planSimulationTick(random: () => number, rosterSize: number) {
  const movers = 1 + Math.floor(random() * 3);
  const moves: Array<{ index: number; increment: number }> = [];

  for (let move = 0; move < movers; move += 1) {
    const index = Math.floor(random() * rosterSize);
    const burst = random() < BURST_CHANCE;
    moves.push({
      index,
      increment: burst ? 14 + Math.floor(random() * 30) : 1 + Math.floor(random() * 6),
    });
  }

  return moves;
}

/**
 * The simulation.
 *
 * A deliberate stub, and the one most likely to be seen by the public: this
 * is what the wall board runs on when no backend is configured. It invents
 * turnout. `snapshot.source` is `'simulation'` throughout and the board prints
 * "Live simulation" rather than "Live results" because of it — if that label
 * ever reads wrong on a real event screen, this function is why.
 *
 * Replaced by `createApiVotingSource` the moment `VITE_VOTING_API_URL` is set.
 * Nothing else needs to change.
 */
export function createSimulatedVotingSource(
  arenaId: ContestArena['id'],
  initialTallies: Record<string, number>,
  intervalMs = 3000,
  /* Defaults to the whole programme. Overridable so the deterministic tick
     can be tested against a small, fixed set rather than the live roster. */
  candidates: VoteEntry[] = entriesForArena(arenaId),
): VotingOverviewSource {
  let tallies = { ...initialTallies };
  const startedAt = Date.now();
  let updatedAt = startedAt;
  let votesPerMinute = 0;
  let snapshot = createVotingOverviewSnapshot(arenaId, candidates, tallies, 'simulation', updatedAt, 0);
  const listeners = new Set<(snapshot: VotingOverviewSnapshot) => void>();
  const recentTicks: Array<{ at: number; votes: number }> = [];
  const random = mulberry32(SIMULATION_SEED);
  let timer: ReturnType<typeof setInterval> | null = null;

  const emit = () => {
    snapshot = createVotingOverviewSnapshot(arenaId, candidates, tallies, 'simulation', updatedAt, votesPerMinute);
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const tick = () => {
    if (candidates.length === 0) {
      return;
    }

    const now = Date.now();
    let added = 0;

    for (const move of planSimulationTick(random, candidates.length)) {
      const candidate = candidates[move.index];
      tallies = {
        ...tallies,
        [candidate.id]: (tallies[candidate.id] ?? candidate.votes) + move.increment,
      };
      added += move.increment;
    }

    recentTicks.push({ at: now, votes: added });
    while (recentTicks.length > 0 && now - recentTicks[0].at > MOMENTUM_WINDOW_MS) {
      recentTicks.shift();
    }

    /* Before a full minute has elapsed the window is short, so scale by how
       long it has actually been running rather than reporting a rate built
       from three seconds of data as if it were a minute of it. */
    const observedMs = Math.min(MOMENTUM_WINDOW_MS, Math.max(intervalMs, now - startedAt));
    const windowVotes = recentTicks.reduce((sum, entry) => sum + entry.votes, 0);
    votesPerMinute = Math.round((windowVotes * 60_000) / observedMs);
    updatedAt = now;
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

/** How often the board asks the server for counts when there is no stream. */
const TALLY_POLL_MS = 5000;

/**
 * The board, reading a real backend.
 *
 * Prefers `openTallyStream` when the API offers one and falls back to polling
 * `getTally` when it does not, so a server can start with a plain REST
 * endpoint and add SSE later without this file changing. A failed read is
 * swallowed on purpose: the wall board keeps showing the last good numbers
 * rather than blanking because one poll timed out.
 */
export function createApiVotingSource(
  arenaId: ContestArena['id'],
  initialTallies: Record<string, number>,
  api: VotingApi = resolveVotingApi(),
  candidates: VoteEntry[] = entriesForArena(arenaId),
  pollMs = TALLY_POLL_MS,
): VotingOverviewSource {
  let snapshot = createVotingOverviewSnapshot(arenaId, candidates, initialTallies, 'api', Date.now(), 0);
  const listeners = new Set<(snapshot: VotingOverviewSnapshot) => void>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopStream: (() => void) | null = null;
  let inFlight: AbortController | null = null;

  const publish = (tallies: Record<string, number>, updatedAt: number, votesPerMinute: number) => {
    snapshot = createVotingOverviewSnapshot(arenaId, candidates, tallies, 'api', updatedAt, votesPerMinute);
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const poll = async () => {
    inFlight?.abort();
    const controller = new AbortController();
    inFlight = controller;

    try {
      const next = await api.getTally(arenaId, controller.signal);
      publish(next.tallies, next.updatedAt, next.votesPerMinute ?? 0);
    } catch {
      // Last good numbers beat an empty board. The next tick tries again.
    }
  };

  const start = () => {
    if (listeners.size === 0) return;

    if (api.openTallyStream !== undefined && stopStream === null) {
      stopStream = api.openTallyStream(arenaId, (next) =>
        publish(next.tallies, next.updatedAt, next.votesPerMinute ?? 0));
      return;
    }

    if (timer === null) {
      void poll();
      timer = setInterval(() => void poll(), pollMs);
    }
  };

  const stop = () => {
    if (listeners.size > 0) return;
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    stopStream?.();
    stopStream = null;
    inFlight?.abort();
    inFlight = null;
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

/**
 * What the overview board actually uses.
 *
 * With `VITE_VOTING_API_URL` set the board reads the server; without it, it
 * runs the simulation. One switch, and the component above does not know
 * which it got.
 */
export function createVotingOverviewSource(
  arenaId: ContestArena['id'],
  initialTallies: Record<string, number>,
): VotingOverviewSource {
  return isLiveVoting()
    ? createApiVotingSource(arenaId, initialTallies)
    : createSimulatedVotingSource(arenaId, initialTallies);
}
