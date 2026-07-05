/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // TODO: real app icons haven't been designed yet — add icon-192.png /
      // icon-512.png under public/icons/ and list them here once they exist.
      manifest: {
        name: "Ecorex",
        short_name: "Ecorex",
        description: "Colecciona dinosaurios emocionales — descubre, colecciona, comparte.",
        theme_color: "#0d1a0f",
        background_color: "#0d1a0f",
        display: "standalone",
        start_url: "/",
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
