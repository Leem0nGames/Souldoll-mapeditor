/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameAction =
  | 'moveForward'
  | 'moveBackward'
  | 'turnLeft'
  | 'turnRight'
  | 'strafeLeft'
  | 'strafeRight'
  | 'accept'
  | 'cancel'
  | 'pause'
  | 'interact'
  | 'attack'
  | 'sprint'
  | 'luminadex';

export class InputManager {
  private actions: Record<GameAction, boolean> = {
    moveForward: false,
    moveBackward: false,
    turnLeft: false,
    turnRight: false,
    strafeLeft: false,
    strafeRight: false,
    accept: false,
    cancel: false,
    pause: false,
    interact: false,
    attack: false,
    sprint: false,
    luminadex: false,
  };

  private domElement: HTMLElement;
  private mouseDeltaX: number = 0;
  private isMouseDown: boolean = false;
  private lastTouchX: number = 0;
  private pendingYawDelta: number = 0;
  private analogMove: { x: number; y: number } = { x: 0, y: 0 };

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);

    domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);

    domElement.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    domElement.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    domElement.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    domElement.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });
  }

  private handleWindowBlur = () => {
    this.resetAll();
  };

  public resetAll() {
    (Object.keys(this.actions) as GameAction[]).forEach((k) => {
      this.actions[k] = false;
    });
    this.isMouseDown = false;
    this.pendingYawDelta = 0;
    this.analogMove.x = 0;
    this.analogMove.y = 0;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (['Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'KeyW' || e.code === 'ArrowUp') this.actions.moveForward = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') this.actions.moveBackward = true;
    if (e.code === 'KeyA') this.actions.strafeLeft = true;
    if (e.code === 'KeyD') this.actions.strafeRight = true;
    if (e.code === 'KeyQ' || e.code === 'ArrowLeft') this.actions.turnLeft = true;
    if (e.code === 'KeyE' || e.code === 'ArrowRight') this.actions.turnRight = true;
    if (e.code === 'Space' || e.code === 'Enter') this.actions.accept = true;
    if (e.code === 'Escape') this.actions.cancel = true;
    if (e.code === 'KeyP') this.actions.pause = true;
    if (e.code === 'KeyE' && !this.actions.turnRight) this.actions.interact = true;
    if (e.code === 'Space') this.actions.attack = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.actions.sprint = true;
    if (e.code === 'KeyJ') this.actions.luminadex = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') this.actions.moveForward = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') this.actions.moveBackward = false;
    if (e.code === 'A' || e.code === 'KeyA') this.actions.strafeLeft = false;
    if (e.code === 'KeyD') this.actions.strafeRight = false;
    if (e.code === 'KeyQ' || e.code === 'ArrowLeft') this.actions.turnLeft = false;
    if (e.code === 'KeyE' || e.code === 'ArrowRight') this.actions.turnRight = false;
    if (e.code === 'Space' || e.code === 'Enter') this.actions.accept = false;
    if (e.code === 'Escape') this.actions.cancel = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.actions.sprint = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = true;
      this.mouseDeltaX = e.clientX;
    }
  };

  private handleMouseUp = () => {
    this.isMouseDown = false;
    this.actions.turnRight = false;
    this.actions.turnLeft = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isMouseDown) {
      const delta = e.clientX - this.mouseDeltaX;
      this.mouseDeltaX = e.clientX;
      if (Math.abs(delta) > 0.5) {
        this.pendingYawDelta -= delta * 0.004;
      }
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.targetTouches.length > 0) {
      this.lastTouchX = e.targetTouches[0].clientX;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (e.targetTouches.length > 0) {
      const delta = e.targetTouches[0].clientX - this.lastTouchX;
      this.lastTouchX = e.targetTouches[0].clientX;
      if (Math.abs(delta) > 0.5) {
        this.pendingYawDelta -= delta * 0.005;
      }
    }
  };

  private handleTouchEnd = () => {
    this.actions.turnRight = false;
    this.actions.turnLeft = false;
  };

  public consumeYawDelta(): number {
    const d = this.pendingYawDelta;
    this.pendingYawDelta = 0;
    return d;
  }

  public isActionActive(action: GameAction): boolean {
    return this.actions[action];
  }

  public setVirtualAction(action: GameAction, active: boolean) {
    this.actions[action] = active;
  }

  public setAnalogMove(x: number, y: number) {
    this.analogMove.x = Math.max(-1, Math.min(1, x));
    this.analogMove.y = Math.max(-1, Math.min(1, y));
  }

  public getAnalogMove(): { x: number; y: number } {
    return this.analogMove;
  }

  public destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.domElement.removeEventListener('mousedown', this.handleMouseDown);
    this.domElement.removeEventListener('touchstart', this.handleTouchStart);
    this.domElement.removeEventListener('touchmove', this.handleTouchMove);
    this.domElement.removeEventListener('touchend', this.handleTouchEnd);
    this.domElement.removeEventListener('touchcancel', this.handleTouchEnd);
  }
}
