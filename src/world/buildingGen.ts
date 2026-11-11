/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface CollisionBox {
  x: number;
  z: number;
  rx: number;
  rz: number;
}

export interface BuildingMaterialPalette {
  mossyStoneMat: (w: number, h: number) => THREE.Material;
  stoneBrickMat: (w: number, h: number) => THREE.Material;
  redBrickMat: (w: number, h: number) => THREE.Material;
  cobbleRoundMat: (w: number, h: number) => THREE.Material;
  woodPlankMat: (w: number, h: number) => THREE.Material;
  timberXMat: (w: number, h: number) => THREE.Material;
  timberVMat: (w: number, h: number) => THREE.Material;
  plainStuccoMat: (w: number, h: number) => THREE.Material;
  woodWallMaterials: (w: number, h: number, d: number) => THREE.Material[];
  timberWallMaterials: (w: number, h: number, d: number) => THREE.Material[];
  terracottaRoofMat: (w: number, h: number) => THREE.Material;
  darkRoofMat: (w: number, h: number) => THREE.Material;
  blueRoofMat: (w: number, h: number) => THREE.Material;
  thatchRoofMat: (w: number, h: number) => THREE.Material;
  bronzeDomeMat: THREE.Material;
  doorSpriteMat: THREE.SpriteMaterial;
  doubleDoorSpriteMat: THREE.SpriteMaterial;
  windowSpriteMat: THREE.SpriteMaterial;
  window2PaneSpriteMat: THREE.SpriteMaterial;
}

/**
 * Creates an authentic gabled pitched roof (tejado a dos aguas) with eaves,
 * ridge beam, triangular gable walls, and bargeboards.
 */
export function createPitchedRoof(
  width: number,
  depth: number,
  height: number,
  roofMat: THREE.Material,
  gableMat: THREE.Material,
  woodTrimMat: THREE.Material,
  direction: 'z' | 'x' = 'z',
  overhangX = 1.1,
  overhangZ = 1.1
): THREE.Group {
  const roofGroup = new THREE.Group();

  if (direction === 'z') {
    // Ridge runs along Z axis (from -depth/2 to +depth/2)
    const totalW = width + overhangX * 2;
    const totalD = depth + overhangZ * 2;
    const halfW = totalW * 0.5;
    const slopeLen = Math.hypot(halfW, height);
    const angle = Math.atan2(height, halfW);
    const thickness = 0.5;

    // Left slope (-X)
    const leftSlopeGeo = new THREE.BoxGeometry(slopeLen, thickness, totalD);
    const leftSlope = new THREE.Mesh(leftSlopeGeo, roofMat);
    leftSlope.position.set(-halfW * 0.5, height * 0.5, 0);
    leftSlope.rotation.z = angle;
    leftSlope.castShadow = true;
    leftSlope.receiveShadow = true;
    roofGroup.add(leftSlope);

    // Right slope (+X)
    const rightSlopeGeo = new THREE.BoxGeometry(slopeLen, thickness, totalD);
    const rightSlope = new THREE.Mesh(rightSlopeGeo, roofMat);
    rightSlope.position.set(halfW * 0.5, height * 0.5, 0);
    rightSlope.rotation.z = -angle;
    rightSlope.castShadow = true;
    rightSlope.receiveShadow = true;
    roofGroup.add(rightSlope);

    // Ridge beam along crest
    const ridgeGeo = new THREE.BoxGeometry(0.65, 0.65, totalD + 0.4);
    const ridge = new THREE.Mesh(ridgeGeo, woodTrimMat);
    ridge.position.set(0, height + 0.15, 0);
    roofGroup.add(ridge);

    // Triangular Gable Walls
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-width * 0.5, 0);
    gableShape.lineTo(0, height * (width / totalW));
    gableShape.lineTo(width * 0.5, 0);
    gableShape.closePath();
    const gableGeo = new THREE.ShapeGeometry(gableShape);

    // Front gable
    const frontGable = new THREE.Mesh(gableGeo, gableMat);
    frontGable.position.set(0, 0, -depth * 0.5);
    roofGroup.add(frontGable);

    // Back gable
    const backGable = new THREE.Mesh(gableGeo, gableMat);
    backGable.position.set(0, 0, depth * 0.5);
    backGable.rotation.y = Math.PI;
    roofGroup.add(backGable);

    // Eave bargeboards
    const bargeGeo = new THREE.BoxGeometry(slopeLen + 0.2, 0.55, 0.3);
    const fbL = new THREE.Mesh(bargeGeo, woodTrimMat);
    fbL.position.set(-halfW * 0.5, height * 0.5, -totalD * 0.5);
    fbL.rotation.z = angle;
    roofGroup.add(fbL);

    const fbR = new THREE.Mesh(bargeGeo, woodTrimMat);
    fbR.position.set(halfW * 0.5, height * 0.5, -totalD * 0.5);
    fbR.rotation.z = -angle;
    roofGroup.add(fbR);

    const bbL = new THREE.Mesh(bargeGeo, woodTrimMat);
    bbL.position.set(-halfW * 0.5, height * 0.5, totalD * 0.5);
    bbL.rotation.z = angle;
    roofGroup.add(bbL);

    const bbR = new THREE.Mesh(bargeGeo, woodTrimMat);
    bbR.position.set(halfW * 0.5, height * 0.5, totalD * 0.5);
    bbR.rotation.z = -angle;
    roofGroup.add(bbR);
  } else {
    // Ridge runs along X axis
    const totalW = width + overhangX * 2;
    const totalD = depth + overhangZ * 2;
    const halfD = totalD * 0.5;
    const slopeLen = Math.hypot(halfD, height);
    const angle = Math.atan2(height, halfD);
    const thickness = 0.5;

    // Front slope (-Z)
    const frontSlopeGeo = new THREE.BoxGeometry(totalW, thickness, slopeLen);
    const frontSlope = new THREE.Mesh(frontSlopeGeo, roofMat);
    frontSlope.position.set(0, height * 0.5, -halfD * 0.5);
    frontSlope.rotation.x = -angle;
    frontSlope.castShadow = true;
    frontSlope.receiveShadow = true;
    roofGroup.add(frontSlope);

    // Back slope (+Z)
    const backSlopeGeo = new THREE.BoxGeometry(totalW, thickness, slopeLen);
    const backSlope = new THREE.Mesh(backSlopeGeo, roofMat);
    backSlope.position.set(0, height * 0.5, halfD * 0.5);
    backSlope.rotation.x = angle;
    backSlope.castShadow = true;
    backSlope.receiveShadow = true;
    roofGroup.add(backSlope);

    // Ridge beam along X
    const ridgeGeo = new THREE.BoxGeometry(totalW + 0.4, 0.65, 0.65);
    const ridge = new THREE.Mesh(ridgeGeo, woodTrimMat);
    ridge.position.set(0, height + 0.15, 0);
    roofGroup.add(ridge);

    // Triangular Gable Walls
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-depth * 0.5, 0);
    gableShape.lineTo(0, height * (depth / totalD));
    gableShape.lineTo(depth * 0.5, 0);
    gableShape.closePath();
    const gableGeo = new THREE.ShapeGeometry(gableShape);

    const leftGable = new THREE.Mesh(gableGeo, gableMat);
    leftGable.position.set(-width * 0.5, 0, 0);
    leftGable.rotation.y = -Math.PI / 2;
    roofGroup.add(leftGable);

    const rightGable = new THREE.Mesh(gableGeo, gableMat);
    rightGable.position.set(width * 0.5, 0, 0);
    rightGable.rotation.y = Math.PI / 2;
    roofGroup.add(rightGable);
  }

  return roofGroup;
}

