/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ActiveStatusEffect } from '../types';

interface StatusBadgeListProps {
  statuses: ActiveStatusEffect[];
  onOpenModal: () => void;
  align?: 'left' | 'right';
  className?: string;
}

export const StatusBadgeList: React.FC<StatusBadgeListProps> = ({
  statuses,
  onOpenModal,
  align = 'left',
  className = '',
}) => {
  if (!statuses || statuses.length === 0) {
    return (
      <button
        onClick={onOpenModal}
        className={`pointer-events-auto text-[7px] text-[#64748b] hover:text-[#fbbf24] flex items-center gap-1 transition opacity-70 hover:opacity-100 cursor-pointer ${className}`}
        title="Ver Estado / Sin alteraciones activas"
      >
        <span>✨</span>
        <span className="uppercase tracking-wider">Estado Normal</span>
      </button>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 flex-wrap ${
        align === 'right' ? 'justify-end' : 'justify-start'
      } ${className}`}
    >
      {statuses.map((st, i) => (
        <button
          key={`${st.type}-${i}`}
          onClick={onOpenModal}
          className="pointer-events-auto group px-1.5 py-0.5 rounded-xs flex items-center gap-1 text-[7px] sm:text-[8px] font-bold border transition-transform hover:scale-105 active:scale-95 shadow-sm cursor-pointer animate-pulse"
          style={{
            backgroundColor: st.bgColor,
            borderColor: st.borderColor,
            color: st.color,
            boxShadow: `0 0 6px ${st.bgColor}`,
          }}
          title={`Estado: ${st.name} (${st.turnsRemaining} turnos restantes). Haz clic para detalles.`}
        >
          <span className="text-[9px]">{st.icon}</span>
          <span className="tracking-tight">{st.code}</span>
          <span className="bg-[#07050d]/80 px-1 py-0.2 rounded-xs text-[6px] text-[#fef08a] border border-[#2b1f40] tabular-nums">
            {st.turnsRemaining}t
          </span>
        </button>
      ))}

      {/* Button to open details window */}
      <button
        onClick={onOpenModal}
        className="pointer-events-auto text-[7px] px-1 py-0.5 rounded-xs bg-[#1f1633] hover:bg-[#2b1f40] border border-[#8a6a3b] text-[#fef08a] transition cursor-pointer"
        title="Ver ventana de estados detallada"
      >
        ℹ️
      </button>
    </div>
  );
};
