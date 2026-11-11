import React, { useState, useEffect, useRef } from 'react';
import { LUMINADEX_ENTRIES, TYPE_COLORS, LuminadexEntry } from '../data/mobs';
import { audioManager } from '../audio/audioManager';
import { SoulType } from '../types';

const ELEMENTAL_SIGILS: Record<SoulType, string> = {
  Fuego: '🔥',
  Agua: '🌊',
  Planta: '🌿',
  Rayo: '⚡',
  Sombra: '🔮',
  Luz: '✨',
};

interface LuminadexModalProps {
  discovered: Record<string, 'seen' | 'captured'>;
  onClose: () => void;
}

export const LuminadexModal: React.FC<LuminadexModalProps> = ({ discovered, onClose }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectedEntry: LuminadexEntry = LUMINADEX_ENTRIES[selectedIdx];
  const status = discovered[selectedEntry.name.toUpperCase()] || 'none';
  const isSeen = status === 'seen' || status === 'captured';
  const isCaptured = status === 'captured';

  // Counts
  const totalEntries = LUMINADEX_ENTRIES.length;
  const seenCount = LUMINADEX_ENTRIES.filter(e => discovered[e.name.toUpperCase()] === 'seen' || discovered[e.name.toUpperCase()] === 'captured').length;
  const capturedCount = LUMINADEX_ENTRIES.filter(e => discovered[e.name.toUpperCase()] === 'captured').length;

  // Keyboard navigation: ArrowUp/Down to navigate, Escape/J to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        audioManager.playMenuBeep();
        setSelectedIdx(prev => (prev > 0 ? prev - 1 : totalEntries - 1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        audioManager.playMenuBeep();
        setSelectedIdx(prev => (prev < totalEntries - 1 ? prev + 1 : 0));
      } else if (e.code === 'Escape' || e.code === 'KeyJ') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalEntries, onClose]);

  // Render sprite preview in canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isSeen) {
      // Draw mysterious silhouette
      ctx.fillStyle = '#2A1F2D';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#8A6A3B';
      ctx.font = '24px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', canvas.width / 2, canvas.height / 2);
      return;
    }

    const img = new Image();
    img.src = selectedEntry.spritesheet;
    img.onload = () => {
      const fw = selectedEntry.frameFront.w || 400;
      const fh = selectedEntry.frameFront.h || 800;
      canvas.width = fw;
      canvas.height = fh;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, fw, fh);

      if (!isCaptured) {
        // Draw silhouette if only seen
        ctx.drawImage(
          img,
          selectedEntry.frameFront.x,
          selectedEntry.frameFront.y,
          fw,
          fh,
          0,
          0,
          fw,
          fh
        );
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#5FE3D266';
        ctx.fillRect(0, 0, fw, fh);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        // Full color sprite
        ctx.drawImage(
          img,
          selectedEntry.frameFront.x,
          selectedEntry.frameFront.y,
          fw,
          fh,
          0,
          0,
          fw,
          fh
        );
      }
    };
  }, [selectedEntry, isSeen, isCaptured]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 pt-safe pb-safe bg-[#07050d]/95 select-none font-pixel">
      <div className="relative w-full max-w-3xl bg-[#0e091c] border-2 border-[#b4862a] shadow-[0_0_50px_rgba(0,0,0,0.95)] rounded-xs p-3 sm:p-5 md:p-6 text-[#fdf6e2] flex flex-col max-h-[95dvh] overflow-hidden">
        {/* Runic Corners */}
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />

        {/* HEADER BAR */}
        <div className="flex items-center justify-between gap-2 border-b border-[#2b1f40] pb-2 sm:pb-3 mb-2.5 sm:mb-4 shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs md:text-sm font-bold text-[#fbbf24] tracking-wider flex items-center gap-1.5 truncate">
              <span>✦</span>
              <span className="truncate">LUMINADEX · REGISTRO</span>
            </div>
            <div className="text-[8px] sm:text-[9px] text-[#38bdf8] mt-0.5 sm:mt-1 tracking-tight">
              Vistas: {seenCount}/{totalEntries} · Capturadas: {capturedCount}/{totalEntries}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              audioManager.playMenuBeep();
              onClose();
            }}
            className="min-h-[36px] px-3 py-1.5 bg-[#1e1533] hover:bg-[#2b1f40] active:scale-95 border border-[#b4862a] text-[9px] text-[#fef3c7] cursor-pointer transition rounded-xs shrink-0 touch-manipulation"
          >
            ✕ CERRAR
          </button>
        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 overflow-y-auto flex-1 pr-1">
          {/* LEFT LIST: Soul Index List (5 columns, scrollable on mobile) */}
          <div className="md:col-span-5 flex flex-col gap-1.5 max-h-[160px] md:max-h-none overflow-y-auto pr-1">
            {LUMINADEX_ENTRIES.map((entry, idx) => {
              const entryStatus = discovered[entry.name.toUpperCase()] || 'none';
              const entrySeen = entryStatus === 'seen' || entryStatus === 'captured';
              const entryCaptured = entryStatus === 'captured';
              const isSelected = idx === selectedIdx;

              return (
                <button
                  type="button"
                  key={entry.num}
                  onClick={() => {
                    audioManager.playMenuBeep();
                    setSelectedIdx(idx);
                  }}
                  className={`min-h-[38px] p-2.5 border cursor-pointer transition-all flex items-center justify-between text-[9px] rounded-xs text-left touch-manipulation ${
                    isSelected
                      ? 'border-[#b4862a] bg-[#24173d] text-[#fef3c7] shadow-[0_0_10px_rgba(180,134,42,0.4)]'
                      : 'border-[#2b1f40] bg-[#140e26] hover:border-[#b4862a]/60 text-[#cbd5e1]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#94a3b8] text-[8px]">{entry.num}</span>
                    <span className="font-bold tracking-wide">
                      {entrySeen ? entry.name : '?????????'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px]">
                    {entryCaptured ? (
                      <span className="text-[#fbbf24] font-bold" title="Capturada">
                        ★
                      </span>
                    ) : entrySeen ? (
                      <span className="text-[#38bdf8]" title="Vista">
                        👁
                      </span>
                    ) : (
                      <span className="text-[#64748b]">?</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* RIGHT PANEL: Selected Soul Details (7 columns) */}
          <div className="md:col-span-7 bg-[#140e26] border border-[#2b1f40] p-3.5 sm:p-4 rounded-xs flex flex-col justify-between">
            {/* Top row: Number, Name, Type */}
            <div className="flex items-start justify-between border-b border-[#2b1f40] pb-2.5">
              <div>
                <div className="text-[8px] text-[#94a3b8]">{selectedEntry.num}</div>
                <div className="text-xs sm:text-sm font-bold text-[#fef3c7] tracking-wider mt-0.5">
                  {isSeen ? selectedEntry.name : 'DESCONOCIDA'}
                </div>
                <div className="text-[8px] text-[#38bdf8] italic mt-0.5">
                  {isSeen ? `"${selectedEntry.title}"` : 'Sin registros de avistamiento'}
                </div>
              </div>

              {isSeen && (
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="text-[8px] font-bold uppercase tracking-wider"
                    style={{ color: TYPE_COLORS[selectedEntry.type].text }}
                  >
                    {ELEMENTAL_SIGILS[selectedEntry.type] || '✦'} {selectedEntry.type}
                  </span>
                  <span className="text-[7px] text-[#fbbf24] font-bold">
                    {isCaptured ? '★ REGISTRADA' : '👁 AVISTADA'}
                  </span>
                </div>
              )}
            </div>

            {/* Middle: Canvas sprite + Stats */}
            <div className="py-4 flex flex-col md:flex-row items-center gap-4">
              <div className="w-28 h-36 bg-[#14101C] border border-[#8A6A3B] flex items-center justify-center p-2 relative shadow-inner rounded-xs overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="max-h-32 object-contain"
                  style={{
                    imageRendering: 'pixelated',
                    aspectRatio: `${(selectedEntry.frameFront.w || 400) / (selectedEntry.frameFront.h || 800)}`,
                  }}
                />
                {!isCaptured && isSeen && (
                  <span className="absolute bottom-1 right-1 text-[7px] text-[#5FE3D2] bg-[#14101C]/90 px-1 border border-[#5FE3D2]/40">
                    SILUETA
                  </span>
                )}
              </div>

              {/* Stats column */}
              <div className="flex-1 w-full space-y-2 text-[8px] sm:text-[9px]">
                <div>
                  <div className="flex justify-between text-[#cbd5e1] mb-0.5">
                    <span>HP BASE</span>
                    <span className="font-bold text-[#fef3c7]">{isCaptured ? selectedEntry.baseHp : '??'}</span>
                  </div>
                  <div className="w-full bg-[#07050d] h-1.5 rounded-xs overflow-hidden border border-[#2b1f40]">
                    <div
                      className="bg-[#22c55e] h-full transition-all duration-300"
                      style={{ width: isCaptured ? `${(selectedEntry.baseHp / 50) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#cbd5e1] mb-0.5">
                    <span>ATAQUE</span>
                    <span className="font-bold text-[#fef3c7]">{isCaptured ? selectedEntry.baseAtk : '??'}</span>
                  </div>
                  <div className="w-full bg-[#07050d] h-1.5 rounded-xs overflow-hidden border border-[#2b1f40]">
                    <div
                      className="bg-[#ef4444] h-full transition-all duration-300"
                      style={{ width: isCaptured ? `${(selectedEntry.baseAtk / 30) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#cbd5e1] mb-0.5">
                    <span>DEFENSA</span>
                    <span className="font-bold text-[#fef3c7]">{isCaptured ? selectedEntry.baseDef : '??'}</span>
                  </div>
                  <div className="w-full bg-[#07050d] h-1.5 rounded-xs overflow-hidden border border-[#2b1f40]">
                    <div
                      className="bg-[#3b82f6] h-full transition-all duration-300"
                      style={{ width: isCaptured ? `${(selectedEntry.baseDef / 30) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#cbd5e1] mb-0.5">
                    <span>VELOCIDAD</span>
                    <span className="font-bold text-[#fef3c7]">{isCaptured ? selectedEntry.baseSpd : '??'}</span>
                  </div>
                  <div className="w-full bg-[#07050d] h-1.5 rounded-xs overflow-hidden border border-[#2b1f40]">
                    <div
                      className="bg-[#eab308] h-full transition-all duration-300"
                      style={{ width: isCaptured ? `${(selectedEntry.baseSpd / 30) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Lore description */}
            <div className="border-t border-[#2b1f40] pt-2.5">
              <div className="text-[7px] text-[#94a3b8] font-bold uppercase mb-1">REGISTRO MÍSTICO:</div>
              <p className="text-[8px] sm:text-[9px] leading-relaxed text-[#cbd5e1] min-h-[36px]">
                {isCaptured
                  ? selectedEntry.lore
                  : isSeen
                  ? 'Has avistado esta alma en el bosque o mazmorra, pero aún debes capturarla para descifrar su naturaleza completa.'
                  : 'Alma desconocida. Explora los claros de hierba alta y las ruinas para encontrarla.'}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER CONTROLS HINT */}
        <div className="mt-2.5 pt-2 border-t border-[#2b1f40] flex items-center justify-between text-[7px] text-[#94a3b8] shrink-0">
          <span className="sm:hidden">TOCA UNA ENTRADA PARA VER DETALLES</span>
          <span className="hidden sm:inline">[↑ / ↓]: NAVEGAR LISTA</span>
          <span className="hidden sm:inline">[J / ESC]: CERRAR REGISTRO</span>
        </div>
      </div>
    </div>
  );
};