/**
 * Creates a charming dormer window (buhardilla) protruding from the roof slope
 */
export function createDormer(
  width: number,
  height: number,
  depth: number,
  wallMat: THREE.Material,
  roofMat: THREE.Material,
  trimMat: THREE.Material,
  windowMat: THREE.SpriteMaterial
): THREE.Group {
  const dormer = new THREE.Group();

  // Dormer box body
  const bodyGeo = new THREE.BoxGeometry(width, height, depth);
  const body = new THREE.Mesh(bodyGeo, wallMat);
  body.position.set(0, height * 0.5, 0);
  dormer.add(body);

  // Dormer miniature pitched roof
  const dRoof = createPitchedRoof(width, depth, height * 0.65, roofMat, wallMat, trimMat, 'z', 0.4, 0.4);
  dRoof.position.set(0, height, 0);
  dormer.add(dRoof);

  // Window on dormer front
  const win = new THREE.Sprite(windowMat);
  win.scale.set(width * 0.75, height * 0.65, 1);
  win.position.set(0, height * 0.52, -depth * 0.5 - 0.05);
  dormer.add(win);

  return dormer;
}

/**
 * Creates an entrance porch with wooden pillars, stone doorstep, and tiled canopy
 */
export function createEntrancePorch(
  width: number,
  depth: number,
  height: number,
  pillarMat: THREE.Material,
  roofMat: THREE.Material,
  stepMat: THREE.Material,
  woodTrimMat: THREE.Material,
  hasLantern = true
): THREE.Group {
  const porch = new THREE.Group();

  // Stone threshold step
  const stepGeo = new THREE.BoxGeometry(width + 0.8, 0.4, depth + 0.4);
  const step = new THREE.Mesh(stepGeo, stepMat);
  step.position.set(0, 0.2, depth * 0.5);
  porch.add(step);

  // Timber corner posts (pillars)
  const pillarGeo = new THREE.BoxGeometry(0.45, height, 0.45);
  const pLeft = new THREE.Mesh(pillarGeo, pillarMat);
  pLeft.position.set(-width * 0.5 + 0.25, height * 0.5 + 0.4, depth - 0.25);
  porch.add(pLeft);

  const pRight = new THREE.Mesh(pillarGeo, pillarMat);
  pRight.position.set(width * 0.5 - 0.25, height * 0.5 + 0.4, depth - 0.25);
  porch.add(pRight);

  // Architraves / horizontal cross beam
  const beamGeo = new THREE.BoxGeometry(width + 0.3, 0.45, 0.45);
  const beam = new THREE.Mesh(beamGeo, woodTrimMat);
  beam.position.set(0, height + 0.4, depth - 0.25);
  porch.add(beam);

  // Pitched or lean-to roof canopy
  const pRoof = createPitchedRoof(width, depth, 1.4, roofMat, woodTrimMat, woodTrimMat, 'z', 0.5, 0.4);
  pRoof.position.set(0, height + 0.55, depth * 0.5);
  porch.add(pRoof);

  // Hanging lantern with warm golden glow
  if (hasLantern) {
    const lanternGeo = new THREE.BoxGeometry(0.5, 0.7, 0.5);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(0, height + 0.1, depth - 0.25);
    porch.add(lantern);

    const light = new THREE.PointLight(0xfbbf24, 1.4, 14);
    light.position.set(0, height, depth - 0.25);
    porch.add(light);
  }

  return porch;
}

