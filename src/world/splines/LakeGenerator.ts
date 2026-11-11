/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Vec2 } from '../core/WorldTypes';
import type { WorldSpline } from './WorldSpline';
import { createLoopSpline } from './WorldSpline';

export function createLakeEdgeSpline(
  center: Vec2 = { x: 100, z: -80 },
  radius = 26,
  segments = 28,
  overrides: Partial<WorldSpline> = {}
): WorldSpline {
  const spline = createLoopSpline('lake-edge', 'Borde del lago', center, radius, segments, {
    type: 'lake-edge',
    width: overrides.width ?? 12,
    falloff: overrides.falloff ?? 0.5,
    strength: overrides.strength ?? 1,
    priority: overrides.priority ?? 180,
    enabled: overrides.enabled ?? true,
    tags: overrides.tags ?? ['lake', 'water'],
    heightOffset: overrides.heightOffset,
  });

  return {
    ...spline,
    ...overrides,
  };
}
