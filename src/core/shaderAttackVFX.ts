/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export type ShaderAttackType = 'lava' | 'water' | 'slime' | 'blackhole';

// Shared GLSL Noise & Simplex helpers
const GLSL_COMMON_NOISE = /* glsl */ `
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// 2D cellular / Voronoi distance
vec2 cellular2D(vec2 P) {
  const float K = 0.142857142857;
  const float Ko = 0.428571428571;
  vec2 Pi = mod289(floor(P));
  vec2 Pf = fract(P);
  vec3 oi = vec3(-1.0, 0.0, 1.0);
  vec3 of = vec3(-0.5, 0.5, 1.5);
  vec3 px = permute(Pi.x + oi);
  vec3 p = permute(px.x + Pi.y + oi);
  vec3 ox = fract(p*K) - Ko;
  vec3 oy = mod(floor(p*K), 7.0)*K - Ko;
  vec3 dx = Pf.x - of + 0.5 + ox;
  vec3 dy = Pf.y - of + 0.5 + oy;
  vec3 d1 = dx * dx + dy * dy;
  p = permute(px.y + Pi.y + oi);
  ox = fract(p*K) - Ko;
  oy = mod(floor(p*K), 7.0)*K - Ko;
  dx = Pf.x - of + ox;
  dy = Pf.y - of + dy;
  vec3 d2 = dx * dx + dy * dy;
  p = permute(px.z + Pi.y + oi);
  ox = fract(p*K) - Ko;
  oy = mod(floor(p*K), 7.0)*K - Ko;
  dx = Pf.x - of - 0.5 + ox;
  dy = Pf.y - of - 0.5 + oy;
  vec3 d3 = dx * dx + dy * dy;
  vec3 d1a = min(d1, d2);
  d2 = max(d1, d2);
  d1 = min(d1a, d3);
  d2 = max(d1a, d3);
  d1.xy = (d1.x < d1.y) ? d1.xy : d1.yx;
  d1.xz = (d1.x < d1.z) ? d1.xz : d1.zx;
  d1.yz = min(d1.yz, d2.yz);
  d1.y = min(d1.y, d1.z);
  d1.y = min(d1.y, d2.x);
  return sqrt(d1.xy);
}
`;

// ==========================================
// 1. LAVA SHADER: Cracked Crust & Molten Flow
// ==========================================
export function createLavaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: 1.0 },
      uColorMagmaCore: { value: new THREE.Color(0xffeedd) },
      uColorMagmaFire: { value: new THREE.Color(0xff4500) },
      uColorBasalt: { value: new THREE.Color(0x160e0a) },
    },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON_NOISE}
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        
        // Gentle bubbling pulse on the sphere
        float displacement = snoise(position * 2.5 + vec3(0.0, uTime * 0.8, 0.0)) * 0.05;
        vec3 newPos = position + normal * displacement;
        
        vPosition = newPos;
        vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON_NOISE}
      uniform float uTime;
      uniform float uPulse;
      uniform vec3 uColorMagmaCore;
      uniform vec3 uColorMagmaFire;
      uniform vec3 uColorBasalt;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying vec3 vViewPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // Procedural Voronoi crack network
        vec2 flowUv = vUv * 6.5 + vec2(sin(uTime * 0.3 + vPosition.y * 2.0) * 0.15, uTime * 0.1);
        vec2 cell = cellular2D(flowUv);
        float crackVal = cell.y - cell.x; // edge distance

        // Noise distortion for ragged rock borders
        float noisePerturb = snoise(vPosition * 4.0 + uTime * 0.5) * 0.15;
        float crackFactor = smoothstep(0.04, 0.22, crackVal + noisePerturb);

        // Flowing glowing lava inside the cracks
        float flowHeat = snoise(vPosition * 3.0 - vec3(0.0, uTime * 2.0, 0.0)) * 0.5 + 0.5;
        vec3 molten = mix(uColorMagmaFire, uColorMagmaCore, pow(flowHeat, 2.0) * uPulse);

        // Crust stone details
        float rockNoise = snoise(vPosition * 12.0) * 0.1;
        vec3 crust = uColorBasalt + vec3(rockNoise);

        // Blend crust and molten veins
        vec3 finalColor = mix(molten * 2.2, crust, crackFactor);

        // Fresnel heat aura along glancing edges
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
        finalColor += vec3(1.0, 0.35, 0.05) * fresnel * 2.5;

        // Diffuse shading for rock crust
        float diff = max(dot(normal, normalize(vec3(0.5, 1.0, 0.8))), 0.2);
        if (crackFactor > 0.5) {
          finalColor *= diff * 1.2;
        }

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    transparent: false,
  });
}

