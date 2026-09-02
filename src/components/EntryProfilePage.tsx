import { useEffect, useRef, useState, type Dispatch, type SyntheticEvent } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft';
import { House } from '@phosphor-icons/react/dist/icons/House';
import { ShareNetwork } from '@phosphor-icons/react/dist/icons/ShareNetwork';
import type { ContestArena } from '../data/pageant';
import { ARENA_VOTING, arenaDisplayName, type VoteEntry } from '../lib/arenaEntries';
import {
  shareEntryPage,
  type ShareEntryOutcome,
  type ShareEntryPayload,
} from '../lib/shareEntryPage';
import type { VoterAction } from '../state/voterState';
import { VoteFlowModal } from './VoteFlowModal';

type EntryProfilePageProps = {
  arena: ContestArena;
  entry: VoteEntry | null;
  tally: number | undefined;
  dispatch: Dispatch<VoterAction>;
  onBackToProgram: () => void;
  onBackToHome: () => void;
  shareEntry?: (payload: ShareEntryPayload) => Promise<ShareEntryOutcome>;
};

const entryImageAlt = (arenaId: ContestArena['id'], name: string, origin: string) => {
  if (arenaId === 'booths') return `${name} Buglasan booth representing ${origin}`;
  if (arenaId === 'festival') return `${name} festival contingent representing ${origin}`;
  return `${name} representing ${origin}`;
};

const replaceBrokenImage = (event: SyntheticEvent<HTMLImageElement>) => {
  const fallback = event.currentTarget.dataset.fallbackSrc;
  if (!fallback || event.currentTarget.getAttribute('src') === fallback) return;

  event.currentTarget.onerror = null;
  event.currentTarget.src = fallback;
};

const compactProgramName: Record<ContestArena['id'], string> = {
  hara: 'Hara',
  booths: 'LGU Booth',
  festival: 'Festivals',
  gandang: 'Gandang',
};

