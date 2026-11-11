/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameSaveData } from '../types';
import { logger } from '../core/logger';

const CURRENT_VERSION = 1;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getFallbackStorage(): StorageLike {
  const globalObject = globalThis as typeof globalThis & {
    __souldollsStorage?: Map<string, string>;
  };

  if (!globalObject.__souldollsStorage) {
    globalObject.__souldollsStorage = new Map<string, string>();
  }

  return {
    getItem: (key: string) => globalObject.__souldollsStorage!.get(key) ?? null,
    setItem: (key: string, value: string) => {
      globalObject.__souldollsStorage!.set(key, value);
    },
    removeItem: (key: string) => {
      globalObject.__souldollsStorage!.delete(key);
    },
  };
}

export class SaveManager {
  private static getSlotKey(slot: number) { return `souldolls_save_slot_${slot}`; }
  private static getTmpKey(slot: number) { return `souldolls_save_slot_${slot}_tmp`; }

  private static getStorage(): StorageLike {
    const candidate = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    if (candidate && typeof candidate.getItem === 'function') {
      return candidate;
    }
    return getFallbackStorage();
  }

  public static saveToSlot(slot: number, data: Omit<GameSaveData, 'version' | 'timestamp'>) {
    const saveData: GameSaveData = {
      ...data,
      version: CURRENT_VERSION,
      timestamp: Date.now(),
    };

    try {
      const json = JSON.stringify(saveData);
      const tmpKey = this.getTmpKey(slot);
      const realKey = this.getSlotKey(slot);
      const storage = this.getStorage();

      storage.setItem(tmpKey, json);
      const verify = storage.getItem(tmpKey);
      if (verify === json) {
        storage.setItem(realKey, json);
        storage.removeItem(tmpKey);
        logger.info(`Saved successfully to slot ${slot}`);
      } else {
        throw new Error('Verification failed');
      }
    } catch (e) {
      logger.error(`Failed to save to slot ${slot}`, e);
    }
  }

  public static loadFromSlot(slot: number): GameSaveData | null {
    try {
      const saved = this.getStorage().getItem(this.getSlotKey(slot));
      if (!saved) return null;
      const data = JSON.parse(saved);
      if (typeof data.version !== 'number' || !Array.isArray(data.team)) {
        throw new Error('Invalid save data schema');
      }
      return this.migrate(data);
    } catch (e) {
      logger.error(`Failed to load slot ${slot}`, e);
      return null;
    }
  }

  public static exportSave(slot: number): string | null {
    return this.getStorage().getItem(this.getSlotKey(slot));
  }

  public static importSave(slot: number, json: string) {
    try {
      const data = JSON.parse(json);
      // Basic schema validation
      if (typeof data.version !== 'number' || (!Array.isArray(data.team) && !data.team)) {
        throw new Error('Formato de guardado inválido: Falta equipo o versión.');
      }
      this.saveToSlot(slot, data);
    } catch (e) {
      logger.error('Failed to import save', e);
      throw e; 
    }
  }

