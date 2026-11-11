/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BiomeDefinition, BiomeMask, BiomeSpline } from '../biomes';
import type { ScatterDefinition } from '../scatter/ScatterDefinition';
import type { TerrainStamp } from '../terrain/TerrainStamp';
import type { WorldSpline } from '../splines/WorldSpline';
import type { WorkZone } from './WorkZone';
import type { WorldSeedConfig } from './WorldSeed';
import type { Bounds2 } from './WorldTypes';

export type WorldId = string;

export interface WorldExclusion {
  id: string;
  bounds?: Bounds2;
  splineId?: string;
  tags: string[];
  enabled: boolean;
}

export interface WorldRenderSettings {
  theme: string;
  groundMaterial: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
}

export interface WorldDefinition {
  schemaVersion: number;
  id: WorldId;
  name: string;
  seed: WorldSeedConfig;
  bounds: Bounds2;
  chunkSize: number;
  terrain: {
    baseAlgorithmVersion: number;
    stamps: TerrainStamp[];
    workZones: WorkZone[];
  };
  biomes: {
    definitions: BiomeDefinition[];
    masks: BiomeMask[];
    splines: BiomeSpline[];
  };
  splines: WorldSpline[];
  scatter: ScatterDefinition[];
  exclusions: WorldExclusion[];
  render: WorldRenderSettings;
}

export interface WorldDatabaseFile {
  kind: 'souldolls-world-database';
  schemaVersion: number;
  worlds: WorldDefinition[];
  stampPresets: {
    id: string;
    category: string;
    resolution: number;
    values: number[];
  }[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function createDefaultWorldDefinition(overrides: Partial<WorldDefinition> = {}): WorldDefinition {
  const base: WorldDefinition = {
    schemaVersion: 1,
    id: 'default-world',
    name: 'SoulDolls Default World',
    seed: {
      root: 'souldolls-default',
      algorithmVersion: 1,
    },
    bounds: { minX: -320, minZ: -320, maxX: 320, maxZ: 320 },
    chunkSize: 64,
    terrain: {
      baseAlgorithmVersion: 1,
      stamps: [],
      workZones: [],
    },
    biomes: {
      definitions: [],
      masks: [],
      splines: [],
    },
    splines: [],
    scatter: [],
    exclusions: [],
    render: {
      theme: 'default',
      groundMaterial: 'terrain',
      fogColor: '#0f172a',
      fogNear: 40,
      fogFar: 200,
    },
  };

  return {
    ...base,
    ...overrides,
    terrain: {
      ...base.terrain,
      ...overrides.terrain,
      workZones: overrides.terrain?.workZones ?? base.terrain.workZones,
      stamps: overrides.terrain?.stamps ?? base.terrain.stamps,
    },
    biomes: {
      ...base.biomes,
      ...overrides.biomes,
      definitions: overrides.biomes?.definitions ?? base.biomes.definitions,
      masks: overrides.biomes?.masks ?? base.biomes.masks,
      splines: overrides.biomes?.splines ?? base.biomes.splines,
    },
    render: {
      ...base.render,
      ...overrides.render,
    },
  };
}

export function createDefaultWorldDatabaseFile(worlds: WorldDefinition[] = []): WorldDatabaseFile {
  return {
    kind: 'souldolls-world-database',
    schemaVersion: 1,
    worlds,
    stampPresets: [],
  };
}
