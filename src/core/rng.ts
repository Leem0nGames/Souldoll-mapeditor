/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Mulberry32 seeded PRNG
export function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

let globalSeed = Math.floor(Math.random() * 1000000);

export function getGlobalSeed() {
  return globalSeed;
}

export function setGlobalSeed(seed: number) {
  globalSeed = seed;
}

export function createGlobalRNG() {
  return mulberry32(globalSeed);
}

