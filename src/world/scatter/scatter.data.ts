/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WorldSeedConfig } from '../core/WorldSeed';
import { ScatterDatabase } from './ScatterDatabase';
import { ScatterGenerator } from './ScatterGenerator';
import type { ScatterDefinition } from './ScatterDefinition';

export const SCATTER_GROUP_IDS = {
  trees: 'vegetation_trees',
  bushes: 'vegetation_bushes',
  grassVerge: 'detail_grass_verge',
  grassWild: 'detail_grass_wild',
  formations: 'natural_formations',
} as const;

const TREE_GROUP: ScatterDefinition = {
  id: SCATTER_GROUP_IDS.trees,
  name: 'Árboles procedurales',
  assetType: 'tree',
  distribution: 'random',
  density: 0.0024,
  minScale: 0.75,
  maxScale: 1.35,
  minHeight: 0.8,
  maxHeight: 120,
  minSlope: 0,
  maxSlope: 4,
  minDistance: 12,
  randomRotation: false,
  alignToNormal: false,
  forceWorldUp: true,
  clusterStrength: 0.18,
  clusterScale: 38,
  noiseStrength: 0.25,
  seed: 0x51ed270b,
  biomeCompatibility: ['forest', 'meadow', 'mountain', 'snow', 'swamp', 'spectral'],
  exclusionTags: ['NoVegetation'],
  primary: true,
  enabled: true,
  variantCount: 3,
  shadow: true,
  biomeRules: [
    {
      biomeId: 'forest',
      densityMultiplier: 2.2,
      minDistanceMultiplier: 0.71,
      minScaleMultiplier: 1.4,
      maxScaleMultiplier: 1.19,
      variantWeights: [0.4, 0.6, 0],
    },
    {
      biomeId: 'meadow',
      densityMultiplier: 0.67,
      minDistanceMultiplier: 1.21,
    },
    {
      biomeId: 'mountain',
      densityMultiplier: 0.58,
    },
    {
      biomeId: 'snow',
      densityMultiplier: 0.63,
    },
    {
      biomeId: 'spectral',
      densityMultiplier: 1,
    },
    {
      biomeId: 'swamp',
      densityMultiplier: 0.9,
    },
  ],
};

const BUSH_GROUP: ScatterDefinition = {
  id: SCATTER_GROUP_IDS.bushes,
  name: 'Arbustos salvajes',
  assetType: 'bush',
  distribution: 'cluster',
  density: 0.0007,
  minScale: 0.85,
  maxScale: 1.2,
  minHeight: 0.2,
  maxHeight: 120,
  minSlope: 0,
  maxSlope: 3,
  minDistance: 6,
  randomRotation: false,
  alignToNormal: false,
  forceWorldUp: true,
  clusterStrength: 0.35,
  clusterScale: 18,
  noiseStrength: 0.35,
  seed: 0x1b873593,
  biomeCompatibility: ['meadow', 'forest', 'mountain', 'snow', 'swamp', 'spectral', 'river'],
  exclusionTags: ['NoScatter'],
  primary: true,
  enabled: true,
  variantCount: 2,
  variantWeights: [1, 1],
  shadow: false,
};

const GRASS_VERGE_GROUP: ScatterDefinition = {
  id: SCATTER_GROUP_IDS.grassVerge,
  name: 'Hierba de arcén',
  assetType: 'grass',
  distribution: 'cluster',
  density: 0.5,
  minScale: 1,
  maxScale: 1,
  minHeight: 0.6,
  maxHeight: 120,
  minSlope: 0,
  maxSlope: 2,
  minDistance: 0.7,
  randomRotation: false,
  alignToNormal: false,
  forceWorldUp: true,
  clusterStrength: 0.2,
  clusterScale: 7,
  noiseStrength: 0.25,
  seed: 0x9e3779b9,
  biomeCompatibility: [],
  exclusionTags: ['NoVegetation'],
  primary: false,
  enabled: true,
  variantCount: 1,
  shadow: false,
};

const GRASS_WILD_GROUP: ScatterDefinition = {
  ...GRASS_VERGE_GROUP,
  id: SCATTER_GROUP_IDS.grassWild,
  name: 'Hierba salvaje',
  density: 0.3,
  minDistance: 0.9,
  clusterStrength: 0.35,
  clusterScale: 8,
  seed: 0x85ebca6b,
};

const FORMATION_GROUP: ScatterDefinition = {
  id: SCATTER_GROUP_IDS.formations,
  name: 'Formaciones naturales',
  assetType: 'rock',
  distribution: 'surface',
  density: 0.0034,
  minScale: 0.7,
  maxScale: 1.45,
  minHeight: 0.35,
  maxHeight: 120,
  minSlope: 0,
  maxSlope: 2.5,
  minDistance: 3,
  randomRotation: true,
  alignToNormal: true,
  forceWorldUp: false,
  clusterStrength: 0,
  clusterScale: 16,
  noiseStrength: 0.1,
  seed: 0xc2b2ae35,
  biomeCompatibility: ['meadow', 'forest', 'mountain', 'snow', 'swamp', 'spectral', 'coast'],
  exclusionTags: ['NoScatter'],
  primary: true,
  enabled: true,
  variantCount: 3,
  variantWeights: [1, 0, 0],
  shadow: false,
  biomeRules: [
    {
      biomeId: 'mountain',
      densityMultiplier: 0.706,
      minScaleMultiplier: 1.57,
      maxScaleMultiplier: 1.59,
    },
    {
      biomeId: 'coast',
      densityMultiplier: 0.441,
    },
    {
      biomeId: 'swamp',
      densityMultiplier: 0.412,
    },
    {
      biomeId: 'snow',
      densityMultiplier: 1,
      minScaleMultiplier: 1.21,
      maxScaleMultiplier: 1.17,
      variantWeights: [0.35, 0.65, 0],
    },
    {
      biomeId: 'spectral',
      densityMultiplier: 1,
      minScaleMultiplier: 1.29,
      maxScaleMultiplier: 1.24,
      variantWeights: [0.35, 0, 0.65],
    },
    {
      biomeId: 'meadow',
      densityMultiplier: 0.22,
    },
    {
      biomeId: 'forest',
      densityMultiplier: 0.22,
    },
  ],
};

export function createDefaultScatterDefinitions(): ScatterDefinition[] {
  return [
    TREE_GROUP,
    BUSH_GROUP,
    GRASS_VERGE_GROUP,
    GRASS_WILD_GROUP,
    FORMATION_GROUP,
  ];
}

export function createDefaultScatterDatabase(): ScatterDatabase {
  return new ScatterDatabase(createDefaultScatterDefinitions());
}

export function createDefaultScatterSystem(seedConfig: WorldSeedConfig): {
  database: ScatterDatabase;
  generator: ScatterGenerator;
} {
  const database = createDefaultScatterDatabase();
  return {
    database,
    generator: new ScatterGenerator(database, seedConfig),
  };
}
