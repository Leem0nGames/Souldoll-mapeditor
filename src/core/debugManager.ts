import * as THREE from 'three';

export class DebugManager {
  private container: HTMLDivElement;
  private engine: any; 
  private enabled: boolean = false;
  
  private lastTime: number = performance.now();
  private frameCount: number = 0;
  private fpsBuffer: number[] = [];
  private renderScale: number = 1.0;
  private scaleTimer: number = 0;

  private stats = {
    fps: 0,
    ms: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    trees: 0,
    grass: 0,
    renderScale: 1.0
  };

  constructor(engine: any) {
    this.engine = engine;
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      pointer-events: none;
      z-index: 9999;
      display: none;
      border: 2px solid #00ff00;
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
    `;
    document.body.appendChild(this.container);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        this.enabled = !this.enabled;
        this.container.style.display = this.enabled ? 'block' : 'none';
      }
    });
  }

  public update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, trees: any[], grass: any[]) {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.frameCount++;

    if (dt >= 1000) {
      this.stats.fps = Math.round((this.frameCount * 1000) / dt);
      this.stats.ms = dt / this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
      
      this.fpsBuffer.push(this.stats.fps);
      if (this.fpsBuffer.length > 10) this.fpsBuffer.shift();
      
      this.updateScaling(renderer);
    }

    if (!this.enabled) return;

    this.stats.drawCalls = renderer.info.render.calls;
    this.stats.triangles = renderer.info.render.triangles;
    this.stats.textures = renderer.info.memory.textures;
    this.stats.geometries = renderer.info.memory.geometries;
    this.stats.trees = trees.length;
    this.stats.grass = grass.length;
    this.stats.renderScale = this.renderScale;

    this.container.innerHTML = `
      <div style="font-weight:bold; border-bottom: 1px solid #0f0; margin-bottom: 5px;">DEBUG PANEL (F3)</div>
      <div>FPS: ${this.stats.fps}</div>
      <div>Frame Time: ${this.stats.ms.toFixed(2)}ms</div>
      <div>Draw Calls: ${this.stats.drawCalls}</div>
      <div>Triangles: ${this.stats.triangles}</div>
      <div>Textures: ${this.stats.textures}</div>
      <div>Geometries: ${this.stats.geometries}</div>
      <div>Visible Trees: ${this.stats.trees}</div>
      <div>Visible Grass: ${this.stats.grass}</div>
      <div style="color: ${this.renderScale < 1 ? '#ff0' : '#0f0'}">Render Scale: ${this.renderScale.toFixed(2)}</div>
    `;
  }

  private updateScaling(renderer: THREE.WebGLRenderer) {
    if (this.fpsBuffer.length < 2) return;
    
    const avgFps = this.fpsBuffer.reduce((a, b) => a + b, 0) / this.fpsBuffer.length;
    
    // Low performance: scale down
    if (avgFps < 50 && this.renderScale > 0.5) {
      this.renderScale = Math.max(0.5, this.renderScale - 0.1);
      renderer.setPixelRatio(this.renderScale);
      this.fpsBuffer = []; // Reset buffer after change
    } 
    // High performance: scale up
    else if (avgFps > 58 && this.renderScale < 1.0) {
      this.scaleTimer += 1;
      if (this.scaleTimer >= 5) { // Stay >58 FPS for 5 seconds
        this.renderScale = Math.min(1.0, this.renderScale + 0.1);
        renderer.setPixelRatio(this.renderScale);
        this.scaleTimer = 0;
        this.fpsBuffer = [];
      }
    } else {
      this.scaleTimer = 0;
    }
  }

  public handleCommand(cmd: string) {
    // Basic command routing (to be expanded in engine if needed)
    console.log(`[Debug] Command: ${cmd}`);
    const args = cmd.split(' ');
    if (args[0] === 'tp') {
      this.engine.teleport(parseFloat(args[1]), parseFloat(args[2]));
    } else if (args[0] === 'curar') {
      this.engine.healFull();
    }
  }
}
