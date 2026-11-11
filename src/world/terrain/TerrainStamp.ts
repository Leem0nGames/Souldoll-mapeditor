/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Bounds2, Vec2 } from '../core/WorldTypes';

export type StampCategory =
  | 'mountain'
  | 'hill'
  | 'valley'
  | 'ridge'
  | 'plateau'
  | 'crater'
  | 'cliff'
  | 'plain'
  | 'depression';

export type StampBlendMode = 'add' | 'max' | 'min' | 'replace';

export type StampFalloff = 'none' | 'linear' | 'smoothstep' | 'cosine' | 'gaussian';

export interface TerrainStampAsset {
  resolution: number;
  values: number[];
}

export type StampSource =
  | { kind: 'preset'; preset: StampCategory; seed: number }
  | { kind: 'embedded'; resolution: number; values: number[] }
  | { kind: 'asset'; assetId: string };

export interface TerrainStamp {
  id: string;
  category: StampCategory;
  source: StampSource;
  seed: number;
  position: Vec2;
  rotation: number;
  scale: { x: number; z: number; amplitude: number };
  intensity: number;
  blendMode: StampBlendMode;
  falloff: {
    type: StampFalloff;
    inner: number;
    outer: number;
  };
  enabled: boolean;
  priority: number;
  tags: string[];
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function getTerrainStampBounds(stamp: TerrainStamp): Bounds2 {
  const scaleX = Math.abs(stamp.scale.x);
  const scaleZ = Math.abs(stamp.scale.z);
  const cos = Math.abs(Math.cos(stamp.rotation));
  const sin = Math.abs(Math.sin(stamp.rotation));
  const radiusX = scaleX * cos + scaleZ * sin;
  const radiusZ = scaleX * sin + scaleZ * cos;
  return {
    minX: stamp.position.x - radiusX,
    minZ: stamp.position.z - radiusZ,
    maxX: stamp.position.x + radiusX,
    maxZ: stamp.position.z + radiusZ,
  };
}
