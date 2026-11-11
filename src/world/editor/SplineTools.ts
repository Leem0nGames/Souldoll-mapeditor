/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Vec2 } from '../core/WorldTypes';
import type { WorldEditorCommand, WorldEditorSplineItem, WorldEditorState } from './WorldEditor';
import { cloneWorldEditorState } from './WorldEditor';

export function createSplineToggleCommand(
  state: WorldEditorState,
  splineId: string,
  enabled: boolean,
): WorldEditorCommand {
  const previous = cloneWorldEditorState(state).splineDefinitions;
  return {
    id: `spline-toggle:${splineId}`,
    description: `Toggle spline ${splineId} to ${enabled ? 'enabled' : 'disabled'}`,
    apply(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.splineDefinitions = next.splineDefinitions.map((spline) =>
        spline.id === splineId ? { ...spline, enabled } : spline,
      );
      return next;
    },
    undo(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.splineDefinitions = previous;
      return next;
    },
  };
}

export function createSplinePointsCommand(
  state: WorldEditorState,
  splineId: string,
  points: Vec2[],
): WorldEditorCommand {
  const previous = cloneWorldEditorState(state).splineDefinitions;
  return {
    id: `spline-points:${splineId}`,
    description: `Update points for spline ${splineId}`,
    apply(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.splineDefinitions = next.splineDefinitions.map((spline) =>
        spline.id === splineId ? { ...spline, points } : spline,
      );
      return next;
    },
    undo(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.splineDefinitions = previous;
      return next;
    },
  };
}

export function createSplinePreset(
  id: string,
  type: WorldEditorSplineItem['type'],
  enabled = true,
  points: Vec2[] = [],
): WorldEditorSplineItem {
  return { id, type, enabled, points };
}
