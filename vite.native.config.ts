import path from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [viteReact(), tailwindcss()],
  root: path.resolve(__dirname, "native"),
  base: "./",
  publicDir: path.resolve(__dirname, "public"),
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    fs: { allow: [path.resolve(__dirname)] },
  },
  build: {
    outDir: path.resolve(__dirname, "native/ios/YolkRush/www"),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
  },
});
