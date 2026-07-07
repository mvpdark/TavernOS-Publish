// TavernOS Electron Main Process
// ---------------------------------------------------------------------------
// Spawns the embedded Hono backend server, shows a splash screen with the
// TAVERNOS loading animation, then loads the main app window.
// On first run, shows an onboarding wizard for disk selection + API key.
//
// NOTE: This file uses CommonJS (require) and has a .cjs extension because
// the root package.json has "type": "module". Electron's main process entry
// must be CommonJS when the package is marked as ESM.
//
// SECURITY NOTE: The Windows installer (NSIS) is currently unsigned. On first
// launch Windows SmartScreen may show a warning. For production distribution,
// sign the installer and executable with a code-signing certificate.

const { app, BrowserWindow, ipcMain, dialog, session, Menu } = require("electron");
const { spawn, execSync, exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");
const net = require("net");

let BACKEND_PORT = 17777; // findAvailablePort() starts scanning from 17777
let backendProcess = null;
let splashWindow = null;
let mainWindow = null;

// ---------------------------------------------------------------------------
// Logging — write to ~/.tavernos/electron.log for diagnostics
// ---------------------------------------------------------------------------
function getLogPath() {
  return path.join(app.getPath("home"), ".tavernos", "electron.log");
}

function logToFile(msg) {
  try {
    const logDir = path.join(app.getPath("home"), ".tavernos");
    fs.mkdirSync(logDir, { recursive: true });
    const ts = new Date().toISOString();
    fs.appendFileSync(getLogPath(), `[${ts}] ${msg}\n`, "utf8");
  } catch (e) {
    // ignore
  }
}

// Resolve icon path based on platform
function getIconPath() {
  if (process.platform === "darwin") {
    return path.join(__dirname, "build", "icon.icns");
  }
  return path.join(__dirname, "build", "icon.ico");
}

// Find an available port starting from BACKEND_PORT
function findAvailablePort(startPort, maxRetries = 100) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      // Port in use, try next (with a retry cap to prevent stack overflow)
      if (maxRetries <= 0) {
        reject(new Error(`No available port found after 100 retries (tried ${startPort})`));
        return;
      }
      resolve(findAvailablePort(startPort + 1, maxRetries - 1));
    });
  });
}

// ---------------------------------------------------------------------------
// Check if this is the first run (no settings.json exists)
// ---------------------------------------------------------------------------
function isFirstRun() {
  const homeDir = app.getPath("home");
  const settingsPath = path.join(homeDir, ".tavernos", "settings.json");
  return !fs.existsSync(settingsPath);
}

// ---------------------------------------------------------------------------
// Wait for backend to be ready
// ---------------------------------------------------------------------------
function waitForBackend(maxRetries = 60) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      const req = http.get(
        `http://127.0.0.1:${BACKEND_PORT}/api/health`,
        (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            retry();
          }
          res.resume();
        }
      );
      req.on("error", () => retry());
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        reject(new Error("Backend failed to start within timeout"));
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

