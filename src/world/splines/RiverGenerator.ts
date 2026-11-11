/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Vec2 } from '../core/WorldTypes';
import type { WorldSpline } from './WorldSpline';

export const DEFAULT_RIVER_POINTS: Vec2[] = [
  { x: 160, z: 160 },
  { x: 115, z: 135 },
  { x: 70, z: 118 },
  { x: 25, z: 108 },
  { x: -4, z: 98 },
  { x: -34, z: 84 },
  { x: -52, z: 58 },
  { x: -46, z: 24 },
  { x: -22, z: -8 },
  { x: 12, z: -32 },
  { x: 48, z: -56 },
  { x: 76, z: -74 },
  { x: 100, z: -80 },
];

export function createDefaultRiverSpline(): WorldSpline {
  return {
    id: 'river-main',
    type: 'river',
    name: 'Río principal',
    points: DEFAULT_RIVER_POINTS,
    width: 12,
    falloff: 0.45,
    strength: 1,
    priority: 200,
    enabled: true,
    tags: ['river', 'water'],
    closed: false,
  };
}

export function createRiverSpline(points: readonly Vec2[], overrides: Partial<WorldSpline> = {}): WorldSpline {
  return {
    id: overrides.id ?? 'river-custom',
    type: overrides.type ?? 'river',
    name: overrides.name ?? 'Río',
    points: points.map((point) => ({ ...point })),
    width: overrides.width ?? 12,
    falloff: overrides.falloff ?? 0.45,
    strength: overrides.strength ?? 1,
    priority: overrides.priority ?? 200,
    enabled: overrides.enabled ?? true,
    tags: overrides.tags ?? ['river'],
    closed: overrides.closed ?? false,
    heightOffset: overrides.heightOffset,
  };
}
