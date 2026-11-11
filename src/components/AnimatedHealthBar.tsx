/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';

interface AnimatedHealthBarProps {
  current: number;
  max: number;
  showNumbers?: boolean;
  className?: string;
}

export const AnimatedHealthBar: React.FC<AnimatedHealthBarProps> = ({
  current,
  max,
  showNumbers = false,
  className = '',
}) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  
  // Ghost bar lags behind to show damage dealt
  const [lagPct, setLagPct] = useState(pct);
  const [isDamaged, setIsDamaged] = useState(false);
  const prevCurrentRef = useRef(current);

  useEffect(() => {
    if (current < prevCurrentRef.current) {
      // Took damage: immediately drop main bar, flash damaged, lag trailing bar
      setIsDamaged(true);
      const timer = setTimeout(() => {
        setLagPct(pct);
        setIsDamaged(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Healed: move lag bar immediately and main bar catches up
      setLagPct(pct);
      setIsDamaged(false);
    }
    prevCurrentRef.current = current;
  }, [current, pct]);

  // Color selection based on current percentage
  let barColor = '#22c55e'; // Green
  let barGlow = 'rgba(34, 197, 94, 0.45)';
  let gradient = 'linear-gradient(180deg, #4ade80 0%, #16a34a 100%)';
  
  if (pct <= 20) {
    barColor = '#ef4444'; // Red
    barGlow = 'rgba(239, 68, 68, 0.7)';
    gradient = 'linear-gradient(180deg, #f87171 0%, #dc2626 100%)';
  } else if (pct <= 50) {
    barColor = '#eab308'; // Yellow
    barGlow = 'rgba(234, 179, 8, 0.6)';
    gradient = 'linear-gradient(180deg, #fde047 0%, #ca8a04 100%)';
  }

  const isCritical = pct <= 20 && current > 0;

  return (
    <div className={`w-full flex flex-col gap-0.5 ${className}`}>
      {showNumbers && (
        <div className="flex justify-between items-center text-[8px] sm:text-[9px] tabular-nums font-bold">
          <span className="text-[#94a3b8] uppercase tracking-wider text-[7px]">HP</span>
          <span className={isCritical ? 'text-[#f87171] animate-pulse' : 'text-[#fdf6e2]'}>
            {Math.max(0, current)} / {max}
          </span>
        </div>
      )}

      {/* Main Bar Track */}
      <div className={`relative w-full bg-[#07050d] border border-[#2b1f40] h-2.5 sm:h-3 rounded-xs p-[1px] overflow-hidden flex items-center shadow-inner ${
        isCritical ? 'border-[#ef4444]/70 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse' : ''
      }`}>
        {/* Ghost trailing lag bar */}
        <div
          className="absolute top-[1px] bottom-[1px] left-[1px] rounded-xs transition-all duration-700 ease-out bg-[#f59e0b]/75"
          style={{ width: `calc(${lagPct}% - 2px)` }}
        />

        {/* Primary animated HP bar */}
        <div
          className={`relative h-full rounded-xs transition-all duration-300 ease-out flex items-center overflow-hidden ${
            isDamaged ? 'brightness-125' : ''
          }`}
          style={{
            width: `${pct}%`,
            background: gradient,
            boxShadow: `0 0 6px ${barGlow}`,
          }}
        >
          {/* Animated diagonal shine sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
        </div>

        {/* Grid tick marks for retro tactile feel */}
        <div className="absolute inset-0 pointer-events-none flex justify-between px-1 opacity-25">
          <div className="w-[1px] h-full bg-black/80" />
          <div className="w-[1px] h-full bg-black/80" />
          <div className="w-[1px] h-full bg-black/80" />
        </div>
      </div>
    </div>
  );
};