/**
 * Creates a stone/brick chimney with stepped shaft and corbeled cap
 */
export function createChimney(
  width: number,
  depth: number,
  height: number,
  shaftMat: THREE.Material,
  capMat: THREE.Material,
  flueCount = 2
): THREE.Group {
  const chimney = new THREE.Group();

  // Main chimney shaft
  const shaftGeo = new THREE.BoxGeometry(width, height, depth);
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.position.set(0, height * 0.5, 0);
  shaft.castShadow = true;
  chimney.add(shaft);

  // Corbeled stone crown / cap
  const capGeo = new THREE.BoxGeometry(width + 0.5, 0.65, depth + 0.5);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.set(0, height + 0.32, 0);
  chimney.add(cap);

  // Terracotta chimney flue pipes
  const flueGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.75, 12);
  const flueMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 });

  for (let i = 0; i < flueCount; i++) {
    const flue = new THREE.Mesh(flueGeo, flueMat);
    const offset = flueCount === 1 ? 0 : (i - 0.5) * (width * 0.45);
    flue.position.set(offset, height + 0.9, 0);
    chimney.add(flue);
  }

  return chimney;
}

/**
 * Creates carved timber corbels supporting a jetty (overhanging upper floor)
 */
export function createJettyCorbels(
  width: number,
  overhang: number,
  woodMat: THREE.Material,
  count = 5
): THREE.Group {
  const corbelsGroup = new THREE.Group();
  const corbelGeo = new THREE.BoxGeometry(0.45, 0.75, overhang);

  for (let i = 0; i < count; i++) {
    const x = -width * 0.5 + (i / (count - 1)) * width;
    const corbel = new THREE.Mesh(corbelGeo, woodMat);
    corbel.position.set(x, -0.35, -overhang * 0.5);
    corbelsGroup.add(corbel);
  }

  return corbelsGroup;
}

// =========================================================================
// SPECIFIC VILLAGE ARCHITECTURE BUILDERS
// =========================================================================

/**
 * 1. ROBIN'S HOUSE (CASA DEL HÉROE - Suroeste: x: -22, z: 22)
 * Stately 2-story Tudor half-timbered residence with jetty cantilever,
 * steep terracotta pitched roof, front dormer, covered porch, and chimney.
 */
