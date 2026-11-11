/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

const cache = new Map<string, THREE.CanvasTexture>();

export function getTexture(key: string, factory: () => THREE.CanvasTexture): THREE.CanvasTexture {
  if (!cache.has(key)) {
    cache.set(key, factory());
  }
  return cache.get(key)!;
}

export function disposeTextures() {
  cache.forEach(texture => texture.dispose());
  cache.clear();
}
