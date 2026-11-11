/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WorldSeedConfig {
  root: string;
  algorithmVersion: number;
}

export type SeedSystem = 'terrain' | 'biome' | 'scatter' | 'spline' | 'detail' | 'editor';

export interface SeedScope {
  system: SeedSystem;
  chunkX?: number;
  chunkZ?: number;
  groupId?: string;
  elementId?: string;
  index?: number;
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mix32(hash: number): number {
  let h = hash >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

export function deriveSeed(config: WorldSeedConfig, scope: SeedScope): number {
  const payload = [
    config.algorithmVersion,
    config.root,
    scope.system,
    scope.chunkX ?? '',
    scope.chunkZ ?? '',
    scope.groupId ?? '',
    scope.elementId ?? '',
    scope.index ?? '',
  ].join('\u001f');
  return mix32(fnv1a(payload));
}

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class WorldSeedService {
  public derive(config: WorldSeedConfig, scope: SeedScope): number {
    return deriveSeed(config, scope);
  }

  public createRng(seed: number): () => number {
    return createSeededRng(seed);
  }
}

export const worldSeedService = new WorldSeedService();
