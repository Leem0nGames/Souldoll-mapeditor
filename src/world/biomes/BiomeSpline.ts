/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Bounds2, Vec2 } from '../core/WorldTypes';
import { clamp01, type BiomeId } from './BiomeDefinition';

export interface BiomeSplinePath {
  id: string;
  points: Vec2[];
}

export interface BiomeSpline {
  id: string;
  splineId: string;
  biomeId: BiomeId;
  width: number;
  falloff: number;
  strength: number;
  priority: number;
  enabled: boolean;
  tags: string[];
}

const EPSILON = 1e-6;

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

  const t = clamp01(((x - ax) * dx + (z - az) * dz) / lengthSq);
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

export function distanceToPolyline(points: readonly Vec2[], x: number, z: number): number {
  if (points.length === 0) return Infinity;
  if (points.length === 1) return Math.hypot(x - points[0].x, z - points[0].z);

  let minDistance = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const distance = distanceToSegment(x, z, a.x, a.z, b.x, b.z);
    if (distance < minDistance) minDistance = distance;
  }
  return minDistance;
}

export function getBiomeSplineBounds(path: BiomeSplinePath): Bounds2 {
  if (path.points.length === 0) {
    return { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };
  }

  let minX = path.points[0].x;
  let maxX = path.points[0].x;
  let minZ = path.points[0].z;
  let maxZ = path.points[0].z;
  for (let i = 1; i < path.points.length; i++) {
    const point = path.points[i];
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.z < minZ) minZ = point.z;
    if (point.z > maxZ) maxZ = point.z;
  }
  return { minX, minZ, maxX, maxZ };
}

export class BiomeSplineDatabase {
  private paths: Map<string, BiomeSplinePath> = new Map();
  private splines: BiomeSpline[] = [];

  constructor(paths: readonly BiomeSplinePath[] = [], splines: readonly BiomeSpline[] = []) {
    for (let i = 0; i < paths.length; i++) this.addPath(paths[i]);
    for (let i = 0; i < splines.length; i++) this.addSpline(splines[i]);
  }

  public addPath(path: BiomeSplinePath): void {
    this.paths.set(path.id, path);
  }

  public addSpline(spline: BiomeSpline): void {
    this.splines.push(spline);
  }

  public getPath(id: string): BiomeSplinePath | undefined {
    return this.paths.get(id);
  }

  public getSplines(): readonly BiomeSpline[] {
    return this.splines;
  }

  public distanceToPath(splineId: string, x: number, z: number): number | null {
    const path = this.paths.get(splineId);
    return path ? distanceToPolyline(path.points, x, z) : null;
  }
}
