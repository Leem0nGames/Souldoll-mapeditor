/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Bounds2, Vec2 } from '../core/WorldTypes';

export type WorldSplineType = 'road' | 'river' | 'trail' | 'lake-edge' | 'ridge';

export interface WorldSpline {
  id: string;
  type: WorldSplineType;
  name: string;
  points: Vec2[];
  width: number;
  falloff: number;
  strength: number;
  priority: number;
  enabled: boolean;
  tags: string[];
  closed?: boolean;
  heightOffset?: number;
}

export interface WorldSplineSample {
  x: number;
  z: number;
  distance: number;
  influence: number;
  along: number;
  tangent: Vec2;
}

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function distanceToSegment(
  x: number,
  z: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq <= 1e-8) {
    return Math.hypot(x - ax, z - az);
  }

  const t = clamp01(((x - ax) * dx + (z - az) * dz) / lengthSq);
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

export function distanceToPolyline(points: readonly Vec2[], x: number, z: number): number {
  if (points.length === 0) return Number.POSITIVE_INFINITY;
  if (points.length === 1) return Math.hypot(x - points[0].x, z - points[0].z);

  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const distance = distanceToSegment(x, z, current.x, current.z, next.x, next.z);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

export function worldSplineBounds(points: readonly Vec2[]): Bounds2 {
  if (points.length === 0) {
    return { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };
  }

  let minX = points[0].x;
  let maxX = points[0].x;
  let minZ = points[0].z;
  let maxZ = points[0].z;

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.z < minZ) minZ = point.z;
    if (point.z > maxZ) maxZ = point.z;
  }

  return { minX, minZ, maxX, maxZ };
}

export function sampleWorldSpline(
  spline: WorldSpline,
  x: number,
  z: number
): WorldSplineSample {
  const points = spline.points;
  if (points.length === 0) {
    return {
      x: 0,
      z: 0,
      distance: Number.POSITIVE_INFINITY,
      influence: 0,
      along: 0,
      tangent: { x: 1, z: 0 },
    };
  }

  let nearestPoint = points[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestT = 0;
  let nearestSegmentDirection: Vec2 = { x: 1, z: 0 };

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;

    if (lengthSq <= 1e-8) {
      const distance = Math.hypot(x - a.x, z - a.z);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = a;
        nearestT = i;
        nearestSegmentDirection = { x: 1, z: 0 };
      }
      continue;
    }

    const t = clamp01(((x - a.x) * dx + (z - a.z) * dz) / lengthSq);
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const distance = Math.hypot(x - px, z - pz);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPoint = { x: px, z: pz };
      nearestT = i + t;
      nearestSegmentDirection = { x: dx, z: dz };
    }
  }

  const length = Math.max(1, points.length - 1);
  const along = Math.min(1, nearestT / length);
  const tangentLength = Math.hypot(nearestSegmentDirection.x, nearestSegmentDirection.z) || 1;
  const tangent: Vec2 = {
    x: nearestSegmentDirection.x / tangentLength,
    z: nearestSegmentDirection.z / tangentLength,
  };

  const halfWidth = Math.abs(spline.width) * 0.5;
  if (halfWidth <= 1e-6 || nearestDistance >= halfWidth) {
    return {
      x: nearestPoint.x,
      z: nearestPoint.z,
      distance: nearestDistance,
      influence: 0,
      along,
      tangent,
    };
  }

  const falloff = clamp01(spline.falloff);
  const innerWidth = halfWidth * (1 - falloff);
  const influence =
    nearestDistance <= innerWidth
      ? spline.strength
      : spline.strength * (1 - clamp01((nearestDistance - innerWidth) / (halfWidth - innerWidth || 1e-6)));

  return {
    x: nearestPoint.x,
    z: nearestPoint.z,
    distance: nearestDistance,
    influence: clamp01(influence),
    along,
    tangent,
  };
}

export function createLoopSpline(
  id: string,
  name: string,
  center: Vec2,
  radius: number,
  segments: number,
  options: Partial<Pick<WorldSpline, 'type' | 'width' | 'falloff' | 'strength' | 'priority' | 'enabled' | 'tags' | 'heightOffset'>> = {}
): WorldSpline {
  const points: Vec2[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: center.x + Math.cos(angle) * radius,
      z: center.z + Math.sin(angle) * radius,
    });
  }

  return {
    id,
    type: options.type ?? 'lake-edge',
    name,
    points,
    width: options.width ?? 10,
    falloff: options.falloff ?? 0.5,
    strength: options.strength ?? 1,
    priority: options.priority ?? 0,
    enabled: options.enabled ?? true,
    tags: options.tags ?? ['world'],
    closed: true,
    heightOffset: options.heightOffset ?? 0,
  };
}
