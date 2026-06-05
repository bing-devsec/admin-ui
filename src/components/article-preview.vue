<template>
    <!-- PC 模式：直接 v-html，复用前台样式 -->
    <div
        v-if="device === 'pc'"
        ref="root"
        class="article-body-ssr article-preview"
        v-html="html"
    ></div>

    <!-- 移动模式：iframe 模拟设备视口，让 @media 真实生效 -->
    <div v-else class="mobile-frame-wrap">
        <div class="device-shell" :class="{ landscape: orientation === 'landscape' }">
            <div class="device-notch"></div>
            <div class="device-screen" :style="screenStyle">
                <iframe
                    ref="iframeRef"
                    class="device-iframe"
                    :srcdoc="iframeSrcdoc"
                    @load="handleIframeLoad"
                ></iframe>
            </div>
            <div class="device-home"></div>
        </div>
        <div class="device-meta">
            <span v-if="deviceLabel" class="device-meta-label">{{ deviceLabel }}</span>
            <span class="device-meta-size">
                {{ orientation === 'portrait' ? deviceWidth : deviceHeight }} ×
                {{ orientation === 'portrait' ? deviceHeight : deviceWidth }} px
            </span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { renderMarkdownToHtml, prewarmHighlighter } from '../utils/markdown';

const props = withDefaults(
    defineProps<{
        markdown: string;
        debounceMs?: number;
        device?: 'pc' | 'mobile';
        deviceWidth?: number;
        deviceHeight?: number;
        deviceLabel?: string;
        orientation?: 'portrait' | 'landscape';
    }>(),
    {
        debounceMs: 200,
        device: 'pc',
        deviceWidth: 375,
        deviceHeight: 812,
        deviceLabel: '',
        orientation: 'portrait',
    }
);

const root = ref<HTMLElement | null>(null);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const html = ref('');

// ============================================================
// 移动端尺寸：根据竖横屏交换宽高
// ============================================================
const screenStyle = computed(() => {
    const w = props.orientation === 'portrait' ? props.deviceWidth : props.deviceHeight;
    const h = props.orientation === 'portrait' ? props.deviceHeight : props.deviceWidth;
    return { width: `${w}px`, height: `${h}px` };
});

// ============================================================
// 防抖渲染
// ============================================================
let timer: number | undefined;
let renderToken = 0;
async function runRender(src: string) {
    const myToken = ++renderToken;
    const result = await renderMarkdownToHtml(src);
    if (myToken !== renderToken) return;
    html.value = result;
    await nextTick();
    if (props.device === 'pc') {
        void renderMermaidBlocks(root.value);
    } else {
        // 移动端：iframe 通过 srcdoc 重建（响应 iframeSrcdoc 变化），onload 后再绑定
    }
}

watch(
    () => props.markdown,
    (v) => {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
            void runRender(v || '');
        }, props.debounceMs);
    },
    { immediate: true }
);

// ============================================================
// iframe srcdoc：把外层应用已加载的 article.css/katex.css 写到 iframe 中
// ============================================================
const cssLinks = ref<string>('');
function collectCssLinks(): string {
    const links: string[] = [];
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
        if (l.href) {
            // iframe 不需要 element-plus / 后台 base.css，过滤掉以免污染移动预览
            if (/element-plus|\/base\.css/i.test(l.href)) return;
            links.push(`<link rel="stylesheet" href="${l.href}">`);
        }
    });
    document.querySelectorAll<HTMLStyleElement>('style').forEach((s) => {
        if (s.textContent) links.push(`<style>${s.textContent}</style>`);
    });
    return links.join('\n');
}

