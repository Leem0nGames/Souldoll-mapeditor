/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BattleSoul, BattleMove, SoulType, BagItem } from '../types';
import { DifficultyManager } from '../core/difficultyManager';

export const TYPE_COLORS: Record<SoulType, { bg: string; border: string; text: string; glow: string }> = {
  Fuego: { bg: '#dc2626', border: '#ef4444', text: '#fee2e2', glow: 'rgba(239, 68, 68, 0.6)' },
  Agua: { bg: '#0284c7', border: '#38bdf8', text: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.6)' },
  Planta: { bg: '#16a34a', border: '#4ade80', text: '#dcfce7', glow: 'rgba(74, 222, 128, 0.6)' },
  Rayo: { bg: '#ca8a04', border: '#facc15', text: '#fef9c3', glow: 'rgba(250, 204, 21, 0.6)' },
  Sombra: { bg: '#7c3aed', border: '#a855f7', text: '#f3e8ff', glow: 'rgba(168, 85, 247, 0.6)' },
  Luz: { bg: '#d97706', border: '#fbbf24', text: '#fef3c7', glow: 'rgba(251, 191, 36, 0.6)' },
};

export const TYPE_EFFECTIVENESS: Record<SoulType, Partial<Record<SoulType, number>>> = {
  Fuego: { Planta: 2.0, Agua: 0.5, Fuego: 0.5 },
  Agua: { Fuego: 2.0, Planta: 0.5, Agua: 0.5 },
  Planta: { Agua: 2.0, Fuego: 0.5, Planta: 0.5 },
  Rayo: { Agua: 2.0, Planta: 0.5, Rayo: 0.5 },
  Sombra: { Luz: 2.0, Sombra: 0.5 },
  Luz: { Sombra: 2.0, Luz: 0.5 },
};

export interface LuminadexEntry {
  num: string;
  name: string;
  type: SoulType;
  title: string;
  lore: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  spritesheet: string;
  frameFront: { x: number; y: number; w: number; h: number };
  sheetSize: { w: number; h: number };
  rarity: 'común' | 'poco común' | 'rara';
}

