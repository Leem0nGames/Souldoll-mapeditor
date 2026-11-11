/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class ObjectPool<T> {
  private available: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 0) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  public get(): T {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    return this.factory();
  }

  public release(obj: T) {
    this.reset(obj);
    this.available.push(obj);
  }

  public getAvailableCount(): number {
    return this.available.length;
  }
}
