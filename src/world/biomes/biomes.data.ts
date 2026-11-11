/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deriveSeed } from '../core/WorldSeed';
import type { Vec2 } from '../core/WorldTypes';
import type { BiomeDefinition, BiomeEnvironmentSampler } from './BiomeDefinition';
import { BiomeDatabase } from './BiomeDatabase';
import { BiomeGenerator } from './BiomeGenerator';
import type { BiomeMask } from './BiomeMask';
import type { BiomeSplineDatabase } from './BiomeSpline';

export interface DefaultBiomeConstants {
  riverHalfWidth: number;
  riverWaterLevel: number;
  oceanWaterLevel: number;
  lakeCenter: Vec2;
  lakeRadius: number;
  villageCenter: Vec2;
  villageRadius: number;
  coastRadius: number;
  coastMaxElevation: number;
}

export interface DefaultBiomeSystemOptions extends DefaultBiomeConstants {
  masks?: readonly BiomeMask[];
  splines?: BiomeSplineDatabase;
  environmentAt?: BiomeEnvironmentSampler;
}

const BIOME_SEED_CONFIG = {
  root: 'souldolls-biomes-v1',
  algorithmVersion: 1,
};

function seedFor(id: string): number {
  return deriveSeed(BIOME_SEED_CONFIG, { system: 'biome', groupId: id });
}

