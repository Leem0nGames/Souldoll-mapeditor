import React, { useEffect, useRef, useMemo } from 'react';
import { GrassPatch } from '../types';
import { getRegionAt } from '../data/regions';

interface MinimapProps {
  playerPos: { x: number; z: number; rotation: number };
  lakeCenter: { x: number; z: number };
  grassPatches: GrassPatch[];
  discoveredGrassIndexes?: number[];
  villages?: { name: string; x: number; z: number }[];
  fountains?: { x: number; z: number }[];
  npcs?: { x: number; z: number }[];
  questLocations?: { x: number; z: number }[];
  onOpenWorldMap?: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerPos,
  lakeCenter,
  grassPatches,
  discoveredGrassIndexes = [],
  villages = [],
  fountains = [],
  npcs = [],
  questLocations = [],
  onOpenWorldMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 110;
    canvas.width = size;
    canvas.height = size;
    ctx.imageSmoothingEnabled = false;

    const radius = size / 2;
    const centerX = radius;
    const centerY = radius;

    const zoom = 0.48;

    const toMapX = (wx: number) => centerX + (wx - playerPos.x) * zoom;
    const toMapY = (wz: number) => centerY + (wz - playerPos.z) * zoom;

    ctx.clearRect(0, 0, size, size);

    // Save clip for circular minimap
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 4, 0, Math.PI * 2);
    ctx.clip();

    // 1. Terrain background
    ctx.fillStyle = '#14101C';
    ctx.fillRect(0, 0, size, size);

    // Grid lines
    ctx.strokeStyle = '#2A1F2D';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < size; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y < size; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // 2. Lake
    const lakeMapX = toMapX(lakeCenter.x);
    const lakeMapY = toMapY(lakeCenter.z);
    const lakeRadius = 26 * zoom;

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(lakeMapX, lakeMapY, lakeRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Grass Patches
    grassPatches.forEach((patch, idx) => {
        const distToPlayer = Math.hypot(patch.x - playerPos.x, patch.z - playerPos.z);
        if (discoveredGrassIndexes.includes(idx) || distToPlayer < 75) {
            const gx = toMapX(patch.x);
            const gy = toMapY(patch.z);
            const gr = Math.max(2, patch.radius * zoom);
            ctx.fillStyle = '#059669';
            ctx.beginPath();
            ctx.arc(gx, gy, gr, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 4. Village Markers
    villages.forEach(v => {
      ctx.fillStyle = '#E8B84A';
      ctx.fillRect(toMapX(v.x) - 2.5, toMapY(v.z) - 2.5, 5, 5);
    });

    // 5. Healing Fountains
    fountains.forEach(f => {
      ctx.fillStyle = '#5FE3D2';
      ctx.beginPath();
      ctx.arc(toMapX(f.x), toMapY(f.z), 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. NPC Markers (Green diamonds)
    npcs.forEach(n => {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(toMapX(n.x), toMapY(n.z) - 3);
        ctx.lineTo(toMapX(n.x) + 3, toMapY(n.z));
        ctx.lineTo(toMapX(n.x), toMapY(n.z) + 3);
        ctx.lineTo(toMapX(n.x) - 3, toMapY(n.z));
        ctx.closePath();
        ctx.fill();
    });

    // 7. Quest Location Markers (Pulsing Red)
    questLocations.forEach(q => {
        const time = Date.now() / 500;
        const pulse = Math.abs(Math.sin(time)) * 2;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(toMapX(q.x), toMapY(q.z), 3 + pulse, 0, Math.PI * 2);
        ctx.fill();
    });

    // 8. Player Indicator
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-playerPos.rotation + Math.PI);
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#5FE3D2';
    ctx.fillStyle = '#5FE3D2';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 9. Scanlines
    ctx.globalCompositeOperation = 'overlay';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < size; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // 10. Frame
    ctx.strokeStyle = '#B4862A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = '#F2E6C9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#F2E6C9';
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('N', centerX, 3);
  }, [playerPos, lakeCenter, grassPatches, discoveredGrassIndexes, villages, fountains, npcs, questLocations]);

  const currentRegion = useMemo(() => getRegionAt(playerPos.x, playerPos.z), [playerPos.x, playerPos.z]);

  return (
    <div className="relative pointer-events-auto select-none flex flex-col items-end">
      <button
        type="button"
        onClick={onOpenWorldMap}
        className="group relative p-0.5 rounded-full border border-[#4a3a6a] hover:border-[#b4862a] active:scale-95 shadow-[0_0_12px_rgba(180,134,42,0.2)] bg-[#100b1b] cursor-pointer transition touch-manipulation"
        aria-label="Abrir Mapa del Mundo"
      >
        <canvas ref={canvasRef} className="w-[74px] h-[74px] sm:w-[104px] sm:h-[104px] block rounded-full" />
        <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#191224] border border-[#b4862a] flex items-center justify-center text-[10px] shadow-md">
          🗺️
        </span>
      </button>

      {/* Location & Region Badge */}
      <button
        type="button"
        onClick={onOpenWorldMap}
        className="mt-1 min-h-[28px] px-2 py-1 bg-[#0e091c]/95 border border-[#2b1f40] active:border-[#b4862a] rounded-xs text-[6.5px] sm:text-[7px] font-pixel text-[#cbd5e1] shadow-sm flex items-center gap-1.5 cursor-pointer transition max-w-[128px] sm:max-w-[150px] truncate touch-manipulation"
        aria-label="Ver región en el Atlas"
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: currentRegion.color }} />
        <span className="truncate text-[#fdf6e2]">{currentRegion.name}</span>
      </button>
    </div>
  );
};



