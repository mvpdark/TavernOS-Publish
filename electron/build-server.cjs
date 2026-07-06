// Bundle the backend server into a single JS file for Electron production,
// then obfuscate the output.
const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

async function buildServer() {
  const entry = path.join(__dirname, "..", "packages", "studio", "server", "index.ts");
  const outdir = path.join(__dirname, "..", "dist-server");
  const outfile = path.join(outdir, "index.js");

  // Read version from package.json for compile-time injection
  const pkgPath = path.join(__dirname, "..", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const appVersion = pkg.version || "0.0.0";

  // Ensure output directory exists
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outdir,
    // Inject version at build time so the server doesn't need to read package.json at runtime
    define: {
      "process.env.TAVERNOS_VERSION": JSON.stringify(appVersion),
    },
    // Only keep native modules external — everything else is bundled.
    // This makes the server self-contained except for native binaries
    // (sharp for image processing, better-sqlite3 for vector store).
    external: [
      "sharp",
      "better-sqlite3",
    ],
    sourcemap: false,
    minify: false,
    logLevel: "info",
  });

  console.log("Server bundled to:", outdir);

  // -----------------------------------------------------------------------
  // Obfuscate the server bundle (node target)
  // Skip if TAVERNOS_SKIP_OBFUSCATE is set (useful for debugging builds)
  // -----------------------------------------------------------------------
  if (process.env.TAVERNOS_SKIP_OBFUSCATE) {
    console.log("[build-server] TAVERNOS_SKIP_OBFUSCATE is set — skipping obfuscation");
    return;
  }

  try {
    const { obfuscateServerBundle } = require("./obfuscate-build.cjs");
    console.log("[build-server] Obfuscating server bundle...");
    const result = obfuscateServerBundle(outfile);
    if (result.failed > 0) {
      console.warn("[build-server] WARNING: Server obfuscation reported failures (see above)");
    } else {
      console.log("[build-server] Server bundle obfuscated successfully");
    }
  } catch (err) {
    console.warn("[build-server] WARNING: Obfuscation step failed:", err.message);
    console.warn("[build-server] The unobfuscated bundle will be used instead.");
  }
}

buildServer().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
