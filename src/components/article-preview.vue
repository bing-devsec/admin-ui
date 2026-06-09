<template>
    <!-- PC 模式：直接 v-html，复用前台样式 -->
    <div
        v-if="device === 'pc'"
        ref="root"
        class="article-body-ssr article-preview"
        v-html="html"
    ></div>

    <!-- 移动模式：iframe 模拟设备视口，让 @media 真实生效 -->
    <div
        v-else
        ref="wrapRef"
        class="mobile-frame-wrap fit-portrait"
    >
        <div
            class="device-shell"
            :class="[`device-shell--${device}`]"
            :style="shellStyle"
        >
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
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { renderMarkdownToHtml, prewarmHighlighter } from '../utils/markdown';

const props = withDefaults(
    defineProps<{
        markdown: string;
        debounceMs?: number;
        device?: 'pc' | 'phone' | 'tablet';
        deviceWidth?: number;
        deviceHeight?: number;
    }>(),
    {
        debounceMs: 200,
        device: 'pc',
        deviceWidth: 375,
        deviceHeight: 812,
    }
);

const root = ref<HTMLElement | null>(null);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const wrapRef = ref<HTMLElement | null>(null);
const html = ref('');

// ============================================================
// 移动端尺寸：直接用 props 配置的设备宽高（统一竖屏）
// ============================================================
const screenStyle = computed(() => ({
    width: `${props.deviceWidth}px`,
    height: `${props.deviceHeight}px`,
}));

// ============================================================
// 自适应缩放：按外层可用空间等比缩，<1 才缩，>=1 不放大
// 保证不出现外层滚动条
// ============================================================
const shellScale = ref(1);
const shellStyle = computed(() => ({
    transform: `scale(${shellScale.value})`,
    transformOrigin: 'center center',
}));

// ============================================================
// 计算缩放：以 wrap 实际尺寸 / 外壳自然尺寸为比例，<1 才缩，>=1 不放大
// ============================================================
// 外壳自然尺寸 = 屏幕宽 + 横向 padding(10*2) + 高度 padding(14*2)（手机）
// 平板：左右上下各 16，所以横纵向 padding 总和都是 32
const PHONE_FRAME_W = 20; // 手机：14*2 padding 横向是 10*2 = 20
const PHONE_FRAME_H = 28; // 手机：14 + 14 padding
const TABLET_FRAME_W = 32;
const TABLET_FRAME_H = 32;
function recalcScale() {
    const wrap = wrapRef.value;
    if (!wrap) return;
    const availW = wrap.clientWidth - 24;   // wrap 左右 padding 12*2
    const availH = wrap.clientHeight - 16;  // wrap 上下 padding 8*2
    const frameW = props.device === 'tablet' ? TABLET_FRAME_W : PHONE_FRAME_W;
    const frameH = props.device === 'tablet' ? TABLET_FRAME_H : PHONE_FRAME_H;
    const naturalW = props.deviceWidth + frameW;
    const naturalH = props.deviceHeight + frameH;
    if (availW <= 0 || availH <= 0) return;
    const s = Math.min(availW / naturalW, availH / naturalH, 1);
    shellScale.value = Math.max(s, 0.2);
}

