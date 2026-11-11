/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Bounds2, Vec2 } from '../core/WorldTypes';
import { clamp01, type BiomeId } from './BiomeDefinition';

export type BiomeMaskShape =
  | { type: 'circle'; center: Vec2; radius: number }
  | { type: 'rect'; bounds: Bounds2 }
  | { type: 'polygon'; points: Vec2[] }
  | { type: 'spline'; splineId: string; width: number };

export interface BiomeMask {
  id: string;
  biomeId: BiomeId;
  mode: 'add' | 'subtract' | 'override';
  shape: BiomeMaskShape;
  falloff: number;
  strength: number;
  priority: number;
  enabled: boolean;
  tags: string[];
}

export interface BiomeMaskSampleContext {
  splineDistance?: (splineId: string, x: number, z: number) => number | null;
}

const EPSILON = 1e-6;

function smoothStep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function pointInPolygon(points: readonly Vec2[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    const intersects =
      a.z > z !== b.z > z &&
      x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
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
  if (lengthSq <= EPSILON) return Math.hypot(x - ax, z - az);

  let t = ((x - ax) * dx + (z - az) * dz) / lengthSq;
  t = clamp01(t);
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

function distanceToPolygonEdges(points: readonly Vec2[], x: number, z: number): number {
  if (points.length < 2) {
    return points.length === 1 ? Math.hypot(x - points[0].x, z - points[0].z) : Infinity;
  }

  let minDistance = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const distance = distanceToSegment(x, z, points[j].x, points[j].z, points[i].x, points[i].z);
    if (distance < minDistance) minDistance = distance;
  }
  return minDistance;
}

function polygonBounds(points: readonly Vec2[]): Bounds2 {
  if (points.length === 0) return { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };

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

export function getBiomeMaskBounds(shape: BiomeMaskShape): Bounds2 {
  switch (shape.type) {
    case 'circle':
      return {
        minX: shape.center.x - Math.abs(shape.radius),
        minZ: shape.center.z - Math.abs(shape.radius),
        maxX: shape.center.x + Math.abs(shape.radius),
        maxZ: shape.center.z + Math.abs(shape.radius),
      };
    case 'rect':
      return shape.bounds;
    case 'polygon':
      return polygonBounds(shape.points);
    case 'spline':
      return { minX: -Infinity, minZ: -Infinity, maxX: Infinity, maxZ: Infinity };
  }
}

function circleInfluence(
  x: number,
  z: number,
  center: Vec2,
  radius: number,
  falloff: number,
  strength: number
): number {
  const safeRadius = Math.abs(radius);
  if (safeRadius <= EPSILON) return 0;

  const normalizedDistance = Math.hypot(x - center.x, z - center.z) / safeRadius;
  if (normalizedDistance >= 1) return 0;
  if (falloff <= EPSILON) return strength;

  const core = 1 - falloff;
  if (normalizedDistance <= core) return strength;
  const t = clamp01((1 - normalizedDistance) / falloff);
  return strength * smoothStep(0, 1, t);
}

function rectInfluence(
  x: number,
  z: number,
  bounds: Bounds2,
  falloff: number,
  strength: number
): number {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxZ - bounds.minZ;
  if (width <= EPSILON || height <= EPSILON) return 0;

  const edgeDistance = Math.min(
    x - bounds.minX,
    bounds.maxX - x,
    z - bounds.minZ,
    bounds.maxZ - z
  );
  if (edgeDistance < 0) return 0;
  if (falloff <= EPSILON) return strength;

  const fadeDistance = falloff * Math.min(width, height) * 0.5;
  if (fadeDistance <= EPSILON) return strength;
  return strength * smoothStep(0, fadeDistance, edgeDistance);
}

function polygonInfluence(
  x: number,
  z: number,
  points: readonly Vec2[],
  falloff: number,
  strength: number
): number {
  if (!pointInPolygon(points, x, z)) return 0;
  if (falloff <= EPSILON) return strength;

  const bounds = polygonBounds(points);
  const fadeDistance =
    falloff * Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) * 0.5;
  if (fadeDistance <= EPSILON) return strength;

  const edgeDistance = distanceToPolygonEdges(points, x, z);
  return strength * smoothStep(0, fadeDistance, edgeDistance);
}

function splineInfluence(
  x: number,
  z: number,
  splineId: string,
  width: number,
  falloff: number,
  strength: number,
  context: BiomeMaskSampleContext | undefined
): number {
  if (!context?.splineDistance) return 0;

  const distance = context.splineDistance(splineId, x, z);
  if (distance === null || !Number.isFinite(distance)) return 0;

  const halfWidth = Math.abs(width) * 0.5;
  if (halfWidth <= EPSILON || distance >= halfWidth) return 0;
  if (falloff <= EPSILON) return strength;

  const core = halfWidth * (1 - falloff);
  if (distance <= core) return strength;
  const t = clamp01((halfWidth - distance) / (halfWidth * falloff));
  return strength * smoothStep(0, 1, t);
}

export function sampleBiomeMask(
  mask: BiomeMask,
  x: number,
  z: number,
  context?: BiomeMaskSampleContext
): number {
  if (!mask.enabled) return 0;

  const strength = clamp01(mask.strength);
  if (strength <= EPSILON) return 0;

  const falloff = clamp01(mask.falloff);
  const shape = mask.shape;

  switch (shape.type) {
    case 'circle':
      return circleInfluence(x, z, shape.center, shape.radius, falloff, strength);
    case 'rect':
      return rectInfluence(x, z, shape.bounds, falloff, strength);
    case 'polygon':
      return polygonInfluence(x, z, shape.points, falloff, strength);
    case 'spline':
      return splineInfluence(
        x,
        z,
        shape.splineId,
        shape.width,
        falloff,
        strength,
        context
      );
  }
}
