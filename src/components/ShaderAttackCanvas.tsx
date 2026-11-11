/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { shaderAttackEngine } from '../core/shaderAttackVFX';

interface ShaderAttackCanvasProps {
  className?: string;
}

export const ShaderAttackCanvas: React.FC<ShaderAttackCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    shaderAttackEngine.init(canvas);

    const handleResize = () => {
      shaderAttackEngine.updateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-40 w-full h-full ${className}`}
    />
  );
};
