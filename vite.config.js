import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Vite 会传入 { command, mode }
//   command: 'serve' = npm run dev / 'build' = npm run build
//   mode:    'development' / 'production'（默认）
//
// 部署说明：
//   - 本地开发（npm run dev）：自动启用 /api 代理转发到 http://localhost:8080
//   - 线上构建（npm run build）：不打包代理配置，由线上 nginx 把 /api 转发到 meta-api 容器
//   切换方式：无需手动改配置，跑命令即可。
export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    base: "/",
    transpileDependencies: true,
    plugins: [vue()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 4000,
      open: true,
      // 代理仅在本地开发时启用，线上构建产物不包含此配置
      ...(isDev && {
        proxy: {
          "/api": {
            target: "http://localhost:8080",
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ""),
          },
        },
      }),
    },
  };
});
