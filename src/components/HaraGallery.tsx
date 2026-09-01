import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { ChartBar } from '@phosphor-icons/react/dist/icons/ChartBar';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/icons/MagnifyingGlass';
import { Question } from '@phosphor-icons/react/dist/icons/Question';
import { X } from '@phosphor-icons/react/dist/icons/X';
import { enter } from '../lib/enter';
import { ARENA_VOTING, arenaDisplayName, entriesForArena } from '../lib/arenaEntries';
import { entryHash } from '../lib/entryRoutes';
import { VoteCursor } from './VoteCursor';
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
  /** Open one entry's shareable profile page. */
  onOpenEntry: (entryId: string) => void;
};

const titleCase = (word: string) => word[0].toUpperCase() + word.slice(1);

const entryImageAlt = (arena: ContestArena['id'], name: string, origin: string) => {
  if (arena === 'booths') return 'Past Buglasan booth photo';
  if (arena === 'festival') return 'Past Buglasan festival contingent photo';
  return `${name} representing ${origin}`;
};

const handleEntryImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const fallbackSrc = event.currentTarget.dataset.fallbackSrc;
  if (!fallbackSrc || event.currentTarget.getAttribute('src') === fallbackSrc) return;

  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackSrc;
};

export function HaraGallery({ arena, onBackToHub, onHowToVote, onOpenEntry, onOpenOverview, tallies }: HaraGalleryProps) {
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
      {/* The same follower the hero uses over its plaques. It gates itself on
          a fine pointer, so on a touch screen it never mounts and the cards
          keep their visible button instead. */}
      <VoteCursor />
      <div className="hara-gallery__intro">
        <nav aria-label={`${programName} navigation`} className="hara-gallery__actions">
          <button className="hara-gallery__home crown-quiet-control" onClick={onBackToHub} type="button">
            <span>Home</span>
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
        </nav>

        {/* Programmes with an emblem or supplied mark render .hara-gallery__logo.
            When a programme has no mark, or when its supplied mark is an emblem
            without type (Festival of Festivals), .hara-gallery__lockup renders the
            title and subtitle so the programme name is always clear and legible. */}
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
        ) : null}

        {(!arena.logo || arena.id === 'festival') && (
          <div className="hara-gallery__lockup">
            <h1>{programName}</h1>
            <p>{arena.subtitle}</p>
          </div>
        )}

        <div className="hara-gallery__support">
          <p className="hara-gallery__status" role="status">
            <span className="hara-gallery__status-live">
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
              aria-labelledby={`${candidate.id}-name`}
              className="hara-gallery-card"
              data-vote-cursor
              key={candidate.id}
            >
              <div className="hara-gallery-card__motion">
                <div className="hara-gallery-card__media">
                  <img
                    alt={entryImageAlt(arena.id, candidate.name, candidate.origin)}
                    data-fallback-src={candidate.fallbackImage}
                    decoding="async"
                    height={512}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    onError={candidate.fallbackImage ? handleEntryImageError : undefined}
                    src={candidate.image ?? undefined}
                    width={512}
                  />
                  {/* `aria-label` was on this span, and a span carries the
                      generic role, which does not take a name — browsers are
                      free to ignore it, and Chrome does, so this announced as
                      a bare "01". Real text, hidden visually, always works. */}
                  <span className="hara-gallery-card__number">
                    <span className="visually-hidden">{`${titleCase(cfg.nounSingular)} `}</span>
                    {candidate.number}
                  </span>
                  <div className="hara-gallery-card__caption">
                    <span className="hara-gallery-card__location">{candidate.origin}</span>
                    <h2 id={`${candidate.id}-name`}>{candidate.name}</h2>
                  </div>
                </div>

                <div className="hara-gallery-card__body">
                  {candidate.blurb && <p>{candidate.blurb}</p>}
                  <div className="hara-gallery-card__footer">
                    <span>{(tallies[candidate.id] ?? candidate.votes).toLocaleString()} votes</span>
                    {/* Decorative. The whole card is the link (`__surface`
                        below), so this is the affordance drawn for people who
                        have no cursor to change — it is hidden wherever the
                        follower cursor runs. A `span`, not an anchor: two
                        anchors to the same place is two tab stops and two
                        announcements of one thing. */}
                    <span
                      aria-hidden="true"
                      className="crown-button crown-floating-dots-button subpage-entry-link"
                    >
                      <span>View {candidate.name}</span>
                      <ArrowRight aria-hidden="true" size={14} />
                    </span>
                  </div>
                </div>
              </div>

              {/*
               * The card *is* the link — the whole surface, and the only one.
               *
               * It began as a `::after` on the button, stretched with
               * `inset: 0`. That is the standard trick and it does not survive
               * this button: `.crown-floating-dots-button` sets `position:
               * relative`, `overflow: hidden`, `isolation: isolate` and a
               * `filter`, and any one of those either makes the button the
               * pseudo's containing block or clips the pseudo to it. Three of
               * the four were overridden and the hit area still came out
               * button-sized.
               *
               * Its own element has none of that inherited baggage, and being
               * a real anchor means middle-click and open-in-new-tab work from
               * anywhere on the card — which matters for a page whose whole
               * purpose is being shared.
               *
               * It carries the accessible name because it is the control. The
               * visible pill above is `aria-hidden`, so this is the card's
               * single tab stop at every width, including the widths where the
               * pill is not drawn at all.
               */}
              <a
                className="hara-gallery-card__surface"
                href={entryHash(arena.id, candidate.id)}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenEntry(candidate.id);
                }}
              >
                <span className="visually-hidden">{`View ${candidate.name}`}</span>
              </a>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
