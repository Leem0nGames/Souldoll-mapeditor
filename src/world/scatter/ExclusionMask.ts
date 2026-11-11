/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Bounds2, Vec2 } from '../core/WorldTypes';

export type ExclusionShape =
  | { type: 'circle'; center: Vec2; radius: number }
  | { type: 'rect'; bounds: Bounds2 }
  | { type: 'polygon'; points: Vec2[] };

export interface ExclusionRegion {
  id: string;
  shape: ExclusionShape;
  tags?: string[];
  enabled?: boolean;
}

export interface ExclusionMaskOptions {
  regions?: readonly ExclusionRegion[];
}

function pointInPolygon(x: number, z: number, points: readonly Vec2[]): boolean {
  if (points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const zi = points[i].z;
    const xj = points[j].x;
    const zj = points[j].z;
    const intersects = zi > z !== zj > z;
    if (intersects && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function exclusionShapeContains(shape: ExclusionShape, x: number, z: number): boolean {
  if (shape.type === 'circle') {
    return Math.hypot(x - shape.center.x, z - shape.center.z) <= shape.radius;
  }
  if (shape.type === 'rect') {
    return (
      x >= shape.bounds.minX &&
      x <= shape.bounds.maxX &&
      z >= shape.bounds.minZ &&
      z <= shape.bounds.maxZ
    );
  }
  return pointInPolygon(x, z, shape.points);
}

export class ExclusionMask {
  private regions: ExclusionRegion[] = [];

  constructor(options?: ExclusionMaskOptions) {
    if (options?.regions) {
      for (let i = 0; i < options.regions.length; i++) {
        this.add(options.regions[i]);
      }
    }
  }

  public add(region: ExclusionRegion): void {
    this.regions.push({
      ...region,
      tags: region.tags ? [...region.tags] : undefined,
    });
  }

  public remove(id: string): boolean {
    const index = this.regions.findIndex((region) => region.id === id);
    if (index < 0) return false;
    this.regions.splice(index, 1);
    return true;
  }

  public clear(): void {
    this.regions.length = 0;
  }

  public get size(): number {
    return this.regions.length;
  }

  public getRegions(): readonly ExclusionRegion[] {
    return this.regions;
  }

  public isExcluded(x: number, z: number, tags: readonly string[] = []): boolean {
    for (let i = 0; i < this.regions.length; i++) {
      const region = this.regions[i];
      if (region.enabled === false) continue;

      const regionTags = region.tags;
      if (regionTags && regionTags.length > 0) {
        let matches = false;
        for (let t = 0; t < regionTags.length; t++) {
          if (tags.includes(regionTags[t])) {
            matches = true;
            break;
          }
        }
        if (!matches) continue;
      }

      if (exclusionShapeContains(region.shape, x, z)) {
        return true;
      }
    }
    return false;
  }
}
