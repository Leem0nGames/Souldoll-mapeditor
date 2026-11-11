# 04 — Biomas (implementación)

**Proyecto:** `procedural-map-souldolls-rpgv1`
**Estado:** implementada. **Pendiente de revisión/aprobación del usuario.**
**Base:** `02-world-engine-architecture.md`, `03-terrain-stamps.md`

---

## 1. Objetivo de la etapa

Migrar la clasificación de biomas desde una cadena de `if/else` en `proceduralTerrain.ts` a una base de datos editable, con resolución por prioridad, máscaras, splines abiertos y pintado por vertex colors, sin romper el juego ni cambiar los biomas existentes fuera de zonas editadas.

## 2. Resultado

```text
proceduralTerrain.sampleBiomeAt(x, z, heightAt)
        │
        ├─ calcula entorno: elevación, pendiente, humedad,
        │  temperatura, río, lago, radio, puente
        │
        ├─ BiomeGenerator
        │     ├─ BiomeDatabase         10 biomas migrados
        │     ├─ BiomePriorityResolver prioridad + pesos
        │     ├─ BiomeMask             círculo / rect / polígono / spline
        │     └─ BiomeSplineDatabase   corredores abiertos
        │
        └─ devuelve el bioma dominante (compatibilidad)
```

`sampleBiomeAt` conserva su firma y su resultado (`biome`, `elevation`, `slope`, `moisture`, `temperature`, `riverDistance`) y añade `secondaryBiome` y `blend`. El resto del juego sigue consumiendo el adaptador sin cambios de contrato.

`getTerrainVertexColor` delega el color en `BiomePainter`, que reutiliza los colores y variaciones del motor anterior a través de `BiomeDefinition`.

## 3. Archivos creados

```text
src/world/biomes/
├─ BiomeDefinition.ts        Tipos, condiciones, entorno y contrato de resolución
├─ BiomeDatabase.ts          Registro, búsqueda e índices de biomas
├─ BiomeMask.ts              Formas, falloff, strength y modos add/subtract/override
├─ BiomeSpline.ts            Paths abiertos, splines y distancia a polilínea
├─ BiomePriorityResolver.ts  Resolución por prioridad, pesos y solapamientos
├─ BiomePainter.ts           Vertex colors compatibles con el motor anterior
├─ BiomeGenerator.ts         Fachada de base de datos + resolver
└─ biomes.data.ts            Los 10 biomas actuales como datos
```

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/world/proceduralTerrain.ts` | `sampleBiomeAt` delega en `BiomeGenerator`; `getTerrainVertexColor` delega en `BiomePainter`; generador activo con set/reset; constantes de lago/costa/aldea |
| `src/world/worldGen.ts` | La densidad de árboles consulta el bioma con la altura estampada |
| `src/data/regions.ts` | `getEncounterTypesForPosition` acepta `heightAt` opcional y mantiene los pools actuales |
| `src/game/engine.ts` | Los encuentros usan `getTerrainHeight` |
| `src/core/tests.ts` | 6 pruebas nuevas de biomas |
| `AGENTS.md` | Etapas, arquitectura y pendientes actualizados |

## 5. Biomas migrados

| ID | Prioridad | Regla base | Color base |
|---|---:|---|---|
| `village` | 1000 | radio 46 m alrededor de Villa Marioneta | `0xE0DBCC` |
| `lake` | 900 | radio 26 m alrededor del Lago Esmeralda | `0x94D673` |
| `river` | 800 | distancia al río, cota y no puente | `0x8C856B` |
| `coast` | 700 | radio > 176 m y cota baja | `0xE0D19E` |
| `snow` | 600 | cota alta o frío al norte | `0xE0EBF5` |
| `mountain` | 500 | cota alta o pendiente fuerte al este | `0x8F9E80` |
| `swamp` | 400 | cota baja, humedad alta y región suroeste | `0x4D6638` |
| `spectral` | 300 | corredor espectral del sureste | `0x6B4D85` |
| `forest` | 200 | región noroeste | `0x428047` |
| `meadow` | 100 | respaldo de pradera | `0x94D673` |

La resolución base elige el bioma habilitado de mayor prioridad que cumple su regla; en empate gana el `id` ascendente. Esto reproduce la cadena anterior y evita que el respaldo `meadow` aparezca como bioma secundario artificial.

`BiomeId` es `string` para permitir biomas nuevos desde datos. `LegacyBiomeId` documenta los diez identificadores heredados y se usa como referencia de compatibilidad, no como límite del registro.

## 6. Máscaras y splines

- Formas: `circle`, `rect`, `polygon` y `spline`.
- Modos: `add` suma peso, `subtract` resta peso y `override` reemplaza peso y prioridad.
- `falloff` 0 produce borde duro; 1 difumina desde el centro hasta el borde.
- `strength` multiplica la influencia y se limita a `[0,1]`.
- `priority` decide el bioma dominante; las máscaras pueden elevar una definición por encima de las reglas base.
- Los splines abiertos usan una polilínea con ancho, falloff y strength; no requieren el sistema completo de splines de la etapa 06.
- No hay máscaras ni splines activos por defecto: el mundo actual queda idéntico. La API queda lista para el editor y los tests.

## 7. Integración con el juego

- `sampleBiomeAt` sigue siendo el adaptador público.
- `ChunkManager` pasa su `heightAt` estampado al bioma y al painter.
- La colocación de árboles de `worldGen` usa `getTerrainHeight`.
- Los encuentros de `regions.ts` aceptan la altura estampada y conservan exactamente los pools por bioma.
- `getActiveBiomeGenerator`, `setActiveBiomeGenerator` y `resetActiveBiomeGenerator` permiten sustituir la base de datos sin tocar el render.

## 8. Pruebas añadidas

`src/core/tests.ts` incorpora:

1. La base de datos contiene los 10 biomas heredados.
2. Prioridad y desempate estable por `id`.
3. Máscaras `add`, `subtract` y `override`.
4. Falloff más fuerte en el centro que en el borde.
5. Splines abiertos influyen solo cerca del trazado.
6. Determinismo y compatibilidad de fronteras heredadas.

Las pruebas existentes de encuentros, alturas, estampas, semillas y WorkZone siguen pasando.

## 9. Verificación ejecutada

```text
bunx tsc --noEmit --pretty false     EXIT=0
bun run build                        EXIT=0 (aviso de tamaño de chunk, no error)
bun build src/world/worldGen.ts      EXIT=0
bun build src/game/engine.ts         EXIT=0
runtime runner                       18/18 PASS
bun run dev + HTTP                    / 200; 09.webp 200 (538 994 B)
```

El servidor de desarrollo se detuvo después de la comprobación. `17.webp` (ECHO `#007`) responde `200` con `0` bytes, confirmando que el archivo sigue vacío.

