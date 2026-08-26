import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/icons/MagnifyingGlass';
import { MapPin } from '@phosphor-icons/react/dist/icons/MapPin';
import { enter } from '../lib/enter';
import { filterAndSortHaraCandidates, type HaraSortKey } from '../lib/haraGallery';
import { haraCandidates, pageantContent, type ContestArena } from '../data/pageant';

type HaraGalleryProps = {
  arena: ContestArena;
  onBackToHub: () => void;
  onVote: (id: ContestArena['id']) => void;
};

const cardRotations = [-1.2, 1.1, -0.6, 0.8, -1, 1.4, -0.7, 1, -0.9, 0.6, -0.5, 1.2];
const sortOptions: Array<[HaraSortKey, string]> = [
  ['votes', 'Most votes'],
  ['number', 'Candidate number'],
  ['name', 'Name'],
];

export function HaraGallery({ arena, onBackToHub, onVote }: HaraGalleryProps) {
  const galleryRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<HaraSortKey>('number');
  const visibleCandidates = useMemo(
    () => filterAndSortHaraCandidates(haraCandidates, query, sort),
    [query, sort],
  );

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
    <main className="hara-gallery" ref={galleryRef} aria-label="Hara sa Dumaguete contestants">
      <div className="hara-gallery__intro">
        {arena.logo && (
          <img
            alt="Hara sa Negros Oriental 2026"
            className="hara-gallery__logo"
            decoding="async"
            height={447}
            loading="eager"
            src={arena.logo}
            width={447}
          />
        )}

        <div className="hara-gallery__support">
          <div className="hara-gallery__actions">
            <button className="hara-gallery__home" onClick={onBackToHub} type="button">
              <ArrowLeft aria-hidden="true" size={15} weight="bold" />
              <span>Back to home</span>
            </button>

            <details className="hara-gallery__how-to">
              <summary>How to vote</summary>
              <ol>
                <li><strong>Sign in</strong> with your email or mobile number.</li>
                <li><strong>Choose</strong> the candidate you want to support.</li>
                <li><strong>Review</strong> your selection before submitting.</li>
                <li><strong>Confirm</strong> your vote in the voting room.</li>
              </ol>
            </details>
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
          <MagnifyingGlass aria-hidden="true" size={16} />
          <span className="visually-hidden">Search candidates or town</span>
          <input
            aria-label="Search candidates or town"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search candidates or town"
            type="search"
            value={query}
          />
        </label>

        <div className="hara-gallery__sort" aria-label="Sort candidates" role="group">
          {sortOptions.map(([key, label]) => (
            <button
              aria-pressed={sort === key}
              className={sort === key ? 'is-active' : undefined}
              key={key}
              onClick={() => setSort(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <p className="hara-gallery__count" aria-live="polite">
          {visibleCandidates.length} of {haraCandidates.length} candidates
        </p>
      </div>

      {visibleCandidates.length === 0 ? (
        <p className="hara-gallery__empty" role="status">
          No candidates match <strong>&ldquo;{query}&rdquo;</strong>.{' '}
          <button onClick={() => setQuery('')} type="button">
            Clear search
          </button>
        </p>
      ) : (
        <div className="hara-gallery__grid" aria-label="Hara sa Dumaguete contestants">
          {visibleCandidates.map((candidate, index) => (
            <article
              className="hara-gallery-card"
              key={candidate.id}
              style={{ '--hara-card-rotation': `${cardRotations[index]}deg` } as CSSProperties}
            >
              <div className="hara-gallery-card__motion">
                <div className="hara-gallery-card__media">
                  <img
                    alt={`${candidate.name} representing ${candidate.location}`}
                    decoding="async"
                    height={512}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    src={candidate.image}
                    width={512}
                  />
                  <span
                    aria-label={`Candidate ${candidate.number}`}
                    className="hara-gallery-card__number"
                  >
                    {candidate.number}
                  </span>
                  <div className="hara-gallery-card__caption">
                    <span className="hara-gallery-card__location">
                      <MapPin aria-hidden="true" size={13} weight="fill" />
                      {candidate.location}
                    </span>
                    <h2>{candidate.name}</h2>
                  </div>
                </div>

                <div className="hara-gallery-card__body">
                  {candidate.advocacy && <p>{candidate.advocacy}</p>}
                  <div className="hara-gallery-card__footer">
                    <span>{candidate.votes.toLocaleString()} votes</span>
                    <button
                      aria-label={`Vote for ${candidate.name}`}
                      className="subpage-vote-btn"
                      onClick={() => onVote(arena.id)}
                      type="button"
                    >
                      Vote for {candidate.name}
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
