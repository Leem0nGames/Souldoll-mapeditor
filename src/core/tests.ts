/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from '../core/logger';
import { calculateDamage, calculateCatchRate } from '../battle/battleRules';
import { getStarterSouls } from '../data/mobs';
import { SaveManager } from '../save/saveManager';
import { getRegionAt, FAST_TRAVEL_POINTS, getEncounterTypesForPosition, WORLD_REGIONS } from '../data/regions';
import {
  isInsideProtectedZone,
  getProceduralTerrainHeight,
  getActiveBiomeGenerator,
  sampleBiomeAt,
} from '../world/proceduralTerrain';
import { StampedTerrainSampler } from '../world/terrain/TerrainStampBlender';
import type { TerrainStamp } from '../world/terrain/TerrainStamp';
import { deriveSeed } from '../world/core/WorldSeed';
import { createWorkZoneRuntime, getWorkZoneBounds } from '../world/core/WorkZone';
import { WorldDatabase } from '../world/core/WorldDatabase';
import { createDefaultWorldDefinition, createDefaultWorldDatabaseFile } from '../world/core/WorldDefinition';
import { WorldGenerationPipeline } from '../world/core/WorldGenerationPipeline';
import { WorldManager } from '../world/core/WorldManager';
import type {
  BiomeDefinition,
  BiomeEnvironment,
  BiomeId,
  BiomeTerrainCondition,
} from '../world/biomes/BiomeDefinition';
import { BiomeDatabase } from '../world/biomes/BiomeDatabase';
import { BiomePriorityResolver } from '../world/biomes/BiomePriorityResolver';
import { BiomeSplineDatabase } from '../world/biomes/BiomeSpline';
import type { BiomeMask } from '../world/biomes/BiomeMask';
import { createDefaultScatterSystem, SCATTER_GROUP_IDS } from '../world/scatter/scatter.data';
import { ExclusionMask } from '../world/scatter/ExclusionMask';
import {
  createDefaultRoadSpline,
  createDefaultRiverSpline,
  createLakeEdgeSpline,
  sampleWorldSpline,
} from '../world/splines';
import {
  WorldEditor,
  createBiomePreset,
  createDefaultWorldEditorState,
  createScatterPreset,
  createSplinePreset,
  createTerrainStampCommand,
} from '../world/editor';
import { mulberry32 } from './rng';

function testBiomeDefinition(
  id: BiomeId,
  priority: number,
  rule: BiomeTerrainCondition = {}
): BiomeDefinition {
  return {
    id,
    name: id,
    priority,
    enabled: true,
    seed: 1,
    baseGroundMaterial: 'test',
    secondaryGroundMaterials: [],
    vegetationGroups: [],
    detailGroups: [],
    density: 1,
    minHeight: -1000,
    maxHeight: 1000,
    minSlope: 0,
    maxSlope: 10,
    groundColor: 0xffffff,
    tags: ['test'],
    rule,
  };
}

function testBiomeEnvironment(
  overrides: Partial<BiomeEnvironment> = {}
): BiomeEnvironment {
  return {
    x: 0,
    z: 0,
    elevation: 0,
    slope: 0,
    moisture: 0.5,
    temperature: 0.5,
    riverDistance: Infinity,
    lakeDistance: Infinity,
    radialDistance: 0,
    onBridge: false,
    ...overrides,
  };
}

