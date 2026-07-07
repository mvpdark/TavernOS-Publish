// electron/after-pack.cjs
// After electron-builder packs the app into win-unpacked, this hook:
// 1. Removes broken directories/junctions that 7-Zip can't archive
// 2. Ensures runtime-modules has real files (not broken junctions)
// 3. Recursively scans resources/ for any broken entries
// 4. Flips Electron Fuses on the packaged binary for production security
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

module.exports = async function (context) {
  const resourcesDir = path.join(context.appOutDir, "resources");
  const projectDir = context.packager.info.projectDir;

  console.log("[after-pack] Starting cleanup...");

  // 0. Obfuscate frontend JS assets and server bundle in the packed app
  try {
    const { obfuscateFrontendInApp, obfuscateServerInApp } = require("./obfuscate-build.cjs");
    console.log("[after-pack] Obfuscating frontend assets in app output...");
    const feResult = obfuscateFrontendInApp(context.appOutDir);
    if (feResult.failed > 0) {
      console.warn(`[after-pack] WARNING: ${feResult.failed} frontend file(s) failed to obfuscate`);
    } else {
      console.log(`[after-pack] Frontend obfuscation complete: ${feResult.success} file(s)`);
    }
    console.log("[after-pack] Obfuscating server bundle in app output...");
    const svResult = obfuscateServerInApp(context.appOutDir);
    if (svResult.failed > 0) {
      console.warn(`[after-pack] WARNING: Server bundle obfuscation reported failures`);
    } else {
      console.log(`[after-pack] Server bundle obfuscation complete`);
    }
  } catch (err) {
    console.warn("[after-pack] WARNING: Obfuscation step failed:", err.message);
    console.warn("[after-pack] Continuing with unobfuscated assets.");
  }

  // 1. Always remove and re-copy runtime-modules to ensure real files
  const runtimeModulesDir = path.join(resourcesDir, "runtime-modules");
  const sourceRuntimeModules = path.join(projectDir, "electron", "runtime-modules");

  forceRemove(runtimeModulesDir, "runtime-modules");

  if (fs.existsSync(sourceRuntimeModules)) {
    console.log("[after-pack] Copying runtime-modules from source...");
    copyDirSync(sourceRuntimeModules, runtimeModulesDir);

    let fileCount = 0;
    function count(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isFile()) fileCount++;
        if (e.isDirectory()) count(path.join(d, e.name));
      }
    }
    count(runtimeModulesDir);
    console.log("[after-pack] runtime-modules copied:", fileCount, "files");
  }

  // 2. Recursively scan resources/ for broken entries and fix them
  scanAndFix(resourcesDir, "resources");

  // 3. Create server/node_modules symlink pointing to runtime-modules
  // This is critical: the ESM server bundle can't find native modules
  // (better-sqlite3, sharp) via NODE_PATH (ESM ignores it). By creating
  // a node_modules link inside the server/ directory, Node.js's
  // standard module resolution will find them.
  // On Windows: "junction" (no admin rights needed). On macOS/Linux: "dir".
  const serverDir = path.join(resourcesDir, "server");
  const serverNodeModules = path.join(serverDir, "node_modules");
  const runtimeModulesDir2 = path.join(resourcesDir, "runtime-modules");

  try {
    // Remove existing node_modules if present
    try { fs.rmSync(serverNodeModules, { recursive: true, force: true }); } catch {}
    // Create symlink (junction on Windows, dir on macOS/Linux)
    const symlinkType = context.electronPlatformName === "win32" ? "junction" : "dir";
    fs.symlinkSync(runtimeModulesDir2, serverNodeModules, symlinkType);
    console.log(`[after-pack] Created server/node_modules ${symlinkType} -> runtime-modules`);
  } catch (err) {
    console.error("[after-pack] Failed to create symlink:", err.message);
    // Fallback: copy runtime-modules into server/node_modules
    try {
      copyDirSync(runtimeModulesDir2, serverNodeModules);
      console.log("[after-pack] Copied runtime-modules to server/node_modules");
    } catch (err2) {
      console.error("[after-pack] Failed to copy runtime-modules:", err2.message);
    }
  }

  // 4. Flip Electron Fuses on the packaged binary for production security
  await flipElectronFuses(context);

  console.log("[after-pack] Cleanup complete");
};

/**
 * Flip Electron Fuses on the packaged binary for production security.
 *
 * Fuses are embedded in the Electron binary and read at startup (before
 * any JavaScript executes), so they CANNOT be set at runtime via
 * app.whenReady(). They must be flipped at build time using
 * @electron/fuses' flipFuses() on the packaged executable.
 *
 * Hardening applied:
 *  - RunAsNode=false            blocks ELECTRON_RUN_AS_NODE env var
 *  - EnableCookieEncryption=true  encrypts cookies on disk via OS keychain
 *  - NodeOptions=false          ignores the NODE_OPTIONS environment variable
 *  - NodeCliInspect=false       blocks --inspect / --inspect-brk flags
 *  - EmbeddedAsarIntegrityValidation=true  validates asar hash at launch
 *  - OnlyLoadAppFromAsar=true   prevents loading app code from a plain folder
 *  - LoadBrowserProcessSpecificV8Snapshot=false
 *  - GrantFileProtocolExtraPrivileges=false  restricts file:// protocol power
 */
