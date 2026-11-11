/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Vec2 } from '../core/WorldTypes';
import type { TerrainHeightSample } from '../terrain/TerrainData';

export type BiomeId = string;

export type LegacyBiomeId =
  | 'meadow'
  | 'forest'
  | 'mountain'
  | 'snow'
  | 'swamp'
  | 'spectral'
  | 'coast'
  | 'river'
  | 'village'
  | 'lake';

export type MaterialId = string;
export type ScatterGroupId = string;

export interface BiomeDistanceCondition {
  center: Vec2;
  min?: number;
  max?: number;
}

export interface BiomeTerrainCondition {
  minElevation?: number;
  maxElevation?: number;
  minSlope?: number;
  maxSlope?: number;
  minMoisture?: number;
  maxMoisture?: number;
  minTemperature?: number;
  maxTemperature?: number;
  riverMaxDistance?: number;
  lakeMaxDistance?: number;
  minRadius?: number;
  maxRadius?: number;
  minX?: number;
  maxX?: number;
  minZ?: number;
  maxZ?: number;
  onBridge?: boolean;
  distance?: BiomeDistanceCondition;
  all?: BiomeTerrainCondition[];
  any?: BiomeTerrainCondition[];
  not?: BiomeTerrainCondition;
}

export interface BiomeEnvironment {
  x: number;
  z: number;
  elevation: number;
  slope: number;
  moisture: number;
  temperature: number;
  riverDistance: number;
  lakeDistance: number;
  radialDistance: number;
  onBridge: boolean;
}

export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  priority: number;
  enabled: boolean;
  seed: number;
  baseGroundMaterial: MaterialId;
  secondaryGroundMaterials: MaterialId[];
  vegetationGroups: ScatterGroupId[];
  detailGroups: ScatterGroupId[];
  density: number;
  minHeight: number;
  maxHeight: number;
  minSlope: number;
  maxSlope: number;
  groundColor: number;
  secondaryGroundColor?: number;
  tags: string[];
  rule: BiomeTerrainCondition;
}

export interface ResolvedBiomeSample {
  biomeId: BiomeId;
  weight: number;
  secondaryBiomeId?: BiomeId;
  blend: number;
}

export type BiomeEnvironmentSampler = (
  x: number,
  z: number,
  terrain: TerrainHeightSample
) => BiomeEnvironment;

export interface BiomeResolver {
  sampleAt(x: number, z: number, terrain: TerrainHeightSample): ResolvedBiomeSample;
  weightsAt(x: number, z: number, terrain: TerrainHeightSample): ReadonlyMap<BiomeId, number>;
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function matchesBiomeCondition(
  condition: BiomeTerrainCondition | undefined,
  environment: BiomeEnvironment
): boolean {
  if (!condition) return true;

  if (condition.all !== undefined) {
    for (let i = 0; i < condition.all.length; i++) {
      if (!matchesBiomeCondition(condition.all[i], environment)) return false;
    }
  }

  if (condition.any !== undefined) {
    let matched = false;
    for (let i = 0; i < condition.any.length; i++) {
      if (matchesBiomeCondition(condition.any[i], environment)) {
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }

  if (condition.not !== undefined && matchesBiomeCondition(condition.not, environment)) {
    return false;
  }

  if (
    condition.minElevation !== undefined &&
    environment.elevation < condition.minElevation
  ) {
    return false;
  }
  if (
    condition.maxElevation !== undefined &&
    environment.elevation > condition.maxElevation
  ) {
    return false;
  }
  if (condition.minSlope !== undefined && environment.slope < condition.minSlope) {
    return false;
  }
  if (condition.maxSlope !== undefined && environment.slope > condition.maxSlope) {
    return false;
  }
  if (
    condition.minMoisture !== undefined &&
    environment.moisture < condition.minMoisture
  ) {
    return false;
  }
  if (
    condition.maxMoisture !== undefined &&
    environment.moisture > condition.maxMoisture
  ) {
    return false;
  }
  if (
    condition.minTemperature !== undefined &&
    environment.temperature < condition.minTemperature
  ) {
    return false;
  }
  if (
    condition.maxTemperature !== undefined &&
    environment.temperature > condition.maxTemperature
  ) {
    return false;
  }
  if (
    condition.riverMaxDistance !== undefined &&
    environment.riverDistance > condition.riverMaxDistance
  ) {
    return false;
  }
  if (
    condition.lakeMaxDistance !== undefined &&
    environment.lakeDistance > condition.lakeMaxDistance
  ) {
    return false;
  }
  if (
    condition.minRadius !== undefined &&
    environment.radialDistance < condition.minRadius
  ) {
    return false;
  }
  if (
    condition.maxRadius !== undefined &&
    environment.radialDistance > condition.maxRadius
  ) {
    return false;
  }
  if (condition.minX !== undefined && environment.x < condition.minX) return false;
  if (condition.maxX !== undefined && environment.x > condition.maxX) return false;
  if (condition.minZ !== undefined && environment.z < condition.minZ) return false;
  if (condition.maxZ !== undefined && environment.z > condition.maxZ) return false;
  if (condition.onBridge !== undefined && environment.onBridge !== condition.onBridge) {
    return false;
  }

  if (condition.distance !== undefined) {
    const distance = Math.hypot(
      environment.x - condition.distance.center.x,
      environment.z - condition.distance.center.z
    );
    if (condition.distance.min !== undefined && distance < condition.distance.min) {
      return false;
    }
    if (condition.distance.max !== undefined && distance > condition.distance.max) {
      return false;
    }
  }

  return true;
}
