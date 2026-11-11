# SoulDolls — Crónicas de Luminati

RPG de exploración 2.5D con estética pixel-art, desarrollado con React, TypeScript y Three.js. Recorre un mundo procedural, encuentra SoulDolls y enfréntate a sus desafíos.

El proyecto también desarrolla un **World Engine** modular para terreno procedural, biomas, generación determinista y herramientas de edición. La documentación y el estado de cada etapa se encuentran en [`docs/world-engine/`](./docs/world-engine/).

## Tecnologías

- React y TypeScript
- Three.js
- Vite
- Generación procedural determinista

## Requisitos

- Node.js 20.19+ o 22.12+
- npm 10+ (o Bun)

## Empezar

Clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/Leemonztuff/Souldoll-mapeditor.git
cd Souldoll-mapeditor
npm ci
npm run dev
```

Abre la dirección que muestra Vite en la terminal; por defecto es <http://localhost:3000>.

También puedes usar Bun:

```bash
bun install
bun run dev
```

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run lint` | Comprueba los tipos de TypeScript (`tsc --noEmit`). |
| `npm run build` | Genera la compilación de producción en `dist/`. |
| `npm run preview` | Sirve localmente la compilación de producción. |
| `npm run assets:player` | Regenera el atlas del jugador a partir del original. |

Con Bun, reemplaza `npm run` por `bun run`.

## Estructura principal

```text
src/
├── game/       # Integración y ciclo de juego
├── world/      # Terreno, chunks y sistemas del World Engine
├── components/ # Interfaz React
├── battle/     # Reglas y efectos de combate
└── save/       # Gestión de partidas

docs/world-engine/ # Diseño, etapas y verificación del motor
assets/            # Recursos fuente
public/assets/     # Recursos servidos por la aplicación
```

La fachada de generación del mundo existente se mantiene para integrar progresivamente las nuevas capas del motor sin sustituir el terreno base ni cambiar los contratos del juego.

## Recursos del jugador

El original del sprite se encuentra en `assets/player02.jpg`. Para generar el atlas transparente que utiliza el juego:

```bash
npm run assets:player
```

El script espera una cuadrícula de 4×4 con fondo verde y genera `public/assets/player_spritesheet.webp` junto con su archivo JSON. Si cambias el original, vuelve a ejecutar el comando antes de compilar.

## Partidas guardadas

El progreso se guarda en el almacenamiento local del navegador y no se sincroniza entre dispositivos.

## Estado y contribuciones

El proyecto está en desarrollo activo. Consulta [`AGENTS.md`](./AGENTS.md) y la documentación de [`docs/world-engine/`](./docs/world-engine/) para conocer las restricciones arquitectónicas, las etapas y las decisiones pendientes.

## Licencia y recursos

Este repositorio no declara una licencia global. Algunos archivos fuente contienen avisos SPDX; verifica su alcance y los derechos de cada recurso antes de redistribuir o reutilizar el proyecto.
