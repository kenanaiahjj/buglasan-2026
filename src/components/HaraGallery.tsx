import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { ChartBar } from '@phosphor-icons/react/dist/icons/ChartBar';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/icons/MagnifyingGlass';
import { Question } from '@phosphor-icons/react/dist/icons/Question';
import { MapPin } from '@phosphor-icons/react/dist/icons/MapPin';
import { X } from '@phosphor-icons/react/dist/icons/X';
import { enter } from '../lib/enter';
import { ARENA_VOTING, arenaDisplayName, entriesForArena } from '../lib/arenaEntries';
import { filterHaraCandidates } from '../lib/haraGallery';
import { pageantContent, type ContestArena } from '../data/pageant';

type HaraGalleryProps = {
  arena: ContestArena;
  onBackToHub: () => void;
  onOpenOverview: () => void;
  onHowToVote: () => void;
  /**
   * Live counts, entryId → votes.
   *
   * Seeded from the same `votes` fields these cards used to read directly, so
   * the numbers are identical today — and correct once a server owns them,
   * which the static fields never will be.
   */
  tallies: Record<string, number>;
  /* The entry being backed, not the programme: on a subpage the vote starts
     in a dialog against one candidate rather than routing to a ballot. */
  onVote: (entryId: string) => void;
};

const titleCase = (word: string) => word[0].toUpperCase() + word.slice(1);

export function HaraGallery({ arena, onBackToHub, onHowToVote, onOpenOverview, onVote, tallies }: HaraGalleryProps) {
  const galleryRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const cfg = ARENA_VOTING[arena.id];
  const programName = arenaDisplayName(arena);
  const roster = useMemo(() => entriesForArena(arena.id), [arena.id]);
  const visibleCandidates = useMemo(
    () => filterHaraCandidates(roster, query),
    [roster, query],
  );

  // Search is per-programme state; switching programmes should not carry one
  // roster's query onto another.
  useEffect(() => {
    setQuery('');
  }, [arena.id]);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    return enter(
      gallery.querySelectorAll<HTMLElement>('.hara-gallery-card__motion'),
      { autoAlpha: 0, y: 28, scale: 0.96 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.72,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'opacity,visibility',
      },
    );
  }, []);

  return (
    <main
      className={`hara-gallery hara-gallery--${cfg.cardShape}`}
      ref={galleryRef}
      aria-label={`${programName} entries`}
    >
      <div className="hara-gallery__intro">
        {/* Two programmes have a supplied logo, two do not. The lockup is not a
            placeholder for the missing art — it is what those programmes get
            until real art exists, so the intro never renders as a bare toolbar. */}
        {arena.logo ? (
          <img
            alt={`${programName} 2026`}
            className="hara-gallery__logo"
            decoding="async"
            height={447}
            loading="eager"
            src={arena.logo}
            width={447}
          />
        ) : (
          <div className="hara-gallery__lockup">
            <h1>{programName}</h1>
            <p>{arena.subtitle}</p>
          </div>
        )}

        <div className="hara-gallery__support">
          <div className="hara-gallery__actions">
            <button className="hara-gallery__home crown-quiet-control" onClick={onBackToHub} type="button">
              <ArrowLeft aria-hidden="true" size={15} weight="bold" />
              <span>Back to home</span>
            </button>

            {/* A disclosure buried the steps under a click and then pushed
                the whole toolbar down when it opened. On a subpage the same
                click can open the dialog the steps describe. */}
            <button className="hara-gallery__how-to crown-quiet-control" onClick={onHowToVote} type="button">
              <Question aria-hidden="true" size={15} weight="bold" />
              <span>How to vote</span>
            </button>

            <button
              aria-label={`Open the ${programName} voting overview`}
              className="hara-gallery__overview crown-quiet-control"
              onClick={onOpenOverview}
              type="button"
            >
              <ChartBar aria-hidden="true" size={15} weight="bold" />
              <span>Overview</span>
            </button>
          </div>

          <p className="hara-gallery__status" role="status">
            <span className="hara-gallery__status-live">
              <span aria-hidden="true" />
              Voting is open
            </span>
            <span>Ends {pageantContent.votingDeadline}</span>
          </p>
        </div>
      </div>

      <div className="hara-gallery__toolbar">
        <label className="hara-gallery__search">
          <MagnifyingGlass aria-hidden="true" className="hara-gallery__search-icon" size={16} weight="bold" />
          <span className="visually-hidden">{`Search ${cfg.noun} or town`}</span>
          <input
            aria-label={`Search ${cfg.noun} or town`}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${cfg.noun} or town`}
            type="search"
            value={query}
          />
          {query.length > 0 && (
            <button
              aria-label="Clear search query"
              className="hara-gallery__search-clear"
              onClick={() => setQuery('')}
              type="button"
            >
              <X aria-hidden="true" size={13} weight="bold" />
            </button>
          )}
        </label>

      </div>

      {visibleCandidates.length === 0 ? (
        <p className="hara-gallery__empty" role="status">
          No {cfg.noun} match <strong>&ldquo;{query}&rdquo;</strong>.{' '}
          <button onClick={() => setQuery('')} type="button">
            Clear search
          </button>
        </p>
      ) : (
        <div className="hara-gallery__grid" aria-label={`${programName} entries`}>
          {visibleCandidates.map((candidate, index) => (
            <article
              className="hara-gallery-card"
              key={candidate.id}
            >
              <div className="hara-gallery-card__motion">
                <div className="hara-gallery-card__media">
                  <img
                    alt={`${candidate.name} representing ${candidate.origin}`}
                    decoding="async"
                    height={512}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    src={candidate.image ?? undefined}
                    width={512}
                  />
                  <span
                    aria-label={`${titleCase(cfg.nounSingular)} ${candidate.number}`}
                    className="hara-gallery-card__number"
                  >
                    {candidate.number}
                  </span>
                  <div className="hara-gallery-card__caption">
                    <span className="hara-gallery-card__location">
                      <MapPin aria-hidden="true" size={13} weight="fill" />
                      {candidate.origin}
                    </span>
                    <h2>{candidate.name}</h2>
                  </div>
                </div>

                <div className="hara-gallery-card__body">
                  {candidate.blurb && <p>{candidate.blurb}</p>}
                  <div className="hara-gallery-card__footer">
                    <span>{(tallies[candidate.id] ?? candidate.votes).toLocaleString()} votes</span>
                    <button
                      aria-label={`Vote for ${candidate.name}`}
                      className="crown-button crown-floating-dots-button subpage-vote-btn"
                      onClick={() => onVote(candidate.id)}
                      type="button"
                    >
                      <span>Vote for {candidate.name}</span>
                      <ArrowRight aria-hidden="true" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
