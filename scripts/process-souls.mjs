import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.join(root, 'public/assets/aistudio/379712437_1794099654087129_2adda213.jpg');

function isGreenScreenPixel(r, g, b) {
  const maxRB = Math.max(r, b);
  const diff = g - maxRB;
  return g > 80 && diff > 45 && g > r * 1.3 && g > b * 1.3 && r < 80 && b < 95;
}

const SOUL_ELEMENTS = [
  // Row 0
  { row: 0, col: 0, element: 'Fuego', id: 'fire', color: '#ef4444', name: 'Ignis' },
  { row: 0, col: 1, element: 'Agua', id: 'water', color: '#0ea5e9', name: 'Aqualis' },
  { row: 0, col: 2, element: 'Tierra', id: 'earth', color: '#84cc16', name: 'Terran' },
  // Row 1
  { row: 1, col: 0, element: 'Viento', id: 'wind', color: '#bae6fd', name: 'Zephyrus' },
  { row: 1, col: 1, element: 'Hielo', id: 'ice', color: '#7dd3fc', name: 'Glacies' },
  { row: 1, col: 2, element: 'Rayo', id: 'electric', color: '#eab308', name: 'Fulgor' },
  // Row 2
  { row: 2, col: 0, element: 'Planta', id: 'nature', color: '#22c55e', name: 'Sylva' },
  { row: 2, col: 1, element: 'Luz', id: 'light', color: '#fbbf24', name: 'Lumina' },
  { row: 2, col: 2, element: 'Sombra', id: 'dark', color: '#a855f7', name: 'Umbra' },
];

async function main() {
  console.log('Procesando spritesheet de almas...');
  const rawImage = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = rawImage.info;

  const rgba = Buffer.alloc(width * height * 4);
  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  // 1. Flood fill from image perimeter
  const enqueueIfChroma = (index) => {
    if (background[index]) return;
    const offset = index * channels;
    if (!isGreenScreenPixel(rawImage.data[offset], rawImage.data[offset + 1], rawImage.data[offset + 2])) return;
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

  // 2. Clear interior chroma holes
  for (let index = 0; index < width * height; index++) {
    if (background[index]) continue;
    const offset = index * channels;
    if (isGreenScreenPixel(rawImage.data[offset], rawImage.data[offset + 1], rawImage.data[offset + 2])) {
      background[index] = 1;
    }
  }

  // 3. Populate RGBA
  for (let index = 0; index < width * height; index++) {
    const inputOffset = index * channels;
    const outputOffset = index * 4;
    rgba[outputOffset] = rawImage.data[inputOffset];
    rgba[outputOffset + 1] = rawImage.data[inputOffset + 1];
    rgba[outputOffset + 2] = rawImage.data[inputOffset + 2];
    rgba[outputOffset + 3] = background[index] ? 0 : 255;
  }

  // 4. Despill edges
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

  await mkdir(path.join(root, 'public/assets/souls'), { recursive: true });
  await mkdir(path.join(root, 'assets/souls'), { recursive: true });

  const cellW = width / 3;
  const cellH = height / 3;
  const manifest = [];

  for (const def of SOUL_ELEMENTS) {
    const minX = Math.floor(def.col * cellW);
    const maxX = Math.floor((def.col + 1) * cellW);
    const minY = Math.floor(def.row * cellH);
    const maxY = Math.floor((def.row + 1) * cellH);

    // Find bounding box inside cell
    let bMinX = maxX, bMaxX = minX, bMinY = maxY, bMaxY = minY;
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const idx = (y * width + x) * 4;
        if (rgba[idx + 3] > 15) {
          if (x < bMinX) bMinX = x;
          if (x > bMaxX) bMaxX = x;
          if (y < bMinY) bMinY = y;
          if (y > bMaxY) bMaxY = y;
        }
      }
    }

    const spriteW = bMaxX - bMinX + 1;
    const spriteH = bMaxY - bMinY + 1;
    const padding = 6;
    const outW = spriteW + padding * 2;
    const outH = spriteH + padding * 2;
    const cellBuffer = Buffer.alloc(outW * outH * 4);

    for (let y = 0; y < spriteH; y++) {
      const srcY = bMinY + y;
      for (let x = 0; x < spriteW; x++) {
        const srcX = bMinX + x;
        const srcOffset = (srcY * width + srcX) * 4;
        const dstOffset = ((padding + y) * outW + (padding + x)) * 4;

        cellBuffer[dstOffset] = rgba[srcOffset];
        cellBuffer[dstOffset + 1] = rgba[srcOffset + 1];
        cellBuffer[dstOffset + 2] = rgba[srcOffset + 2];
        cellBuffer[dstOffset + 3] = rgba[srcOffset + 3];
      }
    }

    const fileName = `soul_${def.id}.webp`;
    const webpBuffer = await sharp(cellBuffer, {
      raw: { width: outW, height: outH, channels: 4 },
    })
      .webp({ lossless: true, quality: 100 })
      .toBuffer();

    const outPublic = path.join(root, 'public/assets/souls', fileName);
    const outAssets = path.join(root, 'assets/souls', fileName);

    await writeFile(outPublic, webpBuffer);
    await writeFile(outAssets, webpBuffer);

    console.log(`Alma [${def.element}] generada: ${fileName} (${outW}x${outH})`);

    manifest.push({
      element: def.element,
      id: def.id,
      name: def.name,
      color: def.color,
      file: `/assets/souls/${fileName}`,
      width: outW,
      height: outH,
    });
  }

  const manifestJson = JSON.stringify(manifest, null, 2);
  await writeFile(path.join(root, 'public/assets/souls/manifest.json'), manifestJson);
  await writeFile(path.join(root, 'assets/souls/manifest.json'), manifestJson);
  console.log('Manifest de almas creado exitosamente.');
}

main().catch(err => {
  console.error('Error procesando spritesheet de almas:', err);
  process.exit(1);
});