export function runTests() {
  logger.info('Starting test suite...');
  
  let passed = 0;
  let failed = 0;

  const test = (name: string, condition: () => boolean) => {
    if (condition()) {
      logger.info(`PASSED: ${name}`);
      passed++;
    } else {
      logger.error(`FAILED: ${name}`);
      failed++;
    }
  };

  const soul1 = getStarterSouls()[0];
  const soul2 = getStarterSouls()[1];
  const move = soul1.moves[0];
  const random = Math.random;

  test('Damage never negative', () => {
    const res = calculateDamage(soul1, soul2, move, random);
    return res.damage >= 1;
  });

  test('Catch rate in bounds', () => {
    const rate = calculateCatchRate(soul2);
    return rate >= 0.1 && rate <= 0.95;
  });

  test('Save/Load consistency', () => {
    const data = {
      team: [], box: [], bag: [], playerPos: {x: 1, z: 2}, gold: 100,
      questState: 'none' as const, starterChosen: true
    };
    SaveManager.saveToSlot(99, data);
    const loaded = SaveManager.loadFromSlot(99);
    SaveManager.deleteSlot(99);
    return loaded !== null && loaded.gold === 100;
  });

  test('Simulation 1000 combats', () => {
    const seed = mulberry32(12345);
    let valid = true;
    for (let i = 0; i < 1000; i++) {
        const res = calculateDamage(soul1, soul2, move, seed);
        if (isNaN(res.damage) || res.damage < 0) valid = false;
    }
    return valid;
  });

  test('Region system defines valid hybrid regions and lookup', () => {
    const villa = getRegionAt(0, 0);
    const lake = getRegionAt(100, -80);
    const allHaveMeta = WORLD_REGIONS.every(
      r => r.levelRange.length === 2 && r.resources.length > 0 && Boolean(r.dominantBiome)
    );
    return villa.id === 'villa_marioneta' && lake.id === 'lago_esmeralda' && FAST_TRAVEL_POINTS.length >= 9 && allHaveMeta;
  });

  test('Procedural biomes provide valid encounter pools', () => {
    const snowEncounters = getEncounterTypesForPosition(120, 145);
    const forestEncounters = getEncounterTypesForPosition(-78, -28);
    return snowEncounters.includes('Luz') && forestEncounters.includes('Planta');
  });

  test('Manual narrative locations are protected and flattened', () => {
    const templeProtected = isInsideProtectedZone(-38, 136);
    const cryptProtected = isInsideProtectedZone(68, -128);
    const templeFlat = Math.abs(getProceduralTerrainHeight(-38, 136) - 4.2) < 0.05;
    const cryptFlat = Math.abs(getProceduralTerrainHeight(68, -128) - 2.0) < 0.05;
    return templeProtected && cryptProtected && templeFlat && cryptFlat;
  });

  test('Terrain sampler preserves the analytic base without stamps', () => {
    const sampler = new StampedTerrainSampler(getProceduralTerrainHeight, []);
    const points: [number, number][] = [[0, 0], [66, -6], [-120, 145], [240, -200]];
    return points.every(([x, z]) =>
      Math.abs(sampler.heightAt(x, z) - getProceduralTerrainHeight(x, z)) < 1e-9
    );
  });

  test('Terrain stamps displace locally and leave distant terrain intact', () => {
    const stamp: TerrainStamp = {
      id: 'test-hill',
      category: 'hill',
      source: { kind: 'preset', preset: 'hill', seed: 7 },
      seed: 7,
      position: { x: 66, z: -6 },
      rotation: 0.35,
      scale: { x: 15, z: 15, amplitude: 4.2 },
      intensity: 1,
      blendMode: 'add',
      falloff: { type: 'smoothstep', inner: 0.1, outer: 1 },
      enabled: true,
      priority: 10,
      tags: ['test'],
    };
    const sampler = new StampedTerrainSampler(getProceduralTerrainHeight, [stamp]);
    const centerRaised = sampler.heightAt(66, -6) > getProceduralTerrainHeight(66, -6) + 1;
    const farUntouched =
      Math.abs(sampler.heightAt(200, 100) - getProceduralTerrainHeight(200, 100)) < 1e-6;
    return centerRaised && farUntouched;
  });

  test('Terrain stamps are deterministic', () => {
    const stamp: TerrainStamp = {
      id: 'test-ridge',
      category: 'ridge',
      source: { kind: 'preset', preset: 'ridge', seed: 11 },
      seed: 11,
      position: { x: 80, z: -22 },
      rotation: -0.55,
      scale: { x: 22, z: 8, amplitude: 7.5 },
      intensity: 0.95,
      blendMode: 'max',
      falloff: { type: 'smoothstep', inner: 0.1, outer: 1 },
      enabled: true,
      priority: 20,
      tags: ['test'],
    };
    const a = new StampedTerrainSampler(getProceduralTerrainHeight, [stamp]);
    const b = new StampedTerrainSampler(getProceduralTerrainHeight, [stamp]);
    return Math.abs(a.heightAt(80, -22) - b.heightAt(80, -22)) < 1e-12;
  });

  test('World seeds derive stable and scoped values', () => {
    const config = { root: 'souldolls-test', algorithmVersion: 1 };
    const a = deriveSeed(config, { system: 'terrain', chunkX: 2, chunkZ: -3 });
    const b = deriveSeed(config, { system: 'terrain', chunkX: 2, chunkZ: -3 });
    const c = deriveSeed(config, { system: 'scatter', chunkX: 2, chunkZ: -3 });
    return a === b && a !== c;
  });

  test('Work zones expose bounds, containment and intersection', () => {
    const zone = {
      id: 'test-zone',
      name: 'Test',
      center: { x: 10, z: 20 },
      size: { x: 20, z: 10 },
      enabled: true,
      tags: [],
    };
    const runtime = createWorkZoneRuntime(zone);
    const bounds = getWorkZoneBounds(zone);
    return (
      bounds.minX === 0 &&
      bounds.maxX === 20 &&
      runtime.contains(10, 20) &&
      runtime.intersects({ minX: 15, minZ: 18, maxX: 30, maxZ: 30 }) &&
      runtime.clamp({ minX: 15, minZ: 18, maxX: 30, maxZ: 30 }) !== null
    );
  });

  test('Biome database migrates the ten legacy biomes', () => {
    const database = getActiveBiomeGenerator().database;
    const ids: BiomeId[] = [
      'meadow',
      'forest',
      'mountain',
      'snow',
      'swamp',
      'spectral',
      'coast',
      'river',
      'village',
      'lake',
    ];
    return database.size === ids.length && ids.every(id => database.has(id));
  });

  test('Biome priority resolves overlaps and stable ties', () => {
    const priorityDatabase = new BiomeDatabase([
      testBiomeDefinition('meadow', 10),
      testBiomeDefinition('forest', 20),
    ]);
    const priorityResolver = new BiomePriorityResolver({ database: priorityDatabase });
    const prioritySample = priorityResolver.sampleFromEnvironment(testBiomeEnvironment());

    const tieDatabase = new BiomeDatabase([
      testBiomeDefinition('meadow', 10),
      testBiomeDefinition('forest', 10),
    ]);
    const tieResolver = new BiomePriorityResolver({ database: tieDatabase });
    const tieSample = tieResolver.sampleFromEnvironment(testBiomeEnvironment());

    return prioritySample.biomeId === 'forest' && tieSample.biomeId === 'forest';
  });

  test('Biome masks add, subtract and override by priority', () => {
    const database = new BiomeDatabase([
      testBiomeDefinition('meadow', 10, { minElevation: 1000 }),
      testBiomeDefinition('forest', 20),
    ]);
    const addMask: BiomeMask = {
      id: 'add-meadow',
      biomeId: 'meadow',
      mode: 'add',
      shape: { type: 'circle', center: { x: 0, z: 0 }, radius: 10 },
      falloff: 0,
      strength: 1,
      priority: 1000,
      enabled: true,
      tags: ['test'],
    };
    const addResolver = new BiomePriorityResolver({ database, masks: [addMask] });
    const inside = addResolver.sampleFromEnvironment(testBiomeEnvironment());
    const outside = addResolver.sampleFromEnvironment(testBiomeEnvironment({ x: 20 }));

    const subtractMask: BiomeMask = {
      id: 'subtract-forest',
      biomeId: 'forest',
      mode: 'subtract',
      shape: { type: 'circle', center: { x: 0, z: 0 }, radius: 10 },
      falloff: 0,
      strength: 0.5,
      priority: 100,
      enabled: true,
      tags: ['test'],
    };
    const subtractResolver = new BiomePriorityResolver({
      database,
      masks: [subtractMask],
    });
    const subtracted = subtractResolver.weightsFromEnvironment(testBiomeEnvironment());
    const untouched = subtractResolver.weightsFromEnvironment(
      testBiomeEnvironment({ x: 20 })
    );

    const overrideMask: BiomeMask = {
      id: 'override-meadow',
      biomeId: 'meadow',
      mode: 'override',
      shape: { type: 'circle', center: { x: 0, z: 0 }, radius: 10 },
      falloff: 0,
      strength: 0.25,
      priority: 1000,
      enabled: true,
      tags: ['test'],
    };
    const overrideResolver = new BiomePriorityResolver({
      database,
      masks: [overrideMask],
    });
    const overridden = overrideResolver.sampleFromEnvironment(testBiomeEnvironment());

    return (
      inside.biomeId === 'meadow' &&
      outside.biomeId === 'forest' &&
      Math.abs((subtracted.get('forest') ?? 0) - 0.5) < 1e-9 &&
      Math.abs((untouched.get('forest') ?? 0) - 1) < 1e-9 &&
      overridden.biomeId === 'meadow' &&
      Math.abs(overridden.weight - 0.25) < 1e-9
    );
  });

  test('Biome mask falloff is stronger at the center than at the edge', () => {
    const database = new BiomeDatabase([
      testBiomeDefinition('meadow', 10, { minElevation: 1000 }),
    ]);
    const mask: BiomeMask = {
      id: 'soft-meadow',
      biomeId: 'meadow',
      mode: 'add',
      shape: { type: 'circle', center: { x: 0, z: 0 }, radius: 10 },
      falloff: 1,
      strength: 1,
      priority: 100,
      enabled: true,
      tags: ['test'],
    };
    const resolver = new BiomePriorityResolver({ database, masks: [mask] });
    const center = resolver.weightsFromEnvironment(testBiomeEnvironment()).get('meadow') ?? 0;
    const edge =
      resolver.weightsFromEnvironment(testBiomeEnvironment({ x: 9.5 })).get('meadow') ?? 0;
    return center === 1 && edge > 0 && edge < center;
  });

  test('Open biome splines influence nearby ground only', () => {
    const database = new BiomeDatabase([
      testBiomeDefinition('meadow', 10, { minElevation: 1000 }),
      testBiomeDefinition('forest', 10, { minElevation: 1000 }),
    ]);
    const splines = new BiomeSplineDatabase(
      [{ id: 'trail', points: [{ x: -10, z: 0 }, { x: 10, z: 0 }] }],
      [
        {
          id: 'trail-biome',
          splineId: 'trail',
          biomeId: 'forest',
          width: 4,
          falloff: 0.5,
          strength: 1,
          priority: 500,
          enabled: true,
          tags: ['test'],
        },
      ]
    );
    const resolver = new BiomePriorityResolver({ database, splines });
    const onPath = resolver.weightsFromEnvironment(testBiomeEnvironment()).get('forest') ?? 0;
    const offPath =
      resolver.weightsFromEnvironment(testBiomeEnvironment({ z: 20 })).get('forest') ?? 0;
    return onPath === 1 && offPath === 0;
  });

  test('Biome sampling is deterministic and preserves legacy boundaries', () => {
    const resolver = new BiomePriorityResolver({
      database: getActiveBiomeGenerator().database,
    });
    const a = resolver.sampleFromEnvironment(testBiomeEnvironment({ x: 66, z: -6 }));
    const b = resolver.sampleFromEnvironment(testBiomeEnvironment({ x: 66, z: -6 }));

    const expected: [number, number, string][] = [
      [0, 0, 'village'],
      [100, -80, 'lake'],
      [120, 60, 'snow'],
      [120, 145, 'mountain'],
      [-78, -28, 'forest'],
      [48, -104, 'spectral'],
      [250, 0, 'coast'],
      [160, 160, 'river'],
      [20, 60, 'meadow'],
    ];
    const compatibility = expected.every(
      ([x, z, biome]) => sampleBiomeAt(x, z).biome === biome
    );

    return (
      a.biomeId === b.biomeId &&
      a.weight === b.weight &&
      a.blend === b.blend &&
      compatibility
    );
  });

  test('Scatter generation is deterministic and populates the core groups', () => {
    const seedConfig = { root: 'scatter-stage-05', algorithmVersion: 1 };
    const systemA = createDefaultScatterSystem(seedConfig);
    const systemB = createDefaultScatterSystem(seedConfig);
    const bounds = { minX: -128, minZ: -128, maxX: 128, maxZ: 128 };
    const biome = getActiveBiomeGenerator() as any;
    const terrain = {
      sampleAt: (x: number, z: number) => ({
        height: getProceduralTerrainHeight(x, z),
        slope: 0.35,
        normalX: 0,
        normalY: 1,
        normalZ: 0,
        moisture: 0.5,
        temperature: 0.5,
        riverDistance: 999,
        lakeDistance: 999,
        radialDistance: 0,
        onBridge: false,
      }),
      heightAt: (x: number, z: number) => getProceduralTerrainHeight(x, z),
      sample: (x: number, z: number) => ({
        height: getProceduralTerrainHeight(x, z),
        slope: 0.35,
        normalX: 0,
        normalY: 1,
        normalZ: 0,
        moisture: 0.5,
        temperature: 0.5,
        riverDistance: 999,
        lakeDistance: 999,
        radialDistance: 0,
        onBridge: false,
      }),
    } as any;
    const exclusions = new ExclusionMask();

    const groupIds = [
      SCATTER_GROUP_IDS.trees,
      SCATTER_GROUP_IDS.bushes,
      SCATTER_GROUP_IDS.grassVerge,
      SCATTER_GROUP_IDS.grassWild,
      SCATTER_GROUP_IDS.formations,
    ];

    const countsA = groupIds.map((groupId) =>
      systemA.generator.generate({
        group: systemA.database.require(groupId),
        bounds,
        terrain,
        biome,
        exclusions,
        seed: seedConfig,
      }).length
    );
    const countsB = groupIds.map((groupId) =>
      systemB.generator.generate({
        group: systemB.database.require(groupId),
        bounds,
        terrain,
        biome,
        exclusions,
        seed: seedConfig,
      }).length
    );

    const totalA = countsA.reduce((sum, value) => sum + value, 0);
    const totalB = countsB.reduce((sum, value) => sum + value, 0);

    return (
      totalA > 1000 &&
      totalA === totalB &&
      countsA.every((count, index) => count === countsB[index])
    );
  });

  test('Spline network samples deterministically on roads, river and lake edge', () => {
    const road = createDefaultRoadSpline();
    const river = createDefaultRiverSpline();
    const lake = createLakeEdgeSpline();

    const roadSample = sampleWorldSpline(road, 0, 20);
    const riverSample = sampleWorldSpline(river, 12, -32);
    const lakeSample = sampleWorldSpline(lake, 100, -54);

    return (
      roadSample.distance >= 0 &&
      roadSample.influence > 0 &&
      riverSample.distance >= 0 &&
      riverSample.influence > 0 &&
      lakeSample.distance >= 0 &&
      lakeSample.influence > 0 &&
      Number.isFinite(roadSample.along) &&
      Number.isFinite(riverSample.along) &&
      Number.isFinite(lakeSample.along)
    );
  });

  test('World editor keeps undo/redo history for terrain and tool changes', () => {
    const editor = new WorldEditor(
      createDefaultWorldEditorState({
        worldName: 'stage-07-editor',
        biomeDefinitions: [createBiomePreset('meadow', 1, true, ['test'])],
        scatterGroups: [createScatterPreset('grassWild', 0.8, true, ['test'])],
        splineDefinitions: [createSplinePreset('main-road', 'road', true, [{ x: 0, z: 0 }])],
      })
    );

    const stamp: TerrainStamp = {
      id: 'editor-stamp',
      category: 'hill',
      source: { kind: 'preset', preset: 'hill', seed: 42 },
      seed: 42,
      position: { x: 16, z: -8 },
      rotation: 0,
      scale: { x: 20, z: 20, amplitude: 2 },
      intensity: 1,
      blendMode: 'add',
      falloff: { type: 'smoothstep', inner: 0.2, outer: 1 },
      enabled: true,
      priority: 1,
      tags: ['editor'],
    };

    editor.execute(createTerrainStampCommand(editor.getState(), stamp));
    editor.toggleEditor(true);
    editor.setTool('biome');
    editor.undo();
    editor.undo();

    const state = editor.getState();
    return (
      state.enabled === false &&
      state.activeTool === 'terrain' &&
      state.terrainStamps.length === 1 &&
      state.terrainStamps[0]?.id === 'editor-stamp'
    );
  });

  test('World database validates and serializes a production definition', () => {
    const world = createDefaultWorldDefinition({
      id: 'prod-test',
      name: 'Production Test',
      bounds: { minX: -64, minZ: -64, maxX: 64, maxZ: 64 },
      terrain: {
        baseAlgorithmVersion: 1,
        stamps: [],
        workZones: [{ id: 'w1', name: 'Alpha', center: { x: 0, z: 0 }, size: { x: 16, z: 16 }, enabled: true, tags: ['test'] }],
      },
    });
    const db = createDefaultWorldDatabaseFile([world]);
    const database = new WorldDatabase();
    const imported = database.importWorld(JSON.stringify(world));
    const validated = database.validate(db);
    return validated.valid && imported.id === 'prod-test' && imported.bounds.maxX === 64;
  });

  test('World generation pipeline executes phases in order and emits invalidations', () => {
    const pipeline = new WorldGenerationPipeline([
      { id: 'terrainBase', dependsOn: [], run: () => true },
      { id: 'terrainStamps', dependsOn: ['terrainBase'], run: () => true },
      { id: 'terrainSplines', dependsOn: ['terrainStamps'], run: () => true },
    ]);
    const world = createDefaultWorldDefinition();
    const events = { emit: () => undefined, subscribe: () => () => undefined } as any;
    const invalidations = pipeline.generate({
      definition: world,
      seed: { root: 'pipeline', algorithmVersion: 1 },
      events,
      sampler: {
        heightAt: () => 0,
        sampleAt: () => ({ height: 0, normalX: 0, normalY: 1, normalZ: 0, slope: 0 }),
        baseHeightAt: () => 0,
        bounds: { minX: -32, minZ: -32, maxX: 32, maxZ: 32 },
        resolution: 1,
      },
      dirty: { minX: -16, minZ: -16, maxX: 16, maxZ: 16 },
    });
    return invalidations.length === 3 && invalidations.every((entry) => entry.layers.length >= 1);
  });

  test('World manager exposes runtime state and invalidation hooks', () => {
    const manager = new WorldManager(createDefaultWorldDefinition({ id: 'manager-world', name: 'Manager World' }));
    const region = { minX: -8, minZ: -8, maxX: 8, maxZ: 8 };
    const invalidations = manager.generate({
      heightAt: () => 0,
      sampleAt: () => ({ height: 0, normalX: 0, normalY: 1, normalZ: 0, slope: 0 }),
      baseHeightAt: () => 0,
      bounds: region,
      resolution: 1,
    }, region);
    const runtime = manager.getRuntime();
    const invalidation = manager.invalidate(region);
    return invalidations.length > 0 && runtime.activeWorldId === 'manager-world' && invalidation.region?.minX === -8 && invalidation.source === 'world-manager';
  });

  logger.info(`Test suite finished. Passed: ${passed}, Failed: ${failed}`);
  return { passed, failed };
}

if (typeof window !== 'undefined') {
  (window as any).runTests = runTests;
}
