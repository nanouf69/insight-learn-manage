import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Voir src/test/canvas-absent.cjs (binaire natif canvas indisponible sous Node 22).
    execArgv: ["--require", path.resolve(__dirname, "./src/test/canvas-absent.cjs")],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
