# 01 — Auditoría del motor procedural actual

**Proyecto auditado:** `procedural-map-souldolls-rpgv1` (SoulDolls / Luminati)
**Fecha:** 2026-11-11
**Alcance:** auditoría de solo lectura. No se modificó código de producción.
**Referencia funcional:** Calysto World 5.8 / Calysto Smart Scatter (solo como comparación de capacidades).

---

## 0. Nota de alcance y correspondencia con el brief

El brief original referencia archivos de otro repositorio (`src/engine/EnvironmentGenerator.ts`, `Game3DRenderer.ts`, `TextureAtlas.ts`, etc.). Esos archivos **no existen en este proyecto**. La auditoría se hizo sobre los módulos reales de este repositorio y se mantiene la numeración de etapas del brief.

| Archivo del brief | Equivalente real en este proyecto |
|---|---|
| `src/engine/EnvironmentGenerator.ts` | `src/world/worldGen.ts` (fachada `buildWorld`) + `src/world/chunkManager.ts` |
| `src/engine/Game3DRenderer.ts` | `src/game/engine.ts` (`GameEngine`) |
| `src/engine/CameraManager.ts` | Cámara integrada en `src/game/engine.ts` (sin módulo propio) |
| `src/engine/ProceduralTreeGenerator.ts` | No existe. Árboles = billboards procedurales (`createDenseTreeTexture` en `src/world/textures.ts`) |
| `src/engine/ProceduralBuildingGenerator.ts` | `src/world/buildingGen.ts` |
| `src/engine/PropFamilyGenerator.ts` | No existe como generador 3D. Props = sprites/texturas procedurales (`createPropsSpriteTexture`, `createFenceTexture`, etc.) |
| `src/engine/VegetationAtlas.ts` / `VegetationBillboardSystem.ts` | No existen. Hay `createBillboardMaterial` (`src/world/instancing.ts`) y billboards por tipo |
| `src/engine/TextureAtlas.ts` / `MaterialFactory.ts` | No existen. Materiales creados por sistema; texturas procedurales en `src/world/textures.ts` |
| `src/data/environmentConfig.ts` | No existe. Constantes de arte/región en `src/data/constants.ts`; biomas codificados en `proceduralTerrain.ts` |
| `src/data/maps.ts` | No existe. El juego usa **un mundo continuo**, no mapas independientes |
| `src/types/game.ts` | `src/types.ts` |
| `src/App.tsx` | `src/App.tsx` (existe; crea `GameEngine`) |

> **Implicación:** el motor objetivo debe adaptarse a `src/world/` (no crear `src/engine/world/`), reutilizando `worldGen`, `chunkManager`, `instancing`, `textures` y `buildingGen`.

---

## 1. Estado del repositorio y línea base de calidad

- El directorio **no es un repositorio Git propio**: el repositorio Git está en el directorio padre (`MIS REPOS`) y **no tiene commits**; todo el contenido aparece como no rastreado. No hay historial para comparar regresiones.
- `package.json`: Three.js `^0.187.0`, React 19, Vite `^8.3.0`, TypeScript `^7.0.2`, `seedrandom`.
- Scripts disponibles: `dev`, `build`, `preview`, `lint` (`tsc --noEmit`), `assets:*`, `clean`. **No existe `test` ni Vitest.**
- `src/core/tests.ts` es un **runner de aserciones en runtime** (se expone en `window.runTests`), no una suite automatizada.
- **Línea base de lint:** falla por entorno, no por código:
  `Unable to resolve @typescript/typescript-win32-x64` (falta el paquete opcional nativo de TypeScript 7).
- **Línea base de build:** falla por entorno, no por código:
  `Cannot find native binding` de `rolldown` (`@rolldown/binding-win32-x64-msvc` ausente).
- Conclusión: antes de la etapa 08 hay que reparar la instalación de dependencias (sin degradar versiones) para poder ejecutar `lint`, `build` y una suite de tests real.

---

## 2. Arquitectura actual

### 2.1 Capas reales

