/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import seedrandom from 'seedrandom';
import type { TerrainHeightSample } from './terrain/TerrainData';
import type { BiomeEnvironment, BiomeId } from './biomes/BiomeDefinition';
import { BiomePainter } from './biomes/BiomePainter';
import { BiomeGenerator } from './biomes/BiomeGenerator';
import { createDefaultBiomeSystem } from './biomes/biomes.data';
import {
  createDefaultRoadSpline,
  createDefaultRiverSpline,
  createLakeEdgeSpline,
  sampleWorldSpline,
  type WorldSpline,
} from './splines';

/**
 * Procedural Terrain & Biome Engine for SoulDolls.
 * Generates continuous 3D geography using seeded multi-octave noise,
 * natural river channels, mountain chains, meadows, forests, and protected manual locations.
 */

export type ProceduralBiome = BiomeId;

export const OCEAN_WATER_LEVEL = -1.2;
export const LAKE_CENTER_X = 100;
export const LAKE_CENTER_Z = -80;
export const LAKE_BASIN_RADIUS = 52;
export const LAKE_WATER_RADIUS = 26;
export const COAST_RADIUS = 176;
export const VILLAGE_CENTER_X = 0;
export const VILLAGE_CENTER_Z = 8;
export const VILLAGE_BIOME_RADIUS = 46;

export interface ManualProtectedZone {
  id: string;
  name: string;
  category: 'village' | 'dungeon' | 'temple' | 'crypt' | 'shrine';
  x: number;
  z: number;
  innerRadius: number;
  outerRadius: number;
  targetElevation?: number;
}

/**
 * Registry of handcrafted narrative locations protected from procedural destruction.
 *Procedural noise is smoothly blended out inside outerRadius, and procedural props/trees
 * are strictly excluded inside innerRadius.
 */
export const MANUAL_PROTECTED_ZONES: ManualProtectedZone[] = [
  { id: 'villa_marioneta', name: 'Villa Marioneta', category: 'village', x: 0, z: 8, innerRadius: 44, outerRadius: 54 },
  { id: 'cueva_cristal', name: 'Cueva de Cristal Ancestral', category: 'dungeon', x: 74, z: 54, innerRadius: 12, outerRadius: 19, targetElevation: 8.4 },
  { id: 'templo_alba', name: 'Templo Solar del Alba', category: 'temple', x: -38, z: 136, innerRadius: 13, outerRadius: 21, targetElevation: 4.2 },
  { id: 'cripta_abismo', name: 'Cripta del Abismo Espectral', category: 'crypt', x: 68, z: -128, innerRadius: 14, outerRadius: 22, targetElevation: 2.0 },
  { id: 'santuario_bosque', name: 'Santuario del Bosque Umbrío', category: 'shrine', x: -64, z: -62, innerRadius: 12, outerRadius: 18, targetElevation: 2.2 },
  { id: 'monolito_fulgor', name: 'Monolito del Fulgor', category: 'shrine', x: 82, z: 8, innerRadius: 13, outerRadius: 19, targetElevation: 9.2 },
];

export function isInsideProtectedZone(x: number, z: number, extraMargin = 0): boolean {
  for (let i = 0; i < MANUAL_PROTECTED_ZONES.length; i++) {
    const zone = MANUAL_PROTECTED_ZONES[i];
    if (Math.hypot(x - zone.x, z - zone.z) < zone.innerRadius + extraMargin) {
      return true;
    }
  }
  return false;
}

export interface BiomeSample {
  biome: ProceduralBiome;
  elevation: number;
  slope: number;
  moisture: number;
  temperature: number;
  riverDistance: number;
  secondaryBiome?: ProceduralBiome;
  blend: number;
}

// ---------------------------------------------------------------------------
// 2D Perlin / Gradient Noise Implementation (Deterministic & Blazing Fast)
// ---------------------------------------------------------------------------
class FastNoise2D {
  private perm: Uint8Array = new Uint8Array(512);

