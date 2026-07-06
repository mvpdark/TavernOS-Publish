import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.tsx";
import { ThemeProvider } from "./components/ThemeProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import "./i18n"; // Initialize i18n (must run before App renders)
import "./index.css";

// Register the service worker for offline/cache support.
// Only enabled in production — never during Vite dev (HMR).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration failures are non-fatal */
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <ErrorBoundary>
          <App />
          <OfflineIndicator />
        </ErrorBoundary>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>
);
