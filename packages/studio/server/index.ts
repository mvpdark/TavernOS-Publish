// ---------------------------------------------------------------------------
// TavernOS Studio API server entry point.
//
// Route handlers are split into independent modules under routes/, each
// exporting a factory function that returns a Hono sub-app. This file
// assembles them, applies global middleware, and starts the HTTP server.
//
// SECURITY MODEL (L3/L4):
//   This server is designed for the Electron desktop model — it binds to
//   localhost and is accessed only by the local UI. No authentication or
//   authorization middleware is applied because the server is not intended
//   to be exposed to the network. All endpoints (including task management,
//   project CRUD, and settings) are accessible without credentials.
//
//   If you expose this server via a tunnel or reverse proxy for remote
//   access, you MUST add an authentication middleware (e.g. bearer token,
//   session cookie, or HTTP basic auth) before the route registrations
//   below. Without it, any network client can read/modify all project data.
// ---------------------------------------------------------------------------

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { lookup as dnsLookup } from "node:dns/promises";
import { DATA_DIR, ValidationError, cleanupStaleSettingsTmp, cleanupTrashDirs, loadSettings } from "./context";

// ---------------------------------------------------------------------------
// Process-level error handlers — prevent silent crashes from unhandled
// promise rejections or uncaught exceptions. Log and continue serving.
// ---------------------------------------------------------------------------
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  // Do NOT exit — keep the server alive. In production a process manager
  // (systemd / Electron) can restart if the process becomes unresponsive.
});

// ---------------------------------------------------------------------------
// SSRF protection — block requests to private/internal IP ranges.
// Used by the image proxy endpoint to prevent server-side request forgery.
// ---------------------------------------------------------------------------
const PRIVATE_IP_PATTERNS = [
  /^127\./,           // 127.0.0.0/8  loopback
  /^10\./,            // 10.0.0.0/8    private class A
  /^192\.168\./,      // 192.168.0.0/16 private class C
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 private class B
  /^169\.254\./,      // 169.254.0.0/16 link-local
  /^0\./,             // 0.0.0.0/8     "this network"
  /^::1$/,            // IPv6 loopback
  /^fc00:/,           // IPv6 unique local
  /^fe80:/,           // IPv6 link-local
  /^fd/i,             // IPv6 unique local (fc00::/7)
];

/** Check if an IPv4 or IPv6 address falls within a private/reserved range. */
function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((re) => re.test(ip));
}

/** Resolve a hostname and reject if it points to a private IP. */
async function assertPublicHost(hostname: string): Promise<void> {
  // Allow literal IP addresses directly
  const results = await dnsLookup(hostname, { all: true }).catch(() => []);
  if (results.length === 0) {
    // DNS resolution failed — could be a literal IP or invalid host.
    // Check if it's a literal IP and validate it.
    if (isPrivateIp(hostname)) {
      throw new Error("URL resolves to a private address");
    }
    return;
  }
  for (const r of results) {
    if (isPrivateIp(r.address)) {
      throw new Error("URL resolves to a private address");
    }
  }
}
import { createProjectsRouter } from "./routes/projects";
import { createPersonasRouter } from "./routes/personas";
import { createLorebookRouter } from "./routes/lorebook";
import { createStoryRouter } from "./routes/story";
import { createChatRouter } from "./routes/chat";
import { createBlueprintRouter } from "./routes/blueprint";
import { createCreateRouter } from "./routes/create";
import { createSettingsRouter } from "./routes/settings";
import { createImagesRouter } from "./routes/images";
import { createTTSRouter } from "./routes/tts";
import { createVoicesRouter } from "./routes/voices";
import { createVideoRouter } from "./routes/video";
import { createMusicRouter } from "./routes/music";
import { createWorkshopRouter } from "./routes/workshop";
import { createAppearanceRouter } from "./routes/appearance";
import { createGroupChatRouter } from "./routes/group-chat";
import { createPlusRouter } from "./routes/plus";
import { createStorageRouter } from "./routes/storage";
import { createStyleLibraryRouter } from "./routes/style-library";
import { createDeepGameRouter } from "./routes/deepgame";
import { createOAuthRouter } from "./routes/oauth";
import { createTasksRouter } from "./routes/tasks";
import { createSearchRouter } from "./routes/search";
import { startPlusScheduler } from "./plus/scheduler";

