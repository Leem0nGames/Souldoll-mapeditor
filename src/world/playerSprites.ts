/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import spritesheetData from '../../public/assets/player_spritesheet.json';

export type PlayerDirection = 'down' | 'left' | 'right' | 'up';

export const DIRECTION_BASE_FRAMES: Record<PlayerDirection, number> = {
  down: 0,
  left: 4,
  right: 8,
  up: 12,
};

interface FrameDef {
  frame: { x: number; y: number; w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

const framesMap: Record<number, FrameDef> = {};
for (let i = 0; i < 16; i++) {
  const key = `frame_${String(i).padStart(3, '0')}.webp` as keyof typeof spritesheetData.frames;
  const raw = spritesheetData.frames[key];
  if (raw) {
    framesMap[i] = raw;
  }
}

// 16 CanvasTextures corresponding to each frame in player_spritesheet.json
const playerTextures: THREE.CanvasTexture[] = [];
const playerCanvases: HTMLCanvasElement[] = [];
let isLoaded = false;
let onLoadCallbacks: Array<() => void> = [];

export function onPlayerTexturesLoaded(cb: () => void) {
  if (isLoaded) {
    cb();
  } else {
    onLoadCallbacks.push(cb);
  }
}

function initTextures() {
  const CANVAS_W = 106;
  const CANVAS_H = 210;

  for (let i = 0; i < 16; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Draw temporary placeholder silhouette until image loads
    ctx.fillStyle = '#312e81';
    ctx.fillRect(36, 40, 34, 100);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    playerCanvases.push(canvas);
    playerTextures.push(texture);
  }

  // Load the webp image
  const img = new Image();
  img.src = '/assets/player_spritesheet.webp';

  const onImageReady = () => {
    for (let i = 0; i < 16; i++) {
      const f = framesMap[i];
      if (!f) continue;

      const canvas = playerCanvases[i];
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Subtle shadow ellipse at the feet base
      ctx.fillStyle = 'rgba(10, 16, 32, 0.45)';
      ctx.beginPath();
      ctx.ellipse(CANVAS_W / 2, CANVAS_H - 4, 24, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw the frame at its exact spriteSourceSize offset
      ctx.drawImage(
        img,
        f.frame.x,
        f.frame.y,
        f.frame.w,
        f.frame.h,
        f.spriteSourceSize.x,
        f.spriteSourceSize.y,
        f.frame.w,
        f.frame.h
      );

      playerTextures[i].needsUpdate = true;
    }

    isLoaded = true;
    onLoadCallbacks.forEach(cb => cb());
    onLoadCallbacks = [];
  };

  if (img.complete && img.naturalWidth > 0) {
    onImageReady();
  } else {
    img.onload = onImageReady;
  }
}

initTextures();

export function getPlayerTexture(frameIndex: number): THREE.CanvasTexture {
  return playerTextures[frameIndex] || playerTextures[0];
}

export function getAllPlayerTextures(): THREE.CanvasTexture[] {
  return playerTextures;
}
