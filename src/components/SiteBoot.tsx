import { useEffect, useState } from 'react';
import { BUGLASAN_HERO_LOGO } from '../data/pageant';
import { useSiteBoot } from '../lib/siteBoot';

const MARK_ASPECT = BUGLASAN_HERO_LOGO.width / BUGLASAN_HERO_LOGO.height;

/**
 * The full-viewport loading screen.
 *
 * It draws the wordmark at exactly the geometry `.hero-boot__mark` uses, so
 * when the curtain fades the mark does not move: what is underneath is either
 * the same mark held by the stage's own boot layer or the 3D one that has
 * replaced it. The handover is a change of ground, not of subject.
 *
 * It unmounts rather than lingering at `opacity: 0` — a fixed, full-screen
 * element over the whole site is not something to leave lying around for the
 * rest of the session on the strength of `pointer-events: none`.
 */

/** Matches the CSS fade, so the node goes when it stops being visible. */
const FADE_MS = 700;

/**
 * Put every flat mark on the box the stage fits its 3D wordmark into, so they
 * are all the same rectangle.
 *
 * `.hero-boot__mark` was placed at a hard-coded 32.4% of the viewport with a
 * comment claiming that was where the rendered mark lands. It is not: the
 * stage fits the mark inside `[data-scene-anchor]` on whichever axis binds
 * first, and on a tall window that is some 90px higher. Nobody noticed while
 * the flat mark sat behind a translucent overlay; against a full-screen
 * curtain the two crossfade side by side and it reads as a double exposure.
 *
 * Three consumers now, not two: `.festival-scene__fallback-logo` was left on
 * the old constants and overhung the hero lockup by ~99px at 1440x900,
 * printing the sponsor credit across the bottom of the wordmark. So this
 * outliving the curtain (see below) is load-bearing for the fallback path,
 * which is permanent on any device the stage budget turns down — not just a
 * nicety for a lost canvas context.
 */
function syncMarkToStage() {
  const anchor = document.querySelector<HTMLElement>('[data-scene-anchor]');
  if (!anchor) return;

  const box = anchor.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) return;

  const root = document.documentElement;
  root.style.setProperty('--boot-mark-x', `${box.left + box.width / 2}px`);
  root.style.setProperty('--boot-mark-y', `${box.top + box.height / 2}px`);
  root.style.setProperty('--boot-mark-w', `${Math.min(box.width, box.height * MARK_ASPECT)}px`);
}

export function SiteBoot() {
  const { progress, ready } = useSiteBoot();
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    if (!ready) return undefined;
    const timer = window.setTimeout(() => setLifted(true), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  /* The page behind is fully laid out while this is up; without the lock a
     scroll during boot lands you halfway down a site you have not seen. */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('is-booting', !lifted);
    return () => root.classList.remove('is-booting');
  }, [lifted]);

  /* Re-measured on the three things that move the anchor: the first commit,
     a resize, and the webfont landing — type swapping is a relayout, and the
     hero column is type.

     Deliberately outlives the curtain. This component renders null once
     lifted rather than unmounting, so the listener stays and `.hero-boot__mark`
     keeps tracking the anchor for the rest of the session — which is what it
     wants if the canvas ever loses its context and the stage's own boot layer
     comes back. */
  useEffect(() => {
    syncMarkToStage();
    window.addEventListener('resize', syncMarkToStage);
    document.fonts?.ready.then(syncMarkToStage).catch(() => undefined);

    return () => {
      window.removeEventListener('resize', syncMarkToStage);
      const root = document.documentElement;
      root.style.removeProperty('--boot-mark-x');
      root.style.removeProperty('--boot-mark-y');
      root.style.removeProperty('--boot-mark-w');
    };
  }, []);

  if (lifted) return null;

  const percent = Math.min(100, Math.round(progress * 100));

  return (
    <div aria-busy={!ready} className={`site-boot${ready ? ' is-done' : ''}`} role="status">
      <img
        alt=""
        className="site-boot__mark"
        decoding="async"
        fetchPriority="high"
        height={BUGLASAN_HERO_LOGO.height}
        sizes={BUGLASAN_HERO_LOGO.sizes}
        src={BUGLASAN_HERO_LOGO.src}
        srcSet={BUGLASAN_HERO_LOGO.srcSet}
        width={BUGLASAN_HERO_LOGO.width}
      />
      <div className="site-boot__meter">
        <i style={{ width: `${percent}%` }} />
      </div>
      {/* Polite, and only the whole sentence — a live region ticking through
          every percentage point is a screen reader reading out a progress bar
          one number at a time. */}
      <p className="site-boot__label">{`Loading ${percent}%`}</p>
      <span className="visually-hidden" aria-live="polite">
        {ready ? 'Buglasan Festival 2026 is ready' : 'Loading Buglasan Festival 2026'}
      </span>
    </div>
  );
}