async function flipElectronFuses(context) {
  let fuses;
  try {
    fuses = require("@electron/fuses");
  } catch {
    console.warn(
      "[after-pack] @electron/fuses is not installed — skipping fuse flipping.\n" +
      "             Install it with: pnpm add -D @electron/fuses"
    );
    return;
  }

  const { flipFuses, FuseVersion, FuseV1Options } = fuses;

  // Resolve the path to the packaged Electron executable.
  // On Windows: <productName>.exe inside appOutDir.
  // On macOS:   Contents/MacOS/<productName> inside the .app bundle.
  // On Linux:   <productName> inside appOutDir.
  const platform = context.electronPlatformName;
  let electronBinaryPath;
  if (platform === "win32") {
    electronBinaryPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  } else if (platform === "darwin") {
    // appOutDir on macOS is the .app bundle directory
    electronBinaryPath = path.join(
      context.appOutDir,
      "Contents",
      "MacOS",
      context.packager.appInfo.productFilename
    );
  } else {
    electronBinaryPath = path.join(context.appOutDir, context.packager.appInfo.productFilename);
  }

  console.log("[after-pack] Flipping Electron fuses:", electronBinaryPath);

  await flipFuses(electronBinaryPath, {
    version: FuseVersion.V1,
    resetAdditionalELFuses: true,
    // Prevent ELECTRON_RUN_AS_NODE from spawning a raw Node.js process
    [FuseV1Options.RunAsNode]: false,
    // Encrypt cookies stored on disk using OS-level key management
    [FuseV1Options.EnableCookieEncryption]: true,
    // Ignore the NODE_OPTIONS environment variable entirely
    [FuseV1Options.NodeOptions]: false,
    // Block --inspect / --inspect-brk command-line flags (debugger attach)
    [FuseV1Options.NodeCliInspect]: false,
    // Validate the integrity of the embedded asar archive at launch
    [FuseV1Options.EmbeddedAsarIntegrityValidation]: true,
    // Only allow loading the app from an asar archive, not a plain folder
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    // Do not load a browser-process-specific V8 snapshot
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    // Do not grant the file:// protocol extra privileges
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });

  console.log("[after-pack] Electron fuses flipped successfully");
}

/**
 * Recursively scan a directory for broken entries (junctions/symlinks
 * with missing targets). Remove broken entries and create empty
 * directories as replacements so 7-Zip can archive without warnings.
 */
function scanAndFix(dir, label) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    // Check if the entry is accessible via statSync (follows symlinks)
    let isBroken = false;
    try {
      fs.statSync(entryPath);
    } catch {
      isBroken = true;
    }

    if (isBroken) {
      console.log(`[after-pack] Fixing broken entry: ${label}/${entry.name}`);
      forceRemove(entryPath, entry.name);

      // Create an empty directory as replacement (7-Zip can archive empty dirs)
      try {
        fs.mkdirSync(entryPath, { recursive: true });
        console.log(`[after-pack] Created empty dir: ${label}/${entry.name}`);
      } catch {
        // If we can't create a directory, that's fine — the entry is gone
      }
    } else if (entry.isDirectory()) {
      // Recurse into subdirectories
      scanAndFix(entryPath, `${label}/${entry.name}`);
    }
  }
}

/**
 * Force-remove a directory or junction using multiple strategies.
 * Works cross-platform (Windows uses `rd`, macOS/Linux uses `rm -rf`).
 */
function forceRemove(dirPath, label) {
  // Check if the entry exists (lstat doesn't follow symlinks)
  let exists;
  try {
    fs.lstatSync(dirPath);
    exists = true;
  } catch {
    exists = false;
  }

  if (!exists) return;

  // Strategy 1: rename then delete (most reliable for broken junctions/symlinks)
  try {
    const trash = dirPath + ".trash." + Date.now();
    fs.renameSync(dirPath, trash);
    try { fs.rmSync(trash, { recursive: true, force: true }); } catch {}
    if (process.platform === "win32") {
      try { execSync(`rd /s /q "${trash}"`, { stdio: "ignore" }); } catch {}
    } else {
      try { execSync(`rm -rf "${trash}"`, { stdio: "ignore" }); } catch {}
    }
    console.log(`[after-pack] Removed ${label} via rename`);
    return;
  } catch {}

  // Strategy 2: fs.rmSync
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`[after-pack] Removed ${label} via rmSync`);
    return;
  } catch {}

  if (process.platform === "win32") {
    // Strategy 3: cmd rmdir (for junctions, without /s)
    try {
      execSync(`rmdir "${dirPath}"`, { stdio: "ignore" });
      console.log(`[after-pack] Removed ${label} via rmdir`);
      return;
    } catch {}

    // Strategy 4: cmd rd /s /q
    try {
      execSync(`rd /s /q "${dirPath}"`, { stdio: "ignore" });
      console.log(`[after-pack] Removed ${label} via rd`);
      return;
    } catch {}
  } else {
    // Strategy 3 (macOS/Linux): rm -rf
    try {
      execSync(`rm -rf "${dirPath}"`, { stdio: "ignore" });
      console.log(`[after-pack] Removed ${label} via rm -rf`);
      return;
    } catch {}
  }

  console.log(`[after-pack] WARNING: Could not remove ${label}`);
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
