import { fileURLToPath, URL } from 'node:url';

import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';

function katexWoff2Only(): Plugin {
    const fallbackFontSources =
        /,url\([^)]+\.woff\) format\("woff"\),url\([^)]+\.ttf\) format\("truetype"\)/g;

    return {
        name: 'katex-woff2-only',
        enforce: 'pre',
        transform(code, id) {
            if (!id.split('?')[0].endsWith('/katex/dist/katex.min.css')) return;
            return code.replace(fallbackFontSources, '');
        },
    };
}

const MERMAID_MODULE_PATHS = [
    '/node_modules/mermaid/',
    '/node_modules/@mermaid-js/',
];

// Vite 会传入 { command, mode }
//   command: 'serve' = npm run dev / 'build' = npm run build
//   mode:    'development' / 'production'（默认）
//
// 部署说明：
//   - 本地开发（npm run dev）：自动启用 /api 代理转发到 http://localhost:8080
//   - 线上构建（npm run build）：不打包代理配置，由线上 nginx 把 /api 转发到 meta-api 容器
//   切换方式：无需手动改配置，跑命令即可。
export default defineConfig(({ command }) => {
    const isDev = command === 'serve';

    return {
        base: '/',
        plugins: [vue(), katexWoff2Only()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        server: {
            port: 4000,
            open: true,
            // 代理仅在本地开发时启用，线上构建产物不包含此配置
            ...(isDev && {
                proxy: {
                    '/api': {
                        target: 'http://localhost:8080',
                        changeOrigin: true,
                        rewrite: (path: string) => path.replace(/^\/api/, ''),
                    },
                },
            }),
        },
        build: {
            cssCodeSplit: false,
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('vite/preload-helper')) {
                            return 'vite-preload';
                        }
                        if (id.includes('/node_modules/dayjs/')) {
                            return 'dayjs';
                        }
                        if (id.includes('/node_modules/katex/')) {
                            return 'katex';
                        }
                        if (
                            id.includes('/node_modules/lodash-es/') ||
                            id.includes('/node_modules/lodash-unified/')
                        ) {
                            return 'lodash';
                        }
                        if (MERMAID_MODULE_PATHS.some((path) => id.includes(path))) {
                            return 'mermaid';
                        }
                    },
                },
            },
        },
    };
});