let resizeObserver: ResizeObserver | null = null;
watch(
    () => [props.device, props.deviceWidth, props.deviceHeight],
    () => nextTick().then(recalcScale)
);

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
    if (props.device === 'pc') return '';
    const w = props.deviceWidth;
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
<scr` + `ipt>
  // srcdoc iframe 下，<a href="#fn1"> 等锚点会因为 base URL 回退到父页面而触发整页导航。
  // 这里拦截所有以 # 开头的链接，自己用 window.scrollTo 实现 iframe 内的页内跳转。
  // 注意不能用 scrollIntoView：浏览器会沿祖先链触发外层 admin-ui 的滚动调整，
  // 当 iframe 内部不需要滚动时（body 高度 <= 视口），父页面会把 iframe 整体往上顶。
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document) {
      if (t.tagName === 'A') {
        var href = t.getAttribute('href') || '';
        if (href.charAt(0) === '#' && href.length > 1) {
          e.preventDefault();
          var id = decodeURIComponent(href.slice(1));
          var el = document.getElementById(id);
          if (el) {
            var se = document.scrollingElement || document.documentElement;
            // 只有 iframe 内部确实可滚动时才滚动；否则什么都不做（避免外层 device-shell 被顶动）
            if (se && se.scrollHeight > se.clientHeight) {
              var top = el.getBoundingClientRect().top + se.scrollTop;
              se.scrollTo({ top: top, behavior: 'smooth' });
            }
            try { history.replaceState(null, '', '#' + id); } catch (_) {}
          }
          return;
        }
      }
      t = t.parentNode;
    }
  });
<` + `/script>
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
// 代码块全屏 / 表格全屏 / Mermaid 全屏（移植自 portal-web）
// ------------------------------------------------------------
// 设计要点（admin-ui 改造）：
// 1) 蒙层挂在「设备屏幕 / 预览容器」内部，不再覆盖整个浏览器视口
//    - PC 模式 → root（.article-preview）
//    - 手机/平板 → wrapRef 内的 .device-screen（在设备屏幕里全屏）
// 2) 事件 handler 接受 scope: Document —— 用于 closest 查询源块
//    （PC 模式 = 外层 document；手机/平板 = iframe.contentDocument）
// 3) ESC 关闭挂在外层 window
// 4) 不再锁 body.overflow / 不再 pushState：局部全屏无需这些全局副作用
// 5) Mermaid SVG 跨 document 时用 document.importNode 保证节点归属外层 document
// ============================================================

/** 获取全屏蒙层应该挂载的容器：PC 用 root，手机/平板用设备屏幕 */
function getOverlayMount(): HTMLElement | null {
    if (props.device === 'pc') {
        return root.value;
    }
    return (wrapRef.value?.querySelector('.device-screen') as HTMLElement | null) || null;
}

/** 是否需要把全屏蒙层旋转 90° 做伪横屏：仅手机时启用（手机统一竖屏） */
function shouldRotateFullscreen(): boolean {
    return props.device === 'phone';
}

/**
 * 伪横屏（rotate 90° 顺时针）下，浏览器 wheel/touch 事件方向不会跟着旋转。
 * 由于代码已经横着展示（屏幕长边 = 内容横向），用户的直觉是：
 *  - 左右滑 → 滚到代码的下一行 / 上一行（垂直滚动）
 *  - 上下滑 → 在当前行内左右移（水平滚动）
 * rotate(90deg) 顺时针映射关系：
 *  - 屏幕物理 X 方向 ↔ 内容 Y 方向（左滑=向下读 → scrollTop+）
 *  - 屏幕物理 Y 方向 ↔ 内容 X 方向反向（上滑=往右看 → scrollLeft+）
 * 实现：把原生 wheel/touch 的 dx/dy 映射到目标的 scrollTop/scrollLeft。
 */
