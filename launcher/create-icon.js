const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const Jimp = require('jimp');

// Create a canvas for drawing the icon
const size = 256;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Fill background with dark color
ctx.fillStyle = '#1e1e1e';
ctx.fillRect(0, 0, size, size);

// Draw DMX text
ctx.fillStyle = '#2aaa8a';
ctx.font = 'bold 100px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('DMX', size / 2, size / 2 - 20);

// Draw smaller text
ctx.fillStyle = '#ffffff';
ctx.font = '40px Arial';
ctx.fillText('ArtBastard', size / 2, size / 2 + 40);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
const pngPath = path.join(__dirname, 'assets', 'icon.png');
fs.writeFileSync(pngPath, buffer);

console.log(`Created icon at ${pngPath}`);

// Convert to ICO using Jimp
async function convertToIco() {
  try {
    // Read the PNG
    const image = await Jimp.read(pngPath);
    
    // Resize for ICO format (common sizes are 16x16, 32x32, 48x48)
    await image.resize(48, 48);
    
    // Save as ICO
    const icoPath = path.join(__dirname, 'assets', 'icon.ico');
    await image.writeAsync(icoPath);
    
    console.log(`Converted to ICO at ${icoPath}`);
  } catch (err) {
    console.error('Error creating ICO:', err);
  }
}

// Run the conversion
convertToIco();
