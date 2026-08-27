import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft';
import { ArrowsOut } from '@phosphor-icons/react/dist/icons/ArrowsOut';
import { CaretUp } from '@phosphor-icons/react/dist/icons/CaretUp';
import { House } from '@phosphor-icons/react/dist/icons/House';
import { gsap } from 'gsap';
import type { ContestArena } from '../data/pageant';
import { pageantContent } from '../data/pageant';
import { ARENA_VOTING, arenaDisplayName } from '../lib/arenaEntries';
import { enter } from '../lib/enter';
import {
  countdownFrom,
  createVotingOverviewSource,
  rankVotingOverviewEntries,
  summariseVotingOverview,
  type RankedVotingOverviewEntry,
} from '../lib/votingOverview';

type VotingOverviewPageProps = {
  arena: ContestArena;
  tallies: Record<string, number>;
  onBackToProgram: () => void;
  onBackToHub: () => void;
};

const UPDATE_EMPHASIS_MS = 1100;
/* How long the operator chrome stays up after the last pointer movement.
   On the wall nobody touches the machine, so it simply never comes back. */
const CHROME_IDLE_MS = 2600;

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

const votingDeadlineMs = Date.parse(pageantContent.votingDeadlineISO);

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function formatShare(value: number): string {
  return `${percentFormatter.format(value * 100)}%`;
}

function formatCount(value: number): string {
  return numberFormatter.format(value);
}

function formatSharePoints(value: number): string {
  return `${percentFormatter.format(value * 100)} pts`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function titleCase(word: string): string {
  return word[0].toUpperCase() + word.slice(1);
}

/**
 * A number that counts to its new value instead of swapping to it.
 *
 * React commits the final text first, so the tween starts by rolling the node
 * back to the previous number — that way the markup is always correct for SSR
 * and for anyone with reduced motion on, and the animation is pure decoration
 * layered on top of a already-correct DOM.
 */
function Ticker({
  className,
  format = formatCount,
  value,
}: {
  className?: string;
  format?: (value: number) => string;
  value: number;
}) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const previousRef = useRef(value);

  useLayoutEffect(() => {
    const node = nodeRef.current;
    const from = previousRef.current;
    previousRef.current = value;

    if (!node || from === value || prefersReducedMotion()) {
      return undefined;
    }

    const proxy = { value: from };
    const tween = gsap.to(proxy, {
      value,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => {
        node.textContent = format(Math.round(proxy.value));
      },
    });

    return () => {
      tween.kill();
      node.textContent = format(value);
    };
  }, [format, value]);

  return (
    <span className={className} ref={nodeRef}>
      {format(value)}
    </span>
  );
}

