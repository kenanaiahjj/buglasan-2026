/**
 * The voting screen, one component for all four Buglasan programs.
 *
 * Hierarchy: the person came to spend a vote, so the grid of entries is the
 * page and everything else is support. The reference mockups gave four
 * equal-sized stat tiles the full width above the fold — total votes, total
 * entries, your vote, a "secure & verified" badge — which reads as a
 * dashboard when only one of those four is personal and actionable. Here the
 * one that changes (your remaining votes) is pinned in the bar where it stays
 * visible while you scroll the grid, and the rest collapse into a single
 * quiet line of context.
 *
 * Colour follows the site, not the arena. Each arena contributes one accent,
 * used only on state — the cast button, the rank bars, the voted ring — so
 * the four pages read as one product rather than four different sites.
 */

import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { Check } from '@phosphor-icons/react/dist/icons/Check';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/icons/MagnifyingGlass';
import type { ContestArena } from '../data/pageant';
import { ARENA_VOTING, entriesForArena, type VoteEntry } from '../lib/arenaEntries';
import type { ArenaId, VoterAction, VoterState } from '../state/voterState';

type SortKey = 'standing' | 'number' | 'name';

type Props = {
  arena: ContestArena;
  state: VoterState;
  dispatch: Dispatch<VoterAction>;
  onBack: () => void;
  onSwitchArena: (id: ArenaId) => void;
  arenas: ContestArena[];
};

const nf = new Intl.NumberFormat('en-US');