Puntos de compatibilidad comprobados:

| Punto | Bioma heredado | Bioma nuevo |
|---|---|---|
| `(0, 0)` | `village` | `village` |
| `(100, -80)` | `lake` | `lake` |
| `(120, 60)` | `snow` | `snow` |
| `(120, 145)` | `mountain` | `mountain` |
| `(-78, -28)` | `forest` | `forest` |
| `(48, -104)` | `spectral` | `spectral` |
| `(250, 0)` | `coast` | `coast` |
| `(160, 160)` | `river` | `river` |
| `(20, 60)` | `meadow` | `meadow` |

Benchmark local de 100 000 muestras: ~48,9 µs/muestra, incluyendo la evaluación analítica de altura y la distancia al río. No se detectó regresión frente a la cadena anterior en la misma medición.

## 10. Pendientes

- Revisión visual en navegador de biomas y colores. No se usó `agent-browser`.
- `public/assets/souldolls/17.webp` (ECHO `#007`) sigue a 0 bytes; no bloquea el arranque con los starters `01/03/09`, pero el encuentro con ECHO no tendrá textura hasta restaurarlo.
- Las máscaras y splines de bioma no tienen datos demo activos; se conectarán al editor en la etapa 07.
- Evaluar una estructura espacial para splines si el editor crea muchos corredores.
- Añadir Vitest antes de la etapa 08.
- Confirmar si las posiciones de las estampas demo deben mantenerse.

## 11. Criterios de aceptación

- [x] Los 10 biomas actuales se migraron a datos.
- [x] `sampleBiomeAt` conserva firma y pools de encuentro.
- [x] Prioridad y desempate determinista.
- [x] Máscaras con modos, falloff y strength.
- [x] Splines abiertos con ancho y falloff.
- [x] Painter compatible con vertex colors.
- [x] Integración con altura estampada en chunks, árboles y encuentros.
- [x] Tests de prioridad, anidamiento, superposición, máscaras, exclusión, determinismo y compatibilidad.
- [ ] Revisión visual y aprobación del usuario.