  private static migrate(data: any): GameSaveData {
    let currentData = data;
    
    // Future-proofing: sequential migrations
    if (currentData.version < 1) {
      currentData.version = 1;
    }
    
    // Auto-migrate legacy or inverted spritesheets to new WebP spritesheets
    const fixSoulSprites = (s: any) => {
      if (!s) return s;
      const nameUpper = (s.name || '').toUpperCase();
      if (nameUpper.includes('EMBER')) {
        s.spritesheet = '/assets/souldolls/01.webp';
        s.frameFront = { x: 68, y: 16, w: 433, h: 864 };
        s.frameBack = { x: 714, y: 10, w: 415, h: 857 };
        s.sheetSize = { w: 1200, h: 896 };
      } else if (nameUpper.includes('TOMOE')) {
        s.spritesheet = '/assets/souldolls/03.webp';
        s.frameFront = { x: 52, y: 18, w: 446, h: 863 };
        s.frameBack = { x: 682, y: 27, w: 467, h: 841 };
        s.sheetSize = { w: 1200, h: 896 };
      } else if (nameUpper.includes('RUNIKA')) {
        s.spritesheet = '/assets/souldolls/04.webp';
        s.frameFront = { x: 103, y: 43, w: 389, h: 833 };
        s.frameBack = { x: 722, y: 43, w: 347, h: 826 };
        s.sheetSize = { w: 1200, h: 896 };
      } else if (nameUpper.includes('WISP') || nameUpper.includes('AQUELLE')) {
        s.spritesheet = '/assets/souldolls/07.webp';
        s.frameFront = { x: 24, y: 27, w: 561, h: 844 };
        s.frameBack = { x: 610, y: 27, w: 562, h: 832 };
        s.sheetSize = { w: 1200, h: 896 };
      } else if (nameUpper.includes('SPROUT') || nameUpper.includes('FLORAYA')) {
        s.spritesheet = '/assets/souldolls/09.webp';
        s.frameFront = { x: 56, y: 10, w: 429, h: 868 };
        s.frameBack = { x: 723, y: 18, w: 432, h: 848 };
        s.sheetSize = { w: 1200, h: 896 };
      } else if (nameUpper.includes('SPARK') || nameUpper.includes('VOLTINA')) {
        s.spritesheet = '/assets/souldolls/11.webp';
        s.frameFront = { x: 143, y: 45, w: 353, h: 826 };
        s.frameBack = { x: 715, y: 46, w: 320, h: 813 };
        s.sheetSize = { w: 1200, h: 896 };
      } else if (nameUpper.includes('SHADE') || nameUpper.includes('NOCTIS')) {
        s.spritesheet = '/assets/souldolls/15.webp';
        s.frameFront = { x: 156, y: 58, w: 341, h: 821 };
        s.frameBack = { x: 717, y: 55, w: 305, h: 813 };
        s.sheetSize = { w: 1200, h: 896 };
      } else if (nameUpper.includes('ECHO')) {
        s.spritesheet = '/assets/souldolls/17.webp';
        s.frameFront = { x: 149, y: 43, w: 348, h: 830 };
        s.frameBack = { x: 714, y: 43, w: 327, h: 820 };
        s.sheetSize = { w: 1200, h: 896 };
      } else if (nameUpper.includes('KAORI')) {
        s.spritesheet = '/assets/souldolls/19.webp';
        s.frameFront = { x: 130, y: 17, w: 365, h: 854 };
        s.frameBack = { x: 716, y: 29, w: 347, h: 829 };
        s.sheetSize = { w: 1200, h: 896 };
      } else if (nameUpper.includes('HUECO')) {
        s.spritesheet = '/assets/souldolls/52.webp';
        s.frameFront = { x: 61, y: 11, w: 520, h: 868 };
        s.frameBack = { x: 628, y: 8, w: 507, h: 857 };
        s.sheetSize = { w: 1200, h: 896 };
      } else if (s.spritesheet && (s.spritesheet.includes('SD_01') || s.spritesheet.includes('fixed_SD') || s.spritesheet.includes('spritesheet03'))) {
        s.spritesheet = '/assets/souldolls/01.webp';
        s.frameFront = { x: 68, y: 16, w: 433, h: 864 };
        s.frameBack = { x: 714, y: 10, w: 415, h: 857 };
        s.sheetSize = { w: 1200, h: 896 };
      }
      return s;
    };

    if (Array.isArray(currentData.team)) {
      currentData.team = currentData.team.map(fixSoulSprites);
    }
    if (Array.isArray(currentData.box)) {
      currentData.box = currentData.box.map(fixSoulSprites);
    }

    return currentData as GameSaveData;
  }

  public static deleteSlot(slot: number) {
    this.getStorage().removeItem(this.getSlotKey(slot));
  }
}