// ---------------------------------------------------------------------------
// Version — read once from package.json at startup.
// ---------------------------------------------------------------------------

// Version — read from package.json at startup. Wrapped in try-catch because
// in the Electron packaged app the relative path to package.json may differ.
// Prefer an injected build-time version (esbuild define in build-server.cjs)
// so the packaged server doesn't depend on a relative package.json path.
let VERSION = process.env.TAVERNOS_VERSION || "0.0.0";
if (!process.env.TAVERNOS_VERSION) {
  try {
    VERSION = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ).version as string;
  } catch {
    // Fallback: try reading from the app root (bundled/Electron environment)
    try {
      const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json");
      VERSION = JSON.parse(readFileSync(pkgPath, "utf8")).version as string;
    } catch {
      // Ultimate fallback — version unknown in packaged environment
    }
  }
}

// ---------------------------------------------------------------------------
// Hono app assembly
// ---------------------------------------------------------------------------

const app = new Hono();

/**
 * Precisely validate a request Origin against the allow-list. Matches the
 * host portion only (scheme-agnostic, any port) so that a value like
 * "https://localhost.evil.com" — which the old `origin.includes("localhost")`
 * check accepted — is correctly rejected.
 *
 * Allowed hosts:
 *   - localhost / 127.0.0.1 (any port, dev servers)
 *   - 192.168.x.x (LAN, any port)
 *   - tavernos.mvpdark.top (production Cloudflare tunnel)
 */
function isAllowedOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    // Malformed or missing Origin header — reject.
    return false;
  }
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (host === "tavernos.mvpdark.top") return true;
  return false;
}

// Global CORS for all API routes — allow the production tunnel, local
// development ports (localhost + 127.0.0.1), and any LAN IP (192.168.x.x)
// so the app is reachable from other devices on the same network.
app.use(
  "/api/*",
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
  }),
);

