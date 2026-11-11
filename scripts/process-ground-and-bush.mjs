import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const bushInput = path.join(root, 'public/assets/aistudio/1042298642_1794095898998062_00599589.jpg');
const groundInput = path.join(root, 'public/assets/aistudio/325405462_1794095621611147_0446008e.jpg');

function isGreenScreenPixel(r, g, b) {
  // Chroma green in user image is ~ (20, 244, 6)
  const maxRB = Math.max(r, b);
  const diff = g - maxRB;
  return (
    g > 80 &&
    diff > 45 &&
    g > r * 1.3 &&
    g > b * 1.3 &&
    r < 80 &&
    b < 95
  );
}

function processBushImage(input, width, height, channels) {
  const rgba = Buffer.alloc(width * height * 4);
  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  // 1. Flood fill from image perimeter
  const enqueueIfChroma = (index) => {
    if (background[index]) return;
    const offset = index * channels;
    if (!isGreenScreenPixel(input[offset], input[offset + 1], input[offset + 2])) return;
    background[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x++) {
    enqueueIfChroma(x);
    enqueueIfChroma((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    enqueueIfChroma(y * width);
    enqueueIfChroma(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);

    if (x > 0) enqueueIfChroma(index - 1);
    if (x + 1 < width) enqueueIfChroma(index + 1);
    if (y > 0) enqueueIfChroma(index - width);
    if (y + 1 < height) enqueueIfChroma(index + width);
  }

  // 2. Interior chroma holes
  for (let index = 0; index < width * height; index++) {
    if (background[index]) continue;
    const offset = index * channels;
    if (isGreenScreenPixel(input[offset], input[offset + 1], input[offset + 2])) {
      background[index] = 1;
    }
  }

  // 3. Populate RGBA
  for (let index = 0; index < width * height; index++) {
    const inputOffset = index * channels;
    const outputOffset = index * 4;
    rgba[outputOffset] = input[inputOffset];
    rgba[outputOffset + 1] = input[inputOffset + 1];
    rgba[outputOffset + 2] = input[inputOffset + 2];
    rgba[outputOffset + 3] = background[index] ? 0 : 255;
  }

  // 4. Remove isolated noise pixels (< 60 pixels)
  const visited = new Uint8Array(width * height);
  const compQueue = new Int32Array(width * height);

  for (let start = 0; start < width * height; start++) {
    if (visited[start] || rgba[start * 4 + 3] === 0) continue;

    let cHead = 0;
    let cTail = 0;
    visited[start] = 1;
    compQueue[cTail++] = start;

    while (cHead < cTail) {
      const idx = compQueue[cHead++];
      const cx = idx % width;
      const cy = Math.floor(idx / width);

      for (let ny = Math.max(0, cy - 1); ny <= Math.min(height - 1, cy + 1); ny++) {
        for (let nx = Math.max(0, cx - 1); nx <= Math.min(width - 1, cx + 1); nx++) {
          const nIdx = ny * width + nx;
          if (visited[nIdx] || rgba[nIdx * 4 + 3] === 0) continue;
          visited[nIdx] = 1;
          compQueue[cTail++] = nIdx;
        }
      }
    }

    if (cTail < 60) {
      for (let i = 0; i < cTail; i++) {
        rgba[compQueue[i] * 4 + 3] = 0;
        background[compQueue[i]] = 1;
      }
    }
  }

  // 5. Despill & edge anti-fringing
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (rgba[index * 4 + 3] === 0) continue;

      let touchesBg = false;
      for (let ny = Math.max(0, y - 1); ny <= Math.min(height - 1, y + 1); ny++) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(width - 1, x + 1); nx++) {
          if (background[ny * width + nx]) {
            touchesBg = true;
            break;
          }
        }
        if (touchesBg) break;
      }

      if (!touchesBg) continue;

      const offset = index * 4;
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      const maxRB = Math.max(r, b);
      const greenExcess = g - maxRB;

      if (greenExcess > 12) {
        rgba[offset + 1] = Math.min(g, maxRB + 8);
        if (greenExcess > 35) {
          const alphaFactor = Math.max(0.1, 1 - (greenExcess - 35) / 90);
          rgba[offset + 3] = Math.round(255 * alphaFactor);
        }
      }
    }
  }

  // 6. Find visible bounds
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return {
    rgba,
    bounds: {
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      bottom: maxY,
    },
  };
}

async function processBush() {
  console.log('Procesando arbusto morado...');
  const rawImage = await sharp(bushInput).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = rawImage.info;

  const { rgba, bounds } = processBushImage(rawImage.data, width, height, channels);
  console.log('Bush visible bounds:', bounds);

  const cropPadding = 6;
  const outW = bounds.width + cropPadding * 2;
  const outH = bounds.height + cropPadding * 2;
  const targetBuffer = Buffer.alloc(outW * outH * 4);

  const startX = cropPadding;
  const startY = cropPadding;

  for (let y = 0; y < bounds.height; y++) {
    const srcY = bounds.top + y;
    for (let x = 0; x < bounds.width; x++) {
      const srcX = bounds.left + x;
      const srcOffset = (srcY * width + srcX) * 4;
      const dstOffset = ((startY + y) * outW + (startX + x)) * 4;

      targetBuffer[dstOffset] = rgba[srcOffset];
      targetBuffer[dstOffset + 1] = rgba[srcOffset + 1];
      targetBuffer[dstOffset + 2] = rgba[srcOffset + 2];
      targetBuffer[dstOffset + 3] = rgba[srcOffset + 3];
    }
  }

  const webpBuffer = await sharp(targetBuffer, {
    raw: { width: outW, height: outH, channels: 4 },
  })
    .webp({ lossless: true, quality: 100 })
    .toBuffer();

  await writeFile(path.join(root, 'public/assets/props/bush_purple.webp'), webpBuffer);
  await writeFile(path.join(root, 'assets/props/bush_purple.webp'), webpBuffer);
  console.log(`Arbusto procesado exitosamente: bush_purple.webp (${outW}x${outH})`);
}

async function processGroundTile() {
  console.log('Procesando tile de piso...');
  // Ground tile is already a seamless tile, convert to clean webp
  const webpBuffer = await sharp(groundInput)
    .webp({ lossless: true, quality: 100 })
    .toBuffer();

  await writeFile(path.join(root, 'public/assets/tiles/ground_tile.webp'), webpBuffer);
  await writeFile(path.join(root, 'assets/tiles/ground_tile.webp'), webpBuffer);
  console.log('Tile de piso procesado exitosamente: ground_tile.webp');
}

async function main() {
  await processBush();
  await processGroundTile();
}

main().catch(err => {
  console.error('Error procesando assets:', err);
  process.exit(1);
});
