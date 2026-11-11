/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TerrainStamp } from '../terrain/TerrainStamp';
import type { WorldEditorCommand, WorldEditorState } from './WorldEditor';
import { cloneWorldEditorState } from './WorldEditor';

export function createTerrainStampCommand(state: WorldEditorState, stamp: TerrainStamp): WorldEditorCommand {
  const previous = cloneWorldEditorState(state).terrainStamps;
  return {
    id: `terrain-stamp:${stamp.id}`,
    description: `Add terrain stamp ${stamp.id}`,
    apply(currentState) {
      const next = cloneWorldEditorState(currentState);
      const index = next.terrainStamps.findIndex((candidate) => candidate.id === stamp.id);
      if (index >= 0) {
        next.terrainStamps[index] = stamp;
      } else {
        next.terrainStamps.push(stamp);
      }
      return next;
    },
    undo(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.terrainStamps = previous;
      return next;
    },
  };
}

export function removeTerrainStampCommand(state: WorldEditorState, stampId: string): WorldEditorCommand {
  const previous = cloneWorldEditorState(state).terrainStamps;
  return {
    id: `terrain-stamp-remove:${stampId}`,
    description: `Remove terrain stamp ${stampId}`,
    apply(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.terrainStamps = next.terrainStamps.filter((stamp) => stamp.id !== stampId);
      return next;
    },
    undo(currentState) {
      const next = cloneWorldEditorState(currentState);
      next.terrainStamps = previous;
      return next;
    },
  };
}