export function buildHeroHouse(
  x: number,
  z: number,
  p: BuildingMaterialPalette
): { group: THREE.Group; collision: CollisionBox } {
  const house = new THREE.Group();
  house.position.set(x, 0, z);

  const baseW = 16.0;
  const baseD = 12.0;
  const groundH = 5.2;

  // Ground Floor: Heavy mossy stone plinth & walls
  const groundGeo = new THREE.BoxGeometry(baseW, groundH, baseD);
  const groundMesh = new THREE.Mesh(groundGeo, p.mossyStoneMat(baseW, baseD));
  groundMesh.position.set(0, groundH * 0.5, 0);
  groundMesh.castShadow = true;
  groundMesh.receiveShadow = true;
  house.add(groundMesh);

  // Upper Floor (Jettying): Projects forward by 1.0m over the street
  const upperW = 16.8;
  const upperD = 13.0;
  const upperH = 4.8;
  const upperZOffset = -0.5; // overhangs toward the front door (north)

  const upperGeo = new THREE.BoxGeometry(upperW, upperH, upperD);
  const upperMesh = new THREE.Mesh(upperGeo, p.timberWallMaterials(upperW, upperH, upperD));
  upperMesh.position.set(0, groundH + upperH * 0.5, upperZOffset);
  upperMesh.castShadow = true;
  upperMesh.receiveShadow = true;
  house.add(upperMesh);

  // Wooden corbels supporting the cantilevered jetty along the front facade
  const corbels = createJettyCorbels(baseW - 1.0, 1.0, p.woodPlankMat(1, 1), 6);
  corbels.position.set(0, groundH, -baseD * 0.5);
  house.add(corbels);

  // Steep Terracotta Pitched Roof with eave overhangs
  const roofH = 5.6;
  const roof = createPitchedRoof(
    upperW,
    upperD,
    roofH,
    p.terracottaRoofMat(upperW, upperD),
    p.timberXMat(upperW, roofH),
    p.woodPlankMat(1, 1),
    'z',
    1.2,
    1.2
  );
  roof.position.set(0, groundH + upperH, upperZOffset);
  house.add(roof);

  // Dormer Window on front slope
  const dormer = createDormer(
    3.2,
    2.5,
    3.2,
    p.timberVMat(3.2, 2.5),
    p.terracottaRoofMat(3.2, 3.2),
    p.woodPlankMat(1, 1),
    p.window2PaneSpriteMat
  );
  dormer.position.set(3.5, groundH + upperH + 1.2, upperZOffset - upperD * 0.38);
  house.add(dormer);

  // Entrance Porch with warm lantern
  const porchW = 4.2;
  const porchD = 2.4;
  const porchH = 3.6;
  const porch = createEntrancePorch(
    porchW,
    porchD,
    porchH,
    p.woodPlankMat(1, 1),
    p.terracottaRoofMat(porchW, porchD),
    p.mossyStoneMat(porchW, porchD),
    p.woodPlankMat(1, 1),
    true
  );
  porch.position.set(-2.5, 0, -baseD * 0.5 - porchD);
  house.add(porch);

  // Front Door & Windows
  const door = new THREE.Sprite(p.doorSpriteMat);
  door.scale.set(3.4, 4.4, 1);
  door.position.set(-2.5, 2.4, -baseD * 0.5 - 0.05);
  house.add(door);

  const win1 = new THREE.Sprite(p.windowSpriteMat);
  win1.scale.set(2.6, 2.6, 1);
  win1.position.set(4.5, 3.2, -baseD * 0.5 - 0.05);
  house.add(win1);

  // Upper floor windows
  const win2 = new THREE.Sprite(p.windowSpriteMat);
  win2.scale.set(2.6, 2.6, 1);
  win2.position.set(-4.5, groundH + 2.5, upperZOffset - upperD * 0.5 - 0.05);
  house.add(win2);

  // Brick Chimney on East flank
  const chimney = createChimney(2.2, 2.2, groundH + upperH + roofH * 0.8, p.redBrickMat(2.2, 12), p.mossyStoneMat(2.8, 2.8), 2);
  chimney.position.set(upperW * 0.5 - 0.4, 0, upperZOffset + 1.5);
  house.add(chimney);

  // Small Side Balcony (Decorative)
  const sideBalcGeo = new THREE.BoxGeometry(2.4, 0.4, 1.8);
  const sideBalc = new THREE.Mesh(sideBalcGeo, p.woodPlankMat(2.4, 1.8));
  sideBalc.position.set(-upperW * 0.5 - 1.2, groundH + 2.0, upperZOffset);
  house.add(sideBalc);

  return {
    group: house,
    collision: { x, z, rx: 10.5, rz: 8.5 },
  };

}

/**
 * 2. SELENE'S HOUSE (CASA DE SELENE - Sureste: x: 22, z: 22)
 * Asymmetric L-shaped residence with cross-gable roof, mystic blue slate tiles,
 * upper-floor wooden balcony, and bay window.
 */
