import { useRef } from 'react';
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight';
import { gsap } from 'gsap';
import type { ContestArena } from '../data/pageant';

type ContestCardProps = {
  arena: ContestArena;
  index: number;
  onEnter: (id: ContestArena['id']) => void;
  onVote: () => void;
};

export function ContestCard({ arena, index, onEnter, onVote }: ContestCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const enterBtnRef = useRef<HTMLButtonElement>(null);

  /**
   * Tilt, spotlight and magnetic button.
   *
   * `gsap.to` allocates a fresh tween on every pointermove; `quickTo` reuses
   * one per property, which is the difference between a few hundred tweens a
   * second across four cards and none. The setters are created lazily so the
   * refs are attached by the time they bind.
   */
  const setters = useRef<Record<string, (value: number) => void>>({});

  const setter = (key: string, target: Element, prop: string, vars: gsap.TweenVars) => {
    const cached = setters.current[key];
    if (cached) return cached;
    const created = gsap.quickTo(target, prop, vars);
    setters.current[key] = created;
    return created;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty('--spotlight-x', `${x}px`);
    card.style.setProperty('--spotlight-y', `${y}px`);

    const tilt = { duration: 0.35, ease: 'power2.out', transformPerspective: 1000 };
    setter('rx', card, 'rotateX', tilt)(((y - rect.height / 2) / (rect.height / 2)) * -5);
    setter('ry', card, 'rotateY', tilt)(((x - rect.width / 2) / (rect.width / 2)) * 5);
    setter('sc', card, 'scale', { duration: 0.35, ease: 'power2.out' })(1.015);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    const tilt = { duration: 0.35, ease: 'power2.out', transformPerspective: 1000 };
    setter('rx', card, 'rotateX', tilt)(0);
    setter('ry', card, 'rotateY', tilt)(0);
    setter('sc', card, 'scale', { duration: 0.35, ease: 'power2.out' })(1);
  };

  const handleBtnMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = enterBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const magnet = { duration: 0.25, ease: 'power2.out' };
    setter('bx', btn, 'x', magnet)((e.clientX - rect.left - rect.width / 2) * 0.3);
    setter('by', btn, 'y', magnet)((e.clientY - rect.top - rect.height / 2) * 0.3);
  };

  const handleBtnMouseLeave = () => {
    const btn = enterBtnRef.current;
    if (!btn) return;
    const magnet = { duration: 0.25, ease: 'power2.out' };
    setter('bx', btn, 'x', magnet)(0);
    setter('by', btn, 'y', magnet)(0);
  };

  return (
    <article
      className={`contest-screen-card contest-screen-card--${arena.id}${arena.logo ? ' has-program-logo' : ''}`}
      data-reveal
      id={`contest-card-${arena.id}`}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={cardRef}
    >
      <div className="contest-screen-card__spotlight" aria-hidden="true" />
      <div className="contest-screen-card__backdrop" aria-hidden="true">
        <span className="contest-screen-card__glow" />
        <span className="contest-screen-card__watermark">{String(index + 1).padStart(2, '0')}</span>
      </div>

      <div className="contest-screen-card__header">
        {arena.logo && (
          <img
            alt=""
            aria-hidden="true"
            className="contest-screen-card__logo"
            height={160}
            loading="lazy"
            src={arena.logo}
            width={160}
          />
        )}
        <h3 className="contest-screen-card__title">
          {arena.shortTitle}
        </h3>
        <p className="contest-screen-card__tagline">{arena.tagline}</p>
      </div>

      <p className="contest-screen-card__desc">{arena.description}</p>

      <div className="contest-screen-card__meta">
        <div>
          <span>Entries</span>
          <strong>{arena.totalEntries} Official</strong>
        </div>
        <div>
          <span>Venue</span>
          <strong title={arena.venue}>{arena.venue.split('&')[0]}</strong>
        </div>
        <div>
          <span>Schedule</span>
          <strong>{arena.dateRange}</strong>
        </div>
      </div>

      <div className="contest-screen-card__actions">
        <button
          className="contest-screen-card__btn contest-screen-card__btn--enter"
          onClick={() => onEnter(arena.id)}
          onMouseLeave={handleBtnMouseLeave}
          onMouseMove={handleBtnMouseMove}
          ref={enterBtnRef}
          type="button"
          aria-label={`View ${arena.title} program`}
        >
          <span>View program</span>
          <ArrowRight aria-hidden="true" size={16} weight="bold" />
        </button>
        {arena.votesOpen && (
          <button
            className="contest-screen-card__btn contest-screen-card__btn--vote"
            onClick={onVote}
            type="button"
            aria-label={`Cast vote for ${arena.shortTitle}`}
          >
            Vote Now
          </button>
        )}
      </div>
    </article>
  );
}
