import { describe, expect, it } from 'vitest';
import { getRenderPixelRatios } from './renderQuality';

describe('getRenderPixelRatios', () => {
  it('supersamples a DPR-1 overlay without increasing the atmosphere target', () => {
    expect(getRenderPixelRatios(1, 'high')).toEqual({ overlay: 1.25, scene: 1 });
  });

  it('keeps the overlay bounded on a high-DPR low-power device', () => {
    expect(getRenderPixelRatios(3, 'low')).toEqual({ overlay: 1.25, scene: 1 });
  });

  it('uses the tier caps for high and medium output', () => {
    expect(getRenderPixelRatios(3, 'high')).toEqual({ overlay: 2, scene: 1.75 });
    expect(getRenderPixelRatios(3, 'medium')).toEqual({ overlay: 1.5, scene: 1.25 });
  });

  it('normalizes invalid or sub-unit device ratios', () => {
    expect(getRenderPixelRatios(0, 'high')).toEqual({ overlay: 1.25, scene: 1 });
    expect(getRenderPixelRatios(Number.NaN, 'medium')).toEqual({ overlay: 1.25, scene: 1 });
  });
});
