import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputDir = path.join(root, 'public/assets/trees');
const outputDir = path.join(root, 'public/assets/trees');
const assetsDir = path.join(root, 'assets/trees');

function isGreenScreenPixel(r, g, b) {
  // Chroma green in tree1 is ~ (10, 244, 8) and tree2 is ~ (9, 176, 34)
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

function processTreeImage(input, width, height, channels) {
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

  // 2. Also clear enclosed interior chroma holes (e.g. between branches)
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

  // 4. Remove isolated noise pixels (clusters of < 60 pixels detached from main tree)
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

    if (cTail < 70) {
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
        // Suppress green spill on edge pixels
        rgba[offset + 1] = Math.min(g, maxRB + 8);
        // Soften alpha for very green compression fringe
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

async function processFile(filename, outputName) {
  const filePath = path.join(inputDir, filename);
  console.log(`Procesando ${filePath}...`);
  const rawImage = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = rawImage.info;

  // Process chroma and despill
  const { rgba, bounds } = processTreeImage(rawImage.data, width, height, channels);

  console.log(`${filename} bounds:`, bounds);

  // Crop to visible content with slight margin at top/sides and base aligned to bottom
  const cropPadding = 6;
  const contentWidth = bounds.width;
  const contentHeight = bounds.height;

  const outW = contentWidth + cropPadding * 2;
  const outH = contentHeight + cropPadding * 2;
  const targetBuffer = Buffer.alloc(outW * outH * 4);

  const startX = cropPadding;
  const startY = cropPadding;

  for (let y = 0; y < contentHeight; y++) {
    const srcY = bounds.top + y;
    for (let x = 0; x < contentWidth; x++) {
      const srcX = bounds.left + x;
      const srcOffset = (srcY * width + srcX) * 4;
      const dstOffset = ((startY + y) * outW + (startX + x)) * 4;

      targetBuffer[dstOffset] = rgba[srcOffset];
      targetBuffer[dstOffset + 1] = rgba[srcOffset + 1];
      targetBuffer[dstOffset + 2] = rgba[srcOffset + 2];
      targetBuffer[dstOffset + 3] = rgba[srcOffset + 3];
    }
  }

  // Now create high-resolution WebP (lossless)
  const webpBuffer = await sharp(targetBuffer, {
    raw: { width: outW, height: outH, channels: 4 },
  })
    .webp({ lossless: true, quality: 100 })
    .toBuffer();

  await mkdir(outputDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const outPathPublic = path.join(outputDir, outputName);
  const outPathAssets = path.join(assetsDir, outputName);

  await writeFile(outPathPublic, webpBuffer);
  await writeFile(outPathAssets, webpBuffer);

  console.log(`Generado exitosamente: ${outPathPublic} (${outW}x${outH})`);
}

async function main() {
  await processFile('tree1.jpg', 'tree1.webp');
  await processFile('tree2.jpg', 'tree2.webp');
}

main().catch(err => {
  console.error('Error procesando árboles:', err);
  process.exit(1);
});
