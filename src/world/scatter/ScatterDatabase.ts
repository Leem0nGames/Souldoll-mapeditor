/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ScatterAssetType, ScatterDefinition } from './ScatterDefinition';

export class ScatterDatabase {
  private definitions = new Map<string, ScatterDefinition>();
  private ordered: ScatterDefinition[] = [];

  constructor(definitions: readonly ScatterDefinition[] = []) {
    this.setDefinitions(definitions);
  }

  public setDefinitions(definitions: readonly ScatterDefinition[]): void {
    this.definitions.clear();
    this.ordered.length = 0;
    for (let i = 0; i < definitions.length; i++) {
      this.register(definitions[i]);
    }
  }

  public register(definition: ScatterDefinition): void {
    if (!definition.id) {
      throw new Error('Scatter definition must have an id');
    }
    if (this.definitions.has(definition.id)) {
      throw new Error(`Duplicate scatter definition id: ${definition.id}`);
    }
    this.definitions.set(definition.id, definition);
    this.ordered.push(definition);
  }

  public get(id: string): ScatterDefinition | undefined {
    return this.definitions.get(id);
  }

  public require(id: string): ScatterDefinition {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown scatter definition id: ${id}`);
    return definition;
  }

  public has(id: string): boolean {
    return this.definitions.has(id);
  }

  public all(): readonly ScatterDefinition[] {
    return this.ordered;
  }

  public byAssetType(assetType: ScatterAssetType): ScatterDefinition[] {
    return this.ordered.filter((definition) => definition.assetType === assetType);
  }

  public get size(): number {
    return this.ordered.length;
  }
}
