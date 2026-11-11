/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ScatterPlacement } from './ScatterDefinition';

export interface ScatterBatch {
  key: string;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  placements: ScatterPlacement[];
}

export function batchScatterPlacements(
  placements: readonly ScatterPlacement[],
  chunkSize: number
): ScatterBatch[] {
  if (!(chunkSize > 0)) return [];

  const map = new Map<string, ScatterBatch>();
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    const cx = Math.floor(placement.x / chunkSize);
    const cz = Math.floor(placement.z / chunkSize);
    const key = `${cx},${cz}`;
    let batch = map.get(key);
    if (!batch) {
      batch = {
        key,
        minX: cx * chunkSize,
        minZ: cz * chunkSize,
        maxX: (cx + 1) * chunkSize,
        maxZ: (cz + 1) * chunkSize,
        placements: [],
      };
      map.set(key, batch);
    }
    batch.placements.push(placement);
  }

  const batches = Array.from(map.values());
  batches.sort((a, b) => (a.minX - b.minX) || (a.minZ - b.minZ));
  return batches;
}

export function countScatterDrawCalls(batches: readonly ScatterBatch[]): number {
  let count = 0;
  for (let i = 0; i < batches.length; i++) {
    const variants = new Set<number>();
    const placements = batches[i].placements;
    for (let j = 0; j < placements.length; j++) {
      variants.add(placements[j].variant);
    }
    count += variants.size;
  }
  return count;
}

export function countScatterInstances(batches: readonly ScatterBatch[]): number {
  let count = 0;
  for (let i = 0; i < batches.length; i++) {
    count += batches[i].placements.length;
  }
  return count;
}
