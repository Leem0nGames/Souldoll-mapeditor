import sharp from 'sharp';

function isGreenScreen(r, g, b) {
  const maxRB = Math.max(r, b);
  const diff = g - maxRB;
  return g > 80 && diff > 45 && g > r * 1.3 && g > b * 1.3 && r < 80 && b < 95;
}

async function analyzeSoulsSheet() {
  const imgPath = 'public/assets/aistudio/379712437_1794099654087129_2adda213.jpg';
  const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  
  const cellW = w / 3;
  const cellH = h / 3;
  
  console.log('Cell dimensions approx:', cellW, cellH);
  
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const minX = Math.floor(c * cellW);
      const maxX = Math.floor((c + 1) * cellW);
      const minY = Math.floor(r * cellH);
      const maxY = Math.floor((r + 1) * cellH);
      
      let bMinX = maxX, bMaxX = minX, bMinY = maxY, bMaxY = minY;
      let nonGreen = 0;
      
      for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
          const idx = (y * w + x) * 3;
          if (!isGreenScreen(data[idx], data[idx+1], data[idx+2])) {
            nonGreen++;
            if (x < bMinX) bMinX = x;
            if (x > bMaxX) bMaxX = x;
            if (y < bMinY) bMinY = y;
            if (y > bMaxY) bMaxY = y;
          }
        }
      }
      console.log('Cell [' + r + ', ' + c + ']:', { bMinX, bMaxX, bMinY, bMaxY, width: bMaxX - bMinX + 1, height: bMaxY - bMinY + 1, nonGreen });
    }
  }
}

analyzeSoulsSheet();
