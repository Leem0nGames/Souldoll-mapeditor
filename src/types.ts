export type GameState = 'title' | 'playing' | 'paused' | 'victory' | 'gameover' | 'combat';

export interface SoulDoll {
  id: string;
  x: number;
  z: number;
  y: number;
  name: string;
  title: string;
  lore: string;
  color: string;
  collected: boolean;
  floatOffset: number;
  element?: string;
  spriteUrl?: string;
}

export interface Spirit {
  id: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
}

export type NPCGender = 'female' | 'male';

export interface NPCSpriteRef {
  sheet: NPCGender; // 'female' (NPC06.webp) | 'male' (NPC09.webp)
  frameIndex: number; // 0..15
}

export interface NPC {
  id: string;
  x: number;
  z: number;
  name: string;
  dialogue: string[];
  questGiven?: string;
  questCompleted?: boolean;
  spriteIndex?: number; // Unified index: 0..15 = female (NPC06), 16..31 = male (NPC09)
  spriteRef?: NPCSpriteRef;
}

export interface ActiveDialogue {
  name: string;
  text: string;
  spriteIndex?: number;
  spriteRef?: NPCSpriteRef;
}

export interface Signpost {
  id: string;
  x: number;
  z: number;
  name: string;
  text: string;
}

export interface Chest {
  id: string;
  x: number;
  z: number;
  opened: boolean;
  rewardType: 'gold' | 'item' | 'soul';
  rewardAmount: number;
  rewardName: string;
}

export interface Enemy {
  id: string;
  x: number;
  z: number;
  startX: number;
  startZ: number;
  hp: number;
  maxHp: number;
  radius: number;
  patrolDist: number;
  speed: number;
  alive: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  count: number;
  description: string;
}

export interface GrassPatch {
  x: number;
  z: number;
  radius: number;
}

export type SoulType = 'Fuego' | 'Agua' | 'Planta' | 'Rayo' | 'Sombra' | 'Luz';

export interface BattleMove {
  id: string;
  name: string;
  type: SoulType;
  power: number;
  pp: number;
  maxPp: number;
  accuracy: number;
  description: string;
  shaderVfx?: 'lava' | 'water' | 'slime' | 'blackhole';
}

export type StatusEffectType = 'burn' | 'poison' | 'paralysis' | 'frost' | 'sleep' | 'blessed';

export interface ActiveStatusEffect {
  type: StatusEffectType;
  name: string;
  code: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  turnsRemaining: number;
  description: string;
  flavor: string;
}

export interface BattleSoul {
  id: string;
  name: string;
  level: number;
  type: SoulType;
  hp: number;
  maxHp: number;
  exp: number;
  maxExp: number;
  speed: number;
  attack: number;
  defense: number;
  moves: BattleMove[];
  spritesheet: string;
  frameBack: { x: number; y: number; w: number; h: number };
  frameFront: { x: number; y: number; w: number; h: number };
  sheetSize: { w: number; h: number };
  rarity?: 'común' | 'poco común' | 'rara';
  stability: number;
  maxStability: number;
  statusEffects?: ActiveStatusEffect[];
}

export type ItemId = 'potion' | 'soul_crystal' | 'super_crystal';

export interface BagItem {
  id: ItemId;
  name: string;
  count: number;
  description: string;
  effect: 'heal' | 'capture';
  healAmount?: number;
  catchBonus?: number;
}

export interface ResourceNode {
  id: string;
  x: number;
  z: number;
  name: string;
  biome: string;
  rewardItem: ItemId;
  rewardCount: number;
  rewardGold: number;
  harvested: boolean;
  color: string;
}

export interface WorldBoss {
  id: string;
  x: number;
  z: number;
  name: string;
  title: string;
  forcedSoulName: string;
  defeated: boolean;
}

export interface GameSaveData {
  version: number;
  timestamp: number;
  team: BattleSoul[];
  box: BattleSoul[];
  bag: BagItem[];
  playerPos: { x: number; z: number };
  gold: number;
  hp?: number;
  questState: 'none' | 'active' | 'completed';
  starterChosen: boolean;
  openedChests?: string[];
  collectedWorldSouls?: string[];
  harvestedResources?: string[];
  defeatedBosses?: string[];
  discoveredSouls?: Record<string, 'seen' | 'captured'>;
  discoveredGrass?: number[];
  discoveredWaypoints?: string[];
  unlockedFogCells?: number[];
  discoveredRegions?: string[];
}

export interface Mob {
  name: string;
  type: SoulType;
  minLevel: number;
  maxLevel: number;
  rarity: 'común' | 'poco común' | 'rara';
  condition: 'día' | 'noche' | 'cualquiera';
  color: string;
}

export interface PlayerState {
  x: number;
  z: number;
  y: number;
  rotation: number;
  speed: number;
  isMoving: boolean;
  soulsCollected: number;
  hp: number;
  maxHp: number;
  gold: number;
  inventory: InventoryItem[];
  questState: 'none' | 'active' | 'completed';
}
