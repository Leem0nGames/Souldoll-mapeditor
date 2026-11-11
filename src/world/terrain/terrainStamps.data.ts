/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TerrainStamp } from './TerrainStamp';

export const SOULDOLLS_TERRAIN_STAMPS: TerrainStamp[] = [
  {
    id: 'demo-east-hill',
    category: 'hill',
    source: { kind: 'preset', preset: 'hill', seed: 1201 },
    seed: 1201,
    position: { x: 66, z: -6 },
    rotation: 0.35,
    scale: { x: 15, z: 15, amplitude: 4.2 },
    intensity: 0.9,
    blendMode: 'add',
    falloff: { type: 'smoothstep', inner: 0.12, outer: 1 },
    enabled: true,
    priority: 10,
    tags: ['demo', 'terrain'],
  },
  {
    id: 'demo-east-ridge',
    category: 'ridge',
    source: { kind: 'preset', preset: 'ridge', seed: 1202 },
    seed: 1202,
    position: { x: 80, z: -22 },
    rotation: -0.55,
    scale: { x: 22, z: 8, amplitude: 7.5 },
    intensity: 0.95,
    blendMode: 'max',
    falloff: { type: 'smoothstep', inner: 0.1, outer: 1 },
    enabled: true,
    priority: 20,
    tags: ['demo', 'terrain'],
  },
  {
    id: 'demo-east-crater',
    category: 'crater',
    source: { kind: 'preset', preset: 'crater', seed: 1203 },
    seed: 1203,
    position: { x: 64, z: -40 },
    rotation: 0.2,
    scale: { x: 12, z: 12, amplitude: 5.5 },
    intensity: 0.85,
    blendMode: 'add',
    falloff: { type: 'gaussian', inner: 0.05, outer: 1 },
    enabled: true,
    priority: 30,
    tags: ['demo', 'terrain'],
  },
];
