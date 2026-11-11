/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ActiveStatusEffect, BattleSoul } from '../types';

interface StatusEffectsModalProps {
  playerSoul: BattleSoul;
  playerStatuses: ActiveStatusEffect[];
  rivalSoul: BattleSoul;
  rivalStatuses: ActiveStatusEffect[];
  initialTarget?: 'player' | 'rival';
  onClose: () => void;
}

export const StatusEffectsModal: React.FC<StatusEffectsModalProps> = ({
  playerSoul,
  playerStatuses,
  rivalSoul,
  rivalStatuses,
  initialTarget = 'player',
  onClose,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'player' | 'rival'>(initialTarget);

  const activeSoul = selectedTarget === 'player' ? playerSoul : rivalSoul;
  const activeStatuses = selectedTarget === 'player' ? playerStatuses : rivalStatuses;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs select-none animate-fade-in font-pixel">
      {/* Pixel Retro Grimoire Box */}
      <div className="relative w-full max-w-md bg-[#110c1f] border-2 border-[#b4862a] rounded-xs shadow-[0_0_35px_rgba(0,0,0,0.95)] p-4 sm:p-5 flex flex-col gap-3 text-left">
        {/* Runic Corner Highlights */}
        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f59e0b] border border-[#fef08a]" />
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#f59e0b] border border-[#fef08a]" />
        <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#f59e0b] border border-[#fef08a]" />
        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f59e0b] border border-[#fef08a]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#2b1f40] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📜</span>
            <div>
              <div className="text-[7px] text-[#fbbf24] uppercase tracking-widest font-bold">
                Alteraciones de Combate
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-[#fef08a] tracking-wider">
                EFECTOS DE ESTADO
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xs bg-[#1f1633] hover:bg-[#2b1f40] border border-[#8a6a3b] text-[#fef08a] flex items-center justify-center text-xs font-bold transition cursor-pointer"
            title="Cerrar ventana [ESC]"
          >
            ✕
          </button>
        </div>

        {/* Target Tabs (Player Soul vs Rival Soul) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#090611] rounded-xs border border-[#2b1f40]">
          <button
            onClick={() => setSelectedTarget('player')}
            className={`py-1.5 px-2 rounded-xs text-[8px] sm:text-[9px] font-bold tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
              selectedTarget === 'player'
                ? 'bg-[#2b1f40] text-[#fef08a] border border-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                : 'text-[#94a3b8] hover:text-[#fdf6e2] border border-transparent'
            }`}
          >
            <span>🛡️</span>
            <span className="truncate">{playerSoul.name}</span>
            {playerStatuses.length > 0 && (
              <span className="bg-[#ea580c] text-white text-[7px] px-1 py-0.2 rounded-full font-mono">
                {playerStatuses.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedTarget('rival')}
            className={`py-1.5 px-2 rounded-xs text-[8px] sm:text-[9px] font-bold tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
              selectedTarget === 'rival'
                ? 'bg-[#2b1f40] text-[#fef08a] border border-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                : 'text-[#94a3b8] hover:text-[#fdf6e2] border border-transparent'
            }`}
          >
            <span>⚔️</span>
            <span className="truncate">{rivalSoul.name}</span>
            {rivalStatuses.length > 0 && (
              <span className="bg-[#ea580c] text-white text-[7px] px-1 py-0.2 rounded-full font-mono">
                {rivalStatuses.length}
              </span>
            )}
          </button>
        </div>

        {/* Selected Soul Summary Card */}
        <div className="flex items-center justify-between p-2 rounded-xs bg-[#0e091c] border border-[#2b1f40] text-[8px] sm:text-[9px]">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔮</span>
            <div>
              <div className="font-bold text-[#fef08a]">{activeSoul.name}</div>
              <div className="text-[7px] text-[#94a3b8]">Elemento: <span className="text-[#38bdf8] font-bold">{activeSoul.type}</span> · Nv. {activeSoul.level}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[7px] text-[#94a3b8]">Estados Activos</div>
            <div className="font-bold text-[#fbbf24] tabular-nums">
              {activeStatuses.length} {activeStatuses.length === 1 ? 'efecto' : 'efectos'}
            </div>
          </div>
        </div>

        {/* Status Effects List */}
        <div className="flex flex-col gap-2 max-h-[46vh] overflow-y-auto pr-1">
          {activeStatuses.length === 0 ? (
            <div className="p-6 text-center rounded-xs bg-[#090611] border border-dashed border-[#2b1f40] space-y-1.5">
              <div className="text-2xl">✨</div>
              <div className="text-[9px] font-bold text-[#fef08a]">Alma Pura y Consagrada</div>
              <p className="text-[7px] sm:text-[8px] text-[#94a3b8] leading-relaxed max-w-xs mx-auto">
                No hay alteraciones de estado ni toxinas residuales actuando sobre {activeSoul.name}.
              </p>
            </div>
          ) : (
            activeStatuses.map((st, idx) => (
              <div
                key={`${st.type}-${idx}`}
                className="p-2.5 sm:p-3 rounded-xs border flex flex-col gap-1.5 relative overflow-hidden transition-all shadow-md animate-fade-in"
                style={{
                  backgroundColor: st.bgColor,
                  borderColor: st.borderColor,
                }}
              >
                {/* Header of Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{st.icon}</span>
                    <span className="font-bold text-xs tracking-wider" style={{ color: st.color }}>
                      {st.name.toUpperCase()}
                    </span>
                    <span
                      className="text-[7px] px-1 py-0.5 rounded-xs font-bold border"
                      style={{ color: st.color, borderColor: st.borderColor, backgroundColor: '#07050d' }}
                    >
                      {st.code}
                    </span>
                  </div>
                  <div className="text-[8px] font-bold text-[#fef08a] bg-[#07050d]/80 px-1.5 py-0.5 rounded-xs border border-[#2b1f40] tabular-nums">
                    ⏳ {st.turnsRemaining} {st.turnsRemaining === 1 ? 'turno' : 'turnos'}
                  </div>
                </div>

                {/* Effect Mechanics Description */}
                <div className="text-[8px] sm:text-[9px] text-[#fdf6e2] leading-tight font-medium">
                  {st.description}
                </div>

                {/* Lore / Flavor text */}
                <div className="text-[7px] text-[#cbd5e1]/80 italic border-t border-[#2b1f40]/50 pt-1">
                  "{st.flavor}"
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Lore & Cure Advice */}
        <div className="pt-2 border-t border-[#2b1f40] text-[7px] text-[#94a3b8] flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span>💡</span>
            <span>Usa Pociones en combate o descansa en Fuentes Sagradas.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#24173d] hover:bg-[#342257] border border-[#fbbf24] text-[#fef08a] text-[8px] font-bold rounded-xs cursor-pointer"
          >
            ENTENDIDO
          </button>
        </div>
      </div>
    </div>
  );
};