// ---------------------------------------------------------------------------
// Start the embedded backend server
// ---------------------------------------------------------------------------
async function startBackend() {
  // Find an available port (17777 might be in use on some machines)
  BACKEND_PORT = await findAvailablePort(17777);
  logToFile(`Using backend port: ${BACKEND_PORT}`);

  // Expose the resolved backend URL so preload.cjs (getBackendUrl) returns the
  // actual port instead of a hardcoded fallback. Must be set before any window
  // is created so the renderer picks up the correct URL (L11).
  process.env.TAVERNOS_BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

  const isDev = !app.isPackaged;
  const serverPath = isDev
    ? path.join(__dirname, "..", "packages", "studio", "server", "index.ts")
    : path.join(process.resourcesPath, "server", "index.js");
  // In production, use the CommonJS wrapper that sets up native module paths
  // before loading the ESM server bundle. This is necessary because ESM
  // module resolution does NOT honor NODE_PATH.
  // NOTE: NODE_PATH is deprecated but used as a fallback for native module
  // resolution in the packaged app via the CommonJS startup wrapper.
  const startupWrapper = isDev
    ? null
    : path.join(process.resourcesPath, "server-startup.cjs");

  logToFile(`Server path: ${serverPath}`);
  logToFile(`Server exists: ${fs.existsSync(serverPath)}`);
  logToFile(`Startup wrapper: ${startupWrapper}`);
  logToFile(`Startup wrapper exists: ${startupWrapper ? fs.existsSync(startupWrapper) : "N/A"}`);

  const env = {
    ...process.env,
    PORT: String(BACKEND_PORT),
    TAVERNOS_ELECTRON: "1",
  };

  if (isDev) {
    // Dev mode: use tsx to run the TypeScript server
    backendProcess = spawn(
      "npx",
      ["tsx", serverPath],
      {
        cwd: path.join(__dirname, ".."),
        env,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } else {
    // Production: use the bundled standalone Node.js binary to run the server
    // via the CommonJS wrapper. The wrapper sets up require() resolution paths
    // for native modules (better-sqlite3, sharp) before dynamically importing
    // the ESM server bundle.
    // On Windows: resources/node/node.exe
    // On macOS:   resources/node/node
    const nodeExe = process.platform === "win32"
      ? path.join(process.resourcesPath, "node", "node.exe")
      : path.join(process.resourcesPath, "node", "bin", "node");
    logToFile(`Node exe: ${nodeExe}`);
    logToFile(`Node exe exists: ${fs.existsSync(nodeExe)}`);
    backendProcess = spawn(nodeExe, [startupWrapper], {
      cwd: process.resourcesPath,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  backendProcess.stdout?.on("data", (data) => {
    const msg = data.toString().trim();
    console.log(`[backend] ${msg}`);
    logToFile(`[backend] ${msg}`);
  });
  backendProcess.stderr?.on("data", (data) => {
    const msg = data.toString().trim();
    console.error(`[backend] ${msg}`);
    logToFile(`[backend ERROR] ${msg}`);
  });
  backendProcess.on("exit", (code) => {
    console.log(`[backend] exited with code ${code}`);
    logToFile(`[backend] exited with code ${code}`);
    // Handle unexpected backend crashes (non-zero exit while the app is still
    // running and not intentionally quitting). The main window's load will fail
    // and surface the error page; we just log prominently here for diagnostics.
    if (!isQuitting && code !== null && code !== 0) {
      console.error(`[electron] Backend crashed unexpectedly (code ${code}).`);
      logToFile(`[electron] Backend crashed unexpectedly (code ${code}).`);
    }
  });
  backendProcess.on("error", (err) => {
    console.error(`[backend] spawn error: ${err.message}`);
    logToFile(`[backend] spawn error: ${err.message}`);
  });
}

// ---------------------------------------------------------------------------
// Create the splash window with loading animation
// ---------------------------------------------------------------------------
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    resizable: false,
    transparent: false,
    show: true,
    icon: getIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Sandbox enabled: the splash window has no preload and loads only
      // local static HTML, so full Node access is not needed.
      sandbox: true,
    },
  });

  const loadingPath = app.isPackaged
    ? path.join(process.resourcesPath, "dist", "loading.html")
    : path.join(__dirname, "..", "packages", "studio", "public", "loading.html");

  console.log("[electron] Loading splash from:", loadingPath);
  splashWindow.loadFile(loadingPath).catch((err) => {
    console.error("[electron] Failed to load splash:", err);
  });
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Create the main app window
// ---------------------------------------------------------------------------
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#0A0A0A",
    icon: getIconPath(),
    title: "TavernOS",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // Load the app from the backend server (which also serves static files).
  const appURL = `http://127.0.0.1:${BACKEND_PORT}`;
  logToFile(`Loading main window: ${appURL}`);
  mainWindow.loadURL(appURL);

  // Debug: log load events
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    logToFile(`Main window load failed: ${errorCode} ${errorDescription} URL: ${validatedURL}`);
    console.error(`[electron] Main window load failed: ${errorCode} ${errorDescription}`);
    // HTML-escape dynamic values before injecting into the error page to
    // prevent DOM-based injection via crafted error strings.
    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
    const safeCode = escapeHtml(errorCode);
    const safeDesc = escapeHtml(errorDescription);
    // Show error page instead of white screen
    const errorHTML = `<html><body style="background:#0a0a0a;color:#C9A86C;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;margin:0;padding:20px;box-sizing:border-box;">
      <h2 style="margin:0;">加载失败</h2>
      <p style="color:#888;text-align:center;">后端服务未能响应 (端口 ${BACKEND_PORT})</p>
      <p style="color:#555;font-size:12px;text-align:center;">错误代码: ${safeCode} - ${safeDesc}<br>请查看日志: ~/.tavernos/electron.log</p>
      <button onclick="location.reload()" style="background:#C9A86C;color:#0a0a0a;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:14px;">重试</button>
    </body></html>`;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
    setTimeout(() => {
      if (mainWindow) mainWindow.loadURL(appURL);
    }, 3000);
  });

  mainWindow.webContents.on("did-start-loading", () => {
    logToFile("Main window started loading");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    logToFile("Main window finished loading");
  });

  // Force-show the window after 8 seconds even if ready-to-show hasn't fired
  // (prevents the app from appearing stuck if the page loads slowly)
  const forceShowTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      logToFile("Force-showing main window (ready-to-show timeout)");
      console.log("[electron] Force-showing main window (ready-to-show timeout)");
      appReady = true;
      if (splashWindow) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
    }
  }, 8000);

  mainWindow.once("ready-to-show", () => {
    clearTimeout(forceShowTimer);
    logToFile("Main window ready-to-show");
    appReady = true;
    if (splashWindow) {
      // Small delay for smooth transition
      setTimeout(() => {
        splashWindow?.close();
        splashWindow = null;
        mainWindow?.show();
      }, 500);
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Create the onboarding window (first-run wizard)
// ---------------------------------------------------------------------------
function createOnboardingWindow() {
  const onboardingWin = new BrowserWindow({
    width: 640,
    height: 720,
    frame: false,
    resizable: false,
    show: true,
    icon: getIconPath(),
    title: "TavernOS - 初始设置",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Sandbox enabled: preload.cjs only uses contextBridge + ipcRenderer
      // (both available under sandbox), so no full Node access is required.
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // In packaged mode, onboarding.html is in extraResources (outside asar).
  // Using loadFile (Electron's recommended API) for reliable local file loading.
  const onboardingPath = app.isPackaged
    ? path.join(process.resourcesPath, "onboarding.html")
    : path.join(__dirname, "onboarding.html");
  console.log("[electron] Loading onboarding from:", onboardingPath);
  onboardingWin.loadFile(onboardingPath).catch((err) => {
    console.error("[electron] Failed to load onboarding:", err);
  });
  return onboardingWin;
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

// Disable hardware acceleration to prevent black screen issues on some GPUs
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  logToFile("=== TavernOS starting ===");
  logToFile(`isPackaged: ${app.isPackaged}`);

  // Hide the default application menu bar completely
  Menu.setApplicationMenu(null);

  // CSP is set by the backend server (packages/studio/server/index.ts).
  // Do NOT inject another CSP here — duplicate CSP headers cause Chromium
  // to enforce the strictest intersection, which breaks ES Module imports.

  // Start backend in the background (don't block UI on first run)
  await startBackend();
  logToFile("Backend started");

  // Show splash screen immediately
  createSplashWindow();

  // Check if this is the first run BEFORE waiting for backend.
  // On first run, show onboarding immediately so the user doesn't stare
  // at a splash screen for 30 seconds while the backend cold-starts.
  if (isFirstRun()) {
    logToFile("First run detected, showing onboarding immediately");
    console.log("[electron] First run detected, showing onboarding immediately");
    // Small delay for splash to render, then show onboarding
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
        splashWindow = null;
      }
      const onboardingWin = createOnboardingWindow();

      // When onboarding completes, close it and show main window
      ipcMain.once("onboarding-complete", () => {
        logToFile("Onboarding complete");
        onboardingWin.close();
        // Now wait for backend before showing main window
        waitForBackend().then(() => {
          logToFile("Backend ready after onboarding, creating main window");
          createMainWindow();
        }).catch((err) => {
          logToFile(`Backend failed after onboarding: ${err.message}`);
          console.error("[electron] Backend failed after onboarding:", err);
          createMainWindow();
        });
      });

      // If user skips onboarding
      ipcMain.once("onboarding-skip", () => {
        logToFile("Onboarding skipped");
        onboardingWin.close();
        waitForBackend().then(() => {
          logToFile("Backend ready after onboarding skip, creating main window");
          createMainWindow();
        }).catch((err) => {
          logToFile(`Backend failed after onboarding skip: ${err.message}`);
          console.error("[electron] Backend failed after onboarding skip:", err);
          createMainWindow();
        });
      });
    }, 1500);
  } else {
    // Not first run — wait for backend, then show main window
    logToFile("Not first run, waiting for backend");
    try {
      await waitForBackend();
      logToFile("Backend is ready, creating main window");
      console.log("[electron] Backend is ready");
      createMainWindow();
    } catch (err) {
      logToFile(`Failed to start backend: ${err.message}`);
      console.error("[electron] Failed to start backend:", err);
      // Still try to create main window — it will show error page
      createMainWindow();
    }
  }
});

// Quit when all windows are closed — but only if the app is fully initialized.
// During the splash → main window transition there's a brief moment where all
// windows are closed; we must NOT quit during that window.
let isQuitting = false;
let appReady = false;

app.on("window-all-closed", () => {
  logToFile(`window-all-closed fired: appReady=${appReady}, mainWindow=${!!mainWindow}, splashWindow=${!!splashWindow}, backendProcess=${!!backendProcess}`);
  console.log(`[electron] window-all-closed: appReady=${appReady}, mainWindow=${!!mainWindow}, splashWindow=${!!splashWindow}`);
  // Don't quit if backend is still running or we're in a transition
  if (process.platform !== "darwin" && appReady && !mainWindow && !splashWindow) {
    logToFile("All conditions met, quitting app");
    isQuitting = true;
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Clean up backend process on quit
app.on("before-quit", () => {
  isQuitting = true;
  if (backendProcess) {
    try {
      // Kill the backend process tree.
      // On Windows, use taskkill for tree-kill. On macOS/Linux, use SIGTERM.
      if (process.platform === "win32") {
        if (backendProcess.pid) {
          spawn("taskkill", ["/PID", String(backendProcess.pid), "/T", "/F"], {
            shell: true,
          });
        }
      } else {
        // On macOS/Linux, kill the process group (negative PID)
        if (backendProcess.pid) {
          try { process.kill(-backendProcess.pid, "SIGTERM"); } catch {}
          backendProcess.kill("SIGTERM");
        }
      }
    } catch (e) {
      console.error("[electron] Failed to kill backend:", e);
    }
  }
});

// ---------------------------------------------------------------------------
// IPC handlers for onboarding
// ---------------------------------------------------------------------------
ipcMain.handle("get-available-disks", async () => {
  const disks = [];
  if (process.platform === "win32") {
    try {
      const output = await new Promise((resolve, reject) => {
        exec(
          'powershell -Command "Get-CimInstance Win32_LogicalDisk | Select-Object -ExpandProperty Name"',
          { encoding: "utf8", timeout: 10000 },
          (err, stdout) => (err ? reject(err) : resolve(stdout)),
        );
      });
      const letters = output
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^[A-Z]:$/.test(l));
      for (const letter of letters) {
        disks.push({ drive: letter, label: `${letter}\\` });
      }
    } catch {
      for (let i = 67; i <= 90; i++) {
        const letter = String.fromCharCode(i) + ":";
        if (fs.existsSync(letter + "\\")) {
          disks.push({ drive: letter, label: `${letter}\\` });
        }
      }
    }
  } else if (process.platform === "darwin") {
    // macOS: list mounted volumes under /Volumes and home directory
    disks.push({ drive: app.getPath("home"), label: "Home" });
    try {
      const volumes = fs.readdirSync("/Volumes", { withFileTypes: true });
      for (const v of volumes) {
        if (v.isDirectory() || v.isBlockDevice()) {
          const volPath = path.join("/Volumes", v.name);
          disks.push({ drive: volPath, label: v.name });
        }
      }
    } catch {}
  } else {
    // Linux: list /home and /mnt, /media
    disks.push({ drive: app.getPath("home"), label: "Home" });
    for (const mnt of ["/mnt", "/media"]) {
      try {
        const entries = fs.readdirSync(mnt, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory()) {
            disks.push({ drive: path.join(mnt, e.name), label: e.name });
          }
        }
      } catch {}
    }
  }
  return disks;
});

ipcMain.handle("select-disk", async (event, disk) => {
  // Validate the disk argument to prevent path traversal.
  // On Windows: only allow a bare drive letter (e.g. "D:" or "D:\").
  // On macOS/Linux: allow absolute paths under /Volumes, /home, /mnt, /media.
  const isWin = process.platform === "win32";
  const validPath = isWin
    ? /^[A-Za-z]:\\?$/.test(disk)
    : /^(\/(Volumes|home|mnt|media|Users|tmp))([\/][\w\- .]+)*$/.test(disk);
  if (!validPath) {
    event.reply("disk-selected", { error: "Invalid disk" });
    return { success: false, error: "Invalid disk" };
  }
  const folderPath = path.join(disk, "TavernOS");
  try {
    fs.mkdirSync(folderPath, { recursive: true });
    // Create sub-directories
    const subDirs = [
      "Novels",
      "Characters",
      "ConfirmedSlots",
      "ConfirmedSlots/three-views",
      "ConfirmedSlots/realistic/male",
      "ConfirmedSlots/realistic/female",
      "ConfirmedSlots/anime/male",
      "ConfirmedSlots/anime/female",
    ];
    for (const sub of subDirs) {
      fs.mkdirSync(path.join(folderPath, sub), { recursive: true });
    }
    return { success: true, path: folderPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("save-onboarding-config", async (event, config) => {
  const homeDir = app.getPath("home");
  const tavernosDir = path.join(homeDir, ".tavernos");
  const settingsPath = path.join(tavernosDir, "settings.json");

  try {
    fs.mkdirSync(tavernosDir, { recursive: true });

    // Auto-configure recommended agent models for yunwu.
    // Model IDs verified against yunwu.ai provider bank (provider-bank.ts).
    const recommendedAgentModels = {
      architect: "yunwu:claude-opus-4-8",           // 大纲规划 — 2026写作最强
      planner: "yunwu:claude-opus-4-8",             // 大纲规划辅助
      writerSkeleton: "yunwu:kimi-k2.6",            // 骨架阶段 — 256K上下文，保持不变
      writerFlesh: "yunwu:claude-sonnet-4-6",          // 血肉阶段 — Claude Sonnet 4.6
      writer: "yunwu:claude-opus-4-8",              // 全局默认写作 — 最强
      auditor: "yunwu:deepseek-v4-pro",             // 一致性审查 — V4大幅升级，32K输出
      reviser: "yunwu:claude-opus-4-8",             // 修订润色 — 精修需最强文笔
      consolidator: "yunwu:deepseek-v4-pro",        // 汇总 — V4 Pro
      "asset-extractor": "yunwu:gemini-3.1-pro",    // 状态提取 — 2M超长上下文
      consultant: "yunwu:gpt-5.5",                  // 蓝图顾问 — 综合评分93，最均衡
    };

    const settings = {
      service: "yunwu",
      model: "claude-opus-4-8",
      apiKey: config.apiKey || "",
      temperature: 0.7,
      stream: true,
      baseUrl: "https://yunwu.ai/v1",
      storageMode: "local",
      localStorageConfig: {
        path: config.localPath || "",
      },
      providerCredentials: {
        yunwu: {
          apiKey: config.apiKey || "",
        },
      },
      agentModels: recommendedAgentModels,
      ttsConfig: {
        provider: "yunwu",
        apiKey: config.apiKey || "",
        baseUrl: "https://yunwu.ai/v1",
        model: "tts-1",
        voice: "alloy",
        responseFormat: "mp3",
        speed: 1.0,
      },
      imageConfig: {
        provider: "yunwu",
        apiKey: config.apiKey || "",
        baseUrl: "https://yunwu.ai/v1",
        model: "dall-e-3",
      },
      embedderConfig: {
        provider: "yunwu",
        apiKey: config.apiKey || "",
        baseUrl: "https://yunwu.ai/v1",
        model: "text-embedding-3-small",
        dimensions: 1536,
      },
    };

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
    return { success: true, agentModels: recommendedAgentModels };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("close-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle("minimize-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
