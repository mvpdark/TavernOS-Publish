import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      // Allow deep imports from @tavernos/core/dist/* for pure-data modules
      // In pnpm workspace, @tavernos/core is symlinked to the actual package
      "@tavernos/core/dist": path.resolve(__dirname, "../core/dist"),
    },
  },
  server: {
    port: 17776,
    host: "0.0.0.0",
    allowedHosts: ["tavernos.mvpdark.top", "localhost", "127.0.0.1"],
    proxy: {
      "/api": "http://localhost:17777",
    },
  },
});