function bindRotatedScroll(target: HTMLElement) {
    // overscroll-behavior: contain 阻止 wheel/touch 在边界处冒泡到浏览器，
    // 避免触控板左右滑触发浏览器的前进/后退手势
    target.style.overscrollBehavior = 'contain';
    // touch-action: none 让我们在触屏上完全接管手势（包括 swipe-to-go-back）
    target.style.touchAction = 'none';

    target.addEventListener(
        'wheel',
        (e: WheelEvent) => {
            const dx = e.deltaX;
            const dy = e.deltaY;
            if (!dx && !dy) return;
            // 始终 preventDefault：即使到边界也要吞掉，不让浏览器拿去做页面横滑
            e.preventDefault();
            // 屏幕水平滚（dx>0，向右）→ 内容向下读 → scrollTop 增加
            target.scrollTop += dx;
            // 屏幕垂直滚（dy>0，向下）→ 内容向左移（即 scrollLeft 减小）
            target.scrollLeft -= dy;
        },
        { passive: false }
    );

    let lastX = 0;
    let lastY = 0;
    let active = false;
    target.addEventListener(
        'touchstart',
        (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            active = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
        },
        { passive: true }
    );
    target.addEventListener(
        'touchmove',
        (e: TouchEvent) => {
            if (!active || e.touches.length !== 1) return;
            const t = e.touches[0];
            const dx = t.clientX - lastX;
            const dy = t.clientY - lastY;
            lastX = t.clientX;
            lastY = t.clientY;
            // 始终 preventDefault：避免 iOS Safari 的边缘后退手势
            e.preventDefault();
            // 跟手拖拽（rotate 90° 顺时针）：
            // 手指向左滑（dx<0）→ 内容向左跟随，等价于看下一行 → scrollTop 增加
            // 手指向上滑（dy<0）→ 内容向上跟随，等价于看本行右侧 → scrollLeft 增加
            target.scrollTop -= dx;
            target.scrollLeft -= dy;
        },
        { passive: false }
    );
    target.addEventListener('touchend', () => {
        active = false;
    });
    target.addEventListener('touchcancel', () => {
        active = false;
    });
}

const fullscreenState = {
    overlay: null as HTMLElement | null,
    triggerBtn: null as HTMLElement | null,
    escHandler: null as ((e: KeyboardEvent) => void) | null,
};

const tableFsState = {
    overlay: null as HTMLElement | null,
    triggerBtn: null as HTMLElement | null,
    escHandler: null as ((e: KeyboardEvent) => void) | null,
};

const mermaidFsState = {
    overlay: null as HTMLElement | null,
    triggerBtn: null as HTMLElement | null,
    escHandler: null as ((e: KeyboardEvent) => void) | null,
    scale: 1,
    tx: 0,
    ty: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
};

function closeCodeFullscreen() {
    const s = fullscreenState;
    if (!s.overlay) return;
    s.overlay.remove();
    s.overlay = null;
    if (s.escHandler) {
        document.removeEventListener('keydown', s.escHandler);
        s.escHandler = null;
    }
    s.triggerBtn?.focus();
    s.triggerBtn = null;
}

function closeTableFullscreen() {
    const s = tableFsState;
    if (!s.overlay) return;
    s.overlay.remove();
    s.overlay = null;
    if (s.escHandler) {
        document.removeEventListener('keydown', s.escHandler);
        s.escHandler = null;
    }
    s.triggerBtn?.focus();
    s.triggerBtn = null;
}

function closeMermaidFullscreen() {
    const s = mermaidFsState;
    if (!s.overlay) return;
    s.overlay.remove();
    s.overlay = null;
    if (s.escHandler) {
        document.removeEventListener('keydown', s.escHandler);
        s.escHandler = null;
    }
    s.triggerBtn?.focus();
    s.triggerBtn = null;
}

