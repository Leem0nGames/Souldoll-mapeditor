/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WorldSeedConfig } from '../core/WorldSeed';
import type { Bounds2, Vec2, Vec3 } from '../core/WorldTypes';
import type { BiomeId, BiomeResolver } from '../biomes/BiomeDefinition';
import type { TerrainSampler } from '../terrain/TerrainData';
import type { ExclusionMask } from './ExclusionMask';

export type ScatterAssetType =
  | 'tree'
  | 'bush'
  | 'rock'
  | 'grass'
  | 'flower'
  | 'pebble'
  | 'mushroom'
  | 'herb'
  | 'crystal'
  | 'prop';

export type ScatterDistribution =
  | 'random'
  | 'grid'
  | 'cluster'
  | 'spline'
  | 'surface';

export interface ScatterBiomeRule {
  biomeId: BiomeId;
  densityMultiplier?: number;
  minDistanceMultiplier?: number;
  minScaleMultiplier?: number;
  maxScaleMultiplier?: number;
  variantWeights?: number[];
}

export interface ScatterDefinition {
  id: string;
  name: string;
  assetType: ScatterAssetType;
  distribution: ScatterDistribution;
  density: number;
  minScale: number;
  maxScale: number;
  minHeight: number;
  maxHeight: number;
  minSlope: number;
  maxSlope: number;
  minDistance: number;
  randomRotation: boolean;
  alignToNormal: boolean;
  forceWorldUp: boolean;
  clusterStrength: number;
  clusterScale: number;
  noiseStrength: number;
  seed: number;
  biomeCompatibility: BiomeId[];
  exclusionTags: string[];
  primary: boolean;
  enabled: boolean;
  variantCount?: number;
  variantWeights?: number[];
  biomeRules?: ScatterBiomeRule[];
  splinePath?: Vec2[];
  splineWidth?: number;
  shadow?: boolean;
}

export interface ScatterPlacement {
  assetType: ScatterAssetType;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
  normal: Vec3;
  groupId: string;
  variant: number;
  random: number;
  shadow: boolean;
}

export type ScatterBlockedFn = (x: number, z: number) => boolean;

export interface ScatterRequest {
  group: ScatterDefinition;
  bounds: Bounds2;
  terrain: TerrainSampler;
  biome: BiomeResolver;
  exclusions: ExclusionMask;
  seed: WorldSeedConfig;
  blocked?: ScatterBlockedFn;
}
