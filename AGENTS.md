# AGENTS.md — SoulDolls / Procedural Map

## Proyecto

RPG 3D en React + TypeScript + Three.js con mundo procedural continuo, estética pixel-art, generación por chunks y soporte móvil. Este es el único proyecto autorizado para el World Engine.

**No tocar** `../Argentum-tales` ni ningún proyecto fuera de este directorio.

## Comandos

```bash
bun run dev       # servidor de desarrollo
bun run lint      # tsc --noEmit
bun run build     # build de producción
bun run preview   # preview del build
```

No existe script `test`. `src/core/tests.ts` es un runner de aserciones en runtime, no una suite automatizada.

### Estado de dependencias (reparado)

- `bun run lint`, `bun run build` y `bun run dev` funcionan en Windows x64.
- Se instalaron los binarios nativos que faltaban: `@typescript/typescript-win32-x64@7.0.2`, `@rolldown/binding-win32-x64-msvc@1.2.16`, `lightningcss-win32-x64-msvc@1.33.0` y `@tailwindcss/oxide-win32-x64-msvc@4.3.5`.
- `package-lock.json` fue regenerado para incluir las dependencias opcionales de todas las plataformas; `npm ci --dry-run` pasa y las versiones resueltas se mantuvieron.
- No se degradó ninguna versión de `package.json`.
- Bundling de verificación: `bun build src/world/worldGen.ts --target=browser` y `bun build src/game/engine.ts --target=browser`.
- **Problema conocido:** `public/assets/souldolls/17.webp` (ECHO `#007`) sigue a 0 bytes. Los assets `08.webp`–`12.webp` ya fueron restaurados por el usuario; el arranque con los starters `01/03/09` ya no queda bloqueado. No se modificó `17.webp` porque falta el arte original.

## Arquitectura actual

```text
src/App.tsx
└─ src/game/engine.ts            # Renderer, cámara, loop, colisiones
   ├─ src/world/worldGen.ts      # Fachada buildWorld / updateWorld / getTerrainHeight
   │  ├─ src/world/proceduralTerrain.ts  # Altura analítica, biomas, río, lago
   │  ├─ src/world/chunkManager.ts       # Chunks, formaciones, colisiones
   │  ├─ src/world/buildingGen.ts        # Aldea / edificios
   │  ├─ src/world/caveGen.ts            # Cuevas
   │  └─ src/world/manualLocations.ts    # POIs
   ├─ src/world/playerController.ts
   ├─ src/world/textures.ts      # Texturas canvas pixel-art
   └─ src/world/instancing.ts    # Billboard + instancing
```

World Engine en construcción:

```text
src/world/core/       WorldTypes, WorldSeed, WorldEvents, WorkZone
src/world/terrain/    TerrainData, TerrainHeightmap, TerrainStamp,
                      TerrainStampBlender, terrainStamps.data
src/world/biomes/     BiomeDefinition, BiomeDatabase, BiomeMask,
                      BiomeSpline, BiomePriorityResolver, BiomePainter,
                      BiomeGenerator, biomes.data
```

`worldGen` crea un `StampedTerrainSampler` activo y `getTerrainHeight` delega en él. `ChunkManager` recibe el sampler por inyección. La base analítica `getProceduralTerrainHeight` sigue siendo la fuente base. Los biomas se resuelven por base de datos, prioridad, máscaras y splines abiertos; `sampleBiomeAt` es el adaptador público.

Otros: `src/data/regions.ts`, `src/data/constants.ts`, `src/save/saveManager.ts`, `src/core/tests.ts`, `src/types.ts`.

## Invariantes del World Engine

1. `getTerrainHeight(x, z)` conserva firma; es el contrato público de altura.
2. `worldGen.buildWorld` se conserva como fachada durante la migración.
3. La base analítica existente no se reescribe; se conserva como altura base.
4. Datos persistibles = JSON plano; nunca `THREE.*`, funciones ni clases.
5. Una sola fuente de verdad de altura para terreno, jugador, colisiones, agua, props y NPCs.
6. Generación determinista por semillas derivadas; el mundo lógico no usa `Math.random`.
7. Invalidación por capa y región; no regenerar el mundo entero por una edición.
8. Reutilizar texturas, materiales, instancing, edificios, cuevas y POIs existentes.
9. No añadir motores 3D ni dependencias sin aprobación.
10. No modificar combate, movimiento, cámara, personajes, inventario, NPCs, quests ni HUD.
11. No dejar TODO, mocks, stubs ni botones decorativos.
12. Documentar cada etapa y esperar autorización antes de la siguiente.

## Documentación del World Engine

- `docs/world-engine/01-current-engine-audit.md` — auditoría del motor real (etapa 01, completada).
- `docs/world-engine/02-world-engine-architecture.md` — arquitectura, contratos, dependencias, rendimiento y plan 03–08 (etapa 02, aprobada).
- `docs/world-engine/03-terrain-stamps.md` — implementación de estampas, caché, integración y verificación (etapa 03, aprobada).
- `docs/world-engine/04-biomes.md` — base de datos, prioridades, máscaras, splines abiertos, painter e integración (etapa 04, **pendiente de revisión**).

La estructura objetivo vive en `src/world/core|terrain|biomes|scatter|splines|editor`. `core/`, `terrain/` y `biomes/` ya existen; `scatter/`, `splines/` y `editor/` aún no.

## Estado de etapas

| Etapa | Estado |
|---|---|
| 01 Auditoría | Completada |
| 02 Arquitectura | Completada y aprobada |
| 03 Terrain Stamps | Completada y aprobada |
| 04 Biomas | Completada, pendiente de revisión |
| 05 Scatter | No iniciada |
| 06 Splines | No iniciada |
| 07 Editor | No iniciada |
| 08 Producción | No iniciada |

## Decisiones pendientes

- Revisar/aprobar la etapa 04 antes de iniciar la 05.
- Confirmar posiciones finales de las estampas demo del este.
- Confirmar `src/world/` como ubicación del motor.
- Confirmar mundo continuo con `WorldDefinition` por zona/mapa.
- Resolución actual de la caché de offsets: 2 m por celda, baldosa 64 m. Evaluar 1 m.
- Restaurar `17.webp` y añadir Vitest antes de la etapa 08.
- Crear commit base antes de la etapa 03 (el repo padre no tiene commits).
- La skill de arte no existe en este proyecto; no se toca la de Argentum Tales. Se propone crear una skill local equivalente con aprobación.

## Instrucciones para el siguiente agente

- Leer `docs/world-engine/01-current-engine-audit.md`, `02-world-engine-architecture.md`, `03-terrain-stamps.md` y `04-biomes.md` antes de tocar código.
- No iniciar la etapa 05 sin autorización explícita del usuario.
- Al implementar, preservar el juego jugable en cada paso y reportar archivos creados/modificados, funcionalidad, lint/build/tests y pendientes.
