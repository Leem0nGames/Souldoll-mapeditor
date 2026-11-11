/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TerrainSampler } from '../terrain/TerrainData';
import { worldDatabase } from './WorldDatabase';
import { createDefaultWorldDefinition, type WorldDefinition } from './WorldDefinition';
import { worldGenerationPipeline, type GenerationContext } from './WorldGenerationPipeline';
import { WorldEventBus, type WorldInvalidation } from './WorldEvents';
import type { WorldSeedConfig } from './WorldSeed';
import type { Bounds2 } from './WorldTypes';
import type { WorkZone } from './WorkZone';

export interface WorldRuntimeState {
  definition: WorldDefinition;
  seed: WorldSeedConfig;
  activeWorldId: string;
  workZone?: WorkZone;
  dirtyRegions: Bounds2[];
  version: number;
}

export class WorldManager {
  private definition: WorldDefinition;
  private readonly runtime: WorldRuntimeState;

  public constructor(initialDefinition?: WorldDefinition) {
    this.definition = initialDefinition ?? createDefaultWorldDefinition();
    this.runtime = {
      definition: this.definition,
      seed: this.definition.seed,
      activeWorldId: this.definition.id,
      dirtyRegions: [],
      version: 1,
    };
  }

  public getDefinition(): WorldDefinition {
    return structuredClone(this.definition);
  }

  public getRuntime(): WorldRuntimeState {
    return structuredClone(this.runtime);
  }

  public setDefinition(definition: WorldDefinition): void {
    this.definition = definition;
    this.runtime.definition = definition;
    this.runtime.seed = definition.seed;
    this.runtime.activeWorldId = definition.id;
    this.runtime.version += 1;
  }

  public importWorld(json: string): WorldDefinition {
    const imported = worldDatabase.importWorld(json);
    this.setDefinition(imported);
    return imported;
  }

  public exportWorld(id: string): string {
    return worldDatabase.exportWorld(id);
  }

  public setWorkZone(zone?: WorkZone): void {
    this.runtime.workZone = zone;
  }

  public invalidate(region: Bounds2, source = 'world-manager'): WorldInvalidation {
    const change: WorldInvalidation = {
      source,
      layers: ['terrainBase', 'terrainStamps', 'terrainSplines', 'biomes', 'scatterPrimary'],
      region,
    };
    this.runtime.dirtyRegions.push(region);
    worldGenerationPipeline.invalidate(change);
    return change;
  }

  public generate(
    sampler: TerrainSampler,
    dirty?: Bounds2,
    seed: WorldSeedConfig = this.runtime.seed,
  ): WorldInvalidation[] {
    const context: GenerationContext = {
      definition: this.definition,
      seed,
      events: new WorldEventBus(),
      sampler,
      workZone: this.runtime.workZone,
      dirty,
    };
    const invalidations = worldGenerationPipeline.generate(context);
    this.runtime.version += 1;
    if (dirty) {
      this.runtime.dirtyRegions = this.runtime.dirtyRegions.filter((entry) => {
        return entry.minX !== dirty.minX || entry.minZ !== dirty.minZ || entry.maxX !== dirty.maxX || entry.maxZ !== dirty.maxZ;
      });
      this.runtime.dirtyRegions.push(dirty);
    }
    return invalidations;
  }
}

export const worldManager = new WorldManager();
