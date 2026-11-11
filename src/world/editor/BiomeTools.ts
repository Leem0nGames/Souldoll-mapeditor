/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WorldEditorBiomeItem, WorldEditorCommand, WorldEditorState } from './WorldEditor';
import { cloneWorldEditorState } from './WorldEditor';

export function createBiomeToggleCommand(
  state: WorldEditorState,
  biomeId: string,
  enabled: boolean,
): WorldEditorCommand {
  const previous = cloneWorldEditorState(state).biomeDefinitions;
  return {
    id: `biome-toggle:${biomeId}`,
    description: `Toggle biome ${biomeId} to ${enabled ? 'enabled' : 'disabled'}`,
    apply(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.biomeDefinitions = next.biomeDefinitions.map((biome) =>
        biome.id === biomeId ? { ...biome, enabled } : biome,
      );
      return next;
    },
    undo(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.biomeDefinitions = previous;
      return next;
    },
  };
}

export function createBiomePriorityCommand(
  state: WorldEditorState,
  biomeId: string,
  priority: number,
): WorldEditorCommand {
  const previous = cloneWorldEditorState(state).biomeDefinitions;
  return {
    id: `biome-priority:${biomeId}`,
    description: `Set biome ${biomeId} priority to ${priority}`,
    apply(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.biomeDefinitions = next.biomeDefinitions.map((biome) =>
        biome.id === biomeId ? { ...biome, priority } : biome,
      );
      return next;
    },
    undo(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.biomeDefinitions = previous;
      return next;
    },
  };
}

export function createBiomePreset(
  id: string,
  priority = 1,
  enabled = true,
  tags: string[] = [],
): WorldEditorBiomeItem {
  return { id, enabled, priority, tags };
}