function handleCodeFullscreenClick(event: Event, scope: Document) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('.ssr-code-fullscreen') as HTMLButtonElement | null;
    if (!btn) return;
    // admin-ui：移动模式与 PC 模式都响应（PC 看长代码也有用）
    const block = btn.closest('.ssr-code-block') as HTMLElement | null;
    if (!block) return;
    const codeEl = block.querySelector('pre code') as HTMLElement | null;
    if (!codeEl) return;
    const lang = block.getAttribute('data-lang') || 'text';
    const lineCount = block.getAttribute('data-line-count') || '';
    const codeInnerHtml = codeEl.innerHTML;

    // 蒙层挂在外层 document.body
    const overlay = document.createElement('div');
    overlay.className = 'ssr-code-fs-overlay';
    if (shouldRotateFullscreen()) overlay.classList.add('fs-rotate90');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `代码全屏查看 ${lang}`);
    overlay.innerHTML = `
        <div class="ssr-code-fs-stage">
            <div class="ssr-code-fs-head">
                <span class="ssr-code-fs-info">${lang}${lineCount ? ` · ${lineCount} 行` : ''}</span>
                <div class="ssr-code-fs-actions">
                    <button class="ssr-code-fs-copy ssr-code-copy ssr-code-iconbtn" type="button" aria-label="复制代码" title="复制">
                        <svg class="ssr-code-copy-icon ssr-code-copy-icon--default" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                            <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        <svg class="ssr-code-copy-icon ssr-code-copy-icon--success" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        <svg class="ssr-code-copy-icon ssr-code-copy-icon--error" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                    <button class="ssr-code-fs-close ssr-code-iconbtn" type="button" aria-label="退出全屏" title="关闭">
                        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <pre class="ssr-code-fs-pre"><code class="hljs language-${lang}">${codeInnerHtml}</code></pre>
        </div>
    `;
    const mount = getOverlayMount();
    if (!mount) return;
    mount.appendChild(overlay);

    fullscreenState.overlay = overlay;
    fullscreenState.triggerBtn = btn;

    overlay.querySelector('.ssr-code-fs-close')?.addEventListener('click', closeCodeFullscreen);

    // 蒙层内复制按钮：直接绑事件，避免依赖外层 bindCodeCopy 的 .ssr-code-block 上下文
    const copyBtn = overlay.querySelector('.ssr-code-fs-copy') as HTMLButtonElement | null;
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const codeNode = overlay.querySelector('.ssr-code-fs-pre code') as HTMLElement | null;
            if (!codeNode) return;
            const plain = (codeNode.textContent || '').replace(/\u200B/g, '');
            const onSuccess = () => {
                copyBtn.setAttribute('data-copy-state', 'success');
                window.setTimeout(() => copyBtn.removeAttribute('data-copy-state'), 1500);
            };
            const onError = () => {
                copyBtn.setAttribute('data-copy-state', 'error');
                window.setTimeout(() => copyBtn.removeAttribute('data-copy-state'), 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(plain).then(onSuccess, () => {
                    if (fallbackCopy(plain)) onSuccess();
                    else onError();
                });
            } else if (fallbackCopy(plain)) onSuccess();
            else onError();
        });
    }

    fullscreenState.escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeCodeFullscreen();
    };
    document.addEventListener('keydown', fullscreenState.escHandler);

    // 伪横屏（手机竖屏全屏）下，stage 旋转了 90°，但浏览器的 wheel/touch
    // 滚动仍走未旋转的物理方向；需要把垂直手势映射为代码区的水平滚动。
    if (overlay.classList.contains('fs-rotate90')) {
        const preEl = overlay.querySelector('.ssr-code-fs-pre') as HTMLElement | null;
        if (preEl) bindRotatedScroll(preEl);
    }

    // 静默引用 scope，保留 API 一致
    void scope;
}

function handleTableFullscreenClick(event: Event, scope: Document) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('.ssr-table-fs-btn') as HTMLButtonElement | null;
    if (!btn) return;
    // 表格全屏：仅手机/平板模式响应（PC 模式无意义）
    if (props.device === 'pc') return;

    const wrap = btn.closest('.ssr-table-wrap') as HTMLElement | null;
    if (!wrap) return;
    const tableEl = wrap.querySelector('table') as HTMLTableElement | null;
    if (!tableEl) return;

    // 跨 document 安全克隆：先在源 document 内 cloneNode，再 importNode 进外层 document
    const clonedSource = tableEl.cloneNode(true) as HTMLTableElement;
    const clonedTable = document.importNode(clonedSource, true) as HTMLTableElement;

    const overlay = document.createElement('div');
    overlay.className = 'ssr-table-fs-overlay';
    if (shouldRotateFullscreen()) overlay.classList.add('fs-rotate90');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '表格全屏查看');
    overlay.innerHTML = `
        <div class="ssr-table-fs-stage">
            <div class="ssr-table-fs-head">
                <span class="ssr-table-fs-info">表格全屏</span>
                <div class="ssr-table-fs-actions">
                    <button class="ssr-table-fs-close ssr-code-iconbtn" type="button" aria-label="退出全屏" title="关闭">
                        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="ssr-table-fs-body"></div>
        </div>
    `;
    const bodyEl = overlay.querySelector('.ssr-table-fs-body') as HTMLElement;
    bodyEl.appendChild(clonedTable);
    const mount = getOverlayMount();
    if (!mount) return;
    mount.appendChild(overlay);

    tableFsState.overlay = overlay;
    tableFsState.triggerBtn = btn;

    overlay.querySelector('.ssr-table-fs-close')?.addEventListener('click', closeTableFullscreen);

    tableFsState.escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeTableFullscreen();
    };
    document.addEventListener('keydown', tableFsState.escHandler);

    // 伪横屏下，把垂直手势映射为表格容器的水平滚动
    if (overlay.classList.contains('fs-rotate90')) {
        bindRotatedScroll(bodyEl);
    }
    void scope;
}

