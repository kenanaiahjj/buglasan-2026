import { useEffect, useRef, useState, type Dispatch, type SyntheticEvent } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft';
import { House } from '@phosphor-icons/react/dist/icons/House';
import { ShareNetwork } from '@phosphor-icons/react/dist/icons/ShareNetwork';
import type { ContestArena } from '../data/pageant';
import { arenaDisplayName, type VoteEntry } from '../lib/arenaEntries';
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
          <p className="entry-profile__eyebrow">{programName}</p>
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
        <button onClick={onBackToProgram} type="button">
          <ArrowLeft aria-hidden="true" size={16} />
          <span>Back to {programName}</span>
        </button>
        <button onClick={onBackToHome} type="button">
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
          <p className="entry-profile__eyebrow">{programName}</p>
          <p className="entry-profile__number">Entry {entry.number}</p>
          <h1 id="entry-profile-title" ref={headingRef} tabIndex={-1}>{entry.name}</h1>
          <p className="entry-profile__origin">{entry.origin}</p>
          <p className="entry-profile__description">{entry.blurb}</p>

          <dl className="entry-profile__metadata">
            {entry.meta.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
            <div>
              <dt>Total votes</dt>
              <dd>{(tally ?? entry.votes).toLocaleString()} votes</dd>
            </div>
          </dl>

          <div className="entry-profile__actions">
            <button
              className="entry-profile__vote crown-button crown-floating-dots-button"
              onClick={() => setVoteOpen(true)}
              type="button"
            >
              <span>Vote for {entry.name}</span>
            </button>
            <button className="entry-profile__share" onClick={handleShare} type="button">
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
