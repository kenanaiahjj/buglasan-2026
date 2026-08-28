import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * The vote cursor.
 *
 * A CSS `cursor: url(...)` is a static bitmap the compositor stamps under the
 * pointer — it cannot animate, cannot pick up the programme's colour, and
 * cannot lag behind the hand. So the real cursor is hidden over the plaques
 * and this follows instead: a gold pill that trails on a spring, banks into
 * the direction of travel, and carries a sweeping specular rim.
 *
 * The bitmap version stays in the stylesheet as the fallback. If this never
 * mounts — no JS, a coarse pointer, a browser that will not give us
 * `pointermove` — nothing marks the document and the old cursor is what
 * shows, so the affordance is never simply missing.
 */

/** Degrees of bank per pixel of horizontal travel, and the ceiling on it. */
const BANK_PER_PX = 0.55;
const BANK_LIMIT = 13;

export function VoteCursor() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    /* A finger has no hover state to follow, and a trackpad on a coarse
       display is the same story. Leave those to the native pointer. */
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return undefined;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const follow = { duration: reduceMotion ? 0 : 0.26, ease: 'power3.out' };
    const xTo = gsap.quickTo(root, 'x', follow);
    const yTo = gsap.quickTo(root, 'y', follow);
    const rotateTo = gsap.quickTo(root, 'rotate', { duration: 0.5, ease: 'power3.out' });

    document.documentElement.classList.add('has-vote-cursor');

    let active = false;
    let lastX: number | null = null;

    const setActive = (next: boolean) => {
      if (next === active) return;
      active = next;
      root.classList.toggle('is-active', next);
      if (!next) {
        rotateTo(0);
      }
    };

    const handleMove = (event: PointerEvent) => {
      xTo(event.clientX);
      yTo(event.clientY);

      const target = event.target instanceof Element ? event.target.closest('[data-vote-cursor]') : null;
      setActive(target !== null);

      if (target !== null) {
        /* Borrow whichever programme is under the pointer, so the pill is
           lit by the card it is standing on rather than by a fixed gold. */
        const accent = getComputedStyle(target).getPropertyValue('--arena-accent').trim();
        root.style.setProperty('--vote-cursor-accent', accent === '' ? '#f7d377' : accent);

        if (!reduceMotion && lastX !== null) {
          const bank = (event.clientX - lastX) * BANK_PER_PX;
          rotateTo(Math.max(-BANK_LIMIT, Math.min(BANK_LIMIT, bank)));
        }
      }

      lastX = event.clientX;
    };

    const handleLeave = () => {
      setActive(false);
      lastX = null;
    };

    const handleDown = () => root.classList.add('is-pressed');
    const handleUp = () => root.classList.remove('is-pressed');

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });
    window.addEventListener('blur', handleLeave);
    document.addEventListener('pointerleave', handleLeave);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('blur', handleLeave);
      document.removeEventListener('pointerleave', handleLeave);
      gsap.killTweensOf(root);
      document.documentElement.classList.remove('has-vote-cursor');
    };
  }, []);

  return (
    <div aria-hidden="true" className="vote-cursor" ref={rootRef}>
      <span className="vote-cursor__body">
        <span className="vote-cursor__glow" />
        <svg className="vote-cursor__spark" viewBox="0 0 24 24">
          <path
            d="M12 0.8c.7 5.6 2.3 8.3 7.9 9.4-5.6 1.1-7.2 3.8-7.9 9.4-.7-5.6-2.3-8.3-7.9-9.4C9.7 9.1 11.3 6.4 12 .8Z"
            fill="currentColor"
          />
        </svg>
        <span className="vote-cursor__pill">
          <span className="vote-cursor__rim" />
          <span className="vote-cursor__sheen" />
          <span className="vote-cursor__label">Vote now</span>
        </span>
      </span>
    </div>
  );
}
