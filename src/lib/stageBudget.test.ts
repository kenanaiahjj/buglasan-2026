import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldRenderStage } from './stageBudget';

function device({
  width = 1440,
  saveData = false,
  effectiveType = '4g',
  deviceMemory = 8 as number | undefined,
}: Partial<{ width: number; saveData: boolean; effectiveType: string; deviceMemory: number | undefined }> = {}) {
  vi.stubGlobal('navigator', { connection: { saveData, effectiveType }, deviceMemory });
  vi.stubGlobal('window', { innerWidth: width });
}

afterEach(() => vi.unstubAllGlobals());

describe('stage budget', () => {
  it('gives the stage to a desktop on a good connection', () => {
    device();
    expect(shouldRenderStage()).toBe(true);
  });

  it('withholds 8.7MB from a phone', () => {
    device({ width: 390 });
    expect(shouldRenderStage()).toBe(false);

    // The threshold is the one the scene's own quality switch already uses.
    device({ width: 779 });
    expect(shouldRenderStage()).toBe(false);
    device({ width: 780 });
    expect(shouldRenderStage()).toBe(true);
  });

  it('obeys Data Saver over a wide viewport, because that is a person asking', () => {
    device({ width: 1920, saveData: true });
    expect(shouldRenderStage()).toBe(false);
  });

  it('skips it only on a hopeless connection, not a merely busy one', () => {
    for (const effectiveType of ['slow-2g', '2g']) {
      device({ width: 1920, effectiveType });
      expect(shouldRenderStage()).toBe(false);
    }

    /* `3g` stays eligible on purpose. `effectiveType` is a coarse bucket and
       labels busy-but-capable links `3g` — excluding it took the hero away
       from desktops on ordinary connections. */
    for (const effectiveType of ['3g', '4g']) {
      device({ width: 1920, effectiveType });
      expect(shouldRenderStage()).toBe(true);
    }
  });

  it('skips it on a low-memory device', () => {
    device({ width: 1920, deviceMemory: 2 });
    expect(shouldRenderStage()).toBe(false);
    device({ width: 1920, deviceMemory: 4 });
    expect(shouldRenderStage()).toBe(true);
  });

  it('assumes capable when a signal is missing, because guessing wrong the other way is worse', () => {
    // No connection hints and no memory hint at all.
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', { innerWidth: 1440 });
    expect(shouldRenderStage()).toBe(true);
  });

  it('renders nothing without a window, rather than throwing', () => {
    vi.stubGlobal('window', undefined);
    expect(shouldRenderStage()).toBe(false);
  });
});