function handleMermaidFullscreenClick(event: Event, scope: Document) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('.mermaid-fullscreen-btn') as HTMLButtonElement | null;
    if (!btn) return;
    // Mermaid 全屏：PC + 移动模式都响应
    const block = btn.closest('.mermaid-block') as HTMLElement | null;
    if (!block) return;

    // ⚠ 必须 scope 到 .mermaid-content 内，避开按钮自身的 svg icon
    const contentEl = block.querySelector('.mermaid-content');
    const svgEl = contentEl ? (contentEl.querySelector('svg') as SVGElement | null) : null;
    const sourceEl = (contentEl || block).querySelector('.mermaid-source');

    const overlay = document.createElement('div');
    overlay.className = 'mermaid-fs-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '图表全屏查看');
    overlay.innerHTML = `
        <div class="mermaid-fs-toolbar">
            <button class="mermaid-fs-btn" data-action="zoom-out" type="button" aria-label="缩小" title="缩小">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
                </svg>
            </button>
            <span class="mermaid-fs-scale" aria-live="polite">100%</span>
            <button class="mermaid-fs-btn" data-action="reset" type="button" aria-label="重置" title="重置缩放">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path fill="currentColor" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
            </button>
            <button class="mermaid-fs-btn" data-action="zoom-in" type="button" aria-label="放大" title="放大">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
            </button>
            <button class="mermaid-fs-btn mermaid-fs-close" data-action="close" type="button" aria-label="关闭" title="关闭">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        </div>
        <div class="mermaid-fs-stage">
            <div class="mermaid-fs-canvas"></div>
        </div>
        <div class="mermaid-fs-tip">滚轮 / 双指缩放 · 拖拽平移</div>
    `;

    const canvas = overlay.querySelector('.mermaid-fs-canvas') as HTMLElement;
    const stage = overlay.querySelector('.mermaid-fs-stage') as HTMLElement;
    const scaleLabel = overlay.querySelector('.mermaid-fs-scale') as HTMLElement;

    if (svgEl) {
        // 取源 svg 实际渲染尺寸（兜底 600x400）
        const origRect = svgEl.getBoundingClientRect();
        const baseW = origRect.width || 600;
        const baseH = origRect.height || 400;

        // 跨 document 节点：先在源 document 克隆，再 importNode 到外层 document
        const clonedSource = svgEl.cloneNode(true) as SVGElement;
        const cloned = document.importNode(clonedSource, true) as SVGElement;
        cloned.style.maxWidth = 'none';
        cloned.style.maxHeight = 'none';
        cloned.style.width = `${baseW}px`;
        cloned.style.height = `${baseH}px`;
        cloned.setAttribute('width', String(baseW));
        cloned.setAttribute('height', String(baseH));
        canvas.appendChild(cloned);
    } else if (sourceEl) {
        const pre = document.createElement('pre');
        pre.className = 'mermaid-source';
        pre.textContent = sourceEl.textContent || '';
        canvas.appendChild(pre);
    }

    const mount = getOverlayMount();
    if (!mount) return;
    mount.appendChild(overlay);

    const s = mermaidFsState;
    s.scale = 1;
    s.tx = 0;
    s.ty = 0;
    s.overlay = overlay;
    s.triggerBtn = btn;

    const MIN_SCALE = 0.2;
    const MAX_SCALE = 6;
    const applyTransform = () => {
        canvas.style.transform = `translate(${s.tx}px, ${s.ty}px) scale(${s.scale})`;
        scaleLabel.textContent = `${Math.round(s.scale * 100)}%`;
    };

    const zoomAtPoint = (pointX: number, pointY: number, nextScale: number) => {
        const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
        const ratio = clamped / s.scale;
        const rect = stage.getBoundingClientRect();
        const localX = pointX - rect.left;
        const localY = pointY - rect.top;
        s.tx = localX - ratio * (localX - s.tx);
        s.ty = localY - ratio * (localY - s.ty);
        s.scale = clamped;
        applyTransform();
    };

    applyTransform();

    const centerCanvas = () => {
        requestAnimationFrame(() => {
            const stageRect = stage.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            s.tx += stageRect.left + stageRect.width / 2 - (canvasRect.left + canvasRect.width / 2);
            s.ty += stageRect.top + stageRect.height / 2 - (canvasRect.top + canvasRect.height / 2);
            applyTransform();
        });
    };

    centerCanvas();

    overlay.addEventListener('click', (e) => {
        const t = (e.target as HTMLElement).closest('.mermaid-fs-btn') as HTMLButtonElement | null;
        if (!t) return;
        const action = t.getAttribute('data-action');
        const rect = stage.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        if (action === 'zoom-in') zoomAtPoint(cx, cy, s.scale * 1.25);
        else if (action === 'zoom-out') zoomAtPoint(cx, cy, s.scale / 1.25);
        else if (action === 'reset') {
            s.scale = 1;
            s.tx = 0;
            s.ty = 0;
            applyTransform();
            centerCanvas();
        } else if (action === 'close') closeMermaidFullscreen();
    });

    stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
        zoomAtPoint(e.clientX, e.clientY, s.scale * factor);
    }, { passive: false });

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    stage.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        stage.style.cursor = 'grabbing';
    });
    const onMouseMove = (e: MouseEvent) => {
        if (!dragging) return;
        s.tx += e.clientX - lastX;
        s.ty += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        applyTransform();
    };
    const onMouseUp = () => {
        dragging = false;
        stage.style.cursor = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    let touchMode: 'none' | 'drag' | 'pinch' = 'none';
    let touchStartX = 0;
    let touchStartY = 0;
    stage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchMode = 'drag';
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            touchMode = 'pinch';
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            s.pinchStartDist = Math.hypot(dx, dy);
            s.pinchStartScale = s.scale;
        }
    }, { passive: false });
    stage.addEventListener('touchmove', (e) => {
        if (touchMode === 'drag' && e.touches.length === 1) {
            e.preventDefault();
            const t = e.touches[0];
            s.tx += t.clientX - touchStartX;
            s.ty += t.clientY - touchStartY;
            touchStartX = t.clientX;
            touchStartY = t.clientY;
            applyTransform();
        } else if (touchMode === 'pinch' && e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (s.pinchStartDist === 0) return;
            const nextScale = (s.pinchStartScale * dist) / s.pinchStartDist;
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            zoomAtPoint(cx, cy, nextScale);
        }
    }, { passive: false });
    stage.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) touchMode = 'none';
        else if (e.touches.length === 1) {
            touchMode = 'drag';
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    });

    const cleanup = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
    const mo = new MutationObserver(() => {
        if (!mount.contains(overlay)) {
            cleanup();
            mo.disconnect();
        }
    });
    mo.observe(mount, { childList: true });

    s.escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeMermaidFullscreen();
    };
    document.addEventListener('keydown', s.escHandler);
    void scope;
}

