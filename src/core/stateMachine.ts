/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from './logger';

export type GameStateKey =
  | 'title'
  | 'world'
  | 'transitionToEncounter'
  | 'combat'
  | 'partyMenu'
  | 'bag'
  | 'pause'
  | 'error';

export interface GameStateHandlers {
  enter?: () => void;
  exit?: () => void;
  update?: (dt: number) => void;
}

const VALID_TRANSITIONS: Record<GameStateKey, GameStateKey[]> = {
  title: ['world', 'error'],
  world: ['transitionToEncounter', 'combat', 'partyMenu', 'bag', 'pause', 'error', 'title'],
  transitionToEncounter: ['combat', 'world', 'error'],
  combat: ['world', 'error'],
  partyMenu: ['world', 'error'],
  bag: ['world', 'error'],
  pause: ['world', 'error', 'title'],
  error: ['title'],
};

export class StateMachine {
  private currentState: GameStateKey = 'title';
  private handlers: Map<GameStateKey, GameStateHandlers> = new Map();

  public registerState(key: GameStateKey, handlers: GameStateHandlers) {
    this.handlers.set(key, handlers);
  }

  public getState(): GameStateKey {
    return this.currentState;
  }

  public transition(targetState: GameStateKey): boolean {
    const allowed = VALID_TRANSITIONS[this.currentState];
    if (!allowed || !allowed.includes(targetState)) {
      logger.warn(`Invalid state transition attempted from '${this.currentState}' to '${targetState}'`);
      return false;
    }

    const currentHandlers = this.handlers.get(this.currentState);
    if (currentHandlers && currentHandlers.exit) {
      currentHandlers.exit();
    }

    logger.info(`State transition: ${this.currentState} -> ${targetState}`);
    this.currentState = targetState;

    const targetHandlers = this.handlers.get(targetState);
    if (targetHandlers && targetHandlers.enter) {
      targetHandlers.enter();
    }

    return true;
  }

  public update(dt: number) {
    const handlers = this.handlers.get(this.currentState);
    if (handlers && handlers.update) {
      handlers.update(dt);
    }
  }
}
