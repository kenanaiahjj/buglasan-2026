import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ContestArena } from '../data/pageant';
import { pageantContent } from '../data/pageant';
import { ARENA_VOTING, arenaDisplayName } from '../lib/arenaEntries';
import { enter } from '../lib/enter';
import { createSimulatedVotingSource, rankVotingOverviewEntries } from '../lib/votingOverview';

type VotingOverviewPageProps = {
  arena: ContestArena;
  tallies: Record<string, number>;
  onBackToProgram: () => void;
  onBackToHub: () => void;
};

const UPDATE_EMPHASIS_MS = 1400;

const numberFormatter = new Intl.NumberFormat('en-US');
const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
});

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function formatShare(value: number): string {
  return `${percentFormatter.format(value * 100)}%`;
}

function formatLeaderGap(votes: number): string {
  if (votes === 0) {
    return 'Tied for the lead';
  }

  return `Lead by ${numberFormatter.format(votes)} votes`;
}

export function VotingOverviewPage({
  arena,
  tallies,
  onBackToProgram,
  onBackToHub,
}: VotingOverviewPageProps) {
  const cfg = ARENA_VOTING[arena.id];
  const programName = arenaDisplayName(arena);
  const shellRef = useRef<HTMLElement>(null);
  const previousVotesRef = useRef<Record<string, number> | null>(null);
  const clearUpdatesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [updatedEntryIds, setUpdatedEntryIds] = useState<string[]>([]);

  const source = useMemo(() => createSimulatedVotingSource(arena.id, tallies), [arena.id, tallies]);
  const snapshot = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  const rankedEntries = useMemo(() => rankVotingOverviewEntries(snapshot), [snapshot]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || prefersReducedMotion()) {
      return undefined;
    }

    return enter(
      shell.querySelectorAll('.vote-overview__animate'),
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' },
    );
  }, []);

  useEffect(() => {
    const currentVotes = Object.fromEntries(snapshot.entries.map((entry) => [entry.id, entry.votes]));
    const previousVotes = previousVotesRef.current;

    if (prefersReducedMotion()) {
      if (clearUpdatesTimeoutRef.current !== null) {
        clearTimeout(clearUpdatesTimeoutRef.current);
        clearUpdatesTimeoutRef.current = null;
      }
      if (updatedEntryIds.length > 0) {
        setUpdatedEntryIds([]);
      }
      previousVotesRef.current = currentVotes;
      return;
    }

    if (previousVotes) {
      const changedEntryIds = snapshot.entries
        .filter((entry) => previousVotes[entry.id] !== undefined && previousVotes[entry.id] !== entry.votes)
        .map((entry) => entry.id);

      if (changedEntryIds.length > 0) {
        setUpdatedEntryIds(changedEntryIds);
        if (clearUpdatesTimeoutRef.current !== null) {
          clearTimeout(clearUpdatesTimeoutRef.current);
        }
        clearUpdatesTimeoutRef.current = setTimeout(() => {
          setUpdatedEntryIds([]);
          clearUpdatesTimeoutRef.current = null;
        }, UPDATE_EMPHASIS_MS);
      }
    }

    previousVotesRef.current = currentVotes;
  }, [snapshot, updatedEntryIds.length]);

  useEffect(() => () => {
    if (clearUpdatesTimeoutRef.current !== null) {
      clearTimeout(clearUpdatesTimeoutRef.current);
    }
  }, []);

  const leader = rankedEntries[0];
  const runnerUp = rankedEntries[1];
  const thirdPlace = rankedEntries[2];

  return (
    /* Same contract as the ballot: one accent per programme, spent only on
       state — the leader frame, the rank bars — so the four overviews read as
       one board rather than four differently themed ones. */
    <main className="vote-overview" ref={shellRef} style={{ ['--arena' as string]: arena.accentColor }}>
      <header className="vote-overview__utility vote-overview__animate">
        <button className="vote-overview__utility-button" onClick={onBackToProgram} type="button">
          Back to {programName}
        </button>
        <button className="vote-overview__utility-button" onClick={onBackToHub} type="button">
          Festival Hub
        </button>
      </header>

      <section aria-label="Voting overview header" className="vote-overview__hero vote-overview__animate">
        <p className="vote-overview__eyebrow">Live simulation</p>
        <h1 className="vote-overview__title">{programName}</h1>
        <p className="vote-overview__supporting">Public voting overview</p>
        <p className="vote-overview__note">Prototype standings update automatically for demonstration.</p>
        <p aria-atomic="true" aria-live="polite" className="vote-overview__live-status">
          {snapshot.source === 'simulation' ? 'Live simulation' : 'Live API'}
          {' · '}
          Updated {timeFormatter.format(snapshot.updatedAt)}
        </p>
      </section>

      <section aria-label="Overview metrics" className="vote-overview__metrics vote-overview__animate">
        <article className="vote-overview__metric">
          <p className="vote-overview__metric-label">Total votes</p>
          <strong className="vote-overview__metric-value">{numberFormatter.format(snapshot.totalVotes)}</strong>
        </article>
        <article className="vote-overview__metric">
          <p className="vote-overview__metric-label">{cfg.noun[0].toUpperCase() + cfg.noun.slice(1)}</p>
          <strong className="vote-overview__metric-value">{rankedEntries.length}</strong>
        </article>
        <article className="vote-overview__metric">
          <p className="vote-overview__metric-label">Leader</p>
          <strong className="vote-overview__metric-value">{leader ? leader.name : '—'}</strong>
        </article>
        <article className="vote-overview__metric">
          <p className="vote-overview__metric-label">Voting ends</p>
          <strong className="vote-overview__metric-value">{pageantContent.votingDeadline}</strong>
        </article>
      </section>

      <section aria-label="Podium standings" className="vote-overview__standings">
        {leader ? (
          <article className="vote-overview__leader vote-overview__animate">
            <p className="vote-overview__eyebrow">Currently leading</p>
            <img
              alt={`${leader.name} of ${leader.location}`}
              className="vote-overview__leader-portrait"
              src={leader.image}
            />
            <p className="vote-overview__candidate-number">
              {cfg.nounSingular[0].toUpperCase() + cfg.nounSingular.slice(1)} {leader.number}
            </p>
            <h2 className="vote-overview__candidate-name">{leader.name}</h2>
            <p className="vote-overview__candidate-location">{leader.location}</p>
            <strong className="vote-overview__candidate-votes">{numberFormatter.format(leader.votes)} votes</strong>
            <p className="vote-overview__candidate-share">{formatShare(leader.voteShare)} of total votes</p>
            <p className="vote-overview__candidate-gap">{formatLeaderGap(runnerUp ? runnerUp.gapToLeader : 0)}</p>
          </article>
        ) : null}

        {runnerUp ? (
          <article className="vote-overview__podium vote-overview__animate">
            <p className="vote-overview__eyebrow">2nd place</p>
            <img
              alt={`${runnerUp.name} of ${runnerUp.location}`}
              className="vote-overview__podium-portrait"
              src={runnerUp.image}
            />
            <h3 className="vote-overview__candidate-name">{runnerUp.name}</h3>
            <p className="vote-overview__candidate-location">{runnerUp.location}</p>
            <strong className="vote-overview__candidate-votes">{numberFormatter.format(runnerUp.votes)} votes</strong>
          </article>
        ) : null}

        {thirdPlace ? (
          <article className="vote-overview__podium vote-overview__animate">
            <p className="vote-overview__eyebrow">3rd place</p>
            <img
              alt={`${thirdPlace.name} of ${thirdPlace.location}`}
              className="vote-overview__podium-portrait"
              src={thirdPlace.image}
            />
            <h3 className="vote-overview__candidate-name">{thirdPlace.name}</h3>
            <p className="vote-overview__candidate-location">{thirdPlace.location}</p>
            <strong className="vote-overview__candidate-votes">{numberFormatter.format(thirdPlace.votes)} votes</strong>
          </article>
        ) : null}
      </section>

      <section aria-label="Full candidate ranking" className="vote-overview__ranking vote-overview__animate">
        <ol className="vote-overview__ranking-list">
          {rankedEntries.map((entry) => (
            <li
              className={`vote-overview__rank-row${updatedEntryIds.includes(entry.id) ? ' vote-overview__update' : ''}`}
              data-candidate-id={entry.id}
              key={entry.id}
            >
              <span className="vote-overview__rank">{entry.rank}</span>
              <span className="vote-overview__number">#{entry.number}</span>
              <img
                alt={`${entry.name} of ${entry.location}`}
                className="vote-overview__rank-portrait"
                src={entry.image}
              />
              <div className="vote-overview__rank-identity">
                <p className="vote-overview__rank-name">{entry.name}</p>
                <p className="vote-overview__rank-location">{entry.location}</p>
              </div>
              <div className="vote-overview__rank-vote-group">
                <strong className="vote-overview__rank-votes">{numberFormatter.format(entry.votes)} votes</strong>
                <p className="vote-overview__rank-share">{formatShare(entry.voteShare)}</p>
              </div>
              <div aria-hidden="true" className="vote-overview__rank-bar">
                <span
                  className="vote-overview__rank-bar-fill"
                  style={{ width: `${Math.max(snapshot.totalVotes === 0 ? 0 : entry.voteShare * 100, 2)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
