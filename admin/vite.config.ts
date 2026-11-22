import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Ecorex Admin build: independent of the PWA (no service worker, no manifest).
export default defineConfig({
  root: "admin", // scripts always run from the repo root
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  server: { port: 5174, proxy: { "/api": "http://localhost:8789" } },
});