```
src/
├─ App.tsx / components/        UI React, HUD, minimapa, modales
│    └─ GameCanvas → GameEngine (src/game/engine.ts)
├─ game/engine.ts               Fachada de juego + render + cámara + colisiones
│    ├─ world/worldGen.ts       buildWorld(): composición del mundo
│    │    ├─ world/proceduralTerrain.ts   Relieve analítico + biomas + río
│    │    ├─ world/chunkManager.ts        Streaming de terreno 64 m + rocas
│    │    ├─ world/buildingGen.ts         Edificios 3D de villa
│    │    ├─ world/caveGen.ts             Entrada de cueva
│    │    ├─ world/manualLocations.ts      Templo solar y cripta espectral
│    │    ├─ world/textures.ts            Texturas pixel-art procedurales
│    │    ├─ world/instancing.ts          Shader de billboard + material
│    │    └─ data/npcRegistry, constants, regions
│    ├─ world/playerController.ts   Altura del jugador vía getTerrainHeight()
│    └─ save/saveManager.ts         Persistencia de partida (localStorage)
└─ battle/, core/, components/      Resto del juego (fuera del alcance del motor)
```

### 2.2 Diagrama de dependencias

```text
App.tsx
  └─> GameEngine (game/engine.ts)
        ├─> buildWorld (world/worldGen.ts)
        │     ├─> getProceduralTerrainHeight / sampleBiomeAt / getTerrainVertexColor
        │     │        └─> FastNoise2D + RIVER_SPLINE_POINTS (proceduralTerrain.ts)
        │     ├─> ChunkManager (world/chunkManager.ts)
        │     │        ├─> getProceduralTerrainHeight
        │     │        ├─> getTerrainVertexColor
        │     │        └─> sampleBiomeAt
        │     ├─> buildRiverMesh / buildRiverBridge
        │     ├─> buildingGen / caveGen / manualLocations
        │     ├─> textures.ts (canvas textures)
        │     └─> instancing.ts (billboard shader)
        ├─> PlayerController ──> getTerrainHeight (worldGen)
        ├─> checkPointCollision ──> getTerrainHeight + ChunkManager.checkCollision
        │                       + getDistanceToRiver + sampleBiomeAt
        └─> data/regions.ts ──> sampleBiomeAt (encuentros por bioma)

SaveManager (independiente del motor; guarda estado de partida)
```

### 2.3 Flujo de inicialización

1. `GameEngine` detecta perfil de rendimiento (`detectPerformanceProfile`).
2. Crea renderer, escena, cámara y `EffectComposer` (+ bloom en hardware potente).
3. Llama `buildWorld(scene, camera, 'fixed-seed', perfil)`.
4. `buildWorld` crea luces, cielo, luna, estrellas, mar, lago, río, puente, carreteras, aldea, POIs, NPCs, cofres, enemigos, hierba, árboles, partículas, recursos y jefes.
5. `ChunkManager.preloadAround(0, 16)` construye el terreno inicial síncronamente.
6. Se crea `PlayerController`, se carga la partida y arranca el `GameLoop`.

### 2.4 Flujo por frame

```
GameLoop
 └─ GameEngine.update(dt)
     ├─ ciclo día/noche → setTimeOfDay()
     └─ updateWorldLogic(dt)
         ├─ input → velocidad, colisiones → PlayerController.updatePosition()
         ├─ cámara (damp/orbit)
         ├─ world.updateWorld(dt, px, pz)
         │    ├─ chunkManager.update(px, pz)   (hasta 1–2 chunks nuevos/frame)
         │    ├─ animaciones (POIs, recursos, partículas, hojas, enemigos)
         │    └─ culling de árboles por distancia
         └─ recogida de SoulDolls
GameEngine.render() → composer.render() o renderer.render()
```

---

## 3. Inventario de sistemas

