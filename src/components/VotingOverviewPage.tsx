import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ContestArena } from '../data/pageant';
import { haraCandidates, pageantContent } from '../data/pageant';
import { enter } from '../lib/enter';
import { createSimulatedVotingSource, rankVotingOverviewEntries } from '../lib/votingOverview';

type VotingOverviewPageProps = {
  arena: ContestArena;
  tallies: Record<string, number>;
  onBackToHara: () => void;
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
  onBackToHara,
  onBackToHub,
}: VotingOverviewPageProps) {
  const shellRef = useRef<HTMLElement>(null);
  const previousVotesRef = useRef<Record<string, number> | null>(null);
  const clearUpdatesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [updatedEntryIds, setUpdatedEntryIds] = useState<string[]>([]);

  const source = useMemo(() => createSimulatedVotingSource(haraCandidates, tallies), [arena.id, tallies]);
  const snapshot = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  const rankedEntries = useMemo(() => rankVotingOverviewEntries(snapshot), [snapshot]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || prefersReducedMotion()) {
      return undefined;
    }

    return enter(
      shell.querySelectorAll('.hara-overview__animate'),
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
    <main className="hara-overview" ref={shellRef}>
      <header className="hara-overview__utility hara-overview__animate">
        <button className="hara-overview__utility-button" onClick={onBackToHara} type="button">
          Back to Hara
        </button>
        <button className="hara-overview__utility-button" onClick={onBackToHub} type="button">
          Festival Hub
        </button>
      </header>

      <section aria-label="Voting overview header" className="hara-overview__hero hara-overview__animate">
        <p className="hara-overview__eyebrow">Live simulation</p>
        <h1 className="hara-overview__title">Hara sa Negros Oriental</h1>
        <p className="hara-overview__supporting">Public voting overview</p>
        <p className="hara-overview__note">Prototype standings update automatically for demonstration.</p>
        <p aria-atomic="true" aria-live="polite" className="hara-overview__live-status">
          {snapshot.source === 'simulation' ? 'Live simulation' : 'Live API'}
          {' · '}
          Updated {timeFormatter.format(snapshot.updatedAt)}
        </p>
      </section>

      <section aria-label="Overview metrics" className="hara-overview__metrics hara-overview__animate">
        <article className="hara-overview__metric">
          <p className="hara-overview__metric-label">Total votes</p>
          <strong className="hara-overview__metric-value">{numberFormatter.format(snapshot.totalVotes)}</strong>
        </article>
        <article className="hara-overview__metric">
          <p className="hara-overview__metric-label">Candidates</p>
          <strong className="hara-overview__metric-value">{rankedEntries.length}</strong>
        </article>
        <article className="hara-overview__metric">
          <p className="hara-overview__metric-label">Leader</p>
          <strong className="hara-overview__metric-value">{leader ? leader.name : '—'}</strong>
        </article>
        <article className="hara-overview__metric">
          <p className="hara-overview__metric-label">Voting ends</p>
          <strong className="hara-overview__metric-value">{pageantContent.votingDeadline}</strong>
        </article>
      </section>

      <section aria-label="Podium standings" className="hara-overview__standings">
        {leader ? (
          <article className="hara-overview__leader hara-overview__animate">
            <p className="hara-overview__eyebrow">Currently leading</p>
            <img
              alt={`${leader.name} of ${leader.location}`}
              className="hara-overview__leader-portrait"
              src={leader.image}
            />
            <p className="hara-overview__candidate-number">Candidate {leader.number}</p>
            <h2 className="hara-overview__candidate-name">{leader.name}</h2>
            <p className="hara-overview__candidate-location">{leader.location}</p>
            <strong className="hara-overview__candidate-votes">{numberFormatter.format(leader.votes)} votes</strong>
            <p className="hara-overview__candidate-share">{formatShare(leader.voteShare)} of total votes</p>
            <p className="hara-overview__candidate-gap">{formatLeaderGap(runnerUp ? runnerUp.gapToLeader : 0)}</p>
          </article>
        ) : null}

        {runnerUp ? (
          <article className="hara-overview__podium hara-overview__animate">
            <p className="hara-overview__eyebrow">2nd place</p>
            <img
              alt={`${runnerUp.name} of ${runnerUp.location}`}
              className="hara-overview__podium-portrait"
              src={runnerUp.image}
            />
            <h3 className="hara-overview__candidate-name">{runnerUp.name}</h3>
            <p className="hara-overview__candidate-location">{runnerUp.location}</p>
            <strong className="hara-overview__candidate-votes">{numberFormatter.format(runnerUp.votes)} votes</strong>
          </article>
        ) : null}

        {thirdPlace ? (
          <article className="hara-overview__podium hara-overview__animate">
            <p className="hara-overview__eyebrow">3rd place</p>
            <img
              alt={`${thirdPlace.name} of ${thirdPlace.location}`}
              className="hara-overview__podium-portrait"
              src={thirdPlace.image}
            />
            <h3 className="hara-overview__candidate-name">{thirdPlace.name}</h3>
            <p className="hara-overview__candidate-location">{thirdPlace.location}</p>
            <strong className="hara-overview__candidate-votes">{numberFormatter.format(thirdPlace.votes)} votes</strong>
          </article>
        ) : null}
      </section>

      <section aria-label="Full candidate ranking" className="hara-overview__ranking hara-overview__animate">
        <ol className="hara-overview__ranking-list">
          {rankedEntries.map((entry) => (
            <li
              className={`hara-overview__rank-row${updatedEntryIds.includes(entry.id) ? ' hara-overview__update' : ''}`}
              data-candidate-id={entry.id}
              key={entry.id}
            >
              <span className="hara-overview__rank">{entry.rank}</span>
              <span className="hara-overview__number">#{entry.number}</span>
              <img
                alt={`${entry.name} of ${entry.location}`}
                className="hara-overview__rank-portrait"
                src={entry.image}
              />
              <div className="hara-overview__rank-identity">
                <p className="hara-overview__rank-name">{entry.name}</p>
                <p className="hara-overview__rank-location">{entry.location}</p>
              </div>
              <div className="hara-overview__rank-vote-group">
                <strong className="hara-overview__rank-votes">{numberFormatter.format(entry.votes)} votes</strong>
                <p className="hara-overview__rank-share">{formatShare(entry.voteShare)}</p>
              </div>
              <div aria-hidden="true" className="hara-overview__rank-bar">
                <span
                  className="hara-overview__rank-bar-fill"
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
