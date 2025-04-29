import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

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
  ],
  build: {
    outDir: "docs", // Output directory for GitHub Pages
  },
});