| Sistema | Archivo(s) | Estado | Notas |
|---|---|---|---|
| Relieve analítico | `proceduralTerrain.ts:253` | Funcional | FBM + ridged + valle del lago + río + costa + terrazas + POIs |
| Biomas | `proceduralTerrain.ts:367` | Funcional (hardcodeado) | `meadow/forest/mountain/snow/swamp/spectral/coast/river/village/lake` por umbrales if/else |
| Color del terreno | `proceduralTerrain.ts:442` | Funcional | Color por vértice (`BufferAttribute color`) según bioma/altura/pendiente |
| Río | `proceduralTerrain.ts:170-234,532` | Parcial | Spline CatmullRom fijo + tallado + malla de agua; sin edición |
| Lago | `proceduralTerrain.ts:285-291`, `worldGen.ts:225-242` | Parcial | Depresión + círculo de agua fijo |
| Costa/océano | `proceduralTerrain.ts:346-356`, `chunkManager.ts:152-167` | Funcional | Plano de océano que sigue al jugador |
| Chunks de terreno | `chunkManager.ts:235-282,287-463` | Funcional | 64 m, 14–24 segmentos, 1–2 chunks/frame, descarga por radio |
| Formaciones por chunk | `chunkManager.ts:344-452` | Funcional | Rocas, agujas de hielo, esquirlas espectrales (InstancedMesh) |
| Colisiones | `chunkManager.ts:481-498`, `engine.ts:760-814` | Funcional | Círculos de formaciones + árboles + cajas + agua + pendiente |
| Carreteras | `worldGen.ts:299-515` | Parcial | 6 polilíneas fijas, cintas CatmullRom sobre el terreno, sin máscaras |
| Aldea y edificios | `worldGen.ts:855-1660`, `buildingGen.ts` | Funcional | Geometría 3D, materiales procedurales, props |
| POIs manuales | `proceduralTerrain.ts:35-42`, `caveGen.ts`, `manualLocations.ts` | Funcional | Zonas protegidas y aplanadas |
| Árboles | `worldGen.ts:1808-1892` | Parcial | 300 billboards, rechazo por distancia, chunks fijos 100 m, sin descarga |
| Hierba | `worldGen.ts:624-725` | Parcial | `InstancedMesh` + shader de viento; sin LOD |
| Arbustos/hojas/partículas | `worldGen.ts:1729-1792,1894-1959` | Funcional | Sprites individuales en su mayoría |
| Materiales/texturas | `textures.ts`, `buildingGen.ts` | Funcional | Canvas pixel-art, `NearestFilter` |
| Billboard shader | `instancing.ts:45-219` | Funcional | Instancing, viento, oclusión con dither Bayer |
| Persistencia | `save/saveManager.ts` | Parcial | Solo estado de partida; **no** guarda mundo/terreno |
| Minimapa | `components/Minimap.tsx`, `data/regions.ts` | Funcional | 2D por regiones, no usa el terreno procedural |
| Editor | — | Ausente | No hay herramientas de edición |
| WorkZone | — | Ausente | Sin región de trabajo |
| Stamps | — | Ausente | Sin estampas de relieve |

---

## 4. Funcionalidades existentes (detalle)

### 4.1 Terreno
- `getProceduralTerrainHeight(x,z)` es la **única fuente de verdad** de altura. Todo (geometría, jugador, props, agua, colisiones) consulta esa función.
- Composición actual: FBM macro + montículos + micro; cadena montañosa ridged al este; depresión del lago Esmeralda; tallado del río; terrazas de Villa Marioneta; aplanado de POIs; caída al océano.
- Determinismo: semillas de ruido **fijas en código** (`luminati-chronicles-v1`, `luminati-biomes-v1`). `buildWorld` recibe `seed`, pero el terreno no lo usa.
- No hay `Float32Array` de alturas ni heightmap almacenado: todo se recalcula por muestra.

### 4.2 Chunks
- Tamaño fijo 64 m, centrado en el jugador, radio de carga 3 (desktop) / 2 (móvil), descarga con +1.
- Geometría `PlaneGeometry` deformada; UV en espacio-mundo (1 tile = 8 m); normales analíticas por diferencias centrales; color por vértice.
- Las formaciones se generan con `seedrandom(seed + "_chunk_cx_cz")` — bien derivado por chunk.
- El océano se recentra en el jugador; el resto de props no está chunkizado.

### 4.3 Biomas
- `sampleBiomeAt` calcula elevación, pendiente, humedad, temperatura y distancia al río, y clasifica con una cadena de `if/else` por umbrales.
- Se usa para: color del terreno, densidad de árboles, tipo de formaciones, colisiones de acantilado y encuentros (`data/regions.ts:675`).
- **No existe definición de bioma como dato**, ni prioridad, ni máscara, ni material por bioma.

### 4.4 Scatter
Tres sistemas separados y desconectados:
1. `ChunkManager.buildChunk`: rocas/hielo/esquirlas por chunk.
2. `worldGen` bucle de árboles: 300 intentos con rechazo por distancia y POIs.
3. `worldGen` hierba/arbustos: parches con `InstancedMesh` / sprites.
No comparten base de datos, reglas ni máscaras de exclusión.

