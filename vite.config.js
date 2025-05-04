import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/fenix/", // Use the repo name as the base path
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "docs/index.html",
          dest: ".", // Copies to docs/404.html
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
  build: {
    outDir: "docs", // Output directory for GitHub Pages
  },
});
