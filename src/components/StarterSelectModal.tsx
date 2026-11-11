import React, { useState } from 'react';
import { BattleSoul } from '../types';
import { getStarterSouls, TYPE_COLORS } from '../data/mobs';
import { audioManager } from '../audio/audioManager';

interface StarterSelectModalProps {
  onSelect: (soul: BattleSoul) => void;
}

const ELEMENTAL_SIGILS: Record<string, string> = {
  Fuego: '🔥',
  Agua: '🌊',
  Planta: '🌿',
  Rayo: '⚡',
  Sombra: '🔮',
  Luz: '✨',
};

export const StarterSelectModal: React.FC<StarterSelectModalProps> = ({ onSelect }) => {
  const starters = getStarterSouls();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const current = starters[selectedIndex];
  const typeStyling = TYPE_COLORS[current.type];

  const handleSelect = (idx: number) => {
    audioManager.playMenuBeep();
    setSelectedIndex(idx);
  };

  const handleConfirm = () => {
    audioManager.playCollectSoul();
    onSelect(current);
  };

  return (
    <div className="fixed inset-0 pointer-events-auto bg-[#07050d]/92 backdrop-blur-md flex items-center justify-center p-3 z-50 font-pixel text-[#fdf6e2] select-none">
      <div className="relative w-full max-w-[440px] bg-[#0e091c] border-3 border-[#b4862a] p-4 sm:p-5 space-y-3.5 shadow-[0_0_60px_rgba(0,0,0,0.95)] rounded-xs flex flex-col justify-between max-h-[95dvh] overflow-y-auto">
        
        {/* Runic Corners */}
        <div className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-[#c59b27] border border-[#fef08a]" />
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#c59b27] border border-[#fef08a]" />
        <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-[#c59b27] border border-[#fef08a]" />
        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#c59b27] border border-[#fef08a]" />

        {/* Title */}
        <div className="text-center space-y-1 border-b border-[#2b1f40] pb-2.5">
          <div className="text-[8px] text-[#fbbf24] tracking-widest uppercase">✦ INVOCACIÓN INICIAL ✦</div>
          <h2 className="text-xs sm:text-sm text-[#fef3c7] tracking-wider font-bold uppercase">
            Elige tu SoulDoll Primordial
          </h2>
        </div>

        {/* 3 Starter Tabs (Zero-Pill Runic Design) */}
        <div className="grid grid-cols-3 gap-2">
          {starters.map((starter, idx) => {
            const isSel = selectedIndex === idx;
            const sTypeColor = TYPE_COLORS[starter.type];
            return (
              <button
                key={starter.name}
                onClick={() => handleSelect(idx)}
                className={`p-2 rounded-xs border transition-all cursor-pointer text-center ${
                  isSel
                    ? 'border-[#b4862a] bg-[#24173d] scale-[1.03] shadow-[0_0_12px_rgba(180,134,42,0.5)]'
                    : 'border-[#2b1f40] bg-[#140e26] hover:bg-[#1a1230]'
                }`}
              >
                <div className="text-[9px] font-bold text-[#fef3c7] truncate">{starter.name}</div>
                <div
                  className="mt-1 text-[8px] font-bold uppercase"
                  style={{ color: sTypeColor.text }}
                >
                  {ELEMENTAL_SIGILS[starter.type] || '✦'} {starter.type}
                </div>
              </button>
            );
          })}
        </div>

        {/* Preview & Stats Card */}
        <div className="bg-[#140e26] border border-[#2b1f40] p-3 rounded-xs flex items-center gap-4">
          
          {/* Sprite Preview with Magic Circle */}
          <div className="relative w-28 h-36 flex flex-col items-center justify-center bg-[#0a0614] border border-[#2b1f40] rounded-xs shadow-inner overflow-hidden p-1">
            <div
              className="absolute bottom-2 w-20 h-6 rounded-full border border-dashed animate-pulse-glow pointer-events-none"
              style={{
                borderColor: typeStyling.border,
                backgroundColor: `${typeStyling.border}22`,
                boxShadow: `0 0 10px ${typeStyling.border}`,
                transform: 'rotateX(60deg)',
              }}
            />
            <canvas
              ref={(canvas) => {
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                const img = new Image();
                img.src = current.spritesheet;
                img.onload = () => {
                  const fw = current.frameFront.w || 400;
                  const fh = current.frameFront.h || 800;
                  canvas.width = fw;
                  canvas.height = fh;
                  ctx.imageSmoothingEnabled = false;
                  ctx.clearRect(0, 0, fw, fh);
                  ctx.drawImage(img, current.frameFront.x, current.frameFront.y, fw, fh, 0, 0, fw, fh);
                };
              }}
              className="relative z-10 max-h-28 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
              style={{
                imageRendering: 'pixelated',
                aspectRatio: `${(current.frameFront.w || 400) / (current.frameFront.h || 800)}`,
              }}
            />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-1.5 text-[8px] text-[#cbd5e1]">
            <div className="flex items-center justify-between border-b border-[#2b1f40] pb-1">
              <span className="text-[10px] font-bold text-[#fbbf24]">{current.name}</span>
              <span className="text-[#fbbf24] font-bold">Nv. {current.level}</span>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between"><span>HP Base:</span><span className="text-white font-bold">{current.maxHp}</span></div>
              <div className="flex justify-between"><span>Ataque:</span><span className="text-white font-bold">{current.attack}</span></div>
              <div className="flex justify-between"><span>Defensa:</span><span className="text-white font-bold">{current.defense}</span></div>
              <div className="flex justify-between"><span>Velocidad:</span><span className="text-white font-bold">{current.speed}</span></div>
            </div>

            <div className="pt-1 border-t border-[#2b1f40]">
              <span className="text-[7px] text-[#94a3b8] block mb-0.5">Habilidades Iniciales:</span>
              <div className="space-y-0.5">
                {current.moves.map(m => (
                  <div key={m.id} className="flex justify-between text-[7px] text-[#fef3c7]">
                    <span>• {m.name}</span>
                    <span className="text-[#38bdf8]">PP {m.maxPp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-2.5 bg-[#24173d] hover:bg-[#342257] border-2 border-[#fbbf24] text-[#fef08a] font-bold text-[9px] tracking-wider rounded-xs shadow-[0_0_16px_rgba(251,191,36,0.35)] cursor-pointer transition-all active:scale-95"
        >
          ✦ CONFIRMAR E INICIAR AVENTURA ✦
        </button>

      </div>
    </div>
  );
};
