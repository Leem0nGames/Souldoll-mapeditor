/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from './logger';

type EventCallback = (...args: any[]) => void;

class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: EventCallback) {
    const list = this.listeners.get(event);
    if (!list) return;
    const index = list.indexOf(callback);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  public emit(event: string, ...args: any[]) {
    logger.info(`Event emitted: ${event}`, args);
    const list = this.listeners.get(event);
    if (!list) return;
    list.forEach(cb => {
      try {
        cb(...args);
      } catch (err) {
        logger.error(`Error in event listener for ${event}:`, err);
      }
    });
  }
}

export const eventBus = new EventBus();
