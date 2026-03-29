#!/usr/bin/env node
/**
 * Generates preview-variant app icons by stamping a diagonal "PREVIEW"
 * ribbon onto each production icon. Run once, commit the outputs.
 *
 * Output:
 *   assets/icon-preview-light.png
 *   assets/icon-preview-dark.png
 *   assets/icon-preview-tinted.png
 *
 * Usage: node scripts/generate-preview-icons.js
 */

const sharp = require('sharp');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const SIZE = 1024;

// Ribbon covers bottom-right triangle of the icon.
// Amber fill (#f59e0b) is visually distinct from both the red production
// accent and the blue dev icons, and reads clearly in both light/dark contexts.
const ribbonSvg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <!-- Diagonal ribbon: bottom-right triangle -->
  <polygon points="${SIZE * 0.52},${SIZE} ${SIZE},${SIZE * 0.52} ${SIZE},${SIZE}"
           fill="#f59e0b" opacity="0.95"/>
  <!-- "PREVIEW" label rotated 45° into the ribbon -->
  <text
    x="${SIZE * 0.845}"
    y="${SIZE * 0.885}"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-weight="800"
    font-size="${SIZE * 0.072}"
    fill="#000000"
    text-anchor="middle"
    transform="rotate(-45, ${SIZE * 0.845}, ${SIZE * 0.885})"
    letter-spacing="1"
  >PREVIEW</text>
</svg>
`;

const VARIANTS = [
  { src: 'icon-light.png', out: 'icon-preview-light.png' },
  { src: 'icon-dark.png', out: 'icon-preview-dark.png' },
  { src: 'icon-tinted.png', out: 'icon-preview-tinted.png' },
];

(async () => {
  const ribbon = Buffer.from(ribbonSvg);

  for (const { src, out } of VARIANTS) {
    const srcPath = path.join(ASSETS, src);
    const outPath = path.join(ASSETS, out);

    await sharp(srcPath)
      .resize(SIZE, SIZE)
      .composite([{ input: ribbon, blend: 'over' }])
      .png()
      .toFile(outPath);

    console.log(`  generated ${out}`);
  }

  console.log('\nDone. Commit the three icon-preview-*.png files.');
})();
