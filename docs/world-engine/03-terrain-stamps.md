# 03 — Terrain Stamps (implementación)

**Proyecto:** `procedural-map-souldolls-rpgv1`
**Estado:** implementada y aprobada. **Pendiente de revisión/aprobación del usuario.**
**Base:** `02-world-engine-architecture.md`

---

## 1. Objetivo de la etapa

Introducir estampas de terreno deterministas sin reescribir la base analítica ni romper el juego:

- La altura sigue teniendo una única fuente de verdad.
- Sin estampas, el terreno es idéntico al motor anterior.
- Con estampas, terreno, jugador, colisiones, props y vegetación consultan la misma altura.
- La regeneración es determinista y cacheada por región.

## 2. Resultado

Se añadió una capa de estampas compuesta sobre `getProceduralTerrainHeight`:

```text
getProceduralTerrainHeight(x,z)     base analítica existente
        +
StampedTerrainSampler               composición de estampas + caché de offsets
        =
getTerrainHeight(x,z)               nueva fuente única
```

La caché almacena **offsets de altura** (altura final − base analítica) por baldosa de 64 m a 2 m de resolución. Así, fuera del área de una estampa el offset es exactamente 0 y la base analítica no se suaviza.

## 3. Archivos creados

```text
src/world/core/
├─ WorldTypes.ts          Vec2, Vec3, Bounds2, HeightAtFn, helpers
├─ WorldSeed.ts           Hash estable, semillas derivadas, PRNG
├─ WorldEvents.ts         WorldLayer, invalidación, bus de eventos
└─ WorkZone.ts            WorkZone, bounds, contains/intersects/clamp

src/world/terrain/
├─ TerrainData.ts         TerrainData, TerrainSampler, muestreo bilineal
├─ TerrainHeightmap.ts    Heightmap reutilizable + muestreo bilineal
├─ TerrainStamp.ts        Contrato de estampa, presets, bounds
├─ TerrainStampBlender.ts Composición determinista + caché de offsets
└─ terrainStamps.data.ts  3 estampas de prueba visibles
```

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/world/worldGen.ts` | Crea el sampler activo, conserva `getTerrainHeight`, inyecta el sampler en `ChunkManager` |
| `src/world/chunkManager.ts` | Terreno y normales usan el sampler; bioma/color reciben la altura estampada |
| `src/world/proceduralTerrain.ts` | `sampleBiomeAt` y `getTerrainVertexColor` aceptan `heightAt` opcional |
| `src/game/engine.ts` | El chequeo de pendiente usa la altura estampada |
| `src/core/tests.ts` | 5 pruebas de runtime para sampler, determinismo, semillas y WorkZone |
| `AGENTS.md` | Estado y arquitectura actualizados |

## 5. Estampas incluidas

| ID | Tipo | Posición | Escala | Amplitud | Blend |
|---|---|---|---|---|---|
| `demo-east-hill` | colina | (66, −6) | 15 × 15 | 4.2 m | add |
| `demo-east-ridge` | cresta | (80, −22) | 22 × 8, rot. −0.55 | 7.5 m | max |
| `demo-east-crater` | cráter | (64, −40) | 12 × 12 | 5.5 m | add |

Están al este/sureste de Villa Marioneta, fuera de zonas protegidas, del río, del lago y de las carreteras. Se ven al explorar el borde oriental del valle.

## 6. Contrato de composición

- Orden estable por `(priority, id)`.
- `add`: suma desplazamiento con peso de falloff.
- `max`: eleva hacia el objetivo de la estampa.
- `min`: excava hacia el objetivo de la estampa.
- `replace`: interpola hacia el objetivo (permite llanuras y mesetas).
- Falloffs: `none`, `linear`, `smoothstep`, `cosine`, `gaussian`.
- Presets: `mountain`, `hill`, `valley`, `ridge`, `plateau`, `crater`, `cliff`, `plain`, `depression`.
- Fuentes: preset procedural, height field embebido y asset registrado por `assetId`.
- Rotación, escala XZ, amplitud, intensidad, prioridad, enabled y tags.

## 7. Determinismo

- Semillas por hash FNV-1a + mezcla de 32 bits; PRNG `mulberry32`.
- Ruido de estampa por hash espacial determinista.
- Sin `Math.random` en el camino de generación de estampas.
- La caché no altera resultados; solo evita recomputar.
- Dos instancias con las mismas estampas producen la misma altura.

## 8. Rendimiento

- Base analítica intacta; las estampas solo añaden offsets.
- Caché de offsets por baldosa de 64 m y celda de 2 m. La arquitectura proponía 1 m; se empieza en 2 m y se evaluará 1 m si el detalle visual lo requiere.
- Máximo 256 baldosas (~1.1 MB de `Float32Array`).
- Evicción FIFO simple.
- `bounds` por estampa para descartar consultas lejanas.
- Sin asignaciones por consulta dentro de la composición.
- `chunkManager` sigue generando como máximo 1–2 chunks por frame.

## 9. Integración con el juego

- `getTerrainHeight(x, z)` conserva su firma y ahora delega en el sampler activo.
- `PlayerController` no cambió: sigue usando `getTerrainHeight`.
- Colisiones, props, árboles, NPCs, cofres, enemigos y actualizaciones usan `getTerrainHeight`.
- `ChunkManager` recibe el sampler por inyección; si no se pasa, usa la base analítica.
- `sampleBiomeAt` acepta un `heightAt` opcional para que el color y la clasificación reflejen el terreno estampado.
- El chequeo de pendiente del motor usa la altura estampada.
- La bioma base sigue siendo la clasificación legacy; la migración a `BiomeDefinition` corresponde a la etapa 04.

## 10. Verificación ejecutada

### Runtime (Bun, sin navegador)

```text
PASS no-stamp parity
PASS hill displaces center
PASS ridge displaces crest
PASS crater lowers center
PASS far terrain untouched
PASS cache populated
PASS stamp count
PASS sample finite
PASS normal normalized
PASS deterministic
PASS seed stable
PASS seed scoped
PASS zone contains
PASS zone intersects
PASS zone clamp
failures 0
```

### TypeScript

```bash
bun run lint
```

Resultado: **0 errores** tras instalar `@typescript/typescript-win32-x64@7.0.2`. También funciona `bunx -p typescript@5.9.3 tsc --noEmit` como alternativa.

### Bundling

```bash
bun build src/world/worldGen.ts --target=browser
bun build src/game/engine.ts --target=browser
```

Resultado: ambos bundles se generan correctamente (18 y 35 módulos).

### Scripts del proyecto

- `bun run lint`: pasa.
- `bun run build`: pasa (bundle ~1.2 MB; aviso de tamaño, no error).
- `bun run dev`: arranca en `http://localhost:3000`.
- `npm ci --dry-run`: pasa con el `package-lock.json` regenerado.
- `bun run test`: no existe.
- La validación visual en navegador queda pendiente: la app falla al cargar `/assets/souldolls/09.webp` porque varios sprites de SoulDolls están a 0 bytes. No se sustituyeron para no inventar arte.

## 11. Pendientes

- Reparar `public/assets/souldolls/17.webp` (0 bytes); los assets `08.webp`–`12.webp` ya fueron restaurados por el usuario.
- Revisión visual en navegador de las 3 estampas (bloqueada por los assets).
- Confirmar que las posiciones de las estampas demo son las deseadas para el mapa.
- Migrar biomas al sistema de datos en la etapa 04.
- Sustituir las estampas demo por datos de `WorldDefinition` en la etapa 08.
- Añadir Vitest antes de producción.
- El editor de estampas corresponde a la etapa 07.

## 12. Criterios de aceptación

- [x] Base analítica intacta.
- [x] Sin estampas, altura idéntica a la base (verificado a 1e-9).
- [x] Estampas deterministas.
- [x] Terreno, jugador y colisiones consultan la misma altura.
- [x] Caché por región con evicción.
- [ ] Al menos 3 estampas visibles en el juego (datos y desplazamiento verificados; falta validación visual).
- [x] Typecheck y bundling correctos.
- [ ] Aprobación del usuario para continuar con la etapa 04.
