/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSeededRng, deriveSeed, type WorldSeedConfig } from '../core/WorldSeed';
import type { Bounds2, Vec3 } from '../core/WorldTypes';
import type { BiomeResolver } from '../biomes/BiomeDefinition';
import type { TerrainSampler } from '../terrain/TerrainData';
import { ScatterDatabase } from './ScatterDatabase';
import type {
  ScatterBlockedFn,
  ScatterDefinition,
  ScatterPlacement,
  ScatterRequest,
} from './ScatterDefinition';
import type { ExclusionMask } from './ExclusionMask';
import {
  distanceToPolyline,
  pickWeightedVariant,
  scatterAcceptance,
  scatterCellSize,
  scatterJitter,
} from './ClusterGenerator';
import {
  evaluateScatterRules,
  getMaxScatterDensity,
  getMaxScatterMinDistance,
} from './ScatterRules';

function spatialKey(x: number, z: number, cellSize: number): string {
  return `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
}

export class ScatterGenerator {
  public readonly database: ScatterDatabase;
  public readonly seedConfig: WorldSeedConfig;
  public readonly algorithmVersion: number;

  constructor(database: ScatterDatabase, seedConfig: WorldSeedConfig, algorithmVersion = 1) {
    this.database = database;
    this.seedConfig = seedConfig;
    this.algorithmVersion = algorithmVersion;
  }

  public generate(request: ScatterRequest): ScatterPlacement[] {
    const { group, bounds, terrain, biome, exclusions, seed, blocked } = request;

    if (!group.enabled) return [];
    if (group.distribution === 'spline') {
      if (!group.splinePath || group.splinePath.length < 2) return [];
    }

    const maxDensity = getMaxScatterDensity(group);
    if (!(maxDensity > 0)) return [];

    const cellSize = scatterCellSize(maxDensity);
    const maxMinDistance = getMaxScatterMinDistance(group);
    const padding = maxMinDistance + cellSize;
    const gridSize = Math.max(0.5, maxMinDistance);
    const spatial = new Map<string, ScatterPlacement[]>();
    const placements: ScatterPlacement[] = [];

    const startX = Math.floor((bounds.minX - padding) / cellSize);
    const endX = Math.floor((bounds.maxX + padding) / cellSize);
    const startZ = Math.floor((bounds.minZ - padding) / cellSize);
    const endZ = Math.floor((bounds.maxZ + padding) / cellSize);

    for (let cellZ = startZ; cellZ <= endZ; cellZ++) {
      for (let cellX = startX; cellX <= endX; cellX++) {
        const cellSeed = deriveSeed(seed, {
          system: 'scatter',
          groupId: group.id,
          chunkX: cellX,
          chunkZ: cellZ,
        });
        const rng = createSeededRng(cellSeed);
        const x = (cellX + 0.5) * cellSize + scatterJitter(group, cellSize, rng());
        const z = (cellZ + 0.5) * cellSize + scatterJitter(group, cellSize, rng());

        if (group.distribution === 'spline' && group.splinePath) {
          const halfWidth = Math.max(0, (group.splineWidth ?? 1) * 0.5);
          if (distanceToPolyline(x, z, group.splinePath) > halfWidth) continue;
        }

        const terrainSample = terrain.sampleAt(x, z);
        const biomeSample = biome.sampleAt(x, z, terrainSample);
        const result = evaluateScatterRules({
          group,
          x,
          z,
          terrain: terrainSample,
          biomeId: biomeSample.biomeId,
          exclusions,
          blocked,
        });
        if (!result) continue;

        if (result.minDistance > 0) {
          let tooClose = false;
          const gx = Math.floor(x / gridSize);
          const gz = Math.floor(z / gridSize);
          for (let dz = -1; dz <= 1 && !tooClose; dz++) {
            for (let dx = -1; dx <= 1 && !tooClose; dx++) {
              const points = spatial.get(`${gx + dx},${gz + dz}`);
              if (!points) continue;
              for (let i = 0; i < points.length; i++) {
                const point = points[i];
                if (Math.hypot(point.x - x, point.z - z) < result.minDistance) {
                  tooClose = true;
                  break;
                }
              }
            }
          }
          if (tooClose) continue;
        }

        const chance = scatterAcceptance(group, result.density, maxDensity, x, z);
        if (rng() > chance) continue;

        const normal: Vec3 = group.alignToNormal
          ? { x: terrainSample.normalX, y: terrainSample.normalY, z: terrainSample.normalZ }
          : group.forceWorldUp
            ? { x: 0, y: 1, z: 0 }
            : { x: terrainSample.normalX, y: terrainSample.normalY, z: terrainSample.normalZ };

        const scale = result.minScale + (result.maxScale - result.minScale) * rng();
        const rotationY = group.randomRotation ? rng() * Math.PI * 2 : 0;
        const random = rng();
        const variantCount = Math.max(1, group.variantCount ?? 1);
        const variant = pickWeightedVariant(random, variantCount, result.variantWeights);

        const placement: ScatterPlacement = {
          assetType: group.assetType,
          x,
          y: terrainSample.height,
          z,
          rotationY,
          scale,
          normal,
          groupId: group.id,
          variant,
          random,
          shadow: group.shadow ?? group.primary,
        };

        if (maxMinDistance > 0) {
          const key = spatialKey(x, z, gridSize);
          const bucket = spatial.get(key);
          if (bucket) bucket.push(placement);
          else spatial.set(key, [placement]);
        }

        if (
          x >= bounds.minX &&
          x <= bounds.maxX &&
          z >= bounds.minZ &&
          z <= bounds.maxZ
        ) {
          placements.push(placement);
        }
      }
    }

    return placements;
  }

  public generateGroup(
    groupId: string,
    bounds: Bounds2,
    terrain: TerrainSampler,
    biome: BiomeResolver,
    exclusions: ExclusionMask,
    blocked?: ScatterBlockedFn
  ): ScatterPlacement[] {
    const group = this.database.require(groupId);
    return this.generate({
      group,
      bounds,
      terrain,
      biome,
      exclusions,
      seed: this.seedConfig,
      blocked,
    });
  }
}
