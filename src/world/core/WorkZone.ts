/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Bounds2, Vec2 } from './WorldTypes';
import { boundsContains, boundsIntersect } from './WorldTypes';

export interface WorkZone {
  id: string;
  name: string;
  center: Vec2;
  size: Vec2;
  enabled: boolean;
  tags: string[];
}

export interface WorkZoneRuntime {
  bounds: Bounds2;
  contains(x: number, z: number, margin?: number): boolean;
  intersects(bounds: Bounds2): boolean;
  clamp(bounds: Bounds2): Bounds2 | null;
}

export function getWorkZoneBounds(zone: WorkZone): Bounds2 {
  const halfX = Math.abs(zone.size.x) * 0.5;
  const halfZ = Math.abs(zone.size.z) * 0.5;
  return {
    minX: zone.center.x - halfX,
    minZ: zone.center.z - halfZ,
    maxX: zone.center.x + halfX,
    maxZ: zone.center.z + halfZ,
  };
}

export function createWorkZoneRuntime(zone: WorkZone): WorkZoneRuntime {
  const bounds = getWorkZoneBounds(zone);
  return {
    bounds,
    contains(x, z, margin = 0) {
      return boundsContains(bounds, x, z, margin);
    },
    intersects(other) {
      return boundsIntersect(bounds, other);
    },
    clamp(other) {
      if (!boundsIntersect(bounds, other)) return null;
      return {
        minX: Math.max(bounds.minX, other.minX),
        minZ: Math.max(bounds.minZ, other.minZ),
        maxX: Math.min(bounds.maxX, other.maxX),
        maxZ: Math.min(bounds.maxZ, other.maxZ),
      };
    },
  };
}