const iframeSrcdoc = computed(() => {
    if (props.device !== 'mobile') return '';
    const w = props.orientation === 'portrait' ? props.deviceWidth : props.deviceHeight;
    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${w}, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>移动端预览</title>
${cssLinks.value}
<style>
  /* === 复刻 portal-web/assets/base.css 的移动端基础规则 === */
  html { height: 100%; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #fff;
    color: #404040;
    line-height: 1.6;
    /* portal-web base.css @media(max-width:992px): body { font-size: 14px } */
    font-size: 14px;
    word-wrap: break-word;
    word-break: break-all;
    -webkit-text-size-adjust: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* 真机字体回退：小米 MiSans / 鸿蒙 / OPPO / 苹方，最大限度贴近移动端实机 */
    font-family:
      -apple-system, BlinkMacSystemFont,
      "MiSans", "HarmonyOS Sans", "OPPOSans",
      "PingFang SC", "Hiragino Sans GB",
      "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
    /* 复刻文章详情页 <section class="container pt-20"> 在 575px 以下的左右 8px */
    padding: 0 8px;
    box-sizing: border-box;
  }
  /* 复刻文章详情页 .article-detail-section.pt-20 在 max-width:576px 下的 padding-top:0 */
  #ssr-root { padding-top: 0; }
</style>
</head>
<body>
<div class="article-body-ssr" id="ssr-root">${html.value || ''}</div>
</body>
</html>`;
});

// ============================================================
// PC / iframe 通用：代码复制 + 折叠 + Mermaid 渲染
// ============================================================
function setCopyState(btn: HTMLElement, state: 'success' | 'error' | null) {
    if (state) btn.setAttribute('data-copy-state', state);
    else btn.removeAttribute('data-copy-state');
}

function fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch {
        ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
}

function bindCodeCopy(scope: Document | HTMLElement) {
    scope.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        const btn = target.closest('.ssr-code-copy') as HTMLButtonElement | null;
        if (!btn) return;
        const block = btn.closest('.ssr-code-block');
        if (!block) return;
        const codeEl = block.querySelector('pre code') as HTMLElement | null;
        if (!codeEl) return;
        const plain = (codeEl.textContent || '').replace(/\u200B/g, '');
        const onSuccess = () => {
            setCopyState(btn, 'success');
            window.setTimeout(() => setCopyState(btn, null), 1500);
        };
        const onError = () => {
            setCopyState(btn, 'error');
            window.setTimeout(() => setCopyState(btn, null), 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(plain).then(onSuccess, () => {
                if (fallbackCopy(plain)) onSuccess();
                else onError();
            });
        } else if (fallbackCopy(plain)) {
            onSuccess();
        } else {
            onError();
        }
    });
}

function bindCodeToggle(scope: Document | HTMLElement) {
    scope.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        const btn = target.closest('.ssr-code-toggle') as HTMLButtonElement | null;
        if (!btn) return;
        const block = btn.closest('.ssr-code-block') as HTMLElement | null;
        if (!block) return;
        const wasCollapsed = block.getAttribute('data-collapsed') === 'true';
        const nextCollapsed = !wasCollapsed;
        block.setAttribute('data-collapsed', String(nextCollapsed));
        const headBtn = block.querySelector('.ssr-code-toggle--head') as HTMLButtonElement | null;
        if (headBtn) {
            headBtn.setAttribute('aria-expanded', String(!nextCollapsed));
            headBtn.setAttribute('aria-label', nextCollapsed ? '展开代码' : '收起代码');
            headBtn.setAttribute('title', nextCollapsed ? '展开' : '收起');
        }
        const floatingBtn = block.querySelector('.ssr-code-toggle--floating') as HTMLButtonElement | null;
        if (floatingBtn) floatingBtn.setAttribute('aria-expanded', String(!nextCollapsed));
    });
}

// ============================================================
// Mermaid 渲染
// ============================================================
let mermaidLib: typeof import('mermaid').default | null = null;
let mermaidIdCounter = 0;
async function renderMermaidBlocks(scope: HTMLElement | Document | null) {
    if (!scope) return;
    const blocks = scope.querySelectorAll<HTMLDivElement>(
        '.mermaid-block[data-mermaid-rendered="false"]'
    );
    if (blocks.length === 0) return;
    if (!mermaidLib) {
        try {
            const mod = await import('mermaid');
            mermaidLib = mod.default;
            mermaidLib.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
                flowchart: { htmlLabels: true, curve: 'basis' },
            });
        } catch (err) {
            console.error('[mermaid] 加载失败', err);
            return;
        }
    }
    for (const block of Array.from(blocks)) {
        const content = block.querySelector('.mermaid-content') as HTMLElement | null;
        const target = content || block;
        const source = target.querySelector('.mermaid-source')?.textContent || '';
        if (!source.trim()) {
            block.setAttribute('data-mermaid-rendered', 'true');
            continue;
        }
        const id = `mermaid-preview-${Date.now()}-${mermaidIdCounter++}`;
        try {
            const { svg } = await mermaidLib.render(id, source);
            target.innerHTML = svg;
            block.setAttribute('data-mermaid-rendered', 'true');
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            target.innerHTML = `<pre class="mermaid-error">[Mermaid 渲染失败] ${msg}\n\n${source.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</pre>`;
            block.setAttribute('data-mermaid-rendered', 'true');
        }
    }
}

// ============================================================
// iframe 加载完成后：在 iframe 内绑定事件 + 渲染 mermaid
// ============================================================
function handleIframeLoad() {
    const iframe = iframeRef.value;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    bindCodeCopy(doc);
    bindCodeToggle(doc);
    void renderMermaidBlocks(doc.body);
}

// ============================================================
// 生命周期
// ============================================================
onMounted(() => {
    prewarmHighlighter();
    void import('mermaid').catch(() => {});
    cssLinks.value = collectCssLinks();
    if (props.device === 'pc' && root.value) {
        bindCodeCopy(root.value);
        bindCodeToggle(root.value);
    }
});

onBeforeUnmount(() => {
    if (timer) window.clearTimeout(timer);
});
</script>

<style scoped>
.article-preview {
    min-height: 100%;
    background: #fff;
    box-sizing: border-box;
    padding-top: 8px;
    padding-bottom: 24px;
}

/* ============================================================ */
/* 移动端外观壳：模拟 iPhone 风格的圆角 + 顶部刘海 + 底部 Home Bar */
/* ============================================================ */
.mobile-frame-wrap {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 24px 12px;
    box-sizing: border-box;
    background: #f5f7fa;
    overflow: auto;
}

.device-shell {
    position: relative;
    background: #1f1f1f;
    border-radius: 36px;
    padding: 14px 10px 14px;
    box-shadow:
        0 0 0 2px #0a0a0a,
        0 18px 36px rgba(0, 0, 0, 0.18),
        inset 0 0 0 2px #2a2a2a;
    flex-shrink: 0;
}

.device-shell.landscape {
    border-radius: 28px;
    padding: 10px 14px;
}

.device-notch {
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 34%;
    height: 18px;
    background: #0a0a0a;
    border-bottom-left-radius: 14px;
    border-bottom-right-radius: 14px;
    z-index: 2;
    pointer-events: none;
}

.device-shell.landscape .device-notch {
    display: none;
}

.device-home {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 32%;
    height: 4px;
    background: #555;
    border-radius: 2px;
}

.device-shell.landscape .device-home {
    display: none;
}

.device-screen {
    position: relative;
    background: #fff;
    border-radius: 22px;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
}

.device-iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
    background: #fff;
}

.device-meta {
    margin-top: 12px;
    color: #909399;
    font-size: 12px;
    letter-spacing: 0.5px;
    user-select: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.device-meta-label {
    color: #303133;
    font-weight: 500;
}

.device-meta-size {
    color: #909399;
}
</style>