export function buildRivalHouse(
  x: number,
  z: number,
  p: BuildingMaterialPalette
): { group: THREE.Group; collision: CollisionBox } {
  const house = new THREE.Group();
  house.position.set(x, 0, z);

  // Main 2-story Wing (Runs along Z)
  const mainW = 13.0;
  const mainD = 15.0;
  const mainH = 9.2;

  const mainBase = new THREE.Mesh(new THREE.BoxGeometry(mainW, 2.2, mainD), p.mossyStoneMat(mainW, mainD));
  mainBase.position.set(0, 1.1, 0);
  house.add(mainBase);

  const mainWalls = new THREE.Mesh(new THREE.BoxGeometry(mainW, mainH - 2.2, mainD), p.timberWallMaterials(mainW, mainH - 2.2, mainD));
  mainWalls.position.set(0, 2.2 + (mainH - 2.2) * 0.5, 0);
  house.add(mainWalls);

  // Main Pitched Roof in Mystic Blue Slate
  const mainRoofH = 5.2;
  const mainRoof = createPitchedRoof(
    mainW,
    mainD,
    mainRoofH,
    p.blueRoofMat(mainW, mainD),
    p.timberXMat(mainW, mainRoofH),
    p.woodPlankMat(1, 1),
    'z',
    1.1,
    1.1
  );
  mainRoof.position.set(0, mainH, 0);
  house.add(mainRoof);

  // Side Wing (Perpendicular L-branch extending toward the west plaza: x = -7.5)
  const wingW = 9.0;
  const wingD = 9.0;
  const wingH = 7.0;
  const wingX = -mainW * 0.5 - wingW * 0.5 + 1.0;
  const wingZ = 2.0;

  const wingBase = new THREE.Mesh(new THREE.BoxGeometry(wingW, 2.2, wingD), p.mossyStoneMat(wingW, wingD));
  wingBase.position.set(wingX, 1.1, wingZ);
  house.add(wingBase);

  const wingWalls = new THREE.Mesh(new THREE.BoxGeometry(wingW, wingH - 2.2, wingD), p.timberWallMaterials(wingW, wingH - 2.2, wingD));
  wingWalls.position.set(wingX, 2.2 + (wingH - 2.2) * 0.5, wingZ);
  house.add(wingWalls);

  // Cross-Gable Roof for the side wing (Runs along X)
  const wingRoofH = 4.0;
  const wingRoof = createPitchedRoof(
    wingW,
    wingD,
    wingRoofH,
    p.blueRoofMat(wingW, wingD),
    p.timberVMat(wingD, wingRoofH),
    p.woodPlankMat(1, 1),
    'x',
    1.1,
    1.1
  );
  wingRoof.position.set(wingX, wingH, wingZ);
  house.add(wingRoof);

  // Balcony on Main Floor 2 overlooking north (the plaza)
  const balcW = 5.0;
  const balcD = 2.2;
  const balcFloor = new THREE.Mesh(new THREE.BoxGeometry(balcW, 0.4, balcD), p.woodPlankMat(balcW, balcD));
  balcFloor.position.set(0, 5.8, -mainD * 0.5 - balcD * 0.5);
  house.add(balcFloor);

  // Balcony support corbels
  const bCorbel1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, balcD), p.woodPlankMat(1, 1));
  bCorbel1.position.set(-balcW * 0.4, 5.1, -mainD * 0.5 - balcD * 0.5);
  house.add(bCorbel1);
  const bCorbel2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, balcD), p.woodPlankMat(1, 1));
  bCorbel2.position.set(balcW * 0.4, 5.1, -mainD * 0.5 - balcD * 0.5);
  house.add(bCorbel2);

  // Balcony wooden balustrade
  const railGeo = new THREE.BoxGeometry(balcW, 1.1, 0.2);
  const railing = new THREE.Mesh(railGeo, p.woodPlankMat(balcW, 1));
  railing.position.set(0, 6.5, -mainD * 0.5 - balcD);
  house.add(railing);

  // Protruding Bay Window on ground floor
  const bayW = 3.6;
  const bayH = 2.8;
  const bayD = 1.4;
  const bayMesh = new THREE.Mesh(new THREE.BoxGeometry(bayW, bayH, bayD), p.plainStuccoMat(bayW, bayH));
  bayMesh.position.set(wingX, 3.2, wingZ - wingD * 0.5 - bayD * 0.5);
  house.add(bayMesh);

  const bayRoof = createPitchedRoof(bayW, bayD, 1.0, p.blueRoofMat(bayW, bayD), p.woodPlankMat(1, 1), p.woodPlankMat(1, 1), 'x', 0.3, 0.3);
  bayRoof.position.set(wingX, 3.2 + bayH * 0.5, wingZ - wingD * 0.5 - bayD * 0.5);
  house.add(bayRoof);

  // Door and Window Sprites
  const door = new THREE.Sprite(p.doorSpriteMat);
  door.scale.set(3.4, 4.4, 1);
  door.position.set(0, 2.5, -mainD * 0.5 - 0.05);
  house.add(door);

  const balcDoor = new THREE.Sprite(p.windowSpriteMat);
  balcDoor.scale.set(2.8, 3.6, 1);
  balcDoor.position.set(0, 7.6, -mainD * 0.5 - 0.05);
  house.add(balcDoor);

  const winWing = new THREE.Sprite(p.windowSpriteMat);
  winWing.scale.set(2.4, 2.4, 1);
  winWing.position.set(wingX, 3.4, wingZ - wingD * 0.5 - bayD - 0.05);
  house.add(winWing);

  // Mystic purple lantern at door
  const lanternGeo = new THREE.BoxGeometry(0.5, 0.7, 0.5);
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0xa855f7,
    emissiveIntensity: 1.6,
  });
  const lantern = new THREE.Mesh(lanternGeo, lanternMat);
  lantern.position.set(2.4, 3.6, -mainD * 0.5 - 0.4);
  house.add(lantern);

  const pLight = new THREE.PointLight(0xa855f7, 1.2, 12);
  pLight.position.set(2.4, 3.6, -mainD * 0.5 - 0.4);
  house.add(pLight);

  return {
    group: house,
    collision: { x: x - 2.5, z, rx: 12.0, rz: 8.5 },
  };
}

