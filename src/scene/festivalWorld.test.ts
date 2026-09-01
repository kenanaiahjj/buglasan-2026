import { describe, expect, it } from 'vitest';
import * as festivalWorld from './festivalWorld';

describe('hero sheen shader injection', () => {
  it('declares the map UV helper after Three declares the map varying', () => {
    const injectHeroSheenShader = (festivalWorld as Record<string, unknown>).injectHeroSheenShader;

    expect(typeof injectHeroSheenShader).toBe('function');
    if (typeof injectHeroSheenShader !== 'function') return;

    const source = [
      '#include <common>',
      '#include <map_pars_fragment>',
      '#include <roughnessmap_fragment>',
      '#include <normal_fragment_maps>',
      '#include <opaque_fragment>',
    ].join('\n');

    const compiled = injectHeroSheenShader(source);

    expect(compiled.indexOf('vec2 bugSurfaceUv()')).toBeGreaterThan(
      compiled.indexOf('#include <map_pars_fragment>'),
    );
    expect(compiled).toContain('return vMapUv;');
    expect(compiled).toContain('fract(uSheenTime *');
    expect(compiled).toContain('outgoingLight *= 1.0 +');
  });
});
