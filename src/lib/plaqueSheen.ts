/**
 * One light over the whole row of plaques.
 *
 * The hero plaques are milled steel (see "PLAQUE MATERIAL" in `styles.css`),
 * and steel only reads as steel while the highlight on it moves. So there is
 * a lamp over the row, and every card is told where that lamp sits relative
 * to its own box, as `--sheen-x` / `--sheen-y`. Each one lights itself from
 * there, which is what makes four plaques read as one row under one lamp
 * rather than four separate widgets.
 *
 * The lamp does two things. Left alone it drifts — a slow figure the eye
 * never catches looping, because a highlight parked in one spot is a painted
 * highlight and the whole illusion rests on it moving. Bring the pointer near
 * the row and the lamp goes to the pointer instead: close up, the hand is the
 * more convincing light source.
 *
 * Nothing here is load-bearing. A coarse pointer has no hover to follow, and
 * reduced motion should not be handed a drifting highlight, so in both cases
 * this never attaches and the stylesheet's rest values stand — and those put
 * the light where the hero's own key light is, high and to the left.
 */

/** Where the lamp drifts around, in percentages of each card's own box.
 *  Matches the `--sheen-x` / `--sheen-y` declarations the stylesheet ships. */
const REST_X = 30;
const REST_Y = 14;

/** Amplitude and period of the idle drift. Slow and small on purpose: this
 *  should register as the light being alive, never as an animation playing.
 *  The two periods do not divide into each other, so the path does not
 *  visibly repeat. */
const DRIFT_X = 11;
const DRIFT_Y = 6;
const PERIOD_X = 14200;
const PERIOD_Y = 21700;

/** Radians of phase between neighbouring cards, so the row does not drift in
 *  lockstep — four highlights moving as one is a sheet of plastic, not four
 *  plaques catching the same lamp from four positions. */
const PHASE_STEP = 0.8;

/** How near the row the pointer must come before it takes over as the light,
 *  in pixels outside the row's own box. */
const CAPTURE = 220;

/** How far outside a card the lamp may still travel. Past this the highlight
 *  has left the surface anyway and the extra range only costs precision. */
const REACH = 90;

/** Fraction of the remaining distance covered each frame — low enough that
 *  the highlight lags the hand the way a heavy plate would. */
const FOLLOW = 0.16;

/** Idle frames are rate-limited to this, in ms. The drift is slow enough that
 *  nobody can tell, and it keeps four gradients from repainting at 60fps
 *  alongside the WebGL scene for the entire time the page is open. */
const IDLE_FRAME = 40;

type Plaque = {
  el: HTMLElement;
  /** Current, eased. */
  x: number;
  y: number;
  /** Phase offset for this card's share of the drift. */
  phase: number;
};

export function trackPlaqueSheen(row: HTMLElement): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    return () => undefined;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => undefined;
  }

  const plaques: Plaque[] = Array.from(row.querySelectorAll<HTMLElement>('.hero-arena-card')).map(
    (el, index) => ({ el, x: REST_X, y: REST_Y, phase: index * PHASE_STEP }),
  );
  if (plaques.length === 0) return () => undefined;

  let pointer: { x: number; y: number } | null = null;
  let frame = 0;
  let lastIdleFrame = 0;
  /* The row is the only thing this lights; scrolled away it has nothing to
     say. A background tab needs no handling of its own — the browser stops
     delivering frames, the pending one fires when the tab comes back, and the
     drift picks up from wherever the clock has got to. */
  let onScreen = true;

  const clamp = (value: number) => Math.max(-REACH, Math.min(100 + REACH, value));

  const tick = (now: number) => {
    frame = 0;
    if (!onScreen) return;

    /* Does the pointer own the light this frame? Only near the row: a pointer
       up in the header is not what is lighting a card at the bottom of the
       hero, and letting it drag the highlight from there made the row twitch
       every time the cursor crossed the page. */
    const rowBox = row.getBoundingClientRect();
    const near =
      pointer !== null &&
      pointer.x > rowBox.left - CAPTURE &&
      pointer.x < rowBox.right + CAPTURE &&
      pointer.y > rowBox.top - CAPTURE &&
      pointer.y < rowBox.bottom + CAPTURE;

    if (!near && now - lastIdleFrame < IDLE_FRAME) {
      schedule();
      return;
    }
    if (!near) lastIdleFrame = now;

    for (const plaque of plaques) {
      let targetX: number;
      let targetY: number;

      if (near && pointer !== null) {
        /* Measured per frame rather than cached: a hovered card lifts 18px
           and the row itself can be re-laid out by a resize. These are
           paint-only writes — custom properties feeding gradients — so the
           reads force no layout the writes below could dirty. */
        const box = plaque.el.getBoundingClientRect();
        targetX = box.width > 0 ? clamp(((pointer.x - box.left) / box.width) * 100) : REST_X;
        targetY = box.height > 0 ? clamp(((pointer.y - box.top) / box.height) * 100) : REST_Y;
      } else {
        targetX = REST_X + Math.sin((now / PERIOD_X) * Math.PI * 2 + plaque.phase) * DRIFT_X;
        targetY = REST_Y + Math.sin((now / PERIOD_Y) * Math.PI * 2 + plaque.phase * 1.7) * DRIFT_Y;
      }

      plaque.x += (targetX - plaque.x) * FOLLOW;
      plaque.y += (targetY - plaque.y) * FOLLOW;
      plaque.el.style.setProperty('--sheen-x', `${plaque.x.toFixed(2)}%`);
      plaque.el.style.setProperty('--sheen-y', `${plaque.y.toFixed(2)}%`);
    }

    /* The drift never finishes, so unlike a follow-the-pointer effect there is
       no settled state to stop at. Visibility is what stops this, not rest. */
    schedule();
  };

  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(tick);
  };

  const handleMove = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
  };

  /* Both matter: `pointerleave` on the document covers walking off the window
     edge, `blur` covers the tab losing focus mid-gesture, which fires no
     pointer event at all. */
  const handleLeave = () => {
    pointer = null;
  };

  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          ([entry]) => {
            onScreen = entry.isIntersecting;
            if (onScreen) schedule();
          },
          { rootMargin: '120px' },
        )
      : null;
  observer?.observe(row);

  window.addEventListener('pointermove', handleMove, { passive: true });
  document.addEventListener('pointerleave', handleLeave);
  window.addEventListener('blur', handleLeave);

  schedule();

  return () => {
    if (frame !== 0) cancelAnimationFrame(frame);
    observer?.disconnect();
    window.removeEventListener('pointermove', handleMove);
    document.removeEventListener('pointerleave', handleLeave);
    window.removeEventListener('blur', handleLeave);
    for (const plaque of plaques) {
      plaque.el.style.removeProperty('--sheen-x');
      plaque.el.style.removeProperty('--sheen-y');
    }
  };
}