// Security headers — Content-Security-Policy prevents XSS by restricting
// resource loading to same-origin. The 'unsafe-inline' is needed for Vite's
// style injection; 'unsafe-eval' is needed for development HMR.
const isDev = process.env["NODE_ENV"] !== "production";
app.use("*", async (c, next) => {
  await next();
  const headers = c.res.headers;
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  const csp = [
    "default-src 'self'",
    `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: http://127.0.0.1:* ws://127.0.0.1:*",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
  headers.set("Content-Security-Policy", csp);
});

// ---------------------------------------------------------------------------
// Authentication middleware — when the server is exposed beyond localhost
// (e.g. via a Cloudflare tunnel or reverse proxy), API requests must carry a
// bearer token. Requests originating from localhost are always allowed,
// preserving the desktop single-user model. The token is read from the
// TAVERNOS_AUTH_TOKEN environment variable.
// ---------------------------------------------------------------------------
const AUTH_TOKEN = process.env["TAVERNOS_AUTH_TOKEN"];

app.use("/api/*", async (c, next) => {
  // @hono/node-server populates c.env.remoteAddr with { address, port, family }.
  const remoteAddr =
    (c.env as { remoteAddr?: { address?: string } })?.remoteAddr?.address ?? "";

  // Allow loopback addresses (desktop model): 127.0.0.1, ::1, and the
  // IPv4-mapped IPv6 variant. An empty address (e.g. unix socket) is also
  // treated as local.
  if (
    remoteAddr === "127.0.0.1" ||
    remoteAddr === "::1" ||
    remoteAddr === "::ffff:127.0.0.1" ||
    remoteAddr === "localhost" ||
    remoteAddr === ""
  ) {
    await next();
    return;
  }

  // Non-localhost request — require a bearer token.
  if (!AUTH_TOKEN) {
    return c.json(
      { error: "Unauthorized: TAVERNOS_AUTH_TOKEN not configured" },
      401,
    );
  }

  const authHeader = c.req.header("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === AUTH_TOKEN) {
      await next();
      return;
    }
  }

  return c.json({ error: "Unauthorized" }, 401);
});

// Global error handler — catches unhandled errors from all route handlers
// and returns a structured JSON response instead of Hono's default plaintext 500.
// ValidationError (e.g. invalid path segment) is mapped to 400; everything else
// is logged server-side and the client only receives a generic message to avoid
// leaking internal details (file paths, stack info, etc.).
app.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ error: err.message }, 400);
  }
  console.error("[unhandled error]", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", version: VERSION }));

// Image proxy — fetches images from WebDAV (or any URL) and streams them
// to the browser. This avoids exposing the internal WebDAV server to the
// public internet and avoids CORS issues.
//
// Usage: /api/proxy/image?url=<encoded-url>
//
// If the URL points to the configured WebDAV server, the proxy automatically
// adds Basic Auth credentials so the browser doesn't need them.
app.get("/api/proxy/image", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json({ error: "Missing url parameter" }, 400);

  // Only allow http/https URLs
  if (!/^https?:\/\//.test(url)) return c.json({ error: "Invalid URL" }, 400);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return c.json({ error: "Invalid URL" }, 400);
  }

  // Load settings early — we need the WebDAV config for both the trusted-host
  // bypass and the Basic Auth header. Loading once avoids a double read.
  let wdConfig: { url?: string; username?: string; password?: string } | undefined;
  try {
    const settings = await loadSettings();
    wdConfig = settings.webdavConfig;
  } catch {
    // Settings not available — proceed without WebDAV auth
  }

  // Check if this URL points to the user's configured WebDAV server.
  // If so, the host is trusted (the user explicitly configured it) and we
  // skip the SSRF private-IP check — otherwise WebDAV servers on LAN/localhost
  // would be blocked and NO images could load.
  let isWebDAVHost = false;
  if (wdConfig?.url) {
    try {
      const wdOrigin = new URL(wdConfig.url).origin;
      const imgOrigin = parsedUrl.origin;
      isWebDAVHost = wdOrigin === imgOrigin;
    } catch {
      // Invalid WebDAV config URL — treat as non-matching
    }
  }

  // SSRF protection: resolve the hostname and reject private/internal IPs.
  // Applied to ALL URLs (including WebDAV) to prevent SSRF bypass via a
  // user-configured WebDAV host that points to an internal address.
  // Exception: the Cloudflare tunnel domain is always public.
  const isCloudflareTunnel = parsedUrl.hostname === "tavernos.mvpdark.top";
  if (!isCloudflareTunnel) {
    const blockedHosts = ["localhost", "metadata.google.internal"];
    if (blockedHosts.includes(parsedUrl.hostname)) {
      return c.json({ error: "Blocked host" }, 403);
    }
    try {
      await assertPublicHost(parsedUrl.hostname);
    } catch {
      return c.json({ error: "URL resolves to a blocked address" }, 403);
    }
  }

  try {
    // Build request headers — add Basic Auth if the URL is on the WebDAV server
    const headers: Record<string, string> = {};
    if (isWebDAVHost && wdConfig?.username) {
      const auth = Buffer.from(`${wdConfig.username}:${wdConfig.password ?? ""}`).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    if (!res.ok) return c.json({ error: `Upstream ${res.status}` }, res.status as 400);

    // Only proxy image content types — prevent HTML/script smuggling.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return c.json({ error: "Non-image content type" }, 400);
    }

    // Reject oversized images before reading the body into memory.
    const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);
    if (contentLength > 10 * 1024 * 1024) {
      return c.text("Image too large (max 10MB)", 413);
    }

    // Read the full response body into memory. For a desktop app this is
    // acceptable — images are typically < 10 MB. For a server deployment,
    // consider streaming the body instead to reduce memory pressure (L12).
    const buf = await res.arrayBuffer();

    return new Response(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("[proxy] image fetch failed:", e);
    return c.json({ error: "Image proxy failed" }, 502);
  }
});

// Mount route modules
app.route("/", createProjectsRouter());
app.route("/", createPersonasRouter());
app.route("/", createLorebookRouter());
app.route("/", createStoryRouter());
app.route("/", createChatRouter());
app.route("/", createBlueprintRouter());
app.route("/", createCreateRouter());
app.route("/", createSettingsRouter());
app.route("/", createImagesRouter());
app.route("/", createTTSRouter());
app.route("/", createVoicesRouter());
app.route("/", createVideoRouter());
app.route("/", createMusicRouter());
app.route("/", createWorkshopRouter());
app.route("/", createAppearanceRouter());
app.route("/", createGroupChatRouter());
app.route("/", createPlusRouter());
app.route("/", createStorageRouter());
app.route("/", createStyleLibraryRouter());
app.route("/", createDeepGameRouter());
app.route("/", createOAuthRouter());
app.route("/", createTasksRouter());
app.route("/", createSearchRouter());

// ---------------------------------------------------------------------------
// Static file serving — serve the built frontend (dist/) from the same origin
// as the API. This eliminates the Vite dev-server proxy entirely, which was
// buffering SSE streaming responses and causing chat to "freeze".
//
// In production, the frontend is pre-built into packages/studio/dist/ and
// served here. During development, run `npx vite build` to regenerate.
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");

if (existsSync(distDir)) {
  // Serve static assets (js, css, images, etc.) with long cache.
  app.get("/assets/*", (c) => {
    const filePath = join(distDir, c.req.path.slice(1));
    if (!existsSync(filePath) || !statSync(filePath).isFile()) return c.notFound();
    // Synchronous read is acceptable for a desktop app serving local static
    // assets — files are small and the event loop impact is negligible (L11).
    const buf = readFileSync(filePath);
    const ext = filePath.split(".").pop() ?? "";
    const types: Record<string, string> = {
      js: "application/javascript",
      css: "text/css",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      svg: "image/svg+xml",
      ico: "image/x-icon",
      woff: "font/woff",
      woff2: "font/woff2",
      json: "application/json",
    };
    return new Response(buf, {
      headers: {
        "Content-Type": types[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  });

  // SPA fallback: serve static files from dist/ if they exist, otherwise
  // return index.html for client-side routing.
  app.get("*", (c) => {
    // Skip API routes — they're already mounted above.
    if (c.req.path.startsWith("/api/")) return c.notFound();

    // Check if the requested path is a real file in dist/
    const filePath = join(distDir, c.req.path.slice(1));
    // Prevent path traversal: resolved path must be inside distDir
    // Also ensure it's a file, not a directory (existsSync returns true for dirs too)
    if (existsSync(filePath) && !filePath.endsWith(".html") && (filePath === distDir || filePath.startsWith(distDir + sep))) {
      const stat = statSync(filePath);
      if (!stat.isFile()) {
        // Not a regular file (could be a directory) — fall through to SPA fallback
      } else {
      // Synchronous read — acceptable for desktop app static file serving (L11).
      const buf = readFileSync(filePath);
      const ext = filePath.split(".").pop() ?? "";
      const types: Record<string, string> = {
        js: "application/javascript",
        css: "text/css",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        ico: "image/x-icon",
        woff: "font/woff",
        woff2: "font/woff2",
        json: "application/json",
        webp: "image/webp",
        avif: "image/avif",
      };
      return new Response(buf, {
        headers: {
          "Content-Type": types[ext] ?? "application/octet-stream",
          "Cache-Control": "public, max-age=86400",
        },
      });
      }
    }

    // Fallback to index.html for SPA client-side routing
    const indexPath = join(distDir, "index.html");
    if (!existsSync(indexPath)) return c.notFound();
    // Synchronous read — acceptable for desktop app SPA fallback (L11).
    const html = readFileSync(indexPath, "utf-8");
    return c.html(html);
  });
}

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

const port = Number(process.env["PORT"] ?? 17777);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`TavernOS Studio API server running on http://localhost:${info.port}`);
  console.log(`Data directory: ${DATA_DIR}`);
  if (AUTH_TOKEN) {
    console.log(`Auth: TAVERNOS_AUTH_TOKEN is set (length: ${AUTH_TOKEN.length})`);
  } else {
    console.log("Auth: TAVERNOS_AUTH_TOKEN not set — 非 localhost 请求已被拒绝");
  }
  // Best-effort: remove a leftover settings .tmp file from a previous crash.
  void cleanupStaleSettingsTmp();
  // Best-effort: remove tombstone folders left by project deletions blocked
  // by Windows file locks on the previous run.
  void cleanupTrashDirs();
  // Start the Plus module daily scheduler (silent, unref'd timer).
  startPlusScheduler();
});
