/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import seedrandom from 'seedrandom';
import { BattleSoul, BattleMove, SoulType, BagItem, ItemId, ActiveStatusEffect } from '../types';
import { TYPE_COLORS, BASIC_STRUGGLE_MOVE, checkNewMoveOnLevelUp } from '../data/mobs';
import {
  calculateDamage,
  calculateExpGain,
  calculateCatchRate,
  chooseRivalMove,
  determineTurnOrder,
  attemptFlee,
} from '../battle/battleRules';
import { audioManager } from '../audio/audioManager';
import { vfxEngine } from '../core/vfxEngine';
import { shaderAttackEngine, ShaderAttackType } from '../core/shaderAttackVFX';
import { ShaderAttackCanvas } from './ShaderAttackCanvas';
import { AnimatedHealthBar } from './AnimatedHealthBar';
import { StatusEffectsModal } from './StatusEffectsModal';
import { StatusBadgeList } from './StatusBadgeList';
import { rollMoveStatusEffect } from '../battle/statusEffects';
import { BrandPanel, BrandButton, BrandSectionTitle, BrandBadge } from './ui/BrandKit';

// Finite State Machine Phases
export type BattlePhase =
  | 'INTRO'
  | 'IDLE' // Interactive menu (moves, bag, team, main)
  | 'PLAYER_ATTACK_ANIM'
  | 'PLAYER_ATTACK_IMPACT'
  | 'RIVAL_ATTACK_ANIM'
  | 'RIVAL_ATTACK_IMPACT'
  | 'ITEM_USE'
  | 'CAPTURE_SEQUENCE'
  | 'FLEE_ATTEMPT'
  | 'SWITCHING_SOUL'
  | 'PLAYER_FAINT'
  | 'RIVAL_FAINT'
  | 'VICTORY_EXP'
  | 'VICTORY_LEVELUP'
  | 'VICTORY_LEARN_MOVE'
  | 'BATTLE_END';

