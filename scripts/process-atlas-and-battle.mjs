import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function processAssets() {
  const battleBgSrc = 'src/assets/images/battle_bg_1794102286930.jpg';
  const atlasSrc = 'src/assets/images/building_atlas_1794102287162.jpg';

  // 1. Process Battle Background -> WebP (lossless/high quality)
  await sharp(battleBgSrc)
    .webp({ quality: 90 })
    .toFile('public/assets/battle/battle_bg.webp');
  console.log('Saved public/assets/battle/battle_bg.webp');

  // Also maintain the compatibility jpg path referenced in BattleScreen
  await sharp(battleBgSrc)
    .jpeg({ quality: 90 })
    .toFile('public/assets/aistudio/684566830_1793311950546470_0b6646bd.jpg');
  console.log('Saved compatibility 684566830_...jpg');

  // 2. Process Building Atlas
  // Convert full atlas to webp
  await sharp(atlasSrc)
    .webp({ quality: 95 })
    .toFile('public/assets/tiles/atlas.webp');
  console.log('Saved public/assets/tiles/atlas.webp');

  const atlasMeta = await sharp(atlasSrc).metadata();
  console.log('Atlas dimensions:', atlasMeta.width, atlasMeta.height);

  // Slicing the 4x4 or 2x4 grid. Let's inspect the atlas:
  // In our generated image:
  // It has a border and 4 columns x 4 rows (or 4 columns x 2 double rows).
  // Notice in the image, there are 4 main columns:
  // Col 0: Cobblestone (top), Mossy stone blocks (bottom)
  // Col 1: Foliage (top), Wood planks (bottom)
  // Col 2: Slate stone (top), Stone brick (bottom)
  // Col 3: Dark roof tile (top), Terracotta tile (bottom)
  //
  // Let's extract the 8 distinct building materials with high fidelity:
  const W = atlasMeta.width;
  const H = atlasMeta.height;
  
  // Each tile in 4x4 grid:
  const cellW = Math.floor(W / 4);
  const cellH = Math.floor(H / 4);
  // Slightly inset by 6px to avoid any black border lines
  const inset = Math.floor(cellW * 0.04);

  const tiles = [
    { name: 'tile_cobble', col: 0, row: 0 },
    { name: 'tile_foliage', col: 1, row: 0 },
    { name: 'tile_slate', col: 2, row: 0 },
    { name: 'tile_roof_dark', col: 3, row: 0 },
    { name: 'tile_mossystone', col: 0, row: 2 },
    { name: 'tile_woodplanks', col: 1, row: 2 },
    { name: 'tile_stonebrick', col: 2, row: 2 },
    { name: 'tile_roof_terracotta', col: 3, row: 2 },
  ];

  for (const t of tiles) {
    const left = t.col * cellW + inset;
    const top = t.row * cellH + inset;
    const width = cellW - inset * 2;
    const height = cellH - inset * 2;

    await sharp(atlasSrc)
      .extract({ left, top, width, height })
      .webp({ quality: 95 })
      .toFile(`public/assets/tiles/${t.name}.webp`);
    console.log(`Extracted public/assets/tiles/${t.name}.webp (${width}x${height})`);
  }
}

processAssets().catch(err => {
  console.error(err);
  process.exit(1);
});
