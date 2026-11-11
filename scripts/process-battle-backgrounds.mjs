import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function processBackgrounds() {
  const images = [
    { src: 'public/assets/aistudio/278198289_1794102934888341_4a2de319.jpg', name: 'plains' },
    { src: 'public/assets/aistudio/542380548_1794102588743780_89d65f86.jpg', name: 'dungeon' },
    { src: 'public/assets/aistudio/46291624_1794102788378562_59faa82a.jpg', name: 'forest' },
    { src: 'public/assets/aistudio/789050505_1794103157897013_3da638f1.jpg', name: 'valley' },
    { src: 'public/assets/aistudio/635247258_1794102690733199_ed33c902.jpg', name: 'mystic' },
  ];

  for (const img of images) {
    if (fs.existsSync(img.src)) {
      await sharp(img.src)
        .webp({ quality: 90 })
        .toFile(`public/assets/battle/${img.name}.webp`);
      console.log(`Processed ${img.name}.webp successfully.`);
    } else {
      console.warn(`Source not found: ${img.src}`);
    }
  }
}

processBackgrounds().catch(err => {
  console.error(err);
  process.exit(1);
});
