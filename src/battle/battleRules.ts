/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BattleSoul, BattleMove } from '../types';
import { TYPE_EFFECTIVENESS } from '../data/mobs';
import { DifficultyManager } from '../core/difficultyManager';

export interface DamageResult {
  damage: number;
  multiplier: number;
  isCrit: boolean;
  isStab: boolean;
  missed: boolean;
}

export function calculateDamage(
  attacker: BattleSoul,
  defender: BattleSoul,
  move: BattleMove,
  random: () => number
): DamageResult {
  if (move.accuracy < 100) {
    const hitRoll = random() * 100;
    if (hitRoll > move.accuracy) {
      return { damage: 0, multiplier: 1.0, isCrit: false, isStab: false, missed: true };
    }
  }

  if (move.power === 0) {
    return { damage: 0, multiplier: 1.0, isCrit: false, isStab: false, missed: false };
  }

  const mult = TYPE_EFFECTIVENESS[move.type]?.[defender.type] ?? 1.0;
  const isStab = move.type === attacker.type;
  const stabBonus = isStab ? 1.5 : 1.0;
  const isCrit = random() < 0.06;
  const critMult = isCrit ? 1.5 : 1.0;
  const randomFactor = 0.85 + random() * 0.15;
  const levelGapMod = DifficultyManager.getDamageModifier(attacker.level, defender.level);

  const levelPart = (2 * attacker.level) / 5 + 2;
  const baseDamage = ((levelPart * move.power * (attacker.attack / Math.max(1, defender.defense))) / 50 + 2);
  const totalDamage = Math.max(1, Math.floor(baseDamage * stabBonus * mult * critMult * randomFactor * levelGapMod));

  return {
    damage: totalDamage,
    multiplier: mult,
    isCrit,
    isStab,
    missed: false,
  };
}

export function calculateExpGain(rivalLevel: number): number {
  return Math.round(12 * rivalLevel);
}

export function calculateCatchRate(rival: BattleSoul, ballMultiplier: number = 1.0): number {
  const hpFactor = (rival.maxHp * 3 - rival.hp * 2) / (rival.maxHp * 3);
  const rarityMod = rival.rarity === 'rara' ? 0.6 : rival.rarity === 'poco común' ? 0.8 : 1.0;
  const baseRate = hpFactor * ballMultiplier * rarityMod;
  return Math.min(0.95, Math.max(0.10, baseRate));
}

export function determineTurnOrder(attacker: BattleSoul, defender: BattleSoul): 'attacker' | 'defender' {
  if (attacker.speed >= defender.speed) return 'attacker';
  return 'defender';
}

export function attemptFlee(random: () => number): boolean {
  return random() < 0.70;
}

export function chooseRivalMove(rival: BattleSoul, random: () => number): BattleMove {
  const usable = rival.moves.filter(m => m.pp > 0);
  if (usable.length === 0) {
    return {
      id: 'struggle',
      name: 'Golpe Básico',
      type: 'Luz',
      power: 30,
      pp: 99,
      maxPp: 99,
      accuracy: 100,
      description: 'Golpe desesperado.',
    };
  }
  return usable[Math.floor(random() * usable.length)];
}
