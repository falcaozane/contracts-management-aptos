import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    build: {
      outDir: "dist",
    },
    server: {
      open: true,
    },
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./frontend"),
      },
    },
    define: {
      'process.env': env
    }
  }
});