/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DifficultyManager = {
  // Scales mob level based on player progress
  getWildSoulLevel(min: number, max: number, playerLevel: number): [number, number] {
    const minLevel = Math.max(min, playerLevel - 2);
    const maxLevel = Math.max(max, playerLevel + 2);
    return [minLevel, maxLevel];
  },

  // Modifies base stats of mobs based on their level
  getStatModifier(level: number): number {
    return 1 + (level - 5) * 0.05;
  },

  // Modifies damage output based on the level gap between attacker and defender
  getDamageModifier(attackerLevel: number, defenderLevel: number): number {
    const gap = attackerLevel - defenderLevel;
    if (gap > 0) return 1 + gap * 0.05;
    if (gap < 0) return Math.max(0.5, 1 + gap * 0.05);
    return 1.0;
  }
};
