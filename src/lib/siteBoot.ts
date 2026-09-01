import { useEffect, useState } from 'react';
import { BUGLASAN_HERO_LOGO, contestArenas } from '../data/pageant';

/**
 * The curtain.
 *
 * The loading screen this replaces lived inside the WebGL stage — `position:
 * absolute` on `.festival-scene`, which is the background layer. So it covered
 * the 3D and nothing else: the header, the hero copy and the plaque row all
 * painted straight over the top of it while it was still saying "Loading". A
 * loading screen you can read the page through is not a loading screen, it is
 * a spinner sitting in the middle of a half-built site.
 *
 * This one is the whole viewport, and it lifts on four gates:
 *
 *   fonts   `document.fonts.ready`. Type reflowing after the reveal is the
 *           single most visible pop a page can make.
 *   art     the wordmark and the four programme marks, *decoded* rather than
 *           merely fetched — an image that has arrived but has not been
 *           decoded still paints a frame late.
 *   stage   the GLB behind the hero. It is most of the wait, so it is most of
 *           the meter: a bar that spends its travel on the fonts and then
 *           sits at 92% for eight seconds is a lie.
 *   page    `window.load` plus a couple of frames, which covers everything
 *           nobody thought to name here.
 *
 * Two clocks bound it. Nothing holds the curtain past CEILING_MS, because a
 * visitor on a slow connection is better served by a page whose 3D is still
 * arriving than by a progress bar they cannot get past — the stage keeps its
 * own in-canvas fallback for exactly that case. And nothing lifts it before
 * FLOOR_MS, so a warm cache reads as a deliberate open rather than a flash of
 * dark.
 */

export type BootState = { progress: number; ready: boolean };

/** What each gate is worth on the meter. */
const WEIGHT = { fonts: 0.08, art: 0.22, stage: 0.62, page: 0.08 } as const;
type Gate = keyof typeof WEIGHT;
const GATES = Object.keys(WEIGHT) as Gate[];

const CEILING_MS = 12000;
const FLOOR_MS = 500;

/** If nothing has claimed the stage by now, this view has no stage to wait
 *  for — the login wall and the dashboard both render without one. */
const CLAIM_MS = 1500;

/** Frames can stop arriving (a background tab), so every wait on one races a
 *  timer it cannot lose. */
const FRAME_FALLBACK_MS = 400;

/** Byte progress can reach the end of the download and still be a second away
 *  from a parsed scene, so it is not allowed to finish the gate on its own —
 *  only `resolveBootStage` closes it. */
const STAGE_CEILING = 0.98;

const filled: Record<Gate, number> = { fonts: 0, art: 0, stage: 0, page: 0 };
const listeners = new Set<(state: BootState) => void>();
const timers: number[] = [];

let started = false;
let ready = false;
let holding = false;
let stageClaimed = false;
let openedAt = 0;

function snapshot(): BootState {
  return {
    progress: ready ? 1 : GATES.reduce((sum, gate) => sum + WEIGHT[gate] * filled[gate], 0),
    ready,
  };
}

function emit() {
  const state = snapshot();
  for (const listener of listeners) listener(state);
}

/** Monotonic on purpose: a meter that goes backwards reads as a fault. */
function fill(gate: Gate, value: number) {
  if (ready) return;
  const next = Math.max(filled[gate], Math.min(1, value));
  if (next === filled[gate]) return;
  filled[gate] = next;
  if (GATES.every((each) => filled[each] >= 1)) finish();
  else emit();
}

function clearTimers() {
  for (const timer of timers) window.clearTimeout(timer);
  timers.length = 0;
}

function finish() {
  if (ready) return;

  const held = Date.now() - openedAt;
  if (held < FLOOR_MS) {
    if (holding) return;
    holding = true;
    timers.push(window.setTimeout(finish, FLOOR_MS - held));
    return;
  }

  ready = true;
  for (const gate of GATES) filled[gate] = 1;
  clearTimers();
  emit();
}

/** Two frames, or a timer, whichever comes first. */
function afterFrames(run: () => void) {
  let spent = false;
  const once = () => {
    if (spent) return;
    spent = true;
    run();
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(once));
  }
  timers.push(window.setTimeout(once, FRAME_FALLBACK_MS));
}

type Art = { src: string; srcSet?: string; sizes?: string };

const ART: Art[] = [
  { src: BUGLASAN_HERO_LOGO.src, srcSet: BUGLASAN_HERO_LOGO.srcSet, sizes: BUGLASAN_HERO_LOGO.sizes },
  ...contestArenas
    .map((arena) => arena.logo)
    .filter((logo): logo is string => typeof logo === 'string')
    .map((src) => ({ src })),
];

function preloadArt() {
  if (ART.length === 0) {
    fill('art', 1);
    return;
  }

  let settled = 0;
  const step = () => {
    settled += 1;
    fill('art', settled / ART.length);
  };

  for (const art of ART) {
    const image = new Image();
    /* srcSet and sizes together, so the browser warms the same file it will
       later paint rather than the 3198px original. */
    if (art.srcSet !== undefined) {
      image.sizes = art.sizes ?? '';
      image.srcset = art.srcSet;
    }
    image.src = art.src;

    const decoded =
      typeof image.decode === 'function'
        ? image.decode()
        : new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = reject;
          });

    /* Both arms step the gate. A mark that 404s is a missing logo, not a
       reason to strand every visitor on the loading screen. */
    decoded.then(step, step);
  }
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  openedAt = Date.now();

  const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (fonts?.ready) fonts.ready.then(() => fill('fonts', 1), () => fill('fonts', 1));
  else fill('fonts', 1);

  preloadArt();

  if (document.readyState === 'complete') afterFrames(() => fill('page', 1));
  else window.addEventListener('load', () => afterFrames(() => fill('page', 1)), { once: true });

  timers.push(
    window.setTimeout(() => {
      if (!stageClaimed) fill('stage', 1);
    }, CLAIM_MS),
  );

  timers.push(
    window.setTimeout(() => {
      for (const gate of GATES) filled[gate] = 1;
      openedAt = Math.min(openedAt, Date.now() - FLOOR_MS);
      finish();
    }, CEILING_MS),
  );
}

/** Called by whichever view is going to mount the 3D stage, so the gate knows
 *  to wait for something that has not started downloading yet. */
export function claimBootStage() {
  stageClaimed = true;
}

/** Bytes of the GLB, 0..1. */
export function reportBootStage(progress: number) {
  stageClaimed = true;
  fill('stage', progress * STAGE_CEILING);
}

/** The scene resolved — loaded or failed. Either way the wait is over. */
export function resolveBootStage() {
  stageClaimed = true;
  fill('stage', 1);
}

export function subscribeBoot(listener: (state: BootState) => void): () => void {
  start();
  listeners.add(listener);
  listener(snapshot());
  return () => {
    listeners.delete(listener);
  };
}

export function useSiteBoot(): BootState {
  const [state, setState] = useState<BootState>(snapshot);
  useEffect(() => subscribeBoot(setState), []);
  return state;
}
