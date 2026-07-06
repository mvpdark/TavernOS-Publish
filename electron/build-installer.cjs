/**
 * Build TavernOS Windows installer using NSIS.
 *
 * This script finds makensis.exe in the electron-builder cache
 * and compiles the custom NSIS script (electron/installer.nsi).
 *
 * Usage: node electron/build-installer.cjs
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PROJECT_DIR = path.resolve(__dirname, "..");
const NSIS_SCRIPT = path.join(__dirname, "installer.nsi");

// Read the version from package.json instead of hardcoding it, so the
// installer output name stays in sync with the app version.
const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, "package.json"), "utf8"));
const APP_VERSION = pkg.version || "0.0.0";
const RELEASE_DIR = process.env.TAVERNOS_RELEASE_DIR || "release";
const OUTPUT_EXE = path.join(PROJECT_DIR, RELEASE_DIR, `TavernOS-Setup-${APP_VERSION}-x64.exe`);

// --- Find makensis.exe in electron-builder cache ---
function findMakensis() {
  const cacheBase = path.join(os.homedir(), "AppData", "Local", "electron-builder", "Cache");

  if (!fs.existsSync(cacheBase)) {
    throw new Error(`electron-builder cache not found at ${cacheBase}`);
  }

  // Look for nsis-* directory
  const entries = fs.readdirSync(cacheBase);
  for (const entry of entries) {
    if (entry.startsWith("nsis")) {
      // Search for makensis.exe in subdirectories
      const nsisDir = path.join(cacheBase, entry);
      const findResult = findFile(nsisDir, "makensis.exe");
      if (findResult) return findResult;
    }
  }

  throw new Error("makensis.exe not found in electron-builder cache. Run electron-builder first to download NSIS.");
}

function findFile(dir, filename) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === filename) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const result = findFile(fullPath, filename);
      if (result) return result;
    }
  }
  return null;
}

// --- Main ---
function main() {
  console.log("=== TavernOS Installer Build ===\n");

  // Check prerequisites
  if (!fs.existsSync(NSIS_SCRIPT)) {
    throw new Error(`NSIS script not found: ${NSIS_SCRIPT}`);
  }

  const winUnpacked = path.join(PROJECT_DIR, RELEASE_DIR, "win-unpacked");
  if (!fs.existsSync(winUnpacked)) {
    console.error("win-unpacked directory not found. Run electron-builder --dir first.");
    console.error("  npx electron-builder --dir --win --x64 --publish never");
    process.exit(1);
  }

  // Find makensis
  const makensis = findMakensis();
  console.log(`makensis: ${makensis}`);
  console.log(`script:   ${NSIS_SCRIPT}`);
  console.log(`cwd:      ${PROJECT_DIR}`);
  console.log();

  // Run makensis.
  // Escape any embedded double quotes in the paths so the command line stays
  // well-formed even if the project path contains quotes or spaces.
  const escapeArg = (p) => `"${String(p).replace(/"/g, '\\"')}"`;
  // Pass the version (read from package.json) to NSIS via -D so the script's
  // APP_VERSION define stays in sync with package.json without manual edits.
  const nsisDefine = `-DAPP_VERSION=${APP_VERSION} -DRELEASE_DIR=${RELEASE_DIR}`;
  console.log(`APP_VERSION: ${APP_VERSION}`);
  console.log("Compiling NSIS installer...");
  try {
    execSync(`${escapeArg(makensis)} /V2 ${nsisDefine} ${escapeArg(NSIS_SCRIPT)}`, {
      cwd: PROJECT_DIR,
      stdio: "inherit",
      timeout: 900000, // 15 minutes
    });
  } catch (e) {
    console.error("\nmakensis failed:", e.message);
    process.exit(1);
  }

  // Verify output
  if (fs.existsSync(OUTPUT_EXE)) {
    const size = fs.statSync(OUTPUT_EXE).size;
    const sizeMB = (size / 1024 / 1024).toFixed(1);
    console.log(`\n=== SUCCESS ===`);
    console.log(`Installer: ${OUTPUT_EXE}`);
    console.log(`Size: ${sizeMB} MB`);
  } else {
    console.error("\nFAILED: Installer not created.");
    process.exit(1);
  }
}

main();
