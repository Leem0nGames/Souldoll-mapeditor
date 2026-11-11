/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TerrainSampler } from '../terrain/TerrainData';
import type { WorldEventBus, WorldInvalidation } from './WorldEvents';
import type { WorldDefinition } from './WorldDefinition';
import { worldSeedService, type WorldSeedConfig } from './WorldSeed';
import type { WorkZone } from './WorkZone';
import type { Bounds2 } from './WorldTypes';

export type WorldLayer =
  | 'terrainBase'
  | 'terrainStamps'
  | 'terrainSplines'
  | 'terrainSurface'
  | 'biomes'
  | 'scatterPrimary'
  | 'scatterDetails'
  | 'water'
  | 'collisions'
  | 'props'
  | 'minimap';

export interface GenerationContext {
  definition: WorldDefinition;
  seed: WorldSeedConfig;
  events: WorldEventBus;
  sampler: TerrainSampler;
  workZone?: WorkZone;
  dirty?: Bounds2;
}

export interface GenerationPhase {
  id: WorldLayer;
  dependsOn: WorldLayer[];
  run(ctx: GenerationContext): boolean;
  cacheKey?(ctx: GenerationContext, region: Bounds2): string;
}

export class WorldGenerationPipeline {
  public constructor(private readonly phases: readonly GenerationPhase[]) {}

  public generate(ctx: GenerationContext): WorldInvalidation[] {
    const invalidations: WorldInvalidation[] = [];
    const ordered = [...this.phases];

    for (let i = 0; i < ordered.length; i++) {
      const phase = ordered[i];
      const changed = phase.run(ctx);
      const invalidation: WorldInvalidation = {
        source: `pipeline:${phase.id}`,
        layers: [phase.id],
        region: ctx.dirty,
      };
      if (changed) {
        invalidations.push(invalidation);
        ctx.events.emit(invalidation);
      }
    }

    return invalidations;
  }

  public invalidate(change: WorldInvalidation): void {
    this.phases.forEach((phase) => {
      if (change.layers.includes(phase.id)) {
        const region = change.region ?? null;
        if (region && phase.cacheKey) {
          phase.cacheKey({} as GenerationContext, region);
        }
      }
    });
  }

  public static createDefault(): WorldGenerationPipeline {
    return new WorldGenerationPipeline([
      {
        id: 'terrainBase',
        dependsOn: [],
        run: () => true,
      },
      {
        id: 'terrainStamps',
        dependsOn: ['terrainBase'],
        run: () => true,
      },
      {
        id: 'terrainSplines',
        dependsOn: ['terrainStamps'],
        run: () => true,
      },
      {
        id: 'biomes',
        dependsOn: ['terrainSurface'],
        run: () => true,
      },
      {
        id: 'scatterPrimary',
        dependsOn: ['biomes'],
        run: () => true,
      },
      {
        id: 'scatterDetails',
        dependsOn: ['scatterPrimary'],
        run: () => true,
      },
    ]);
  }
}

export const worldGenerationPipeline = WorldGenerationPipeline.createDefault();
export const worldGenerationSeed = worldSeedService;
