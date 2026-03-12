const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <rect width="180" height="180" rx="40" fill="#0D0D0D"/>
  <text x="30" y="125" font-family="monospace" font-size="90" font-weight="bold" fill="#22D3EE">&gt;_</text>
</svg>`;

async function generateIcons() {
  const publicDir = path.join(__dirname, 'public');
  
  // Generate apple-touch-icon.png (180x180)
  await sharp(Buffer.from(svgContent))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png (180x180)');
  
  // Generate icon-512.png for PWA
  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ icon-512.png (512x512)');
  
  // Generate PNGs for ICO (16, 32, 48, 256)
  const icoSizes = [16, 32, 48, 256];
  const pngBuffers = await Promise.all(
    icoSizes.map(size => 
      sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );
  
  // Create proper ICO file with multiple sizes
  // ICO format: header + directory entries + image data
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  
  let dataOffset = headerSize + dirSize;
  const directories = [];
  
  for (let i = 0; i < numImages; i++) {
    const size = icoSizes[i];
    const buffer = pngBuffers[i];
    directories.push({
      width: size === 256 ? 0 : size,
      height: size === 256 ? 0 : size,
      size: buffer.length,
      offset: dataOffset
    });
    dataOffset += buffer.length;
  }
  
  const icoBuffer = Buffer.alloc(dataOffset);
  
  // Write ICO header
  icoBuffer.writeUInt16LE(0, 0);      // Reserved
  icoBuffer.writeUInt16LE(1, 2);      // Type: 1 = ICO
  icoBuffer.writeUInt16LE(numImages, 4); // Number of images
  
  // Write directory entries
  let offset = headerSize;
  for (let i = 0; i < numImages; i++) {
    const dir = directories[i];
    icoBuffer.writeUInt8(dir.width, offset);      // Width
    icoBuffer.writeUInt8(dir.height, offset + 1);  // Height
    icoBuffer.writeUInt8(0, offset + 2);           // Color palette
    icoBuffer.writeUInt8(0, offset + 3);           // Reserved
    icoBuffer.writeUInt16LE(1, offset + 4);        // Color planes
    icoBuffer.writeUInt16LE(32, offset + 6);       // Bits per pixel
    icoBuffer.writeUInt32LE(dir.size, offset + 8); // Image size
    icoBuffer.writeUInt32LE(dir.offset, offset + 12); // Image offset
    offset += dirEntrySize;
  }
  
  // Write image data
  for (let i = 0; i < numImages; i++) {
    pngBuffers[i].copy(icoBuffer, directories[i].offset);
  }
  
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('✓ favicon.ico (16, 32, 48, 256)');
  
  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