// ==========================================
// 2. WATER SHADER: Refraction, Ripples & Splashes
// ==========================================
export function createWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x0284c7) },
      uShallowColor: { value: new THREE.Color(0x38bdf8) },
      uFoamColor: { value: new THREE.Color(0xe0f2fe) },
    },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON_NOISE}
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        
        // Multi-frequency wave ripple displacement
        float wave1 = sin(position.y * 10.0 + uTime * 5.0) * 0.035;
        float wave2 = cos(position.x * 12.0 + uTime * 4.0) * 0.03;
        float waveNoise = snoise(position * 4.0 + vec3(0.0, uTime * 1.5, 0.0)) * 0.04;
        
        vec3 displaced = position + normal * (wave1 + wave2 + waveNoise);
        vPosition = displaced;

        vNormal = normalize(normalMatrix * (normal + vec3(wave1, wave2, waveNoise) * 2.0));
        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON_NOISE}
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFoamColor;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying vec3 vViewPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // Procedural caustic pattern
        float caustic1 = sin((vPosition.x + vPosition.y) * 16.0 + uTime * 4.0);
        float caustic2 = cos((vPosition.z - vPosition.y) * 16.0 - uTime * 3.5);
        float caustics = pow(max(0.0, (caustic1 + caustic2) * 0.5), 3.0) * 0.8;

        // Fresnel reflection & refraction intensity
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.2);

        // Specular sunlight highlight
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.6));
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 48.0) * 1.6;

        // Gradient color from deep sea core to vibrant turquoise rim
        vec3 waterColor = mix(uDeepColor, uShallowColor, fresnel * 0.85 + caustics * 0.4);
        waterColor += uFoamColor * (caustics * 0.6 + spec);
        waterColor += vec3(0.6, 0.95, 1.0) * (fresnel * 1.5);

        // Translucent liquid feel
        float alpha = clamp(0.75 + fresnel * 0.25, 0.0, 0.96);

        gl_FragColor = vec4(waterColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

// ==========================================
// 3. BOILING SLIME: Bubbles on Top, Drips Below
// ==========================================
export function createSlimeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSlimeGreen: { value: new THREE.Color(0x39ff14) },
      uToxicCore: { value: new THREE.Color(0x15803d) },
      uHighlight: { value: new THREE.Color(0xccff00) },
    },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON_NOISE}
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;
      varying float vDripFactor;
      varying float vBubbleFactor;

      void main() {
        vec3 pos = position;
        
        // 1. Organic fluid bounce / wobble
        float wobble = sin(uTime * 3.5 + pos.y * 2.0) * 0.05;
        pos += normal * wobble;

        // 2. Top Bubbling: Sharp bubble domes erupting on upper hemisphere
        float topMask = max(0.0, normal.y);
        float bubbleFreq = sin(pos.x * 12.0 + uTime * 7.0) * cos(pos.z * 12.0 + uTime * 6.0);
        float bubbles = pow(max(0.0, bubbleFreq), 3.5) * topMask * 0.25;
        pos += normal * bubbles;
        vBubbleFactor = bubbles;

        // 3. Bottom Drips: Viscous stretch dragging bottom vertices downward
        float bottomMask = max(0.0, -normal.y);
        float dripWave = sin(uTime * 4.0 + pos.x * 8.0) * 0.5 + 0.5;
        float drips = pow(bottomMask, 2.5) * (0.28 + 0.16 * dripWave);
        pos.y -= drips;
        vDripFactor = drips;

        vPosition = pos;
        vNormal = normalize(normalMatrix * (normal + vec3(0.0, bubbles - drips, 0.0)));
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON_NOISE}
      uniform float uTime;
      uniform vec3 uSlimeGreen;
      uniform vec3 uToxicCore;
      uniform vec3 uHighlight;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;
      varying float vDripFactor;
      varying float vBubbleFactor;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // Sticky viscous subsurface glow
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);

        // Glossy wet specular shine
        vec3 lightDir = normalize(vec3(0.3, 1.0, 0.7));
        vec3 halfDir = normalize(lightDir + viewDir);
        float gloss = pow(max(dot(normal, halfDir), 0.0), 36.0) * 1.8;

        // Color blending from deep toxic body to neon acidic mantle
        vec3 slimeColor = mix(uToxicCore, uSlimeGreen, 0.6 + fresnel * 0.4);
        
        // Emphasize bubbling froth and stretched drips
        if (vBubbleFactor > 0.03) {
          slimeColor = mix(slimeColor, uHighlight, vBubbleFactor * 3.5);
        }
        if (vDripFactor > 0.05) {
          slimeColor = mix(slimeColor, uHighlight * 0.8, 0.4);
        }

        // Add caustic specular highlights
        slimeColor += uHighlight * (gloss + fresnel * 0.8);

        gl_FragColor = vec4(slimeColor, 0.94);
      }
    `,
    transparent: true,
  });
}

// ==========================================
// 4. BLACK HOLE: Light Bending & Accretion Disk
// ==========================================
export function createBlackHoleDiskMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uInnerRadius: { value: 0.55 },
      uOuterRadius: { value: 1.6 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON_NOISE}
      uniform float uTime;
      uniform float uInnerRadius;
      uniform float uOuterRadius;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        // Centered coordinates on disk
        vec2 centered = vUv * 2.0 - 1.0;
        float r = length(centered);
        
        // Cut inside event horizon and outside disk radius
        if (r < 0.35 || r > 1.0) {
          discard;
        }

        // Swirling relativistic polar rotation
        float angle = atan(centered.y, centered.x);
        float swirl = angle + (uTime * 3.5) / (r * 1.8 + 0.2);

        // Procedural plasma turbulence
        float noiseVal = snoise(vec3(cos(swirl) * 3.0, sin(swirl) * 3.0, r * 4.0 - uTime * 2.0));
        float plasma = clamp((noiseVal + 1.0) * 0.5, 0.0, 1.0);

        // Cosmic gradient: intense violet -> burning neon magenta -> bright cyan relativistic jet
        vec3 colorDark = vec3(0.2, 0.02, 0.35);
        vec3 colorMid = vec3(0.85, 0.1, 0.7);
        vec3 colorHot = vec3(0.3, 0.85, 1.0);

        vec3 diskColor = mix(colorDark, colorMid, smoothstep(0.35, 0.65, r));
        diskColor = mix(diskColor, colorHot, pow(plasma, 2.5) * 1.5);

        // Relativistic Doppler Beaming: Approaching side (centered.x > 0) is brighter & hotter
        float doppler = 1.0 + centered.x * 0.45;
        diskColor *= doppler;

        // Radial fade off
        float alpha = smoothstep(0.35, 0.42, r) * (1.0 - smoothstep(0.85, 1.0, r));
        alpha *= (0.7 + plasma * 0.3);

        gl_FragColor = vec4(diskColor * 1.8, clamp(alpha, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

export function createGravitationalHaloMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorInner: { value: new THREE.Color(0xa855f7) },
      uColorOuter: { value: new THREE.Color(0x3b82f6) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColorInner;
      uniform vec3 uColorOuter;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // Einstein Ring / Gravitational Lensing photon sphere
        float rim = 1.0 - max(dot(normal, viewDir), 0.0);
        float ring = pow(rim, 3.5) * 2.8;

        vec3 color = mix(uColorInner, uColorOuter, rim);
        gl_FragColor = vec4(color * (ring + 0.2), clamp(ring, 0.0, 0.85));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
}

// ==========================================
// SHADER ATTACK ORCHESTRATOR
// ==========================================
export interface ActiveShaderAttack {
  id: string;
  type: ShaderAttackType;
  group: THREE.Group;
  materials: THREE.ShaderMaterial[];
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  progress: number; // 0.0 to 1.0
  duration: number; // seconds
  onImpact?: () => void;
  impacted: boolean;
  extraEntities?: THREE.Object3D[];
}

export class ShaderAttackEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private animFrameId: number | null = null;
  private attacks: ActiveShaderAttack[] = [];
  private lastTime: number = performance.now();
  private isDestroyed: boolean = false;

  // Shared Geometries to optimize memory and draw calls
  private sphereGeo: THREE.SphereGeometry;
  private haloGeo: THREE.SphereGeometry;
  private diskGeo: THREE.RingGeometry;
  private dripGeo: THREE.SphereGeometry;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    // Reuse geometries
    this.sphereGeo = new THREE.SphereGeometry(1.0, 36, 36);
    this.haloGeo = new THREE.SphereGeometry(1.3, 32, 32);
    this.diskGeo = new THREE.RingGeometry(0.5, 2.3, 48);
    this.dripGeo = new THREE.SphereGeometry(0.2, 16, 16);
  }

  public init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.updateSize();

    this.startLoop();
  }

  public updateSize() {
    if (!this.canvas || !this.renderer) return;
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private startLoop() {
    const loop = (now: number) => {
      if (this.isDestroyed) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      this.update(dt, now / 1000);
      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  // Convert 2D screen coordinate percentages (0 to 100) to 3D world coordinates on Z=0
  public screenToWorld(pctX: number, pctY: number): THREE.Vector3 {
    // pctX in [0, 100], pctY in [0, 100]
    const normX = (pctX / 100) * 2 - 1;
    const normY = -(pctY / 100) * 2 + 1;

    // Unproject to z=0 plane
    const v = new THREE.Vector3(normX, normY, 0.5);
    v.unproject(this.camera);
    const dir = v.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / dir.z;
    return this.camera.position.clone().add(dir.multiplyScalar(distance));
  }

  public launchAttack(
    type: ShaderAttackType,
    fromPct: { x: number; y: number },
    toPct: { x: number; y: number },
    duration: number = 0.85,
    onImpact?: () => void
  ) {
    const startPos = this.screenToWorld(fromPct.x, fromPct.y);
    const endPos = this.screenToWorld(toPct.x, toPct.y);

    const group = new THREE.Group();
    const materials: THREE.ShaderMaterial[] = [];
    const extraEntities: THREE.Object3D[] = [];

    if (type === 'lava') {
      const lavaMat = createLavaMaterial();
      materials.push(lavaMat);
      const mesh = new THREE.Mesh(this.sphereGeo, lavaMat);
      mesh.scale.set(0.65, 0.65, 0.65);
      group.add(mesh);

      // Trailing ember sparks
      const emberGeo = new THREE.BufferGeometry();
      const count = 30;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 1.2;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
      }
      emberGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const emberMat = new THREE.PointsMaterial({
        color: 0xffaa00,
        size: 0.12,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const embers = new THREE.Points(emberGeo, emberMat);
      group.add(embers);
      extraEntities.push(embers);

    } else if (type === 'water') {
      const waterMat = createWaterMaterial();
      materials.push(waterMat);
      const mesh = new THREE.Mesh(this.sphereGeo, waterMat);
      mesh.scale.set(0.68, 0.68, 0.68);
      group.add(mesh);

      // Inner air bubbles
      const bubbleGeo = new THREE.BufferGeometry();
      const count = 25;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = 0.45 * Math.cbrt(Math.random());
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      bubbleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const bubbleMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.08,
        transparent: true,
        opacity: 0.85,
      });
      const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
      group.add(bubbles);
      extraEntities.push(bubbles);

    } else if (type === 'slime') {
      const slimeMat = createSlimeMaterial();
      materials.push(slimeMat);
      const mesh = new THREE.Mesh(this.sphereGeo, slimeMat);
      mesh.scale.set(0.65, 0.65, 0.65);
      group.add(mesh);

      // Dripping toxic droplet satellites
      for (let d = 0; d < 3; d++) {
        const dripMesh = new THREE.Mesh(this.dripGeo, slimeMat);
        dripMesh.position.set((d - 1) * 0.28, -0.7 - d * 0.25, 0);
        dripMesh.scale.set(0.4, 0.65, 0.4);
        group.add(dripMesh);
        extraEntities.push(dripMesh);
      }

    } else if (type === 'blackhole') {
      // 1. Pure Black Event Horizon Core
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const coreMesh = new THREE.Mesh(this.sphereGeo, coreMat);
      coreMesh.scale.set(0.46, 0.46, 0.46);
      group.add(coreMesh);

      // 2. Gravitational Halo
      const haloMat = createGravitationalHaloMaterial();
      materials.push(haloMat);
      const haloMesh = new THREE.Mesh(this.haloGeo, haloMat);
      group.add(haloMesh);

      // 3. Tilted Accretion Disk
      const diskMat = createBlackHoleDiskMaterial();
      materials.push(diskMat);
      const diskMesh = new THREE.Mesh(this.diskGeo, diskMat);
      diskMesh.rotation.x = Math.PI * 0.38; // 68 degrees tilt for cinematic angle
      diskMesh.scale.set(0.85, 0.85, 0.85);
      group.add(diskMesh);
      extraEntities.push(diskMesh);
    }

    group.position.copy(startPos);
    this.scene.add(group);

    const attackItem: ActiveShaderAttack = {
      id: `atk-${Date.now()}-${Math.random()}`,
      type,
      group,
      materials,
      startPos,
      endPos,
      progress: 0,
      duration,
      onImpact,
      impacted: false,
      extraEntities,
    };

    this.attacks.push(attackItem);
  }

  private update(dt: number, timeSec: number) {
    for (let i = this.attacks.length - 1; i >= 0; i--) {
      const atk = this.attacks[i];
      atk.progress += dt / atk.duration;

      // Update shader uniforms
      for (const mat of atk.materials) {
        if (mat.uniforms.uTime) {
          mat.uniforms.uTime.value = timeSec;
        }
        if (mat.uniforms.uPulse) {
          mat.uniforms.uPulse.value = 1.0 + 0.35 * Math.sin(timeSec * 6.0);
        }
      }

      // Parabolic flight trajectory
      const t = Math.min(1.0, atk.progress);
      // Smooth ease in-out
      const easeT = t * t * (3 - 2 * t);
      
      // Arc height in middle of trajectory
      const arcHeight = Math.sin(t * Math.PI) * 1.4;

      atk.group.position.lerpVectors(atk.startPos, atk.endPos, easeT);
      atk.group.position.y += arcHeight;

      // Dynamic rotation
      if (atk.type === 'lava') {
        atk.group.rotation.x += dt * 2.0;
        atk.group.rotation.y += dt * 3.0;
      } else if (atk.type === 'water') {
        atk.group.rotation.y += dt * 2.5;
        atk.group.rotation.z += dt * 1.5;
      } else if (atk.type === 'slime') {
        atk.group.rotation.z = Math.sin(timeSec * 5.0) * 0.25;
      } else if (atk.type === 'blackhole') {
        atk.group.rotation.z -= dt * 4.5;
      }

      // Scaling: Spawn swell -> Flight -> Explosion detonation on impact
      if (t < 0.2) {
        const swell = t / 0.2;
        atk.group.scale.setScalar(swell);
      } else if (t >= 0.95 && !atk.impacted) {
        atk.impacted = true;
        if (atk.onImpact) {
          atk.onImpact();
        }
      }

      if (t >= 1.0) {
        // Impact Detonation burst animation
        const blastProgress = (atk.progress - 1.0) / 0.25; // 0.25s blast
        if (blastProgress <= 1.0) {
          const blastScale = 1.0 + blastProgress * 2.5;
          atk.group.scale.setScalar(blastScale);
          for (const mat of atk.materials) {
            mat.opacity = Math.max(0, 1.0 - blastProgress);
            mat.transparent = true;
          }
        } else {
          // Dispose and remove
          this.scene.remove(atk.group);
          atk.materials.forEach(m => m.dispose());
          this.attacks.splice(i, 1);
        }
      }
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.attacks.forEach(atk => {
      this.scene.remove(atk.group);
      atk.materials.forEach(m => m.dispose());
    });
    this.attacks = [];

    this.sphereGeo.dispose();
    this.haloGeo.dispose();
    this.diskGeo.dispose();
    this.dripGeo.dispose();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}

export const shaderAttackEngine = new ShaderAttackEngine();
