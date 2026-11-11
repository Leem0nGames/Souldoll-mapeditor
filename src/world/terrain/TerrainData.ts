/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Bounds2 } from '../core/WorldTypes';

export const DEFAULT_TERRAIN_BOUNDS: Bounds2 = {
  minX: -320,
  minZ: -320,
  maxX: 320,
  maxZ: 320,
};

export interface TerrainDataOptions {
  originX: number;
  originZ: number;
  width: number;
  height: number;
  cellSize: number;
  heights: Float32Array;
  flags?: Uint8Array;
  version: number;
}

export interface TerrainData extends TerrainDataOptions {}

export interface TerrainHeightSample {
  height: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  slope: number;
}

export interface TerrainSampler {
  heightAt(x: number, z: number): number;
  sampleAt(x: number, z: number): TerrainHeightSample;
  baseHeightAt(x: number, z: number): number;
  readonly bounds: Bounds2;
  readonly resolution: number;
}

export function getTerrainDataBounds(data: TerrainData): Bounds2 {
  return {
    minX: data.originX,
    minZ: data.originZ,
    maxX: data.originX + (data.width - 1) * data.cellSize,
    maxZ: data.originZ + (data.height - 1) * data.cellSize,
  };
}

export function sampleTerrainData(data: TerrainData, x: number, z: number): number {
  if (data.width <= 0 || data.height <= 0) return 0;

  const gx = (x - data.originX) / data.cellSize;
  const gz = (z - data.originZ) / data.cellSize;
  const clampedX = Math.max(0, Math.min(data.width - 1, gx));
  const clampedZ = Math.max(0, Math.min(data.height - 1, gz));

  const x0 = Math.min(data.width - 1, Math.floor(clampedX));
  const z0 = Math.min(data.height - 1, Math.floor(clampedZ));
  const x1 = Math.min(data.width - 1, x0 + 1);
  const z1 = Math.min(data.height - 1, z0 + 1);
  const tx = clampedX - x0;
  const tz = clampedZ - z0;

  const h00 = data.heights[z0 * data.width + x0];
  const h10 = data.heights[z0 * data.width + x1];
  const h01 = data.heights[z1 * data.width + x0];
  const h11 = data.heights[z1 * data.width + x1];

  const hx0 = h00 + (h10 - h00) * tx;
  const hx1 = h01 + (h11 - h01) * tx;
  return hx0 + (hx1 - hx0) * tz;
}
