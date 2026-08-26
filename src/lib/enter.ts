import gsap from 'gsap';

/**
 * A GSAP entrance that can never leave its content hidden.
 *
 * `gsap.from` and `gsap.fromTo` apply their start state the instant the tween
 * is created. GSAP's ticker runs on `requestAnimationFrame`, so anything that
 * renders without frames — a background tab, Chrome's prerender, a headless
 * capture, a throttled low-power window — creates the tween, paints
 * `opacity: 0`, and then never advances it. The section ships blank.
 *
 * So: the markup is visible by default, the animation only starts once the
 * document is genuinely being painted, and a plain `setTimeout` (which is not
 * rAF-driven) clears the inline styles if the tween somehow stalls anyway.
 *
 * Returns a cleanup function for use as an effect teardown.
 */
export function enter(
  targets: gsap.TweenTarget,
  from: gsap.TweenVars,
  to: gsap.TweenVars,
): () => void {
  if (typeof document === 'undefined') return () => undefined;

  const CLEARED = 'opacity,transform,visibility';
  let tween: gsap.core.Tween | null = null;
  let safety = 0;

  const play = () => {
    tween = gsap.fromTo(targets, from, { ...to, clearProps: to.clearProps ?? CLEARED });
    safety = window.setTimeout(() => {
      if (!tween || tween.progress() >= 1) return;
      tween.kill();
      gsap.set(targets, { clearProps: CLEARED });
    }, 3000);
  };

  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', onVisible);
    play();
  };

  if (document.visibilityState === 'visible') play();
  else document.addEventListener('visibilitychange', onVisible);

  return () => {
    window.clearTimeout(safety);
    document.removeEventListener('visibilitychange', onVisible);
    tween?.kill();
  };
}
