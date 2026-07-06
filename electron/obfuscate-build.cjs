// electron/obfuscate-build.cjs
// Obfuscates JavaScript build output for production packaging.
//
// Can be used in three ways:
//   1. As a module from after-pack.cjs:
//        const { obfuscateFrontendInApp, obfuscateServerInApp } = require('./obfuscate-build.cjs');
//        obfuscateFrontendInApp(appOutDir);  // browser target
//   2. As a module from build-server.cjs:
//        const { obfuscateServerBundle } = require('./obfuscate-build.cjs');
//        obfuscateServerBundle(outputFilePath);
//   3. As a CLI: node electron/obfuscate-build.cjs [projectDir]
//        Obfuscates packages/studio/dist/assets/*.js and dist-server/index.js
//
const fs = require("fs");
const path = require("path");

const JavaScriptObfuscator = require("javascript-obfuscator");

// ---------------------------------------------------------------------------
// Shared obfuscation options (conservative — will not break ESM/CJS interop)
// ---------------------------------------------------------------------------

const BROWSER_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ["rc4"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersType: "function",
  unicodeEscapeSequence: false,
  target: "browser",
};

const NODE_OPTIONS = {
  ...BROWSER_OPTIONS,
  target: "node",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/**
 * Obfuscate a single JS file in-place.
 * @param {string} filePath - Absolute path to the .js file
 * @param {object} options  - Obfuscation options
 * @returns {boolean} true on success, false on failure
 */
function obfuscateFile(filePath, options) {
  const displayPath = path.relative(process.cwd(), filePath) || filePath;
  let source;
  try {
    source = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    console.warn(`[obfuscate] WARNING: Cannot read ${displayPath}: ${err.message}`);
    return false;
  }

  const sizeBefore = Buffer.byteLength(source, "utf-8");

  // Skip very small files (< 50 bytes) — usually just re-exports or stubs
  if (sizeBefore < 50) {
    console.log(`[obfuscate] Skipping tiny file (${formatSize(sizeBefore)}): ${displayPath}`);
    return true;
  }

  // Skip sourceMappingURL-only files
  if (source.trim().startsWith("//# sourceMappingURL=")) {
    console.log(`[obfuscate] Skipping source-map-only file: ${displayPath}`);
    return true;
  }

  console.log(`[obfuscate] Obfuscating: ${displayPath} (${formatSize(sizeBefore)})`);

  let result;
  try {
    result = JavaScriptObfuscator.obfuscate(source, options);
  } catch (err) {
    console.warn(`[obfuscate] WARNING: Obfuscation failed for ${displayPath}: ${err.message}`);
    return false;
  }

  const obfuscated = result.getObfuscatedCode();
  const sizeAfter = Buffer.byteLength(obfuscated, "utf-8");
  const ratio = ((sizeAfter / sizeBefore) * 100).toFixed(0);

  try {
    fs.writeFileSync(filePath, obfuscated, "utf-8");
  } catch (err) {
    console.warn(`[obfuscate] WARNING: Cannot write ${displayPath}: ${err.message}`);
    return false;
  }

  console.log(
    `[obfuscate]   Done: ${formatSize(sizeBefore)} -> ${formatSize(sizeAfter)} (${ratio}%)`
  );
  return true;
}

/**
 * Collect all .js files directly in a directory (non-recursive).
 * @param {string} dir - Directory to scan
 * @returns {string[]} List of absolute file paths
 */
function collectJsFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Targeted obfuscation functions
// ---------------------------------------------------------------------------

/**
 * Obfuscate all JS files in a frontend assets directory (browser target).
 * @param {string} assetsDir - Absolute path to dist/assets/
 * @returns {{total: number, success: number, failed: number}}
 */
function obfuscateFrontendAssets(assetsDir) {
  const files = collectJsFiles(assetsDir);
  console.log(`[obfuscate] Frontend assets: found ${files.length} JS file(s) in ${assetsDir}`);
  let success = 0, failed = 0;
  for (const file of files) {
    if (obfuscateFile(file, BROWSER_OPTIONS)) success++;
    else failed++;
  }
  return { total: files.length, success, failed };
}

/**
 * Obfuscate a single server bundle file (node target).
 * @param {string} bundlePath - Absolute path to the server index.js
 * @returns {{total: number, success: number, failed: number}}
 */
function obfuscateServerBundle(bundlePath) {
  if (!fs.existsSync(bundlePath)) {
    console.warn(`[obfuscate] WARNING: Server bundle not found at ${bundlePath}`);
    return { total: 0, success: 0, failed: 0 };
  }
  console.log(`[obfuscate] Server bundle: ${bundlePath}`);
  const ok = obfuscateFile(bundlePath, NODE_OPTIONS);
  return { total: 1, success: ok ? 1 : 0, failed: ok ? 0 : 1 };
}

// ---------------------------------------------------------------------------
// High-level helpers for specific integration points
// ---------------------------------------------------------------------------

/**
 * Obfuscate frontend JS inside an electron-builder appOutDir.
 * Target: appOutDir/resources/dist/assets/*.js (browser)
 * @param {string} appOutDir
 */
function obfuscateFrontendInApp(appOutDir) {
  const assetsDir = path.join(appOutDir, "resources", "dist", "assets");
  return obfuscateFrontendAssets(assetsDir);
}

/**
 * Obfuscate server bundle inside an electron-builder appOutDir.
 * Target: appOutDir/resources/server/index.js (node)
 * @param {string} appOutDir
 */
function obfuscateServerInApp(appOutDir) {
  const bundlePath = path.join(appOutDir, "resources", "server", "index.js");
  return obfuscateServerBundle(bundlePath);
}

/**
 * Obfuscate both frontend and server in the project source tree (CLI mode).
 * Targets:
 *   - packages/studio/dist/assets/*.js  (browser)
 *   - dist-server/index.js               (node)
 * @param {string} projectDir
 */
function obfuscateProject(projectDir) {
  console.log("[obfuscate] Obfuscating project build outputs in:", projectDir);

  const assetsDir = path.join(projectDir, "packages", "studio", "dist", "assets");
  const bundlePath = path.join(projectDir, "dist-server", "index.js");

  let total = 0, success = 0, failed = 0;

  const fe = obfuscateFrontendAssets(assetsDir);
  total += fe.total; success += fe.success; failed += fe.failed;

  const sv = obfuscateServerBundle(bundlePath);
  total += sv.total; success += sv.success; failed += sv.failed;

  console.log(
    `[obfuscate] Complete: ${success}/${total} obfuscated successfully` +
      (failed > 0 ? `, ${failed} failed (warnings only)` : "")
  );
  return { total, success, failed };
}

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

module.exports = {
  obfuscateFile,
  obfuscateFrontendAssets,
  obfuscateServerBundle,
  obfuscateFrontendInApp,
  obfuscateServerInApp,
  obfuscateProject,
  BROWSER_OPTIONS,
  NODE_OPTIONS,
};

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  obfuscateProject(targetDir);
}