### 4.5 Carreteras, río y lago
- Las carreteras son 6 polilíneas fijas + `CatmullRomCurve3`; se genera una cinta que sigue la altura del terreno y se coloca a `+0.055`.
- El río tiene un spline fijo con tallado y una malla de agua a `RIVER_WATER_LEVEL = 1.6`.
- El lago es un círculo de agua a la altura calculada en su centro + depresión circular.
- `isNearAnyRoad` se usa como exclusión de árboles/rocas; no existe máscara de bioma ni exclusión de scatter formal.

### 4.6 Integración con el juego
- El jugador sigue la altura con lerp (`playerController.ts:95-102`).
- Las colisiones consultan altura, río, lago, árboles, cajas y `ChunkManager`.
- Cámara, combate, HUD, minimapa y guardado no dependen de la representación interna del terreno, solo de la API `getTerrainHeight`.

---

## 5. Funcionalidades faltantes respecto a Calysto World 5.8

1. **Terrain Stamps** independientes y combinables (montaña, colina, valle, cresta, meseta, cráter, acantilado, llanura, depresión).
2. **Heightmap como dato** (`Float32Array`) cacheado y regenerable por región.
3. **WorkZone** con generación/borrado/regeneración local.
4. **Biome Database** editable y serializable, separada del render.
5. **Priority Resolver** de biomas anidados/superpuestos (no `if/else` de coordenadas).
6. **Biome Masks** (zonas cerradas y splines abiertos con ancho y falloff).
7. **Open Spline Biomes** para caminos, ríos, bordes y corredores.
8. **Material masking** por bioma reutilizando atlas/materiales existentes.
9. **Scatter Database + reglas** (altura, pendiente, normal, bioma, exclusión, distancia mínima, ruido, clustering).
10. **Cluster scatter** y parches naturales; hoy la distribución es uniforme por rechazo.
11. **Exclusion tags** (`NoVegetation`, `NoDetails`, `NoBiome`, `NoScatter`, `NoCollision`) provenientes de zonas, splines, caminos, ríos, lagos y edificios.
12. **Runtime details** separados de la vegetación principal, actualizables por sí solos.
13. **Spline World System** común para caminos/ríos/lagos, con edición no destructiva.
14. **World Editor** y WorkZone visual.
15. **World Database** versionada, export/import JSON, migraciones.
16. **Determinismo por sistema/chunk/grupo/elemento** (semillas derivadas); hoy `worldGen` usa un RNG secuencial global y el terreno usa semillas fijas.
17. **Sistema de mapas independientes** (el brief lo pide; hoy el juego es un mundo continuo).
18. **Tests automatizados** (no hay Vitest; `src/core/tests.ts` es runtime).

---

## 6. Matriz Calysto vs. estado actual

| Calysto | Estado SoulDolls | Acción propuesta |
|---|---|---|
| Heightmap Stamps | Parcial: relieve analítico + aplanados manuales, sin estampas | Crear capa de stamps sobre la base analítica |
| Biome Database | Parcial: enum + `if/else` + colores hardcodeados | Crear base de datos serializable |
| Biome Priority | Ausente | Crear `BiomePriorityResolver` |
| Open Spline Biomes | Ausente (hay splines de caminos/río, sin bioma asociado) | Crear `BiomeSpline` |
| Biome Masks | Ausente (solo `isInsideProtectedZone`) | Crear `BiomeMask` + exclusiones |
| Runtime Details | Parcial: hierba/arbustos/partículas ya existen | Extender y separar de vegetación principal |
| Scatter Rules | Parcial: reglas dispersas y duplicadas | Unificar en `ScatterDatabase`/`ScatterRules` |
| Road System | Parcial: 6 splines fijos, cinta sobre terreno | Extender: anchura variable, máscaras, no destructivo |
| River System | Parcial: spline fijo, tallado y malla de agua | Extender a sistema de splines editable |
| Lake System | Parcial: depresión + círculo fijo | Extender a `LakeGenerator` |
| WorkZone | Ausente | Crear |
| Chunk Generation | Existente: `ChunkManager` 64 m con streaming | Reutilizar y extender con invalidación/regeneración |

---

## 7. Problemas de rendimiento

### 7.1 Coste de evaluación del terreno (crítico)

Cada vértice de chunk hace, como mínimo:

