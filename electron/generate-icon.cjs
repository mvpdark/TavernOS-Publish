// Generate a proper multi-resolution .ico file from PNG sources using sharp
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function generateIco() {
  // Source PNG: place a 512x512 PNG at electron/build/icon-source.png.
  // The original root-level "tavernos-icon-512.png" no longer exists; the
  // canonical source now lives next to the generated icon.ico. If the source
  // is missing, the existing electron/build/icon.ico can be reused as-is.
  const png512Path = path.join(__dirname, "build", "icon-source.png");
  const outputPath = path.join(__dirname, "build", "icon.ico");

  if (!fs.existsSync(png512Path)) {
    console.error(
      `Source PNG not found: ${png512Path}\n` +
      `Place a 512x512 PNG named "icon-source.png" in electron/build/ before regenerating the icon.\n` +
      `(The existing electron/build/icon.ico can be reused as-is if no changes are needed.)`
    );
    process.exit(1);
  }

  // Generate multiple sizes from the 512x512 source (256 is included here).
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngs = [];

  for (const size of sizes) {
    const buf = await sharp(png512Path)
      .resize(size, size, { fit: "contain" })
      .png()
      .toBuffer();
    pngs.push({ size, buf });
  }

  // Build ICO file format
  // ICO header: 6 bytes
  // Directory entries: 16 bytes each
  // Image data: PNG blobs

  const headerSize = 6;
  const dirEntrySize = 16;
  const imageCount = pngs.length;
  const dirSize = dirEntrySize * imageCount;
  const dataOffset = headerSize + dirSize;

  // Calculate total size
  let totalSize = headerSize + dirSize;
  for (const p of pngs) totalSize += p.buf.length;

  const ico = Buffer.alloc(totalSize);
  let offset = 0;

  // ICO header
  ico.writeUInt16LE(0, offset); offset += 2;      // Reserved
  ico.writeUInt16LE(1, offset); offset += 2;      // Type (1 = ICO)
  ico.writeUInt16LE(imageCount, offset); offset += 2; // Image count

  // Directory entries
  let currentDataOffset = dataOffset;
  for (const p of pngs) {
    // Width (0 = 256)
    ico.writeUInt8(p.size === 256 ? 0 : p.size, offset); offset += 1;
    // Height (0 = 256)
    ico.writeUInt8(p.size === 256 ? 0 : p.size, offset); offset += 1;
    // Color palette count (0 = no palette)
    ico.writeUInt8(0, offset); offset += 1;
    // Reserved
    ico.writeUInt8(0, offset); offset += 1;
    // Color planes
    ico.writeUInt16LE(1, offset); offset += 2;
    // Bits per pixel
    ico.writeUInt16LE(32, offset); offset += 2;
    // Image size in bytes
    ico.writeUInt32LE(p.buf.length, offset); offset += 4;
    // Offset to image data
    ico.writeUInt32LE(currentDataOffset, offset); offset += 4;

    currentDataOffset += p.buf.length;
  }

  // Copy PNG data
  for (const p of pngs) {
    p.buf.copy(ico, offset);
    offset += p.buf.length;
  }

  // Ensure build directory exists
  const buildDir = path.dirname(outputPath);
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, ico);
  console.log(`Generated ICO: ${outputPath} (${ico.length} bytes, ${imageCount} sizes)`);
}

generateIco().catch(console.error);