// 在指定 scope（PC 外层 document 或 iframe.contentDocument）上注册三类全屏按钮的点击委托。
// 返回一个 unbind 函数，调用即可解除该 scope 上的所有监听。
function bindFullscreenButtons(scope: Document): () => void {
    const codeHandler = (e: Event) => handleCodeFullscreenClick(e, scope);
    const tableHandler = (e: Event) => handleTableFullscreenClick(e, scope);
    const mermaidHandler = (e: Event) => handleMermaidFullscreenClick(e, scope);
    scope.addEventListener('click', codeHandler);
    scope.addEventListener('click', tableHandler);
    scope.addEventListener('click', mermaidHandler);
    return () => {
        scope.removeEventListener('click', codeHandler);
        scope.removeEventListener('click', tableHandler);
        scope.removeEventListener('click', mermaidHandler);
    };
}

// 表格 overflow 检测：仅移动模式需要（PC 模式不显示表格全屏按钮）。
// 监听 .ssr-table-scroll 尺寸变化，溢出时给父 .ssr-table-wrap 写 data-overflow="true"。
let tableOverflowObserver: ResizeObserver | null = null;
const observedTableScrolls = new WeakSet<HTMLElement>();
function updateTableOverflowFlag(wrap: HTMLElement) {
    const scrollEl = wrap.querySelector<HTMLElement>('.ssr-table-scroll');
    if (!scrollEl) return;
    if (scrollEl.scrollWidth - scrollEl.clientWidth > 1) {
        wrap.setAttribute('data-overflow', 'true');
    } else {
        wrap.removeAttribute('data-overflow');
    }
}
function disposeTableOverflowObserver() {
    if (tableOverflowObserver) {
        tableOverflowObserver.disconnect();
        tableOverflowObserver = null;
    }
}
function observeTableOverflow(scope: Document) {
    if (typeof ResizeObserver === 'undefined') return;
    // iframe 重载时 contentDocument 会重建，旧节点引用失效；先 disconnect 重建
    disposeTableOverflowObserver();
    tableOverflowObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const scrollEl = entry.target as HTMLElement;
            const wrap = scrollEl.closest('.ssr-table-wrap') as HTMLElement | null;
            if (wrap) updateTableOverflowFlag(wrap);
        }
    });
    const wraps = scope.querySelectorAll<HTMLElement>('.ssr-table-wrap');
    wraps.forEach((wrap) => {
        const scrollEl = wrap.querySelector<HTMLElement>('.ssr-table-scroll');
        if (!scrollEl) return;
        if (observedTableScrolls.has(scrollEl)) return;
        observedTableScrolls.add(scrollEl);
        tableOverflowObserver?.observe(scrollEl);
        updateTableOverflowFlag(wrap);
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
// 全屏按钮绑定：保存外层 / iframe 两套 unbind，便于切换/卸载时清理
// ============================================================
let unbindOuterFullscreen: (() => void) | null = null;
let unbindInnerFullscreen: (() => void) | null = null;

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
    // 先解绑上一次（iframe 重载场景）
    unbindInnerFullscreen?.();
    unbindInnerFullscreen = bindFullscreenButtons(doc);
    // 仅移动模式下才需要表格 overflow 检测；此时 iframe contentDocument 重建，
    // 在 iframe 内监听 .ssr-table-scroll 即可。
    observeTableOverflow(doc);
}

// ============================================================
// PC 模式脚注（[^1]）跳转：阻止浏览器把 #fnX 写到 URL，
// 避免触发祖先链滚动，自己用最近的滚动祖先做平滑滚动。
// iframe 模式下脚注跳转已在 srcdoc 内置脚本里处理（见上方 `<script>` 注入段），
// 不会走到这里。
// ============================================================
function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
    let cur: HTMLElement | null = el?.parentElement || null;
    while (cur && cur !== document.documentElement) {
        const style = window.getComputedStyle(cur);
        const oy = style.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && cur.scrollHeight > cur.clientHeight) {
            return cur;
        }
        cur = cur.parentElement;
    }
    return null;
}