export function createDefaultBiomeDefinitions(
  constants: DefaultBiomeConstants
): BiomeDefinition[] {
  const { riverHalfWidth, riverWaterLevel, oceanWaterLevel } = constants;

  return [
    {
      id: 'village',
      name: 'Villa Marioneta',
      priority: 1000,
      enabled: true,
      seed: seedFor('village'),
      baseGroundMaterial: 'terrain_ground_village',
      secondaryGroundMaterials: [],
      vegetationGroups: [],
      detailGroups: [],
      density: 0,
      minHeight: -1000,
      maxHeight: 1000,
      minSlope: 0,
      maxSlope: 10,
      groundColor: 0xe0dbcc,
      tags: ['base', 'safe'],
      rule: {
        distance: {
          center: constants.villageCenter,
          max: constants.villageRadius,
        },
      },
    },
    {
      id: 'lake',
      name: 'Lago Esmeralda',
      priority: 900,
      enabled: true,
      seed: seedFor('lake'),
      baseGroundMaterial: 'terrain_ground_lake',
      secondaryGroundMaterials: [],
      vegetationGroups: [],
      detailGroups: [],
      density: 0,
      minHeight: -1000,
      maxHeight: 1000,
      minSlope: 0,
      maxSlope: 10,
      groundColor: 0x94d673,
      tags: ['base', 'water'],
      rule: {
        distance: {
          center: constants.lakeCenter,
          max: constants.lakeRadius,
        },
      },
    },
    {
      id: 'river',
      name: 'Río de Luminati',
      priority: 800,
      enabled: true,
      seed: seedFor('river'),
      baseGroundMaterial: 'terrain_ground_river',
      secondaryGroundMaterials: [],
      vegetationGroups: [],
      detailGroups: [],
      density: 0,
      minHeight: -1000,
      maxHeight: riverWaterLevel + 0.35,
      minSlope: 0,
      maxSlope: 10,
      groundColor: 0x8c856b,
      tags: ['base', 'water'],
      rule: {
        all: [
          { riverMaxDistance: riverHalfWidth },
          { maxElevation: riverWaterLevel + 0.35 },
          { onBridge: false },
        ],
      },
    },
    {
      id: 'coast',
      name: 'Costa de Luminati',
      priority: 700,
      enabled: true,
      seed: seedFor('coast'),
      baseGroundMaterial: 'terrain_ground_coast',
      secondaryGroundMaterials: [],
      vegetationGroups: [],
      detailGroups: [],
      density: 0.1,
      minHeight: -1000,
      maxHeight: oceanWaterLevel + 2.1,
      minSlope: 0,
      maxSlope: 10,
      groundColor: 0xe0d19e,
      secondaryGroundColor: 0x527a8f,
      tags: ['base', 'shore'],
      rule: {
        all: [
          { minRadius: constants.coastRadius },
          { maxElevation: constants.coastMaxElevation },
        ],
      },
    },
    {
      id: 'snow',
      name: 'Región Nevada',
      priority: 600,
      enabled: true,
      seed: seedFor('snow'),
      baseGroundMaterial: 'terrain_ground_snow',
      secondaryGroundMaterials: [],
      vegetationGroups: [],
      detailGroups: [],
      density: 0.15,
      minHeight: 11.5,
      maxHeight: 1000,
      minSlope: 0,
      maxSlope: 10,
      groundColor: 0xe0ebf5,
      secondaryGroundColor: 0xf2f7ff,
      tags: ['base', 'alpine'],
      rule: {
        any: [
          { minElevation: 14.5 },
          {
            all: [
              { minElevation: 11.5 },
              { maxTemperature: 0.38 },
              { minZ: 75 },
            ],
          },
        ],
      },
    },
    {
      id: 'mountain',
      name: 'Tierras Altas del Trueno',
      priority: 500,
      enabled: true,
      seed: seedFor('mountain'),
      baseGroundMaterial: 'terrain_ground_mountain',
      secondaryGroundMaterials: ['terrain_ground_cliff'],
      vegetationGroups: [],
      detailGroups: [],
      density: 0.25,
      minHeight: 8,
      maxHeight: 1000,
      minSlope: 0,
      maxSlope: 10,
      groundColor: 0x8f9e80,
      secondaryGroundColor: 0x757a87,
      tags: ['base', 'highland'],
      rule: {
        any: [
          { minElevation: 8 },
          {
            all: [
              { minSlope: 0.42 },
              { minX: 38 },
              { minZ: -30 },
            ],
          },
        ],
      },
    },
    {
      id: 'swamp',
      name: 'Pantano de las Nieblas',
      priority: 400,
      enabled: true,
      seed: seedFor('swamp'),
      baseGroundMaterial: 'terrain_ground_swamp',
      secondaryGroundMaterials: [],
      vegetationGroups: [],
      detailGroups: [],
      density: 0.45,
      minHeight: -1000,
      maxHeight: 2.6,
      minSlope: 0,
      maxSlope: 10,
      groundColor: 0x4d6638,
      tags: ['base', 'wetland'],
      rule: {
        all: [
          { maxElevation: 2.6 },
          { minMoisture: 0.62 },
          { maxX: -25 },
          { minZ: -185 },
          { maxZ: -35 },
        ],
      },
    },
    {
      id: 'spectral',
      name: 'Páramo Espectral',
      priority: 300,
      enabled: true,
      seed: seedFor('spectral'),
      baseGroundMaterial: 'terrain_ground_spectral',
      secondaryGroundMaterials: [],
      vegetationGroups: [],
      detailGroups: [],
      density: 0.2,
      minHeight: -1000,
      maxHeight: 1000,
      minSlope: 0,
      maxSlope: 10,
      groundColor: 0x6b4d85,
      tags: ['base', 'mystic'],
      rule: {
        all: [
          { minX: 32 },
          { minZ: -195 },
          { maxZ: -72 },
        ],
      },
    },
    {
      id: 'forest',
      name: 'Bosque Umbrío',
      priority: 200,
      enabled: true,
      seed: seedFor('forest'),
      baseGroundMaterial: 'terrain_ground_forest',
      secondaryGroundMaterials: [],
      vegetationGroups: [],
      detailGroups: [],
      density: 0.8,
      minHeight: -1000,
      maxHeight: 1000,
      minSlope: 0,
      maxSlope: 10,
      groundColor: 0x428047,
      tags: ['base', 'woodland'],
      rule: {
        all: [
          { maxX: -35 },
          { minZ: -35 },
        ],
      },
    },
    {
      id: 'meadow',
      name: 'Pradera de Luminati',
      priority: 100,
      enabled: true,
      seed: seedFor('meadow'),
      baseGroundMaterial: 'terrain_ground_meadow',
      secondaryGroundMaterials: [],
      vegetationGroups: [],
      detailGroups: [],
      density: 0.55,
      minHeight: -1000,
      maxHeight: 1000,
      minSlope: 0,
      maxSlope: 10,
      groundColor: 0x94d673,
      tags: ['base', 'grassland'],
      rule: {},
    },
  ];
}

export function createDefaultBiomeDatabase(
  constants: DefaultBiomeConstants
): BiomeDatabase {
  return new BiomeDatabase(createDefaultBiomeDefinitions(constants));
}

export function createDefaultBiomeSystem(
  options: DefaultBiomeSystemOptions
): BiomeGenerator {
  return new BiomeGenerator({
    database: createDefaultBiomeDatabase(options),
    masks: options.masks,
    splines: options.splines,
    environmentAt: options.environmentAt,
  });
}
