/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vec2 {
  x: number;
  z: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Bounds2 {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export type HeightAtFn = (x: number, z: number) => number;

export function boundsContains(bounds: Bounds2, x: number, z: number, margin = 0): boolean {
  return (
    x >= bounds.minX - margin &&
    x <= bounds.maxX + margin &&
    z >= bounds.minZ - margin &&
    z <= bounds.maxZ + margin
  );
}

export function boundsIntersect(a: Bounds2, b: Bounds2): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

export function boundsFromCenter(center: Vec2, radiusX: number, radiusZ: number): Bounds2 {
  return {
    minX: center.x - radiusX,
    minZ: center.z - radiusZ,
    maxX: center.x + radiusX,
    maxZ: center.z + radiusZ,
  };
}
