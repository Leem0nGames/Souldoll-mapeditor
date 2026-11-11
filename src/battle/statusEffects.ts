/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StatusEffectType, ActiveStatusEffect, BattleSoul, SoulType } from '../types';

export interface StatusEffectDef {
  type: StatusEffectType;
  name: string;
  code: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  defaultTurns: number;
  description: string;
  flavor: string;
}

export const STATUS_EFFECT_DEFS: Record<StatusEffectType, StatusEffectDef> = {
  burn: {
    type: 'burn',
    name: 'Quemado',
    code: 'QMD',
    icon: '🔥',
    color: '#f97316',
    bgColor: 'rgba(234, 88, 12, 0.25)',
    borderColor: '#ea580c',
    defaultTurns: 4,
    description: 'Pierde 8% de HP máximo al final de cada turno. Reduce el poder de ataque un 20%.',
    flavor: 'Llamas residuales de fuego místico que consumen la madera y el alma de la marioneta.',
  },
  poison: {
    type: 'poison',
    name: 'Envenenado',
    code: 'ENV',
    icon: '☠️',
    color: '#c084fc',
    bgColor: 'rgba(147, 51, 234, 0.25)',
    borderColor: '#9333ea',
    defaultTurns: 4,
    description: 'Sufre daño tóxico progresivo (10% HP) al final de cada turno y reduce la estabilidad.',
    flavor: 'Toxinas botánicas o miasmas sombríos que carcomen las junturas mecánicas.',
  },
  paralysis: {
    type: 'paralysis',
    name: 'Paralizado',
    code: 'PAR',
    icon: '⚡',
    color: '#facc15',
    bgColor: 'rgba(202, 138, 4, 0.25)',
    borderColor: '#eab308',
    defaultTurns: 3,
    description: '25% de probabilidad de perder el turno sin actuar. Velocidad reducida a la mitad.',
    flavor: 'Corrientes de alto voltaje que bloquean los engranajes y desalinean los hilos del alma.',
  },
  frost: {
    type: 'frost',
    name: 'Congelado',
    code: 'CON',
    icon: '❄️',
    color: '#38bdf8',
    bgColor: 'rgba(2, 132, 199, 0.25)',
    borderColor: '#0284c7',
    defaultTurns: 2,
    description: 'Inmovilizado por escarcha sólida. No puede atacar hasta descongelarse.',
    flavor: 'Hielo glaciar que petrifica las articulaciones de la marioneta.',
  },
  sleep: {
    type: 'sleep',
    name: 'Dormido',
    code: 'DOR',
    icon: '💤',
    color: '#94a3b8',
    bgColor: 'rgba(71, 85, 105, 0.25)',
    borderColor: '#64748b',
    defaultTurns: 3,
    description: 'En letargo espiritual profundo. Incapaz de ejecutar movimientos.',
    flavor: 'La marioneta entra en reposo catatónico desconectada de su resonancia.',
  },
  blessed: {
    type: 'blessed',
    name: 'Consagrado',
    code: 'CON',
    icon: '✨',
    color: '#fde047',
    bgColor: 'rgba(250, 204, 21, 0.25)',
    borderColor: '#facc15',
    defaultTurns: 3,
    description: 'Restaura 8% de HP máximo al final de cada turno. Aumenta la defensa.',
    flavor: 'Luz celestial protectora que sana las grietas del alma.',
  },
};

export function createStatusEffect(type: StatusEffectType, duration?: number): ActiveStatusEffect {
  const def = STATUS_EFFECT_DEFS[type];
  return {
    type,
    name: def.name,
    code: def.code,
    icon: def.icon,
    color: def.color,
    bgColor: def.bgColor,
    borderColor: def.borderColor,
    turnsRemaining: duration ?? def.defaultTurns,
    description: def.description,
    flavor: def.flavor,
  };
}

/**
 * Checks if a move inflicts a status effect based on its element.
 */
export function rollMoveStatusEffect(
  moveType: SoulType,
  targetSoul: BattleSoul,
  random: () => number
): ActiveStatusEffect | null {
  // If target already has this status, don't re-apply
  const currentEffects = targetSoul.statusEffects || [];

  switch (moveType) {
    case 'Fuego':
      // 30% chance to burn if not already burned
      if (random() < 0.30 && !currentEffects.some(e => e.type === 'burn')) {
        return createStatusEffect('burn');
      }
      break;
    case 'Planta':
      // 30% chance to poison if not already poisoned
      if (random() < 0.30 && !currentEffects.some(e => e.type === 'poison')) {
        return createStatusEffect('poison');
      }
      break;
    case 'Sombra':
      // 25% chance of poison or sleep
      if (random() < 0.25) {
        const type = random() < 0.6 ? 'poison' : 'sleep';
        if (!currentEffects.some(e => e.type === type)) {
          return createStatusEffect(type);
        }
      }
      break;
    case 'Rayo':
      // 30% chance to paralyze
      if (random() < 0.30 && !currentEffects.some(e => e.type === 'paralysis')) {
        return createStatusEffect('paralysis');
      }
      break;
    case 'Agua':
      // 20% chance to frost
      if (random() < 0.20 && !currentEffects.some(e => e.type === 'frost')) {
        return createStatusEffect('frost');
      }
      break;
    case 'Luz':
      // Light doesn't inflict negative status on defender here, but can bless
      break;
  }

  return null;
}
