// Generate a macOS .icns file from a 512x512+ PNG source using sharp.
// Usage: node electron/generate-icns.cjs
//
// This creates an ICNS file with multiple resolutions (16, 32, 64, 128, 256, 512, 1024)
// from electron/build/icon-source.png → electron/build/icon.icns

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function generateIcns() {
  const pngSource = path.join(__dirname, "build", "icon-source.png");
  const outputPath = path.join(__dirname, "build", "icon.icns");

  if (!fs.existsSync(pngSource)) {
    console.error(`Source PNG not found: ${pngSource}`);
    console.error("Place a 512x512+ PNG named icon-source.png in electron/build/");
    process.exit(1);
  }

  // ICNS supports these OSType codes for different sizes:
  // 16x16:   icp4  (ICON)
  // 32x32:   icp5  (ICN4)
  // 64x64:   icp6
  // 128x128: ic07
  // 256x256: ic08
  // 512x512: ic09
  // 1024x1024: ic10
  const sizes = [
    { size: 16, type: "icp4" },
    { size: 32, type: "icp5" },
    { size: 64, type: "icp6" },
    { size: 128, type: "ic07" },
    { size: 256, type: "ic08" },
    { size: 512, type: "ic09" },
    { size: 1024, type: "ic10" },
  ];

  const chunks = [];

  // Magic header: "icns" (4 bytes) + file size (4 bytes, big-endian)
  const headerSize = 8;

  let totalSize = headerSize;

  for (const { size, type } of sizes) {
    const buf = await sharp(pngSource)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Each chunk: OSType (4 bytes) + chunk length (4 bytes, big-endian) + PNG data
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(type, 0, "ascii");
    chunkHeader.writeUInt32BE(buf.length + 8, 4);

    chunks.push(Buffer.concat([chunkHeader, buf]));
    totalSize += 8 + buf.length;
  }

  // Build the ICNS file
  const icns = Buffer.alloc(totalSize);
  let offset = 0;

  // Write magic header
  icns.write("icns", offset, "ascii");
  offset += 4;
  icns.writeUInt32BE(totalSize, offset);
  offset += 4;

  // Write all chunks
  for (const chunk of chunks) {
    chunk.copy(icns, offset);
    offset += chunk.length;
  }

  // Ensure build directory exists
  const buildDir = path.dirname(outputPath);
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, icns);
  console.log(`Generated ICNS: ${outputPath} (${icns.length} bytes, ${sizes.length} sizes)`);
}

generateIcns().catch((err) => {
  console.error("Failed to generate ICNS:", err);
  process.exit(1);
});