export interface VictorySummary {
  expReward: number;
  goldReward: number;
  oldLevel: number;
  newLevel: number;
  oldExp: number;
  newExp: number;
  oldMaxExp: number;
  newMaxExp: number;
  leveledUp: boolean;
  statGains: {
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  oldStats: {
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  learnedMove: BattleMove | null;
  captured?: boolean;
}

interface BattleScreenProps {
  team: BattleSoul[];
  activeSoulIndex: number;
  rivalSoul: BattleSoul;
  bag: BagItem[];
  onSwitchSoul: (newIndex: number) => void;
  onUseBagItem: (itemId: ItemId) => void;
  onVictory: (
    expGained: number,
    goldGained: number,
    captured?: boolean,
    capturedSoul?: BattleSoul,
    updatedActiveSoul?: BattleSoul
  ) => void;
  onDefeat: () => void;
  onFlee: () => void;
  initialMessage?: string;
  battleBackground?: string;
}

// ===================================================
// UNIFIED ELEMENTAL HIT ANIMATIONS & INDICATORS SYSTEM
// ===================================================
export interface ElementalAnimationConfig {
  keyframeClass: string;
  glowColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeGlow: string;
  badgeText: string;
  icon: string;
}

export const ELEMENTAL_HIT_CONFIGS: Record<SoulType, ElementalAnimationConfig> = {
  Fuego: {
    keyframeClass: 'animate-hit-fuego',
    glowColor: '#ef4444',
    badgeBg: 'rgba(185, 28, 28, 0.95)',
    badgeBorder: '#f97316',
    badgeGlow: 'rgba(239, 68, 68, 0.85)',
    badgeText: '#fee2e2',
    icon: '🔥',
  },
  Agua: {
    keyframeClass: 'animate-hit-agua',
    glowColor: '#38bdf8',
    badgeBg: 'rgba(3, 105, 161, 0.95)',
    badgeBorder: '#38bdf8',
    badgeGlow: 'rgba(56, 189, 248, 0.85)',
    badgeText: '#e0f2fe',
    icon: '🌊',
  },
  Planta: {
    keyframeClass: 'animate-hit-planta',
    glowColor: '#4ade80',
    badgeBg: 'rgba(21, 128, 61, 0.95)',
    badgeBorder: '#4ade80',
    badgeGlow: 'rgba(74, 222, 128, 0.85)',
    badgeText: '#dcfce7',
    icon: '🍃',
  },
  Rayo: {
    keyframeClass: 'animate-hit-rayo',
    glowColor: '#facc15',
    badgeBg: 'rgba(161, 98, 7, 0.95)',
    badgeBorder: '#facc15',
    badgeGlow: 'rgba(250, 204, 21, 0.9)',
    badgeText: '#fef9c3',
    icon: '⚡',
  },
  Sombra: {
    keyframeClass: 'animate-hit-sombra',
    glowColor: '#a855f7',
    badgeBg: 'rgba(109, 40, 217, 0.95)',
    badgeBorder: '#c084fc',
    badgeGlow: 'rgba(192, 132, 252, 0.9)',
    badgeText: '#f3e8ff',
    icon: '🌌',
  },
  Luz: {
    keyframeClass: 'animate-hit-luz',
    glowColor: '#fbbf24',
    badgeBg: 'rgba(180, 83, 9, 0.95)',
    badgeBorder: '#fbbf24',
    badgeGlow: 'rgba(251, 191, 36, 0.9)',
    badgeText: '#fef3c7',
    icon: '✨',
  },
};

export interface ActiveHitState {
  type: SoulType;
  damage: number;
  isCrit: boolean;
  multiplier: number;
}

const ElementalImpactBadge: React.FC<ActiveHitState & { target: 'player' | 'rival' }> = ({
  type,
  damage,
  isCrit,
  multiplier,
  target,
}) => {
  const cfg = ELEMENTAL_HIT_CONFIGS[type] || ELEMENTAL_HIT_CONFIGS.Agua;
  return (
    <div
      className={`absolute z-40 pointer-events-none flex flex-col items-center animate-impact-badge ${
        target === 'rival' ? '-top-12 -right-2 sm:-right-8' : '-top-12 -left-2 sm:-left-8'
      }`}
    >
      <div
        className="px-3 py-1 rounded-full border-2 flex items-center gap-1.5 shadow-2xl backdrop-blur-xs select-none"
        style={{
          backgroundColor: cfg.badgeBg,
          borderColor: cfg.badgeBorder,
          boxShadow: `0 0 20px ${cfg.badgeGlow}`,
          color: cfg.badgeText,
        }}
      >
        <span className="text-[13px]">{cfg.icon}</span>
        <span className="text-[11px] font-pixel font-bold">-{damage}</span>
      </div>

      {isCrit && (
        <span className="text-[8px] font-pixel font-black text-amber-300 drop-shadow-[0_0_8px_#f59e0b] tracking-wider mt-0.5">
          ★ CRÍTICO ★
        </span>
      )}
      {multiplier > 1.0 && !isCrit && (
        <span className="text-[7px] font-pixel font-bold text-emerald-300 drop-shadow-[0_0_6px_#10b981] tracking-wider mt-0.5">
          ▲ EFECTIVO ▲
        </span>
      )}
      {multiplier < 1.0 && (
        <span className="text-[7px] font-pixel text-slate-300 drop-shadow-[0_0_4px_#475569] tracking-wider mt-0.5">
          ▼ DÉBIL ▼
        </span>
      )}
    </div>
  );
};

// 2.5D Elemental Battle Pedestal with runic engravings and elemental effects
interface ElementalPedestalProps {
  color: string;
  type?: SoulType;
  isRival?: boolean;
  hitType?: SoulType | null;
}

const ElementalPedestal: React.FC<ElementalPedestalProps> = ({ color, type = 'Sombra', isRival, hitType }) => {
  const getThemeDetails = (t: SoulType) => {
    switch (t) {
      case 'Fuego':
        return { glow: 'rgba(239, 68, 68, 0.75)', accent: '#f97316', particleColor: '#fca5a5' };
      case 'Agua':
        return { glow: 'rgba(56, 189, 248, 0.75)', accent: '#0284c7', particleColor: '#bae6fd' };
      case 'Planta':
        return { glow: 'rgba(74, 222, 128, 0.75)', accent: '#16a34a', particleColor: '#bbf7d0' };
      case 'Rayo':
        return { glow: 'rgba(250, 204, 21, 0.8)', accent: '#eab308', particleColor: '#fef08a' };
      case 'Sombra':
        return { glow: 'rgba(168, 85, 247, 0.8)', accent: '#7c3aed', particleColor: '#e9d5ff' };
      case 'Luz':
      default:
        return { glow: 'rgba(251, 191, 36, 0.8)', accent: '#d97706', particleColor: '#fef3c7' };
    }
  };

  const theme = getThemeDetails(type);
  const hitGlow = hitType ? (ELEMENTAL_HIT_CONFIGS[hitType]?.glowColor || null) : null;

  return (
    <div
      className={`relative w-36 h-11 sm:w-44 sm:h-13 pointer-events-none flex items-center justify-center select-none transition-all duration-300 ${
        hitType ? 'scale-105' : ''
      }`}
      style={{
        filter: hitGlow ? `drop-shadow(0 0 16px ${hitGlow})` : undefined,
      }}
    >
      <div
        className="absolute w-[94%] h-5 rounded-full bg-black/75 blur-[2.5px]"
        style={{ transform: 'translateY(12px) scaleY(0.5)' }}
      />
      <div
        className="absolute w-[86%] h-6 rounded-full blur-[6px] opacity-75 animate-pulse-glow"
        style={{
          backgroundColor: hitGlow || theme.glow,
          transform: 'translateY(8px) scaleY(0.48)',
        }}
      />
      <svg
        viewBox="0 0 180 60"
        className="absolute inset-0 w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`pedestal-rad-${isRival ? 'rival' : 'player'}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="55%" stopColor={theme.accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0d0918" stopOpacity="0.9" />
          </radialGradient>
          <filter id={`runic-glow-${isRival ? 'rival' : 'player'}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <ellipse cx="90" cy="34" rx="78" ry="20" fill="#130e22" stroke="#251c3d" strokeWidth="2" />
        <ellipse
          cx="90"
          cy="30"
          rx="78"
          ry="19"
          fill={`url(#pedestal-rad-${isRival ? 'rival' : 'player'})`}
          stroke={color}
          strokeWidth="1.8"
          filter={`url(#runic-glow-${isRival ? 'rival' : 'player'})`}
        />
        <ellipse
          cx="90"
          cy="30"
          rx="68"
          ry="15.5"
          stroke={color}
          strokeWidth="1.2"
          strokeDasharray="6 4 12 4"
          opacity="0.9"
        />
        <ellipse cx="90" cy="30" rx="52" ry="11.5" stroke={theme.accent} strokeWidth="0.9" strokeDasharray="3 3" opacity="0.8" />
        <ellipse cx="90" cy="30" rx="32" ry="7" stroke={color} strokeWidth="0.8" opacity="0.7" />
        <circle cx="90" cy="14.5" r="1.6" fill="#ffffff" opacity="0.9" />
        <circle cx="90" cy="45.5" r="1.6" fill="#ffffff" opacity="0.9" />
        <circle cx="22" cy="30" r="1.8" fill={color} opacity="0.85" />
        <circle cx="158" cy="30" r="1.8" fill={color} opacity="0.85" />
        <circle cx="90" cy="30" r="2" fill={color} opacity="0.75" />
      </svg>
      <div
        className="absolute -top-2 w-24 h-6 rounded-t-full pointer-events-none opacity-35 blur-[2px]"
        style={{ background: `linear-gradient(to top, ${color} 0%, transparent 100%)` }}
      />
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        <span
          className="absolute text-[11px] animate-bounce"
          style={{
            color: '#ffffff',
            textShadow: `0 0 5px ${color}`,
            left: '20%',
            top: isRival ? '10%' : '6%',
            animationDuration: '2.1s',
          }}
        >
          ✦
        </span>
        <span
          className="absolute text-[9px] animate-bounce"
          style={{
            color: theme.particleColor,
            textShadow: `0 0 5px ${color}`,
            right: '22%',
            top: '18%',
            animationDuration: '1.7s',
          }}
        >
          ✦
        </span>
        <span
          className="absolute text-[8px] animate-bounce"
          style={{
            color: color,
            textShadow: '0 0 5px #ffffff',
            left: '52%',
            bottom: '10%',
            animationDuration: '2.5s',
          }}
        >
          +
        </span>
      </div>
    </div>
  );
};

// Soul sprite drawer from cropped spritesheet with aspect ratio preservation and optional mirror
const SoulSpriteCanvas: React.FC<{
  spritesheet: string;
  frame: { x: number; y: number; w: number; h: number };
  sheetSize: { w: number; h: number };
  view: 'front' | 'back';
  hitType?: SoulType | null;
  isFainting?: boolean;
  isCapturing?: boolean;
  flipX?: boolean;
  scaleFactor?: number;
}> = ({ spritesheet, frame, hitType, isFainting, isCapturing, flipX = false, scaleFactor = 1.0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.src = spritesheet;
    img.onload = () => {
      if (!active) return;
      setLoaded(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const fw = frame.w || 400;
      const fh = frame.h || 800;
      canvas.width = fw;
      canvas.height = fh;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, fw, fh);
      ctx.drawImage(img, frame.x, frame.y, fw, fh, 0, 0, fw, fh);
    };
    return () => {
      active = false;
    };
  }, [spritesheet, frame.x, frame.y, frame.w, frame.h]);

  const hitAnimClass = hitType ? (ELEMENTAL_HIT_CONFIGS[hitType]?.keyframeClass || 'animate-shake') : '';
  const aspect = (frame.w && frame.h) ? (frame.w / frame.h) : 0.5;

  const baseHeightMobile = Math.round(160 * scaleFactor);
  const baseHeightSm = Math.round(210 * scaleFactor);
  const baseHeightMd = Math.round(250 * scaleFactor);

  const transforms: string[] = [];
  if (scaleFactor !== 1.0) transforms.push(`scale(${scaleFactor})`);
  if (flipX) transforms.push('scaleX(-1)');
  const transformStyle = transforms.length > 0 ? transforms.join(' ') : undefined;

  return (
    <div
      className={`relative select-none flex items-center justify-center transition-all duration-500 ${
        hitAnimClass
      } ${isFainting ? 'opacity-0 scale-75 transition-all duration-1000' : ''} ${
        isCapturing ? 'opacity-0 scale-25 transition-all duration-700' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        className="battle-sprite-canvas h-[160px] sm:h-[210px] md:h-[250px] max-h-[42vh] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
        style={{
          imageRendering: 'pixelated',
          aspectRatio: `${aspect}`,
          display: loaded ? 'block' : 'none',
          transform: transformStyle,
          transformOrigin: 'bottom center',
        }}
      />
      {!loaded && (
        <div
          className="bg-slate-900/40 animate-pulse rounded-lg flex items-center justify-center text-[8px] font-pixel text-slate-400"
          style={{
            aspectRatio: `${aspect}`,
            height: `${baseHeightMobile}px`,
            transform: transformStyle,
            transformOrigin: 'bottom center',
          }}
        >
          ...
        </div>
      )}
    </div>
  );
};

// Reusable Pixel Frame
const PixelBox: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`pixel-frame p-3 rounded-sm ${className}`}>
    <div className="pixel-corner-tl" />
    <div className="pixel-corner-tr" />
    <div className="pixel-corner-bl" />
    <div className="pixel-corner-br" />
    {children}
  </div>
);

const ELEMENTAL_SIGILS: Record<SoulType, string> = {
  Fuego: '🔥',
  Agua: '🌊',
  Planta: '🌿',
  Rayo: '⚡',
  Sombra: '🔮',
  Luz: '✨',
};

// Runic Elemental Sigil (Anti-slop zero-pill discipline)
const TypeBadge: React.FC<{ type: SoulType }> = ({ type }) => {
  const styling = TYPE_COLORS[type] || TYPE_COLORS.Agua;
  return (
    <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-pixel">
      <span className="text-[10px] sm:text-[11px] leading-none">
        {ELEMENTAL_SIGILS[type] || '✦'}
      </span>
      <span
        className="font-bold tracking-wider uppercase drop-shadow-sm"
        style={{ color: styling.text }}
      >
        {type}
      </span>
    </div>
  );
};



export const BattleScreen: React.FC<BattleScreenProps> = ({
  team,
  activeSoulIndex,
  rivalSoul: initialRivalSoul,
  bag,
  onSwitchSoul,
  onUseBagItem,
  onVictory,
  onDefeat,
  onFlee,
  initialMessage,
  battleBackground,
}) => {
  // 1. SEEDED PRNG: Deterministic and reproducible random numbers
  const prngRef = useRef<() => number>(seedrandom(`${initialRivalSoul.id}-${initialRivalSoul.name}-${Date.now()}`));
  const getRandom = useCallback(() => prngRef.current(), []);

  // 2. TIMEOUT CLEANUP REGISTRY: Every single setTimeout is tracked and cleared on unmount/reset
  const timerIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const clearAllTimers = useCallback(() => {
    timerIdsRef.current.forEach(id => clearTimeout(id));
    timerIdsRef.current.clear();
  }, []);

  const scheduleTimer = useCallback((fn: () => void, delayMs: number) => {
    const timerId = setTimeout(() => {
      timerIdsRef.current.delete(timerId);
      fn();
    }, delayMs);
    timerIdsRef.current.add(timerId);
    return timerId;
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // 3. FSM STATE
  const [phase, setPhase] = useState<BattlePhase>('INTRO');
  const [mode, setMode] = useState<'main' | 'moves' | 'bag' | 'team' | 'textOnly'>('main');

  // Turn planning ref for two-step turn resolutions
  const turnPlanRef = useRef<{
    playerMove?: BattleMove;
    rivalMove?: BattleMove;
    step: 'first' | 'second' | 'finished';
  }>({ step: 'finished' });

  // Faint sequence callback refs
  const triggerRivalFaintRef = useRef<() => void>(() => {});
  const triggerPlayerFaintRef = useRef<(idx: number) => void>(() => {});
  const battleEndedRef = useRef<boolean>(false);

  // Active Souls State
  const [activeIdx, setActiveIdx] = useState(activeSoulIndex);
  const activeSoul = team[activeIdx] || team[0];
  const [rivalSoul] = useState<BattleSoul>({ ...initialRivalSoul });

  // Combat Stats
  const [playerHp, setPlayerHp] = useState(activeSoul.hp);
  const [playerStability, setPlayerStability] = useState(activeSoul.stability ?? 100);
  const maxStability = activeSoul.maxStability ?? 100;
  const stabilityRatio = playerStability / maxStability;
  const isStabilityCritical = stabilityRatio < 0.2;

  const [playerExp, setPlayerExp] = useState(activeSoul.exp);
  const [rivalHp, setRivalHp] = useState(initialRivalSoul.hp);

  // Sync active soul HP and stability changes to team
  useEffect(() => {
    activeSoul.hp = playerHp;
    activeSoul.stability = playerStability;
  }, [playerHp, playerStability, activeSoul]);

  // Active Status Effects on souls
  const [playerStatuses, setPlayerStatuses] = useState<ActiveStatusEffect[]>(activeSoul.statusEffects || []);
  const [rivalStatuses, setRivalStatuses] = useState<ActiveStatusEffect[]>(initialRivalSoul.statusEffects || []);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalInitialTarget, setStatusModalInitialTarget] = useState<'player' | 'rival'>('player');

  // Keep activeSoul statusEffects in sync
  useEffect(() => {
    activeSoul.statusEffects = playerStatuses;
  }, [playerStatuses, activeSoul]);

  const [message, setMessage] = useState(initialMessage || `¡${rivalSoul.name} acecha en la mazmorra con mirada desafiante!`);
  const [typedMessage, setTypedMessage] = useState('');

  // Animation states
  const [rivalIntro, setRivalIntro] = useState(true);
  const [playerIntro, setPlayerIntro] = useState(true);
  const [rivalHitState, setRivalHitState] = useState<ActiveHitState | null>(null);
  const [playerHitState, setPlayerHitState] = useState<ActiveHitState | null>(null);
  const [rivalFainting, setRivalFainting] = useState(false);
  const [playerFainting, setPlayerFainting] = useState(false);
  const [flashTypeColor, setFlashTypeColor] = useState<string | null>(null);
  const [zoomFactor, setZoomFactor] = useState(1);

  // Capture sequence state
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureShakeStep, setCaptureShakeStep] = useState(0);
  const [showShaderDrawer, setShowShaderDrawer] = useState(false);

  // Victory & Progression State
  const [victorySummary, setVictorySummary] = useState<VictorySummary | null>(null);
  const [animatedExp, setAnimatedExp] = useState<number>(activeSoul.exp);

  // Button navigation indexes
  const [selectedMainIdx, setSelectedMainIdx] = useState(0);
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(0);
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);

  // Is UI input locked? (Unlocked only when in IDLE phase)
  const isInputLocked = phase !== 'IDLE';

  // Resolve shader attack type for 3D visual FX
  const resolveShaderForMove = useCallback((m: BattleMove): ShaderAttackType | null => {
    if (m.shaderVfx) return m.shaderVfx;
    if (m.name.includes('Volcán') || m.name.includes('Magma') || m.type === 'Fuego') return 'lava';
    if (m.name.includes('Marino') || m.name.includes('Agua') || m.type === 'Agua') return 'water';
    if (m.name.includes('Cieno') || m.name.includes('Ácida') || m.type === 'Planta') return 'slime';
    if (m.name.includes('Singularidad') || m.name.includes('Vacío') || m.type === 'Sombra') return 'blackhole';
    return null;
  }, []);

  // 4. PP VALIDATION: Check moves with PP > 0 or fallback to struggle
  const getAvailableMoves = useCallback((): BattleMove[] => {
    const hasPP = activeSoul.moves.some(m => m.pp > 0);
    if (!hasPP) {
      return [BASIC_STRUGGLE_MOVE];
    }
    return activeSoul.moves;
  }, [activeSoul]);

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    setTypedMessage('');
    const full = message;
    const interval = setInterval(() => {
      if (i < full.length) {
        setTypedMessage(prev => prev + full.charAt(i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [message]);

  // Battle Intro Phase Transition
  useEffect(() => {
    audioManager.playBattleStart();
    scheduleTimer(() => setRivalIntro(false), 800);
    scheduleTimer(() => {
      setPlayerIntro(false);
      setPhase('IDLE');
    }, 950);
  }, [scheduleTimer]);

  // ==========================================
  // FSM ATTACK RESOLUTION PIPELINE
  // ==========================================

  // Process end-of-turn status effect ticks (Burn, Poison, Blessed, duration countdowns)
  const processEndOfTurnStatusEffects = useCallback(
    (currentP_Hp: number, currentR_Hp: number) => {
      let pDmg = 0;
      let rDmg = 0;
      const statusMsgs: string[] = [];
      const floatingTexts: Array<{ text: string; x: number; y: number; color: string }> = [];

      // Player statuses tick
      const nextPlayerStatuses: ActiveStatusEffect[] = [];
      for (const st of playerStatuses) {
        if (st.type === 'burn') {
          const dmg = Math.max(1, Math.round(activeSoul.maxHp * 0.08));
          pDmg += dmg;
          statusMsgs.push(`¡${activeSoul.name} sufre ${dmg} de daño por quemadura! 🔥`);
          floatingTexts.push({ text: `-${dmg} HP 🔥`, x: 32, y: 60, color: '#f97316' });
        } else if (st.type === 'poison') {
          const dmg = Math.max(1, Math.round(activeSoul.maxHp * 0.10));
          pDmg += dmg;
          statusMsgs.push(`¡El veneno corroe a ${activeSoul.name} (-${dmg} HP)! ☠️`);
          floatingTexts.push({ text: `-${dmg} HP ☠️`, x: 32, y: 60, color: '#c084fc' });
        } else if (st.type === 'blessed') {
          const heal = Math.max(1, Math.round(activeSoul.maxHp * 0.08));
          pDmg -= heal;
          statusMsgs.push(`¡La bendición regenera a ${activeSoul.name} (+${heal} HP)! ✨`);
          floatingTexts.push({ text: `+${heal} HP ✨`, x: 32, y: 60, color: '#fde047' });
        }

        const remaining = st.turnsRemaining - 1;
        if (remaining > 0) {
          nextPlayerStatuses.push({ ...st, turnsRemaining: remaining });
        } else {
          statusMsgs.push(`¡El efecto ${st.name} de ${activeSoul.name} se ha disipado!`);
        }
      }
      setPlayerStatuses(nextPlayerStatuses);

      // Rival statuses tick
      const nextRivalStatuses: ActiveStatusEffect[] = [];
      for (const st of rivalStatuses) {
        if (st.type === 'burn') {
          const dmg = Math.max(1, Math.round(rivalSoul.maxHp * 0.08));
          rDmg += dmg;
          statusMsgs.push(`¡${rivalSoul.name} sufre ${dmg} de daño por quemadura! 🔥`);
          floatingTexts.push({ text: `-${dmg} HP 🔥`, x: 72, y: 32, color: '#f97316' });
        } else if (st.type === 'poison') {
          const dmg = Math.max(1, Math.round(rivalSoul.maxHp * 0.10));
          rDmg += dmg;
          statusMsgs.push(`¡El veneno corroe a ${rivalSoul.name} (-${dmg} HP)! ☠️`);
          floatingTexts.push({ text: `-${dmg} HP ☠️`, x: 72, y: 32, color: '#c084fc' });
        } else if (st.type === 'blessed') {
          const heal = Math.max(1, Math.round(rivalSoul.maxHp * 0.08));
          rDmg -= heal;
          statusMsgs.push(`¡La bendición regenera a ${rivalSoul.name} (+${heal} HP)! ✨`);
          floatingTexts.push({ text: `+${heal} HP ✨`, x: 72, y: 32, color: '#fde047' });
        }

        const remaining = st.turnsRemaining - 1;
        if (remaining > 0) {
          nextRivalStatuses.push({ ...st, turnsRemaining: remaining });
        } else {
          statusMsgs.push(`¡El efecto ${st.name} de ${rivalSoul.name} se ha disipado!`);
        }
      }
      setRivalStatuses(nextRivalStatuses);

      // Trigger floating texts cleanly outside state updater
      for (const ft of floatingTexts) {
        vfxEngine.showFloatingText(ft.text, ft.x, ft.y, ft.color, 'text-base font-bold');
      }

      let nextPlayerHp = currentP_Hp;
      if (pDmg > 0) {
        nextPlayerHp = Math.max(0, currentP_Hp - pDmg);
        setPlayerHp(nextPlayerHp);
        activeSoul.hp = nextPlayerHp;
      } else if (pDmg < 0) {
        nextPlayerHp = Math.min(activeSoul.maxHp, currentP_Hp + Math.abs(pDmg));
        setPlayerHp(nextPlayerHp);
        activeSoul.hp = nextPlayerHp;
      }

      let nextRivalHp = currentR_Hp;
      if (rDmg > 0) {
        nextRivalHp = Math.max(0, currentR_Hp - rDmg);
        setRivalHp(nextRivalHp);
      } else if (rDmg < 0) {
        nextRivalHp = Math.min(rivalSoul.maxHp, currentR_Hp + Math.abs(rDmg));
        setRivalHp(nextRivalHp);
      }

      if (statusMsgs.length > 0) {
        setMessage(statusMsgs.join(' '));
      }

      scheduleTimer(() => {
        if (nextRivalHp <= 0) {
          triggerRivalFaintRef.current();
        } else if (nextPlayerHp <= 0) {
          triggerPlayerFaintRef.current(activeIdx);
        } else {
          turnPlanRef.current.step = 'finished';
          setPhase('IDLE');
          setMode('main');
        }
      }, statusMsgs.length > 0 ? 1100 : 400);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSoul, rivalSoul, scheduleTimer, activeIdx, playerStatuses, rivalStatuses]
  );

  // Starts player's attack animation and sets up impact timer
  const startPlayerAttack = useCallback(
    (move: BattleMove) => {
      // 1. Status restrictions check (Sleep, Frost, Paralysis)
      if (playerStatuses.some(s => s.type === 'sleep')) {
        setMessage(`¡${activeSoul.name} duerme profundamente y no puede atacar! 💤`);
        scheduleTimer(() => advanceTurnAfterAttack('player', rivalHp), 1000);
        return;
      }
      if (playerStatuses.some(s => s.type === 'frost')) {
        if (getRandom() < 0.35) {
          setPlayerStatuses(prev => prev.filter(s => s.type !== 'frost'));
          setMessage(`¡${activeSoul.name} rompió el hielo y se descongeló! ❄️`);
        } else {
          setMessage(`¡${activeSoul.name} está congelado en escarcha y no puede moverse! ❄️`);
          scheduleTimer(() => advanceTurnAfterAttack('player', rivalHp), 1000);
          return;
        }
      }
      if (playerStatuses.some(s => s.type === 'paralysis') && getRandom() < 0.25) {
        setMessage(`¡${activeSoul.name} está paralizado por electricidad estática! ⚡`);
        scheduleTimer(() => advanceTurnAfterAttack('player', rivalHp), 1000);
        return;
      }

      setPhase('PLAYER_ATTACK_ANIM');
      setMessage(`¡${activeSoul.name} usó ${move.name}!`);
      audioManager.playAttackSound(move.type);
      setFlashTypeColor(TYPE_COLORS[move.type].glow);

      const shaderType = resolveShaderForMove(move);
      const flightDuration = shaderType ? 0.75 : 0.4;

      if (shaderType) {
        shaderAttackEngine.launchAttack(
          shaderType,
          { x: 28, y: 64 },
          { x: 74, y: 32 },
          flightDuration,
          () => {
            vfxEngine.triggerSkillVFX(move.type, window.innerWidth * 0.72, window.innerHeight * 0.32);
          }
        );
      } else {
        vfxEngine.triggerSkillVFX(move.type, window.innerWidth * 0.72, window.innerHeight * 0.32);
      }

      scheduleTimer(() => {
        resolvePlayerAttackImpact(move);
      }, Math.floor(flightDuration * 1000));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSoul, resolveShaderForMove, scheduleTimer, playerStatuses, rivalHp, getRandom]
  );

  // Computes player's damage and checks if target fainted
  const resolvePlayerAttackImpact = useCallback(
    (move: BattleMove) => {
      setPhase('PLAYER_ATTACK_IMPACT');
      const result = calculateDamage(activeSoul, rivalSoul, move, getRandom);

      if (result.missed) {
        setFlashTypeColor(null);
        setMessage(`¡El ataque de ${activeSoul.name} falló!`);
        scheduleTimer(() => advanceTurnAfterAttack('player', rivalHp), 900);
        return;
      }

      // Unified Elemental Hit Trigger
      setRivalHitState({
        type: move.type,
        damage: result.damage,
        isCrit: result.isCrit,
        multiplier: result.multiplier,
      });
      vfxEngine.triggerScreenShake(result.isCrit ? 0.45 : 0.3);

      if (result.isCrit || move.power > 50) {
        setZoomFactor(1.15);
        scheduleTimer(() => setZoomFactor(1), 400);
      }

      const newHp = Math.max(0, rivalHp - result.damage);
      setRivalHp(newHp);

      scheduleTimer(() => {
        setRivalHitState(null);
        setFlashTypeColor(null);

        let extraMsg = '';
        if (result.isCrit) extraMsg += ' ¡Golpe crítico!';
        if (result.multiplier > 1.0) extraMsg += ' ¡Es muy efectivo!';
        else if (result.multiplier < 1.0 && move.power > 0) extraMsg += ' No es muy efectivo…';

        // Check for new status effect roll on hit
        if (result.damage > 0) {
          const newStatus = rollMoveStatusEffect(move.type, rivalSoul, getRandom);
          if (newStatus && !rivalStatuses.some(s => s.type === newStatus.type)) {
            setRivalStatuses(prev => [...prev, newStatus]);
            extraMsg += ` ¡${rivalSoul.name} quedó ${newStatus.name.toLowerCase()}! ${newStatus.icon}`;
            vfxEngine.showFloatingText(`${newStatus.icon} ${newStatus.code}`, 72, 32, newStatus.color, 'text-base font-bold');
          }
        }

        if (extraMsg) {
          setMessage(extraMsg.trim());
          scheduleTimer(() => advanceTurnAfterAttack('player', newHp), 850);
        } else {
          scheduleTimer(() => advanceTurnAfterAttack('player', newHp), 550);
        }
      }, 550);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSoul, rivalSoul, rivalHp, getRandom, scheduleTimer, rivalStatuses]
  );

  // Starts rival's attack animation and sets up impact timer
  const startRivalAttack = useCallback(
    (move: BattleMove) => {
      // 1. Status restrictions check on rival (Sleep, Frost, Paralysis)
      if (rivalStatuses.some(s => s.type === 'sleep')) {
        setMessage(`¡${rivalSoul.name} duerme profundamente y no puede atacar! 💤`);
        scheduleTimer(() => advanceTurnAfterAttack('rival', playerHp), 1000);
        return;
      }
      if (rivalStatuses.some(s => s.type === 'frost')) {
        if (getRandom() < 0.35) {
          setRivalStatuses(prev => prev.filter(s => s.type !== 'frost'));
          setMessage(`¡${rivalSoul.name} rompió la escarcha y se descongeló! ❄️`);
        } else {
          setMessage(`¡${rivalSoul.name} está congelado y no puede moverse! ❄️`);
          scheduleTimer(() => advanceTurnAfterAttack('rival', playerHp), 1000);
          return;
        }
      }
      if (rivalStatuses.some(s => s.type === 'paralysis') && getRandom() < 0.25) {
        setMessage(`¡${rivalSoul.name} está paralizado y no puede moverse! ⚡`);
        scheduleTimer(() => advanceTurnAfterAttack('rival', playerHp), 1000);
        return;
      }

      setPhase('RIVAL_ATTACK_ANIM');
      setMessage(`¡${rivalSoul.name} contraataca furioso con ${move.name}!`);
      audioManager.playAttackSound(move.type);
      setFlashTypeColor(TYPE_COLORS[move.type].glow);

      const shaderType = resolveShaderForMove(move);
      const flightDuration = shaderType ? 0.75 : 0.4;

      if (shaderType) {
        shaderAttackEngine.launchAttack(
          shaderType,
          { x: 74, y: 32 },
          { x: 28, y: 64 },
          flightDuration,
          () => {
            vfxEngine.triggerSkillVFX(move.type, window.innerWidth * 0.35, window.innerHeight * 0.58);
          }
        );
      } else {
        vfxEngine.triggerSkillVFX(move.type, window.innerWidth * 0.35, window.innerHeight * 0.58);
      }

      scheduleTimer(() => {
        resolveRivalAttackImpact(move);
      }, Math.floor(flightDuration * 1000));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rivalSoul, resolveShaderForMove, scheduleTimer, rivalStatuses, playerHp, getRandom]
  );

  // Computes rival's damage and checks if target fainted
  const resolveRivalAttackImpact = useCallback(
    (move: BattleMove) => {
      setPhase('RIVAL_ATTACK_IMPACT');
      const result = calculateDamage(rivalSoul, activeSoul, move, getRandom);

      if (result.missed) {
        setFlashTypeColor(null);
        setMessage(`¡El ataque de ${rivalSoul.name} falló!`);
        scheduleTimer(() => advanceTurnAfterAttack('rival', playerHp), 900);
        return;
      }

      // Unified Elemental Hit Trigger
      setPlayerHitState({
        type: move.type,
        damage: result.damage,
        isCrit: result.isCrit,
        multiplier: result.multiplier,
      });
      vfxEngine.triggerScreenShake(result.isCrit ? 0.45 : 0.3);

      if (result.isCrit || move.power > 50) {
        setZoomFactor(1.15);
        scheduleTimer(() => setZoomFactor(1), 400);
      }

      const newHp = Math.max(0, playerHp - result.damage);
      setPlayerHp(newHp);
      activeSoul.hp = newHp;
      setPlayerStability(prev => Math.max(0, prev - Math.floor(result.damage * 0.4)));

      scheduleTimer(() => {
        setPlayerHitState(null);
        setFlashTypeColor(null);

        let extraMsg = '';
        if (result.isCrit) extraMsg += ' ¡Golpe crítico del rival!';
        if (result.multiplier > 1.0) extraMsg += ' ¡Es muy efectivo!';
        else if (result.multiplier < 1.0 && move.power > 0) extraMsg += ' No es muy efectivo…';

        // Check for new status effect roll on hit
        if (result.damage > 0) {
          const newStatus = rollMoveStatusEffect(move.type, activeSoul, getRandom);
          if (newStatus && !playerStatuses.some(s => s.type === newStatus.type)) {
            setPlayerStatuses(prev => [...prev, newStatus]);
            extraMsg += ` ¡${activeSoul.name} quedó ${newStatus.name.toLowerCase()}! ${newStatus.icon}`;
            vfxEngine.showFloatingText(`${newStatus.icon} ${newStatus.code}`, 30, 60, newStatus.color, 'text-base font-bold');
          }
        }

        if (extraMsg) {
          setMessage(extraMsg.trim());
          scheduleTimer(() => advanceTurnAfterAttack('rival', newHp), 850);
        } else {
          scheduleTimer(() => advanceTurnAfterAttack('rival', newHp), 550);
        }
      }, 550);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSoul, rivalSoul, playerHp, getRandom, scheduleTimer, playerStatuses]
  );

  // FSM advance logic between turn steps
  const advanceTurnAfterAttack = useCallback(
    (attacker: 'player' | 'rival', targetRemainingHp: number) => {
      if (attacker === 'player') {
        if (targetRemainingHp <= 0) {
          triggerRivalFaintRef.current();
          return;
        }

        if (turnPlanRef.current.step === 'first' && turnPlanRef.current.rivalMove) {
          turnPlanRef.current.step = 'second';
          scheduleTimer(() => {
            startRivalAttack(turnPlanRef.current.rivalMove!);
          }, 600);
        } else {
          // Both actions finished -> End of turn status effect ticks!
          processEndOfTurnStatusEffects(playerHp, targetRemainingHp);
        }
      } else {
        if (targetRemainingHp <= 0) {
          triggerPlayerFaintRef.current(activeIdx);
          return;
        }

        if (turnPlanRef.current.step === 'first' && turnPlanRef.current.playerMove) {
          turnPlanRef.current.step = 'second';
          scheduleTimer(() => {
            startPlayerAttack(turnPlanRef.current.playerMove!);
          }, 600);
        } else {
          // Both actions finished -> End of turn status effect ticks!
          processEndOfTurnStatusEffects(targetRemainingHp, rivalHp);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIdx, scheduleTimer, startPlayerAttack, startRivalAttack, processEndOfTurnStatusEffects, playerHp, rivalHp]
  );

  // ==========================================
  // FAINT & ENDGAME SEQUENCES
  // ==========================================

  // Finalize victory callback passing updated soul state
  const finalizeVictory = useCallback(() => {
    if (battleEndedRef.current) return;
    battleEndedRef.current = true;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (!victorySummary) {
      setPhase('BATTLE_END');
      onVictory(0, 0, false);
      return;
    }
    setPhase('BATTLE_END');
    onVictory(
      victorySummary.expReward,
      victorySummary.goldReward,
      victorySummary.captured,
      victorySummary.captured ? { ...rivalSoul, hp: rivalSoul.maxHp } : undefined,
      { ...activeSoul }
    );
  }, [victorySummary, onVictory, rivalSoul, activeSoul]);

  // Rival Defeat & EXP / Level-Up Pipeline
  const triggerRivalFaint = useCallback(() => {
    setPhase('RIVAL_FAINT');
    setRivalFainting(true);
    audioManager.playFaint();
    setMessage(`¡${rivalSoul.name} fue purificado y derrotado!`);

    scheduleTimer(() => {
      setPhase('VICTORY_EXP');
      audioManager.playVictory();
      const expReward = calculateExpGain(rivalSoul.level);
      const goldReward = 20 + rivalSoul.level * 5;

      const oldLevel = activeSoul.level;
      const oldExp = activeSoul.exp;
      const oldMaxExp = activeSoul.maxExp;
      const oldStats = {
        maxHp: activeSoul.maxHp,
        attack: activeSoul.attack,
        defense: activeSoul.defense,
        speed: activeSoul.speed,
      };

      let curExp = oldExp + expReward;
      let curLevel = oldLevel;
      let curMaxExp = oldMaxExp;
      let leveledUp = false;
      const statGains = { maxHp: 0, attack: 0, defense: 0, speed: 0 };
      let learnedMove: BattleMove | null = null;

      while (curExp >= curMaxExp) {
        leveledUp = true;
        curLevel++;
        curExp -= curMaxExp;
        curMaxExp = Math.floor(curMaxExp * 1.3);
        statGains.maxHp += 3;
        statGains.attack += 2;
        statGains.defense += 1;
        statGains.speed += 2;
      }

      if (leveledUp) {
        activeSoul.level = curLevel;
        activeSoul.maxExp = curMaxExp;
        activeSoul.maxHp += statGains.maxHp;
        activeSoul.attack += statGains.attack;
        activeSoul.defense += statGains.defense;
        activeSoul.speed += statGains.speed;
        activeSoul.hp = Math.min(activeSoul.maxHp, activeSoul.hp + statGains.maxHp);
        setPlayerHp(activeSoul.hp);

        learnedMove = checkNewMoveOnLevelUp(activeSoul);
        if (learnedMove) {
          if (activeSoul.moves.length < 4) {
            activeSoul.moves.push(learnedMove);
          } else {
            activeSoul.moves[activeSoul.moves.length - 1] = learnedMove;
          }
        }
      }

      activeSoul.exp = curExp;
      setPlayerExp(curExp);

      const summary: VictorySummary = {
        expReward,
        goldReward,
        oldLevel,
        newLevel: curLevel,
        oldExp,
        newExp: curExp,
        oldMaxExp,
        newMaxExp: curMaxExp,
        leveledUp,
        statGains,
        oldStats,
        learnedMove,
        captured: false,
      };

      setVictorySummary(summary);
      setAnimatedExp(oldExp);

      // Smooth animated exp counter
      scheduleTimer(() => {
        setAnimatedExp(curExp);
      }, 300);

      if (leveledUp) {
        scheduleTimer(() => {
          setPhase('VICTORY_LEVELUP');
          audioManager.playLevelUp();
          vfxEngine.triggerScreenShake(0.35);
          setMessage(`¡${activeSoul.name} subió al nivel ${curLevel}! Sus atributos han despertado.`);
        }, 1100);
      } else {
        setMessage(`¡${activeSoul.name} ganó ${expReward} EXP y ${goldReward} de Oro!`);
      }
    }, 1100);
  }, [activeSoul, rivalSoul, scheduleTimer]);

  // Player Faint Sequence
  const triggerPlayerFaint = useCallback(
    (faintedIdx: number) => {
      setPhase('PLAYER_FAINT');
      setPlayerFainting(true);
      audioManager.playFaint();
      setMessage(`¡${team[faintedIdx].name} cayó debilitada!`);

      scheduleTimer(() => {
        setPlayerFainting(false);
        const aliveSouls = team.filter(s => s.hp > 0);
        if (aliveSouls.length === 0) {
          setPhase('BATTLE_END');
          setMessage('Te quedaste sin fuerzas...');
          scheduleTimer(() => {
            if (battleEndedRef.current) return;
            battleEndedRef.current = true;
            onDefeat();
          }, 2000);
        } else {
          setMessage('Elige otra alma para continuar el combate.');
          setPhase('IDLE');
          setMode('team');
        }
      }, 1500);
    },
    [team, scheduleTimer, onDefeat]
  );

  triggerRivalFaintRef.current = triggerRivalFaint;
  triggerPlayerFaintRef.current = triggerPlayerFaint;

  // ==========================================
  // USER ACTIONS: MOVE, ITEM, SWITCH, FLEE
  // ==========================================

  // Execute Player Move (Strict PP enforcement)
  const executeMove = useCallback(
    (playerMove: BattleMove) => {
      if (isInputLocked) return;

      // Strict PP validation
      if (playerMove.id !== 'struggle' && playerMove.pp <= 0) {
        audioManager.playMenuBeep();
        setMessage(`¡No quedan PP para ${playerMove.name}!`);
        return;
      }

      setMode('textOnly');

      // Deduct player PP
      if (playerMove.id !== 'struggle') {
        playerMove.pp = Math.max(0, playerMove.pp - 1);
      }

      // Choose rival move with seeded PRNG and deduct rival PP
      const rivalMove = chooseRivalMove(rivalSoul, getRandom);
      if (rivalMove.id !== 'struggle') {
        rivalMove.pp = Math.max(0, rivalMove.pp - 1);
      }

      const playerFirst = determineTurnOrder(activeSoul, rivalSoul) === 'attacker';

      turnPlanRef.current = {
        playerMove,
        rivalMove,
        step: 'first',
      };

      if (playerFirst) {
        startPlayerAttack(playerMove);
      } else {
        startRivalAttack(rivalMove);
      }
    },
    [isInputLocked, rivalSoul, activeSoul, getRandom, startPlayerAttack, startRivalAttack]
  );

  // Handle Switch Soul
  const handleSwitchToSoul = useCallback(
    (newIdx: number) => {
      if (isInputLocked || newIdx === activeIdx) return;
      const targetSoul = team[newIdx];
      if (targetSoul.hp <= 0) {
        audioManager.playMenuBeep();
        setMessage(`¡${targetSoul.name} está debilitada y no puede luchar!`);
        return;
      }

      setPhase('SWITCHING_SOUL');
      setMode('textOnly');
      audioManager.playMenuBeep();

      setMessage(`¡Regresa, ${activeSoul.name}! ¡Adelante, ${targetSoul.name}!`);
      setPlayerIntro(true);

      scheduleTimer(() => {
        activeSoul.statusEffects = [...playerStatuses];
        setActiveIdx(newIdx);
        setPlayerHp(targetSoul.hp);
        setPlayerExp(targetSoul.exp);
        setPlayerStatuses(targetSoul.statusEffects || []);
        setPlayerIntro(false);
        onSwitchSoul(newIdx);

        // Switching costs player's turn -> Rival attacks!
        scheduleTimer(() => {
          const rivalMove = chooseRivalMove(rivalSoul, getRandom);
          if (rivalMove.id !== 'struggle') {
            rivalMove.pp = Math.max(0, rivalMove.pp - 1);
          }
          turnPlanRef.current = {
            rivalMove,
            step: 'second',
          };
          startRivalAttack(rivalMove);
        }, 800);
      }, 700);
    },
    [isInputLocked, activeIdx, team, activeSoul, scheduleTimer, onSwitchSoul, rivalSoul, getRandom, startRivalAttack, playerStatuses]
  );

  // Handle Use Item (Potion or Soul Crystal)
  const handleUseItem = useCallback(
    (item: BagItem) => {
      if (isInputLocked) return;

      if (item.count <= 0) {
        audioManager.playMenuBeep();
        setMessage(`¡No te quedan ${item.name}!`);
        return;
      }

      if (item.id === 'potion') {
        if (playerHp >= activeSoul.maxHp && !playerStatuses.some(s => s.type === 'burn' || s.type === 'poison')) {
          audioManager.playMenuBeep();
          setMessage(`¡${activeSoul.name} ya tiene toda su salud y no sufre alteraciones!`);
          return;
        }

        setPhase('ITEM_USE');
        setMode('textOnly');
        onUseBagItem('potion');

        const healAmount = 25;
        const healedHp = Math.min(activeSoul.maxHp, playerHp + healAmount);
        setPlayerHp(healedHp);
        activeSoul.hp = healedHp;
        const curedBurnOrPoison = playerStatuses.some(s => s.type === 'burn' || s.type === 'poison');
        if (curedBurnOrPoison) {
          setPlayerStatuses(prev => prev.filter(s => s.type !== 'burn' && s.type !== 'poison'));
        }
        audioManager.playCollectSoul();
        vfxEngine.triggerSkillVFX('heal', window.innerWidth * 0.35, window.innerHeight * 0.58);
        vfxEngine.showFloatingText(`+${healedHp - playerHp} HP`, 35, 58, '#34d399', 'text-2xl');
        const extraCure = curedBurnOrPoison ? ' ¡Las quemaduras y toxinas han sido purificadas!' : '';
        setMessage(`¡Usaste Poción! ¡${activeSoul.name} recuperó ${healedHp - playerHp} HP!${extraCure}`);

        scheduleTimer(() => {
          const rivalMove = chooseRivalMove(rivalSoul, getRandom);
          if (rivalMove.id !== 'struggle') {
            rivalMove.pp = Math.max(0, rivalMove.pp - 1);
          }
          turnPlanRef.current = { rivalMove, step: 'second' };
          startRivalAttack(rivalMove);
        }, 1200);
      } else if (item.id === 'soul_crystal' || item.id === 'super_crystal') {
        // Capture Sequence via FSM
        setPhase('CAPTURE_SEQUENCE');
        setMode('textOnly');
        onUseBagItem(item.id);

        setMessage(`¡Lanzaste un ${item.name}!`);
        setIsCapturing(true);
        vfxEngine.triggerSkillVFX('capture', window.innerWidth * 0.72, window.innerHeight * 0.32);

        const catchMultiplier = item.catchBonus ?? (item.id === 'super_crystal' ? 1.8 : 1.0);
        const catchRate = calculateCatchRate(rivalSoul, catchMultiplier);

        scheduleTimer(() => {
          setCaptureShakeStep(1);
          audioManager.playCaptureShake();
        }, 700);

        scheduleTimer(() => {
          setCaptureShakeStep(2);
          audioManager.playCaptureShake();
        }, 1400);

        scheduleTimer(() => {
          setCaptureShakeStep(3);
          audioManager.playCaptureShake();
        }, 2100);

        scheduleTimer(() => {
          const isCaught = getRandom() < catchRate;

          if (isCaught) {
            setPhase('VICTORY_EXP');
            audioManager.playCaptureSuccess();
            const expReward = calculateExpGain(rivalSoul.level);
            const goldReward = 30;

            const oldLevel = activeSoul.level;
            const oldExp = activeSoul.exp;
            const oldMaxExp = activeSoul.maxExp;
            const oldStats = {
              maxHp: activeSoul.maxHp,
              attack: activeSoul.attack,
              defense: activeSoul.defense,
              speed: activeSoul.speed,
            };

            let curExp = oldExp + expReward;
            let curLevel = oldLevel;
            let curMaxExp = oldMaxExp;
            let leveledUp = false;
            const statGains = { maxHp: 0, attack: 0, defense: 0, speed: 0 };
            let learnedMove: BattleMove | null = null;

            while (curExp >= curMaxExp) {
              leveledUp = true;
              curLevel++;
              curExp -= curMaxExp;
              curMaxExp = Math.floor(curMaxExp * 1.3);
              statGains.maxHp += 3;
              statGains.attack += 2;
              statGains.defense += 1;
              statGains.speed += 2;
            }

            if (leveledUp) {
              activeSoul.level = curLevel;
              activeSoul.maxExp = curMaxExp;
              activeSoul.maxHp += statGains.maxHp;
              activeSoul.attack += statGains.attack;
              activeSoul.defense += statGains.defense;
              activeSoul.speed += statGains.speed;
              activeSoul.hp = Math.min(activeSoul.maxHp, activeSoul.hp + statGains.maxHp);
              setPlayerHp(activeSoul.hp);

              learnedMove = checkNewMoveOnLevelUp(activeSoul);
              if (learnedMove) {
                if (activeSoul.moves.length < 4) {
                  activeSoul.moves.push(learnedMove);
                } else {
                  activeSoul.moves[activeSoul.moves.length - 1] = learnedMove;
                }
              }
            }

            activeSoul.exp = curExp;
            setPlayerExp(curExp);

            const summary: VictorySummary = {
              expReward,
              goldReward,
              oldLevel,
              newLevel: curLevel,
              oldExp,
              newExp: curExp,
              oldMaxExp,
              newMaxExp: curMaxExp,
              leveledUp,
              statGains,
              oldStats,
              learnedMove,
              captured: true,
            };

            setVictorySummary(summary);
            setAnimatedExp(oldExp);

            scheduleTimer(() => {
              setAnimatedExp(curExp);
            }, 300);

            if (leveledUp) {
              scheduleTimer(() => {
                setPhase('VICTORY_LEVELUP');
                audioManager.playLevelUp();
                vfxEngine.triggerScreenShake(0.35);
                setMessage(`¡Capturaste a ${rivalSoul.name}! ¡Además ${activeSoul.name} subió al Nv. ${curLevel}!`);
              }, 1100);
            } else {
              setMessage(`¡Capturaste a ${rivalSoul.name}! Se ha sellado en tu códice.`);
            }
          } else {
            setIsCapturing(false);
            setCaptureShakeStep(0);
            setMessage('¡Se liberó!');
            audioManager.playFaint();

            scheduleTimer(() => {
              const rivalMove = chooseRivalMove(rivalSoul, getRandom);
              if (rivalMove.id !== 'struggle') {
                rivalMove.pp = Math.max(0, rivalMove.pp - 1);
              }
              turnPlanRef.current = { rivalMove, step: 'second' };
              startRivalAttack(rivalMove);
            }, 1200);
          }
        }, 2800);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isInputLocked, playerHp, activeSoul, onUseBagItem, scheduleTimer, rivalSoul, getRandom, startRivalAttack, onVictory]
  );

  // Flee logic (Seeded PRNG)
  const handleFlee = useCallback(() => {
    if (isInputLocked) return;
    setPhase('FLEE_ATTEMPT');
    setMode('textOnly');

    const success = attemptFlee(getRandom);

    if (success) {
      audioManager.playRunAway();
      setMessage('¡Escapaste sin problemas!');
      scheduleTimer(() => {
        if (battleEndedRef.current) return;
        battleEndedRef.current = true;
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setPhase('BATTLE_END');
        onFlee();
      }, 1400);
    } else {
      setMessage('¡No pudiste huir! El rival aprovecha el momento.');
      scheduleTimer(() => {
        const rivalMove = chooseRivalMove(rivalSoul, getRandom);
        if (rivalMove.id !== 'struggle') {
          rivalMove.pp = Math.max(0, rivalMove.pp - 1);
        }
        turnPlanRef.current = { rivalMove, step: 'second' };
        startRivalAttack(rivalMove);
      }, 1200);
    }
  }, [isInputLocked, getRandom, scheduleTimer, onFlee, rivalSoul, startRivalAttack]);

  // Main Action button router
  const triggerMainAction = useCallback(
    (index: number) => {
      audioManager.playMenuBeep();
      if (index === 0) setMode('moves');
      else if (index === 1) setMode('bag');
      else if (index === 2) setMode('team');
      else if (index === 3) handleFlee();
    },
    [handleFlee]
  );

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow pressing Enter or Space to finalize victory screen
      if (phase === 'VICTORY_EXP' || phase === 'VICTORY_LEVELUP' || phase === 'VICTORY_LEARN_MOVE') {
        if (e.key === 'Enter' || e.key === ' ') {
          finalizeVictory();
        }
        return;
      }

      // Allow closing status modal with ESC, Enter, or Space
      if (showStatusModal) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          setShowStatusModal(false);
        }
        return;
      }

      if (isInputLocked) return;

      if (mode === 'main') {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          triggerMainAction(0);
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          triggerMainAction(1);
        } else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
          triggerMainAction(2);
        } else if (e.key === '4' || e.code === 'Digit4' || e.code === 'Numpad4') {
          triggerMainAction(3);
        } else if (e.key === 'ArrowLeft') {
          audioManager.playMenuBeep();
          setSelectedMainIdx(prev => (prev === 0 ? 3 : prev - 1));
        } else if (e.key === 'ArrowRight') {
          audioManager.playMenuBeep();
          setSelectedMainIdx(prev => (prev === 3 ? 0 : prev + 1));
        } else if (e.key === 'Enter' || e.key === ' ') {
          triggerMainAction(selectedMainIdx);
        }
      } else if (mode === 'moves') {
        const usableMoves = getAvailableMoves();
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          if (usableMoves[0]) executeMove(usableMoves[0]);
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          if (usableMoves[1]) executeMove(usableMoves[1]);
        } else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
          if (usableMoves[2]) executeMove(usableMoves[2]);
        } else if (e.key === '4' || e.code === 'Digit4' || e.code === 'Numpad4') {
          if (usableMoves[3]) executeMove(usableMoves[3]);
        } else if (e.key === 'ArrowLeft') {
          audioManager.playMenuBeep();
          setSelectedMoveIdx(prev => (prev % 2 === 1 ? prev - 1 : prev));
        } else if (e.key === 'ArrowRight') {
          audioManager.playMenuBeep();
          setSelectedMoveIdx(prev => (prev % 2 === 0 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          audioManager.playMenuBeep();
          setSelectedMoveIdx(prev => (prev >= 2 ? prev - 2 : prev));
        } else if (e.key === 'ArrowDown') {
          audioManager.playMenuBeep();
          setSelectedMoveIdx(prev => (prev <= 1 ? prev + 2 : prev));
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (usableMoves[selectedMoveIdx]) {
            executeMove(usableMoves[selectedMoveIdx]);
          }
        } else if (e.key === 'Escape' || e.key === 'KeyQ') {
          setMode('main');
        }
      } else if (mode === 'bag') {
        if (e.key === 'ArrowUp') {
          audioManager.playMenuBeep();
          setSelectedItemIdx(prev => (prev > 0 ? prev - 1 : bag.length - 1));
        } else if (e.key === 'ArrowDown') {
          audioManager.playMenuBeep();
          setSelectedItemIdx(prev => (prev < bag.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (bag[selectedItemIdx]) {
            handleUseItem(bag[selectedItemIdx]);
          }
        } else if (e.key === 'Escape' || e.key === 'KeyQ') {
          setMode('main');
        }
      } else if (mode === 'team') {
        if (e.key === 'ArrowUp') {
          audioManager.playMenuBeep();
          setSelectedTeamIdx(prev => (prev > 0 ? prev - 1 : team.length - 1));
        } else if (e.key === 'ArrowDown') {
          audioManager.playMenuBeep();
          setSelectedTeamIdx(prev => (prev < team.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'Enter' || e.key === ' ') {
          handleSwitchToSoul(selectedTeamIdx);
        } else if ((e.key === 'Escape' || e.key === 'KeyQ') && playerHp > 0) {
          setMode('main');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    selectedMainIdx,
    selectedMoveIdx,
    selectedItemIdx,
    selectedTeamIdx,
    isInputLocked,
    playerHp,
    bag,
    team,
    triggerMainAction,
    getAvailableMoves,
    executeMove,
    handleUseItem,
    handleSwitchToSoul,
    phase,
    finalizeVictory,
    showStatusModal,
  ]);

  const rivalTypeStyling = TYPE_COLORS[rivalSoul.type];
  const playerTypeStyling = TYPE_COLORS[activeSoul.type];

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-y-auto flex items-center justify-center bg-black/95 backdrop-blur-md z-50 p-0 sm:p-2">
      {/* 9:16 Responsive Container */}
      <div 
        className="relative w-full max-w-[430px] min-h-[560px] h-full sm:h-[94dvh] max-h-[920px] bg-[#0c0916] border-0 sm:border-2 border-[#3b2a5a] shadow-[0_0_50px_rgba(139,92,246,0.3)] sm:rounded-md flex flex-col justify-between overflow-x-hidden overflow-y-auto select-none font-pixel text-[#fdf6e2] pb-2 sm:pb-0 transition-transform duration-300 ease-out"
        style={{ transform: `scale(${zoomFactor})` }}
      >
        
        {/* DUNGEON BACKGROUND */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src={battleBackground || "/assets/battle/battle_bg.webp"}
            alt="Battle Arena"
            className="w-full h-full object-cover object-center"
            style={{ imageRendering: 'pixelated' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/assets/battle/battle_bg.webp';
            }}
          />
          <div className="absolute inset-0 bg-[#0c0916]/25" />

          <div className="absolute inset-0 pointer-events-none animate-energy-flicker">
            <svg className="w-full h-full" viewBox="0 0 430 860" fill="none">
              <path
                d="M -10 320 Q 40 330 30 360 T 10 400 Q 60 410 45 440"
                stroke="#c084fc"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="drop-shadow(0 0 6px #a855f7)"
              />
              <path
                d="M 440 280 Q 380 300 395 330 T 430 380"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                filter="drop-shadow(0 0 6px #a855f7)"
              />
            </svg>
          </div>

          {flashTypeColor && (
            <div
              className="absolute inset-0 z-30 transition-opacity duration-150"
              style={{
                backgroundColor: flashTypeColor,
                opacity: 0.35,
              }}
            />
          )}
        </div>

        {/* 3D WEBGL SHADER ATTACK CANVAS OVERLAY */}
        <ShaderAttackCanvas className="z-30 pointer-events-none" />

        {/* 1. TOP HEADER BAR: Turn/Soul Indicator & Discreet 3D FX Drawer Toggle */}
        <div className="relative z-20 px-2 sm:px-3 pt-2 pb-0.5 flex items-center justify-between text-[9px] sm:text-[10px] shrink-0 font-pixel">
          <div className="flex items-center gap-2">
            <span className="text-[#fbbf24] font-bold tracking-wider">
              ✦ ARENA DE COMBATE
            </span>
            <span className="text-[#475569]">·</span>
            <span className="text-[#94a3b8]">Nv. {activeSoul.level}</span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setShowShaderDrawer(prev => !prev)}
              className="px-2 py-0.5 bg-[#140e25]/90 hover:bg-[#22173d] border border-[#a855f7]/60 text-[#d8b4fe] text-[8px] rounded-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
              title="Alternar panel de pruebas de shaders WebGL 3D"
            >
              <span>🔮 3D FX</span>
              <span className="text-[7px]">{showShaderDrawer ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible 3D Shader test drawer */}
        {showShaderDrawer && (
          <div className="relative z-30 mx-2 sm:mx-3 p-1.5 bg-[#120a21]/95 border border-[#a855f7]/60 rounded-xs flex flex-wrap items-center justify-center gap-1 shadow-2xl animate-fade-in shrink-0">
            <span className="text-[#c084fc] font-bold text-[7px] uppercase tracking-wider pr-1">
              PROBAR SHADERS:
            </span>
            <button
              onClick={() => {
                audioManager.playAttackSound('Fuego');
                shaderAttackEngine.launchAttack('lava', { x: 28, y: 64 }, { x: 74, y: 32 }, 0.8, () => {
                  vfxEngine.triggerSkillVFX('Fuego', window.innerWidth * 0.72, window.innerHeight * 0.32);
                  vfxEngine.showFloatingText('💥 MAGMA BURST', 74, 30, '#f97316', 'text-xl');
                });
              }}
              className="px-2 py-0.5 bg-red-950/80 hover:bg-red-900 border border-red-500/60 rounded-xs text-[7px] text-[#fee2e2] cursor-pointer"
            >
              🌋 Furia Volcánica
            </button>
            <button
              onClick={() => {
                audioManager.playAttackSound('Agua');
                shaderAttackEngine.launchAttack('water', { x: 28, y: 64 }, { x: 74, y: 32 }, 0.8, () => {
                  vfxEngine.triggerSkillVFX('Agua', window.innerWidth * 0.72, window.innerHeight * 0.32);
                  vfxEngine.showFloatingText('🌊 ORBE MARINO', 74, 30, '#38bdf8', 'text-xl');
                });
              }}
              className="px-2 py-0.5 bg-sky-950/80 hover:bg-sky-900 border border-sky-500/60 rounded-xs text-[7px] text-[#e0f2fe] cursor-pointer"
            >
              💧 Orbe Marino
            </button>
            <button
              onClick={() => {
                audioManager.playAttackSound('Planta');
                shaderAttackEngine.launchAttack('slime', { x: 28, y: 64 }, { x: 74, y: 32 }, 0.8, () => {
                  vfxEngine.triggerSkillVFX('Planta', window.innerWidth * 0.72, window.innerHeight * 0.32);
                  vfxEngine.showFloatingText('🧪 CIENO ÁCIDO', 74, 30, '#4ade80', 'text-xl');
                });
              }}
              className="px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 rounded-xs text-[7px] text-[#dcfce7] cursor-pointer"
            >
              🧪 Cieno Ácido
            </button>
            <button
              onClick={() => {
                audioManager.playAttackSound('Sombra');
                shaderAttackEngine.launchAttack('blackhole', { x: 28, y: 64 }, { x: 74, y: 32 }, 0.8, () => {
                  vfxEngine.triggerSkillVFX('Sombra', window.innerWidth * 0.72, window.innerHeight * 0.32);
                  vfxEngine.showFloatingText('🕳️ SINGULARIDAD', 74, 30, '#c084fc', 'text-xl');
                });
              }}
              className="px-2 py-0.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 rounded-xs text-[7px] text-[#f3e8ff] cursor-pointer"
            >
              🕳️ Singularidad
            </button>
          </div>
        )}

        {/* 2. RIVAL PANEL (TOP-LEFT) */}
        <div className="relative z-20 px-2.5 sm:px-3.5 pt-0.5 sm:pt-1.5 flex justify-start shrink-0">
          <PixelBox className="w-[170px] sm:w-[215px] p-2 sm:p-2.5 space-y-1 sm:space-y-1.5">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] leading-tight">
              <span className="font-bold tracking-wide text-[#fdf6e2] truncate max-w-[105px] sm:max-w-[120px]">
                {rivalSoul.name}
              </span>
              <span className="text-[#fbbf24] text-[9px] sm:text-[10px]">Nv. {rivalSoul.level}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <TypeBadge type={rivalSoul.type} />
              <StatusBadgeList
                statuses={rivalStatuses}
                onOpenModal={() => {
                  setStatusModalInitialTarget('rival');
                  setShowStatusModal(true);
                }}
                align="right"
              />
            </div>
            <div className="space-y-0.5 sm:space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-[#fef3c7]/90 font-bold">
                <span>HP: {rivalHp}/{rivalSoul.maxHp}</span>
              </div>
              <AnimatedHealthBar current={rivalHp} max={rivalSoul.maxHp} />
            </div>
          </PixelBox>
        </div>

        {/* 3. CHARACTERS ARENA */}
        <div className="relative z-10 flex-1 flex flex-col justify-between px-2 sm:px-4 pt-1 pb-2 pointer-events-none min-h-0 overflow-visible">
          
          {/* RIVAL: TOP-RIGHT */}
          <div
            className={`self-end flex flex-col items-center mr-6 sm:mr-12 -mt-2 sm:-mt-6 transition-transform duration-700 relative ${
              rivalIntro ? 'translate-x-32 opacity-0' : 'translate-x-0 opacity-100'
            }`}
          >
            {rivalHitState && <ElementalImpactBadge {...rivalHitState} target="rival" />}
            <div className="animate-battle-bob flex flex-col items-center">
              <div className="relative z-10 flex items-center justify-center">
                {rivalStatuses.length > 0 && (
                  <div
                    className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 flex gap-1 pointer-events-auto cursor-pointer"
                    onClick={() => { setStatusModalInitialTarget('rival'); setShowStatusModal(true); }}
                    title="Ver Efectos de Estado"
                  >
                    {rivalStatuses.map((st, i) => (
                      <span key={i} className="text-base drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-bounce" title={st.name}>
                        {st.icon}
                      </span>
                    ))}
                  </div>
                )}
                <SoulSpriteCanvas
                  spritesheet={rivalSoul.spritesheet}
                  frame={rivalSoul.frameFront}
                  sheetSize={rivalSoul.sheetSize}
                  view="front"
                  hitType={rivalHitState?.type || null}
                  isFainting={rivalFainting}
                  isCapturing={isCapturing}
                  flipX={true}
                />
              </div>
              <div className="relative z-0 -mt-6 sm:-mt-8 flex items-center justify-center">
                <ElementalPedestal
                  color={rivalTypeStyling.border}
                  type={rivalSoul.type}
                  isRival={true}
                  hitType={rivalHitState?.type || null}
                />
              </div>
            </div>
          </div>

          {/* CAPTURE CRYSTAL IN CENTER OF ARENA */}
          {isCapturing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 gap-1.5">
              <div
                className={`text-5xl sm:text-6xl filter drop-shadow-[0_0_24px_#38bdf8] ${
                  captureShakeStep > 0 ? 'animate-crystal-vibrate' : 'animate-bounce'
                }`}
              >
                💎
              </div>
              {captureShakeStep > 0 && (
                <div className="bg-[#0c0916]/90 border border-[#38bdf8] px-2.5 py-0.5 rounded-full text-[9px] font-pixel text-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.5)] animate-pulse tracking-widest uppercase">
                  Vibración {captureShakeStep} / 3
                </div>
              )}
            </div>
          )}

          {/* PLAYER: BOTTOM-LEFT */}
          <div
            className={`self-start flex flex-col items-center ml-6 sm:ml-14 mb-16 sm:mb-24 -translate-y-[20%] transition-all duration-700 relative ${
              playerIntro ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
            }`}
          >
            {playerHitState && <ElementalImpactBadge {...playerHitState} target="player" />}
            <div className="animate-battle-bob-rev flex flex-col items-center">
              <div className="relative z-10 flex items-center justify-center">
                {playerStatuses.length > 0 && (
                  <div
                    className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 flex gap-1 pointer-events-auto cursor-pointer"
                    onClick={() => { setStatusModalInitialTarget('player'); setShowStatusModal(true); }}
                    title="Ver Efectos de Estado"
                  >
                    {playerStatuses.map((st, i) => (
                      <span key={i} className="text-base drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-bounce" title={st.name}>
                        {st.icon}
                      </span>
                    ))}
                  </div>
                )}
                <SoulSpriteCanvas
                  spritesheet={activeSoul.spritesheet}
                  frame={activeSoul.frameBack}
                  sheetSize={activeSoul.sheetSize}
                  view="back"
                  hitType={playerHitState?.type || null}
                  isFainting={playerFainting}
                  flipX={true}
                  scaleFactor={1.56}
                />
              </div>
              <div className="relative z-0 -mt-6 sm:-mt-8 flex items-center justify-center scale-[1.43]">
                <ElementalPedestal
                  color={playerTypeStyling.border}
                  type={activeSoul.type}
                  isRival={false}
                  hitType={playerHitState?.type || null}
                />
              </div>
            </div>
          </div>

        </div>

        {/* 4. PLAYER ACTIVE SOUL PANEL (BOTTOM-RIGHT) */}
        <div className="relative z-20 px-2.5 sm:px-3.5 pb-1 sm:pb-1.5 flex justify-end shrink-0">
          <PixelBox className="w-[185px] sm:w-[230px] p-2 sm:p-2.5 space-y-1 sm:space-y-1.5">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] leading-tight">
              <span className="font-bold tracking-wide text-[#fdf6e2] truncate max-w-[120px] sm:max-w-[140px]">
                {activeSoul.name}
              </span>
              <span className="text-[#fbbf24] text-[9px] sm:text-[10px]">Nv. {activeSoul.level}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <TypeBadge type={activeSoul.type} />
              <StatusBadgeList
                statuses={playerStatuses}
                onOpenModal={() => {
                  setStatusModalInitialTarget('player');
                  setShowStatusModal(true);
                }}
                align="right"
              />
            </div>
            <div className="space-y-0.5 sm:space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-[#fef3c7]/90 font-bold">
                <span>HP: {playerHp}/{activeSoul.maxHp}</span>
              </div>
              <AnimatedHealthBar current={playerHp} max={activeSoul.maxHp} />
            </div>
            <div className="space-y-0.5 pt-0.5">
              <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-bold">
                <span className={isStabilityCritical ? 'text-[#ef4444] animate-pulse font-black' : 'text-[#c084fc]'}>
                  {isStabilityCritical ? '⚠️ ESTABILIDAD CRÍTICA!' : 'ESTABILIDAD:'} {playerStability}/{maxStability}
                </span>
              </div>
              <div className="w-full bg-[#0a0714] border border-[#1e1730] h-1.5 sm:h-2 rounded-xs p-[1px] overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isStabilityCritical
                      ? 'bg-[#ef4444] animate-pulse shadow-[0_0_8px_#ef4444]'
                      : 'bg-[#c084fc] shadow-[0_0_4px_#c084fc]'
                  }`}
                  style={{ width: `${stabilityRatio * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1 pt-0.5">
              <span className="text-[7px] sm:text-[8px] text-[#38bdf8] font-bold">EXP:</span>
              <div className="flex-1 bg-[#0a0714] border border-[#1e1730] h-1.5 sm:h-2 rounded-xs p-[1px] overflow-hidden">
                <div
                  className="bg-[#38bdf8] h-full transition-all duration-500 shadow-[0_0_4px_#38bdf8]"
                  style={{ width: `${(playerExp / activeSoul.maxExp) * 100}%` }}
                />
              </div>
            </div>
          </PixelBox>
        </div>

        {/* 5. MESSAGE BOX & ACTION BUTTONS */}
        <div className="relative z-20 p-2 sm:p-3 space-y-1 sm:space-y-2 bg-[#0c0916]/95 border-t-2 border-[#2e204a] shrink-0">
          
          {/* Message Box */}
          <BrandPanel variant="inset" className="min-h-[40px] sm:min-h-[56px] p-2 sm:p-2.5 flex items-center">
            <p className="text-[9px] sm:text-[11px] leading-relaxed text-[#fef3c7] font-pixel tracking-normal">
              {typedMessage}
              {typedMessage.length < message.length && <span className="animate-pulse">_</span>}
            </p>
          </BrandPanel>

          {/* BRAVE FRONTIER VICTORY & LEVEL-UP DOSSIER PANEL */}
          {(phase === 'VICTORY_EXP' || phase === 'VICTORY_LEVELUP' || phase === 'VICTORY_LEARN_MOVE') && victorySummary && (
            <div className="space-y-2 pt-1 animate-fade-in">
              {/* Header Banner */}
              <div className="flex items-center justify-between border-b border-[#b4862a]/40 pb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400 text-xs">✦</span>
                  <span className="text-[10px] font-bold tracking-wider text-[#fdf6e2] uppercase">
                    {victorySummary.captured ? '¡ALMA SELLADA CON ÉXITO!' : '¡VICTORIA PURIFICADORA!'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[8px] font-pixel tabular-nums">
                  <span className="text-[#fbbf24] font-bold">+{victorySummary.goldReward} 🪙</span>
                  <span className="text-[#38bdf8] font-bold">+{victorySummary.expReward} EXP</span>
                </div>
              </div>

              {/* Soul Status & EXP Bar */}
              <div className="p-2 bg-[#120a22] border border-[#3b2a5a] rounded-xs space-y-1.5">
                <div className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#fef3c7]">{activeSoul.name}</span>
                    <span className="text-[#94a3b8]">·</span>
                    <span className="text-[#38bdf8]">{activeSoul.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#fbbf24] font-bold">Nv. {activeSoul.level}</span>
                    {victorySummary.leveledUp && (
                      <span className="px-1 py-0.2 bg-[#eab308]/20 border border-[#facc15] text-[#fde047] text-[7px] font-bold rounded-xs animate-pulse">
                        ¡SUBIÓ!
                      </span>
                    )}
                  </div>
                </div>

                {/* Animated EXP gauge */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[7px] text-[#94a3b8] font-mono">
                    <span>EXPERIENCIA</span>
                    <span>{animatedExp} / {activeSoul.maxExp} EXP</span>
                  </div>
                  <div className="w-full bg-[#07050d] border border-[#2b1f40] h-2 rounded-xs p-[1px] overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#0284c7] to-[#38bdf8] h-full transition-all duration-700 ease-out shadow-[0_0_8px_#38bdf8]"
                      style={{
                        width: `${Math.min(100, Math.max(0, (animatedExp / activeSoul.maxExp) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Level Up Stats Grid (Brave Frontier 4-stat layout) */}
                {victorySummary.leveledUp && (
                  <div className="pt-1 space-y-1">
                    <div className="text-[8px] font-bold text-[#facc15] text-center tracking-wider">
                      ★ CRECIMIENTO DE ATRIBUTOS ★
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <div className="p-1 bg-[#0b2416] border border-[#22c55e]/50 rounded-xs text-center">
                        <div className="text-[6.5px] text-[#86efac] font-bold">HP</div>
                        <div className="text-[9px] text-[#f0fdf4] font-bold tabular-nums">
                          {activeSoul.maxHp} <span className="text-[#4ade80] text-[7.5px]">(+{victorySummary.statGains.maxHp})</span>
                        </div>
                      </div>
                      <div className="p-1 bg-[#2b0f12] border border-[#ef4444]/50 rounded-xs text-center">
                        <div className="text-[6.5px] text-[#fca5a5] font-bold">ATK</div>
                        <div className="text-[9px] text-[#fef2f2] font-bold tabular-nums">
                          {activeSoul.attack} <span className="text-[#f87171] text-[7.5px]">(+{victorySummary.statGains.attack})</span>
                        </div>
                      </div>
                      <div className="p-1 bg-[#091b2c] border border-[#38bdf8]/50 rounded-xs text-center">
                        <div className="text-[6.5px] text-[#7dd3fc] font-bold">DEF</div>
                        <div className="text-[9px] text-[#f0f9ff] font-bold tabular-nums">
                          {activeSoul.defense} <span className="text-[#38bdf8] text-[7.5px]">(+{victorySummary.statGains.defense})</span>
                        </div>
                      </div>
                      <div className="p-1 bg-[#261909] border border-[#f59e0b]/50 rounded-xs text-center">
                        <div className="text-[6.5px] text-[#fde68a] font-bold">VEL</div>
                        <div className="text-[9px] text-[#fffbeb] font-bold tabular-nums">
                          {activeSoul.speed} <span className="text-[#fbbf24] text-[7.5px]">(+{victorySummary.statGains.speed})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Learned move prompt if any */}
                {victorySummary.learnedMove && (
                  <div className="p-1 bg-[#261238] border border-[#a855f7] rounded-xs flex items-center justify-between text-[8px] text-[#f3e8ff]">
                    <span>✦ Nueva Técnica Despertada:</span>
                    <span className="font-bold text-[#facc15]">
                      {victorySummary.learnedMove.name} (Pot: {victorySummary.learnedMove.power})
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <BrandButton
                variant="primary"
                onClick={finalizeVictory}
                className="w-full py-3 text-[9px] sm:text-[10px] tracking-widest gap-2"
              >
                <span>✦ CONTINUAR AVENTURA</span>
                <span className="text-[7px] text-[#E8B84A]/70 font-mono">[ENTER]</span>
                <span>➔</span>
              </BrandButton>
            </div>
          )}

          {/* Action Row: LUCHAR, VIAJES, ALMAS, HUIR (Tactical Console Buttons) */}
          {mode === 'main' && phase !== 'VICTORY_EXP' && phase !== 'VICTORY_LEVELUP' && phase !== 'VICTORY_LEARN_MOVE' && (
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { key: '1', name: 'LUCHAR', icon: '⚔️', variant: 'danger' as const },
                { key: '2', name: 'VIAJES', icon: '🎒', variant: 'ki' as const },
                { key: '3', name: 'ALMAS', icon: '👥', variant: 'soul' as const },
                { key: '4', name: 'HUIR', icon: '💨', variant: 'secondary' as const },
              ].map((btn, idx) => {
                const isSelected = selectedMainIdx === idx;
                return (
                  <BrandButton
                    key={btn.name}
                    variant={btn.variant}
                    selected={isSelected}
                    onClick={() => triggerMainAction(idx)}
                    onMouseEnter={() => setSelectedMainIdx(idx)}
                    disabled={isInputLocked}
                    className="relative py-2 sm:py-2.5 px-1 text-[8px] sm:text-[9px] flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm">{btn.icon}</span>
                      <span className="tracking-wider">{btn.name}</span>
                    </div>
                    <span className="text-[6.5px] text-[#94a3b8] font-mono leading-none">[{btn.key}]</span>
                  </BrandButton>
                );
              })}
            </div>
          )}

          {/* Moves Selection Panel (Zero-Pill Runic Layout) */}
          {mode === 'moves' && (
            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-2 gap-1.5">
                {getAvailableMoves().map((move, idx) => {
                  const isSelected = selectedMoveIdx === idx;
                  const moveColor = TYPE_COLORS[move.type];
                  const hasPP = move.pp > 0 || move.id === 'struggle';
                  return (
                    <button
                      key={move.id}
                      onClick={() => executeMove(move)}
                      onMouseEnter={() => setSelectedMoveIdx(idx)}
                      disabled={!hasPP || isInputLocked}
                      className={`relative p-2.5 rounded-xs border-2 text-left transition-all ${
                        !hasPP || isInputLocked
                          ? 'opacity-40 border-[#1a1423] bg-[#0c0817] cursor-not-allowed'
                          : isSelected
                          ? 'border-[#E8B84A] bg-[#2A1F2D] shadow-[0_0_15px_rgba(232,184,74,0.4)] cursor-pointer scale-[1.02]'
                          : 'border-[#8A6A3B]/60 bg-[#14101C] hover:bg-[#2A1F2D]/60 hover:border-[#8A6A3B] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="text-lg sm:text-xl drop-shadow-sm">
                          {ELEMENTAL_SIGILS[move.type] || '✦'}
                        </span>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-[9px] sm:text-[10px] text-[#F2E6C9]">{move.name}</span>
                            <span className="text-[6.5px] font-mono text-[#E8B84A]/80">[{idx + 1}]</span>
                          </div>
                          {move.shaderVfx && (
                            <BrandBadge variant="soul" className="text-[6px] py-0 px-1 mt-0.5">
                              3D FX
                            </BrandBadge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[7.5px] sm:text-[8px] font-pixel">
                        <span className={move.pp === 0 && move.id !== 'struggle' ? 'text-[#C2234B] font-bold' : 'text-[#94a3b8]'}>
                          PP {move.pp}/{move.maxPp}
                        </span>
                        <span className="font-bold uppercase tracking-tight" style={{ color: moveColor.text }}>
                          {move.type}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <BrandButton
                variant="secondary"
                onClick={() => setMode('main')}
                disabled={isInputLocked}
                className="w-full py-1 text-[8px] sm:text-[9px]"
              >
                ← [VOLVER AL MENÚ DE COMBATE]
              </BrandButton>
            </div>
          )}

          {/* VIAJES / BAG PANEL */}
          {mode === 'bag' && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[9px] text-[#E8B84A] font-bold px-1 flex items-center justify-between">
                <span>🎒 SUMINISTROS DE VIAJE:</span>
                <span className="text-[7.5px] text-[#94a3b8]">{bag.reduce((acc, i) => acc + i.count, 0)} disponibles</span>
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-[120px] overflow-y-auto pr-1">
                {bag.map((item, idx) => {
                  const isSelected = selectedItemIdx === idx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleUseItem(item)}
                      onMouseEnter={() => setSelectedItemIdx(idx)}
                      disabled={item.count <= 0 || isInputLocked}
                      className={`p-2 rounded-xs border-2 flex items-center justify-between text-left transition ${
                        item.count <= 0 || isInputLocked
                          ? 'opacity-40 border-[#1a1423] bg-[#0c0817] cursor-not-allowed'
                          : isSelected
                          ? 'border-[#E8B84A] bg-[#2A1F2D] shadow-[0_0_10px_rgba(232,184,74,0.4)] cursor-pointer'
                          : 'border-[#8A6A3B]/60 bg-[#14101C] hover:bg-[#2A1F2D]/60 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.effect === 'heal' ? '🧪' : '💎'}</span>
                        <div>
                          <div className="text-[9px] font-bold text-[#F2E6C9]">{item.name}</div>
                          <div className="text-[7px] text-[#5FE3D2]">{item.description}</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-[#E8B84A] tabular-nums pl-2">
                        x{item.count}
                      </div>
                    </button>
                  );
                })}
              </div>
              <BrandButton
                variant="secondary"
                onClick={() => setMode('main')}
                disabled={isInputLocked}
                className="w-full py-1 text-[8px] sm:text-[9px]"
              >
                ← [VOLVER AL MENÚ DE COMBATE]
              </BrandButton>
            </div>
          )}

          {/* ALMAS / TEAM PANEL (Zero-Pill Discipline & RPG Visuals) */}
          {mode === 'team' && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[9px] text-[#9B6BFF] font-bold px-1 flex justify-between">
                <span>⚔️ ESCUADRÓN DE ALMAS ({team.length}/6):</span>
                {playerHp <= 0 && <span className="text-[#C2234B] animate-pulse">¡Elige alma de relevo!</span>}
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-[130px] overflow-y-auto pr-1">
                {team.map((soul, idx) => {
                  const isCurrent = idx === activeIdx;
                  const isFainted = soul.hp <= 0;
                  const isSelected = selectedTeamIdx === idx;
                  const tStyling = TYPE_COLORS[soul.type];
                  const hpPct = Math.max(0, Math.min(100, (soul.hp / soul.maxHp) * 100));

                  return (
                    <button
                      key={soul.id}
                      onClick={() => handleSwitchToSoul(idx)}
                      onMouseEnter={() => setSelectedTeamIdx(idx)}
                      disabled={isFainted || isCurrent || isInputLocked}
                      className={`p-2 rounded-xs border-2 flex items-center justify-between text-left transition ${
                        isCurrent
                          ? 'border-[#5FE3D2] bg-[#14232c] opacity-90 cursor-default'
                          : isFainted || isInputLocked
                          ? 'border-[#1a1423] bg-[#0c0817] opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#E8B84A] bg-[#2A1F2D] shadow-[0_0_10px_rgba(232,184,74,0.4)] cursor-pointer'
                          : 'border-[#8A6A3B]/60 bg-[#14101C] hover:bg-[#2A1F2D]/60 cursor-pointer'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 text-[8px] mb-0.5">
                          <span style={{ color: tStyling.text }} className="font-bold">
                            {soul.type}
                          </span>
                          <span className="text-[#64748b]">·</span>
                          <span className="font-bold text-[#F2E6C9] truncate">
                            {soul.name}
                          </span>
                          <span className="text-[#E8B84A] font-bold">Nv. {soul.level}</span>
                        </div>

                        {/* Health gauge */}
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-[#090612] border border-[#8A6A3B]/60 rounded-xs overflow-hidden">
                            <div
                              className={`h-full ${hpPct > 50 ? 'bg-[#5FE3D2]' : hpPct > 20 ? 'bg-[#E8B84A]' : 'bg-[#C2234B]'}`}
                              style={{ width: `${hpPct}%` }}
                            />
                          </div>
                          <span className="text-[7px] text-[#F2E6C9] font-mono shrink-0">
                            {soul.hp}/{soul.maxHp}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isCurrent && <BrandBadge variant="ki">ACTIVA</BrandBadge>}
                        {isFainted && <BrandBadge variant="danger">CAÍDA</BrandBadge>}
                        {!isCurrent && !isFainted && <BrandBadge variant="gold">ENVIAR</BrandBadge>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {playerHp > 0 && (
                <BrandButton
                  variant="secondary"
                  onClick={() => setMode('main')}
                  disabled={isInputLocked}
                  className="w-full py-1 text-[8px] sm:text-[9px]"
                >
                  ← [VOLVER AL MENÚ DE COMBATE]
                </BrandButton>
              )}
            </div>
          )}

          {/* Navigation hints */}
          <div className="flex justify-between text-[7px] text-[#94a3b8]/70 px-1 pt-0.5">
            <span>[← / → / ↑ / ↓]: Navegar</span>
            <span>[ENTER / ESPACIO]: Elegir</span>
            {mode !== 'main' && playerHp > 0 && !isInputLocked && <span>[ESC]: Volver</span>}
          </div>

        </div>

      </div>

      {/* 6. STATUS EFFECTS DETAILS MODAL */}
      {showStatusModal && (
        <StatusEffectsModal
          playerSoul={activeSoul}
          playerStatuses={playerStatuses}
          rivalSoul={rivalSoul}
          rivalStatuses={rivalStatuses}
          initialTarget={statusModalInitialTarget}
          onClose={() => setShowStatusModal(false)}
        />
      )}

    </div>
  );
};
