export type RenderQualityTier = 'high' | 'medium' | 'low';

export const TIER_DPR: Record<RenderQualityTier, number> = { high: 2, medium: 1.5, low: 1.25 };
export const TIER_SCENE_DPR: Record<RenderQualityTier, number> = { high: 1.75, medium: 1.25, low: 1 };
export const TIER_SCENE_SCALE: Record<RenderQualityTier, number> = { high: 1, medium: 0.85, low: 0.68 };

export function getRenderPixelRatios(devicePixelRatio: number, tier: RenderQualityTier) {
  const safeDevicePixelRatio = Number.isFinite(devicePixelRatio) ? Math.max(1, devicePixelRatio) : 1;

  return {
    overlay: Math.min(Math.max(safeDevicePixelRatio, 1.25), TIER_DPR[tier]),
    scene: Math.min(safeDevicePixelRatio, TIER_SCENE_DPR[tier]),
  };
}
