/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BiomeDefinition, BiomeId } from './BiomeDefinition';

export class BiomeDatabase {
  private definitions: BiomeDefinition[] = [];
  private indices: Map<BiomeId, number> = new Map();

  constructor(definitions: readonly BiomeDefinition[] = []) {
    this.setDefinitions(definitions);
  }

  public setDefinitions(definitions: readonly BiomeDefinition[]): void {
    this.definitions = [];
    this.indices.clear();
    for (let i = 0; i < definitions.length; i++) {
      this.register(definitions[i]);
    }
  }

  public register(definition: BiomeDefinition): void {
    if (this.indices.has(definition.id)) {
      throw new Error(`Duplicate biome definition: ${definition.id}`);
    }
    this.indices.set(definition.id, this.definitions.length);
    this.definitions.push(definition);
  }

  public get(id: BiomeId): BiomeDefinition | undefined {
    const index = this.indices.get(id);
    return index === undefined ? undefined : this.definitions[index];
  }

  public require(id: BiomeId): BiomeDefinition {
    const definition = this.get(id);
    if (!definition) throw new Error(`Unknown biome definition: ${id}`);
    return definition;
  }

  public has(id: BiomeId): boolean {
    return this.indices.has(id);
  }

  public indexOf(id: BiomeId): number {
    return this.indices.get(id) ?? -1;
  }

  public definitionAt(index: number): BiomeDefinition | undefined {
    return this.definitions[index];
  }

  public all(): readonly BiomeDefinition[] {
    return this.definitions;
  }

  public get size(): number {
    return this.definitions.length;
  }
}
