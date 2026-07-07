/**
 * CommonJS startup wrapper for TavernOS backend server.
 *
 * This wrapper solves the native module resolution problem:
 * - esbuild bundles the server as ESM format
 * - Native modules (better-sqlite3, sharp) are in runtime-modules/ directory
 * - ESM module resolution does NOT honor NODE_PATH
 * - The after-pack hook creates a server/node_modules junction, but
 *   we also ensure it exists at runtime as a fallback (in case the
 *   junction was lost during installation)
 */

const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

// __dirname is resources/ (where server-startup.cjs is placed)
const runtimeModulesPath = path.join(__dirname, "runtime-modules");
const serverDir = path.join(__dirname, "server");
const serverNodeModules = path.join(serverDir, "node_modules");

// Ensure server/node_modules symlink exists (created by after-pack, but
// may be lost during installation on some systems).
// On Windows: use "junction" type. On macOS/Linux: use "dir" type.
if (!fs.existsSync(serverNodeModules) && fs.existsSync(runtimeModulesPath)) {
  console.log("[server-startup] Creating server/node_modules link...");
  const symlinkType = process.platform === "win32" ? "junction" : "dir";
  try {
    fs.symlinkSync(runtimeModulesPath, serverNodeModules, symlinkType);
    console.log("[server-startup] Created link successfully");
  } catch (err) {
    console.error("[server-startup] Symlink failed, copying directory...");
    try {
      fs.cpSync(runtimeModulesPath, serverNodeModules, { recursive: true });
      console.log("[server-startup] Copied runtime-modules to server/node_modules");
    } catch (err2) {
      console.error("[server-startup] Copy also failed:", err2.message);
    }
  }
}

// Path to the ESM server bundle
const serverPath = path.join(__dirname, "server", "index.js");
console.log("[server-startup] Loading server from:", serverPath);

// Use dynamic import() to load the ESM bundle
const serverUrl = pathToFileURL(serverPath).href;
import(serverUrl).catch((err) => {
  console.error("[server-startup] Failed to import server:", err);
  process.exit(1);
});
