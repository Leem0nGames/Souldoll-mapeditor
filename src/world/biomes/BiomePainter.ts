/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BiomeId } from './BiomeDefinition';
import type { BiomeDatabase } from './BiomeDatabase';

export interface BiomeColorTarget {
  setRGB(r: number, g: number, b: number): unknown;
}

export interface BiomePaintSample {
  x: number;
  z: number;
  biome: BiomeId;
  elevation: number;
  slope: number;
  riverDistance: number;
}

export type BiomeNoiseAt = (x: number, z: number) => number;

export interface BiomePainterOptions {
  oceanWaterLevel: number;
  riverWaterLevel: number;
  riverHalfWidth: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function rgbFromHex(hex: number): Rgb {
  return {
    r: ((hex >> 16) & 0xff) / 255,
    g: ((hex >> 8) & 0xff) / 255,
    b: (hex & 0xff) / 255,
  };
}

const DEFAULT_MEADOW: Rgb = { r: 0.58, g: 0.84, b: 0.45 };
const SEABED: Rgb = { r: 0.32, g: 0.48, b: 0.56 };
const BEACH: Rgb = { r: 0.88, g: 0.82, b: 0.62 };
const RIVERBED: Rgb = { r: 0.55, g: 0.52, b: 0.42 };
const RIVERBANK_SAND: Rgb = { r: 0.82, g: 0.76, b: 0.58 };
const RIVERBANK_GRASS: Rgb = { r: 0.55, g: 0.82, b: 0.42 };

export class BiomePainter {
  public readonly database: BiomeDatabase;
  private readonly options: BiomePainterOptions;

  constructor(database: BiomeDatabase, options: BiomePainterOptions) {
    this.database = database;
    this.options = options;
  }

  public paint(
    sample: BiomePaintSample,
    y: number,
    colorOut: BiomeColorTarget,
    noiseAt: BiomeNoiseAt
  ): void {
    const definition = this.database.get(sample.biome);
    const base = definition ? rgbFromHex(definition.groundColor) : DEFAULT_MEADOW;
    const secondary = definition?.secondaryGroundColor
      ? rgbFromHex(definition.secondaryGroundColor)
      : base;

    if (sample.biome === 'coast' || y <= this.options.oceanWaterLevel + 0.4) {
      const color = y < this.options.oceanWaterLevel - 0.3 ? SEABED : BEACH;
      colorOut.setRGB(color.r, color.g, color.b);
      return;
    }

    if (
      sample.biome === 'river' ||
      (sample.riverDistance < this.options.riverHalfWidth * 1.15 &&
        y < this.options.riverWaterLevel + 0.2)
    ) {
      colorOut.setRGB(RIVERBED.r, RIVERBED.g, RIVERBED.b);
      return;
    }

    if (
      sample.riverDistance < this.options.riverHalfWidth * 2.0 &&
      y < this.options.riverWaterLevel + 1.2
    ) {
      const t = Math.max(
        0,
        Math.min(
          1,
          (sample.riverDistance - this.options.riverHalfWidth) /
            this.options.riverHalfWidth
        )
      );
      colorOut.setRGB(
        RIVERBANK_SAND.r + (RIVERBANK_GRASS.r - RIVERBANK_SAND.r) * t,
        RIVERBANK_SAND.g + (RIVERBANK_GRASS.g - RIVERBANK_SAND.g) * t,
        RIVERBANK_SAND.b + (RIVERBANK_GRASS.b - RIVERBANK_SAND.b) * t
      );
      return;
    }

    if (sample.biome === 'village') {
      colorOut.setRGB(base.r, base.g, base.b);
      return;
    }

    if (sample.biome === 'snow') {
      const color = sample.elevation > 17.5 ? secondary : base;
      colorOut.setRGB(color.r, color.g, color.b);
      return;
    }

    if (sample.biome === 'swamp') {
      const bogHue = noiseAt(sample.x * 0.15, sample.z * 0.15) * 0.05;
      colorOut.setRGB(base.r + bogHue, base.g + bogHue, base.b);
      return;
    }

    if (sample.biome === 'spectral') {
      const etherPulse = noiseAt(sample.x * 0.12, sample.z * 0.12) * 0.06;
      colorOut.setRGB(base.r + etherPulse, base.g, base.b + etherPulse);
      return;
    }

    if (sample.biome === 'mountain') {
      const color = sample.slope > 0.4 ? secondary : base;
      colorOut.setRGB(color.r, color.g, color.b);
      return;
    }

    if (sample.biome === 'forest') {
      colorOut.setRGB(base.r, base.g, base.b);
      return;
    }

    const variation = noiseAt(sample.x * 0.1, sample.z * 0.1) * 0.08;
    colorOut.setRGB(base.r + variation, base.g + variation, base.b + variation);
  }
}
