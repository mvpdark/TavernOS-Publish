// TavernOS Electron Preload Script
// Exposes a safe IPC bridge to the renderer process.
// NOTE: .cjs extension because root package.json has "type": "module".
//
// SECURITY: Each exposed method delegates to ipcRenderer.invoke/send, which
// crosses the context-isolation boundary. The main process handlers are
// responsible for validating all arguments received from the renderer (see
// the path-validation guard in the "select-disk" handler in main.cjs).
// No raw Node APIs or filesystem access are exposed to the renderer.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tavernosAPI", {
  // Onboarding
  getAvailableDisks: () => ipcRenderer.invoke("get-available-disks"),
  // `disk` is validated in the main process handler (must match ^[A-Za-z]:\\?$).
  selectDisk: (disk) => ipcRenderer.invoke("select-disk", disk),
  // `config` is an opaque onboarding payload consumed by the main process.
  saveOnboardingConfig: (config) => ipcRenderer.invoke("save-onboarding-config", config),
  onboardingComplete: () => ipcRenderer.send("onboarding-complete"),
  onboardingSkip: () => ipcRenderer.send("onboarding-skip"),

  // Window controls
  closeWindow: () => ipcRenderer.invoke("close-window"),
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),

  // Backend info — prefer an env-injected URL so the port can be overridden;
  // fall back to the default backend port. The renderer otherwise talks to the
  // backend via relative "/api" paths, so this is mainly for onboarding.
  getBackendUrl: () => process.env.TAVERNOS_BACKEND_URL || "http://127.0.0.1:17777",
});