export function ArenaVotingPage({ arena, state, dispatch, onBack, onSwitchArena, arenas }: Props) {
  const cfg = ARENA_VOTING[arena.id];
  const entries = useMemo(() => entriesForArena(arena.id), [arena.id]);
  const tallies = state.arenaTallies[arena.id];
  const myVotes = state.arenaVotes[arena.id];

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('standing');
  const [pending, setPending] = useState<VoteEntry | null>(null);
  const [justVoted, setJustVoted] = useState<VoteEntry | null>(null);

  const remaining = Math.max(0, cfg.allowance - myVotes.length);
  const votingOpen = arena.votesOpen && remaining > 0;

  /* Live tallies drive both the grid and the standings, so rank is computed
     once here rather than in two places that could disagree. */
  const ranked = useMemo(() => {
    const withVotes = entries.map((e) => ({ ...e, votes: tallies[e.id] ?? e.votes }));
    const byVotes = [...withVotes].sort((a, b) => b.votes - a.votes);
    const rankOf = new Map(byVotes.map((e, i) => [e.id, i + 1]));
    const total = withVotes.reduce((sum, e) => sum + e.votes, 0);
    return { withVotes, byVotes, rankOf, total };
  }, [entries, tallies]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? ranked.withVotes.filter((e) =>
          [e.name, e.origin, e.blurb, e.number].some((f) => f.toLowerCase().includes(q)),
        )
      : ranked.withVotes;
    const sorted = [...matched];
    if (sort === 'standing') sorted.sort((a, b) => b.votes - a.votes);
    if (sort === 'number') sorted.sort((a, b) => a.number.localeCompare(b.number));
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [ranked, query, sort]);

  /* The undo window. A vote you can never take back makes people hesitate to
     cast one at all, so the confirmation stays live for a few seconds. */
  useEffect(() => {
    if (!justVoted) return undefined;
    const t = window.setTimeout(() => setJustVoted(null), 9000);
    return () => window.clearTimeout(t);
  }, [justVoted]);

  const confirmRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (pending) {
      confirmRef.current?.focus();
      return undefined;
    }
    lastTrigger.current?.focus();
    return undefined;
  }, [pending]);

  useEffect(() => {
    if (!pending) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPending(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  const askToVote = (entry: VoteEntry, trigger: HTMLElement) => {
    lastTrigger.current = trigger;
    setPending(entry);
  };

  const castVote = () => {
    if (!pending) return;
    dispatch({ type: 'castArenaVote', arenaId: arena.id, entryId: pending.id });
    setJustVoted(pending);
    setPending(null);
  };

  const undoVote = () => {
    if (!justVoted) return;
    dispatch({ type: 'undoArenaVote', arenaId: arena.id, entryId: justVoted.id });
    setJustVoted(null);
  };

  const leaderPct = ranked.byVotes[0]?.votes || 1;

  return (
    <div className="vote-page" style={{ ['--arena' as string]: arena.accentColor }}>
      {/* ---------------------------------------------------------- bar */}
      <header className="vote-bar">
        <button className="vote-bar__back" onClick={onBack} type="button">
          <ArrowLeft aria-hidden="true" size={15} weight="bold" />
          <span>Festival hub</span>
        </button>

        <nav className="vote-bar__arenas" aria-label="Switch program">
          {arenas.map((a) => (
            <button
              aria-current={a.id === arena.id ? 'page' : undefined}
              className={`vote-bar__arena${a.id === arena.id ? ' is-active' : ''}`}
              key={a.id}
              onClick={() => onSwitchArena(a.id)}
              type="button"
            >
              {a.shortTitle}
            </button>
          ))}
        </nav>

        {/* The one number that changes as you use the page, so it lives where
            it stays on screen instead of scrolling away with the stat tiles. */}
        <p className="vote-bar__wallet" aria-live="polite">
          {arena.votesOpen ? (
            remaining > 0 ? (
              <>
                <strong>{remaining}</strong>
                <span>
                  {remaining === 1 ? 'vote' : 'votes'} left
                  {cfg.allowance > 1 ? ` of ${cfg.allowance}` : ''}
                </span>
              </>
            ) : (
              <>
                <Check aria-hidden="true" size={14} weight="bold" />
                <span>Vote cast</span>
              </>
            )
          ) : (
            <span className="vote-bar__closed">Voting closed</span>
          )}
        </p>
      </header>

      {/* --------------------------------------------------------- hero */}
      <section className="vote-hero">
        <h1 className="vote-hero__title">{arena.shortTitle}</h1>
        <p className="vote-hero__prompt">{cfg.prompt}</p>

        {/* Context, demoted to one line. These numbers are worth knowing once,
            not worth four cards competing with the grid. */}
        <dl className="vote-hero__facts">
          <div>
            <dt>Dates</dt>
            <dd>{arena.dateRange}</dd>
          </div>
          <div>
            <dt>Total votes</dt>
            <dd>{nf.format(ranked.total)}</dd>
          </div>
          <div>
            <dt>{cfg.noun[0].toUpperCase() + cfg.noun.slice(1)}</dt>
            <dd>{entries.length}</dd>
          </div>
          <div>
            <dt>Leading</dt>
            <dd>{ranked.byVotes[0]?.name ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <div className="vote-body">
        {/* ------------------------------------------------------- grid */}
        <main className="vote-main">
          <div className="vote-toolbar">
            <label className="vote-search">
              <MagnifyingGlass aria-hidden="true" size={15} />
              <input
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${cfg.noun} or town…`}
                type="search"
                value={query}
                aria-label={`Search ${cfg.noun}`}
              />
            </label>

            <div className="vote-sort" role="group" aria-label="Sort entries">
              {(
                [
                  ['standing', 'Standing'],
                  ['number', 'Number'],
                  ['name', 'Name'],
                ] as Array<[SortKey, string]>
              ).map(([key, label]) => (
                <button
                  aria-pressed={sort === key}
                  className={`vote-sort__btn${sort === key ? ' is-active' : ''}`}
                  key={key}
                  onClick={() => setSort(key)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="vote-toolbar__count" aria-live="polite">
              {visible.length} of {entries.length}
            </p>
          </div>

          {visible.length === 0 ? (
            <p className="vote-empty">
              No {cfg.noun} match <strong>“{query}”</strong>.{' '}
              <button className="vote-empty__clear" onClick={() => setQuery('')} type="button">
                Clear search
              </button>
            </p>
          ) : (
            <ul className="vote-grid">
              {visible.map((entry) => {
                const voted = myVotes.includes(entry.id);
                const rank = ranked.rankOf.get(entry.id) ?? 0;
                const share = ranked.total ? (entry.votes / ranked.total) * 100 : 0;
                return (
                  <li
                    className={`vote-card${voted ? ' is-voted' : ''}`}
                    key={entry.id}
                  >
                    <div className="vote-card__frame">
                      {entry.image ? (
                        <img alt="" className="vote-card__img" loading="lazy" src={entry.image} />
                      ) : (
                        <span className="vote-card__img vote-card__img--none" aria-hidden="true" />
                      )}

                      {/* The sash: number and vote state in one mark, rather
                          than a number chip in one corner and a tick in the
                          other. It is the only element unique to this product. */}
                      <span className={`vote-sash${voted ? ' is-voted' : ''}`}>
                        <span className="vote-sash__num">{entry.number}</span>
                        {voted && <Check aria-hidden="true" size={11} weight="bold" />}
                      </span>

                      {rank <= 3 && arena.votesOpen && (
                        <span className={`vote-card__rank vote-card__rank--${rank}`}>#{rank}</span>
                      )}
                    </div>

                    <div className="vote-card__body">
                      <p className="vote-card__origin">{entry.origin}</p>
                      <h3 className="vote-card__name">{entry.name}</h3>
                      <p className="vote-card__blurb">{entry.blurb}</p>

                      <dl className="vote-card__meta">
                        {entry.meta.map((m) => (
                          <div key={m.label}>
                            <dt>{m.label}</dt>
                            <dd>{m.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="vote-card__foot">
                      {arena.votesOpen && (
                        <p className="vote-card__tally">
                          <strong>{nf.format(entry.votes)}</strong>
                          <span>{share.toFixed(1)}%</span>
                        </p>
                      )}
                      <button
                        className="vote-card__cta"
                        disabled={!votingOpen && !voted}
                        onClick={(e) => askToVote(entry, e.currentTarget)}
                        type="button"
                      >
                        {voted ? (
                          <>
                            <Check aria-hidden="true" size={14} weight="bold" /> Voted
                          </>
                        ) : !arena.votesOpen ? (
                          'Not yet open'
                        ) : remaining === 0 ? (
                          'No votes left'
                        ) : (
                          <>
                            {cfg.action} <ArrowRight aria-hidden="true" size={13} weight="bold" />
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        {/* ------------------------------------------------------- rail */}
        <aside className="vote-rail">
          <section className="vote-panel">
            <h2 className="vote-panel__title">Live standings</h2>
            <ol className="vote-standings">
              {ranked.byVotes.slice(0, 5).map((entry, i) => (
                <li className="vote-standing" key={entry.id}>
                  <span className={`vote-standing__pos vote-standing__pos--${i + 1}`}>{i + 1}</span>
                  <span className="vote-standing__id">
                    <strong>{entry.name}</strong>
                    <small>{entry.origin}</small>
                  </span>
                  <span className="vote-standing__num">{nf.format(entry.votes)}</span>
                  <span className="vote-standing__bar" aria-hidden="true">
                    <i style={{ width: `${(entry.votes / leaderPct) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="vote-panel vote-panel--how">
            <h2 className="vote-panel__title">How voting works</h2>
            <ol className="vote-how">
              <li>
                Find your {cfg.nounSingular} — search by name or town, or sort by sash number.
              </li>
              <li>
                Press <strong>{cfg.action}</strong> and confirm. You will be asked once.
              </li>
              <li>
                {cfg.allowance > 1
                  ? `You have ${cfg.allowance} votes in this program and may spend them on different ${cfg.noun}.`
                  : 'You have one vote in this program, and it cannot be moved once confirmed.'}
              </li>
            </ol>
          </section>
        </aside>
      </div>

      {/* ------------------------------------------------------ confirm */}
      {pending && (
        <div className="vote-modal" role="presentation" onClick={() => setPending(null)}>
          <div
            aria-labelledby="vote-modal-title"
            aria-modal="true"
            className="vote-modal__panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <p className="vote-modal__eyebrow">Confirm your vote</p>
            <h2 className="vote-modal__title" id="vote-modal-title">
              {pending.name}
            </h2>
            <p className="vote-modal__origin">{pending.origin}</p>
            <p className="vote-modal__warn">
              {cfg.allowance > 1
                ? `This spends one of your ${cfg.allowance} votes in this program. It cannot be moved once the undo window closes.`
                : 'This is your only vote in this program. It cannot be moved once the undo window closes.'}
            </p>
            <div className="vote-modal__actions">
              <button className="vote-modal__cancel" onClick={() => setPending(null)} type="button">
                Cancel
              </button>
              <button className="vote-modal__confirm" onClick={castVote} ref={confirmRef} type="button">
                <Check aria-hidden="true" size={15} weight="bold" />
                Cast my vote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- toast */}
      {justVoted && (
        <div className="vote-toast" role="status">
          <Check aria-hidden="true" size={15} weight="bold" />
          <p>
            Vote recorded for <strong>{justVoted.name}</strong>.
          </p>
          <button className="vote-toast__undo" onClick={undoVote} type="button">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
