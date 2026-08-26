import { describe, expect, it } from 'vitest';
import { interpolateCamera, progressForScroll, type CameraStop } from './landingSceneMath';

describe('landing scene math', () => {
  it('maps scroll positions to fractional chapter progress', () => {
    expect(progressForScroll(-20, [0, 100, 300])).toBe(0);
    expect(progressForScroll(50, [0, 100, 300])).toBe(0.5);
    expect(progressForScroll(150, [0, 100, 300])).toBe(1.25);
    expect(progressForScroll(500, [0, 100, 300])).toBe(2);
  });

  it('interpolates camera position, target, and field of view without mutating stops', () => {
    const stops: CameraStop[] = [
      { position: [0, 0, 0], target: [0, 1, -10], fov: 32 },
      { position: [10, 20, 30], target: [2, 3, -20], fov: 52 },
    ];
    const original = structuredClone(stops);

    expect(interpolateCamera(stops, 0.5)).toEqual({
      position: [5, 10, 15],
      target: [1, 2, -15],
      fov: 42,
    });
    expect(stops).toEqual(original);
  });
});
