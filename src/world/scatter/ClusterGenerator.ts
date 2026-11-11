/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Vec2 } from '../core/WorldTypes';
import type { ScatterDefinition } from './ScatterDefinition';

function hashCoord(ix: number, iz: number, seed: number): number {
  let h = seed ^ Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iz, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function scatterPointHash(x: number, z: number, seed: number): number {
  return hashCoord(Math.floor(x * 1000), Math.floor(z * 1000), seed) / 4294967296;
}

export function valueNoise2D(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smoothstep(0, 1, x - x0);
  const tz = smoothstep(0, 1, z - z0);

  const v00 = hashCoord(x0, z0, seed) / 4294967296;
  const v10 = hashCoord(x0 + 1, z0, seed) / 4294967296;
  const v01 = hashCoord(x0, z0 + 1, seed) / 4294967296;
  const v11 = hashCoord(x0 + 1, z0 + 1, seed) / 4294967296;

  const vx0 = v00 + (v10 - v00) * tx;
  const vx1 = v01 + (v11 - v01) * tx;
  return vx0 + (vx1 - vx0) * tz;
}

export function scatterCellSize(maxDensity: number): number {
  return Math.max(0.5, 1 / Math.sqrt(Math.max(maxDensity, 0.000001)));
}

export function scatterAcceptance(
  group: ScatterDefinition,
  density: number,
  maxDensity: number,
  x: number,
  z: number
): number {
  let chance = clamp01(density / Math.max(maxDensity, 0.000001));

  if (group.distribution === 'cluster' && group.clusterStrength > 0) {
    const scale = Math.max(1, group.clusterScale);
    const raw = valueNoise2D(x / scale, z / scale, group.seed ^ 0x9e3779b9);
    const cluster = smoothstep(0.38, 0.62, raw);
    chance *= 1 - group.clusterStrength + group.clusterStrength * cluster;
  }

  if (group.noiseStrength > 0) {
    const scale = Math.max(1, group.clusterScale * 0.75);
    const noise = valueNoise2D(x / scale, z / scale, group.seed ^ 0x85ebca6b);
    chance *= 1 - group.noiseStrength + group.noiseStrength * noise;
  }

  return clamp01(chance);
}

export function scatterJitter(
  group: ScatterDefinition,
  cellSize: number,
  random: number
): number {
  if (group.distribution === 'grid') return 0;
  return (random - 0.5) * cellSize * 0.9;
}

export function pickWeightedVariant(
  random: number,
  variantCount: number,
  weights?: readonly number[]
): number {
  if (variantCount <= 1) return 0;
  if (!weights || weights.length === 0) {
    return Math.min(variantCount - 1, Math.floor(random * variantCount));
  }

  let total = 0;
  const count = Math.min(variantCount, weights.length);
  for (let i = 0; i < count; i++) {
    if (weights[i] > 0) total += weights[i];
  }
  if (!(total > 0)) {
    return Math.min(variantCount - 1, Math.floor(random * variantCount));
  }

  let target = random * total;
  for (let i = 0; i < count; i++) {
    const weight = weights[i];
    if (weight <= 0) continue;
    target -= weight;
    if (target <= 0) return i;
  }
  return count - 1;
}

export function distanceToPolyline(x: number, z: number, points: readonly Vec2[]): number {
  if (points.length === 0) return Infinity;
  if (points.length === 1) return Math.hypot(x - points[0].x, z - points[0].z);

  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const ax = points[i].x;
    const az = points[i].z;
    const bx = points[i + 1].x;
    const bz = points[i + 1].z;
    const dx = bx - ax;
    const dz = bz - az;
    const lengthSq = dx * dx + dz * dz;
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
    const px = ax + dx * t;
    const pz = az + dz * t;
    const distance = Math.hypot(x - px, z - pz);
    if (distance < best) best = distance;
  }
  return best;
}
