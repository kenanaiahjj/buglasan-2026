import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BootState } from './siteBoot';

/**
 * The module holds one curtain for the life of the page, so every case here
 * needs a fresh copy of it — hence `resetModules` and a dynamic import rather
 * than a top-level one.
 *
 * Timing is the whole contract (a floor, a ceiling, a grace period for a
 * stage nobody claimed) and none of it is observable from a screenshot, so
 * the clock is faked and stepped by hand.
 */

type Boot = typeof import('./siteBoot');

/** Resolve/reject handles for the images the art gate preloads. */
let decoders: { resolve: () => void; reject: () => void }[] = [];
let fontsReady: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  decoders = [];

  class FakeImage {
    src = '';
    srcset = '';
    sizes = '';
    decode() {
      return new Promise<void>((resolve, reject) => {
        decoders.push({ resolve, reject: () => reject(new Error('404')) });
      });
    }
  }
  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });

  Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
  Object.defineProperty(document, 'fonts', {
    value: { ready: new Promise<void>((resolve) => { fontsReady = resolve; }) },
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Let queued promise callbacks run without advancing the clock. */
const flush = () => vi.advanceTimersByTimeAsync(0);

async function boot(): Promise<{ boot: Boot; state: () => BootState }> {
  const mod: Boot = await import('./siteBoot');
  let latest: BootState = { progress: 0, ready: false };
  mod.subscribeBoot((next) => { latest = next; });
  return { boot: mod, state: () => latest };
}

async function openEveryGate(mod: Boot) {
  fontsReady();
  for (const decoder of decoders) decoder.resolve();
  mod.resolveBootStage();
  await flush();
}

describe('site boot', () => {
  it('stays up until every gate has reported', async () => {
    const { boot: mod, state } = await boot();
    mod.claimBootStage();
    await flush();

    fontsReady();
    await flush();
    expect(state().ready).toBe(false);

    for (const decoder of decoders) decoder.resolve();
    await flush();
    expect(state().ready).toBe(false);

    // Bytes arriving is not the same as a scene that has parsed.
    mod.reportBootStage(1);
    await vi.advanceTimersByTimeAsync(600);
    expect(state().ready).toBe(false);

    mod.resolveBootStage();
    await vi.advanceTimersByTimeAsync(600);
    expect(state().ready).toBe(true);
    expect(state().progress).toBe(1);
  });

  it('holds for a minimum even when everything is already cached', async () => {
    const { boot: mod, state } = await boot();
    mod.claimBootStage();
    await openEveryGate(mod);

    expect(state().ready).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(state().ready).toBe(false);

    await vi.advanceTimersByTimeAsync(400);
    expect(state().ready).toBe(true);
  });

  it('lifts on the ceiling when the stage never arrives', async () => {
    const { boot: mod, state } = await boot();
    mod.claimBootStage();
    fontsReady();
    for (const decoder of decoders) decoder.resolve();
    await flush();

    await vi.advanceTimersByTimeAsync(11000);
    expect(state().ready).toBe(false);

    await vi.advanceTimersByTimeAsync(1500);
    expect(state().ready).toBe(true);
  });

  it('does not wait for a stage on a view that has none', async () => {
    const { boot: mod, state } = await boot();
    void mod;
    fontsReady();
    for (const decoder of decoders) decoder.resolve();
    await flush();
    expect(state().ready).toBe(false);

    // No claim, so the grace period closes the gate on its own.
    await vi.advanceTimersByTimeAsync(1600);
    expect(state().ready).toBe(true);
  });

  it('is not held up by art that fails to load', async () => {
    const { boot: mod, state } = await boot();
    mod.claimBootStage();
    fontsReady();
    for (const decoder of decoders) decoder.reject();
    mod.resolveBootStage();
    await vi.advanceTimersByTimeAsync(600);

    expect(state().ready).toBe(true);
  });

  it('never lets the meter run backwards, and spends most of it on the stage', async () => {
    const { boot: mod, state } = await boot();
    mod.claimBootStage();

    const seen: number[] = [];
    mod.subscribeBoot((next) => seen.push(next.progress));

    fontsReady();
    await flush();
    const afterFonts = state().progress;

    mod.reportBootStage(0.5);
    await flush();
    const afterHalfTheStage = state().progress;

    // Going backwards reads as a fault, so a late lower value is ignored.
    mod.reportBootStage(0.1);
    await flush();
    expect(state().progress).toBe(afterHalfTheStage);

    // Half the stage is worth more than the whole of fonts plus art.
    expect(afterHalfTheStage - afterFonts).toBeGreaterThan(afterFonts);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it('stops telling a listener anything once it has unsubscribed', async () => {
    const { boot: mod } = await boot();
    mod.claimBootStage();

    const heard: number[] = [];
    const stop = mod.subscribeBoot((next) => heard.push(next.progress));
    const initial = heard.length;

    stop();
    await openEveryGate(mod);
    await vi.advanceTimersByTimeAsync(600);

    expect(heard).toHaveLength(initial);
  });
});
