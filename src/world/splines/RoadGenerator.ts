/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Vec2 } from '../core/WorldTypes';
import type { WorldSpline } from './WorldSpline';

export const DEFAULT_ROAD_POINTS: Vec2[] = [
  { x: -32, z: 112 },
  { x: -18, z: 98 },
  { x: 4, z: 90 },
  { x: 26, z: 72 },
  { x: 18, z: 46 },
  { x: 0, z: 20 },
  { x: -8, z: -10 },
  { x: -2, z: -42 },
  { x: 6, z: -66 },
  { x: 24, z: -90 },
];

export function createDefaultRoadSpline(): WorldSpline {
  return {
    id: 'road-village-main',
    type: 'road',
    name: 'Ruta principal',
    points: DEFAULT_ROAD_POINTS,
    width: 10,
    falloff: 0.38,
    strength: 1,
    priority: 150,
    enabled: true,
    tags: ['road', 'travel'],
    closed: false,
  };
}

export function createRoadSpline(points: readonly Vec2[], overrides: Partial<WorldSpline> = {}): WorldSpline {
  return {
    id: overrides.id ?? 'road-custom',
    type: overrides.type ?? 'road',
    name: overrides.name ?? 'Camino',
    points: points.map((point) => ({ ...point })),
    width: overrides.width ?? 10,
    falloff: overrides.falloff ?? 0.38,
    strength: overrides.strength ?? 1,
    priority: overrides.priority ?? 150,
    enabled: overrides.enabled ?? true,
    tags: overrides.tags ?? ['road'],
    closed: overrides.closed ?? false,
    heightOffset: overrides.heightOffset,
  };
}
