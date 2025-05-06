import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import path from "path";

const buildData = JSON.parse(
  fs.readFileSync(path.resolve("build.json"), "utf8")
);

export default defineConfig({
  base: "/fenix/",
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "docs/index.html",
          dest: ".",
          rename: "404.html",
        },
      ],
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "Fenix App",
        short_name: "Fenix",
        description: "Fenix PWA",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/fenix/",
        start_url: "/fenix/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  define: {
    // Inject build date as a global constant
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __BUILD_NUMBER__: JSON.stringify(buildData.buildNumber),
  },
  build: {
    outDir: "docs",
  },
});
