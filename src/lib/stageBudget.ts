/**
 * Whether this device should get the WebGL stage at all.
 *
 * The stage is an 8.1MB GLB plus ~650KB of three.js — about 8.7MB before the
 * hero has drawn anything. On a desktop that is a one-off cost for the piece
 * the whole page is built around. On a phone on mobile data it is most of the
 * page weight, spent on a hero that is one non-scrolling screen showing a
 * wordmark that `SceneFallback` already renders as a 30KB image.
 *
 * `lowPower` inside the scene reduces *quality* — fewer landmarks, fewer orbs,
 * a smaller raster. It does not stop the download, because by the time it runs
 * the chunk and the model are already on the wire. This decides earlier.
 *
 * Deliberately conservative: when a signal is missing, assume the device can
 * cope. The failure mode of guessing "cannot" is a visitor on a good desktop
 * connection being shown the fallback forever, which is worse than a slow load.
 */

/** The width the scene's own `lowPower` switch already uses. One threshold. */
const STAGE_MIN_WIDTH = 780;

type Connection = {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorWithHints = Navigator & {
  connection?: Connection;
  /** GB of RAM, quantised. Chromium only. */
  deviceMemory?: number;
};

/**
 * Connections on which 8.7MB is simply not a reasonable thing to ask for.
 *
 * `3g` is deliberately **not** here. `effectiveType` is a coarse bucket derived
 * from observed round-trip and throughput, and it labels plenty of capable
 * links `3g` the moment they are busy — this very browser reports `3g` at
 * 1.25 Mbps on a desktop. Excluding it cost every such visitor the hero for the
 * whole session, which is a worse trade than a slow load. The width check below
 * is what does the real work; this list is only for the hopeless cases.
 */
const SLOW_TYPES = new Set(['slow-2g', '2g']);

export function shouldRenderStage(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const nav = navigator as NavigatorWithHints;

  /* Data Saver is an explicit instruction from the person using the device.
     It outranks every other signal here, including a wide viewport. */
  if (nav.connection?.saveData === true) return false;

  if (SLOW_TYPES.has(nav.connection?.effectiveType ?? '')) return false;

  /* 2GB or less: a low-end phone, where decoding the model is as expensive as
     fetching it. `?? 8` so a browser that does not report memory is trusted. */
  if ((nav.deviceMemory ?? 8) <= 2) return false;

  /* `innerWidth`, not `matchMedia`. A media query is the idiomatic way to ask
     and the wrong tool here: implementations that stub it answer `false` to
     everything, which silently withholds the stage from every caller rather
     than failing loudly. jsdom does exactly that, so the whole suite ran
     against the fallback until this was a number comparison. */
  return window.innerWidth >= STAGE_MIN_WIDTH;
}
