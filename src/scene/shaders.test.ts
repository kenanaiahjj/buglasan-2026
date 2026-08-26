import { describe, expect, it } from 'vitest';
import * as shaderSource from './shaders';

const { backdropFragmentShader, particleFragmentShader, particleVertexShader } = shaderSource;

describe('ambient sparkle particle shader', () => {
  it('builds a soft four-point sparkle instead of a circular square-edged mote', () => {
    expect(particleFragmentShader).toContain('float halo');
    expect(particleFragmentShader).toContain('float core');
    expect(particleFragmentShader).toContain('float rayX');
    expect(particleFragmentShader).toContain('float rayY');
    expect(particleFragmentShader).toContain('float rays');
    expect(particleFragmentShader).toContain('float twinkle');
    expect(particleFragmentShader).not.toContain('smoothstep(0.25, 0.0, d2)');
  });

  it('uses local smooth coordinates for the backdrop star field', () => {
    expect(backdropFragmentShader).toContain('vec2 starCell = fract(sp) - 0.5');
    expect(backdropFragmentShader).toContain('float starDistance');
    expect(backdropFragmentShader).toContain('float starCore');
    expect(backdropFragmentShader).toContain('float starRays');
    expect(backdropFragmentShader).toContain('float starMask');
    expect(backdropFragmentShader).not.toContain('float star = hash12(floor(sp));');
  });

  it('keeps sparkle positions anchored while preserving an in-place pulse', () => {
    expect(particleVertexShader).toContain('float pulse');
    expect(particleVertexShader).not.toContain('float angle = uTime');
    expect(particleVertexShader).not.toContain('mouseWorld');
    expect(particleVertexShader).not.toContain('pos.x += sin');
    expect(particleVertexShader).not.toContain('pos.y += sin');
  });

  it('keeps floating orbs as a separate drifting soft-glow layer', () => {
    const orbVertexShader = (shaderSource as Record<string, unknown>).floatingOrbVertexShader;
    const orbFragmentShader = (shaderSource as Record<string, unknown>).floatingOrbFragmentShader;

    expect(typeof orbVertexShader).toBe('string');
    expect(typeof orbFragmentShader).toBe('string');
    if (typeof orbVertexShader !== 'string' || typeof orbFragmentShader !== 'string') return;

    expect(orbVertexShader).toContain('float angle = uTime');
    expect(orbVertexShader).toContain('mouseWorld');
    expect(orbFragmentShader).toContain('float orb');
    expect(orbFragmentShader).toContain('exp(');
  });
});
