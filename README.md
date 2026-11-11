# SoulDolls — RPG pixel-art 2.5D

Juego de exploración 2.5D hecho con React, TypeScript, Three.js y Vite. Explora el mundo, encuentra SoulDolls, forma un equipo y participa en combates.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm

## Desarrollo local

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite en la terminal (por defecto, <http://localhost:3000>).

## Comprobaciones y compilación

```bash
npm run lint
npm run build
npm run preview
```

`lint` ejecuta la comprobación de TypeScript. `build` genera la versión de producción en `dist/`; `preview` sirve esa compilación localmente.

## Sprite del jugador

El original se conserva en `assets/player02.jpg`. Para quitar el fondo verde, recortar los 16 cuadros, alinearlos a una base común y generar el atlas transparente que sirve el juego:

```bash
npm run assets:player
```

El proceso requiere que el original mantenga la cuadrícula 4×4 y el fondo verde. Genera `public/assets/player_spritesheet.webp` y `public/assets/player_spritesheet.json`: ambos son consumidos por el juego. Cada cuadro se centra y alinea por los pies en un lienzo lógico de 106×210 px. Al reemplazar el original, vuelve a ejecutar el comando antes de compilar.

## Partidas guardadas

El juego guarda el progreso en el almacenamiento local del navegador. Los datos no se sincronizan entre dispositivos.

## Licencia

No se ha añadido una licencia global al repositorio. Algunos archivos fuente incluyen avisos `SPDX-License-Identifier: Apache-2.0`; confirma que esos avisos sean correctos y revisa los derechos de los recursos antes de publicar o redistribuir el proyecto.
