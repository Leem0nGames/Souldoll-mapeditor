/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CollisionBox } from './worldGen';
import { BuildingMaterialPalette } from './buildingGen';
import { getTexture } from './textureManager';
import { createLanternHaloTexture, createRunicGlyphTexture } from './textures';
import { Signpost, WorldBoss } from '../types';

export interface SunTempleResult {
  group: THREE.Group;
  collision: CollisionBox[];
  signpost: Signpost;
  update: (elapsed: number) => void;
}

export interface SpectralCryptResult {
  group: THREE.Group;
  collision: CollisionBox[];
  signpost: Signpost;
  boss: WorldBoss;
  bossSprite: THREE.Sprite;
  bossAuraSprite: THREE.Sprite;
  update: (elapsed: number, groundY: number) => void;
}

/**
 * Builds the handcrafted Sun Temple of Dawn ("Templo Solar del Alba")
 * on the elevated northern meadow plateau (x: -38, z: 136).
 */
export function buildSunTemple(
  x: number,
  y: number,
  z: number,
  palette: BuildingMaterialPalette
): SunTempleResult {
  const group = new THREE.Group();
  group.name = 'sun_temple_alba';
  const collision: CollisionBox[] = [];

  const stoneMat = palette.mossyStoneMat(6, 6);
  const ashlarMat = palette.stoneBrickMat(4, 8);
  const floorMat = palette.cobbleRoundMat(12, 12);

  // 1. Stepped Sanctuary Podium (2 tiers)
  const lowerDais = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.55, 16.0), stoneMat);
  lowerDais.position.set(0, 0.275, 0);
  group.add(lowerDais);

  const upperDais = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.45, 13.2), floorMat);
  upperDais.position.set(0, 0.775, 0);
  group.add(upperDais);

  // South Entrance Steps
  const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.5, 2.2), stoneMat);
  stepMesh.position.set(0, 0.25, 8.6);
  group.add(stepMesh);

  // 2. Six Classical Stone Columns framing the Sanctum
  const colPositions = [
    { cx: -5.2, cz: -5.2, h: 6.8 },
    { cx: 5.2, cz: -5.2, h: 6.8 },
    { cx: -5.2, cz: 0.0, h: 6.8 },
    { cx: 5.2, cz: 0.0, h: 5.4 }, // weathered ruined column
    { cx: -5.2, cz: 5.2, h: 6.2 },
    { cx: 5.2, cz: 5.2, h: 6.8 },
  ];

  colPositions.forEach((c) => {
    // Plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.6), stoneMat);
    plinth.position.set(c.cx, 1.3, c.cz);
    group.add(plinth);

    // Fluted column shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.68, c.h, 10), ashlarMat);
    shaft.position.set(c.cx, 1.6 + c.h * 0.5, c.cz);
    group.add(shaft);

    // Capital
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 1.5), stoneMat);
    cap.position.set(c.cx, 1.6 + c.h + 0.22, c.cz);
    group.add(cap);

    collision.push({ x: x + c.cx, z: z + c.cz, rx: 0.95, rz: 0.95 });
  });

  // 3. North Sanctum Architrave Lintel & Pediment Crown
  const northBeam = new THREE.Mesh(new THREE.BoxGeometry(12.2, 1.1, 1.6), stoneMat);
  northBeam.position.set(0, 9.15, -5.2);
  group.add(northBeam);

  const westBeam = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 6.6), stoneMat);
  westBeam.position.set(-5.2, 9.05, -2.6);
  group.add(westBeam);

  // 4. Central Solar Altar & Levitating Dawn Prism
  const altarBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.3, 2.8), stoneMat);
  altarBase.position.set(0, 1.65, -1.2);
  group.add(altarBase);
  collision.push({ x, z: z - 1.2, rx: 1.6, rz: 1.6 });

  const prismGeo = new THREE.OctahedronGeometry(0.95, 0);
  const prismMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.9,
    roughness: 0.15,
    metalness: 0.6,
  });
  const prismMesh = new THREE.Mesh(prismGeo, prismMat);
  prismMesh.position.set(0, 3.6, -1.2);
  group.add(prismMesh);

  const haloTex = getTexture('lantern_halo', createLanternHaloTexture);
  const solarHaloMat = new THREE.SpriteMaterial({
    map: haloTex,
    color: new THREE.Color('#fde047'),
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const solarHalo = new THREE.Sprite(solarHaloMat);
  solarHalo.scale.set(4.8, 4.8, 1);
  solarHalo.position.set(0, 3.6, -1.2);
  group.add(solarHalo);

  const solarLight = new THREE.PointLight(0xfbbf24, 1.9, 18);
  solarLight.position.set(0, 4.2, -1.2);
  group.add(solarLight);

  group.position.set(x, y, z);

  const signpost: Signpost = {
    id: 'sign-sun-temple',
    x: x + 4.2,
    z: z + 9.4,
    name: 'Templo Solar del Alba',
    text: 'TEMPLO SOLAR DEL ALBA: "Santuario erigido por los primeros Marionetistas de la Luz para bendecir las cosechas y el cauce del Río Celeste."',
  };

  const update = (elapsed: number) => {
    prismMesh.rotation.y = elapsed * 1.1;
    prismMesh.position.y = 3.6 + Math.sin(elapsed * 2.4) * 0.25;
    solarHalo.position.y = prismMesh.position.y;
  };

  return { group, collision, signpost, update };
}

/**
 * Builds the handcrafted Spectral Crypt & Guardian Boss Arena ("Cripta del Abismo")
 * in the southeastern Spectral Rift (x: 68, z: -128).
 */
export function buildSpectralCryptAndBoss(
  x: number,
  y: number,
  z: number,
  palette: BuildingMaterialPalette,
  textureLoader: THREE.TextureLoader
): SpectralCryptResult {
  const group = new THREE.Group();
  group.name = 'spectral_crypt_abismo';
  const collision: CollisionBox[] = [];

  const darkWallMat = palette.stoneBrickMat(6, 6);
  const slateRoofMat = palette.darkRoofMat(8, 6);
  const plinthMat = palette.mossyStoneMat(10, 10);

  // 1. Obsidian-Slate Courtyard Flagstones
  const courtGeo = new THREE.CircleGeometry(12.5, 24);
  courtGeo.rotateX(-Math.PI / 2);
  const courtMesh = new THREE.Mesh(courtGeo, plinthMat);
  courtMesh.position.set(0, 0.05, 2.0);
  group.add(courtMesh);

  // 2. Gothic Mausoleum Crypt Structure (at north end of courtyard)
  const cryptZ = -5.5;
  const cryptBase = new THREE.Mesh(new THREE.BoxGeometry(10.4, 1.4, 8.4), plinthMat);
  cryptBase.position.set(0, 0.7, cryptZ);
  group.add(cryptBase);

  const cryptBody = new THREE.Mesh(new THREE.BoxGeometry(9.2, 6.2, 7.2), darkWallMat);
  cryptBody.position.set(0, 4.5, cryptZ);
  group.add(cryptBody);

  // Steep Gothic Pitched Roof (2 angled roof slopes)
  const leftRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.5, 8.2), slateRoofMat);
  leftRoofSlope.position.set(-2.5, 9.1, cryptZ);
  leftRoofSlope.rotation.z = Math.PI / 4.2;
  group.add(leftRoofSlope);

  const rightRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.5, 8.2), slateRoofMat);
  rightRoofSlope.position.set(2.5, 9.1, cryptZ);
  rightRoofSlope.rotation.z = -Math.PI / 4.2;
  group.add(rightRoofSlope);

  // Sealed Abyssal Portal Recess + Runic Seal
  const portalRecess = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 4.8, 0.6),
    new THREE.MeshBasicMaterial({ color: 0x090414 })
  );
  portalRecess.position.set(0, 3.6, cryptZ + 3.5);
  group.add(portalRecess);

  const runicTex = getTexture('runic_glyph', createRunicGlyphTexture);
  const sealSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: runicTex,
      color: new THREE.Color('#c084fc'),
      transparent: true,
    })
  );
  sealSprite.scale.set(2.4, 2.4, 1);
  sealSprite.position.set(0, 4.2, cryptZ + 3.9);
  group.add(sealSprite);

  collision.push({ x, z: z + cryptZ, rx: 5.4, rz: 4.4 });

  // 3. Four Runic Obelisks framing the Boss Arena
  const haloTex = getTexture('lantern_halo', createLanternHaloTexture);
  const riftHaloMat = new THREE.SpriteMaterial({
    map: haloTex,
    color: new THREE.Color('#a855f7'),
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const obeliskCoords = [
    { ox: -7.5, oz: 0.5 },
    { ox: 7.5, oz: 0.5 },
    { ox: -7.5, oz: 8.5 },
    { ox: 7.5, oz: 8.5 },
  ];

  obeliskCoords.forEach((ob) => {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, 4.8, 4), darkWallMat);
    shaft.position.set(ob.ox, 2.4, ob.oz);
    shaft.rotation.y = Math.PI / 4;
    group.add(shaft);

    const halo = new THREE.Sprite(riftHaloMat);
    halo.scale.set(3.2, 3.2, 1);
    halo.position.set(ob.ox, 5.1, ob.oz);
    group.add(halo);

    collision.push({ x: x + ob.ox, z: z + ob.oz, rx: 1.0, rz: 1.0 });
  });

  const cryptLight = new THREE.PointLight(0xa855f7, 2.0, 20);
  cryptLight.position.set(0, 5.0, 2.5);
  group.add(cryptLight);

  group.position.set(x, y, z);

  // 4. Guardian Boss Sprite ("HUECO CORRUPTO" - /assets/souldolls/52.webp front frame)
  const bossWorldX = x;
  const bossWorldZ = z + 3.8;
  const bossSheetTex = textureLoader.load('/assets/souldolls/52.webp');
  bossSheetTex.magFilter = THREE.NearestFilter;
  bossSheetTex.minFilter = THREE.NearestFilter;
  bossSheetTex.colorSpace = THREE.SRGBColorSpace;
  // Crop strictly to front frame { x: 61, y: 11, w: 520, h: 868 } on 1200x896 sheet
  bossSheetTex.repeat.set(520 / 1200, 868 / 896);
  bossSheetTex.offset.set(61 / 1200, 1 - (11 + 868) / 896);

  const bossSpriteMat = new THREE.SpriteMaterial({
    map: bossSheetTex,
    transparent: true,
    alphaTest: 0.2,
  });
  const bossSprite = new THREE.Sprite(bossSpriteMat);
  bossSprite.scale.set(5.2, 8.6, 1);
  bossSprite.position.set(bossWorldX, y + 4.3, bossWorldZ);

  const bossAuraMat = new THREE.SpriteMaterial({
    map: haloTex,
    color: new THREE.Color('#9333ea'),
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const bossAuraSprite = new THREE.Sprite(bossAuraMat);
  bossAuraSprite.scale.set(8.5, 8.5, 1);
  bossAuraSprite.position.set(bossWorldX, y + 3.8, bossWorldZ - 0.2);

  const boss: WorldBoss = {
    id: 'boss_hueco_corrupto',
    x: bossWorldX,
    z: bossWorldZ,
    name: 'Hueco Corrupto',
    title: 'Guardián de la Cripta Espectral (Nv. 25)',
    forcedSoulName: 'HUECO CORRUPTO',
    defeated: false,
  };

  const signpost: Signpost = {
    id: 'sign-spectral-crypt',
    x: x - 4.8,
    z: z + 10.5,
    name: 'Cripta del Abismo',
    text: 'CRIPTA DEL ABISMO ESPECTRAL: "¡Peligro Extremo! El Hueco Corrupto (Nv. 25) custodia el sello ancestral. Interactúa [E] frente a él solo si tu equipo está preparado."',
  };

  const update = (elapsed: number, groundY: number) => {
    if (boss.defeated) {
      bossSprite.visible = false;
      bossAuraSprite.visible = false;
      return;
    }
    bossSprite.visible = true;
    bossAuraSprite.visible = true;
    const hover = Math.sin(elapsed * 2.2) * 0.28;
    const breath = Math.sin(elapsed * 3.5) * 0.16;
    bossSprite.scale.set(5.2 + breath * 0.5, 8.6 + breath, 1);
    bossSprite.position.set(bossWorldX, groundY + 4.3 + hover, bossWorldZ);
    bossAuraSprite.position.set(bossWorldX, groundY + 3.8 + hover, bossWorldZ - 0.2);
    bossAuraMat.opacity = 0.55 + Math.sin(elapsed * 4.0) * 0.2;
  };

  return {
    group,
    collision,
    signpost,
    boss,
    bossSprite,
    bossAuraSprite,
    update,
  };
}
