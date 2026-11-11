/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CollisionBox } from './worldGen';
import { BuildingMaterialPalette } from './buildingGen';
import { getTexture } from './textureManager';
import { createLanternHaloTexture } from './textures';

export interface CaveEntranceData {
  group: THREE.Group;
  collision: CollisionBox[];
  signpost: {
    id: string;
    x: number;
    z: number;
    title: string;
    text: string;
  };
}

/**
 * Builds a monumental 3D Cave Entrance carved into the mountain rock.
 * Includes carved stone portal arch, mystical crystal core, runic pillars, and interactive signpost.
 */
export function buildCaveEntrance(
  x: number,
  y: number,
  z: number,
  palette: BuildingMaterialPalette
): CaveEntranceData {
  const group = new THREE.Group();
  group.name = 'cave_entrance_crystal';
  const collision: CollisionBox[] = [];

  const stoneMat = palette.mossyStoneMat(8, 8);
  const darkStoneMat = palette.stoneBrickMat(6, 6);

  // 1. Massive Stone Cliff Facade (Embedded into mountain slope)
  const facadeGeo = new THREE.BoxGeometry(16.0, 10.5, 4.5);
  const facadeMesh = new THREE.Mesh(facadeGeo, stoneMat);
  facadeMesh.position.set(0, 5.25, -2.0);
  group.add(facadeMesh);

  // Upper Rock Arch Crest
  const crestGeo = new THREE.BoxGeometry(12.0, 3.2, 5.2);
  const crestMesh = new THREE.Mesh(crestGeo, stoneMat);
  crestMesh.position.set(0, 11.0, -1.8);
  group.add(crestMesh);

  // 2. Carved Arch Portal Frame (Flanking pillars & lintel)
  const pillarGeo = new THREE.BoxGeometry(2.4, 7.5, 3.0);
  const leftPillar = new THREE.Mesh(pillarGeo, darkStoneMat);
  leftPillar.position.set(-4.2, 3.75, 0);
  group.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeo, darkStoneMat);
  rightPillar.position.set(4.2, 3.75, 0);
  group.add(rightPillar);

  const lintelGeo = new THREE.BoxGeometry(11.0, 2.2, 3.2);
  const lintelMesh = new THREE.Mesh(lintelGeo, darkStoneMat);
  lintelMesh.position.set(0, 8.2, 0);
  group.add(lintelMesh);

  // 3. Dark Cave Interior Recess
  const interiorGeo = new THREE.BoxGeometry(6.0, 7.0, 3.5);
  const interiorMat = new THREE.MeshBasicMaterial({ color: 0x05040a });
  const interiorMesh = new THREE.Mesh(interiorGeo, interiorMat);
  interiorMesh.position.set(0, 3.5, -2.8);
  group.add(interiorMesh);

  // 4. Mystical Floating Resonant Soul Crystal in Entrance
  const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.8,
    roughness: 0.1,
    metalness: 0.8,
  });
  const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
  crystalMesh.position.set(0, 3.8, -1.0);
  group.add(crystalMesh);

  // Mystical Cyan Point Light
  const caveLight = new THREE.PointLight(0x38bdf8, 2.0, 16);
  caveLight.position.set(0, 4.0, 0.5);
  group.add(caveLight);

  // Crystal Glow Halo
  const haloTex = getTexture('lantern_halo', createLanternHaloTexture);
  const haloMat = new THREE.SpriteMaterial({
    map: haloTex,
    color: new THREE.Color('#38bdf8'),
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const haloSprite = new THREE.Sprite(haloMat);
  haloSprite.scale.set(5.5, 5.5, 1);
  haloSprite.position.set(0, 3.8, -0.8);
  group.add(haloSprite);

  // 5. Twin Stone Braziers Flanking Entrance Approach
  [-5.8, 5.8].forEach(bx => {
    const bBaseGeo = new THREE.CylinderGeometry(0.8, 1.1, 1.6, 8);
    const bBase = new THREE.Mesh(bBaseGeo, darkStoneMat);
    bBase.position.set(bx, 0.8, 2.2);
    group.add(bBase);

    const bBowlGeo = new THREE.CylinderGeometry(1.2, 0.7, 0.8, 8);
    const bBowl = new THREE.Mesh(bBowlGeo, stoneMat);
    bBowl.position.set(bx, 1.8, 2.2);
    group.add(bBowl);

    const bFireLight = new THREE.PointLight(0x06b6d4, 1.4, 10);
    bFireLight.position.set(bx, 2.4, 2.2);
    group.add(bFireLight);

    const bFireSprite = new THREE.Sprite(haloMat);
    bFireSprite.scale.set(3.0, 3.0, 1);
    bFireSprite.position.set(bx, 2.4, 2.2);
    group.add(bFireSprite);

    collision.push({
      x: x + bx,
      z: z + 2.2,
      rx: 1.1,
      rz: 1.1,
    });
  });

  // Collision boundaries (solid mountain cliff and pillar wings)
  collision.push(
    // Left mountain wing
    { x: x - 5.5, z: z - 1.0, rx: 3.5, rz: 3.0 },
    // Right mountain wing
    { x: x + 5.5, z: z - 1.0, rx: 3.5, rz: 3.0 },
    // Back interior wall (cannot walk through mountain)
    { x, z: z - 3.8, rx: 4.5, rz: 1.5 }
  );

  group.position.set(x, y, z);

  const signpost = {
    id: 'poi_cave_entrance',
    x: x - 4.5,
    z: z + 3.5,
    title: 'Cueva de Cristal Ancestral',
    text: 'Frente a ti se alza el pórtico de la Cueva de Cristal Ancestral. En las profundidades resuenan ecos de almas primigenias y cristales de éter helado.',
  };

  return { group, collision, signpost };
}
