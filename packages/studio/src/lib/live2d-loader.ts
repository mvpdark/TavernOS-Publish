// live2d-loader.ts
// ---------------------------------------------------------------------------
// CDN-based loader for PIXI.js v7 + pixi-live2d-display + Cubism Core.
//
// Avoids the massive npm install (pixi.js has 800+ sub-packages) by loading
// the libraries from CDN at runtime. Scripts are loaded once and cached.
//
// Each library has a primary + fallback CDN URL. If the primary fails or
// times out, the fallback is tried automatically.
//
// Loading order (matters!):
//   1. Cubism Core SDK (provides window.Live2DCubismCore)
//   2. PIXI.js v7 (provides window.PIXI)
//   3. pixi-live2d-display Cubism4 build (registers on PIXI.live2d namespace)
// ---------------------------------------------------------------------------

/** Primary + fallback CDN URLs for each library. */
const CDN_URLS = {
  cubismCore: [
    "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
    "https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Core/live2dcubismcore.min.js",
  ],
  pixi: [
    "https://cdn.jsdelivr.net/npm/pixi.js@7.4.3/dist/pixi.min.js",
    "https://unpkg.com/pixi.js@7.4.3/dist/pixi.min.js",
  ],
  live2dDisplay: [
    // Cubism4 build includes Live2DModel class; index.min.js only has core/config
    "https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js",
    "https://unpkg.com/pixi-live2d-display@0.4.0/dist/cubism4.min.js",
  ],
} as const;

/** Maximum time to wait for a single CDN script to load (15 seconds). */
const SCRIPT_TIMEOUT_MS = 15_000;

/** Track which scripts have been loaded (dedup across calls). */
const loadedScripts = new Map<string, Promise<void>>();

/**
 * Inject a <script> tag into the document head and resolve when loaded.
 * If the same URL was already requested, return the cached promise.
 *
 * Includes a timeout to prevent infinite loading if a CDN is unreachable.
 */
function loadScript(url: string): Promise<void> {
  const cached = loadedScripts.get(url);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      loadedScripts.delete(url);
      script.onload = null;
      script.onerror = null;
      if (script.parentNode) script.parentNode.removeChild(script);
      reject(new Error(`Script load timeout (${SCRIPT_TIMEOUT_MS}ms): ${url}`));
    }, SCRIPT_TIMEOUT_MS);

    script.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve();
    };
    script.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      loadedScripts.delete(url); // allow retry
      if (script.parentNode) script.parentNode.removeChild(script);
      reject(new Error(`Failed to load script: ${url}`));
    };
    document.head.appendChild(script);
  });

  loadedScripts.set(url, promise);
  return promise;
}

/**
 * Try loading a library from multiple CDN URLs in order.
 * Resolves on the first successful load; rejects only if all URLs fail.
 */
async function loadWithFallback(urls: readonly string[]): Promise<void> {
  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      await loadScript(url);
      return; // success
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Try next fallback URL
    }
  }
  throw lastError ?? new Error("All CDN URLs failed");
}

/**
 * True if all three Live2D runtime libraries are available on window.
 *
 * Checks not only for PIXI and Live2DCubismCore globals, but also verifies
 * that pixi-live2d-display has registered Live2DModel (either on PIXI directly
 * or on the PIXI.live2d namespace, depending on the build format).
 */
function isLive2DAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  if (typeof w.PIXI === "undefined") return false;
  if (typeof w.Live2DCubismCore === "undefined") return false;
  // pixi-live2d-display UMD build registers on PIXI.live2d.Live2DModel,
  // while the ESM build registers on PIXI.Live2DModel. Check both.
  const pixi = w.PIXI as Record<string, unknown> | undefined;
  if (!pixi) return false;
  if (typeof pixi.Live2DModel !== "undefined") return true;
  const live2dNs = pixi.live2d as Record<string, unknown> | undefined;
  if (live2dNs && typeof live2dNs.Live2DModel !== "undefined") return true;
  return false;
}

/**
 * Ensure Live2DModel is accessible at PIXI.Live2DModel.
 *
 * The UMD CDN build of pixi-live2d-display registers Live2DModel on
 * PIXI.live2d.Live2DModel, not PIXI.Live2DModel. This function aliases
 * it so the rest of the code can use PIXI.Live2DModel uniformly.
 */
function ensureLive2DModelAlias(): void {
  const w = window as unknown as { PIXI: Record<string, unknown> };
  const pixi = w.PIXI;
  if (!pixi) return;
  if (typeof pixi.Live2DModel !== "undefined") return; // already aliased
  const live2dNs = pixi.live2d as Record<string, unknown> | undefined;
  if (live2dNs && typeof live2dNs.Live2DModel !== "undefined") {
    pixi.Live2DModel = live2dNs.Live2DModel;
  }
}

/** Loading state promise — prevents duplicate concurrent loads. */
let loadingPromise: Promise<void> | null = null;

/**
 * Ensure all Live2D runtime libraries are loaded (idempotent).
 * Safe to call multiple times — returns the cached promise if already loading.
 *
 * Each library has a primary + fallback CDN. If the primary fails or times
 * out, the fallback URL is tried automatically before giving up.
 *
 * @throws Error if all CDN URLs fail for any library.
 */
export function ensureLive2DLoaded(): Promise<void> {
  if (isLive2DAvailable()) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    // 1. Cubism Core (must load first — provides the core runtime)
    await loadWithFallback(CDN_URLS.cubismCore);

    // 2. PIXI.js v7
    await loadWithFallback(CDN_URLS.pixi);

    // 3. pixi-live2d-display Cubism4 build (registers on PIXI.live2d namespace)
    await loadWithFallback(CDN_URLS.live2dDisplay);

    // 4. Alias PIXI.live2d.Live2DModel → PIXI.Live2DModel for uniform access
    ensureLive2DModelAlias();

    // Verify all globals are present, including Live2DModel registration
    if (!isLive2DAvailable()) {
      throw new Error("Live2D libraries loaded but globals or Live2DModel not found");
    }
  })().catch((err) => {
    loadingPromise = null; // reset on failure so caller can retry
    throw err;
  });

  return loadingPromise;
}

/** Check if Live2D is already loaded without triggering a load. */
export function isLive2DReady(): boolean {
  return isLive2DAvailable();
}
