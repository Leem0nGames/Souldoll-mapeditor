/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BiomeDefinition, BiomeMask, BiomeSpline } from '../biomes';
import type { ScatterDefinition } from '../scatter/ScatterDefinition';
import type { TerrainStamp } from '../terrain/TerrainStamp';
import type { WorldSpline } from '../splines/WorldSpline';
import type { ValidationResult, WorldDatabaseFile, WorldDefinition } from './WorldDefinition';
import { createDefaultWorldDatabaseFile, createDefaultWorldDefinition } from './WorldDefinition';

export class WorldDatabase {
  public static readonly SCHEMA_VERSION = 1;

  public load(raw: unknown): WorldDatabaseFile {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('World database payload must be an object.');
    }

    const candidate = parsed as Partial<WorldDatabaseFile>;
    if (candidate.kind !== 'souldolls-world-database') {
      return this.migrate(parsed);
    }

    const migrated = this.migrate(candidate as unknown);
    const result = this.validate(migrated);
    if (!result.valid) {
      throw new Error(result.errors.join('; '));
    }

    return migrated;
  }

  public validate(db: WorldDatabaseFile): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (db.kind !== 'souldolls-world-database') {
      errors.push('Missing world database kind identifier.');
    }
    if (!Number.isFinite(db.schemaVersion) || db.schemaVersion < 1) {
      errors.push('schemaVersion must be a positive integer.');
    }
    if (!Array.isArray(db.worlds)) {
      errors.push('worlds must be an array.');
    }
    if (!Array.isArray(db.stampPresets)) {
      errors.push('stampPresets must be an array.');
    }

    if (Array.isArray(db.worlds)) {
      for (let i = 0; i < db.worlds.length; i++) {
        const world = db.worlds[i];
        if (!world || typeof world !== 'object') {
          errors.push(`World at index ${i} is not an object.`);
          continue;
        }
        if (!world.id || typeof world.id !== 'string') {
          errors.push(`World at index ${i} has an invalid id.`);
        }
        if (!world.name || typeof world.name !== 'string') {
          errors.push(`World ${world.id ?? i} has an invalid name.`);
        }
        if (!world.seed || typeof world.seed.root !== 'string') {
          errors.push(`World ${world.id ?? i} has an invalid seed root.`);
        }
        if (!Number.isFinite(world.chunkSize) || world.chunkSize <= 0) {
          errors.push(`World ${world.id ?? i} has an invalid chunkSize.`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public migrate(raw: unknown): WorldDatabaseFile {
    if (!raw || typeof raw !== 'object') {
      return createDefaultWorldDatabaseFile();
    }

    const candidate = raw as Partial<WorldDatabaseFile>;
    if (candidate.kind === 'souldolls-world-database') {
      return {
        kind: 'souldolls-world-database',
        schemaVersion: Math.max(1, Number(candidate.schemaVersion ?? WorldDatabase.SCHEMA_VERSION)),
        worlds: Array.isArray(candidate.worlds) ? (candidate.worlds as WorldDefinition[]) : [],
        stampPresets: Array.isArray(candidate.stampPresets)
          ? candidate.stampPresets.map((preset) => ({
              id: String(preset?.id ?? 'preset'),
              category: String(preset?.category ?? 'plain'),
              resolution: Number(preset?.resolution ?? 0),
              values: Array.isArray(preset?.values) ? preset.values.map((value) => Number(value)) : [],
            }))
          : [],
      };
    }

    return createDefaultWorldDatabaseFile(
      Array.isArray((raw as { worlds?: WorldDefinition[] }).worlds)
        ? ((raw as { worlds?: WorldDefinition[] }).worlds ?? []).map((world) => ({
            ...createDefaultWorldDefinition(),
            ...world,
            terrain: {
              ...createDefaultWorldDefinition().terrain,
              ...(world.terrain ?? {}),
            },
          }))
        : []
    );
  }

  public exportWorld(id: string): string {
    const db = createDefaultWorldDatabaseFile();
    const world = db.worlds.find((entry) => entry.id === id);
    if (!world) {
      throw new Error(`World not found: ${id}`);
    }
    return JSON.stringify(world, null, 2);
  }

  public importWorld(json: string): WorldDefinition {
    const parsed = JSON.parse(json) as Partial<WorldDefinition>;
    const world = {
      ...createDefaultWorldDefinition(),
      ...parsed,
      terrain: {
        ...createDefaultWorldDefinition().terrain,
        ...(parsed.terrain ?? {}),
      },
      biomes: {
        ...createDefaultWorldDefinition().biomes,
        ...(parsed.biomes ?? {}),
      },
      render: {
        ...createDefaultWorldDefinition().render,
        ...(parsed.render ?? {}),
      },
    } as WorldDefinition;

    if (!world.id || !world.name) {
      throw new Error('Imported world requires an id and a name.');
    }

    return world;
  }
}

export const worldDatabase = new WorldDatabase();