- `getProceduralTerrainHeight` (1)
- 4 alturas extra para la normal analítica
- `getTerrainVertexColor` → `sampleBiomeAt` → 1 altura + 4 alturas de pendiente
- `getDistanceToRiver` se ejecuta dentro de `getProceduralTerrainHeight` y otra vez en `sampleBiomeAt`, recorriendo **120 muestras** cada vez.

Estimación: ~10–12 evaluaciones de altura y ~2–3 recorridos de 120 segmentos por vértice.

- Desktop: 49 chunks × 625 vértices ≈ **30 600 vértices** iniciales.
- Móvil: 25 chunks × 361 vértices ≈ **9 025 vértices**.
- Coste aproximado inicial: cientos de miles a millones de operaciones trigonométricas + millones de comparaciones del río. Es la causa más probable de hitches al cargar y al cruzar chunks.
- `buildChunk` es **síncrono**; el límite de 1–2 chunks/frame solo reparte el coste, no lo reduce.
- Al ser analítico, no hay caché de altura reutilizable entre geometría, colisiones, props y jugador.

### 7.2 Draw calls y objetos
- Terreno: hasta 49 `Mesh` de chunk (un draw call cada uno) en desktop.
- Formaciones: hasta 3 `InstancedMesh` por chunk → hasta ~147 objetos; muchos quedarán vacíos, pero se crean por chunk.
- Árboles: 4×4 chunks × hasta 3 variantes = hasta 48 `InstancedMesh`; no se descargan, solo se ocultan.
- Arbustos, lámparas, halos, cofres, NPCs, enemigos, partículas y muchos props son `Sprite` individuales → decenas/cientos de draw calls.
- No hay fusión de materiales ni atlas único para props/sprite; cada textura puede implicar un material.

### 7.3 Memoria y ciclo de vida
- `ChunkManager.unloadChunk` libera geometría e `InstancedMesh`, pero **no** libera texturas/materiales compartidos (correcto) ni props globales.
- Los árboles, hierba, arbustos y partículas se crean una vez y permanecen en escena para siempre.
- `loadMap`/`destroy` no existe como en el brief: el mundo se construye una sola vez.

### 7.4 Oportunidades claras
- Cachear alturas en `Float32Array` por chunk (o heightmap global por región) y consultar por muestreo.
- Derivar normales y colores del heightmap cacheado en vez de recalcular.
- Mover `buildChunk` pesado a Web Worker o a generación incremental con presupuesto de ms.
- Unificar scatter y usar `InstancedMesh` por bioma/grupo.
- Reemplazar el bucle O(120) del río por una estructura espacial (rejilla/segmentos indexados) si se consulta con frecuencia.
- Añadir LOD/descarga a árboles y detalles.

---

## 8. Riesgos de integración

| Riesgo | Impacto | Mitigación propuesta |
|---|---|---|
| `getProceduralTerrainHeight` es API global usada por jugador, cámara, props, agua y colisiones | Alto | Mantener la firma pública y envolverla con un `TerrainHeightSampler` cacheado; migración progresiva |
| Añadir stamps cambia alturas y deja props/agua/carreteras desalineados | Alto | Invalidación por región + reconstrucción de chunks y re-anclaje de props; agua y splines recalculados |
| Los POIs manuales y la aldea dependen de aplanados hardcodeados | Alto | Modelarlos como `TerrainStamp`/zonas protegidas de alta prioridad desde el inicio |
| El RNG secuencial de `worldGen` acopla el orden de generación | Medio-Alto | Semillas derivadas por sistema/chunk/grupo/elemento (`hash(seed, sistema, chunk, índice)`) |
| Río, lago y carreteras se generan una sola vez y no se actualizan | Alto | Convertir a datos de spline + reconstrucción por invalidación |
| El proyecto es un mundo continuo sin `maps` ni portales | Medio | La etapa 08 debe introducir `WorldDefinition` por mapa sin convertir el juego en infinito |
| Faltan `lint`, `build` y tests por dependencias rotas | Alto | Reparar instalación (sin degradar versiones) antes de la etapa 08; añadir Vitest |
| No hay Git con commits | Medio | Crear un commit base antes de cambios grandes (autorización del usuario) |
| El terreno actual no tiene heightmap persistible | Medio | Introducir `TerrainData` con `Float32Array` y serialización controlada |
| La dirección artística pixel-art debe preservarse | Medio | Reutilizar `textures.ts`, `NearestFilter`, paletas y billboards existentes |

---