  constructor(seed: string = 'souldolls-luminati') {
    const rng = seedrandom(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const a = this.perm[X] + Y;
    const aa = this.perm[a];
    const ab = this.perm[a + 1];
    const b = this.perm[X + 1] + Y;
    const ba = this.perm[b];
    const bb = this.perm[b + 1];

    const g00 = this.grad(this.perm[aa], xf, yf);
    const g10 = this.grad(this.perm[ba], xf - 1, yf);
    const g01 = this.grad(this.perm[ab], xf, yf - 1);
    const g11 = this.grad(this.perm[bb], xf - 1, yf - 1);

    const x1 = this.lerp(g00, g10, u);
    const x2 = this.lerp(g01, g11, u);
    return this.lerp(x1, x2, v);
  }

  public fbm(x: number, y: number, octaves = 4, persistence = 0.5, lacunarity = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }

  public ridged(x: number, y: number, octaves = 3, lacunarity = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let weight = 1;
    for (let i = 0; i < octaves; i++) {
      let n = Math.abs(this.noise(x * frequency, y * frequency));
      n = 1.0 - n;
      n = n * n;
      total += n * amplitude * weight;
      weight = Math.max(0, Math.min(1, n * 2));
      amplitude *= 0.5;
      frequency *= lacunarity;
    }
    return total;
  }
}

// Global noise singleton
const terrainNoise = new FastNoise2D('luminati-chronicles-v1');
const biomeNoise = new FastNoise2D('luminati-biomes-v1');

const WORLD_SPLINES: WorldSpline[] = [
  createDefaultRoadSpline(),
  createDefaultRiverSpline(),
  createLakeEdgeSpline(),
];

function sampleWorldSplineInfluenceAt(x: number, z: number): { influence: number; type: string; heightOffset: number } {
  let closest: { influence: number; type: string; heightOffset: number } = {
    influence: 0,
    type: 'none',
    heightOffset: 0,
  };

  for (let i = 0; i < WORLD_SPLINES.length; i++) {
    const spline = WORLD_SPLINES[i];
    const sample = sampleWorldSpline(spline, x, z);
    if (sample.influence <= closest.influence) continue;

    closest = {
      influence: sample.influence,
      type: spline.type,
      heightOffset: spline.heightOffset ?? 0,
    };
  }

  return closest;
}

// ---------------------------------------------------------------------------
// RIVER DEFINITION & MATHEMATICAL CARVING
// ---------------------------------------------------------------------------
/**
 * Meandering River Waypoints:
 * Originates in the high northeastern peaks, winds through the meadow,
 * crosses Ruta 1 beneath the bridge at (x: -4, z: 98), bends through the valley,
 * and feeds south into Lake Esmeralda.
 */
export const RIVER_SPLINE_POINTS: THREE.Vector3[] = [
  new THREE.Vector3(160, 0, 160),
  new THREE.Vector3(115, 0, 135),
  new THREE.Vector3(70, 0, 118),
  new THREE.Vector3(25, 0, 108),
  new THREE.Vector3(-4, 0, 98),   // Road crossing & wooden bridge point
  new THREE.Vector3(-34, 0, 84),
  new THREE.Vector3(-52, 0, 58),
  new THREE.Vector3(-46, 0, 24),
  new THREE.Vector3(-22, 0, -8),
  new THREE.Vector3(12, 0, -32),
  new THREE.Vector3(48, 0, -56),
  new THREE.Vector3(76, 0, -74),  // Entry into Emerald Lake
  new THREE.Vector3(100, 0, -80), // Lake center connection
];

const riverCurve = new THREE.CatmullRomCurve3(RIVER_SPLINE_POINTS, false, 'centripetal', 0.5);
const RIVER_SAMPLE_COUNT = 120;
const riverSamples = riverCurve.getSpacedPoints(RIVER_SAMPLE_COUNT);

export const RIVER_WATER_LEVEL = 1.6;
export const RIVER_BED_DEPTH = 3.2;
export const RIVER_HALF_WIDTH = 5.2;

// Bridge Geometry Bounds on Ruta 1
export const BRIDGE_CONFIG = {
  centerX: -3.8,
  centerZ: 98.0,
  deckY: 2.6,
  spanLength: 14.0, // along Z
  width: 6.8,       // along X
};

/**
 * Calculates distance from (x, z) to the river centerline
 */
export function getDistanceToRiver(x: number, z: number): { distance: number; closestPt: THREE.Vector3 } {
  let minDist = Infinity;
  let closest = riverSamples[0];

  for (let i = 0; i < riverSamples.length - 1; i++) {
    const p1 = riverSamples[i];
    const p2 = riverSamples[i + 1];

    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const lenSq = dx * dx + dz * dz;

    let t = 0;
    if (lenSq > 0) {
      t = ((x - p1.x) * dx + (z - p1.z) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projX = p1.x + t * dx;
    const projZ = p1.z + t * dz;
    const dist = Math.hypot(x - projX, z - projZ);

    if (dist < minDist) {
      minDist = dist;
      closest = new THREE.Vector3(projX, 0, projZ);
    }
  }

  return { distance: minDist, closestPt: closest };
}

/**
 * Check if a point is on the wooden river bridge
 */
export function isPointOnBridge(x: number, z: number): boolean {
  const dx = Math.abs(x - BRIDGE_CONFIG.centerX);
  const dz = Math.abs(z - BRIDGE_CONFIG.centerZ);
  return dx <= (BRIDGE_CONFIG.width * 0.5) && dz <= (BRIDGE_CONFIG.spanLength * 0.5);
}

// ---------------------------------------------------------------------------
// CORE PROCEDURAL TERRAIN ELEVATION FUNCTION
// ---------------------------------------------------------------------------
/**
 * Master terrain elevation query function.
 * Deterministic, smooth, continuous, and guarantees preservation of manual narrative locations.
 */
export function getProceduralTerrainHeight(x: number, z: number): number {
  // 1. BRIDGE OVERRIDE:
  // If player or road is on the bridge deck crossing the river, return smooth elevated deck height
  if (isPointOnBridge(x, z)) {
    const dz = (z - BRIDGE_CONFIG.centerZ) / (BRIDGE_CONFIG.spanLength * 0.5);
    // Subtle graceful crown arch on bridge
    const archOffset = (1.0 - dz * dz) * 0.35;
    return BRIDGE_CONFIG.deckY + archOffset;
  }

  // 2. BASE CONTINENTAL NOISE (Meadows, valleys, rolling hills)
  // Low frequency macro relief
  const nMacro = terrainNoise.fbm(x * 0.007, z * 0.007, 3, 0.5, 2.0);
  // Medium frequency rolling mounds
  const nMounds = terrainNoise.fbm(x * 0.025 + 0.7, z * 0.025 + 1.3, 3, 0.45, 2.1);
  // High frequency ground surface texture
  const nMicro = terrainNoise.noise(x * 0.08, z * 0.08) * 0.45;

  let baseH = nMacro * 7.5 + nMounds * 2.8 + nMicro;

  // 3. MOUNTAIN CHAIN IN THE EAST / NORTHEAST (X: 55..190, Z: -20..190)
  // Smoothly ramps up into rugged ridges and peaks
  const mDistX = x - 55;
  const mDistZ = z - 10;
  if (mDistX > 0 && mDistZ > -30) {
    const mountainFactor = Math.min(1.0, Math.hypot(Math.max(0, mDistX), Math.max(0, mDistZ + 30)) / 90);
    // Ridged noise produces dramatic knife-edge crests and peaks
    const ridgeNoise = terrainNoise.ridged(x * 0.018, z * 0.018, 4, 2.2);
    const mountainElev = (ridgeNoise * 19.0 + nMacro * 6.0) * mountainFactor;
    baseH += mountainElev;
  }

  // 4. EMERALD LAKE BASIN DEPRESSION (Centered at x: 100, z: -80)
  const lakeDist = Math.hypot(x - LAKE_CENTER_X, z - LAKE_CENTER_Z);
  if (lakeDist < LAKE_BASIN_RADIUS) {
    const lakeFactor = Math.max(0, (LAKE_BASIN_RADIUS - lakeDist) / LAKE_BASIN_RADIUS);
    const lakeDepth = Math.sin(lakeFactor * (Math.PI * 0.5)) * 6.5;
    baseH -= lakeDepth;
  }

  // 5. RIVER CHANNEL CARVING
  const riverInfo = getDistanceToRiver(x, z);
  if (riverInfo.distance < (RIVER_HALF_WIDTH * 2.2)) {
    const channelRatio = riverInfo.distance / (RIVER_HALF_WIDTH * 2.2);
    // Smooth cosine river bed trough
    const bedDepth = Math.cos(channelRatio * (Math.PI * 0.5)) * RIVER_BED_DEPTH;
    // Lower terrain toward water level
    const targetRiverBed = Math.min(baseH - bedDepth, RIVER_WATER_LEVEL - 1.2);
    baseH = THREE.MathUtils.lerp(targetRiverBed, baseH, channelRatio);
  }

  // 5b. WORLD SPLINE SOFTENING (road flattening + lake edge shaping)
  const splineSample = sampleWorldSplineInfluenceAt(x, z);
  if (splineSample.influence > 0) {
    if (splineSample.type === 'road') {
      const targetRoad = 1.4 + Math.sin((x + z) * 0.05) * 0.2;
      baseH = THREE.MathUtils.lerp(baseH, targetRoad, splineSample.influence * 0.22);
    } else if (splineSample.type === 'lake-edge') {
      const shoreDepth = -0.9 - splineSample.influence * 1.8;
      baseH += shoreDepth * 0.65;
    }
  }

  // 6. PROTECTED MANUAL LOCATION: VILLA MARIONETA (Centered at x: 0, z: 8)
  // Never allow procedural noise to alter or destroy handcrafted terraces and buildings
  const vmDist = Math.hypot(x, z - 8);
  if (vmDist < 54) {
    let targetH = 1.0;

    // West Elevated Terrace (Workshop & Robin's quarters)
    if (x <= -15.0 && x >= -44.0 && z >= -22.0 && z <= 36.0) {
      targetH = 2.8;
    } else if (x > -15.0 && x < -9.5 && ((z >= -5.2 && z <= 5.2) || (z >= 17.2 && z <= 27.8))) {
      // West stone stair ramps: smoothly climbs from Y=1.0 to Y=2.8
      const t = (-9.5 - x) / 5.5;
      targetH = THREE.MathUtils.lerp(1.0, 2.8, Math.max(0, Math.min(1.0, t)));
    }

    // East Elevated Terrace (Market & Selene's quarters)
    if (x >= 15.0 && x <= 44.0 && z >= -22.0 && z <= 36.0) {
      targetH = 2.8;
    } else if (x < 15.0 && x > 9.5 && ((z >= -5.2 && z <= 5.2) || (z >= 17.2 && z <= 27.8))) {
      // East stone stair ramps: smoothly climbs from Y=1.0 to Y=2.8
      const t = (x - 9.5) / 5.5;
      targetH = THREE.MathUtils.lerp(1.0, 2.8, Math.max(0, Math.min(1.0, t)));
    }

    // Smooth Hermite blend to procedural terrain outside village boundary
    const blend = Math.max(0, Math.min(1.0, (vmDist - 38) / 14));
    const smoothBlend = blend * blend * (3 - 2 * blend);
    baseH = THREE.MathUtils.lerp(targetH, baseH, smoothBlend);
  }

  // 7. PROTECTED MANUAL LOCATIONS (Dungeons, Temples, Crypts, Shrines)
  for (let i = 0; i < MANUAL_PROTECTED_ZONES.length; i++) {
    const zone = MANUAL_PROTECTED_ZONES[i];
    if (zone.id === 'villa_marioneta' || zone.targetElevation === undefined) continue;
    const dist = Math.hypot(x - zone.x, z - zone.z);
    if (dist < zone.outerRadius) {
      const t = Math.max(0, Math.min(1.0, (dist - zone.innerRadius) / (zone.outerRadius - zone.innerRadius)));
      const smoothT = t * t * (3 - 2 * t);
      baseH = THREE.MathUtils.lerp(zone.targetElevation, baseH, smoothT);
    }
  }

  // 8. NATURAL CONTINENTAL COASTLINE & OCEAN PERIMETER
  // Modulate shoreline radius organically so coves, beaches, and headlands form naturally
  const radialDist = Math.hypot(x, z);
  const coastWobble = terrainNoise.fbm(x * 0.014 + 3.1, z * 0.014 - 2.4, 3) * 18.0;
  const coastStart = 186.0 + coastWobble;
  if (radialDist > coastStart) {
    const seaProgress = Math.min(1.0, (radialDist - coastStart) / 36.0);
    const smoothSea = seaProgress * seaProgress * (3 - 2 * seaProgress);
    const seabedTarget = OCEAN_WATER_LEVEL - 2.6;
    baseH = THREE.MathUtils.lerp(baseH, seabedTarget, smoothSea);
  }

  return baseH;
}

// ---------------------------------------------------------------------------
// BIOME SAMPLING & CLASSIFICATION SYSTEM
// ---------------------------------------------------------------------------
export type TerrainHeightFn = (x: number, z: number) => number;

let activeBiomeGenerator: BiomeGenerator | null = null;
let activeBiomePainter: BiomePainter | null = null;

function buildBiomeEnvironment(
  x: number,
  z: number,
  elevation: number,
  slope: number
): BiomeEnvironment {
  const riverInfo = getDistanceToRiver(x, z);
  const lakeDist = Math.hypot(x - LAKE_CENTER_X, z - LAKE_CENTER_Z);
  const baseMoisture = biomeNoise.fbm(x * 0.012, z * 0.012, 2);
  const waterProximity = Math.max(
    0,
    1.0 - Math.min(riverInfo.distance / 24, lakeDist / 42)
  );
  const moisture = Math.max(
    0,
    Math.min(1.0, 0.45 + baseMoisture * 0.35 + waterProximity * 0.35)
  );
  const temperature = Math.max(0, Math.min(1.0, 0.75 - (elevation / 30) * 0.45));

  return {
    x,
    z,
    elevation,
    slope,
    moisture,
    temperature,
    riverDistance: riverInfo.distance,
    lakeDistance: lakeDist,
    radialDistance: Math.hypot(x, z),
    onBridge: isPointOnBridge(x, z),
  };
}

function createDefaultGenerator(): BiomeGenerator {
  return createDefaultBiomeSystem({
    riverHalfWidth: RIVER_HALF_WIDTH,
    riverWaterLevel: RIVER_WATER_LEVEL,
    oceanWaterLevel: OCEAN_WATER_LEVEL,
    lakeCenter: { x: LAKE_CENTER_X, z: LAKE_CENTER_Z },
    lakeRadius: LAKE_WATER_RADIUS,
    villageCenter: { x: VILLAGE_CENTER_X, z: VILLAGE_CENTER_Z },
    villageRadius: VILLAGE_BIOME_RADIUS,
    coastRadius: COAST_RADIUS,
    coastMaxElevation: OCEAN_WATER_LEVEL + 2.1,
    environmentAt: (x, z, terrain: TerrainHeightSample) =>
      buildBiomeEnvironment(x, z, terrain.height, terrain.slope),
  });
}

export function getActiveBiomeGenerator(): BiomeGenerator {
  if (!activeBiomeGenerator) {
    activeBiomeGenerator = createDefaultGenerator();
  }
  return activeBiomeGenerator;
}

export function setActiveBiomeGenerator(generator: BiomeGenerator | null): void {
  activeBiomeGenerator = generator;
  activeBiomePainter = null;
}

export function resetActiveBiomeGenerator(): void {
  setActiveBiomeGenerator(null);
}

function getActiveBiomePainter(): BiomePainter {
  const generator = getActiveBiomeGenerator();
  if (!activeBiomePainter || activeBiomePainter.database !== generator.database) {
    activeBiomePainter = new BiomePainter(generator.database, {
      oceanWaterLevel: OCEAN_WATER_LEVEL,
      riverWaterLevel: RIVER_WATER_LEVEL,
      riverHalfWidth: RIVER_HALF_WIDTH,
    });
  }
  return activeBiomePainter;
}

/**
 * Evaluates the biome and environmental properties at any continuous world coordinate.
 */
export function sampleBiomeAt(
  x: number,
  z: number,
  heightAt: TerrainHeightFn = getProceduralTerrainHeight
): BiomeSample {
  const elevation = heightAt(x, z);

  const eps = 1.0;
  const hL = heightAt(x - eps, z);
  const hR = heightAt(x + eps, z);
  const hD = heightAt(x, z - eps);
  const hU = heightAt(x, z + eps);
  const slope = Math.hypot((hR - hL) / (eps * 2), (hU - hD) / (eps * 2));

  const environment = buildBiomeEnvironment(x, z, elevation, slope);
  const resolved = getActiveBiomeGenerator().resolve(environment);

  return {
    biome: resolved.biomeId,
    elevation,
    slope,
    moisture: environment.moisture,
    temperature: environment.temperature,
    riverDistance: environment.riverDistance,
    secondaryBiome: resolved.secondaryBiomeId,
    blend: resolved.blend,
  };
}

// ---------------------------------------------------------------------------
// TERRAIN VERTEX COLORING (Multi-Biome Visual Coherence)
// ---------------------------------------------------------------------------
/**
 * Calculates distinct RGB tint for terrain vertices, preserving pixel-art textures
 * while visually delineating meadow, forest, mountain, snow, swamp, spectral, coast, and village.
 */
export function getTerrainVertexColor(
  x: number,
  z: number,
  y: number,
  colorOut: THREE.Color,
  heightAt: TerrainHeightFn = getProceduralTerrainHeight
): void {
  const sample = sampleBiomeAt(x, z, heightAt);
  getActiveBiomePainter().paint(
    {
      x,
      z,
      biome: sample.biome,
      elevation: sample.elevation,
      slope: sample.slope,
      riverDistance: sample.riverDistance,
    },
    y,
    colorOut,
    (noiseX, noiseZ) => terrainNoise.noise(noiseX, noiseZ)
  );
}

// ---------------------------------------------------------------------------
// 3D MESH GENERATION: CURVED RIVER MESH
// ---------------------------------------------------------------------------
/**
 * Generates an animated, flowing curved river mesh following the river spline.
 */
export function buildRiverMesh(subdivisions = 160): THREE.Mesh {
  const points = riverCurve.getSpacedPoints(subdivisions);
  const numVertices = points.length * 2;
  const numFaces = (points.length - 1) * 2;

  const positions = new Float32Array(numVertices * 3);
  const uvs = new Float32Array(numVertices * 2);
  const indices = new Uint16Array(numFaces * 3);

  let accumulatedDist = 0;

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    let tangent = new THREE.Vector3(0, 0, 1);
    if (i < points.length - 1) {
      tangent.subVectors(points[i + 1], curr).normalize();
      accumulatedDist += curr.distanceTo(points[i + 1]);
    } else if (i > 0) {
      tangent.subVectors(curr, points[i - 1]).normalize();
    }

    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const halfW = RIVER_HALF_WIDTH * 0.95;

    const lx = curr.x - normal.x * halfW;
    const lz = curr.z - normal.z * halfW;
    const rx = curr.x + normal.x * halfW;
    const rz = curr.z + normal.z * halfW;

    const vIdx = i * 2;
    // Left vertex
    positions[vIdx * 3] = lx;
    positions[vIdx * 3 + 1] = RIVER_WATER_LEVEL;
    positions[vIdx * 3 + 2] = lz;

    // Right vertex
    positions[(vIdx + 1) * 3] = rx;
    positions[(vIdx + 1) * 3 + 1] = RIVER_WATER_LEVEL;
    positions[(vIdx + 1) * 3 + 2] = rz;

    const vCoord = accumulatedDist * 0.15;
    uvs[vIdx * 2] = 0;
    uvs[vIdx * 2 + 1] = vCoord;

    uvs[(vIdx + 1) * 2] = 1;
    uvs[(vIdx + 1) * 2 + 1] = vCoord;

    if (i < points.length - 1) {
      const faceIdx = i * 6;
      const i0 = vIdx;
      const i1 = vIdx + 1;
      const i2 = vIdx + 2;
      const i3 = vIdx + 3;

      indices[faceIdx] = i0;
      indices[faceIdx + 1] = i1;
      indices[faceIdx + 2] = i2;

      indices[faceIdx + 3] = i1;
      indices[faceIdx + 4] = i3;
      indices[faceIdx + 5] = i2;
    }
  }

  const riverGeo = new THREE.BufferGeometry();
  riverGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  riverGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  riverGeo.setIndex(new THREE.BufferAttribute(indices, 1));
  riverGeo.computeVertexNormals();

  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.85,
    roughness: 0.12,
    metalness: 0.75,
  });

