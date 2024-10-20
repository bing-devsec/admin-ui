import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base:'/',
  transpileDependencies: true,
  server: {
    port: 9999, 
    open: true,
  },
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
