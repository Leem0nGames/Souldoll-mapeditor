export class GameLoop {
  private animationFrameId: number = 0;
  private lastTime: number = performance.now();
  private accumulator: number = 0;
  private readonly timeStep: number = 1 / 60; 
  private readonly maxDt: number = 0.1; 
  private paused: boolean = false;

  private updateCallback: (dt: number) => void;
  private renderCallback: (alpha: number) => void;

  constructor(updateCallback: (dt: number) => void, renderCallback: (alpha: number) => void) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
  }

  public start() {
    this.paused = false;
    this.lastTime = performance.now();
    const loop = (currentTime: number) => {
      if (this.paused) return;
      this.animationFrameId = requestAnimationFrame(loop);

      const rawDt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;
      const dt = Math.min(rawDt, this.maxDt);

      this.accumulator += dt;

      while (this.accumulator >= this.timeStep) {
        this.updateCallback(this.timeStep);
        this.accumulator -= this.timeStep;
      }

      const alpha = this.accumulator / this.timeStep;
      this.renderCallback(alpha);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public pause() {
    this.paused = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public resume() {
    if (!this.paused) return;
    this.paused = false;
    this.lastTime = performance.now(); // Reset lastTime to avoid jump
    this.start();
  }

  public stop() {
    this.pause();
  }
}
