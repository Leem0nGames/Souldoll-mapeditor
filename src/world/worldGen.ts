/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { getTexture } from './textureManager';
import { getNPCSpriteTexture } from './npcSprites';
import { SoulDoll, Spirit, NPC, Chest, Enemy, GrassPatch, Signpost, ResourceNode, WorldBoss } from '../types';
import { getStoryNPCs } from '../data/npcRegistry';
import { LUMINATI_SCALE } from '../data/constants';
import {
  BuildingMaterialPalette,
  buildHeroHouse,
  buildRivalHouse,
  buildWorkshop,
  buildLaboratory,
  buildElderCottage,
} from './buildingGen';
import { buildCaveEntrance } from './caveGen';
import { buildSunTemple, buildSpectralCryptAndBoss } from './manualLocations';
import { ChunkManager, PerformanceProfile, detectPerformanceProfile } from './chunkManager';
import {
  createGroundTexture,
  createDenseTreeTexture,
  createSparkleTexture,
  createStoneWallTexture,
  createPropsSpriteTexture,
  createNPCTexture,
  createEnemyTexture,
  createChestTexture,
  createGrassTexture,
  createSoulDollTexture,
  createSpiritTexture,
  createMoonTexture,
  createHouseWallTexture,
  createHouseRoofTexture,
  createHouseSideTexture,
  createLabWallTexture,
  createLabRoofTexture,
  createCobblestoneRoadTexture,
  createFenceTexture,
  createHedgeTexture,
  createFlowerbedTexture,
  createSignpostTexture,
  createStreetLampTexture,
  createWoodPlankTexture,
  createStripedAwningTexture,
  createRunicGlyphTexture,
  createStoneWallNormalMap,
  createWoodWallNormalMap,
  createFallenAutumnLeavesTexture,
  createCobbleFlowersTexture,
  createTavernTableTexture,
  createSingleAutumnLeafTexture,
  createLanternHaloTexture,
} from './textures';

import { createBillboardMaterial } from './instancing';
import seedrandom from 'seedrandom';
import {
  getProceduralTerrainHeight,
  buildRiverMesh,
  buildRiverBridge,
  BRIDGE_CONFIG,
  getDistanceToRiver,
  sampleBiomeAt,
  isInsideProtectedZone,
  getActiveBiomeGenerator,
  RIVER_HALF_WIDTH,
  OCEAN_WATER_LEVEL,
} from './proceduralTerrain';
import { DEFAULT_TERRAIN_BOUNDS, type TerrainSampler } from './terrain/TerrainData';
import { StampedTerrainSampler } from './terrain/TerrainStampBlender';
import { SOULDOLLS_TERRAIN_STAMPS } from './terrain/terrainStamps.data';
import { ExclusionMask } from './scatter/ExclusionMask';
import { createDefaultScatterSystem, SCATTER_GROUP_IDS } from './scatter/scatter.data';
import { batchScatterPlacements } from './scatter/InstanceBatch';
import type { ScatterPlacement } from './scatter/ScatterDefinition';
import { worldManager } from './core/WorldManager';
import { createDefaultWorldDefinition, type WorldDefinition } from './core/WorldDefinition';

export interface TreeData {
  x: number;
  z: number;
  radius: number;
  scale: number;
  variant: number;
}

export interface FountainData {
  x: number;
  z: number;
  radius: number;
}

export interface CollisionBox {
  x: number;
  z: number;
  rx: number;
  rz: number;
}

export interface SparkleData {
  mesh: THREE.Sprite;
  baseY: number;
  phase: number;
  speed: number;
}

export interface GrassTuftData {
  x: number;
  z: number;
  baseY: number;
  phase: number;
}

let activeTerrainSampler: TerrainSampler | null = null;

export function getWorldDefinition(): WorldDefinition {
  return worldManager.getDefinition();
}

export function setWorldDefinition(definition: WorldDefinition): void {
  worldManager.setDefinition(definition);
}

export function setActiveTerrainSampler(sampler: TerrainSampler | null): void {
  activeTerrainSampler = sampler;
}

export function getActiveTerrainSampler(): TerrainSampler | null {
  return activeTerrainSampler;
}

export function getTerrainHeight(x: number, z: number): number {
  return activeTerrainSampler ? activeTerrainSampler.heightAt(x, z) : getProceduralTerrainHeight(x, z);
}

