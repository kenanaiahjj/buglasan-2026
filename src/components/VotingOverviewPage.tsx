import { useEffect, useMemo, useRef, useSyncExternalStore, type CSSProperties } from 'react';
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

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    gap: '24px',
    padding: '32px',
    background:
      'radial-gradient(circle at top, rgba(247, 211, 119, 0.18), transparent 35%), linear-gradient(180deg, #160f0a 0%, #24170d 45%, #130c08 100%)',
    color: '#fff7eb',
    fontFamily: '"Archivo Variable", sans-serif',
  },
  utility: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  utilityButton: {
    border: '1px solid rgba(255, 247, 235, 0.18)',
    borderRadius: '999px',
    background: 'rgba(255, 247, 235, 0.08)',
    color: 'inherit',
    padding: '12px 18px',
    font: 'inherit',
    cursor: 'pointer',
  },
  hero: {
    display: 'grid',
    gap: '10px',
    padding: '28px',
    borderRadius: '28px',
    background: 'rgba(14, 10, 8, 0.72)',
    border: '1px solid rgba(247, 211, 119, 0.22)',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)',
  },
  eyebrow: {
    margin: 0,
    color: '#f7d377',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontSize: '0.8rem',
  },
  title: {
    margin: 0,
    fontFamily: '"Bodoni Moda Variable", serif',
    fontSize: 'clamp(2.8rem, 6vw, 5rem)',
    lineHeight: 0.95,
  },
  subtitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: 'rgba(255, 247, 235, 0.84)',
  },
  note: {
    margin: 0,
    color: 'rgba(255, 247, 235, 0.68)',
  },
  live: {
    margin: 0,
    color: '#f8dd9a',
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  metricCard: {
    padding: '20px',
    borderRadius: '22px',
    background: 'rgba(255, 247, 235, 0.06)',
    border: '1px solid rgba(255, 247, 235, 0.12)',
  },
  metricsLabel: {
    margin: 0,
    color: 'rgba(255, 247, 235, 0.68)',
  },
  metricsValue: {
    display: 'block',
    marginTop: '8px',
    fontSize: '1.8rem',
  },
  standings: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.5fr) repeat(2, minmax(220px, 1fr))',
    gap: '18px',
  },
  leaderCard: {
    padding: '28px',
    borderRadius: '28px',
    background: 'linear-gradient(180deg, rgba(247, 211, 119, 0.18), rgba(255, 247, 235, 0.08))',
    border: '1px solid rgba(247, 211, 119, 0.24)',
  },
  podiumCard: {
    padding: '24px',
    borderRadius: '24px',
    background: 'rgba(255, 247, 235, 0.06)',
    border: '1px solid rgba(255, 247, 235, 0.12)',
  },
  portraitLarge: {
    width: '100%',
    maxWidth: '320px',
    aspectRatio: '4 / 5',
    objectFit: 'cover',
    borderRadius: '24px',
    marginTop: '16px',
  },
  portraitSmall: {
    width: '100%',
    aspectRatio: '4 / 5',
    objectFit: 'cover',
    borderRadius: '20px',
    marginTop: '12px',
  },
  ranking: {
    padding: '24px',
    borderRadius: '28px',
    background: 'rgba(255, 247, 235, 0.05)',
    border: '1px solid rgba(255, 247, 235, 0.12)',
  },
  rankingList: {
    listStyle: 'none',
    display: 'grid',
    gap: '12px',
    margin: 0,
    padding: 0,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '48px 72px 72px minmax(0, 1.1fr) minmax(140px, 180px) minmax(120px, 1fr)',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    borderRadius: '18px',
    background: 'rgba(12, 9, 8, 0.56)',
  },
  rowPortrait: {
    width: '72px',
    height: '88px',
    objectFit: 'cover',
    borderRadius: '16px',
  },
  rowName: {
    margin: 0,
    fontWeight: 700,
  },
  rowMeta: {
    margin: 0,
    color: 'rgba(255, 247, 235, 0.68)',
  },
  rowVotes: {
    margin: 0,
    textAlign: 'right',
  },
  rowShare: {
    margin: '4px 0 0',
    color: 'rgba(255, 247, 235, 0.68)',
    textAlign: 'right',
  },
  barTrack: {
    height: '10px',
    borderRadius: '999px',
    background: 'rgba(255, 247, 235, 0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 'inherit',
    background: 'linear-gradient(90deg, #f7d377 0%, #f2a35e 100%)',
  },
};

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
  const source = useMemo(() => createSimulatedVotingSource(haraCandidates, tallies), [arena.id, tallies]);
  const snapshot = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  const rankedEntries = useMemo(() => rankVotingOverviewEntries(snapshot), [snapshot]);

  useEffect(() => {
    if (!shellRef.current) {
      return undefined;
    }

    return enter(
      shellRef.current.querySelectorAll('.hara-overview__animate'),
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' },
    );
  }, []);

  const leader = rankedEntries[0];
  const runnerUp = rankedEntries[1];
  const thirdPlace = rankedEntries[2];

  return (
    <main className="hara-overview" ref={shellRef} style={styles.page}>
      <header className="hara-overview__utility hara-overview__animate" style={styles.utility}>
        <button onClick={onBackToHara} style={styles.utilityButton} type="button">
          Back to Hara
        </button>
        <button onClick={onBackToHub} style={styles.utilityButton} type="button">
          Festival Hub
        </button>
      </header>

      <section className="hara-overview__hero hara-overview__animate" aria-label="Voting overview header" style={styles.hero}>
        <p style={styles.eyebrow}>Live simulation</p>
        <h1 style={styles.title}>Hara sa Negros Oriental</h1>
        <p style={styles.subtitle}>Public voting overview</p>
        <p style={styles.note}>Prototype standings update automatically for demonstration.</p>
        <p aria-atomic="true" aria-live="polite" style={styles.live}>
          {snapshot.source === 'simulation' ? 'Live simulation' : 'Live API'}
          {' · '}
          Updated {timeFormatter.format(snapshot.updatedAt)}
        </p>
      </section>

      <section className="hara-overview__metrics hara-overview__animate" aria-label="Overview metrics" style={styles.metrics}>
        <article style={styles.metricCard}>
          <p style={styles.metricsLabel}>Total votes</p>
          <strong style={styles.metricsValue}>{numberFormatter.format(snapshot.totalVotes)}</strong>
        </article>
        <article style={styles.metricCard}>
          <p style={styles.metricsLabel}>Candidates</p>
          <strong style={styles.metricsValue}>{rankedEntries.length}</strong>
        </article>
        <article style={styles.metricCard}>
          <p style={styles.metricsLabel}>Leader</p>
          <strong style={styles.metricsValue}>{leader ? leader.name : '—'}</strong>
        </article>
        <article style={styles.metricCard}>
          <p style={styles.metricsLabel}>Voting ends</p>
          <strong style={styles.metricsValue}>{pageantContent.votingDeadline}</strong>
        </article>
      </section>

      <section className="hara-overview__standings" aria-label="Podium standings" style={styles.standings}>
        {leader ? (
          <article className="hara-overview__leader hara-overview__animate" style={styles.leaderCard}>
            <p style={styles.eyebrow}>Currently leading</p>
            <img
              alt={`${leader.name} of ${leader.location}`}
              className="hara-overview__leader-portrait"
              src={leader.image}
              style={styles.portraitLarge}
            />
            <p style={styles.note}>Candidate {leader.number}</p>
            <h2>{leader.name}</h2>
            <p style={styles.subtitle}>{leader.location}</p>
            <strong style={styles.metricsValue}>{numberFormatter.format(leader.votes)} votes</strong>
            <p style={styles.subtitle}>{formatShare(leader.voteShare)} of total votes</p>
            <p style={styles.live}>{formatLeaderGap(runnerUp ? runnerUp.gapToLeader : 0)}</p>
          </article>
        ) : null}

        {runnerUp ? (
          <article className="hara-overview__podium hara-overview__animate" style={styles.podiumCard}>
            <p style={styles.eyebrow}>2nd place</p>
            <img alt={`${runnerUp.name} of ${runnerUp.location}`} src={runnerUp.image} style={styles.portraitSmall} />
            <h3>{runnerUp.name}</h3>
            <p style={styles.subtitle}>{runnerUp.location}</p>
            <strong>{numberFormatter.format(runnerUp.votes)} votes</strong>
          </article>
        ) : null}

        {thirdPlace ? (
          <article className="hara-overview__podium hara-overview__animate" style={styles.podiumCard}>
            <p style={styles.eyebrow}>3rd place</p>
            <img alt={`${thirdPlace.name} of ${thirdPlace.location}`} src={thirdPlace.image} style={styles.portraitSmall} />
            <h3>{thirdPlace.name}</h3>
            <p style={styles.subtitle}>{thirdPlace.location}</p>
            <strong>{numberFormatter.format(thirdPlace.votes)} votes</strong>
          </article>
        ) : null}
      </section>

      <section className="hara-overview__ranking hara-overview__animate" aria-label="Full candidate ranking" style={styles.ranking}>
        <ol style={styles.rankingList}>
          {rankedEntries.map((entry) => {
            const width = snapshot.totalVotes === 0 ? 0 : Math.max(entry.voteShare * 100, 2);

            return (
              <li className="hara-overview__rank-row" key={entry.id} style={styles.row}>
                <span>{entry.rank}</span>
                <span>#{entry.number}</span>
                <img alt={`${entry.name} of ${entry.location}`} src={entry.image} style={styles.rowPortrait} />
                <div>
                  <p style={styles.rowName}>{entry.name}</p>
                  <p style={styles.rowMeta}>{entry.location}</p>
                </div>
                <div>
                  <p style={styles.rowVotes}>
                    <strong>{numberFormatter.format(entry.votes)} votes</strong>
                  </p>
                  <p style={styles.rowShare}>{formatShare(entry.voteShare)}</p>
                </div>
                <div aria-hidden="true" style={styles.barTrack}>
                  <span style={{ ...styles.barFill, display: 'block', width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