  const mesh = new THREE.Mesh(riverGeo, riverMat);
  mesh.name = 'river_water_mesh';
  return mesh;
}

// ---------------------------------------------------------------------------
// 3D MESH GENERATION: RUSTIC TIMBER RIVER BRIDGE
// ---------------------------------------------------------------------------
/**
 * Builds the rustic wooden arched bridge crossing the river along Ruta 1.
 */
export function buildRiverBridge(
  woodPlankTex: THREE.Texture,
  woodNormalMap: THREE.Texture | null = null
): { group: THREE.Group; collisionBoxes: { x: number; z: number; rx: number; rz: number }[] } {
  const group = new THREE.Group();
  group.name = 'river_bridge';

  const woodMat = new THREE.MeshStandardMaterial({
    map: woodPlankTex,
    normalMap: woodNormalMap,
    roughness: 0.8,
  });

  const { centerX, centerZ, deckY, spanLength, width } = BRIDGE_CONFIG;
  const collisionBoxes: { x: number; z: number; rx: number; rz: number }[] = [];

  // 1. Deck Planks (Segmented arched bridge deck)
  const segments = 12;
  const segLength = spanLength / segments;

  for (let s = 0; s < segments; s++) {
    const t = (s + 0.5) / segments;
    const zOffset = -spanLength * 0.5 + t * spanLength;
    const normalZ = (zOffset / (spanLength * 0.5));
    const archY = (1.0 - normalZ * normalZ) * 0.35;
    const curY = deckY + archY;

    // Deck plank box
    const plankGeo = new THREE.BoxGeometry(width, 0.35, segLength * 1.05);
    const plankMesh = new THREE.Mesh(plankGeo, woodMat);
    plankMesh.position.set(centerX, curY - 0.175, centerZ + zOffset);
    // Subtle rotation following arch incline
    const slopeAngle = -normalZ * 0.08;
    plankMesh.rotation.x = slopeAngle;
    group.add(plankMesh);
  }

  // 2. Heavy Timber Support Beams (Underneath the deck)
  [-width * 0.42, width * 0.42].forEach(beamX => {
    const beamGeo = new THREE.BoxGeometry(0.5, 0.7, spanLength * 1.05);
    const beamMesh = new THREE.Mesh(beamGeo, woodMat);
    beamMesh.position.set(centerX + beamX, deckY - 0.55, centerZ);
    group.add(beamMesh);

    // Stone pier foundation piles at river banks
    [-spanLength * 0.45, spanLength * 0.45].forEach(pileZ => {
      const pileGeo = new THREE.CylinderGeometry(0.5, 0.65, 3.8, 8);
      const pileMesh = new THREE.Mesh(pileGeo, woodMat);
      pileMesh.position.set(centerX + beamX, deckY - 1.8, centerZ + pileZ);
      group.add(pileMesh);
    });
  });

  // 3. Wooden Handrail Balustrades (Left and Right sides)
  [-width * 0.48, width * 0.48].forEach(railX => {
    // Top handrail beam
    const railGeo = new THREE.BoxGeometry(0.3, 0.25, spanLength * 1.02);
    const railMesh = new THREE.Mesh(railGeo, woodMat);
    railMesh.position.set(centerX + railX, deckY + 1.15, centerZ);
    group.add(railMesh);

    // Mid safety rail beam
    const midRailGeo = new THREE.BoxGeometry(0.2, 0.15, spanLength * 1.02);
    const midRailMesh = new THREE.Mesh(midRailGeo, woodMat);
    midRailMesh.position.set(centerX + railX, deckY + 0.55, centerZ);
    group.add(midRailMesh);

    // Vertical posts
    const postCount = 6;
    for (let p = 0; p <= postCount; p++) {
      const pZ = centerZ - spanLength * 0.5 + (spanLength / postCount) * p;
      const postGeo = new THREE.BoxGeometry(0.28, 1.35, 0.28);
      const postMesh = new THREE.Mesh(postGeo, woodMat);
      postMesh.position.set(centerX + railX, deckY + 0.65, pZ);
      group.add(postMesh);
    }

    // Handrail collision barrier to prevent falling into the river
    collisionBoxes.push({
      x: centerX + railX,
      z: centerZ,
      rx: 0.35,
      rz: spanLength * 0.5,
    });
  });

  return { group, collisionBoxes };
}