export const LUMINADEX_ENTRIES: LuminadexEntry[] = [
  {
    num: '#001',
    name: 'EMBER',
    type: 'Fuego',
    title: 'Heraldo de la Llama Viva',
    lore: 'Nacida entre brasas antiguas del desierto, canaliza el ardor bélico de los espíritus oni. Su fuego ruge cuando la adversidad arrecia.',
    baseHp: 35,
    baseAtk: 22,
    baseDef: 15,
    baseSpd: 14,
    spritesheet: '/assets/souldolls/01.webp',
    frameFront: { x: 68, y: 16, w: 433, h: 864 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'común',
  },
  {
    num: '#002',
    name: 'TOMOE',
    type: 'Agua',
    title: 'Cuchilla de la Marea',
    lore: 'Custodia las aguas de Villa Marionette. Empuña dos filos nacidos del deshielo y las corrientes de los ríos antiguos.',
    baseHp: 36,
    baseAtk: 20,
    baseDef: 17,
    baseSpd: 15,
    spritesheet: '/assets/souldolls/03.webp',
    frameFront: { x: 52, y: 18, w: 446, h: 863 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'común',
  },
  {
    num: '#003',
    name: 'WISP',
    type: 'Agua',
    title: 'Ninfa del Río Celeste',
    lore: 'Emerge serena entre las corrientes purificadoras. Su rocío bendito apacigua el espíritu de los aliados heridos.',
    baseHp: 34,
    baseAtk: 17,
    baseDef: 18,
    baseSpd: 16,
    spritesheet: '/assets/souldolls/07.webp',
    frameFront: { x: 24, y: 27, w: 561, h: 844 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'común',
  },
  {
    num: '#004',
    name: 'SPROUT',
    type: 'Planta',
    title: 'Brote de la Floresta',
    lore: 'Sintonizada con las raíces centenarias del Bosque Marionette. Su coraza vegetal resiste los embates más duros.',
    baseHp: 38,
    baseAtk: 18,
    baseDef: 20,
    baseSpd: 12,
    spritesheet: '/assets/souldolls/09.webp',
    frameFront: { x: 56, y: 10, w: 429, h: 868 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'común',
  },
  {
    num: '#005',
    name: 'SPARK',
    type: 'Rayo',
    title: 'Centella de la Tormenta',
    lore: 'Acumula estática pura en sus runas. Ataca con una velocidad cegadora que desafía el curso del tiempo.',
    baseHp: 32,
    baseAtk: 24,
    baseDef: 13,
    baseSpd: 20,
    spritesheet: '/assets/souldolls/11.webp',
    frameFront: { x: 143, y: 45, w: 353, h: 826 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'poco común',
  },
  {
    num: '#006',
    name: 'SHADE',
    type: 'Sombra',
    title: 'Sombra del Templo',
    lore: 'Asesino fantasmal que emerge de las sombras del Templo. Sus dagas oscuras infligen cortes letales desde el sigilo.',
    baseHp: 36,
    baseAtk: 23,
    baseDef: 15,
    baseSpd: 17,
    spritesheet: '/assets/souldolls/15.webp',
    frameFront: { x: 156, y: 58, w: 341, h: 821 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'poco común',
  },
  {
    num: '#007',
    name: 'ECHO',
    type: 'Luz',
    title: 'Oráculo Resonante',
    lore: 'Porta una campana mística cuya resonancia desorienta las mentes enemigas con ecos espirituales.',
    baseHp: 33,
    baseAtk: 19,
    baseDef: 16,
    baseSpd: 15,
    spritesheet: '/assets/souldolls/17.webp',
    frameFront: { x: 149, y: 43, w: 348, h: 830 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'poco común',
  },
  {
    num: '#008',
    name: 'KAORI',
    type: 'Agua',
    title: 'Escarcha Glacial',
    lore: 'Proveniente de las tundras heladas. Su aliento escarchado congela el avance de cualquier adversario.',
    baseHp: 36,
    baseAtk: 21,
    baseDef: 18,
    baseSpd: 13,
    spritesheet: '/assets/souldolls/19.webp',
    frameFront: { x: 130, y: 17, w: 365, h: 854 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'rara',
  },
  {
    num: '#009',
    name: 'RUNIKA',
    type: 'Fuego',
    title: 'Garra del Volcán',
    lore: 'Temible guerrera del desierto calcinado. Sus garras ígneas desatan tajos feroces capaces de quebrar extremidades.',
    baseHp: 37,
    baseAtk: 23,
    baseDef: 16,
    baseSpd: 15,
    spritesheet: '/assets/souldolls/04.webp',
    frameFront: { x: 103, y: 43, w: 389, h: 833 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'rara',
  },
  {
    num: '#010',
    name: 'HUECO CORRUPTO',
    type: 'Sombra',
    title: 'Señor del Abismo Tenebroso',
    lore: 'Jefe supremo de las criptas. Una entidad corrompida cuya presencia corroe la estabilidad de las Dolls circundantes.',
    baseHp: 48,
    baseAtk: 28,
    baseDef: 22,
    baseSpd: 14,
    spritesheet: '/assets/souldolls/52.webp',
    frameFront: { x: 61, y: 11, w: 520, h: 868 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'rara',
  },
];

export const BASIC_STRUGGLE_MOVE: BattleMove = {
  id: 'struggle',
  name: 'Golpe Básico',
  type: 'Luz',
  power: 30,
  pp: 99,
  maxPp: 99,
  accuracy: 100,
  description: 'Ataque básico cuando se agotan los PP.',
};

export const SHADER_ATTACK_MOVES: Record<string, BattleMove> = {
  lava: {
    id: 'mv_lava',
    name: 'Furia Volcánica',
    type: 'Fuego',
    power: 65,
    pp: 12,
    maxPp: 12,
    accuracy: 95,
    description: 'Esfera de magma incandescente con corteza quebrada y ríos de lava ardiente.',
    shaderVfx: 'lava',
  },
  water: {
    id: 'mv_water',
    name: 'Orbe Marino',
    type: 'Agua',
    power: 62,
    pp: 14,
    maxPp: 14,
    accuracy: 100,
    description: 'Esfera de agua pura refractiva con ondulaciones e impacto torrencial.',
    shaderVfx: 'water',
  },
  slime: {
    id: 'mv_slime',
    name: 'Cieno Hirviente',
    type: 'Planta',
    power: 60,
    pp: 15,
    maxPp: 15,
    accuracy: 95,
    description: 'Masa ácida viscosa que hierve en la superficie y gotea veneno corrosivo.',
    shaderVfx: 'slime',
  },
  blackhole: {
    id: 'mv_blackhole',
    name: 'Singularidad Umbría',
    type: 'Sombra',
    power: 75,
    pp: 8,
    maxPp: 8,
    accuracy: 90,
    description: 'Agujero negro con disco de acreción violeta que devora la luz y la materia.',
    shaderVfx: 'blackhole',
  },
};

export function getDefaultPlayerSoul(): BattleSoul {
  return getStarterSouls()[1]; // Tomoe is canonical MVP starter
}

export function getStarterSouls(): BattleSoul[] {
  return [
    {
      id: 'starter-ember',
      name: 'EMBER',
      level: 5,
      type: 'Fuego',
      hp: 35,
      maxHp: 35,
      exp: 0,
      maxExp: 45,
      speed: 14,
      attack: 22,
      defense: 15,
      spritesheet: '/assets/souldolls/01.webp',
      frameFront: { x: 68, y: 16, w: 433, h: 864 },
      frameBack: { x: 714, y: 10, w: 415, h: 857 },
      sheetSize: { w: 1200, h: 896 },
      rarity: 'común',
      stability: 100,
      maxStability: 100,
      moves: [
        { id: 'e1', name: 'Mar de Llamas', type: 'Fuego', power: 42, pp: 20, maxPp: 20, accuracy: 100, description: 'Llamarada abrasadora del desierto.' },
        { ...SHADER_ATTACK_MOVES.lava },
        { id: 'e2', name: 'Garra Ígnea', type: 'Fuego', power: 48, pp: 15, maxPp: 15, accuracy: 95, description: 'Desgarro envuelto en fuego ardiente.' },
        { ...SHADER_ATTACK_MOVES.blackhole },
      ],
    },
    {
      id: 'starter-tomoe',
      name: 'TOMOE',
      level: 5,
      type: 'Agua',
      hp: 36,
      maxHp: 36,
      exp: 0,
      maxExp: 45,
      speed: 15,
      attack: 20,
      defense: 17,
      spritesheet: '/assets/souldolls/03.webp',
      frameFront: { x: 52, y: 18, w: 446, h: 863 },
      frameBack: { x: 682, y: 27, w: 467, h: 841 },
      sheetSize: { w: 1200, h: 896 },
      rarity: 'común',
      stability: 100,
      maxStability: 100,
      moves: [
        { id: 't1', name: 'Corte Marea', type: 'Agua', power: 44, pp: 20, maxPp: 20, accuracy: 100, description: 'Corte veloz que impacta con fuerza torrencial.' },
        { ...SHADER_ATTACK_MOVES.water },
        { id: 't2', name: 'Pulso Frío', type: 'Agua', power: 38, pp: 20, maxPp: 20, accuracy: 100, description: 'Onda glacial que enfría al rival.' },
        { ...SHADER_ATTACK_MOVES.lava },
      ],
    },
    {
      id: 'starter-sprout',
      name: 'SPROUT',
      level: 5,
      type: 'Planta',
      hp: 38,
      maxHp: 38,
      exp: 0,
      maxExp: 45,
      speed: 12,
      attack: 18,
      defense: 20,
      spritesheet: '/assets/souldolls/09.webp',
      frameFront: { x: 56, y: 10, w: 429, h: 868 },
      frameBack: { x: 723, y: 18, w: 432, h: 848 },
      sheetSize: { w: 1200, h: 896 },
      rarity: 'común',
      stability: 100,
      maxStability: 100,
      moves: [
        { id: 's1', name: 'Raíz Firme', type: 'Planta', power: 40, pp: 20, maxPp: 20, accuracy: 100, description: 'Azota con lianas espinosas centenarias.' },
        { ...SHADER_ATTACK_MOVES.slime },
        { id: 's2', name: 'Hoja Afilada', type: 'Planta', power: 50, pp: 15, maxPp: 15, accuracy: 95, description: 'Ráfaga de follaje cortante.' },
        { ...SHADER_ATTACK_MOVES.blackhole },
      ],
    },
  ];
}

export function getDefaultBag(): BagItem[] {
  return [
    {
      id: 'potion',
      name: 'Poción',
      count: 5,
      description: 'Restaura 20 HP al alma activa.',
      effect: 'heal',
      healAmount: 20,
    },
    {
      id: 'soul_crystal',
      name: 'Cristal de alma',
      count: 5,
      description: 'Cristal mágico para capturar almas salvajes.',
      effect: 'capture',
      catchBonus: 1.0,
    },
    {
      id: 'super_crystal',
      name: 'Cristal superior',
      count: 1,
      description: 'Cristal refinado con mayor índice de captura.',
      effect: 'capture',
      catchBonus: 1.8,
    },
  ];
}

export const LEARNABLE_MOVES: Record<string, { level: number; move: BattleMove }[]> = {
  Fuego: [
    { level: 5, move: { id: 'f_5', name: 'Garra Ígnea', type: 'Fuego', power: 48, pp: 15, maxPp: 15, accuracy: 95, description: 'Desgarro ardiente.' } },
    { level: 10, move: { ...SHADER_ATTACK_MOVES.lava } },
    { level: 15, move: { id: 'f_15', name: 'Llamarada Ancestral', type: 'Fuego', power: 75, pp: 5, maxPp: 5, accuracy: 85, description: 'Explosión de fuego volcánico.' } },
  ],
  Agua: [
    { level: 5, move: { ...SHADER_ATTACK_MOVES.water } },
    { level: 10, move: { id: 'w_10', name: 'Danza Espada', type: 'Luz', power: 50, pp: 10, maxPp: 10, accuracy: 95, description: 'Filo luminoso acuático.' } },
    { level: 15, move: { id: 'w_15', name: 'Hidrobomba', type: 'Agua', power: 80, pp: 5, maxPp: 5, accuracy: 85, description: 'Torrente a alta presión descomunal.' } },
  ],
  Planta: [
    { level: 5, move: { ...SHADER_ATTACK_MOVES.slime } },
    { level: 10, move: { id: 'p_10', name: 'Danza Sombra', type: 'Sombra', power: 50, pp: 10, maxPp: 10, accuracy: 90, description: 'Maleza espectral.' } },
    { level: 15, move: { id: 'p_15', name: 'Rayo Solar', type: 'Luz', power: 75, pp: 5, maxPp: 5, accuracy: 90, description: 'Haz celestial cargado de fotosíntesis.' } },
  ],
  Rayo: [
    { level: 5, move: { id: 't_5', name: 'Impactrueno', type: 'Rayo', power: 45, pp: 20, maxPp: 20, accuracy: 100, description: 'Chispazo directo.' } },
    { level: 10, move: { id: 't_10', name: 'Chispa Voltífera', type: 'Rayo', power: 58, pp: 10, maxPp: 10, accuracy: 95, description: 'Relámpago cegador.' } },
    { level: 15, move: { id: 't_15', name: 'Tormenta Eléctrica', type: 'Rayo', power: 78, pp: 5, maxPp: 5, accuracy: 85, description: 'Descarga masiva de alta tensión.' } },
  ],
  Sombra: [
    { level: 5, move: { id: 's_5', name: 'Aguja Sombría', type: 'Sombra', power: 45, pp: 20, maxPp: 20, accuracy: 100, description: 'Espina tenebrosa.' } },
    { level: 10, move: { ...SHADER_ATTACK_MOVES.blackhole } },
    { level: 15, move: { id: 's_15', name: 'Vacío Abisal', type: 'Sombra', power: 80, pp: 5, maxPp: 5, accuracy: 85, description: 'Colapso de gravedad umbría.' } },
  ],
  Luz: [
    { level: 5, move: { id: 'l_5', name: 'Chispa Astral', type: 'Luz', power: 42, pp: 20, maxPp: 20, accuracy: 100, description: 'Ráfaga celestial.' } },
    { level: 10, move: { id: 'l_10', name: 'Embestida Férrea', type: 'Luz', power: 52, pp: 10, maxPp: 10, accuracy: 95, description: 'Golpe bendito radiante.' } },
    { level: 15, move: { id: 'l_15', name: 'Sentencia Solar', type: 'Luz', power: 78, pp: 5, maxPp: 5, accuracy: 90, description: 'Juicio de luz sagrada.' } },
  ],
};

export function checkNewMoveOnLevelUp(soul: BattleSoul): BattleMove | null {
  if (soul.level !== 5 && soul.level !== 10 && soul.level !== 15) return null;
  const list = LEARNABLE_MOVES[soul.type] || [];
  const entry = list.find(e => e.level === soul.level);
  if (!entry) return null;
  if (soul.moves.some(m => m.name === entry.move.name)) return null;
  return entry.move;
}

export interface WildSoulTemplate {
  name: string;
  type: SoulType;
  minLevel: number;
  maxLevel: number;
  spritesheet: string;
  frameBack: { x: number; y: number; w: number; h: number };
  frameFront: { x: number; y: number; w: number; h: number };
  sheetSize: { w: number; h: number };
  rarity: 'común' | 'poco común' | 'rara';
  introText: string;
  moves: BattleMove[];
}

export const WILD_SOULS: WildSoulTemplate[] = [
  {
    name: 'EMBER',
    type: 'Fuego',
    minLevel: 4,
    maxLevel: 8,
    spritesheet: '/assets/souldolls/01.webp',
    frameFront: { x: 68, y: 16, w: 433, h: 864 },
    frameBack: { x: 714, y: 10, w: 415, h: 857 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'común',
    introText: '¡ Ember surge entre las brasas del desierto con mirada desafiante!',
    moves: [
      { id: 'e1', name: 'Mar de Llamas', type: 'Fuego', power: 40, pp: 20, maxPp: 20, accuracy: 100, description: 'Exhala una llamarada carmesí.' },
      { ...SHADER_ATTACK_MOVES.lava },
      { id: 'e2', name: 'Garra Ígnea', type: 'Fuego', power: 48, pp: 15, maxPp: 15, accuracy: 95, description: 'Desgarro envuelto en fuego ardiente.' },
      { ...SHADER_ATTACK_MOVES.blackhole },
    ],
  },
  {
    name: 'WISP',
    type: 'Agua',
    minLevel: 4,
    maxLevel: 7,
    spritesheet: '/assets/souldolls/07.webp',
    frameFront: { x: 24, y: 27, w: 561, h: 844 },
    frameBack: { x: 610, y: 27, w: 562, h: 832 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'común',
    introText: '¡ Wisp surge de las corrientes del río con gracia y serenidad!',
    moves: [
      { id: 'w1', name: 'Burbuja Letal', type: 'Agua', power: 36, pp: 25, maxPp: 25, accuracy: 100, description: 'Dispara esferas acuáticas a presión.' },
      { ...SHADER_ATTACK_MOVES.water },
      { id: 'w2', name: 'Marea Calma', type: 'Agua', power: 44, pp: 15, maxPp: 15, accuracy: 95, description: 'Lanza navajas de agua comprimida.' },
      { ...SHADER_ATTACK_MOVES.slime },
    ],
  },
  {
    name: 'SPROUT',
    type: 'Planta',
    minLevel: 4,
    maxLevel: 8,
    spritesheet: '/assets/souldolls/09.webp',
    frameFront: { x: 56, y: 10, w: 429, h: 868 },
    frameBack: { x: 723, y: 18, w: 432, h: 848 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'común',
    introText: '¡ Sprout hace crujir la maleza del bosque ancestral!',
    moves: [
      { id: 's1', name: 'Látigo Cepa', type: 'Planta', power: 40, pp: 20, maxPp: 20, accuracy: 100, description: 'Azota con lianas espinosas.' },
      { ...SHADER_ATTACK_MOVES.slime },
      { id: 's2', name: 'Raíz Firme', type: 'Planta', power: 48, pp: 15, maxPp: 15, accuracy: 95, description: 'Ráfaga de hojas cortantes como navajas.' },
      { ...SHADER_ATTACK_MOVES.blackhole },
    ],
  },
  {
    name: 'SPARK',
    type: 'Rayo',
    minLevel: 6,
    maxLevel: 10,
    spritesheet: '/assets/souldolls/11.webp',
    frameFront: { x: 143, y: 45, w: 353, h: 826 },
    frameBack: { x: 715, y: 46, w: 320, h: 813 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'poco común',
    introText: '¡ Spark chisporrotea energía estática lista para el duelo!',
    moves: [
      { id: 'v1', name: 'Impactrueno', type: 'Rayo', power: 45, pp: 20, maxPp: 20, accuracy: 100, description: 'Descarga eléctrica concentrada.' },
      { id: 'v2', name: 'Chispa Veloz', type: 'Rayo', power: 58, pp: 10, maxPp: 10, accuracy: 95, description: 'Relámpago rápido y ensordecedor.' },
      { ...SHADER_ATTACK_MOVES.lava },
    ],
  },
  {
    name: 'SHADE',
    type: 'Sombra',
    minLevel: 7,
    maxLevel: 11,
    spritesheet: '/assets/souldolls/15.webp',
    frameFront: { x: 156, y: 58, w: 341, h: 821 },
    frameBack: { x: 717, y: 55, w: 305, h: 813 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'poco común',
    introText: '¡ Shade emerge de las tinieblas de la cripta y el templo!',
    moves: [
      { id: 'n1', name: 'Puñal Umbrío', type: 'Sombra', power: 48, pp: 20, maxPp: 20, accuracy: 100, description: 'Ataque certero desde las sombras.' },
      { ...SHADER_ATTACK_MOVES.blackhole },
      { id: 'n2', name: 'Beso Tenebroso', type: 'Sombra', power: 55, pp: 10, maxPp: 10, accuracy: 90, description: 'Drena la vitalidad del oponente.' },
      { ...SHADER_ATTACK_MOVES.slime },
    ],
  },
  {
    name: 'ECHO',
    type: 'Luz',
    minLevel: 6,
    maxLevel: 10,
    spritesheet: '/assets/souldolls/17.webp',
    frameFront: { x: 149, y: 43, w: 348, h: 830 },
    frameBack: { x: 714, y: 43, w: 327, h: 820 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'poco común',
    introText: '¡ Echo entona sus vibraciones espirituales en el templo!',
    moves: [
      { id: 'ec1', name: 'Eco Mental', type: 'Luz', power: 44, pp: 20, maxPp: 20, accuracy: 100, description: 'Onda mental desorientadora.' },
      { id: 'ec2', name: 'Chispa Astral', type: 'Luz', power: 52, pp: 15, maxPp: 15, accuracy: 95, description: 'Ráfaga celestial pura.' },
      { ...SHADER_ATTACK_MOVES.water },
    ],
  },
  {
    name: 'KAORI',
    type: 'Agua',
    minLevel: 8,
    maxLevel: 12,
    spritesheet: '/assets/souldolls/19.webp',
    frameFront: { x: 130, y: 17, w: 365, h: 854 },
    frameBack: { x: 716, y: 29, w: 347, h: 829 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'rara',
    introText: '¡ Kaori hace descender la temperatura con una ventisca helada!',
    moves: [
      { id: 'k1', name: 'Escarcha', type: 'Agua', power: 52, pp: 15, maxPp: 15, accuracy: 95, description: 'Hielo penetrante que reduce la velocidad.' },
      { ...SHADER_ATTACK_MOVES.water },
      { id: 'k2', name: 'Pulso Frío', type: 'Agua', power: 45, pp: 20, maxPp: 20, accuracy: 100, description: 'Onda glacial.' },
    ],
  },
  {
    name: 'RUNIKA',
    type: 'Fuego',
    minLevel: 7,
    maxLevel: 12,
    spritesheet: '/assets/souldolls/04.webp',
    frameFront: { x: 103, y: 43, w: 389, h: 833 },
    frameBack: { x: 722, y: 43, w: 347, h: 826 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'rara',
    introText: '¡ Runika enciende sus garras y bloquea tu camino!',
    moves: [
      { id: 'ru1', name: 'Garra Ígnea', type: 'Fuego', power: 50, pp: 15, maxPp: 15, accuracy: 95, description: 'Desgarro en llamas.' },
      { ...SHADER_ATTACK_MOVES.lava },
      { id: 'ru2', name: 'Llamarada Ancestral', type: 'Fuego', power: 65, pp: 10, maxPp: 10, accuracy: 90, description: 'Fuego masivo.' },
    ],
  },
  {
    name: 'TOMOE',
    type: 'Agua',
    minLevel: 8,
    maxLevel: 13,
    spritesheet: '/assets/souldolls/03.webp',
    frameFront: { x: 52, y: 18, w: 446, h: 863 },
    frameBack: { x: 682, y: 27, w: 467, h: 841 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'rara',
    introText: '¡ Tomoe empuña sus espadas con postura impecable!',
    moves: [
      { id: 'to1', name: 'Corte Marea', type: 'Agua', power: 54, pp: 15, maxPp: 15, accuracy: 100, description: 'Tajo gemelo de agua cortante.' },
      { ...SHADER_ATTACK_MOVES.water },
      { id: 'to2', name: 'Danza Espada', type: 'Luz', power: 50, pp: 10, maxPp: 10, accuracy: 95, description: 'Filo luminoso.' },
    ],
  },
  {
    name: 'HUECO CORRUPTO',
    type: 'Sombra',
    minLevel: 25,
    maxLevel: 25,
    spritesheet: '/assets/souldolls/52.webp',
    frameFront: { x: 61, y: 11, w: 520, h: 868 },
    frameBack: { x: 628, y: 8, w: 507, h: 857 },
    sheetSize: { w: 1200, h: 896 },
    rarity: 'rara',
    introText: '¡ EL HUECO CORRUPTO NV.25 DESATA SU AURA DEL ABISMO!',
    moves: [
      { id: 'h1', name: 'Corrupción Abisal', type: 'Sombra', power: 75, pp: 10, maxPp: 10, accuracy: 95, description: 'Corroe la estabilidad y desgasta las partes.' },
      { ...SHADER_ATTACK_MOVES.blackhole },
      { id: 'h2', name: 'Desgarro del Vacío', type: 'Sombra', power: 80, pp: 8, maxPp: 8, accuracy: 90, description: 'Golpe devastador a las Dolls.' },
      { ...SHADER_ATTACK_MOVES.lava },
    ],
  },
];

export function createRandomWildSoul(
  forcedName?: string,
  allowedTypes?: SoulType[],
  levelRange?: [number, number],
  playerLevel?: number
): { soul: BattleSoul; introText: string } {
  let template: WildSoulTemplate;
  if (forcedName) {
    template = WILD_SOULS.find(s => s.name.toLowerCase() === forcedName.toLowerCase()) || WILD_SOULS[0];
  } else {
    // Filter out Hueco Corrupto from standard wild encounters unless forced
    let wildPool = WILD_SOULS.filter(s => s.name !== 'HUECO CORRUPTO');
    if (allowedTypes && allowedTypes.length > 0) {
      const typeFiltered = wildPool.filter(s => allowedTypes.includes(s.type));
      if (typeFiltered.length > 0) {
        wildPool = typeFiltered;
      }
    }
    template = wildPool[Math.floor(Math.random() * wildPool.length)];
  }

  let minL = template.minLevel;
  let maxL = template.maxLevel;
  if (!forcedName && levelRange) {
    if (playerLevel) {
      [minL, maxL] = DifficultyManager.getWildSoulLevel(levelRange[0], levelRange[1], playerLevel);
    } else {
      minL = Math.max(1, levelRange[0]);
      maxL = Math.max(minL, levelRange[1]);
    }
  }

  const level = Math.floor(minL + Math.random() * (maxL - minL + 1));
  const statMod = DifficultyManager.getStatModifier(level);
  
  const maxHp = Math.floor((22 + level * 3) * statMod);
  const attack = Math.floor((14 + level * 2) * statMod);
  const defense = Math.floor((11 + Math.floor(level * 1.5)) * statMod);
  const speed = Math.floor((10 + level * 2) * statMod);

  const soul: BattleSoul = {
    id: `wild-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: template.name,
    level: level,
    type: template.type,
    hp: maxHp,
    maxHp: maxHp,
    exp: 0,
    maxExp: level * 10,
    speed: speed,
    attack: attack,
    defense: defense,
    moves: template.moves.map(m => ({ ...m })),
    spritesheet: template.spritesheet,
    frameBack: template.frameBack,
    frameFront: template.frameFront,
    sheetSize: template.sheetSize,
    rarity: template.rarity,
    stability: 100,
    maxStability: 100,
  };

  return { soul, introText: template.introText };
}
