/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WorldRegion } from '../data/regions';

interface RegionBannerProps {
  region: WorldRegion | null;
  visible: boolean;
}

export const RegionBanner: React.FC<RegionBannerProps> = ({ region, visible }) => {
  if (!region || !visible) return null;

  return (
    <div className="fixed top-26 sm:top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[90vw] max-w-sm sm:w-auto transition-all duration-700 ease-out animate-in fade-in slide-in-from-top-4">
      <div
        className="relative px-4 sm:px-6 py-2 sm:py-2.5 rounded-xs border shadow-2xl flex flex-col items-center"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 14, 34, 0.96) 0%, rgba(10, 7, 18, 0.98) 100%)',
          borderColor: region.color,
          boxShadow: `0 0 25px ${region.color}40, inset 0 0 15px ${region.color}20`,
        }}
      >
        {/* Decorative corner runes */}
        <div
          className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2"
          style={{ borderColor: region.color }}
        />
        <div
          className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2"
          style={{ borderColor: region.color }}
        />
        <div
          className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2"
          style={{ borderColor: region.color }}
        />
        <div
          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2"
          style={{ borderColor: region.color }}
        />

        {/* Region Subtitle / Category */}
        <div
          className="text-[7px] sm:text-[9px] uppercase tracking-[0.18em] sm:tracking-[0.25em] font-pixel mb-1 flex items-center gap-1.5 text-center"
          style={{ color: region.color }}
        >
          <span>✦</span>
          <span className="truncate max-w-[70vw] sm:max-w-none">{region.subtitle}</span>
          <span>✦</span>
        </div>

        {/* Region Main Name */}
        <div className="text-xs sm:text-base md:text-lg font-pixel font-bold text-[#fef9c3] tracking-wide text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {region.name}
        </div>

        {/* Recommended Level & Native Souls */}
        <div className="mt-1.5 flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 text-[7px] sm:text-[8px] font-pixel text-[#cbd5e1]">
          <span className="px-1.5 py-0.5 rounded-xs bg-[#1e1633] border border-[#3b2a5c]">
            {region.recommendedLevel}
          </span>
          {region.nativeSoulTypes.length > 0 && (
            <div className="flex flex-wrap justify-center items-center gap-1">
              <span className="text-[#94a3b8] hidden sm:inline">Almas:</span>
              <div className="flex flex-wrap justify-center gap-1">
                {region.nativeSoulTypes.map((t) => (
                  <span
                    key={t}
                    className="px-1 py-0.5 rounded-xs bg-[#241a3e] border border-[#4c3575] text-[#fef08a]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