function handleFootnoteClick(event: Event) {
    const t = event.target as HTMLElement | null;
    if (!t) return;
    const a = t.closest('a') as HTMLAnchorElement | null;
    if (!a) return;
    const isRef = !!a.parentElement?.classList.contains('footnote-ref');
    const isBackref = a.classList.contains('footnote-backref');
    if (!isRef && !isBackref) return;
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('#')) return;
    let targetEl: HTMLElement | null = null;
    try {
        targetEl = document.querySelector(href) as HTMLElement | null;
    } catch {
        targetEl = null;
    }
    if (!targetEl) return;
    event.preventDefault();
    const container = findScrollableAncestor(root.value);
    if (container) {
        const cRect = container.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();
        container.scrollTo({
            top: container.scrollTop + (tRect.top - cRect.top) - 12,
            behavior: 'smooth',
        });
    } else {
        targetEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
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
        // PC 模式：拦截脚注 [^1] / ↩ 跳转，避免浏览器把 #fnX 写到 URL 与触发祖先链滚动；
        // 自定义平滑滚动到目标，保持 URL 干净。
        root.value.addEventListener('click', handleFootnoteClick);
    }
    // 全屏按钮：PC 模式下，root 在外层 document 内，监听挂在外层 document
    unbindOuterFullscreen = bindFullscreenButtons(document);
    // 监听外层 wrap 尺寸变化，动态缩放手机外壳
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => recalcScale());
        if (wrapRef.value) resizeObserver.observe(wrapRef.value);
    }
    window.addEventListener('resize', recalcScale);
    void nextTick().then(recalcScale);
});