export function buildWorld(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  seed: string = 'default',
  profile?: PerformanceProfile
): {
  soulDolls: SoulDoll[];
  spirits: Spirit[];
  trees: TreeData[];
  collisionBoxes: CollisionBox[];
  lakeCenter: { x: number; z: number };
  npcs: NPC[];
  chests: Chest[];
  enemies: Enemy[];
  grassPatches: GrassPatch[];
  fountains: FountainData[];
  signposts: Signpost[];
  resourceNodes: ResourceNode[];
  worldBosses: WorldBoss[];
  chunkManager: ChunkManager;
  isInsideGrass: (x: number, z: number) => boolean;
  updateWorld: (delta: number, playerX: number, playerZ: number) => void;
  setTimeOfDay: (t: number) => void;
} {
  const perfProfile = profile ?? detectPerformanceProfile();
  const terrainSampler = new StampedTerrainSampler(
    getProceduralTerrainHeight,
    SOULDOLLS_TERRAIN_STAMPS,
    {
      bounds: DEFAULT_TERRAIN_BOUNDS,
      tileSize: 64,
      cellSize: 2,
      maxTiles: 256,
    }
  );
  setActiveTerrainSampler(terrainSampler);
  const worldDefinition = createDefaultWorldDefinition({
    id: seed,
    name: `${seed} world`,
    seed: { root: seed, algorithmVersion: 1 },
    bounds: DEFAULT_TERRAIN_BOUNDS,
    chunkSize: 64,
    terrain: {
      baseAlgorithmVersion: 1,
      stamps: SOULDOLLS_TERRAIN_STAMPS,
      workZones: [],
    },
  });
  worldManager.setDefinition(worldDefinition);
  worldManager.generate(terrainSampler, DEFAULT_TERRAIN_BOUNDS, worldDefinition.seed);
  const rng = seedrandom(seed);
  const scatterSeedConfig = { root: seed, algorithmVersion: 1 };
  const scatterSystem = createDefaultScatterSystem(scatterSeedConfig);
  const scatter = scatterSystem.generator;
  const biomeResolver = getActiveBiomeGenerator();
  const nightColor = new THREE.Color(0x0e1b38);
  const dayColor = new THREE.Color(0x7dd3fc);

  scene.background = nightColor.clone();
  scene.fog = new THREE.Fog(nightColor.getHex(), perfProfile.fogNear, perfProfile.fogFar);

  const hemi = new THREE.HemisphereLight(0x60a5fa, 0x162447, 0.95);
  scene.add(hemi);

  const moonLight = new THREE.DirectionalLight(0xe0f2fe, 1.35);
  moonLight.position.set(-80, 100, -80);
  scene.add(moonLight);

  const sunLight = new THREE.DirectionalLight(0xfff5cf, 1.5);
  sunLight.position.set(80, 100, 80);
  scene.add(sunLight);

  const textureLoader = new THREE.TextureLoader();
  const groundTex = textureLoader.load('/assets/tiles/ground_tile.webp');
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.magFilter = THREE.NearestFilter;
  groundTex.minFilter = THREE.NearestFilter;
  groundTex.colorSpace = THREE.SRGBColorSpace;

  const moonTex = getTexture('moon', createMoonTexture);
  const moonMat = new THREE.SpriteMaterial({
    map: moonTex,
    transparent: true,
  });
  const moonSprite = new THREE.Sprite(moonMat);
  moonSprite.scale.set(27.04, 27.04, 1);
  moonSprite.position.set(-120, 117, -140);
  scene.add(moonSprite);

  const starCount = 300;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    starPos[i] = (rng() - 0.5) * 350;
    starPos[i + 1] = 60 + rng() * 60;
    starPos[i + 2] = (rng() - 0.5) * 350;
  }
  const starsGeo = new THREE.BufferGeometry();
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starsMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    sizeAttenuation: true,
    transparent: true,
  });
  const stars = new THREE.Points(starsGeo, starsMat);
  scene.add(stars);

  const mountainGroup = new THREE.Group();
  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.1,
  });

  const mountainCount = 18;
  const mountainGeo = new THREE.ConeGeometry(1, 1, 4); // Prototype
  for (let i = 0; i < mountainCount; i++) {
    const angle = (i / mountainCount) * Math.PI * 2;
    const dist = 320 + rng() * 40;
    const mx = Math.cos(angle) * dist;
    const mz = Math.sin(angle) * dist;

    const mMesh = new THREE.Mesh(mountainGeo, mountainMat);
    mMesh.scale.set(40 + rng() * 20, 35 + rng() * 25, 40 + rng() * 20);
    mMesh.position.set(mx, getTerrainHeight(mx, mz) + (35 + rng() * 25) * 0.5 - 10, mz);
    mountainGroup.add(mMesh);
  }
  scene.add(mountainGroup);

  const loadTileByName = (name: string, repeatX = 1, repeatY = 1) => {
    const path = `/assets/tiles/building/${name}.webp`;
    const tex = textureLoader.load(path);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const lakeX = 100;
  const lakeZ = -80;
  const lakeY = getTerrainHeight(lakeX, lakeZ) + 0.2;

  const waterGeo = new THREE.CircleGeometry(26, 32);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.82,
    roughness: 0.15,
    metalness: 0.7,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(lakeX, lakeY, lakeZ);
  scene.add(waterMesh);

  // --- PROCEDURAL RIVER MESH ---
  const riverMesh = buildRiverMesh(140);
  scene.add(riverMesh);

  const collisionBoxes: CollisionBox[] = [];

  // --- RUSTIC WOODEN TIMBER BRIDGE OVER THE RIVER (Ruta 1 Crossing) ---
  const bridgePlankTex = loadTileByName('wall_wood_planks', 2, 2);
  const bridgeWoodNormalMap = createWoodWallNormalMap();
  const bridgeData = buildRiverBridge(bridgePlankTex, bridgeWoodNormalMap);
  scene.add(bridgeData.group);
  collisionBoxes.push(...bridgeData.collisionBoxes);

  // Bridge Approach Amber Lanterns
  const bLampTex = textureLoader.load('/assets/props/street_lamp.webp');
  bLampTex.magFilter = THREE.NearestFilter;
  bLampTex.minFilter = THREE.NearestFilter;
  bLampTex.colorSpace = THREE.SRGBColorSpace;
  const bLampMat = new THREE.SpriteMaterial({ map: bLampTex, transparent: true });

  const bHaloTex = getTexture('lantern_halo', createLanternHaloTexture);
  const bHaloMat = new THREE.SpriteMaterial({
    map: bHaloTex,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  [-BRIDGE_CONFIG.spanLength * 0.46, BRIDGE_CONFIG.spanLength * 0.46].forEach(zOff => {
    [-BRIDGE_CONFIG.width * 0.52, BRIDGE_CONFIG.width * 0.52].forEach(xOff => {
      const lx = BRIDGE_CONFIG.centerX + xOff;
      const lz = BRIDGE_CONFIG.centerZ + zOff;
      const ly = getTerrainHeight(lx, lz);

      const lampSprite = new THREE.Sprite(bLampMat);
      lampSprite.scale.set(LUMINATI_SCALE.STREET_LAMP_WIDTH * 0.85, LUMINATI_SCALE.STREET_LAMP_HEIGHT * 0.85, 1);
      lampSprite.position.set(lx, ly + LUMINATI_SCALE.STREET_LAMP_HEIGHT * 0.42, lz);
      scene.add(lampSprite);

      const lampHalo = new THREE.Sprite(bHaloMat);
      lampHalo.scale.set(3.6, 3.6, 1);
      lampHalo.position.set(lx, ly + 3.8, lz);
      scene.add(lampHalo);

      const bLight = new THREE.PointLight(0xf59e0b, 1.4, 12);
      bLight.position.set(lx, ly + 4.0, lz);
      scene.add(bLight);
    });
  });

  // ==========================================
  // REGIONAL ROAD NETWORK & PATH ARCHITECTURE
  // ==========================================
  // 1. Ruta 1 (Senda de los Susurros): Extends north from the Grand Archway (0, 43)
  const ROUTE_1_WAYPOINTS = [
    new THREE.Vector3(0, 0, 43),
    new THREE.Vector3(0, 0, 58),
    new THREE.Vector3(3, 0, 76),
    new THREE.Vector3(-4, 0, 98),
    new THREE.Vector3(6, 0, 122), // Rest stop at (6, 122)
    new THREE.Vector3(2, 0, 148),
    new THREE.Vector3(-3, 0, 172),
    new THREE.Vector3(0, 0, 196),
  ];

  // 2. Sendero del Bosque Umbrío: Winding forest trail through ancient groves to Sacred Altar
  const FOREST_TRAIL_WAYPOINTS = [
    new THREE.Vector3(3, 0, 76),
    new THREE.Vector3(-18, 0, 72),
    new THREE.Vector3(-38, 0, 58),
    new THREE.Vector3(-52, 0, 34),
    new THREE.Vector3(-58, 0, 4),
    new THREE.Vector3(-60, 0, -32),
    new THREE.Vector3(-64, 0, -62), // Santuario del Bosque Umbrío (Healing Fountain)
    new THREE.Vector3(-88, 0, -82),
    new THREE.Vector3(-114, 0, -100),
    new THREE.Vector3(-140, 0, -118), // Deep Enchanted Glade
  ];

  // 3. Sendero del Fulgor: Ascends east into the thunder crags to the Resonance Monolith
  const FULGOR_TRAIL_WAYPOINTS = [
    new THREE.Vector3(3, 0, 76),
    new THREE.Vector3(24, 0, 70),
    new THREE.Vector3(45, 0, 54),
    new THREE.Vector3(65, 0, 32),
    new THREE.Vector3(82, 0, 8),   // Monolito del Fulgor (Tower Fountain)
    new THREE.Vector3(105, 0, -2),
    new THREE.Vector3(130, 0, 16),
    new THREE.Vector3(158, 0, 42), // Thunder Peak Outlook
  ];

  // 4. Sendero del Lago Esmeralda: Winds from South Pier along the lakeshore
  const LAKE_TRAIL_WAYPOINTS = [
    new THREE.Vector3(0, 0, -30),
    new THREE.Vector3(18, 0, -42),
    new THREE.Vector3(42, 0, -56),
    new THREE.Vector3(68, 0, -70),
    new THREE.Vector3(88, 0, -78),  // Lake Dock & Beach Pavilion
    new THREE.Vector3(108, 0, -64),
    new THREE.Vector3(126, 0, -78),
    new THREE.Vector3(120, 0, -102),
  ];

  // 5. Senda del Templo Solar: Branches west after crossing the River Bridge to Sun Temple (-38, 136)
  const TEMPLE_TRAIL_WAYPOINTS = [
    new THREE.Vector3(-4, 0, 98),
    new THREE.Vector3(-20, 0, 114),
    new THREE.Vector3(-38, 0, 125),
  ];

  // 6. Senda de la Grieta Espectral: Branches south from Lake Trail to Spectral Crypt (68, -128)
  const CRYPT_TRAIL_WAYPOINTS = [
    new THREE.Vector3(42, 0, -56),
    new THREE.Vector3(56, 0, -92),
    new THREE.Vector3(68, 0, -116),
  ];

  const distToSegment = (px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const l2 = dx * dx + dz * dz;
    if (l2 === 0) return Math.hypot(px - x1, pz - z1);
    let t = ((px - x1) * dx + (pz - z1) * dz) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
  };

  const distToPolyline = (px: number, pz: number, pts: THREE.Vector3[]): number => {
    let minDist = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(px, pz, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
      if (d < minDist) minDist = d;
    }
    return minDist;
  };

  const isNearAnyRoad = (x: number, z: number, margin = 5.0): boolean => {
    if (distToPolyline(x, z, ROUTE_1_WAYPOINTS) < margin) return true;
    if (distToPolyline(x, z, FOREST_TRAIL_WAYPOINTS) < margin) return true;
    if (distToPolyline(x, z, FULGOR_TRAIL_WAYPOINTS) < margin) return true;
    if (distToPolyline(x, z, LAKE_TRAIL_WAYPOINTS) < margin) return true;
    if (distToPolyline(x, z, TEMPLE_TRAIL_WAYPOINTS) < margin) return true;
    if (distToPolyline(x, z, CRYPT_TRAIL_WAYPOINTS) < margin) return true;
    return false;
  };

  // --- CONTINUOUS CHUNKED TERRAIN & NATURAL FORMATIONS STREAMING ---
  const chunkManager = new ChunkManager(scene, groundTex, seed, perfProfile, isNearAnyRoad, terrainSampler, scatter);
  chunkManager.preloadAround(0, 16);

  const isInsideVillageArea = (x: number, z: number): boolean => {
    return x >= -48 && x <= 48 && z >= -42 && z <= 52;
  };

  // Quad strip road ribbon generator that perfectly hugs terrain elevations
  const buildCurvedRoadMesh = (
    waypoints: THREE.Vector3[],
    width: number,
    material: THREE.Material,
    subdivisions = 48,
    uTiling = 1.0,
    vTiling = 0.18
  ): THREE.Mesh => {
    const curve = new THREE.CatmullRomCurve3(waypoints);
    const spacedPoints = curve.getSpacedPoints(subdivisions);

    const numVertices = spacedPoints.length * 2;
    const numFaces = (spacedPoints.length - 1) * 2;

    const positions = new Float32Array(numVertices * 3);
    const uvs = new Float32Array(numVertices * 2);
    const indices = new Uint16Array(numFaces * 3);

    let accumulatedDist = 0;

    for (let i = 0; i < spacedPoints.length; i++) {
      const curr = spacedPoints[i];
      let tangent = new THREE.Vector3(0, 0, 1);
      if (i < spacedPoints.length - 1) {
        tangent.subVectors(spacedPoints[i + 1], curr).normalize();
        accumulatedDist += curr.distanceTo(spacedPoints[i + 1]);
      } else if (i > 0) {
        tangent.subVectors(curr, spacedPoints[i - 1]).normalize();
      }

      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const lx = curr.x - normal.x * (width * 0.5);
      const lz = curr.z - normal.z * (width * 0.5);
      const ly = getTerrainHeight(lx, lz) + 0.055;

      const rx = curr.x + normal.x * (width * 0.5);
      const rz = curr.z + normal.z * (width * 0.5);
      const ry = getTerrainHeight(rx, rz) + 0.055;

      const vIdx = i * 2;
      positions[vIdx * 3] = lx;
      positions[vIdx * 3 + 1] = ly;
      positions[vIdx * 3 + 2] = lz;

      positions[(vIdx + 1) * 3] = rx;
      positions[(vIdx + 1) * 3 + 1] = ry;
      positions[(vIdx + 1) * 3 + 2] = rz;

      const vCoord = accumulatedDist * vTiling;
      uvs[vIdx * 2] = 0;
      uvs[vIdx * 2 + 1] = vCoord;

      uvs[(vIdx + 1) * 2] = uTiling;
      uvs[(vIdx + 1) * 2 + 1] = vCoord;

      if (i < spacedPoints.length - 1) {
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

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    return new THREE.Mesh(geo, material);
  };

  // --- BUILD THE PHYSICAL ROADS ---
  const route1Mat = new THREE.MeshStandardMaterial({
    map: loadTileByName('ground_dirt_pebbles', 2, 2),
    roughness: 0.9,
  });
  const route1Mesh = buildCurvedRoadMesh(ROUTE_1_WAYPOINTS, 5.6, route1Mat, 56, 1.4, 0.22);
  scene.add(route1Mesh);

  const forestTrailMat = new THREE.MeshStandardMaterial({
    map: loadTileByName('ground_dirt_dark', 2, 2),
    roughness: 0.95,
  });
  const forestTrailMesh = buildCurvedRoadMesh(FOREST_TRAIL_WAYPOINTS, 4.8, forestTrailMat, 64, 1.2, 0.22);
  scene.add(forestTrailMesh);

  const fulgorTrailMat = new THREE.MeshStandardMaterial({
    map: loadTileByName('ground_gravel', 2, 2),
    roughness: 0.85,
  });
  const fulgorTrailMesh = buildCurvedRoadMesh(FULGOR_TRAIL_WAYPOINTS, 5.0, fulgorTrailMat, 56, 1.4, 0.22);
  scene.add(fulgorTrailMesh);

  const lakeTrailMat = new THREE.MeshStandardMaterial({
    map: loadTileByName('ground_cobble_round', 2, 2),
    roughness: 0.85,
  });
  const lakeTrailMesh = buildCurvedRoadMesh(LAKE_TRAIL_WAYPOINTS, 4.6, lakeTrailMat, 56, 1.2, 0.22);
  scene.add(lakeTrailMesh);

  const templeTrailMesh = buildCurvedRoadMesh(TEMPLE_TRAIL_WAYPOINTS, 4.4, lakeTrailMat, 28, 1.2, 0.22);
  scene.add(templeTrailMesh);

  const cryptTrailMesh = buildCurvedRoadMesh(CRYPT_TRAIL_WAYPOINTS, 4.4, fulgorTrailMat, 32, 1.2, 0.22);
  scene.add(cryptTrailMesh);

  // --- ROUTE 1 REST STOP (x: 6, z: 122) ---
  const restStopGeo = new THREE.PlaneGeometry(12.0, 9.0);
  restStopGeo.rotateX(-Math.PI / 2);
  const restStopMat = new THREE.MeshStandardMaterial({ map: loadTileByName('ground_flagstone', 2, 2), roughness: 0.85 });
  const restStopMesh = new THREE.Mesh(restStopGeo, restStopMat);
  const rY = getTerrainHeight(6, 122) + 0.06;
  restStopMesh.position.set(6, rY, 122);
  scene.add(restStopMesh);

  // Rest stop timber benches
  const benchWoodTex = loadTileByName('wall_wood_planks', 1, 1);
  const benchMat = new THREE.MeshStandardMaterial({ map: benchWoodTex, roughness: 0.75 });
  const benchGeo = new THREE.BoxGeometry(4.0, 0.7, 1.2);
  const bench1 = new THREE.Mesh(benchGeo, benchMat);
  bench1.position.set(4.5, rY + 0.45, 124.5);
  scene.add(bench1);
  collisionBoxes.push({ x: 4.5, z: 124.5, rx: 2.2, rz: 1.0 });

  const bench2 = new THREE.Mesh(benchGeo, benchMat);
  bench2.position.set(8.5, rY + 0.45, 120.0);
  bench2.rotation.y = Math.PI / 2;
  scene.add(bench2);
  collisionBoxes.push({ x: 8.5, z: 120.0, rx: 1.0, rz: 2.2 });

  // Rest stop street lamp
  const rLampTex = textureLoader.load('/assets/props/street_lamp.webp');
  rLampTex.magFilter = THREE.NearestFilter;
  rLampTex.minFilter = THREE.NearestFilter;
  rLampTex.colorSpace = THREE.SRGBColorSpace;
  const rLampMat = new THREE.SpriteMaterial({ map: rLampTex, transparent: true });
  const rLamp = new THREE.Sprite(rLampMat);
  rLamp.scale.set(LUMINATI_SCALE.STREET_LAMP_WIDTH, LUMINATI_SCALE.STREET_LAMP_HEIGHT, 1);
  rLamp.position.set(9.0, rY + LUMINATI_SCALE.STREET_LAMP_HEIGHT * 0.48, 124.0);
  scene.add(rLamp);

  const rHaloTex = getTexture('lantern_halo', createLanternHaloTexture);
  const rHaloMat = new THREE.SpriteMaterial({ map: rHaloTex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const rHalo = new THREE.Sprite(rHaloMat);
  rHalo.scale.set(4.5, 4.5, 1);
  rHalo.position.set(9.0, rY + LUMINATI_SCALE.STREET_LAMP_HEIGHT * 0.35, 124.0);
  scene.add(rHalo);

  const rLight = new THREE.PointLight(0xf59e0b, 1.5, 14);
  rLight.position.set(9.0, rY + 4.5, 124.0);
  scene.add(rLight);

  // --- SANTUARIO DEL BOSQUE UMBRÍO CLEARING (x: -64, z: -62) ---
  const altarDaisGeo = new THREE.CircleGeometry(11.0, 24);
  altarDaisGeo.rotateX(-Math.PI / 2);
  const altarDaisMat = new THREE.MeshStandardMaterial({ map: loadTileByName('wall_stone_blocks', 3, 3), roughness: 0.9 });
  const altarDais = new THREE.Mesh(altarDaisGeo, altarDaisMat);
  const altarY = getTerrainHeight(-64, -62) + 0.055;
  altarDais.position.set(-64, altarY, -62);
  scene.add(altarDais);

  // 4 ancient mossy stone pillars around the healing fountain
  const sanctuaryPillarMat = new THREE.MeshStandardMaterial({ map: loadTileByName('wall_stone_blocks', 1, 2), roughness: 0.85 });
  const sanctuaryPillarGeo = new THREE.BoxGeometry(1.6, 5.5, 1.6);
  [
    { x: -68.5, z: -66.5 },
    { x: -59.5, z: -66.5 },
    { x: -68.5, z: -57.5 },
    { x: -59.5, z: -57.5 },
  ].forEach(p => {
    const py = getTerrainHeight(p.x, p.z);
    const pil = new THREE.Mesh(sanctuaryPillarGeo, sanctuaryPillarMat);
    pil.position.set(p.x, py + 2.75, p.z);
    scene.add(pil);
    collisionBoxes.push({ x: p.x, z: p.z, rx: 1.2, rz: 1.2 });
  });

  // --- MONOLITO DEL FULGOR DAIS (x: 82, z: 8) ---
  const monolithDaisGeo = new THREE.CircleGeometry(12.0, 24);
  monolithDaisGeo.rotateX(-Math.PI / 2);
  const monolithDaisMat = new THREE.MeshStandardMaterial({ map: loadTileByName('ground_flagstone', 3, 3), roughness: 0.85 });
  const monolithDais = new THREE.Mesh(monolithDaisGeo, monolithDaisMat);
  const monoY = getTerrainHeight(82, 8) + 0.055;
  monolithDais.position.set(82, monoY, 8);
  scene.add(monolithDais);

  // 4 Thunder stone monoliths
  const monoPillarMat = new THREE.MeshStandardMaterial({ map: loadTileByName('wall_stone_brick', 1, 3), roughness: 0.75 });
  const monoPillarGeo = new THREE.BoxGeometry(1.8, 8.5, 1.8);
  [
    { x: 76.5, z: 8 },
    { x: 87.5, z: 8 },
    { x: 82, z: 2.5 },
    { x: 82, z: 13.5 },
  ].forEach(p => {
    const py = getTerrainHeight(p.x, p.z);
    const pil = new THREE.Mesh(monoPillarGeo, monoPillarMat);
    pil.position.set(p.x, py + 4.25, p.z);
    scene.add(pil);
    collisionBoxes.push({ x: p.x, z: p.z, rx: 1.4, rz: 1.4 });
  });

  // --- EMERALD LAKE FISHING DOCK (x: 88, z: -78) ---
  const lakeDockGeo = new THREE.BoxGeometry(5.0, 0.6, 14.0);
  const lakeDockMesh = new THREE.Mesh(lakeDockGeo, benchMat);
  const lakeDockY = getTerrainHeight(88, -78) + 0.35;
  lakeDockMesh.position.set(88, lakeDockY, -78);
  scene.add(lakeDockMesh);
  collisionBoxes.push({ x: 88, z: -78, rx: 2.8, rz: 7.2 });

  // ==========================================
  // INTENTIONAL TALL GRASS PLACEMENT
  // ==========================================
  const grassPatches: GrassPatch[] = [];
  const grassTex = getTexture('grass', createGrassTexture);
  
  // Instanced Grass
  const billboardGeo = new THREE.PlaneGeometry(1, 1);
  const grassInstancedMat = createBillboardMaterial(grassTex);
  grassInstancedMat.uniforms.swayAmount.value = 0.15;
  const dummy = new THREE.Object3D();
  const grassPlacements: ScatterPlacement[] = [];
  const grassPointKeys = new Set<string>();
  const grassExclusions = new ExclusionMask();
  const grassVergeGroup = scatter.database.require(SCATTER_GROUP_IDS.grassVerge);
  const grassWildGroup = scatter.database.require(SCATTER_GROUP_IDS.grassWild);

  const addGrassPatch = (
    patch: { x: number; z: number; radius: number },
    group: typeof grassVergeGroup
  ): void => {
    grassPatches.push(patch);
    const bounds = {
      minX: patch.x - patch.radius,
      minZ: patch.z - patch.radius,
      maxX: patch.x + patch.radius,
      maxZ: patch.z + patch.radius,
    };
    const placements = scatter.generate({
      group,
      bounds,
      terrain: terrainSampler,
      biome: biomeResolver,
      exclusions: grassExclusions,
      seed: scatterSeedConfig,
      blocked: (x, z) => Math.hypot(x - patch.x, z - patch.z) > patch.radius,
    });

    for (let i = 0; i < placements.length; i++) {
      const placement = placements[i];
      const key = `${placement.x.toFixed(2)},${placement.z.toFixed(2)}`;
      if (grassPointKeys.has(key)) continue;
      grassPointKeys.add(key);
      grassPlacements.push(placement);
    }
  };

  // Deliberate regional grass zones (flanking roads, clearings, and wilderness)
  const intentionalGrassZones: { x: number; z: number; radius: number }[] = [
    // Route 1 road verges (left and right shoulders)
    { x: -10, z: 86, radius: 5.0 },
    { x: 10, z: 106, radius: 5.0 },
    { x: -10, z: 140, radius: 5.2 },
    { x: 9, z: 168, radius: 5.2 },
    // Bosque Umbrío woodland clearings
    { x: -44, z: 22, radius: 6.0 },
    { x: -78, z: -25, radius: 6.5 },
    { x: -95, z: -70, radius: 7.0 },
    { x: -128, z: -105, radius: 6.5 },
    // Tierras Altas crags
    { x: 52, z: 40, radius: 5.8 },
    { x: 98, z: 24, radius: 6.2 },
    { x: 125, z: 32, radius: 6.5 },
    { x: 148, z: 55, radius: 6.8 },
    // Lago Esmeralda marshy banks
    { x: 78, z: -62, radius: 5.5 },
    { x: 122, z: -68, radius: 5.8 },
    { x: 114, z: -95, radius: 6.0 },
  ];

  intentionalGrassZones.forEach((gz) => addGrassPatch(gz, grassVergeGroup));

  // Additional wilderness patches away from roads, protected locations, and sea
  let wildernessAttempts = 0;
  while (grassPatches.length < 32 && wildernessAttempts < 350) {
    wildernessAttempts++;
    const gx = (rng() - 0.5) * 340;
    const gz = (rng() - 0.5) * 340;
    const gRadius = 3.5 + rng() * 3.5;

    if (isInsideVillageArea(gx, gz)) continue;
    if (isInsideProtectedZone(gx, gz, gRadius + 2.0)) continue;
    if (isNearAnyRoad(gx, gz, 4.5)) continue;
    if (Math.hypot(gx - lakeX, gz - lakeZ) < 32) continue;
    if (getDistanceToRiver(gx, gz).distance < RIVER_HALF_WIDTH + 3.0) continue;
    if (getTerrainHeight(gx, gz) < OCEAN_WATER_LEVEL + 0.6) continue;

    addGrassPatch({ x: gx, z: gz, radius: gRadius }, grassWildGroup);
  }

  const grassChunks: { x: number; z: number; meshes: THREE.InstancedMesh[] }[] = [];
  const grassBatches = batchScatterPlacements(grassPlacements, 100);
  for (let b = 0; b < grassBatches.length; b++) {
    const batch = grassBatches[b];
    if (batch.placements.length === 0) continue;
    const iMesh = new THREE.InstancedMesh(
      billboardGeo,
      grassInstancedMat,
      batch.placements.length
    );
    for (let i = 0; i < batch.placements.length; i++) {
      const placement = batch.placements[i];
      dummy.position.set(
        placement.x,
        placement.y + LUMINATI_SCALE.TALL_GRASS_SIZE * 0.5,
        placement.z
      );
      dummy.scale.set(LUMINATI_SCALE.TALL_GRASS_SIZE, LUMINATI_SCALE.TALL_GRASS_SIZE, 1);
      dummy.updateMatrix();
      iMesh.setMatrixAt(i, dummy.matrix);
    }
    iMesh.instanceMatrix.needsUpdate = true;
    iMesh.computeBoundingSphere();
    scene.add(iMesh);
    grassChunks.push({
      x: (batch.minX + batch.maxX) * 0.5,
      z: (batch.minZ + batch.maxZ) * 0.5,
      meshes: [iMesh],
    });
  }

  const isInsideGrass = (x: number, z: number): boolean => {
    for (let i = 0; i < grassPatches.length; i++) {
      const p = grassPatches[i];
      if (Math.hypot(p.x - x, p.z - z) <= p.radius) {
        return true;
      }
    }
    return false;
  };

  const fountains: { x: number; z: number; radius: number; orbMesh: THREE.Mesh; baseY: number }[] = [
    { x: 0, z: -5.5, radius: 3.5, orbMesh: null as any, baseY: 0 },
    { x: 82, z: 8, radius: 3.5, orbMesh: null as any, baseY: 0 },
    { x: -64, z: -62, radius: 3.5, orbMesh: null as any, baseY: 0 },
  ];

  const fountainGroup = new THREE.Group();
  const fountainStoneTex = textureLoader.load('/assets/tiles/building/wall_stone_blocks.webp');
  fountainStoneTex.magFilter = THREE.NearestFilter;
  fountainStoneTex.minFilter = THREE.NearestFilter;
  fountainStoneTex.colorSpace = THREE.SRGBColorSpace;
  const fountainStoneMat = new THREE.MeshStandardMaterial({
    map: fountainStoneTex,
    roughness: 0.8,
  });
  const fountainWaterMat = new THREE.MeshStandardMaterial({
    color: 0x5fe3d2,
    emissive: 0x0d9488,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.8,
  });
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x5fe3d2,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  fountains.forEach(f => {
    const fy = getTerrainHeight(f.x, f.z);
    f.baseY = fy + 1.8;

    const basinGeo = new THREE.CylinderGeometry(2.4, 2.8, 1.2, 8);
    const basinMesh = new THREE.Mesh(basinGeo, fountainStoneMat);
    basinMesh.position.set(f.x, fy + 0.6, f.z);
    fountainGroup.add(basinMesh);

    const waterGeo = new THREE.CircleGeometry(2.2, 16);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMesh = new THREE.Mesh(waterGeo, fountainWaterMat);
    waterMesh.position.set(f.x, fy + 1.15, f.z);
    fountainGroup.add(waterMesh);

    const orbGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    orbMesh.position.set(f.x, f.baseY, f.z);
    fountainGroup.add(orbMesh);
    f.orbMesh = orbMesh;

    const light = new THREE.PointLight(0x5fe3d2, 1.8, 14);
    light.position.set(f.x, fy + 2.2, f.z);
    fountainGroup.add(light);

    collisionBoxes.push({ x: f.x, z: f.z, rx: 2.4, rz: 2.4 });
  });
  scene.add(fountainGroup);

  const npcs: NPC[] = getStoryNPCs();

  const npcGroup = new THREE.Group();
  npcs.forEach((n) => {
    const spriteRef = n.spriteRef ?? n.spriteIndex ?? 0;
    const tex = getNPCSpriteTexture(spriteRef);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    // Aspect ratio of NPC06 & NPC09 is 192 x 344 (ratio ~0.558)
    sprite.scale.set(3.6, 6.45, 1);
    const yPos = getTerrainHeight(n.x, n.z) + 3.22;
    sprite.position.set(n.x, yPos, n.z);
    npcGroup.add(sprite);

    // Collision box so player cannot walk through the NPC
    collisionBoxes.push({ x: n.x, z: n.z, rx: 1.2, rz: 1.2 });
  });
  scene.add(npcGroup);

  const chests: Chest[] = [
    { id: 'chest-quest', x: 110, z: -75, opened: false, rewardType: 'gold', rewardAmount: 150, rewardName: '150x Oro Ancestral' },
    { id: 'chest-2', x: -80, z: -60, opened: false, rewardType: 'item', rewardAmount: 1, rewardName: 'Poción de Vida Mágica' },
    { id: 'chest-3', x: 95, z: 5, opened: false, rewardType: 'gold', rewardAmount: 100, rewardName: '100x Oro de la Torre' },
    { id: 'chest-temple', x: -33.5, z: 135.5, opened: false, rewardType: 'gold', rewardAmount: 200, rewardName: '200x Oro Solar del Alba' },
  ];

  const chestGroup = new THREE.Group();
  const chestSprites: THREE.Sprite[] = [];
  const closedChestTex = getTexture('chest_closed', () => createChestTexture(false));
  const openChestTex = getTexture('chest_open', () => createChestTexture(true));

  chests.forEach(c => {
    const mat = new THREE.SpriteMaterial({ map: closedChestTex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(LUMINATI_SCALE.CHEST_SIZE, LUMINATI_SCALE.CHEST_SIZE, 1);
    sprite.position.set(c.x, getTerrainHeight(c.x, c.z) + (LUMINATI_SCALE.CHEST_SIZE * 0.5), c.z);
    chestGroup.add(sprite);
    chestSprites.push(sprite);
  });
  scene.add(chestGroup);

  const enemies: Enemy[] = [];
  const enemySprites: THREE.Sprite[] = [];
  const enemyTex = getTexture('enemy_blob', createEnemyTexture);

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const ex = Math.cos(angle) * 45;
    const ez = Math.sin(angle) * 45;
    enemies.push({
      id: `enemy-${i}`, x: ex, z: ez, startX: ex, startZ: ez,
      hp: 3, maxHp: 3, radius: 2.0, patrolDist: 15, speed: 2.5, alive: true,
    });

    const mat = new THREE.SpriteMaterial({ map: enemyTex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4.0, 4.0, 1);
    sprite.position.set(ex, getTerrainHeight(ex, ez) + 2.0, ez);
    scene.add(sprite);
    enemySprites.push(sprite);
  }

  const villageGroup = new THREE.Group();



  const loadBuildingTile = (row: number, col: number, repeatX = 1, repeatY = 1) => {
    const path = `/assets/tiles/building/tile_${row}_${col}.webp`;
    const tex = textureLoader.load(path);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  // Helper to create a material with proportional tiling from named texture and normal map
  const stoneNormalMap = createStoneWallNormalMap();
  const woodNormalMap = createWoodWallNormalMap();

  const createProportionalNamedMat = (name: string, width: number, height: number, roughness = 0.8, unitsPerTile = 7.5, normalMap: THREE.Texture | null = stoneNormalMap) => {
    const rx = Math.max(1, Math.round(width / unitsPerTile));
    const ry = Math.max(1, Math.round(height / unitsPerTile));
    const params: THREE.MeshStandardMaterialParameters = {
      map: loadTileByName(name, rx, ry),
      roughness,
    };
    if (normalMap) {
      params.normalMap = normalMap;
      params.normalScale = new THREE.Vector2(0.55, 0.55);
    }
    return new THREE.MeshStandardMaterial(params);
  };

  const createProportionalMat = (row: number, col: number, width: number, height: number, roughness = 0.8, unitsPerTile = 7.5) => {
    const rx = Math.max(1, Math.round(width / unitsPerTile));
    const ry = Math.max(1, Math.round(height / unitsPerTile));
    return new THREE.MeshStandardMaterial({ map: loadBuildingTile(row, col, rx, ry), roughness });
  };

  const doorMat = new THREE.SpriteMaterial({ map: loadTileByName('door_wood'), transparent: true });
  const windowMat = new THREE.SpriteMaterial({ map: loadTileByName('window_4pane'), transparent: true });

  const cobbleMat = (w: number, h: number) => createProportionalNamedMat('ground_cobblestone', w, h, 0.9, 2.5); 
  const roadMat = (w: number, h: number) => createProportionalNamedMat('ground_flagstone', w, h, 0.9, 3.2);
  const crossRoadMat = (w: number, h: number) => createProportionalNamedMat('ground_flagstone', w, h, 0.9, 3.2);
  const stoneBrickMat = (w: number, h: number) => createProportionalNamedMat('wall_stone_brick', w, h, 0.8, 6.0); 
  const terracottaRoofMat = (w: number, h: number) => createProportionalNamedMat('roof_terracotta', w, h, 0.7, 5.0);
  const darkRoofMat = (w: number, h: number) => createProportionalNamedMat('roof_slate_dark', w, h, 0.7, 5.0);
  const woodPlankMat = (w: number, h: number) => createProportionalNamedMat('wall_wood_planks', w, h, 0.75, 4.0, woodNormalMap);
  const mossyStoneMat = (w: number, h: number) => createProportionalNamedMat('wall_stone_blocks', w, h, 0.85, 3.5, stoneNormalMap); 
  const slateMat = (w: number, h: number) => createProportionalNamedMat('roof_slate_dark', w, h, 0.85, 3.5, stoneNormalMap);
  const bronzeDomeMat = new THREE.MeshStandardMaterial({ color: 0xcd7f32, metalness: 0.85, roughness: 0.25 });

  const plainStuccoMat = (w: number, h: number) => createProportionalNamedMat('wall_timber_stucco', w, h, 0.8, 6.0, stoneNormalMap);
  const timberXMat = (w: number, h: number) => createProportionalNamedMat('wall_timber_x', w, h, 0.8, 6.0, woodNormalMap);
  const timberVMat = (w: number, h: number) => createProportionalNamedMat('wall_timber_v', w, h, 0.8, 6.0, woodNormalMap);
  const timberWallMaterials = (w: number, h: number, d: number) => {
    const sideX = timberVMat(d, h);
    const sideZ = timberXMat(w, h);
    const top = woodPlankMat(w, d);
    return [sideX, sideX, top, top, sideZ, sideZ];
  };

  const woodWallMaterials = (w: number, h: number, d: number) => {
    const sideX = createProportionalNamedMat('wall_wood_vertical', d, h, 0.8, 5.0, woodNormalMap);
    const sideZ = createProportionalNamedMat('wall_wood_planks', w, h, 0.8, 5.0, woodNormalMap);
    const top = woodPlankMat(w, d);
    return [sideX, sideX, top, top, sideZ, sideZ];
  };

  const blueRoofMat = (w: number, h: number) => createProportionalNamedMat('roof_slate_blue', w, h, 0.7, 5.0);
  const thatchRoofMat = (w: number, h: number) => createProportionalNamedMat('roof_thatch', w, h, 0.9, 4.0);
  const redBrickMat = (w: number, h: number) => createProportionalNamedMat('wall_red_brick', w, h, 0.8, 4.0);
  const cobbleRoundMat = (w: number, h: number) => createProportionalNamedMat('ground_cobble_round', w, h, 0.85, 3.5);

  const buildingPalette: BuildingMaterialPalette = {
    mossyStoneMat,
    stoneBrickMat,
    redBrickMat,
    cobbleRoundMat,
    woodPlankMat,
    timberXMat,
    timberVMat,
    plainStuccoMat,
    woodWallMaterials,
    timberWallMaterials,
    terracottaRoofMat,
    darkRoofMat,
    blueRoofMat,
    thatchRoofMat,
    bronzeDomeMat,
    doorSpriteMat: doorMat,
    doubleDoorSpriteMat: new THREE.SpriteMaterial({ map: loadTileByName('door_wood'), transparent: true }),
    windowSpriteMat: windowMat,
    window2PaneSpriteMat: new THREE.SpriteMaterial({ map: loadTileByName('window_2pane'), transparent: true }),
  };

  const cratePropTex = getTexture('crate_prop', () => createPropsSpriteTexture('crate'));
  const barrelPropTex = getTexture('barrel_prop', () => createPropsSpriteTexture('barrel'));
  const cratePropMat = new THREE.SpriteMaterial({ map: cratePropTex, transparent: true });
  const barrelPropMat = new THREE.SpriteMaterial({ map: barrelPropTex, transparent: true });

  const fenceTex = getTexture('fence', createFenceTexture);
  const fenceMat = new THREE.SpriteMaterial({ map: fenceTex, transparent: true });
  const lampTex = textureLoader.load('/assets/props/street_lamp.webp');
  lampTex.magFilter = THREE.NearestFilter;
  lampTex.minFilter = THREE.NearestFilter;
  lampTex.colorSpace = THREE.SRGBColorSpace;
  const lampMat = new THREE.SpriteMaterial({ map: lampTex, transparent: true });

  const lanternHaloTex = getTexture('lantern_halo', createLanternHaloTexture);
  const lanternHaloMat = new THREE.SpriteMaterial({
    map: lanternHaloTex,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const purpleHaloMat = new THREE.SpriteMaterial({
    map: lanternHaloTex,
    color: new THREE.Color('#c084fc'),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // 2. CENTRAL PLAZA & PAVED THOROUGHFARES (Villa Marioneta Reference Layout)
  // Central Paved Plaza (Rectangle with stone curb border)
  const plazaGeo = new THREE.PlaneGeometry(28.0, 26.0);
  plazaGeo.rotateX(-Math.PI / 2);
  const plazaMesh = new THREE.Mesh(plazaGeo, cobbleMat(28, 26));
  plazaMesh.position.set(0, 1.02, 0);
  villageGroup.add(plazaMesh);

  // Plaza Stone Curb (Mossy stone perimeter border)
  const curbMat = mossyStoneMat(29.0, 0.8);
  const northCurbGeo = new THREE.BoxGeometry(29.0, 0.4, 0.8);
  const nCurb = new THREE.Mesh(northCurbGeo, curbMat);
  nCurb.position.set(0, 1.1, 13.0);
  villageGroup.add(nCurb);
  const sCurb = new THREE.Mesh(northCurbGeo, curbMat);
  sCurb.position.set(0, 1.1, -13.0);
  villageGroup.add(sCurb);

  // North-South Main Boulevard (Pier south to Northern Archway)
  const nsRoadGeo = new THREE.PlaneGeometry(9.0, 72.0);
  nsRoadGeo.rotateX(-Math.PI / 2);
  const nsRoadMesh = new THREE.Mesh(nsRoadGeo, roadMat(9, 72));
  nsRoadMesh.position.set(0, 1.018, 12.0);
  villageGroup.add(nsRoadMesh);

  // East-West Artisan Avenue (Workshop west to Market east - widened to 10.5 for fluid traversal)
  const ewRoadGeo = new THREE.PlaneGeometry(68.0, 10.5);
  ewRoadGeo.rotateX(-Math.PI / 2);
  const ewRoadMesh = new THREE.Mesh(ewRoadGeo, crossRoadMat(68, 10.5));
  ewRoadMesh.position.set(0, 1.022, 0);
  villageGroup.add(ewRoadMesh);

  // West Terrace Upper Paved Walkway (connecting stairs, workshop, and Robin's house)
  const wTerracePaveGeo = new THREE.PlaneGeometry(10.0, 48.0);
  wTerracePaveGeo.rotateX(-Math.PI / 2);
  const wTerracePave = new THREE.Mesh(wTerracePaveGeo, cobbleMat(10, 48));
  wTerracePave.position.set(-19.5, 2.822, 7.0);
  villageGroup.add(wTerracePave);

  // East Terrace Upper Paved Walkway (connecting stairs, market, and Selene's house)
  const eTerracePaveGeo = new THREE.PlaneGeometry(10.0, 48.0);
  eTerracePaveGeo.rotateX(-Math.PI / 2);
  const eTerracePave = new THREE.Mesh(eTerracePaveGeo, cobbleMat(10, 48));
  eTerracePave.position.set(19.5, 2.822, 7.0);
  villageGroup.add(eTerracePave);

  // Northeast Laboratory Promenade
  const labRoadGeo = new THREE.PlaneGeometry(24.0, 8.5);
  labRoadGeo.rotateX(-Math.PI / 2);
  const labRoadMesh = new THREE.Mesh(labRoadGeo, cobbleMat(24, 8.5));
  labRoadMesh.position.set(14.0, 1.022, -12.0);
  villageGroup.add(labRoadMesh);

  // 3. CENTRAL MONUMENT: STATUE OF THE PRIMORDIAL MARIONETTE
  // Carved tiered stone pedestal in central plaza
  const statueBaseGeo = new THREE.BoxGeometry(4.2, 0.8, 4.2);
  const statueBase = new THREE.Mesh(statueBaseGeo, mossyStoneMat(4.2, 4.2));
  statueBase.position.set(0, 1.4, 4.5);
  villageGroup.add(statueBase);

  const statuePlinthGeo = new THREE.BoxGeometry(2.8, 1.4, 2.8);
  const statuePlinth = new THREE.Mesh(statuePlinthGeo, slateMat(2.8, 2.8));
  statuePlinth.position.set(0, 2.3, 4.5);
  villageGroup.add(statuePlinth);

  // Marionette doll carved idol (Articulated wooden effigy holding a celestial Soul Core)
  const idolTorsoGeo = new THREE.BoxGeometry(1.6, 2.4, 1.2);
  const idolTorso = new THREE.Mesh(idolTorsoGeo, woodPlankMat(1.6, 1.2));
  idolTorso.position.set(0, 4.1, 4.5);
  villageGroup.add(idolTorso);

  const idolHeadGeo = new THREE.BoxGeometry(1.2, 1.4, 1.2);
  const idolHead = new THREE.Mesh(idolHeadGeo, woodPlankMat(1.2, 1.2));
  idolHead.position.set(0, 5.8, 4.5);
  villageGroup.add(idolHead);

  // Floating rotating soul crystal in statue hands
  const monumentSoulGeo = new THREE.OctahedronGeometry(0.85, 0);
  const monumentSoulMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.8,
    roughness: 0.1,
    metalness: 0.3,
  });
  const monumentSoul = new THREE.Mesh(monumentSoulGeo, monumentSoulMat);
  monumentSoul.position.set(0, 4.5, 5.6);
  villageGroup.add(monumentSoul);

  const monumentLight = new THREE.PointLight(0xfbbf24, 1.6, 15);
  monumentLight.position.set(0, 4.8, 5.6);
  villageGroup.add(monumentLight);

  const monumentHalo = new THREE.Sprite(lanternHaloMat);
  monumentHalo.scale.set(4.0, 4.0, 1);
  monumentHalo.position.set(0, 4.5, 5.6);
  villageGroup.add(monumentHalo);
  collisionBoxes.push({ x: 0, z: 4.5, rx: 2.5, rz: 2.5 });

  // 3.5 ELEVATED TERRACES, STONE RETAINING WALLS & STAIRWAYS
  const terraceStoneMat = mossyStoneMat(20.0, 2.0);
  const stairStepMat = cobbleRoundMat(7.0, 1.0);
  const handrailWoodMat = woodPlankMat(1.0, 5.0);

  // Helper to build a grand flight of stone stairs with side balustrades and amber lanterns
  const buildStaircase = (startX: number, startZ: number, isWest: boolean) => {
    const stairGroup = new THREE.Group();
    const stepCount = 5;
    const stepDepth = 0.9;
    const stepWidth = 7.0; // Generous 7.0m wide stone stairs for completely fluid movement
    const totalRise = 1.8;
    const risePerStep = totalRise / stepCount;

    for (let s = 0; s < stepCount; s++) {
      const stepGeo = new THREE.BoxGeometry(stepDepth, risePerStep * (s + 1), stepWidth);
      const stepMesh = new THREE.Mesh(stepGeo, stairStepMat);
      const stepX = isWest ? startX - s * stepDepth : startX + s * stepDepth;
      const stepY = 1.0 + (risePerStep * (s + 1)) * 0.5;
      stepMesh.position.set(stepX, stepY, startZ);
      stairGroup.add(stepMesh);
    }

    // Wooden handrail balustrades flanking the steps
    [-stepWidth * 0.51, stepWidth * 0.51].forEach(offsetZ => {
      // Bottom post
      const postGeo = new THREE.BoxGeometry(0.3, 1.6, 0.3);
      const bPost = new THREE.Mesh(postGeo, handrailWoodMat);
      bPost.position.set(startX, 1.8, startZ + offsetZ);
      stairGroup.add(bPost);

      // Top post
      const tPost = new THREE.Mesh(postGeo, handrailWoodMat);
      const topX = isWest ? startX - (stepCount - 1) * stepDepth : startX + (stepCount - 1) * stepDepth;
      tPost.position.set(topX, 3.6, startZ + offsetZ);
      stairGroup.add(tPost);

      // Incline handrail beam
      const railLength = Math.hypot(stepCount * stepDepth, totalRise);
      const railGeo = new THREE.BoxGeometry(railLength, 0.2, 0.25);
      const railMesh = new THREE.Mesh(railGeo, handrailWoodMat);
      const midX = (startX + topX) * 0.5;
      const midY = (1.8 + 3.6) * 0.5;
      railMesh.position.set(midX, midY, startZ + offsetZ);
      railMesh.rotation.z = isWest ? Math.atan2(totalRise, stepCount * stepDepth) : -Math.atan2(totalRise, stepCount * stepDepth);
      stairGroup.add(railMesh);
    });

    // Ornate street lamps cleanly flanking the base of the stairs (well clear of the walking path!)
    [-((stepWidth * 0.5) + 1.8), ((stepWidth * 0.5) + 1.8)].forEach(offsetZ => {
      const lx = startX + (isWest ? 1.6 : -1.6);
      const lz = startZ + offsetZ;
      const lampSprite = new THREE.Sprite(lampMat);
      lampSprite.scale.set(LUMINATI_SCALE.STREET_LAMP_WIDTH * 0.85, LUMINATI_SCALE.STREET_LAMP_HEIGHT * 0.85, 1);
      lampSprite.position.set(lx, 1.0 + LUMINATI_SCALE.STREET_LAMP_HEIGHT * 0.42, lz);
      stairGroup.add(lampSprite);

      const lampHalo = new THREE.Sprite(lanternHaloMat);
      lampHalo.scale.set(3.8, 3.8, 1);
      lampHalo.position.set(lx, 4.2, lz);
      stairGroup.add(lampHalo);

      const stairLampLight = new THREE.PointLight(0xf59e0b, 1.3, 10);
      stairLampLight.position.set(lx, 4.3, lz);
      stairGroup.add(stairLampLight);
    });

    villageGroup.add(stairGroup);
  };

  // Build the 4 Village Staircases
  buildStaircase(-10.2, 0.0, true);     // West central stairs to Workshop terrace
  buildStaircase(-10.2, 22.5, true);    // West south stairs to Robin's terrace
  buildStaircase(10.2, 0.0, false);     // East central stairs to Market terrace
  buildStaircase(10.2, 22.5, false);    // East south stairs to Selene's terrace

  // Stone Retaining Walls along the West and East Terrace edges
  const addRetainingWall = (x: number, startZ: number, endZ: number) => {
    const len = Math.abs(endZ - startZ);
    const midZ = (startZ + endZ) * 0.5;
    const wallGeo = new THREE.BoxGeometry(1.4, 1.9, len);
    const wallMesh = new THREE.Mesh(wallGeo, terraceStoneMat);
    wallMesh.position.set(x, 1.95, midZ);
    villageGroup.add(wallMesh);

    // Stone Coping Top Ledge
    const copingGeo = new THREE.BoxGeometry(1.8, 0.3, len);
    const copingMesh = new THREE.Mesh(copingGeo, slateMat(1.8, len));
    copingMesh.position.set(x, 2.95, midZ);
    villageGroup.add(copingMesh);

    // Wooden Balustrade Railing on Top
    const balustradeRailGeo = new THREE.BoxGeometry(0.3, 0.2, len);
    const bRail = new THREE.Mesh(balustradeRailGeo, handrailWoodMat);
    bRail.position.set(x, 3.8, midZ);
    villageGroup.add(bRail);

    // Balustrade posts
    const postCount = Math.max(2, Math.floor(len / 3.0));
    for (let p = 0; p <= postCount; p++) {
      const pZ = startZ + (len / postCount) * p;
      const bPost = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), handrailWoodMat);
      bPost.position.set(x, 3.4, pZ);
      villageGroup.add(bPost);
    }

    // Collision Box to prevent jumping over the cliff wall
    collisionBoxes.push({ x, z: midZ, rx: 1.0, rz: len * 0.5 });
  };

  // West Wall segments (leaving generous 11.0m openings at Z: -5.5..5.5 and Z: 17.0..28.0)
  addRetainingWall(-15.0, -22.0, -5.5);
  addRetainingWall(-15.0, 5.5, 17.0);
  addRetainingWall(-15.0, 28.0, 36.0);

  // East Wall segments (leaving generous 11.0m openings at Z: -5.5..5.5 and Z: 17.0..28.0)
  addRetainingWall(15.0, -22.0, -5.5);
  addRetainingWall(15.0, 5.5, 17.0);
  addRetainingWall(15.0, 28.0, 36.0);

  // --- 3.6 GROUND DECALS: FALLEN AUTUMN LEAVES & CRACK WILDFLOWERS ---
  const autumnLeafTex = getTexture('autumn_leaves', createFallenAutumnLeavesTexture);
  const autumnLeafMat = new THREE.MeshStandardMaterial({
    map: autumnLeafTex,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.9,
  });

  const cobbleFlowerTex = getTexture('cobble_flowers', createCobbleFlowersTexture);
  const cobbleFlowerMat = new THREE.MeshStandardMaterial({
    map: cobbleFlowerTex,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.8,
  });

  const leafDecalGeo = new THREE.PlaneGeometry(2.4, 2.4);
  leafDecalGeo.rotateX(-Math.PI / 2);

  const flowerDecalGeo = new THREE.PlaneGeometry(1.8, 1.8);
  flowerDecalGeo.rotateX(-Math.PI / 2);

  const leafPositions = [
    // Near West Stairs & Workshop Terrace
    { x: -10.5, z: 0.5 }, { x: -11.5, z: -1.5 }, { x: -9.0, z: 1.0 }, { x: -13.0, z: 2.0 },
    { x: -15.5, z: 0.0 }, { x: -18.0, z: 2.5 }, { x: -21.0, z: -2.0 }, { x: -16.0, z: -5.0 },
    // Near Robin's Stairs & Terrace
    { x: -10.5, z: 22.0 }, { x: -11.5, z: 24.0 }, { x: -14.5, z: 21.0 }, { x: -17.0, z: 25.0 },
    // Near East Stairs & Market Terrace
    { x: 10.5, z: 0.5 }, { x: 11.5, z: -1.5 }, { x: 14.0, z: 1.5 }, { x: 16.5, z: -2.0 },
    { x: 10.5, z: 22.0 }, { x: 14.5, z: 23.0 }, { x: 17.5, z: 21.0 },
    // Along Central Boulevard & Plaza Perimeter
    { x: -2.5, z: 8.0 }, { x: 3.5, z: 10.5 }, { x: -4.0, z: -6.0 }, { x: 2.0, z: -10.0 },
    { x: -1.5, z: 18.0 }, { x: 3.0, z: 24.0 }, { x: 0.0, z: 32.0 }, { x: -3.0, z: -22.0 },
  ];

  leafPositions.forEach(lp => {
    const d = new THREE.Mesh(leafDecalGeo, autumnLeafMat);
    const dy = getTerrainHeight(lp.x, lp.z) + 0.04;
    d.position.set(lp.x, dy, lp.z);
    d.rotation.y = (lp.x * 13.7 + lp.z * 19.3) % (Math.PI * 2);
    villageGroup.add(d);
  });

  const flowerPositions = [
    // Along West retaining wall curb (at x = -14.3)
    { x: -14.3, z: -14.0 }, { x: -14.3, z: -8.0 }, { x: -14.3, z: 8.0 }, { x: -14.3, z: 14.0 }, { x: -14.3, z: 30.0 },
    // Along East retaining wall curb (at x = 14.3)
    { x: 14.3, z: -14.0 }, { x: 14.3, z: -8.0 }, { x: 14.3, z: 8.0 }, { x: 14.3, z: 14.0 }, { x: 14.3, z: 30.0 },
    // Around Central Monument & Garden Corners
    { x: -3.5, z: 4.5 }, { x: 3.5, z: 4.5 }, { x: -8.0, z: 12.5 }, { x: 8.0, z: 12.5 },
  ];

  flowerPositions.forEach(fp => {
    const f = new THREE.Mesh(flowerDecalGeo, cobbleFlowerMat);
    const fy = getTerrainHeight(fp.x, fp.z) + 0.035;
    f.position.set(fp.x, fy, fp.z);
    f.rotation.y = (fp.x * 7.9 + fp.z * 11.3) % (Math.PI * 2);
    villageGroup.add(f);
  });

  // --- 3.7 OUTDOOR WOODEN TAVERN PATIO SETS ---
  const tavernTableTex = getTexture('tavern_table', createTavernTableTexture);
  const tavernTableMat = new THREE.MeshStandardMaterial({
    map: tavernTableTex,
    roughness: 0.8,
  });

  const buildTavernSet = (tx: number, tz: number) => {
    const tGroup = new THREE.Group();
    const ty = getTerrainHeight(tx, tz);

    // Round wooden table top
    const tableTopGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.25, 12);
    const tableTop = new THREE.Mesh(tableTopGeo, tavernTableMat);
    tableTop.position.set(0, 1.7, 0);
    tGroup.add(tableTop);

    // Central table leg
    const tableLegGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.6, 8);
    const tableLeg = new THREE.Mesh(tableLegGeo, woodPlankMat(1, 1.6));
    tableLeg.position.set(0, 0.8, 0);
    tGroup.add(tableLeg);

    // Stools around the table (3 stools)
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + 0.3;
      const sx = Math.cos(angle) * 2.5;
      const sz = Math.sin(angle) * 2.5;

      const stoolTopGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.15, 8);
      const stoolTop = new THREE.Mesh(stoolTopGeo, woodPlankMat(1, 1));
      stoolTop.position.set(sx, 1.0, sz);
      tGroup.add(stoolTop);

      const stoolLegGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6);
      const stoolLeg = new THREE.Mesh(stoolLegGeo, woodPlankMat(0.5, 0.9));
      stoolLeg.position.set(sx, 0.45, sz);
      tGroup.add(stoolLeg);
    }

    tGroup.position.set(tx, ty, tz);
    villageGroup.add(tGroup);
    collisionBoxes.push({ x: tx, z: tz, rx: 2.2, rz: 2.2 });
  };

  buildTavernSet(-24.5, 10.5); // West Terrace tucked against Robin's garden wall (completely clear of avenue!)
  buildTavernSet(24.5, 10.5);  // East Terrace tucked against Selene's garden wall (completely clear of avenue!)

  // --- 3.8 SHOWCASE CRIMSON & AMBER AUTUMN TREES (VILLA MARIONETA) ---
  const treeLoader = new THREE.TextureLoader();
  const treeTextures = [
    treeLoader.load('/assets/trees/tree1.webp'),
    treeLoader.load('/assets/trees/tree2.webp'),
    treeLoader.load('/assets/trees/tree1.webp'),
  ];
  treeTextures.forEach(tex => {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
  });

  const crimsonTreeMat = new THREE.SpriteMaterial({
    map: treeTextures[0],
    color: new THREE.Color('#ff2b54'),
    transparent: true,
  });

  const amberTreeMat = new THREE.SpriteMaterial({
    map: treeTextures[1],
    color: new THREE.Color('#f59e0b'),
    transparent: true,
  });

  const showcaseTrees = [
    // Behind Robin's House fenced backyard (framing the cottage from the west cliff, completely clear of street and path)
    { x: -38.0, z: 26.0, scale: 1.25, mat: amberTreeMat },
    // Behind Selene's House fenced backyard (framing the house from the east cliff)
    { x: 38.0, z: 26.0, scale: 1.25, mat: amberTreeMat },
    // Northwest cliff corner behind the puppet workshop wood shed
    { x: -42.0, z: -18.0, scale: 1.3, mat: crimsonTreeMat },
    // Northeast cliff corner behind the laboratory herbarium
    { x: 42.0, z: -18.0, scale: 1.3, mat: crimsonTreeMat },
  ];

  showcaseTrees.forEach(st => {
    const sMesh = new THREE.Sprite(st.mat);
    const sy = getTerrainHeight(st.x, st.z) + (LUMINATI_SCALE.TREE_HEIGHT_BASE * st.scale * 0.5);
    sMesh.position.set(st.x, sy, st.z);
    sMesh.scale.set(LUMINATI_SCALE.TREE_WIDTH_BASE * st.scale, LUMINATI_SCALE.TREE_HEIGHT_BASE * st.scale, 1);
    villageGroup.add(sMesh);
    collisionBoxes.push({ x: st.x, z: st.z, rx: 2.2 * st.scale, rz: 2.2 * st.scale });
  });

  // 4. WORKSHOP (TALLER DE MARIONETAS - OESTE)
  // Grand timber guild hall shifted west to -30.0 for wide open 6.5m terrace promenade
  const wsX = -30.0;
  const wsZ = -6.0;
  const workshopBuilt = buildWorkshop(wsX, wsZ, buildingPalette, cratePropTex, barrelPropTex);
  workshopBuilt.group.position.set(wsX, 1.8, wsZ);
  villageGroup.add(workshopBuilt.group);
  collisionBoxes.push(...workshopBuilt.collision);

  // 5. RESIDENTIAL HOUSES (ROBIN, SELENE & ELDER KAELEN)
  // Robin's House (Casa del Héroe - Suroeste)
  // Shifted west to -27.0 for wide open terrace promenade
  const heroX = -27.0;
  const heroZ = 24.0;
  const heroHouseBuilt = buildHeroHouse(heroX, heroZ, buildingPalette);
  heroHouseBuilt.group.position.set(heroX, 1.8, heroZ);
  villageGroup.add(heroHouseBuilt.group);
  collisionBoxes.push(heroHouseBuilt.collision);

  // Selene's House (Casa de Selene - Sureste)
  // Shifted east to 27.0 for wide open terrace promenade
  const rivalX = 27.0;
  const rivalZ = 24.0;
  const rivalHouseBuilt = buildRivalHouse(rivalX, rivalZ, buildingPalette);
  rivalHouseBuilt.group.position.set(rivalX, 1.8, rivalZ);
  villageGroup.add(rivalHouseBuilt.group);
  collisionBoxes.push(rivalHouseBuilt.collision);

  // Elder's Cottage (Cabaña del Sabio - Sur)
  // Cozy rustic cottage with organic drooping thatched roof, cobble base, and log porch
  const elderX = -26.0;
  const elderZ = 42.0;
  const elderCottageBuilt = buildElderCottage(elderX, elderZ, buildingPalette);
  villageGroup.add(elderCottageBuilt.group);
  collisionBoxes.push(elderCottageBuilt.collision);

  // 6. MARKET STALLS (MERCADO DE VILLA MARIONETA - ESTE)
  const marketX = 28.0;
  const marketZ = -4.0;

  // Paved market plaza
  const marketPlazaGeo = new THREE.PlaneGeometry(16.0, 12.0);
  marketPlazaGeo.rotateX(-Math.PI / 2);
  const marketPlaza = new THREE.Mesh(marketPlazaGeo, cobbleMat(16, 12));
  marketPlaza.position.set(marketX, 2.822, marketZ);
  villageGroup.add(marketPlaza);

  // Stall 1 (Crimson & Gold Awning)
  const stall1X = marketX - 3.5;
  const stall1Z = marketZ;
  const counterGeo = new THREE.BoxGeometry(5.0, 1.4, 2.2);
  const counter1 = new THREE.Mesh(counterGeo, woodPlankMat(5.0, 2.2));
  counter1.position.set(stall1X, 3.5, stall1Z);
  villageGroup.add(counter1);

  // Timber awning poles
  const poleGeo = new THREE.BoxGeometry(0.25, 4.2, 0.25);
  const p1 = new THREE.Mesh(poleGeo, woodPlankMat(0.25, 4.2));
  p1.position.set(stall1X - 2.2, 4.9, stall1Z - 0.9);
  const p2 = new THREE.Mesh(poleGeo, woodPlankMat(0.25, 4.2));
  p2.position.set(stall1X + 2.2, 4.9, stall1Z - 0.9);
  villageGroup.add(p1);
  villageGroup.add(p2);

  // Striped Fabric Awning
  const awningTex1 = getTexture('awning_red', () => createStripedAwningTexture('#dc2626', '#fef08a'));
  const awningMat1 = new THREE.MeshStandardMaterial({ map: awningTex1, roughness: 0.65 });
  const awningGeo = new THREE.BoxGeometry(5.4, 0.4, 3.2);
  awningGeo.rotateX(-0.2);
  const awning1 = new THREE.Mesh(awningGeo, awningMat1);
  awning1.position.set(stall1X, 6.8, stall1Z);
  villageGroup.add(awning1);

  // Stall 2 (Sapphire & White Awning)
  const stall2X = marketX + 3.8;
  const stall2Z = marketZ;
  const counter2 = new THREE.Mesh(counterGeo, woodPlankMat(5.0, 2.2));
  counter2.position.set(stall2X, 3.5, stall2Z);
  villageGroup.add(counter2);

  const p3 = new THREE.Mesh(poleGeo, woodPlankMat(0.25, 4.2));
  p3.position.set(stall2X - 2.2, 4.9, stall2Z - 0.9);
  const p4 = new THREE.Mesh(poleGeo, woodPlankMat(0.25, 4.2));
  p4.position.set(stall2X + 2.2, 4.9, stall2Z - 0.9);
  villageGroup.add(p3);
  villageGroup.add(p4);

  const awningTex2 = getTexture('awning_blue', () => createStripedAwningTexture('#1d4ed8', '#ffffff'));
  const awningMat2 = new THREE.MeshStandardMaterial({ map: awningTex2, roughness: 0.65 });
  const awning2 = new THREE.Mesh(awningGeo, awningMat2);
  awning2.position.set(stall2X, 6.8, stall2Z);
  villageGroup.add(awning2);

  // Market wares: Crates and barrels
  const marketCrate = new THREE.Sprite(cratePropMat);
  marketCrate.scale.set(2.4, 2.4, 1);
  marketCrate.position.set(marketX, 4.0, marketZ - 2.5);
  villageGroup.add(marketCrate);
  const marketBarrel = new THREE.Sprite(barrelPropMat);
  marketBarrel.scale.set(2.4, 2.4, 1);
  marketBarrel.position.set(marketX + 1.8, 4.0, marketZ - 2.3);
  villageGroup.add(marketBarrel);

  collisionBoxes.push({ x: marketX, z: marketZ, rx: 7.0, rz: 4.5 });

  // 7. LABORATORY OF SOUL RESEARCH (NORESTE: x: 25, z: -22)
  // Grand ashlar masonry complex with stepped corner buttresses, steep gothic slate roof,
  // arched portal with stone steps, and attached Observatory Tower with bronze dome & soul orb
  const labX = 25.0;
  const labZ = -22.0;
  const labBuilt = buildLaboratory(labX, labZ, buildingPalette);
  villageGroup.add(labBuilt.group);
  collisionBoxes.push(...labBuilt.collision);

  // 8. MONUMENTAL STONE ARCHWAY EXIT (ARCO DE SALIDA AL NORTE)
  // Imposing carved stone archway spanning the northern path toward Ruta 1 Norte
  const archZ = 43.0;
  const pillarGeo = new THREE.BoxGeometry(3.2, 11.5, 3.2);
  const leftPillar = new THREE.Mesh(pillarGeo, mossyStoneMat(3.2, 11.5));
  leftPillar.position.set(-6.0, 6.75, archZ);
  villageGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeo, mossyStoneMat(3.2, 11.5));
  rightPillar.position.set(6.0, 6.75, archZ);
  villageGroup.add(rightPillar);

  // Arch Crossbeam Lintel
  const lintelGeo = new THREE.BoxGeometry(15.2, 2.4, 3.8);
  const lintelMesh = new THREE.Mesh(lintelGeo, mossyStoneMat(15.2, 3.8));
  lintelMesh.position.set(0, 13.2, archZ);
  villageGroup.add(lintelMesh);

  // Carved Keystone with glowing Runic Glyph
  const runicTex = getTexture('runic_glyph', createRunicGlyphTexture);
  const runicMat = new THREE.SpriteMaterial({ map: runicTex, transparent: true });
  const runicSprite = new THREE.Sprite(runicMat);
  runicSprite.scale.set(3.0, 3.0, 1);
  runicSprite.position.set(0, 13.2, archZ + 2.0);
  villageGroup.add(runicSprite);

  // Twin Stone Braziers with purple torchlight
  const brazierBaseGeo = new THREE.CylinderGeometry(1.0, 1.4, 2.2, 8);
  const leftBrazier = new THREE.Mesh(brazierBaseGeo, slateMat(3.0, 3.0));
  leftBrazier.position.set(-8.5, 2.1, archZ);
  villageGroup.add(leftBrazier);
  const rightBrazier = new THREE.Mesh(brazierBaseGeo, slateMat(3.0, 3.0));
  rightBrazier.position.set(8.5, 2.1, archZ);
  villageGroup.add(rightBrazier);

  const brazierLightL = new THREE.PointLight(0xa855f7, 1.8, 12);
  brazierLightL.position.set(-8.5, 3.8, archZ);
  villageGroup.add(brazierLightL);
  const brazierLightR = new THREE.PointLight(0xa855f7, 1.8, 12);
  brazierLightR.position.set(8.5, 3.8, archZ);
  villageGroup.add(brazierLightR);

  const bHaloL = new THREE.Sprite(purpleHaloMat);
  bHaloL.scale.set(4.2, 4.2, 1);
  bHaloL.position.set(-8.5, 3.8, archZ);
  villageGroup.add(bHaloL);
  const bHaloR = new THREE.Sprite(purpleHaloMat);
  bHaloR.scale.set(4.2, 4.2, 1);
  bHaloR.position.set(8.5, 3.8, archZ);
  villageGroup.add(bHaloR);

  collisionBoxes.push({ x: -6.0, z: archZ, rx: 2.2, rz: 2.2 });
  collisionBoxes.push({ x: 6.0, z: archZ, rx: 2.2, rz: 2.2 });

  // 8.5 MONUMENTAL MOUNTAIN CAVE ENTRANCE (CUEVA DE CRISTAL ANCESTRAL)
  const caveX = 74.0;
  const caveZ = 54.0;
  const caveY = getTerrainHeight(caveX, caveZ);
  const caveBuilt = buildCaveEntrance(caveX, caveY, caveZ, buildingPalette);
  scene.add(caveBuilt.group);
  collisionBoxes.push(...caveBuilt.collision);

  // 8.6 MANUAL NARRATIVE LOCATION: TEMPLO SOLAR DEL ALBA (x: -38, z: 136)
  const sunTempleX = -38.0;
  const sunTempleZ = 136.0;
  const sunTempleY = getTerrainHeight(sunTempleX, sunTempleZ);
  const sunTempleBuilt = buildSunTemple(sunTempleX, sunTempleY, sunTempleZ, buildingPalette);
  scene.add(sunTempleBuilt.group);
  collisionBoxes.push(...sunTempleBuilt.collision);

  // 8.7 MANUAL NARRATIVE LOCATION: CRIPTA DEL ABISMO ESPECTRAL & GUARDIAN BOSS (x: 68, z: -128)
  const cryptX = 68.0;
  const cryptZ = -128.0;
  const cryptY = getTerrainHeight(cryptX, cryptZ);
  const spectralCryptBuilt = buildSpectralCryptAndBoss(cryptX, cryptY, cryptZ, buildingPalette, textureLoader);
  scene.add(spectralCryptBuilt.group);
  scene.add(spectralCryptBuilt.bossAuraSprite);
  scene.add(spectralCryptBuilt.bossSprite);
  collisionBoxes.push(...spectralCryptBuilt.collision);
  const worldBosses: WorldBoss[] = [spectralCryptBuilt.boss];

  // 8.8 REGIONAL HARVESTABLE RESOURCE NODES (Composite 3D Crystal Veins across Biomes)
  const resourceNodes: ResourceNode[] = [
    { id: 'res-meadow-1', x: -16, z: 112, name: 'Ámbar del Alba', biome: 'meadow', rewardItem: 'soul_crystal', rewardCount: 2, rewardGold: 35, harvested: false, color: '#fbbf24' },
    { id: 'res-meadow-2', x: 22, z: 138, name: 'Brote Solar', biome: 'meadow', rewardItem: 'potion', rewardCount: 2, rewardGold: 30, harvested: false, color: '#4ade80' },
    { id: 'res-forest-1', x: -72, z: -14, name: 'Resina Umbría', biome: 'forest', rewardItem: 'potion', rewardCount: 2, rewardGold: 45, harvested: false, color: '#a855f7' },
    { id: 'res-forest-2', x: -108, z: -88, name: 'Hongo Luminiscente', biome: 'forest', rewardItem: 'soul_crystal', rewardCount: 2, rewardGold: 50, harvested: false, color: '#22c55e' },
    { id: 'res-mountain-1', x: 60, z: 24, name: 'Cuarzo de Fulgor', biome: 'mountain', rewardItem: 'soul_crystal', rewardCount: 2, rewardGold: 55, harvested: false, color: '#eab308' },
    { id: 'res-mountain-2', x: 112, z: 38, name: 'Mineral Astral', biome: 'mountain', rewardItem: 'super_crystal', rewardCount: 1, rewardGold: 75, harvested: false, color: '#facc15' },
    { id: 'res-snow-1', x: 108, z: 148, name: 'Esquirla Glacial', biome: 'snow', rewardItem: 'super_crystal', rewardCount: 1, rewardGold: 90, harvested: false, color: '#7dd3fc' },
    { id: 'res-swamp-1', x: -58, z: -116, name: 'Lirio del Pantano', biome: 'swamp', rewardItem: 'potion', rewardCount: 3, rewardGold: 55, harvested: false, color: '#84cc16' },
    { id: 'res-spectral-1', x: 48, z: -104, name: 'Fragmento Abisal', biome: 'spectral', rewardItem: 'super_crystal', rewardCount: 1, rewardGold: 85, harvested: false, color: '#c084fc' },
    { id: 'res-coast-1', x: 138, z: -82, name: 'Perla Acuática', biome: 'lake', rewardItem: 'soul_crystal', rewardCount: 2, rewardGold: 60, harvested: false, color: '#38bdf8' },
  ];

  const resourceNodeGroups: THREE.Group[] = [];
  const resCrystalGeo = new THREE.ConeGeometry(0.42, 1.85, 5);
  resCrystalGeo.translate(0, 0.9, 0);
  const resPedestalGeo = new THREE.DodecahedronGeometry(0.95, 0);
  const resPedestalMat = mossyStoneMat(2, 2);

  resourceNodes.forEach((node) => {
    const nGroup = new THREE.Group();
    const ny = getTerrainHeight(node.x, node.z);

    // 1. Stone ore base
    const baseRock = new THREE.Mesh(resPedestalGeo, resPedestalMat);
    baseRock.scale.set(1.15, 0.55, 1.15);
    baseRock.position.set(0, 0.25, 0);
    nGroup.add(baseRock);

    // 2. Three angled glowing elemental crystal spires
    const cMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(node.color),
      emissive: new THREE.Color(node.color),
      emissiveIntensity: 0.85,
      roughness: 0.18,
      metalness: 0.6,
    });

    const mainSpire = new THREE.Mesh(resCrystalGeo, cMat);
    mainSpire.position.set(0, 0.35, 0);
    nGroup.add(mainSpire);

    const leftSpire = new THREE.Mesh(resCrystalGeo, cMat);
    leftSpire.scale.set(0.72, 0.72, 0.72);
    leftSpire.position.set(-0.42, 0.3, 0.2);
    leftSpire.rotation.z = 0.38;
    nGroup.add(leftSpire);

    const rightSpire = new THREE.Mesh(resCrystalGeo, cMat);
    rightSpire.scale.set(0.68, 0.68, 0.68);
    rightSpire.position.set(0.42, 0.3, -0.2);
    rightSpire.rotation.z = -0.35;
    rightSpire.rotation.x = 0.22;
    nGroup.add(rightSpire);

    // 3. Soft radial glow sprite
    const glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: lanternHaloTex,
        color: new THREE.Color(node.color),
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glowSprite.scale.set(3.2, 3.2, 1);
    glowSprite.position.set(0, 1.35, 0);
    nGroup.add(glowSprite);

    nGroup.position.set(node.x, ny, node.z);
    scene.add(nGroup);
    resourceNodeGroups.push(nGroup);
    collisionBoxes.push({ x: node.x, z: node.z, rx: 0.95, rz: 0.95 });
  });

  // 9. SOUTH PIER & LAKE (MUELLE DE VILLA MARIONETA)
  const southWaterGeo = new THREE.CircleGeometry(16.0, 32);
  southWaterGeo.rotateX(-Math.PI / 2);
  const southWaterMesh = new THREE.Mesh(southWaterGeo, waterMat);
  southWaterMesh.position.set(0, 0.8, -32);
  villageGroup.add(southWaterMesh);

  const pierGeo = new THREE.BoxGeometry(6.5, 0.6, 16.0);
  const pierMesh = new THREE.Mesh(pierGeo, woodPlankMat(6.5, 16.0));
  pierMesh.position.set(0, 1.0, -26);
  villageGroup.add(pierMesh);

  // Mooring posts at pier edges
  const postGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.8, 8);
  const mPost1 = new THREE.Mesh(postGeo, woodPlankMat(1, 1.8));
  mPost1.position.set(-3.0, 1.9, -33.5);
  const mPost2 = new THREE.Mesh(postGeo, woodPlankMat(1, 1.8));
  mPost2.position.set(3.0, 1.9, -33.5);
  villageGroup.add(mPost1);
  villageGroup.add(mPost2);

  // 10. FENCES, STREET LAMPS & SIGNPOSTS

  // Robin's garden fence (strictly bounded to private yard, leaving terrace promenade open)
  [-36, -32, -28, -24, -20].forEach(fx => {
    const s = new THREE.Sprite(fenceMat);
    s.scale.set(LUMINATI_SCALE.FENCE_SIZE, LUMINATI_SCALE.FENCE_SIZE, 1);
    s.position.set(fx, 2.8 + (LUMINATI_SCALE.FENCE_SIZE * 0.5), 14.5);
    villageGroup.add(s);
  });
  // Selene's garden fence (strictly bounded to private yard, leaving terrace promenade open)
  [20, 24, 28, 32, 36].forEach(fx => {
    const s = new THREE.Sprite(fenceMat);
    s.scale.set(LUMINATI_SCALE.FENCE_SIZE, LUMINATI_SCALE.FENCE_SIZE, 1);
    s.position.set(fx, 2.8 + (LUMINATI_SCALE.FENCE_SIZE * 0.5), 14.5);
    villageGroup.add(s);
  });

  // Street Lamps along Plaza and Terrace building corners (Zero lamps on stair landing!)
  const lampPositions = [
    // Central Plaza perimeter
    { x: -6.5, z: 9.5 }, { x: 6.5, z: 9.5 },
    { x: -6.5, z: -9.5 }, { x: 6.5, z: -9.5 },
    // Terrace building corners (tucked against architecture, never blocking pathways!)
    { x: -22.5, z: -12.0 }, { x: 22.5, z: -12.0 },
    { x: -22.5, z: 16.0 }, { x: 22.5, z: 16.0 },
    // North-South Boulevard
    { x: 0, z: 34.0 }, { x: 0, z: -20.0 },
  ];
  const lampLights: THREE.PointLight[] = [];
  lampPositions.forEach(lp => {
    const s = new THREE.Sprite(lampMat);
    s.scale.set(LUMINATI_SCALE.STREET_LAMP_WIDTH, LUMINATI_SCALE.STREET_LAMP_HEIGHT, 1);
    const ly = getTerrainHeight(lp.x, lp.z) + (LUMINATI_SCALE.STREET_LAMP_HEIGHT * 0.48);
    s.position.set(lp.x, ly, lp.z);
    villageGroup.add(s);

    const light = new THREE.PointLight(0xf59e0b, 1.5, 12);
    light.position.set(lp.x, ly + 4.5, lp.z);
    villageGroup.add(light);
    lampLights.push(light);

    const halo = new THREE.Sprite(lanternHaloMat);
    halo.scale.set(4.8, 4.8, 1);
    halo.position.set(lp.x, ly + (LUMINATI_SCALE.STREET_LAMP_HEIGHT * 0.35), lp.z);
    villageGroup.add(halo);
  });

  // Comprehensive Story & Regional Road Signposts (neatly offset from thoroughfares)
  const signposts: Signpost[] = [
    { id: 'sign-town', x: 5.5, z: 2.5, name: 'Villa Marioneta', text: 'VILLA MARIONETA: "Cuna de los Marionetistas y el misterio de las almas."' },
    { id: 'sign-statue', x: -3.8, z: 4.5, name: 'Estatua del Artesano', text: 'ESTATUA DEL ARTESANO PRIMIGENIO: "Quien infunde vida a la madera, gobierna el destino."' },
    { id: 'sign-workshop', x: -21.0, z: -6.5, name: 'Taller de Marionetas', text: 'TALLER DE MARIONETAS: Maestro artesano Valerius. "Engranajes, madera noble y almas errantes."' },
    { id: 'sign-market', x: 21.0, z: -6.5, name: 'Mercado de Villa Marioneta', text: 'MERCADO DE VILLA MARIONETA: "Pociones, esencias y suministros para la travesía."' },
    { id: 'sign-hero', x: -20.0, z: 18.0, name: 'Casa de Robin', text: 'CASA DE ROBIN: "Hogar de un prometedor Marionetista."' },
    { id: 'sign-rival', x: 20.0, z: 18.0, name: 'Casa de Selene', text: 'CASA DE SELENE: "¡Entrenando para ser la mejor Marionetista del reino!"' },
    { id: 'sign-lab', x: 15.0, z: -14.0, name: 'Laboratorio de Almas', text: 'LABORATORIO DE ALMAS: "Investigación esotérica y consagración de SoulDolls."' },
    { id: 'sign-archway', x: 4.5, z: 40.0, name: 'Ruta 1 Norte', text: 'GRAN ARCO DEL NORTE: Acceso a la Ruta 1 (Senda de los Susurros).' },
    { id: 'sign-dock', x: 4.5, z: -20.0, name: 'Muelle Marioneta', text: 'MUELLE MARIONETA: "Aguas plácidas del Lago Esmeralda."' },
    { id: 'sign-fork', x: 4.5, z: 74.0, name: 'Cruce de Caminos', text: 'CRUCE DE LA RUTA 1: ↑ Norte: Cumbres del Fulgor | ← Oeste: Bosque Umbrío | ↓ Sur: Villa Marioneta' },
    { id: 'sign-rest', x: 4.5, z: 122.0, name: 'Descanso del Caminante', text: 'ALTO DEL CAMINANTE: Refugio para marionetistas y espíritus cansados.' },
    { id: 'sign-sanctuary', x: -61.0, z: -58.0, name: 'Santuario del Bosque', text: 'SANTUARIO DEL BOSQUE UMBRÍO: Manantial místico sagrado. Alivia la fatiga de tus almas.' },
    { id: 'sign-monolith', x: 78.0, z: 12.0, name: 'Monolito del Fulgor', text: 'MONOLITO DEL FULGOR: Reliquia ancestral resonante con la furia del éter eléctrico.' },
    { id: 'sign-lake', x: 84.0, z: -74.0, name: 'Embarcadero Esmeralda', text: 'EMBARCADERO DEL LAGO ESMERALDA: Santuario acuático donde las mareas curan el espíritu.' },
    { id: 'sign-cave', x: 67.5, z: 54.5, name: 'Cueva de Cristal Ancestral', text: 'CUEVA DE CRISTAL ANCESTRAL: Pórtico tallado en la roca. Ecos de almas de hielo y cristales en sus profundidades.' },
    sunTempleBuilt.signpost,
    spectralCryptBuilt.signpost,
  ];

  const signTex = getTexture('signpost', createSignpostTexture);
  const signMat = new THREE.SpriteMaterial({ map: signTex, transparent: true });
  signposts.forEach(sp => {
    const sprite = new THREE.Sprite(signMat);
    sprite.scale.set(LUMINATI_SCALE.SIGNPOST_SIZE, LUMINATI_SCALE.SIGNPOST_SIZE, 1);
    const sy = getTerrainHeight(sp.x, sp.z);
    sprite.position.set(sp.x, sy + (LUMINATI_SCALE.SIGNPOST_SIZE * 0.5), sp.z);
    villageGroup.add(sprite);
  });

  // 11. GARDEN & PERIMETER BUSHES (Strictly placed along perimeter cliffs, never in walkways!)
  const bushTex = textureLoader.load('/assets/props/bush_purple.webp');
  bushTex.magFilter = THREE.NearestFilter;
  bushTex.minFilter = THREE.NearestFilter;
  bushTex.colorSpace = THREE.SRGBColorSpace;
  const bushMat = new THREE.SpriteMaterial({ map: bushTex, transparent: true });

  const thornyBushTex = textureLoader.load('/assets/props/bush_thorny.webp');
  thornyBushTex.magFilter = THREE.NearestFilter;
  thornyBushTex.minFilter = THREE.NearestFilter;
  thornyBushTex.colorSpace = THREE.SRGBColorSpace;
  const thornyBushMat = new THREE.SpriteMaterial({ map: thornyBushTex, transparent: true });

  const bushMaterials = [bushMat, thornyBushMat];
  const bushWidth = 3.8;
  const bushHeight = 3.5;

  const villageBushPositions = [
    // Robin's back garden (west cliff perimeter)
    { x: -36, z: 28 }, { x: -32, z: 28 }, { x: -28, z: 28 }, { x: -37, z: 20 },
    // Selene's back garden (east cliff perimeter)
    { x: 28, z: 28 }, { x: 32, z: 28 }, { x: 36, z: 28 }, { x: 37, z: 20 },
    // Workshop perimeter (north and west cliff, far away from promenade!)
    { x: -40, z: -6 }, { x: -40, z: 0 }, { x: -36, z: -14 }, { x: -30, z: -14 },
    // Research Laboratory perimeter (northeast)
    { x: 16, z: -25 }, { x: 36, z: -25 }, { x: 38, z: -16 },
    // North Archway outer approach flanks
    { x: -11.5, z: 41 }, { x: 11.5, z: 41 }, { x: -11.5, z: 45 }, { x: 11.5, z: 45 },
    // South Dock outer verges
    { x: -7.5, z: -24 }, { x: 7.5, z: -24 }
  ];

  villageBushPositions.forEach((bp, idx) => {
    const chosenMat = bushMaterials[idx % 2];
    const s = new THREE.Sprite(chosenMat);
    s.scale.set(bushWidth, bushHeight, 1);
    const by = getTerrainHeight(bp.x, bp.z) + (bushHeight * 0.48);
    s.position.set(bp.x, by, bp.z);
    villageGroup.add(s);
  });

  // Wild bushes scattered naturally across Luminati
  const bushBillboardMaterials = [
    createBillboardMaterial(bushTex),
    createBillboardMaterial(thornyBushTex),
  ];
  const bushExclusions = new ExclusionMask();
  bushExclusions.add({
    id: 'emerald-lake',
    shape: { type: 'circle', center: { x: lakeX, z: lakeZ }, radius: 32 },
  });

  const bushPlacements = scatter.generate({
    group: scatter.database.require(SCATTER_GROUP_IDS.bushes),
    bounds: { minX: -190, minZ: -190, maxX: 190, maxZ: 190 },
    terrain: terrainSampler,
    biome: biomeResolver,
    exclusions: bushExclusions,
    seed: scatterSeedConfig,
    blocked: (x, z) => isInsideProtectedZone(x, z, 3.0) || isNearAnyRoad(x, z, 5.0),
  });

  const bushChunks: { x: number; z: number; meshes: THREE.InstancedMesh[] }[] = [];
  const bushBatches = batchScatterPlacements(bushPlacements, 100);
  for (let b = 0; b < bushBatches.length; b++) {
    const batch = bushBatches[b];
    if (batch.placements.length === 0) continue;

    const chunkMeshes: THREE.InstancedMesh[] = [];
    for (let v = 0; v < 2; v++) {
      const variantBushes = batch.placements.filter((placement) => placement.variant === v);
      if (variantBushes.length === 0) continue;

      const iMesh = new THREE.InstancedMesh(
        billboardGeo,
        bushBillboardMaterials[v],
        variantBushes.length
      );
      variantBushes.forEach((bush, i) => {
        const scaleVar = bush.scale;
        dummy.position.set(bush.x, bush.y + bushHeight * scaleVar * 0.48, bush.z);
        dummy.scale.set(bushWidth * scaleVar, bushHeight * scaleVar, 1);
        dummy.updateMatrix();
        iMesh.setMatrixAt(i, dummy.matrix);
      });
      iMesh.instanceMatrix.needsUpdate = true;
      iMesh.computeBoundingSphere();
      scene.add(iMesh);
      chunkMeshes.push(iMesh);
    }
    bushChunks.push({
      x: (batch.minX + batch.maxX) / 2,
      z: (batch.minZ + batch.maxZ) / 2,
      meshes: chunkMeshes,
    });
  }

  scene.add(villageGroup);

  const treeBillboardMaterials = treeTextures.map((tex, idx) => {
    const mat = createBillboardMaterial(tex);
    mat.uniforms.occlusionFade.value = 1.0;
    if (idx === 1) {
      // Vibrant Crimson Japanese Maple (matching the iconic autumn tree from video)
      mat.uniforms.diffuse.value = new THREE.Color('#ff2b54');
    } else if (idx === 2) {
      // Warm Golden Amber Autumn Birch
      mat.uniforms.diffuse.value = new THREE.Color('#f59e0b');
    }
    return mat;
  });
  const treeExclusions = new ExclusionMask();
  treeExclusions.add({
    id: 'claro-arcano',
    shape: { type: 'circle', center: { x: -140, z: -118 }, radius: 18 },
  });
  treeExclusions.add({
    id: 'route-1-rest-stop',
    shape: { type: 'circle', center: { x: 6, z: 122 }, radius: 14 },
  });
  treeExclusions.add({
    id: 'emerald-lake',
    shape: { type: 'circle', center: { x: lakeX, z: lakeZ }, radius: 34 },
  });

  const treeBlocked = (x: number, z: number): boolean =>
    isInsideVillageArea(x, z) ||
    isInsideProtectedZone(x, z, 4.0) ||
    isNearAnyRoad(x, z, 5.8) ||
    getDistanceToRiver(x, z).distance < RIVER_HALF_WIDTH + 3.0;

  const treePlacements = scatter.generate({
    group: scatter.database.require(SCATTER_GROUP_IDS.trees),
    bounds: { minX: -190, minZ: -190, maxX: 190, maxZ: 190 },
    terrain: terrainSampler,
    biome: biomeResolver,
    exclusions: treeExclusions,
    seed: scatterSeedConfig,
    blocked: treeBlocked,
  });

  const trees: TreeData[] = treePlacements.map((placement) => ({
    x: placement.x,
    z: placement.z,
    radius: 2.2 * placement.scale,
    scale: placement.scale,
    variant: placement.variant,
  }));

  // Group trees by spatial chunks
  const treeChunks: { x: number, z: number, meshes: THREE.InstancedMesh[] }[] = [];
  const treeBatches = batchScatterPlacements(treePlacements, 100);

  for (let b = 0; b < treeBatches.length; b++) {
    const batch = treeBatches[b];
    if (batch.placements.length === 0) continue;

    const chunkMeshes: THREE.InstancedMesh[] = [];
    for (let v = 0; v < 3; v++) {
      const variantTrees = batch.placements.filter((placement) => placement.variant === v);
      if (variantTrees.length === 0) continue;

      const iMesh = new THREE.InstancedMesh(billboardGeo, treeBillboardMaterials[v], variantTrees.length);
      variantTrees.forEach((t, i) => {
        const baseScaleV = LUMINATI_SCALE.TREE_HEIGHT_BASE * t.scale;
        dummy.position.set(t.x, t.y + (baseScaleV * 0.5), t.z);
        dummy.scale.set(LUMINATI_SCALE.TREE_WIDTH_BASE * t.scale, baseScaleV, 1);
        dummy.updateMatrix();
        iMesh.setMatrixAt(i, dummy.matrix);
      });
      iMesh.instanceMatrix.needsUpdate = true;
      iMesh.computeBoundingSphere();
      scene.add(iMesh);
      chunkMeshes.push(iMesh);
    }
    treeChunks.push({
      x: (batch.minX + batch.maxX) / 2,
      z: (batch.minZ + batch.maxZ) / 2,
      meshes: chunkMeshes,
    });
  }

  const sparkleTex = getTexture('sparkle', createSparkleTexture);
  const sparkleMat = new THREE.SpriteMaterial({ map: sparkleTex, transparent: true });
  const sparkles: SparkleData[] = [];
  const sparkleGroup = new THREE.Group();
  const sparkleCount = perfProfile.isMobile ? 48 : 120;
  for (let i = 0; i < sparkleCount; i++) {
    const sx = (rng() - 0.5) * 360;
    const sz = (rng() - 0.5) * 360;
    if (Math.hypot(sx - lakeX, sz - lakeZ) < 28) continue;
    const sy = getTerrainHeight(sx, sz) + 1 + rng() * 4;
    const sSprite = new THREE.Sprite(sparkleMat);
    const sScale = (0.8 + rng() * 1.2) * 1.3 * 1.3;
    sSprite.scale.set(sScale, sScale, 1);
    sSprite.position.set(sx, sy, sz);
    sparkleGroup.add(sSprite);
    sparkles.push({ mesh: sSprite, baseY: sy, phase: rng() * Math.PI * 2, speed: 1.5 + rng() * 2 });
  }
  scene.add(sparkleGroup);

  // 12.5 ATMOSPHERIC DRIFTING AUTUMN LEAVES (Villa Marioneta & Terraces)
  interface DriftingLeaf {
    sprite: THREE.Sprite;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    rotSpeed: number;
    swayPhase: number;
    swayFreq: number;
  }

  const crimsonDriftLeafTex = getTexture('drift_leaf_crimson', () => createSingleAutumnLeafTexture('crimson'));
  const amberDriftLeafTex = getTexture('drift_leaf_amber', () => createSingleAutumnLeafTexture('amber'));
  const crimsonDriftLeafMat = new THREE.SpriteMaterial({ map: crimsonDriftLeafTex, transparent: true, opacity: 0.92 });
  const amberDriftLeafMat = new THREE.SpriteMaterial({ map: amberDriftLeafTex, transparent: true, opacity: 0.92 });

  const leafGroup = new THREE.Group();
  const driftingLeaves: DriftingLeaf[] = [];
  const LEAF_COUNT = perfProfile.isMobile ? 24 : 55;

  for (let i = 0; i < LEAF_COUNT; i++) {
    const isCrimson = rng() > 0.45;
    const mat = isCrimson ? crimsonDriftLeafMat : amberDriftLeafMat;
    const sprite = new THREE.Sprite(mat);
    const leafScale = 0.5 + rng() * 0.45;
    sprite.scale.set(leafScale, leafScale, 1);

    const x = (rng() - 0.5) * 80;
    const z = (rng() - 0.5) * 80;
    const groundY = getTerrainHeight(x, z);
    const y = groundY + 1.2 + rng() * 10.0;

    sprite.position.set(x, y, z);
    leafGroup.add(sprite);

    driftingLeaves.push({
      sprite,
      x,
      y,
      z,
      vx: 1.4 + rng() * 1.8,
      vy: -0.55 - rng() * 0.7,
      vz: 0.9 + rng() * 1.3,
      rotSpeed: (rng() - 0.5) * 4.0,
      swayPhase: rng() * Math.PI * 2,
      swayFreq: 2.0 + rng() * 2.5,
    });
  }
  scene.add(leafGroup);

  const elementalSoulDefs = [
    { element: 'Fuego', sprite: '/assets/souls/soul_fire.webp', color: '#ef4444', name: 'Ignis', title: 'Heraldo de la Llama', lore: 'Espíritu ígneo que canaliza el ardor bélico de los volcanes de Luminati.', posX: 64, posZ: 46 },
    { element: 'Agua', sprite: '/assets/souls/soul_water.webp', color: '#0ea5e9', name: 'Aqualis', title: 'Espíritu de las Mareas', lore: 'Guardián acuático que custodia los manantiales y corrientes sagradas.', posX: -12, posZ: 92 },
    { element: 'Tierra', sprite: '/assets/souls/soul_earth.webp', color: '#84cc16', name: 'Terran', title: 'Titán de Roca y Musgo', lore: 'Espíritu telúrico tan resistente como los antiguos monolitos de piedra.', posX: 88, posZ: 42 },
    { element: 'Viento', sprite: '/assets/souls/soul_wind.webp', color: '#bae6fd', name: 'Zephyrus', title: 'Vórtice del Céfiro', lore: 'Viaja con la ligereza de la brisa y susurra entre las copas de los árboles.', posX: 18, posZ: 88 },
    { element: 'Hielo', sprite: '/assets/souls/soul_ice.webp', color: '#7dd3fc', name: 'Glacies', title: 'Prisma de Escarcha', lore: 'Espíritu de la helada perpetua, esculpido con púas de escarcha cristalina.', posX: 120, posZ: 145 },
    { element: 'Rayo', sprite: '/assets/souls/soul_electric.webp', color: '#eab308', name: 'Fulgor', title: 'Chispa del Trueno', lore: 'Condensa la electricidad de las tormentas en un orbe crepitante incesante.', posX: 86, posZ: 14 },
    { element: 'Planta', sprite: '/assets/souls/soul_nature.webp', color: '#22c55e', name: 'Sylva', title: 'Brote del Bosque Eterno', lore: 'Nutre la flora silvestre y hace florecer las raíces dormidas de la tierra.', posX: -78, posZ: -28 },
    { element: 'Luz', sprite: '/assets/souls/soul_light.webp', color: '#fbbf24', name: 'Lumina', title: 'Aurora Celestial', lore: 'Esencia celestial radiante que ilumina y bendice a los viajeros de la noche.', posX: -14, posZ: 65 },
    { element: 'Sombra', sprite: '/assets/souls/soul_dark.webp', color: '#a855f7', name: 'Umbra', title: 'Eco del Abismo', lore: 'Nacido en las simas más oscuras, envuelve los senderos con velos de misterio.', posX: 55, posZ: -110 },
    { element: 'Cosmos', sprite: '/assets/souls/soul_light.webp', color: '#c084fc', name: 'Aether', title: 'Espíritu Primordial Cósmico', lore: 'Armoniza los nueve elementos en un vórtice astral de sabiduría ancestral.', posX: -135, posZ: -115 },
  ];

  const soulTextureCache: Record<string, THREE.Texture> = {};
  elementalSoulDefs.forEach(def => {
    if (!soulTextureCache[def.sprite]) {
      const tex = textureLoader.load(def.sprite);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      soulTextureCache[def.sprite] = tex;
    }
  });

  const soulDolls: SoulDoll[] = [];
  const soulGroup = new THREE.Group();
  const soulMeshes: THREE.Sprite[] = [];
  for (let i = 0; i < elementalSoulDefs.length; i++) {
    const def = elementalSoulDefs[i];
    const sx = def.posX;
    const sz = def.posZ;
    const sy = getTerrainHeight(sx, sz) + 2.2;
    soulDolls.push({
      id: `soul-${i}`,
      x: sx,
      z: sz,
      y: sy,
      name: def.name,
      element: def.element,
      title: def.title,
      lore: def.lore,
      color: def.color,
      spriteUrl: def.sprite,
      collected: false,
      floatOffset: rng() * Math.PI * 2,
    });
    const mat = new THREE.SpriteMaterial({
      map: soulTextureCache[def.sprite],
      transparent: true,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.6, 5.2, 1);
    sprite.position.set(sx, sy + 2.0, sz);
    soulGroup.add(sprite);
    soulMeshes.push(sprite);
  }
  scene.add(soulGroup);

  const spirits: Spirit[] = [];
  const spiritMeshes: THREE.Sprite[] = [];
  const spiritMat = new THREE.SpriteMaterial({ map: getTexture('spirit_orb', createSpiritTexture), transparent: true });
  for (let i = 0; i < 8; i++) {
    const sx = (rng() - 0.5) * 220;
    const sz = (rng() - 0.5) * 220;
    spirits.push({ id: `spirit-${i}`, x: sx, z: sz, vx: (rng() - 0.5) * 4, vz: (rng() - 0.5) * 4, radius: 3 });
    const sSprite = new THREE.Sprite(spiritMat);
    sSprite.scale.set(4.5, 4.5, 1);
    scene.add(sSprite);
    spiritMeshes.push(sSprite);
  }

  let timeElapsed = 0;

  const skyColorScratch = nightColor.clone();
  const grassColorScratch = new THREE.Color();
  scene.background = skyColorScratch;

  const setTimeOfDay = (t: number) => {
    skyColorScratch.copy(nightColor).lerp(dayColor, t);
    if (scene.fog) scene.fog.color.copy(skyColorScratch);
    hemi.intensity = THREE.MathUtils.lerp(0.35, 1.2, t);
    moonLight.intensity = THREE.MathUtils.lerp(1.35, 0.0, t);
    sunLight.intensity = THREE.MathUtils.lerp(0.0, 1.5, t);
    moonMat.opacity = THREE.MathUtils.lerp(1.0, 0.0, t);
    starsMat.opacity = THREE.MathUtils.lerp(1.0, 0.0, t);
    grassColorScratch.setHSL(0.55, 0.82, THREE.MathUtils.lerp(0.42, 0.72, t));
    grassInstancedMat.uniforms.diffuse.value.copy(grassColorScratch);
    for (let i = 0; i < treeBillboardMaterials.length; i++) {
      treeBillboardMaterials[i].uniforms.diffuse.value.copy(grassColorScratch);
    }

    // Skip dynamic PointLights on mobile/software WebGL (lantern halo sprites remain visible)
    const intensity = perfProfile.isMobile || perfProfile.isSoftwareGl ? 0.0 : THREE.MathUtils.lerp(1.5, 0.0, t);
    for (let i = 0; i < lampLights.length; i++) {
      lampLights[i].intensity = intensity;
    }
  };

  const updateWorld = (delta: number, playerX: number, playerZ: number) => {
    timeElapsed += delta;
    grassInstancedMat.uniforms.time.value = timeElapsed;
    worldManager.generate(terrainSampler, DEFAULT_TERRAIN_BOUNDS, worldDefinition.seed);

    // Stream continuous 64x64m terrain & natural formation chunks around player
    chunkManager.update(playerX, playerZ);

    const playerY = getTerrainHeight(playerX, playerZ);

    // Animate manual narrative locations (Sun Temple prism & Spectral Crypt boss)
    sunTempleBuilt.update(timeElapsed);
    spectralCryptBuilt.update(
      timeElapsed,
      getTerrainHeight(spectralCryptBuilt.boss.x, spectralCryptBuilt.boss.z)
    );

    // Update Regional Harvestable Resource Nodes
    for (let i = 0; i < resourceNodes.length; i++) {
      const node = resourceNodes[i];
      const grp = resourceNodeGroups[i];
      if (node.harvested) {
        grp.visible = false;
      } else {
        grp.visible = true;
        grp.rotation.y = Math.sin(timeElapsed * 0.6 + i) * 0.15;
      }
    }
    
    // Flicker lamp lights
    lampLights.forEach((l, i) => {
      if (l.intensity > 0) {
        l.intensity = 1.3 + Math.sin(timeElapsed * 10 + i) * 0.2;
      }
    });

    treeBillboardMaterials.forEach(m => {
      m.uniforms.playerPos.value.set(playerX, playerY, playerZ);
      m.uniforms.cameraPos.value.copy(camera.position);
    });

    // Adaptive visibility culling for tree chunks (mobile vs desktop render distance)
    const treeLoadRadius = perfProfile.treeCullDistance;
    treeChunks.forEach(chunk => {
      const dist = Math.hypot(chunk.x - playerX, chunk.z - playerZ);
      const visible = dist < treeLoadRadius;
      chunk.meshes.forEach(m => m.visible = visible);
    });

    const bushLoadRadius = treeLoadRadius * 0.8;
    bushChunks.forEach(chunk => {
      const dist = Math.hypot(chunk.x - playerX, chunk.z - playerZ);
      const visible = dist < bushLoadRadius;
      chunk.meshes.forEach(m => m.visible = visible);
    });

    const grassLoadRadius = perfProfile.isMobile ? 75 : 120;
    grassChunks.forEach(chunk => {
      const dist = Math.hypot(chunk.x - playerX, chunk.z - playerZ);
      const visible = dist < grassLoadRadius;
      chunk.meshes.forEach(m => m.visible = visible);
    });

    soulMeshes.forEach((mesh, idx) => {
      const s = soulDolls[idx];
      if (!s.collected) {
        // Natural breathing (slow) + bust jiggle (fast)
        const terrainHeight = getTerrainHeight(s.x, s.z);
        const breathing = Math.sin(timeElapsed * 2) * 0.05;
        const jiggle = Math.sin(timeElapsed * 15) * 0.03;
        const newScaleY = 5.2 + breathing + jiggle;
        
        // Anchor to floor by adjusting position based on new scale
        mesh.scale.set(3.6, newScaleY, 1);
        mesh.position.y = terrainHeight + (newScaleY / 2);
      } else {
        mesh.visible = false;
      }
    });

    spirits.forEach((sp, idx) => {
      sp.x += sp.vx * delta; sp.z += sp.vz * delta;
      if (Math.abs(sp.x) > 180) sp.vx *= -1;
      if (Math.abs(sp.z) > 180) sp.vz *= -1;
      spiritMeshes[idx].position.set(sp.x, getTerrainHeight(sp.x, sp.z) + 4.225 + Math.sin(timeElapsed * 4 + idx) * 0.5, sp.z);
    });

    enemies.forEach((en, idx) => {
      if (!en.alive) { enemySprites[idx].visible = false; return; }
      const angle = timeElapsed * en.speed * 0.5 + idx;
      en.x = en.startX + Math.cos(angle) * en.patrolDist;
      en.z = en.startZ + Math.sin(angle) * en.patrolDist;
      enemySprites[idx].position.set(en.x, getTerrainHeight(en.x, en.z) + 2.0, en.z);
    });

    chests.forEach((c, idx) => {
      if (c.opened) { chestSprites[idx].material.map = openChestTex; chestSprites[idx].material.needsUpdate = true; }
    });

    sparkles.forEach(sp => {
      sp.mesh.position.y = sp.baseY + Math.sin(timeElapsed * sp.speed + sp.phase) * 0.6;
      sp.mesh.material.opacity = 0.5 + Math.sin(timeElapsed * 5 + sp.phase) * 0.5;
    });

    fountains.forEach(f => { if (f.orbMesh) f.orbMesh.position.y = f.baseY + Math.sin(timeElapsed * 3 + f.x) * 0.25; });

    // Update drifting autumn foliage particles around player and village
    driftingLeaves.forEach(leaf => {
      leaf.swayPhase += delta * leaf.swayFreq;
      const swayX = Math.sin(leaf.swayPhase) * 1.2;
      const swayZ = Math.cos(leaf.swayPhase * 0.8) * 0.9;

      leaf.x += (leaf.vx + swayX) * delta;
      leaf.y += leaf.vy * delta;
      leaf.z += (leaf.vz + swayZ) * delta;

      leaf.sprite.material.rotation += leaf.rotSpeed * delta;

      const groundY = getTerrainHeight(leaf.x, leaf.z);
      const distFromPlayer = Math.hypot(leaf.x - playerX, leaf.z - playerZ);

      // When leaf hits the ground or drifts too far, respawn smoothly upwind
      if (leaf.y <= groundY + 0.15 || distFromPlayer > 65) {
        leaf.x = playerX - 35 + (Math.random() - 0.5) * 60;
        leaf.z = playerZ - 35 + (Math.random() - 0.5) * 60;
        leaf.y = getTerrainHeight(leaf.x, leaf.z) + 6.0 + Math.random() * 8.0;
      }

      leaf.sprite.position.set(leaf.x, leaf.y, leaf.z);
    });

    // Soft organic breathing for warm atmospheric halos
    lanternHaloMat.opacity = 0.55 + Math.sin(timeElapsed * 2.5) * 0.12;
    purpleHaloMat.opacity = 0.68 + Math.sin(timeElapsed * 3.2) * 0.15;
  };

  return {
    soulDolls,
    spirits,
    trees,
    collisionBoxes,
    lakeCenter: { x: lakeX, z: lakeZ },
    npcs,
    chests,
    enemies,
    grassPatches,
    fountains: fountains.map(f => ({ x: f.x, z: f.z, radius: f.radius })),
    signposts,
    resourceNodes,
    worldBosses,
    chunkManager,
    isInsideGrass,
    updateWorld,
    setTimeOfDay,
  };
}

