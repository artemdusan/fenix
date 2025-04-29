import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/fenix-dual-book-reader/", // Use the repo name as the base path
  plugins: [react()],
  build: {
    outDir: "docs", // Output directory for GitHub Pages
  },
});
