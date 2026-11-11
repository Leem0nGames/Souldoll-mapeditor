/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { NPCGender, NPCSpriteRef } from '../types';

export interface SheetConfig {
  url: string;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  total: number;
}

export const NPC_SHEETS: Record<NPCGender, SheetConfig> = {
  female: {
    url: '/assets/npcs/NPC06.webp',
    cols: 4,
    rows: 4,
    cellW: 192,
    cellH: 344,
    total: 16,
  },
  male: {
    url: '/assets/npcs/NPC09.webp',
    cols: 4,
    rows: 4,
    cellW: 192,
    cellH: 344,
    total: 16,
  },
};

// Textures & Canvases cached per sheet
const sheetTextures: Record<NPCGender, THREE.CanvasTexture[]> = {
  female: [],
  male: [],
};

const sheetCanvases: Record<NPCGender, HTMLCanvasElement[]> = {
  female: [],
  male: [],
};

let loadedCount = 0;
let onLoadCallbacks: Array<() => void> = [];

export function onNPCTexturesLoaded(cb: () => void) {
  if (loadedCount >= 2) {
    cb();
  } else {
    onLoadCallbacks.push(cb);
  }
}

function initSheet(gender: NPCGender) {
  const config = NPC_SHEETS[gender];
  const { cellW, cellH, total, url } = config;

  for (let i = 0; i < total; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = cellW;
    canvas.height = cellH;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Silhouette placeholder until loaded
    ctx.fillStyle = gender === 'female' ? 'rgba(30, 20, 45, 0.6)' : 'rgba(20, 30, 45, 0.6)';
    ctx.fillRect(cellW * 0.25, cellH * 0.15, cellW * 0.5, cellH * 0.7);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    sheetCanvases[gender].push(canvas);
    sheetTextures[gender].push(texture);
  }

  const img = new Image();
  img.src = url;

  const onReady = () => {
    for (let i = 0; i < total; i++) {
      const col = i % config.cols;
      const row = Math.floor(i / config.cols);
      const sx = col * cellW;
      const sy = row * cellH;

      const canvas = sheetCanvases[gender][i];
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, cellW, cellH);

      // Subtle foot shadow
      ctx.fillStyle = 'rgba(10, 16, 32, 0.45)';
      ctx.beginPath();
      ctx.ellipse(cellW / 2, cellH - 12, cellW * 0.28, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw the NPC frontal sprite
      ctx.drawImage(img, sx, sy, cellW, cellH, 0, 0, cellW, cellH);

      sheetTextures[gender][i].needsUpdate = true;
    }

    loadedCount++;
    if (loadedCount >= 2) {
      onLoadCallbacks.forEach(cb => cb());
      onLoadCallbacks = [];
    }
  };

  if (img.complete && img.naturalWidth > 0) {
    onReady();
  } else {
    img.onload = onReady;
  }
}

// Initialize both sheets
initSheet('female');
initSheet('male');

/**
 * Normalizes input (number or NPCSpriteRef) into unified coords.
 * Global unified indexing: 0..15 = female (NPC06), 16..31 = male (NPC09).
 */
export function normalizeNPCRef(ref?: number | NPCSpriteRef): {
  gender: NPCGender;
  frameIndex: number;
  globalIndex: number;
} {
  if (ref === undefined || ref === null) {
    return { gender: 'female', frameIndex: 0, globalIndex: 0 };
  }

  if (typeof ref === 'number') {
    const safeIdx = Math.max(0, Math.floor(ref));
    if (safeIdx >= 16) {
      const frameIndex = (safeIdx - 16) % 16;
      return { gender: 'male', frameIndex, globalIndex: 16 + frameIndex };
    }
    const frameIndex = safeIdx % 16;
    return { gender: 'female', frameIndex, globalIndex: frameIndex };
  }

  const gender: NPCGender = ref.sheet === 'male' ? 'male' : 'female';
  const frameIndex = Math.abs(ref.frameIndex || 0) % 16;
  const globalIndex = (gender === 'male' ? 16 : 0) + frameIndex;
  return { gender, frameIndex, globalIndex };
}

/**
 * Get texture for any NPC by global unified index (0..31) or NPCSpriteRef
 */
export function getNPCSpriteTexture(ref: number | NPCSpriteRef): THREE.CanvasTexture {
  const { gender, frameIndex } = normalizeNPCRef(ref);
  const textures = sheetTextures[gender];
  return textures[frameIndex] || textures[0];
}

/**
 * Get canvas element for an NPC
 */
export function getNPCCanvas(ref: number | NPCSpriteRef): HTMLCanvasElement | null {
  const { gender, frameIndex } = normalizeNPCRef(ref);
  const canvases = sheetCanvases[gender];
  return canvases[frameIndex] || null;
}

/**
 * Returns a data URL representing a cropped portrait (head & shoulders)
 */
export function getNPCPortraitDataUrl(ref: number | NPCSpriteRef): string {
  const canvas = getNPCCanvas(ref);
  if (!canvas) return '';

  const crop = document.createElement('canvas');
  crop.width = 96;
  crop.height = 96;
  const ctx = crop.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;

  const config = NPC_SHEETS[normalizeNPCRef(ref).gender];
  const srcY = config.cellH * 0.08;
  const srcH = config.cellW;
  ctx.drawImage(canvas, 0, srcY, config.cellW, srcH, 0, 0, 96, 96);

  return crop.toDataURL('image/png');
}

/**
 * Returns CSS styling parameters for crisp pixelated avatar rendering in UI
 */
export function getNPCCoords(ref: number | NPCSpriteRef) {
  const { gender, frameIndex, globalIndex } = normalizeNPCRef(ref);
  const config = NPC_SHEETS[gender];
  const col = frameIndex % config.cols;
  const row = Math.floor(frameIndex / config.cols);

  return {
    gender,
    frameIndex,
    globalIndex,
    col,
    row,
    x: col * config.cellW,
    y: row * config.cellH,
    cellW: config.cellW,
    cellH: config.cellH,
    sheetUrl: config.url,
  };
}

export function getAllNPCTextures(): { female: THREE.CanvasTexture[]; male: THREE.CanvasTexture[] } {
  return sheetTextures;
}