## 9. Plan de evolución incremental propuesto

> No se implementa nada en esta etapa. Este plan ordena las etapas 02–08 adaptadas a `src/world/`.

### Fase 0 — Preparación (previa a la etapa 02/08)
- Reparar dependencias para `lint`/`build`/tests (sin cambiar versiones).
- Añadir Vitest y scripts `test`.
- Crear commit base (con autorización).
- Documentar el contrato actual de `getTerrainHeight`.

### Fase 1 — Fundaciones (etapa 02)
- `src/world/core/`: `WorldDefinition`, `WorldDatabase`, `WorldSeed`, `WorkZone`, `WorldGenerationPipeline`, `WorldEvents`.
- `src/world/terrain/TerrainData`: heightmap `Float32Array` + sampler cacheado.
- Envolver la base analítica actual **sin cambiar el aspecto**: `AnalyticBaseHeightSource`.
- Semillas derivadas por sistema/chunk/grupo.
- Tests de determinismo y de igualdad con la implementación actual.

### Fase 2 — Terrain Stamps (etapa 03)
- `TerrainStamp`, `TerrainStampBlender`, tipos y falloff.
- Composición aditiva / máximo / reemplazo controlado.
- WorkZone y regeneración local.
- Invalidación de chunks y colisiones; el resto del juego sigue usando `getTerrainHeight`.
- Validación visual con ≥3 estampas distintas.

### Fase 3 — Biome Engine (etapa 04)
- `BiomeDefinition`/`BiomeDatabase` con los biomas actuales migrados.
- `BiomePriorityResolver`, `BiomeMask`, `BiomeSpline`.
- Materiales por máscara reutilizando el material de terreno y vertex colors.
- Compatibilidad con `sampleBiomeAt` (adaptador temporal).

### Fase 4 — Scatter (etapa 05)
- `ScatterDatabase`, reglas y clustering.
- Refactor de árboles/rocas/hierba/arbustos a un pipeline común.
- Exclusiones desde caminos, ríos, lagos, POIs y edificios.
- Runtime details separados; LOD/culling/descarga.

### Fase 5 — Splines (etapa 06)
- `WorldSpline` común; migrar las 6 carreteras y el río.
- `RoadGenerator`, `RiverGenerator`, `LakeGenerator` no destructivos.
- Reconstrucción por invalidación y máscaras `NoVegetation`.

### Fase 6 — Editor (etapa 07)
- `WorldEditor` + herramientas sobre datos reales, undo/redo por comandos.
- UI de desarrollo activable, sin tocar HUD/jugador cuando está apagada.

### Fase 7 — Producción (etapa 08)
- `WorldDatabase` versionada, export/import JSON, migraciones.
- Chunks internos por mapa, LOD y presupuesto móvil.
- QA con lint/build/tests, medición de draw calls, triángulos, memoria y tiempos.
- Documentación final y actualización de la skill de arte (si se crea en este repo).

---

## 10. Decisiones pendientes (requieren autorización)

1. **Repositorio:** este proyecto no tiene Git propio ni commits. ¿Se inicializa/commitea aquí antes de empezar?
2. **Ubicación del motor:** se propone `src/world/` (no `src/engine/world/`), para no duplicar el árbol existente.
3. **Mapas:** el brief de la etapa 08 pide mapas independientes; hoy el juego es un mundo continuo. ¿Se mantiene el mundo continuo y se añade `WorldDefinition` por "mapa/zona", o se migra a mapas separados?
4. **Alcance del editor:** ¿herramienta de desarrollo embebida (tecla de debug) o panel separado dentro de la app?
5. **Calidad base:** ¿se autoriza reparar `node_modules`/instalación y añadir Vitest como parte de la preparación?

---

## 11. Conclusión

El proyecto ya posee una base sólida y reutilizable: relieve analítico determinista, streaming de chunks, biomas funcionales, colisiones, carreteras/río/lago y una estética pixel-art coherente. No hay que reescribir el motor.

La evolución debe **envolver** la fuente de altura actual con una capa de datos (heightmap cacheado + stamps), separar biomas y scatter en bases de datos, y convertir caminos/río/lago en splines editables con invalidación por región. Los mayores riesgos son el coste de evaluación del terreno, la dependencia global de `getTerrainHeight` y la ausencia de un sistema de mapas/persistencia del mundo.

**No se modificó ningún archivo de código en esta etapa.**
