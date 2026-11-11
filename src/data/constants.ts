/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const LUMINATI_SCALE = {
  // Base reference character (Robin) - 106x210 aspect ratio
  PLAYER_HEIGHT: 6.2,
  PLAYER_WIDTH: 3.13, // 6.2 * (106 / 210)
  PLAYER_HALF_HEIGHT: 3.1,

  // Environmental grandeur: Trees tower 4x over the player with natural aspect ratio
  TREE_WIDTH_BASE: 25.0,
  TREE_HEIGHT_BASE: 23.0,

  // Architecture: Stately 2-story village cottages
  HOUSE_WIDTH: 18.0,
  HOUSE_HEIGHT: 10.0,
  HOUSE_DEPTH: 14.0,
  ROOF_HEIGHT: 5.2,

  // Grand Research Laboratory
  LAB_WIDTH: 26.0,
  LAB_HEIGHT: 13.0,
  LAB_DEPTH: 18.0,
  LAB_ROOF_HEIGHT: 6.0,

  // Village props scaled to human height
  STREET_LAMP_WIDTH: 3.6,
  STREET_LAMP_HEIGHT: 14.5,
  FENCE_SIZE: 3.2,
  HEDGE_SIZE: 3.8,
  SIGNPOST_SIZE: 4.2,
  CHEST_SIZE: 3.0,
  TALL_GRASS_SIZE: 3.0,
  SOUL_DOLL_SIZE: 4.2,
} as const;

export const GAME_CONSTANTS = {
  WORLD_BOUNDS: 190,
  PLAYER_BASE_SPEED: 7.2,
  PLAYER_SPRINT_SPEED: 11.5,
  PLAYER_RADIUS: 0.85,
  CAMERA_DISTANCE: 21,
  CAMERA_HEIGHT: 11.5,
  DAY_NIGHT_CYCLE_DURATION: 120, // seconds
  GRASS_ENCOUNTER_CHANCE: 0.08,
  INITIAL_GOLD: 50,
  MAX_TEAM_SIZE: 6,
} as const;