// wrap 在 device 变化时才出现/消失，挂载后接入 observer
watch(wrapRef, (el) => {
    if (resizeObserver) {
        resizeObserver.disconnect();
        if (el) resizeObserver.observe(el);
    }
    void nextTick().then(recalcScale);
});

// device 模式切换：清理蒙层与 iframe 内绑定，外层绑定保持
watch(
    () => props.device,
    () => {
        closeCodeFullscreen();
        closeTableFullscreen();
        closeMermaidFullscreen();
        unbindInnerFullscreen?.();
        unbindInnerFullscreen = null;
        disposeTableOverflowObserver();
    }
);

onBeforeUnmount(() => {
    if (timer) window.clearTimeout(timer);
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
    window.removeEventListener('resize', recalcScale);
    // 解绑 PC 模式脚注 click 监听
    if (root.value) root.value.removeEventListener('click', handleFootnoteClick);
    // 解绑全屏按钮 click 监听
    unbindOuterFullscreen?.();
    unbindOuterFullscreen = null;
    unbindInnerFullscreen?.();
    unbindInnerFullscreen = null;
    // 关闭可能仍存在的全屏蒙层
    closeCodeFullscreen();
    closeTableFullscreen();
    closeMermaidFullscreen();
    // 释放表格 overflow 监听
    disposeTableOverflowObserver();
});
</script>

<style scoped>
.article-preview {
    position: relative;
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
    justify-content: center;
    padding: 8px 12px;
    box-sizing: border-box;
    background: #f5f7fa;
    overflow: auto;
}

/* 竖屏：通过 transform: scale 自适应缩放，从根本上消除外层滚动条 */
.mobile-frame-wrap.fit-portrait {
    overflow: hidden;
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

/* ============================================================ */
/* 平板模式外壳：去掉刘海/Home 条，圆角更小，外框更细腻              */
/* ============================================================ */
.device-shell.device-shell--tablet {
    border-radius: 18px;
    padding: 16px;
}

.device-shell.device-shell--tablet .device-notch,
.device-shell.device-shell--tablet .device-home {
    display: none;
}

.device-shell.device-shell--tablet .device-screen {
    border-radius: 6px;
}
</style>