/**
 * 3. GEPPETTO'S PUPPET WORKSHOP (TALLER DE MARIONETAS - Oeste: x: -26, z: -5)
 * Grand artisan guild hall with high-vaulted dark slate roof,
 * attic cargo crane hoist, open-air timber craft shed, and forge chimney.
 */
export function buildWorkshop(
  x: number,
  z: number,
  p: BuildingMaterialPalette,
  crateTex: THREE.Texture,
  barrelTex: THREE.Texture
): { group: THREE.Group; collision: CollisionBox[] } {
  const workshop = new THREE.Group();
  workshop.position.set(x, 0, z);

  const wW = 18.0;
  const wD = 14.0;
  const wH = 10.5;

  // Solid Stone Plinth
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(wW + 0.4, 2.5, wD + 0.4), p.mossyStoneMat(wW + 0.4, wD + 0.4));
  baseMesh.position.set(0, 1.25, 0);
  workshop.add(baseMesh);

  // Heavy Wood Planked Main Walls
  const wallsMesh = new THREE.Mesh(new THREE.BoxGeometry(wW, wH - 2.5, wD), p.woodWallMaterials(wW, wH - 2.5, wD));
  wallsMesh.position.set(0, 2.5 + (wH - 2.5) * 0.5, 0);
  wallsMesh.castShadow = true;
  wallsMesh.receiveShadow = true;
  workshop.add(wallsMesh);

  // High Vaulted Dark Slate Gabled Roof
  const roofH = 5.8;
  const roof = createPitchedRoof(
    wW,
    wD,
    roofH,
    p.darkRoofMat(wW, wD),
    p.woodWallMaterials(wW, roofH, wD)[0],
    p.woodPlankMat(1, 1),
    'z',
    1.3,
    1.3
  );
  roof.position.set(0, wH, 0);
  workshop.add(roof);

  // Attic Hoist / Loading Bay on front facade
  const hoistBeamGeo = new THREE.BoxGeometry(0.45, 0.45, 2.5);
  const hoistBeam = new THREE.Mesh(hoistBeamGeo, p.woodPlankMat(1, 1));
  hoistBeam.position.set(0, wH + roofH * 0.65, -wD * 0.5 - 1.2);
  workshop.add(hoistBeam);

  // Open-air timber craft shed (attached to south flank: z = +7.0)
  const shedW = 12.0;
  const shedD = 5.5;
  const shedH = 4.2;
  const shedZ = wD * 0.5 + shedD * 0.5;

  // Slanted shed roof (techo a un agua)
  const shedRoofGeo = new THREE.BoxGeometry(shedW + 0.8, 0.4, shedD + 0.8);
  shedRoofGeo.rotateX(0.18);
  const shedRoof = new THREE.Mesh(shedRoofGeo, p.darkRoofMat(shedW, shedD));
  shedRoof.position.set(0, shedH + 0.6, shedZ);
  workshop.add(shedRoof);

  // Timber support posts for the shed
  const sPostGeo = new THREE.BoxGeometry(0.45, shedH, 0.45);
  const post1 = new THREE.Mesh(sPostGeo, p.woodPlankMat(1, 1));
  post1.position.set(-shedW * 0.45, shedH * 0.5, shedZ + shedD * 0.45);
  workshop.add(post1);
  const post2 = new THREE.Mesh(sPostGeo, p.woodPlankMat(1, 1));
  post2.position.set(0, shedH * 0.5, shedZ + shedD * 0.45);
  workshop.add(post2);
  const post3 = new THREE.Mesh(sPostGeo, p.woodPlankMat(1, 1));
  post3.position.set(shedW * 0.45, shedH * 0.5, shedZ + shedD * 0.45);
  workshop.add(post3);

  // Outdoor Carpenter's Workbench placed inside the south craft shed
  const bench = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 1.6), p.woodPlankMat(3.6, 1.6));
  bench.position.set(-2.5, 1.6, shedZ);
  workshop.add(bench);

  // Crates and Barrels tucked under the south craft shed
  const crateMat = new THREE.SpriteMaterial({ map: crateTex, transparent: true });
  const barrelMat = new THREE.SpriteMaterial({ map: barrelTex, transparent: true });

  const c1 = new THREE.Sprite(crateMat);
  c1.scale.set(2.4, 2.4, 1);
  c1.position.set(2.2, 2.0, shedZ);
  workshop.add(c1);

  const b1 = new THREE.Sprite(barrelMat);
  b1.scale.set(2.4, 2.4, 1);
  b1.position.set(3.8, 2.0, shedZ);
  workshop.add(b1);

  // Industrial Stepped Forge Chimney (Red Brick & Stone) on West flank away from street
  const chimney = createChimney(3.0, 3.0, wH + roofH + 1.2, p.redBrickMat(3, 16), p.mossyStoneMat(3.6, 3.6), 2);
  chimney.position.set(-wW * 0.5 + 1.2, 0, -wD * 0.5 + 2.5);
  workshop.add(chimney);

  // Grand Double Door with heavy timber lintel
  const dDoor = new THREE.Sprite(p.doubleDoorSpriteMat);
  dDoor.scale.set(6.2, 6.2, 1);
  dDoor.position.set(0, 3.8, -wD * 0.5 - 0.05);
  workshop.add(dDoor);

  // Twin wrought-iron lanterns at entrance
  const lMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 1.5 });
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), lMat);
  l1.position.set(-3.8, 4.5, -wD * 0.5 - 0.4);
  workshop.add(l1);
  const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), lMat);
  l2.position.set(3.8, 4.5, -wD * 0.5 - 0.4);
  workshop.add(l2);

  const light = new THREE.PointLight(0xf59e0b, 1.4, 15);
  light.position.set(0, 5.0, -wD * 0.5 - 1.2);
  workshop.add(light);

  return {
    group: workshop,
    collision: [
      { x, z, rx: 9.5, rz: 7.5 },
      { x: x - 1.0, z: z + shedZ, rx: 6.5, rz: 3.0 },
    ],
  };
}

