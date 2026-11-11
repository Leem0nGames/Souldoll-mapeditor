import React, { useState, useEffect } from 'react';
import { SaveManager } from '../save/saveManager';
import { audioManager } from '../audio/audioManager';

interface SlotSelectionModalProps {
  onSelectSlot: (slot: number) => void;
}

export const SlotSelectionModal: React.FC<SlotSelectionModalProps> = ({ onSelectSlot }) => {
  const [slots, setSlots] = useState<any[]>([]);

  const refreshSlots = () => {
    setSlots([0, 1, 2].map(slot => ({
      index: slot,
      data: SaveManager.loadFromSlot(slot)
    })));
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  return (
    <div className="w-full max-w-md bg-[#0e091c] border-3 border-[#b4862a] shadow-[0_0_50px_rgba(0,0,0,0.95)] rounded-xs p-5 font-pixel text-[#fdf6e2] relative select-none">
      {/* Runic Corners */}
      <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#c59b27] border border-[#fef08a]" />

      <div className="text-center mb-5 border-b border-[#2b1f40] pb-3">
        <div className="text-[9px] text-[#fbbf24] tracking-widest uppercase mb-1">✦ CRÓNICAS DE LUMINATI ✦</div>
        <h2 className="text-base sm:text-lg font-bold text-[#fef3c7] tracking-wider uppercase">Seleccionar Ranura de Partida</h2>
      </div>

      <div className="space-y-3.5">
        {slots.map(({ index, data }) => (
          <div key={index} className="relative group">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  audioManager.playMenuBeep();
                  onSelectSlot(index);
                }}
                className={`flex-1 p-3 text-left border rounded-xs transition-all cursor-pointer flex items-center justify-between ${
                  data 
                    ? 'border-[#b4862a] bg-[#24173d] hover:bg-[#2d1d4d] shadow-[0_0_10px_rgba(180,134,42,0.3)]' 
                    : 'border-[#2b1f40] bg-[#140e26] hover:bg-[#1a1230]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#fef3c7] text-xs">Ranura {index + 1}</span>
                    {data && (
                      <span className="text-[8px] text-[#fbbf24] font-bold">
                        ★ Nivel {data.team?.[0]?.level || 1}
                      </span>
                    )}
                  </div>
                  <div className="text-[8px] text-[#94a3b8]">
                    {data 
                      ? `Guardado: ${new Date(data.timestamp).toLocaleDateString()}` 
                      : 'Ranura Vacía · Nueva Partida'}
                  </div>
                </div>

                <div className="text-xs text-[#38bdf8] font-bold">
                  {data ? '▶ CARGAR' : '✦ INICIAR'}
                </div>
              </button>

              {data && (
                <div className="flex flex-col gap-1">
                  <button
                    title="Exportar archivo de guardado"
                    onClick={() => {
                      audioManager.playMenuBeep();
                      const json = SaveManager.exportSave(index);
                      if (json) {
                        const blob = new Blob([json], {type: 'application/json'});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `souldolls_slot_${index + 1}.json`;
                        a.click();
                      }
                    }}
                    className="p-2 bg-[#1e3a2f] hover:bg-[#14472d] border border-[#4ade80] text-[#86efac] text-[9px] rounded-xs cursor-pointer transition active:scale-95"
                  >
                    ⬆
                  </button>
                  <button
                    title="Borrar partida"
                    onClick={() => {
                      audioManager.playMenuBeep();
                      if(confirm('¿Borrar esta partida permanentemente?')) {
                        SaveManager.deleteSlot(index);
                        refreshSlots();
                      }
                    }}
                    className="p-2 bg-[#4c0519] hover:bg-[#680721] border border-[#f87171] text-[#fca5a5] text-[9px] rounded-xs cursor-pointer transition active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {!data && (
               <button
                  onClick={() => {
                    audioManager.playMenuBeep();
                    const json = prompt('Pega el código JSON de tu partida:');
                    if (json) {
                      try {
                        SaveManager.importSave(index, json);
                        refreshSlots();
                      } catch (e: any) {
                        alert(`Error al importar: ${e.message}`);
                      }
                    }
                  }}
                  className="mt-1 text-[7px] text-[#94a3b8] hover:text-[#fef3c7] underline block w-full text-center cursor-pointer"
               >
                 Importar desde archivo JSON
               </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
