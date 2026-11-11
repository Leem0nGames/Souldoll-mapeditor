/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface BillboardMaterialParameters extends THREE.MeshStandardMaterialParameters {
  isBillboard?: boolean;
}

export class BillboardMaterial extends THREE.MeshStandardMaterial {
  constructor(parameters?: BillboardMaterialParameters) {
    super(parameters);
    
    this.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        
        // Billboarding logic
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        
        // Get the scale from the instance matrix
        float scaleX = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
        float scaleY = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));
        
        mvPosition.xy += position.xy * vec2(scaleX, scaleY);
        gl_Position = projectionMatrix * mvPosition;
        `
      );
      // We need to skip the rest of the vertex shader's standard position calculation
      // but keep the varying definitions for fragment shader.
      // This is a bit hacky with MeshStandardMaterial, but let's try.
      // Actually, it might be better to just use a custom ShaderMaterial if we want full control.
    };
  }
}

/**
 * A simpler billboarding approach: 
 * We use a custom shader that mimics MeshStandardMaterial but with billboarding.
 */
export function createBillboardMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.common,
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      {
        map: { value: texture },
        diffuse: { value: new THREE.Color(0xffffff) },
        opacity: { value: 1.0 },
        time: { value: 0.0 },
        swayAmount: { value: 0.0 },
        playerPos: { value: new THREE.Vector3() },
        cameraPos: { value: new THREE.Vector3() },
        occlusionFade: { value: 0.0 },
      }
    ]),
    vertexShader: `
      #include <common>
      #include <lights_pars_begin>
      #include <fog_pars_vertex>
      
      varying vec2 vUv;
      varying vec3 vViewPosition;
      varying vec3 vNormal;
      varying vec3 vInstanceWorldPos;
      
      uniform float time;
      uniform float swayAmount;
      
      void main() {
        vUv = uv;
        
      #ifdef USE_INSTANCING
        // Instance position in world space
        vec4 worldInstance = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vInstanceWorldPos = worldInstance.xyz;
        
        // Extract scale from instanceMatrix
        vec3 scale;
        scale.x = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
        scale.y = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));
        scale.z = length(vec3(instanceMatrix[2][0], instanceMatrix[2][1], instanceMatrix[2][2]));

        // Base position in view space
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        
        // Grass sway
        float phase = instanceMatrix[3][0] + instanceMatrix[3][2]; // use world pos as phase
        float sway = sin(time * 4.0 + phase) * swayAmount * (uv.y);
        
        vec2 billboardPos = position.xy;
        billboardPos.x += sway;
        
        mvPosition.xy += billboardPos * scale.xy;
      #else
        // Non-instanced mesh fallback
        vec4 worldInstance = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vInstanceWorldPos = worldInstance.xyz;
        
        vec3 scale;
        scale.x = length(vec3(modelMatrix[0][0], modelMatrix[0][1], modelMatrix[0][2]));
        scale.y = length(vec3(modelMatrix[1][0], modelMatrix[1][1], modelMatrix[1][2]));
        scale.z = length(vec3(modelMatrix[2][0], modelMatrix[2][1], modelMatrix[2][2]));

        vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        
        float phase = modelMatrix[3][0] + modelMatrix[3][2];
        float sway = sin(time * 4.0 + phase) * swayAmount * (uv.y);
        
        vec2 billboardPos = position.xy;
        billboardPos.x += sway;
        
        mvPosition.xy += billboardPos * scale.xy;
      #endif
        
        vViewPosition = -mvPosition.xyz;
        vNormal = normalMatrix * vec3(0, 0, 1); // Fixed normal for billboard
        
        gl_Position = projectionMatrix * mvPosition;
        
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 diffuse;
      uniform float opacity;
      uniform sampler2D map;
      uniform vec3 playerPos;
      uniform vec3 cameraPos;
      uniform float occlusionFade;
      
      varying vec2 vUv;
      varying vec3 vInstanceWorldPos;
      
      #include <common>
      #include <lights_pars_begin>
      #include <fog_pars_fragment>
      
      float getBayer4x4(vec2 p) {
        int x = int(mod(p.x, 4.0));
        int y = int(mod(p.y, 4.0));
        int idx = x + y * 4;
        if (idx == 0) return 0.0 / 16.0;
        if (idx == 1) return 8.0 / 16.0;
        if (idx == 2) return 2.0 / 16.0;
        if (idx == 3) return 10.0 / 16.0;
        if (idx == 4) return 12.0 / 16.0;
        if (idx == 5) return 4.0 / 16.0;
        if (idx == 6) return 14.0 / 16.0;
        if (idx == 7) return 6.0 / 16.0;
        if (idx == 8) return 3.0 / 16.0;
        if (idx == 9) return 11.0 / 16.0;
        if (idx == 10) return 1.0 / 16.0;
        if (idx == 11) return 9.0 / 16.0;
        if (idx == 12) return 15.0 / 16.0;
        if (idx == 13) return 7.0 / 16.0;
        if (idx == 14) return 13.0 / 16.0;
        return 5.0 / 16.0;
      }
      
      void main() {
        vec4 texelColor = texture2D(map, vUv);
        if (texelColor.a < 0.5) discard;
        
        float finalOpacity = opacity;
        
        if (occlusionFade > 0.5) {
          vec3 target = playerPos + vec3(0.0, 2.5, 0.0);
          vec3 camToTarget = target - cameraPos;
          float camDist = length(camToTarget);
          
          if (camDist > 0.1) {
            vec3 dir = camToTarget / camDist;
            vec3 camToTree = vInstanceWorldPos - cameraPos;
            float t = dot(camToTree, dir);
            
            float occlusion = 0.0;
            // Tree is situated between camera and player
            if (t > 1.5 && t < camDist + 3.0) {
              vec3 closestPoint = cameraPos + dir * t;
              float perpDist = length(vInstanceWorldPos.xz - closestPoint.xz);
              float rayOcclusion = 1.0 - smoothstep(4.0, 14.0, perpDist);
              occlusion = max(occlusion, rayOcclusion);
            }
            
            // Or player is walking right under the tree canopy
            float playerDist = length(vInstanceWorldPos.xz - playerPos.xz);
            float underCanopy = 1.0 - smoothstep(3.0, 12.0, playerDist);
            occlusion = max(occlusion, underCanopy);
            
            if (occlusion > 0.05) {
              // Fade visibility using retro pixel-art Bayer dither
              float visibleRatio = mix(1.0, 0.28, occlusion);
              if (visibleRatio < getBayer4x4(gl_FragCoord.xy)) {
                discard;
              }
              finalOpacity = mix(opacity, 0.75, occlusion);
            }
          }
        }
        
        vec3 outgoingLight = texelColor.rgb * diffuse;
        gl_FragColor = vec4(outgoingLight, texelColor.a * finalOpacity);
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    lights: true,
    fog: true,
    transparent: true
  });
}