/**
 * 4. LABORATORY OF SOUL RESEARCH (NORESTE: x: 25, z: -22)
 * Grand ashlar masonry complex with corner buttresses, steep gothic slate roof,
 * grand entrance arch, and cylindrical Observatory Tower with Bronze Dome and floating Soul Core.
 */
export function buildLaboratory(
  x: number,
  z: number,
  p: BuildingMaterialPalette
): { group: THREE.Group; collision: CollisionBox[] } {
  const lab = new THREE.Group();
  lab.position.set(x, 0, z);

  const lW = 24.0;
  const lD = 17.0;
  const lH = 12.0;

  // Solid Plinth Base
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(lW + 0.6, 2.8, lD + 0.6), p.mossyStoneMat(lW + 0.6, lD + 0.6));
  baseMesh.position.set(0, 1.4, 0);
  lab.add(baseMesh);

  // Stately Ashlar Stone Walls
  const wallsMesh = new THREE.Mesh(new THREE.BoxGeometry(lW, lH - 2.8, lD), p.stoneBrickMat(lW, lH - 2.8));
  wallsMesh.position.set(0, 2.8 + (lH - 2.8) * 0.5, 0);
  wallsMesh.castShadow = true;
  wallsMesh.receiveShadow = true;
  lab.add(wallsMesh);

  // Stepped Corner Buttresses (contrafuertes de piedra en las 4 esquinas)
  const buttressGeo = new THREE.BoxGeometry(1.4, lH, 1.4);
  const b1 = new THREE.Mesh(buttressGeo, p.mossyStoneMat(1.4, lH));
  b1.position.set(-lW * 0.5, lH * 0.5, -lD * 0.5);
  lab.add(b1);
  const b2 = new THREE.Mesh(buttressGeo, p.mossyStoneMat(1.4, lH));
  b2.position.set(lW * 0.5, lH * 0.5, -lD * 0.5);
  lab.add(b2);
  const b3 = new THREE.Mesh(buttressGeo, p.mossyStoneMat(1.4, lH));
  b3.position.set(-lW * 0.5, lH * 0.5, lD * 0.5);
  lab.add(b3);

  // Steep Gothic Dark Slate Roof
  const roofH = 6.8;
  const roof = createPitchedRoof(
    lW,
    lD,
    roofH,
    p.darkRoofMat(lW, lD),
    p.stoneBrickMat(lW, roofH),
    p.mossyStoneMat(1, 1),
    'x',
    1.4,
    1.4
  );
  roof.position.set(0, lH, 0);
  lab.add(roof);

  // Attached Astronomical Observatory Tower (Northeast corner)
  const tX = lW * 0.5 - 1.5;
  const tZ = lD * 0.5 - 1.5;
  const tRadius = 4.2;
  const tHeight = 18.0;

  // Tower body: Stately cylinder
  const towerGeo = new THREE.CylinderGeometry(tRadius, tRadius + 0.5, tHeight, 16);
  const tower = new THREE.Mesh(towerGeo, p.stoneBrickMat(tRadius * 6, tHeight));
  tower.position.set(tX, tHeight * 0.5, tZ);
  tower.castShadow = true;
  tower.receiveShadow = true;
  lab.add(tower);

  // Observation Deck / Crenellated Parapet
  const deckGeo = new THREE.CylinderGeometry(tRadius + 0.8, tRadius + 0.4, 1.2, 16);
  const deck = new THREE.Mesh(deckGeo, p.mossyStoneMat(tRadius * 6, 2));
  deck.position.set(tX, tHeight + 0.6, tZ);
  lab.add(deck);

  // Classical Bronze Dome
  const domeGeo = new THREE.SphereGeometry(tRadius + 0.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const dome = new THREE.Mesh(domeGeo, p.bronzeDomeMat);
  dome.position.set(tX, tHeight + 1.2, tZ);
  dome.castShadow = true;
  lab.add(dome);

  // Spire with Floating Rotating Soul Core
  const spireGeo = new THREE.CylinderGeometry(0.12, 0.4, 3.2, 8);
  const spire = new THREE.Mesh(spireGeo, p.bronzeDomeMat);
  spire.position.set(tX, tHeight + 1.2 + tRadius + 1.4, tZ);
  lab.add(spire);

  const soulOrbGeo = new THREE.OctahedronGeometry(0.75, 0);
  const soulOrbMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });
  const soulOrb = new THREE.Mesh(soulOrbGeo, soulOrbMat);
  soulOrb.position.set(tX, tHeight + 1.2 + tRadius + 3.4, tZ);
  lab.add(soulOrb);

  const orbLight = new THREE.PointLight(0x38bdf8, 1.8, 18);
  orbLight.position.set(tX, tHeight + 1.2 + tRadius + 3.4, tZ);
  lab.add(orbLight);

  // Grand Entrance Arch & Stone Steps
  const stepsGeo = new THREE.BoxGeometry(6.4, 0.6, 2.4);
  const steps = new THREE.Mesh(stepsGeo, p.mossyStoneMat(6.4, 2.4));
  steps.position.set(0, 0.3, lD * 0.5 + 1.2);
  lab.add(steps);

  const labDoor = new THREE.Sprite(p.doubleDoorSpriteMat);
  labDoor.scale.set(5.2, 6.2, 1);
  labDoor.position.set(0, 3.8, lD * 0.5 + 0.05);
  lab.add(labDoor);

  const winL = new THREE.Sprite(p.windowSpriteMat);
  winL.scale.set(3.0, 3.0, 1);
  winL.position.set(-6.5, 5.5, lD * 0.5 + 0.05);
  lab.add(winL);

  const winR = new THREE.Sprite(p.windowSpriteMat);
  winR.scale.set(3.0, 3.0, 1);
  winR.position.set(6.5, 5.5, lD * 0.5 + 0.05);
  lab.add(winR);

  return {
    group: lab,
    collision: [
      { x, z, rx: 13.5, rz: 10.0 },
      { x: x + tX, z: z + tZ, rx: 5.0, rz: 5.0 },
    ],
  };
}

