/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BiomeId } from '../biomes/BiomeDefinition';
import type { TerrainHeightSample } from '../terrain/TerrainData';
import type { ScatterBiomeRule, ScatterBlockedFn, ScatterDefinition } from './ScatterDefinition';
import type { ExclusionMask } from './ExclusionMask';

export interface ScatterRuleResult {
  density: number;
  minDistance: number;
  minScale: number;
  maxScale: number;
  variantWeights?: readonly number[];
}

export interface ScatterRuleContext {
  group: ScatterDefinition;
  x: number;
  z: number;
  terrain: TerrainHeightSample;
  biomeId: BiomeId;
  exclusions: ExclusionMask;
  blocked?: ScatterBlockedFn;
}

export function getScatterBiomeRule(
  group: ScatterDefinition,
  biomeId: BiomeId
): ScatterBiomeRule | undefined {
  const rules = group.biomeRules;
  if (!rules) return undefined;
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].biomeId === biomeId) return rules[i];
  }
  return undefined;
}

export function getMaxScatterDensity(group: ScatterDefinition): number {
  let maxDensity = Math.max(0, group.density);
  const rules = group.biomeRules;
  if (rules) {
    for (let i = 0; i < rules.length; i++) {
      const density = group.density * (rules[i].densityMultiplier ?? 1);
      if (density > maxDensity) maxDensity = density;
    }
  }
  return maxDensity;
}

export function getMaxScatterMinDistance(group: ScatterDefinition): number {
  let maxDistance = Math.max(0, group.minDistance);
  const rules = group.biomeRules;
  if (rules) {
    for (let i = 0; i < rules.length; i++) {
      const distance = group.minDistance * (rules[i].minDistanceMultiplier ?? 1);
      if (distance > maxDistance) maxDistance = distance;
    }
  }
  return maxDistance;
}

export function evaluateScatterRules(context: ScatterRuleContext): ScatterRuleResult | null {
  const { group, x, z, terrain, biomeId, exclusions, blocked } = context;

  if (!group.enabled) return null;
  if (group.biomeCompatibility.length > 0 && !group.biomeCompatibility.includes(biomeId)) {
    return null;
  }
  if (terrain.height < group.minHeight || terrain.height > group.maxHeight) return null;
  if (terrain.slope < group.minSlope || terrain.slope > group.maxSlope) return null;
  if (exclusions.isExcluded(x, z, group.exclusionTags)) return null;
  if (blocked && blocked(x, z)) return null;

  const rule = getScatterBiomeRule(group, biomeId);
  const density = group.density * (rule?.densityMultiplier ?? 1);
  if (!(density > 0)) return null;

  const minScale = Math.max(0.001, group.minScale * (rule?.minScaleMultiplier ?? 1));
  const maxScale = Math.max(0.001, group.maxScale * (rule?.maxScaleMultiplier ?? 1));

  return {
    density,
    minDistance: Math.max(0, group.minDistance * (rule?.minDistanceMultiplier ?? 1)),
    minScale: Math.min(minScale, maxScale),
    maxScale: Math.max(minScale, maxScale),
    variantWeights: rule?.variantWeights ?? group.variantWeights,
  };
}
