import { Buildings } from '@phosphor-icons/react/dist/icons/Buildings';
import { Crown } from '@phosphor-icons/react/dist/icons/Crown';
import { Sparkle } from '@phosphor-icons/react/dist/icons/Sparkle';
import { Trophy } from '@phosphor-icons/react/dist/icons/Trophy';
import type { ContestArena } from '../data/pageant';

/*
 * A smooth rounded arch with the programme's mark standing in it.
 *
 * The two silhouette paths are the same outline — one filled, one stroked —
 * because a stroke that also carries the fill picks up half a pixel of fill
 * colour along its outer edge, which is exactly where a hairline cannot
 * afford to lose contrast.
 *
 * The bottom rule is separate and runs the full width: it is the card's
 * horizon rather than part of the arch, and the small chevron at its centre
 * is what keeps it from reading as a plain divider.
 *
 * The viewBox is 100x128 and is scaled with preserveAspectRatio="none". The
 * hero wrapper intentionally uses a slightly shorter ratio to keep the
 * programme index compact; `blockClass` names the BEM block so the two card
 * families can style the same drawing differently.
 */
const SILHOUETTE = 'M6 119V61C6 37 22 19 50 19C78 19 94 37 94 61V119Z';
const EDGE = 'M6 119V61C6 37 22 19 50 19C78 19 94 37 94 61V119';
const RULE = 'M0 119H43.5L50 126.5L56.5 119H100';

function Emblem({ icon }: { icon: ContestArena['icon'] }) {
  switch (icon) {
    case 'buildings':
      return <Buildings size={104} weight="thin" aria-hidden="true" />;
    case 'sparkle':
      return <Sparkle size={104} weight="thin" aria-hidden="true" />;
    case 'trophy':
      return <Trophy size={104} weight="thin" aria-hidden="true" />;
    default:
      return <Crown size={104} weight="thin" aria-hidden="true" />;
  }
}

export function ArchNiche({ arena, blockClass }: { arena: ContestArena; blockClass: string }) {
  return (
    <span className={`${blockClass}__niche`}>
      <svg aria-hidden="true" className={`${blockClass}__arch`} preserveAspectRatio="none" viewBox="0 0 100 128">
        <defs>
          {/* Barely-there weave — only a reason for the recess not to read as
              flat paint. Ids are per arena so four instances cannot collide. */}
          <pattern
            height="9"
            id={`niche-weave-${blockClass}-${arena.id}`}
            patternTransform="rotate(28)"
            patternUnits="userSpaceOnUse"
            width="9"
          >
            <path d="M0 0V9M0 0H9" stroke="currentColor" strokeWidth="0.35" />
          </pattern>
        </defs>

        <path className={`${blockClass}__arch-fill`} d={SILHOUETTE} />
        <path
          className={`${blockClass}__arch-weave`}
          d={SILHOUETTE}
          fill={`url(#niche-weave-${blockClass}-${arena.id})`}
        />
        <path className={`${blockClass}__arch-edge`} d={EDGE} fill="none" vectorEffect="non-scaling-stroke" />
        <path className={`${blockClass}__arch-rule`} d={RULE} fill="none" vectorEffect="non-scaling-stroke" />
      </svg>

      <span aria-hidden="true" className={`${blockClass}__crest`}>
        {arena.logo ? (
          <img alt="" className={`${blockClass}__logo`} height={447} loading="lazy" src={arena.logo} width={447} />
        ) : (
          <span className={`${blockClass}__emblem`}>
            <Emblem icon={arena.icon} />
          </span>
        )}
      </span>
    </span>
  );
}