/**
 * 5. ELDER'S THATCHED COTTAGE (CABAÑA DEL SABIO - Sur: x: -24, z: 40)
 * Cozy rustic woodland cottage with undulating thatched roof,
 * river-cobble fireplace, and rustic wooden porch.
 */
export function buildElderCottage(
  x: number,
  z: number,
  p: BuildingMaterialPalette
): { group: THREE.Group; collision: CollisionBox } {
  const cottage = new THREE.Group();
  cottage.position.set(x, 0, z);

  const cW = 14.5;
  const cD = 11.5;
  const cH = 6.8;

  // River Cobble Stone Base
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(cW, 2.0, cD), p.cobbleRoundMat(cW, cD));
  baseMesh.position.set(0, 1.0, 0);
  cottage.add(baseMesh);

  // Weathered Timber Walls
  const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(cW - 0.4, cH - 2.0, cD - 0.4), p.timberWallMaterials(cW, cH - 2.0, cD));
  wallMesh.position.set(0, 2.0 + (cH - 2.0) * 0.5, 0);
  cottage.add(wallMesh);

  // Organic Drooping Thatched Roof (Tejado de paja ondulado)
  const roofH = 4.8;
  const roof = createPitchedRoof(
    cW,
    cD,
    roofH,
    p.thatchRoofMat(cW, cD),
    p.woodPlankMat(cW, roofH),
    p.thatchRoofMat(1, 1),
    'z',
    1.4,
    1.4
  );
  roof.position.set(0, cH, 0);
  cottage.add(roof);

  // Rustic River-Cobble Chimney
  const chimney = createChimney(2.0, 2.0, cH + roofH * 0.8, p.cobbleRoundMat(2, 10), p.mossyStoneMat(2.4, 2.4), 1);
  chimney.position.set(-cW * 0.5 + 0.4, 0, 1.0);
  cottage.add(chimney);

  // Rustic Log Porch
  const porch = createEntrancePorch(3.8, 2.2, 3.2, p.woodPlankMat(1, 1), p.thatchRoofMat(3.8, 2.2), p.cobbleRoundMat(3.8, 2.2), p.woodPlankMat(1, 1), true);
  porch.position.set(1.5, 0, -cD * 0.5 - 2.2);
  cottage.add(porch);

  // Door and Window
  const door = new THREE.Sprite(p.doorSpriteMat);
  door.scale.set(3.2, 4.2, 1);
  door.position.set(1.5, 2.5, -cD * 0.5 - 0.05);
  cottage.add(door);

  const win = new THREE.Sprite(p.windowSpriteMat);
  win.scale.set(2.4, 2.4, 1);
  win.position.set(-3.5, 3.6, -cD * 0.5 - 0.05);
  cottage.add(win);

  return {
    group: cottage,
    collision: { x, z, rx: 8.5, rz: 7.0 },
  };
}
