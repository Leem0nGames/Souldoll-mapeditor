/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

// Stubbed FlameBurstSystem as three-plume was causing hook/version issues
export class FlameBurstSystem {
  public system: any;
  public projectileEmitter: any;
  public impactEmitter: any;

  constructor(scene: THREE.Scene) {
    this.system = { object3D: new THREE.Group(), tick: () => {}, dispose: () => {} };
    scene.add(this.system.object3D);
  }

  public triggerAt(position: THREE.Vector3) {
    // No-op stub
  }

  public update(renderer: any, dt: number, camera: THREE.Camera) {
    // No-op stub
  }

  public dispose() {
    // No-op stub
  }
}