export function EntryProfilePage({
  arena,
  entry,
  tally,
  dispatch,
  onBackToProgram,
  onBackToHome,
  shareEntry = shareEntryPage,
}: EntryProfilePageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [voteOpen, setVoteOpen] = useState(false);
  const [shareOutcome, setShareOutcome] = useState<ShareEntryOutcome | null>(null);
  const programName = arenaDisplayName(arena);

  useEffect(() => {
    headingRef.current?.focus();
  }, [arena.id, entry?.id]);

  useEffect(() => {
    if (!entry) return undefined;

    const previousTitle = document.title;
    document.title = `${entry.name} · ${programName}`;

    return () => {
      document.title = previousTitle;
    };
  }, [entry, programName]);

  if (!entry) {
    return (
      <main
        className="entry-profile entry-profile--not-found"
        style={{ ['--arena' as string]: arena.accentColor }}
      >
        <section className="entry-profile__not-found">
          <p className="entry-profile__eyebrow">
            {arena.logo ? (
              /* Decorative: `alt=""` because the programme name is spelled out
                 beside it, and a described mark would have a screen reader say
                 it twice. Rendered only when the arena has one — Booths has no
                 mark, and the gallery's rule is the same, so the text carries
                 it there. Its own type is illegible at this size and does not
                 need to be legible; the name is right there. */
              <img
                alt=""
                className="entry-profile__crest"
                decoding="async"
                height={447}
                loading="eager"
                src={arena.logo}
                width={447}
              />
            ) : null}
            {programName}
          </p>
          <h1 ref={headingRef} tabIndex={-1}>Entry not found</h1>
          <p>This shared link no longer matches an entry in the current roster.</p>
          <div className="entry-profile__actions">
            <button onClick={onBackToProgram} type="button">Back to {programName}</button>
            <button onClick={onBackToHome} type="button">Home</button>
          </div>
        </section>
      </main>
    );
  }

  const shareUrl = window.location.href;
  const sharePayload = {
    title: `${entry.name} · ${programName}`,
    text: `View ${entry.name} and vote in ${programName}.`,
    url: shareUrl,
  };
  const imageSource = entry.image ?? entry.fallbackImage;

  const handleShare = async () => {
    setShareOutcome(await shareEntry(sharePayload));
  };

  const shareStatus = shareOutcome === 'copied'
    ? 'Link copied.'
    : shareOutcome === 'shared'
      ? 'Shared.'
      : shareOutcome === 'manual'
        ? 'Copy the link below.'
        : '';

  return (
    <main
      className={`entry-profile entry-profile--${arena.id} entry-profile--${arena.id === 'booths' || arena.id === 'festival' ? 'landscape' : 'portrait'}`}
      style={{ ['--arena' as string]: arena.accentColor }}
    >
      <nav aria-label={`${entry.name} navigation`} className="entry-profile__nav">
        <button
          aria-label={`Back to ${programName}`}
          className="entry-profile__nav-program"
          onClick={onBackToProgram}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          <span className="entry-profile__nav-program-full">{programName}</span>
          <span aria-hidden="true" className="entry-profile__nav-program-compact">
            {compactProgramName[arena.id]}
          </span>
        </button>
        <button className="entry-profile__nav-home" onClick={onBackToHome} type="button">
          <House aria-hidden="true" size={16} />
          <span>Home</span>
        </button>
      </nav>

      <article aria-labelledby="entry-profile-title" className="entry-profile__card">
        <div className="entry-profile__media">
          {imageSource ? (
            <img
              alt={entryImageAlt(arena.id, entry.name, entry.origin)}
              data-fallback-src={entry.fallbackImage}
              decoding="async"
              height={768}
              loading="eager"
              onError={entry.fallbackImage ? replaceBrokenImage : undefined}
              src={imageSource}
              width={768}
            />
          ) : (
            <div
              aria-label={`${entry.name} image unavailable`}
              className="entry-profile__image-placeholder"
              role="img"
            />
          )}
        </div>

        <div className="entry-profile__content">
          {/* A shared link can be someone's first contact with the festival,
              so the programme has to identify itself on sight rather than only
              in the small print. */}
          <p className="entry-profile__eyebrow">
            {arena.logo ? (
              /* Decorative: `alt=""` because the programme name is spelled out
                 beside it, and a described mark would have a screen reader say
                 it twice. Rendered only when the arena has one — Booths has no
                 mark, and the gallery's rule is the same, so the text carries
                 it there. Its own type is illegible at this size and does not
                 need to be legible; the name is right there. */
              <img
                alt=""
                className="entry-profile__crest"
                decoding="async"
                height={447}
                loading="eager"
                src={arena.logo}
                width={447}
              />
            ) : null}
            {programName}
          </p>

          {/* The number rides beside the name rather than sitting above it as
              its own labelled line — "#01", the way it is written on the
              roster card. It stays outside the heading so the heading is the
              name and nothing else, and it carries a hidden noun because "#01"
              alone is not something a screen reader can make sense of. */}
          <div className="entry-profile__title">
            <h1 id="entry-profile-title" ref={headingRef} tabIndex={-1}>{entry.name}</h1>
            <p className="entry-profile__number">
              <span className="visually-hidden">{`${ARENA_VOTING[arena.id].nounSingular} number `}</span>
              #{entry.number}
            </p>
          </div>
          <p className="entry-profile__origin">{entry.origin}</p>
          <p className="entry-profile__description">{entry.blurb}</p>

          {/* Rendered only when there is something to say. Two of the four
              arenas now have no facts beyond what the description carries, and
              an empty list still drew its own rules and spacing. */}
          {entry.meta.length > 0 && (
            <dl className="entry-profile__facts">
              {entry.meta.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* The one number on the page, so it is set as one rather than
              boxed up as a third identical stat card. */}
          <p className="entry-profile__tally">
            <strong>{(tally ?? entry.votes).toLocaleString()}</strong>
            <span>votes so far</span>
          </p>

          <div className="entry-profile__actions">
            <button
              className="entry-profile__vote crown-button crown-floating-dots-button"
              onClick={() => setVoteOpen(true)}
              type="button"
            >
              <span>Vote for {entry.name}</span>
            </button>
            <button
              className="entry-profile__share crown-button crown-button--quiet"
              onClick={handleShare}
              type="button"
            >
              <ShareNetwork aria-hidden="true" size={18} />
              <span>Share</span>
            </button>
          </div>

          <p aria-live="polite" className="entry-profile__share-status" role="status">
            {shareStatus}
          </p>
          {shareOutcome === 'manual' && (
            <label className="entry-profile__share-fallback">
              <span>Copy this link</span>
              <input
                className="entry-profile__share-url"
                onFocus={(event) => event.currentTarget.select()}
                readOnly
                value={shareUrl}
              />
            </label>
          )}
        </div>
      </article>

      {voteOpen && (
        <VoteFlowModal
          arena={arena}
          dispatch={dispatch}
          entryId={entry.id}
          mode="flow"
          onClose={() => setVoteOpen(false)}
        />
      )}
    </main>
  );
}
