/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WorldEditorCommand, WorldEditorScatterItem, WorldEditorState } from './WorldEditor';
import { cloneWorldEditorState } from './WorldEditor';

export function createScatterToggleCommand(
  state: WorldEditorState,
  groupId: string,
  enabled: boolean,
): WorldEditorCommand {
  const previous = cloneWorldEditorState(state).scatterGroups;
  return {
    id: `scatter-toggle:${groupId}`,
    description: `Toggle scatter group ${groupId} to ${enabled ? 'enabled' : 'disabled'}`,
    apply(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.scatterGroups = next.scatterGroups.map((group) =>
        group.id === groupId ? { ...group, enabled } : group,
      );
      return next;
    },
    undo(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.scatterGroups = previous;
      return next;
    },
  };
}

export function createScatterDensityCommand(
  state: WorldEditorState,
  groupId: string,
  density: number,
): WorldEditorCommand {
  const previous = cloneWorldEditorState(state).scatterGroups;
  return {
    id: `scatter-density:${groupId}`,
    description: `Set scatter density for ${groupId} to ${density}`,
    apply(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.scatterGroups = next.scatterGroups.map((group) =>
        group.id === groupId ? { ...group, density } : group,
      );
      return next;
    },
    undo(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.scatterGroups = previous;
      return next;
    },
  };
}

export function createScatterPreset(
  id: string,
  density = 1,
  enabled = true,
  tags: string[] = [],
): WorldEditorScatterItem {
  return { id, enabled, density, tags };
}
