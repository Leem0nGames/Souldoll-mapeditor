/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Bounds2 } from '../core/WorldTypes';

export interface TerrainHeightmapOptions {
  originX: number;
  originZ: number;
  width: number;
  height: number;
  cellSize: number;
  values: Float32Array;
}

export class TerrainHeightmap {
  public readonly originX: number;
  public readonly originZ: number;
  public readonly width: number;
  public readonly height: number;
  public readonly cellSize: number;
  public readonly values: Float32Array;

  constructor(options: TerrainHeightmapOptions) {
    if (options.width < 1 || options.height < 1) {
      throw new Error('TerrainHeightmap requires at least one cell.');
    }
    if (options.cellSize <= 0) {
      throw new Error('TerrainHeightmap requires a positive cell size.');
    }
    if (options.values.length < options.width * options.height) {
      throw new Error('TerrainHeightmap values do not match its dimensions.');
    }

    this.originX = options.originX;
    this.originZ = options.originZ;
    this.width = options.width;
    this.height = options.height;
    this.cellSize = options.cellSize;
    this.values = options.values;
  }

  public getBounds(): Bounds2 {
    return {
      minX: this.originX,
      minZ: this.originZ,
      maxX: this.originX + (this.width - 1) * this.cellSize,
      maxZ: this.originZ + (this.height - 1) * this.cellSize,
    };
  }

  public getValue(ix: number, iz: number): number {
    const x = Math.max(0, Math.min(this.width - 1, ix));
    const z = Math.max(0, Math.min(this.height - 1, iz));
    return this.values[z * this.width + x];
  }

  public setValue(ix: number, iz: number, value: number): void {
    if (ix < 0 || ix >= this.width || iz < 0 || iz >= this.height) return;
    this.values[iz * this.width + ix] = value;
  }

  public heightAt(x: number, z: number): number {
    const gx = (x - this.originX) / this.cellSize;
    const gz = (z - this.originZ) / this.cellSize;
    const clampedX = Math.max(0, Math.min(this.width - 1, gx));
    const clampedZ = Math.max(0, Math.min(this.height - 1, gz));

    const ix = Math.min(this.width - 1, Math.floor(clampedX));
    const iz = Math.min(this.height - 1, Math.floor(clampedZ));
    const ix1 = Math.min(this.width - 1, ix + 1);
    const iz1 = Math.min(this.height - 1, iz + 1);
    const tx = clampedX - ix;
    const tz = clampedZ - iz;

    const h00 = this.values[iz * this.width + ix];
    const h10 = this.values[iz * this.width + ix1];
    const h01 = this.values[iz1 * this.width + ix];
    const h11 = this.values[iz1 * this.width + ix1];
    const hx0 = h00 + (h10 - h00) * tx;
    const hx1 = h01 + (h11 - h01) * tx;
    return hx0 + (hx1 - hx0) * tz;
  }
}
