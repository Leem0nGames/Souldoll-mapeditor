/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Bounds2 } from './WorldTypes';

export type WorldLayer =
  | 'terrainBase'
  | 'terrainStamps'
  | 'terrainSplines'
  | 'terrainSurface'
  | 'biomes'
  | 'scatterPrimary'
  | 'scatterDetails'
  | 'water'
  | 'collisions'
  | 'props'
  | 'minimap';

export interface WorldInvalidation {
  source: string;
  layers: WorldLayer[];
  region?: Bounds2;
  ids?: string[];
}

export type WorldInvalidationListener = (change: WorldInvalidation) => void;

export class WorldEventBus {
  private listeners = new Map<WorldLayer, Set<WorldInvalidationListener>>();

  public emit(change: WorldInvalidation): void {
    const seen = new Set<WorldInvalidationListener>();
    for (let i = 0; i < change.layers.length; i++) {
      const listeners = this.listeners.get(change.layers[i]);
      if (!listeners) continue;
      for (const listener of listeners) {
        if (seen.has(listener)) continue;
        seen.add(listener);
        listener(change);
      }
    }
  }

  public subscribe(layer: WorldLayer, listener: WorldInvalidationListener): () => void {
    let listeners = this.listeners.get(layer);
    if (!listeners) {
      listeners = new Set<WorldInvalidationListener>();
      this.listeners.set(layer, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners!.delete(listener);
    };
  }

  public clear(): void {
    this.listeners.clear();
  }
}
