/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { vfxEngine, FloatingText, Particle, ActiveVFX } from '../core/vfxEngine';

export const VFXOverlay: React.FC = () => {
  const [texts, setTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [vfxList, setVfxList] = useState<ActiveVFX[]>([]);
  const [screenFlash, setScreenFlash] = useState<string | null>(null);
  const [screenShake, setScreenShake] = useState(false);

  useEffect(() => {
    const unsubscribe = vfxEngine.subscribe(state => {
      setTexts(state.texts);
      setParticles(state.particles);
      setVfxList(state.vfxList);
      setScreenFlash(state.screenFlash);
      setScreenShake(state.screenShake);
    });
    return unsubscribe;
  }, []);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden z-50 ${
        screenShake ? 'animate-shake' : ''
      }`}
    >
      {/* 1. Fullscreen Flash Overlay */}
      {screenFlash && (
        <div
          className="absolute inset-0 transition-opacity duration-150 pointer-events-none"
          style={{ backgroundColor: screenFlash, opacity: 0.35 }}
        />
      )}

      {/* 2. Particle Effects */}
      {particles.map(p => {
        const progress = p.life / p.maxLife;
        return (
          <div
            key={p.id}
            className="absolute rounded-full shadow-lg"
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              opacity: p.alpha,
              transform: `scale(${progress * 1.2})`,
              boxShadow: `0 0 10px ${p.color}`,
            }}
          />
        );
      })}

      {/* 3. Skill & Power VFX Bursts */}
      {vfxList.map(v => {
        const progress = 1 - v.life / v.maxLife; // 0 to 1
        const scale = 0.5 + progress * 2.5;
        const opacity = Math.max(0, 1 - progress);

        return (
          <div
            key={v.id}
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              left: `${v.x}px`,
              top: `${v.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Outer expanding energy ring */}
            <div
              className="absolute rounded-full border-4"
              style={{
                width: '120px',
                height: '120px',
                borderColor: v.color,
                opacity,
                transform: `scale(${scale})`,
                boxShadow: `inset 0 0 25px ${v.color}, 0 0 35px ${v.color}`,
              }}
            />
            {/* Inner elemental core burst */}
            <div
              className="absolute rounded-full animate-pulse"
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: v.color,
                opacity: opacity * 0.8,
                transform: `scale(${scale * 0.7})`,
                filter: 'blur(8px)',
              }}
            />
          </div>
        );
      })}

      {/* 4. Floating Damage / Heal / Status Numbers */}
      {texts.map(t => {
        const progress = t.life / t.maxLife; // 1 down to 0
        return (
          <div
            key={t.id}
            className={`absolute font-black tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
              t.fontSize || 'text-2xl'
            }`}
            style={{
              left: `${t.x}%`,
              top: `${t.y}px`,
              color: t.color,
              opacity: progress,
              transform: `translate(-50%, -50%) scale(${1 + (1 - progress) * 0.3})`,
            }}
          >
            {t.text}
          </div>
        );
      })}
    </div>
  );
};
