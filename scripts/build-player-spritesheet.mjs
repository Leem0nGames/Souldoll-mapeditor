import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.resolve(root, process.argv[2] ?? 'assets/player02.jpg');
const outputDirectory = path.join(root, 'public/assets');
const columns = 4;
const rows = 4;
const frameWidth = 106;
const frameHeight = 210;
const padding = 1;
const atlasColumnWidth = frameWidth + padding;
const atlasRowHeight = frameHeight + padding;
const minimumComponentPixels = 600;

function isGreenScreenPixel(red, green, blue) {
  return (
    green > 80 &&
    green - Math.max(red, blue) > 55 &&
    green > red * 1.25 &&
    green > blue * 1.5
  );
}

function removeGreenScreen(input, width, height, channels) {
  const rgba = Buffer.alloc(width * height * 4);
  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueueIfBackground = (index) => {
    if (background[index]) return;

    const offset = index * channels;
    if (!isGreenScreenPixel(input[offset], input[offset + 1], input[offset + 2])) return;

    background[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x++) {
    enqueueIfBackground(x);
    enqueueIfBackground((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    enqueueIfBackground(y * width);
    enqueueIfBackground(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);

    if (x > 0) enqueueIfBackground(index - 1);
    if (x + 1 < width) enqueueIfBackground(index + 1);
    if (y > 0) enqueueIfBackground(index - width);
    if (y + 1 < height) enqueueIfBackground(index + width);
  }

  for (let index = 0; index < width * height; index++) {
    const inputOffset = index * channels;
    const outputOffset = index * 4;
    const red = input[inputOffset];
    const green = input[inputOffset + 1];
    const blue = input[inputOffset + 2];

    rgba[outputOffset] = red;
    rgba[outputOffset + 1] = green;
    rgba[outputOffset + 2] = blue;
    rgba[outputOffset + 3] = background[index] ? 0 : 255;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (background[index]) continue;

      let touchesBackground = false;
      for (let neighborY = Math.max(0, y - 1); neighborY <= Math.min(height - 1, y + 1); neighborY++) {
        for (let neighborX = Math.max(0, x - 1); neighborX <= Math.min(width - 1, x + 1); neighborX++) {
          if (background[neighborY * width + neighborX]) {
            touchesBackground = true;
            break;
          }
        }
        if (touchesBackground) break;
      }

      if (!touchesBackground) continue;

      const offset = index * 4;
      const greenExcess = rgba[offset + 1] - Math.max(rgba[offset], rgba[offset + 2]);
      if (greenExcess <= 18) continue;

      const alpha = Math.max(0, Math.min(255, Math.round(255 * (1 - (greenExcess - 18) / 140))));
      rgba[offset + 1] = Math.min(rgba[offset + 1], Math.max(rgba[offset], rgba[offset + 2]) + 24);
      rgba[offset + 3] = alpha;
    }
  }

  return rgba;
}

function removeDetachedNoise(rgba, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let removed = 0;

  for (let start = 0; start < width * height; start++) {
    if (visited[start] || rgba[start * 4 + 3] <= 8) continue;

    let head = 0;
    let tail = 0;
    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);

      for (let neighborY = Math.max(0, y - 1); neighborY <= Math.min(height - 1, y + 1); neighborY++) {
        for (let neighborX = Math.max(0, x - 1); neighborX <= Math.min(width - 1, x + 1); neighborX++) {
          const neighbor = neighborY * width + neighborX;
          if (visited[neighbor] || rgba[neighbor * 4 + 3] <= 8) continue;
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
    }

    if (tail < minimumComponentPixels) {
      for (let index = 0; index < tail; index++) {
        rgba[queue[index] * 4 + 3] = 0;
      }
      removed++;
    }
  }

  return removed;
}

function findVisibleBounds(rgba, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] <= 8) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    throw new Error('Un frame quedó vacío al quitar el fondo; revisa el color de chroma key y el sprite de entrada.');
  }

  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function main() {
  const source = await sharp(await readFile(inputPath)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = source.info;

  if (width % columns !== 0 || height % rows !== 0 || channels !== 4) {
    throw new Error(`Se esperaba una hoja RGBA divisible en una cuadrícula de ${columns}x${rows}; se recibió ${width}x${height}.`);
  }

  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const frames = [];
  let removedNoiseComponents = 0;

  for (let index = 0; index < columns * rows; index++) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const pixels = Buffer.alloc(cellWidth * cellHeight * 4);

    for (let y = 0; y < cellHeight; y++) {
      const sourceStart = ((row * cellHeight + y) * width + column * cellWidth) * 4;
      source.data.copy(pixels, y * cellWidth * 4, sourceStart, sourceStart + cellWidth * 4);
    }

    const rgba = removeGreenScreen(pixels, cellWidth, cellHeight, 4);
    removedNoiseComponents += removeDetachedNoise(rgba, cellWidth, cellHeight);
    const bounds = findVisibleBounds(rgba, cellWidth, cellHeight);
    frames.push({ index, cellWidth, cellHeight, rgba, bounds });
  }

  const scale = Math.min(
    frameWidth / Math.max(...frames.map((frame) => frame.bounds.width)),
    frameHeight / Math.max(...frames.map((frame) => frame.bounds.height)),
  );
  const atlasWidth = columns * frameWidth + (columns - 1) * padding;
  const atlasHeight = rows * frameHeight + (rows - 1) * padding;
  const atlas = Buffer.alloc(atlasWidth * atlasHeight * 4);
  const frameData = {};

  for (const frame of frames) {
    const width = Math.max(1, Math.round(frame.bounds.width * scale));
    const height = Math.max(1, Math.round(frame.bounds.height * scale));
    const spriteX = Math.floor((frameWidth - width) / 2);
    const spriteY = frameHeight - height;
    const visiblePixels = Buffer.alloc(frame.bounds.width * frame.bounds.height * 4);

    for (let y = 0; y < frame.bounds.height; y++) {
      const sourceStart = ((frame.bounds.top + y) * frame.cellWidth + frame.bounds.left) * 4;
      frame.rgba.copy(visiblePixels, y * frame.bounds.width * 4, sourceStart, sourceStart + frame.bounds.width * 4);
    }

    const resized = await sharp(visiblePixels, {
      raw: { width: frame.bounds.width, height: frame.bounds.height, channels: 4 },
    })
      .resize(width, height, { fit: 'fill', kernel: 'nearest' })
      .raw()
      .toBuffer();

    const atlasX = (frame.index % columns) * atlasColumnWidth + spriteX;
    const atlasY = Math.floor(frame.index / columns) * atlasRowHeight + spriteY;

    for (let y = 0; y < height; y++) {
      const sourceStart = y * width * 4;
      const destinationStart = ((atlasY + y) * atlasWidth + atlasX) * 4;
      resized.copy(atlas, destinationStart, sourceStart, sourceStart + width * 4);
    }

    frameData[`frame_${String(frame.index).padStart(3, '0')}.webp`] = {
      frame: { x: atlasX, y: atlasY, w: width, h: height },
      rotated: false,
      trimmed: true,
      spriteSourceSize: { x: spriteX, y: spriteY, w: width, h: height },
      sourceSize: { w: frameWidth, h: frameHeight },
      pivot: { x: 0.5, y: 1.0 },
    };
  }

  const imageName = 'player_spritesheet.webp';
  const json = {
    frames: frameData,
    meta: {
      app: 'SoulDolls Player Asset Pipeline',
      version: '1.0',
      image: imageName,
      format: 'RGBA8888',
      size: { w: atlasWidth, h: atlasHeight },
      scale: '1',
      centered: true,
    },
  };

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    sharp(atlas, { raw: { width: atlasWidth, height: atlasHeight, channels: 4 } })
      .webp({ lossless: true })
      .toFile(path.join(outputDirectory, imageName)),
    writeFile(path.join(outputDirectory, 'player_spritesheet.json'), `${JSON.stringify(json, null, 2)}\n`),
  ]);

  console.log(`Atlas generado: public/assets/${imageName} (${atlasWidth}x${atlasHeight}, ${frames.length} frames)`);
  console.log(`Metadatos generados: public/assets/player_spritesheet.json`);
  console.log(`Componentes residuales eliminados: ${removedNoiseComponents}`);
}

main().catch((error) => {
  console.error(`No se pudo procesar el spritesheet del jugador: ${error.message}`);
  process.exitCode = 1;
});
