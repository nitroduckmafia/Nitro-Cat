import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import os from "os";

export default defineConfig(() => ({
  cacheDir: path.join(os.tmpdir(), "vite-cache"),
  server: {
    host: true,
    port: 8080,
    hmr: { overlay: false },
    headers: {},
  },
  plugins: [react()],
  define: {
    'process.env': JSON.stringify({ NODE_ENV: 'development' }),
    global: 'globalThis',
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