/** Wall clock, ticking once a second, for the countdown only. */
function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export function VotingOverviewPage({
  arena,
  tallies,
  onBackToProgram,
  onBackToHub,
}: VotingOverviewPageProps) {
  const cfg = ARENA_VOTING[arena.id];
  const programName = arenaDisplayName(arena);
  const shellRef = useRef<HTMLDivElement>(null);
  const previousVotesRef = useRef<Record<string, number> | null>(null);
  const clearUpdatesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [updatedEntryIds, setUpdatedEntryIds] = useState<string[]>([]);
  const [chromeVisible, setChromeVisible] = useState(true);

  const source = useMemo(() => createVotingOverviewSource(arena.id, tallies), [arena.id, tallies]);
  const snapshot = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  const rankedEntries = useMemo(() => rankVotingOverviewEntries(snapshot), [snapshot]);
  const summary = useMemo(() => summariseVotingOverview(rankedEntries), [rankedEntries]);

  const now = useNow();
  const countdown = countdownFrom(votingDeadlineMs, now);

  /* Rank movement is measured from the moment the board was put on screen,
     not from the last tick. "Up 3 since the board opened" is a story an
     audience can follow; "up 1 since four seconds ago" is noise. */
  const baselineRanksRef = useRef<Record<string, number> | null>(null);
  if (baselineRanksRef.current === null && rankedEntries.length > 0) {
    baselineRanksRef.current = Object.fromEntries(rankedEntries.map((entry) => [entry.id, entry.rank]));
  }

  const rankDeltas = useMemo(() => {
    const baseline = baselineRanksRef.current;
    if (!baseline) {
      return {} as Record<string, number>;
    }

    return Object.fromEntries(
      rankedEntries.map((entry) => [entry.id, (baseline[entry.id] ?? entry.rank) - entry.rank]),
    );
  }, [rankedEntries]);

  const biggestMover = useMemo(() => {
    let best: RankedVotingOverviewEntry | null = null;
    let bestDelta = 0;

    for (const entry of rankedEntries) {
      const delta = rankDeltas[entry.id] ?? 0;
      if (delta > bestDelta) {
        best = entry;
        bestDelta = delta;
      }
    }

    return best === null ? null : { entry: best, delta: bestDelta };
  }, [rankDeltas, rankedEntries]);

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

  /* The back buttons are for whoever sets the board up, not for the room.
     They retire on their own and come back on any pointer movement, so a
     photograph of the wall never has browser chrome in it. */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      setChromeVisible(true);
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => setChromeVisible(false), CHROME_IDLE_MS);
    };

    schedule();
    window.addEventListener('pointermove', schedule);
    window.addEventListener('keydown', schedule);

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      window.removeEventListener('pointermove', schedule);
      window.removeEventListener('keydown', schedule);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void document.documentElement.requestFullscreen?.();
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

  /* FLIP: rows are keyed by entry, so React moves the same node when the
     order changes. Measuring before and after lets the node slide from where
     it was to where it now is — an overtake you can actually watch happen. */
  const rowNodesRef = useRef(new Map<string, HTMLLIElement>());
  const rowOffsetsRef = useRef(new Map<string, number>());
  const rowRanksRef = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    /* offsetTop, not getBoundingClientRect: the rect of a row that is still
       sliding includes its own transform, so measuring that way feeds each
       frame's offset back into the next diff and the list walks off screen. */
    const offsets = new Map<string, number>();
    for (const [id, node] of rowNodesRef.current) {
      offsets.set(id, node.offsetTop);
    }

    const previousOffsets = rowOffsetsRef.current;
    const previousRanks = rowRanksRef.current;
    rowOffsetsRef.current = offsets;
    rowRanksRef.current = new Map(rankedEntries.map((entry) => [entry.id, entry.rank]));

    if (prefersReducedMotion()) {
      return;
    }

    for (const entry of rankedEntries) {
      const node = rowNodesRef.current.get(entry.id);
      if (node === undefined) {
        continue;
      }

      const previousRank = previousRanks.get(entry.id);
      const previousTop = previousOffsets.get(entry.id);
      const top = offsets.get(entry.id);

      /* Only a genuine overtake is worth animating. Sub-pixel relayout is
         not, and tweening those is how rows end up parked on a leftover
         transform when the next tick interrupts the tween — so every row
         that did not change place is snapped flat instead. */
      if (
        previousRank === undefined
        || previousRank === entry.rank
        || previousTop === undefined
        || top === undefined
      ) {
        gsap.set(node, { y: 0 });
        continue;
      }

      gsap.to(node, {
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
        overwrite: true,
        startAt: { y: previousTop - top },
        onComplete: () => gsap.set(node, { y: 0 }),
      });
    }
  }, [rankedEntries]);

  const podiumEntries = rankedEntries.slice(0, 3);
  const leader = podiumEntries[0];
  const totalEntries = rankedEntries.length;
  /* Bars are scaled against the leader, not against the total. On a
     twelve-entry board every share is under 20%, so a share-scaled bar
     leaves the whole field huddled at the left edge saying nothing. */
  const leaderVotes = leader?.votes ?? 0;

  return (
    <div
      className={`vote-overview${chromeVisible ? '' : ' is-idle'}`}
      ref={shellRef}
      /* Same contract as the ballot: one accent per programme, spent only on
         state — the leader frame, the rank bars — so the four boards read as
         one product rather than four differently themed screens. */
      style={{ ['--arena' as string]: arena.accentColor }}
    >
      {/* Fixed 16:9. The board is composed once at wall proportions and
          letterboxed into whatever it is actually shown on, so nothing
          reflows between the laptop it is cued from and the LED wall. */}
      <div className="vote-overview__frame">
        <div className="vote-overview__board">
          <header className="vote-overview__hero vote-overview__animate">
            <div className="vote-overview__identity">
              {arena.logo ? (
                /* Sized so the header does not grow when the crest lands: a
                   late reflow here shifts every standings row, and the FLIP
                   pass faithfully animates the whole table sliding. */
                <img alt="" className="vote-overview__crest" height={447} src={arena.logo} width={447} />
              ) : null}
              <div className="vote-overview__identity-type">
                <p className="vote-overview__eyebrow">
                  <span className="vote-overview__live" />
                  {snapshot.source === 'simulation' ? 'Live simulation' : 'Live results'}
                  <span className="vote-overview__eyebrow-sep">·</span>
                  Buglasan Festival 2026
                </p>
                <h1 className="vote-overview__title">{programName}</h1>
                {/* A wall board is read by people deciding whether to vote, so
                    the second line is the instruction rather than a label for
                    the screen they are already looking at. */}
                <p className="vote-overview__supporting">{cfg.prompt}</p>
              </div>
            </div>

            <div className="vote-overview__clock">
              <p className="vote-overview__clock-label">
                {countdown.closed ? 'Voting has closed' : 'Voting closes in'}
              </p>
              {countdown.closed ? (
                <p className="vote-overview__clock-final">Final standings</p>
              ) : (
                <p aria-label="Time remaining to vote" className="vote-overview__countdown">
                  <span>
                    <b>{pad(countdown.days)}</b>
                    <i>days</i>
                  </span>
                  <span>
                    <b>{pad(countdown.hours)}</b>
                    <i>hrs</i>
                  </span>
                  <span>
                    <b>{pad(countdown.minutes)}</b>
                    <i>min</i>
                  </span>
                  <span>
                    <b>{pad(countdown.seconds)}</b>
                    <i>sec</i>
                  </span>
                </p>
              )}
              <p className="vote-overview__clock-note">{pageantContent.votingDeadline}</p>
            </div>
          </header>

          <div className="vote-overview__body">
            <aside className="vote-overview__rail">
              {podiumEntries.length > 0 ? (
                <section
                  aria-label={`${programName} top three`}
                  className="vote-overview__podium vote-overview__animate"
                >
                  {leader ? (
                    <article className="vote-overview__podium-entry vote-overview__leader">
                      <div className="vote-overview__leader-media">
                        <img alt={`${leader.name} of ${leader.location}`} src={leader.image} />
                        <span className="vote-overview__leader-badge">Leading</span>
                      </div>
                      <div className="vote-overview__leader-type">
                        <p className="vote-overview__candidate-number">
                          {titleCase(cfg.nounSingular)} {leader.number} · {leader.location}
                        </p>
                        <h2 className="vote-overview__candidate-name">{leader.name}</h2>
                        <div className="vote-overview__leader-figures">
                          <p>
                            <Ticker className="vote-overview__candidate-votes" value={leader.votes} />
                            <span className="vote-overview__figure-label">votes</span>
                          </p>
                          <p>
                            <strong className="vote-overview__candidate-votes">{formatShare(leader.voteShare)}</strong>
                            <span className="vote-overview__figure-label">of all votes</span>
                          </p>
                        </div>
                      </div>
                    </article>
                  ) : null}

                  <div className="vote-overview__podium-secondary">
                    {podiumEntries.slice(1).map((entry) => (
                      <article
                        className="vote-overview__podium-entry vote-overview__podium-card"
                        data-rank={entry.rank}
                        key={entry.id}
                      >
                        <div className="vote-overview__podium-card-media">
                          <img alt={`${entry.name} of ${entry.location}`} src={entry.image} />
                          <span className="vote-overview__podium-card-rank">Rank {entry.rank}</span>
                        </div>
                        <div className="vote-overview__podium-card-type">
                          <p className="vote-overview__candidate-number">
                            {titleCase(cfg.nounSingular)} {entry.number}
                          </p>
                          <h3 className="vote-overview__podium-card-name">{entry.name}</h3>
                          <p className="vote-overview__podium-card-location">{entry.location}</p>
                          <p className="vote-overview__podium-card-votes">
                            <Ticker className="vote-overview__candidate-votes" value={entry.votes} />
                            <span className="vote-overview__figure-label">votes</span>
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              <div aria-label="Overview metrics" className="vote-overview__metrics vote-overview__animate" role="group">
                <article className="vote-overview__metric">
                  <p className="vote-overview__metric-label">Total votes cast</p>
                  <Ticker className="vote-overview__metric-value" value={snapshot.totalVotes} />
                </article>
                <article className="vote-overview__metric">
                  <p className="vote-overview__metric-label">Votes per minute</p>
                  {/* Nothing has been counted yet in the first seconds after
                      the board opens. A dash says that; a zero claims the
                      room stopped voting. */}
                  {snapshot.votesPerMinute > 0 ? (
                    <Ticker className="vote-overview__metric-value" value={snapshot.votesPerMinute} />
                  ) : (
                    <strong className="vote-overview__metric-value">&mdash;</strong>
                  )}
                  <p className="vote-overview__metric-note">across the last minute</p>
                </article>
                <article className="vote-overview__metric">
                  <p className="vote-overview__metric-label">Lead margin</p>
                  <Ticker className="vote-overview__metric-value" value={summary.leadMargin} />
                  <p className="vote-overview__metric-note">{formatSharePoints(summary.leadMarginShare)} clear</p>
                </article>
                <article className="vote-overview__metric">
                  <p className="vote-overview__metric-label">{cfg.originLabel}</p>
                  <strong className="vote-overview__metric-value">{summary.originCount}</strong>
                  <p className="vote-overview__metric-note">
                    {totalEntries} {cfg.noun} in the running
                  </p>
                </article>
              </div>
            </aside>

            <section
              aria-label={`${programName} standings`}
              className="vote-overview__ranking vote-overview__animate"
            >
              <div aria-hidden="true" className="vote-overview__ranking-head">
                <span>Rank</span>
                <span>{titleCase(cfg.nounSingular)}</span>
                <span>Votes</span>
                <span>Share</span>
              </div>

              <ol className="vote-overview__ranking-list" style={{ ['--rows' as string]: totalEntries }}>
                {rankedEntries.map((entry) => {
                  const delta = rankDeltas[entry.id] ?? 0;

                  return (
                    <li
                      className={`vote-overview__rank-row${updatedEntryIds.includes(entry.id) ? ' vote-overview__update' : ''}`}
                      data-candidate-id={entry.id}
                      data-rank={entry.rank}
                      key={entry.id}
                      ref={(node) => {
                        if (node) {
                          rowNodesRef.current.set(entry.id, node);
                        } else {
                          rowNodesRef.current.delete(entry.id);
                        }
                      }}
                    >
                      <span className="vote-overview__rank">{entry.rank}</span>
                      {delta === 0 ? (
                        <span aria-hidden="true" className="vote-overview__delta is-level">
                          —
                        </span>
                      ) : (
                        <span
                          className={`vote-overview__delta${delta > 0 ? ' is-up' : ' is-down'}`}
                          title={`${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)} since this board opened`}
                        >
                          <CaretUp aria-hidden="true" size={11} weight="fill" />
                          {Math.abs(delta)}
                        </span>
                      )}
                      <img
                        alt={`${entry.name} of ${entry.location}`}
                        className="vote-overview__rank-portrait"
                        src={entry.image}
                      />
                      <div className="vote-overview__rank-identity">
                        <p className="vote-overview__rank-name">{entry.name}</p>
                        <p className="vote-overview__rank-location">
                          #{entry.number} · {entry.location}
                        </p>
                      </div>
                      <Ticker className="vote-overview__rank-votes" value={entry.votes} />
                      <span className="vote-overview__rank-share">{formatShare(entry.voteShare)}</span>
                      <span aria-hidden="true" className="vote-overview__rank-bar">
                        <span
                          className="vote-overview__rank-bar-fill"
                          style={{
                            width: `${Math.max(leaderVotes === 0 ? 0 : (entry.votes / leaderVotes) * 100, 2)}%`,
                          }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          <footer className="vote-overview__ticker vote-overview__animate">
            <p className="vote-overview__ticker-item">
              <span>Biggest climb</span>
              {biggestMover ? (
                <strong>
                  <CaretUp aria-hidden="true" size={12} weight="fill" />
                  {biggestMover.delta} · {biggestMover.entry.name}
                </strong>
              ) : (
                <strong>Standings holding steady</strong>
              )}
            </p>
            <p className="vote-overview__ticker-item">
              <span>Tightest race</span>
              {summary.tightestGap ? (
                <strong>
                  {summary.tightestGap.gap === 0
                    ? `Tied for ${summary.tightestGap.upper.rank}${summary.tightestGap.upper.rank === 1 ? 'st' : 'th'}`
                    : `${formatCount(summary.tightestGap.gap)} votes`}
                  {' · '}
                  {summary.tightestGap.upper.name} ↔ {summary.tightestGap.lower.name}
                </strong>
              ) : (
                <strong>—</strong>
              )}
            </p>
            <p aria-atomic="true" aria-live="polite" className="vote-overview__ticker-item vote-overview__live-status">
              <span>Last update</span>
              <strong>{timeFormatter.format(snapshot.updatedAt)}</strong>
            </p>
          </footer>
        </div>
      </div>

      <nav aria-label="Board controls" className="vote-overview__utility">
        <button className="vote-overview__utility-button" onClick={onBackToProgram} type="button">
          <ArrowLeft aria-hidden="true" size={14} weight="bold" />
          Back to {programName}
        </button>
        <button className="vote-overview__utility-button" onClick={onBackToHub} type="button">
          <House aria-hidden="true" size={14} weight="bold" />
          Festival Hub
        </button>
        <button
          className="vote-overview__utility-button"
          onClick={toggleFullscreen}
          title="Fill the screen for the wall feed"
          type="button"
        >
          <ArrowsOut aria-hidden="true" size={14} weight="bold" />
          Present
        </button>
      </nav>
    </div>
  );
}
