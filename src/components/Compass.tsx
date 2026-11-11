import React, { useMemo } from 'react';

interface CompassMarker {
  id: string;
  type: 'npc' | 'fountain' | 'quest' | 'village' | 'waypoint';
  x: number;
  z: number;
}

interface CompassProps {
  playerPos: { x: number; z: number; rotation: number };
  markers: CompassMarker[];
}

export const Compass: React.FC<CompassProps> = ({ playerPos, markers }) => {
  const compassRange = 120; // World units distance to show markers

  const markerData = useMemo(() => {
    // Player rotation: 0 = North, PI/2 = East, PI = South, 3PI/2 = West
    // Adjust to get relative angle to markers
    return markers.map(marker => {
      const dx = marker.x - playerPos.x;
      const dz = marker.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      
      // Angle of target relative to player
      const angleToTarget = Math.atan2(dx, dz); // Using dx, dz for consistent world space
      let relativeAngle = angleToTarget - playerPos.rotation;
      
      // Normalize angle to -PI to PI
      if (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
      if (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

      return {
        ...marker,
        relativeAngle,
        isVisible: dist < compassRange
      };
    }).filter(m => m.isVisible);
  }, [playerPos, markers]);

  return (
    <div className="relative w-full max-w-sm h-10 bg-[#0e091c]/80 border-b-2 border-[#b4862a]/60 backdrop-blur-sm overflow-hidden flex items-center justify-center pointer-events-none">
      {/* Center Marker */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-[#fbbf24] z-10 shadow-[0_0_8px_#fbbf24]" />
      
      {/* Cardinal Labels */}
      {['N', 'E', 'S', 'W'].map((dir, i) => {
        const dirAngle = (i * Math.PI) / 2;
        let relativeAngle = dirAngle - playerPos.rotation;
        if (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
        if (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

        const screenX = (relativeAngle / (Math.PI / 2)) * 50;
        
        if (Math.abs(screenX) > 55) return null;

        return (
          <div
            key={dir}
            className="absolute text-[10px] font-bold text-[#fdf6e2]"
            style={{ left: `calc(50% + ${screenX}%)` }}
          >
            {dir}
          </div>
        );
      })}

      {/* Markers */}
      {markerData.map(m => {
        const screenX = (m.relativeAngle / (Math.PI / 2)) * 50;
        
        if (Math.abs(screenX) > 55) return null; // Outside of visual range

        return (
          <div
            key={m.id}
            className="absolute flex flex-col items-center justify-center transition-all duration-200"
            style={{ left: `calc(50% + ${screenX}%)` }}
          >
            {m.type === 'npc' && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />}
            {m.type === 'fountain' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_#38bdf8]" />}
            {m.type === 'quest' && <div className="w-2.5 h-2.5 rotate-45 bg-red-500 shadow-[0_0_6px_#ef4444]" />}
            {m.type === 'village' && <div className="w-2.5 h-2.5 bg-amber-500 shadow-[0_0_6px_#fbbf24]" />}
            {m.type === 'waypoint' && <div className="w-2 h-2 rounded-sm rotate-45 bg-purple-500 shadow-[0_0_6px_#a855f7]" />}
          </div>
        );
      })}
    </div>
  );
};
