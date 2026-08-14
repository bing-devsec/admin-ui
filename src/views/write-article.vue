<template>
    <div class="write-shell">
        <!-- 顶部工具条：模式切换 + 发布按钮 -->
        <div class="write-toolbar">
            <div class="toolbar-left">
                <el-radio-group v-model="mode" size="default">
                    <el-radio-button value="edit">编辑</el-radio-button>
                    <el-radio-button value="split">双栏</el-radio-button>
                    <el-radio-button value="preview">预览</el-radio-button>
                </el-radio-group>
                <el-radio-group v-show="mode !== 'edit'" v-model="device" size="default" class="device-switch">
                    <el-radio-button value="pc">
                        <el-icon><Monitor /></el-icon>
                        <span class="device-label">电脑</span>
                    </el-radio-button>
                    <el-radio-button value="tablet">
                        <el-icon><Cellphone /></el-icon>
                        <span class="device-label">平板</span>
                    </el-radio-button>
                    <el-radio-button value="phone">
                        <el-icon><Iphone /></el-icon>
                        <span class="device-label">手机</span>
                    </el-radio-button>
                </el-radio-group>
                <span class="toolbar-stat">{{ charCount }} 字 · {{ lineCount }} 行</span>
            </div>
            <div class="toolbar-right">
                <el-button @click="applyMarkdownFormat('bold')" link>加粗</el-button>
                <el-dropdown trigger="hover" @command="applyMarkdownFormat">
                    <el-button link>
                        列表<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item
                                v-for="preset in LIST_PRESETS"
                                :key="preset.kind"
                                :command="preset.kind"
                            >
                                {{ preset.label }}
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
                <el-dropdown trigger="hover" @command="insertAdmonition">
                    <el-button link>
                        提示块<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item
                                v-for="preset in ADMONITION_PRESETS"
                                :key="preset.kind"
                                :command="preset.kind"
                            >
                                <span class="admonition-menu-emoji">{{ preset.emoji }}</span>
                                {{ preset.label }}
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
                <el-dropdown trigger="hover" @command="insertCode">
                    <el-button link>
                        代码块<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item
                                v-for="preset in CODE_PRESETS"
                                :key="preset.kind"
                                :command="preset.kind"
                            >
                                {{ preset.label }}
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
                <el-button @click="insertSnippet('table')" link>表格</el-button>
                <el-button @click="insertSnippet('math')" link>公式</el-button>
                <el-button @click="insertSnippet('mermaid')" link>Mermaid</el-button>
                <el-dropdown trigger="hover" @command="handleImageInsertCommand">
                    <el-button link>
                        导入图片<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item>
                                <a
                                    class="drawio-menu-link"
                                    :href="DIAGRAMS_NET_URL"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    @click.stop
                                >
                                    在线画图
                                </a>
                            </el-dropdown-item>
                            <el-dropdown-item command="image">导入本地图片</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
                <el-divider class="toolbar-divider" direction="vertical" />
                <el-button @click="formatContent" link>
                    美化排版
                </el-button>
                <el-button @click="toggleCatalog" link :class="{ 'is-catalog-active': isCatalogVisible }">
                    目录
                </el-button>
                <el-button :loading="draftSaving" @click="saveDraft({ navigateAfterSave: true })">
                    保存草稿
                </el-button>
                <el-button type="primary" @click="saveArticle">
                    <el-icon style="margin-right: 4px;">
                        <Promotion />
                    </el-icon>
                    {{ publishButtonText }}
                </el-button>
            </div>
        </div>

        <!-- 主体：编辑器 + 预览（按 mode 切换显隐） -->
        <div class="write-body" :data-mode="mode">
            <div v-show="mode !== 'preview'" class="write-pane write-edit">
                <textarea
                    ref="editor"
                    v-model="displayContent"
                    class="md-textarea"
                    spellcheck="false"
                    placeholder="开始撰写你的文章…&#10;&#10;支持：标题、列表、代码块（含语言标识）、表格、引用、提示块（!!! tips/info/warning/error/success/thinking/example/summary）、KaTeX 公式（$...$ / $$...$$）、Mermaid 图表"
                    @paste="handlePaste"
                    @keydown="handleKeydown"
                    @scroll="handleEditorScroll"
                ></textarea>
            </div>

            <div
                v-show="mode !== 'edit'"
                class="write-pane write-preview-shell"
                :class="{ 'write-preview-shell--catalog': isCatalogVisible }"
            >
                <div ref="previewPane" class="write-preview-scroll" @scroll="handlePreviewScroll">
                    <ArticlePreview
                        :markdown="displayContent"
                        :device="device"
                        :device-width="currentDevice.width"
                        :device-height="currentDevice.height"
                        @rendered-html="handlePreviewRenderedHtml"
                        @preview-scroll="handlePreviewScroll"
                    />
                </div>

                <aside v-if="isCatalogVisible" class="preview-catalog" aria-label="文章目录">
                    <div class="preview-catalog-title">目录</div>
                    <nav v-if="catalogHeadings.length" class="ssr-catalog">
                        <ul class="ssr-catalog-list">
                            <li
                                v-for="heading in catalogHeadings"
                                :key="heading.id"
                                :class="['ssr-catalog-item', `level-${heading.level}`, { active: heading.id === activeCatalogId }]"
                            >
                                <a :href="`#${heading.id}`" @click.prevent="scrollToCatalogHeading(heading.id)">
                                    {{ heading.text }}
                                </a>
                            </li>
                        </ul>
                    </nav>
                    <div v-else class="preview-catalog-empty">
                        暂无目录，添加一级到三级标题后会自动生成。
                    </div>
                </aside>
            </div>
        </div>

        <!-- 发布抽屉（与原版完全一致） -->
        <el-drawer v-model="drawer" :title="drawerTitle" :destroy-on-close="true" class="publish-drawer">
            <template #header>
                <div class="drawer-header">
                    <el-icon class="drawer-header-icon">
                        <Promotion />
                    </el-icon>
                    <span class="drawer-header-title">{{ drawerTitle }}</span>
                </div>
            </template>
            <SubmitArticle :id="id" :draftID="draftID" :title="title" :tag="tag" :displayContent="displayContent" :describe="describe"
                @close="drawer = false" @draft-saved="handleDraftSaved">
            </SubmitArticle>
        </el-drawer>

        <input
            ref="imageInput"
            class="image-file-input"
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.drawio.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            @change="handleImageImport"
        />
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElNotification } from 'element-plus';
import { Promotion, Monitor, Iphone, Cellphone, ArrowDown } from '@element-plus/icons-vue';
import SubmitArticle from '../components/submit-article.vue';
import ArticlePreview from '../components/article-preview.vue';
import emitter from '../utils/event-bus.js';
import _axios from '../utils/axios';
import { beautifyMarkdown } from '../utils/format-text';
import { extractHeadingsFromHtml, type CatalogHeading } from '../utils/markdown';
import {
    DEFAULT_DEVICE_ID,
    DEFAULT_DEVICE_BY_CATEGORY,
    findDevice,
    type DevicePreset,
} from '../utils/device-presets';

// ============================================================
// 状态
// ============================================================
const router = useRouter();
const route = useRoute();
const mode = ref<'edit' | 'split' | 'preview'>('split');
const device = ref<'pc' | 'phone' | 'tablet'>('pc');
const deviceId = ref<string>(DEFAULT_DEVICE_ID);

// 当前选中机型（找不到时回落到默认）
const currentDevice = computed<DevicePreset>(
    () => findDevice(deviceId.value) || findDevice(DEFAULT_DEVICE_ID)!
);

// 切换设备品类时，把 deviceId 自动回填为该品类的默认机型，避免显示别的品类的型号
watch(device, (next) => {
    if (next === 'pc') return;
    const expected: 'phone' | 'tablet' = next;
    if (currentDevice.value.category !== expected) {
        deviceId.value = DEFAULT_DEVICE_BY_CATEGORY[expected];
    }
});

const id = ref('');
const draftID = ref('');
const tag = ref('');
const title = ref('');
const describe = ref('');
const displayContent = ref('');
const draftSaving = ref(false);

const editor = ref<HTMLTextAreaElement | null>(null);
const previewPane = ref<HTMLElement | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);

const charCount = computed(() => displayContent.value.length);
const lineCount = computed(() => displayContent.value ? displayContent.value.split('\n').length : 0);

const DIAGRAMS_NET_URL = 'https://app.diagrams.net/';
const ARTICLE_IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);

type ImageInsertCommand = 'image';

// ============================================================
// 预览目录：复用 portal-web 的 HTML heading 提取规则
// ============================================================
const isCatalogVisible = ref(false);
const previewRenderedHtml = ref('');
const activeCatalogId = ref('');
const catalogHeadings = computed<CatalogHeading[]>(() => extractHeadingsFromHtml(previewRenderedHtml.value, 3));

watch(
    catalogHeadings,
    (headings) => {
        if (!headings.length) {
            activeCatalogId.value = '';
            return;
        }
        if (!headings.some((heading) => heading.id === activeCatalogId.value)) {
            activeCatalogId.value = headings[0].id;
        }
    },
    { immediate: true }
);

watch(device, () => {
    if (!isCatalogVisible.value) return;
    requestAnimationFrame(updateActiveCatalogId);
});

function handlePreviewRenderedHtml(html: string) {
    previewRenderedHtml.value = html;
    requestAnimationFrame(updateActiveCatalogId);
}

async function toggleCatalog() {
    isCatalogVisible.value = !isCatalogVisible.value;
    if (!isCatalogVisible.value) return;

    if (mode.value === 'edit') {
        mode.value = 'split';
    }

    await nextTick();
    updateActiveCatalogId();
    if (!catalogHeadings.value.length) {
        ElNotification({
            title: '暂无目录',
            message: '添加 #、## 或 ### 标题后会自动生成文章目录',
            type: 'info',
            duration: 1800,
        });
    }
}

function escapeCssId(id: string): string {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(id);
    }
    return id.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

function getPreviewIframe(): HTMLIFrameElement | null {
    return previewPane.value?.querySelector<HTMLIFrameElement>('.device-iframe') || null;
}

type ScrollTargetName = 'editor' | 'preview';
type HeadingSourceAnchor = {
    line: number;
    level: number;
    text: string;
};

const SCROLL_SYNC_OFFSET = 12;
const USER_SYNC_LOCK_MS = 90;
const CATALOG_SYNC_LOCK_MS = 720;
let editorToPreviewRaf = 0;
let previewToEditorRaf = 0;
const programmaticScrollTargets = new Set<ScrollTargetName>();
const programmaticScrollTimers: Partial<Record<ScrollTargetName, number>> = {};

function markProgrammaticScroll(target: ScrollTargetName, duration = USER_SYNC_LOCK_MS) {
    programmaticScrollTargets.add(target);
    const existingTimer = programmaticScrollTimers[target];
    if (existingTimer) {
        window.clearTimeout(existingTimer);
    }
    programmaticScrollTimers[target] = window.setTimeout(() => {
        programmaticScrollTargets.delete(target);
        programmaticScrollTimers[target] = undefined;
    }, duration);
}

function getScrollMax(el: HTMLElement): number {
    return Math.max(0, el.scrollHeight - el.clientHeight);
}

function clampScrollTop(el: HTMLElement, top: number): number {
    return Math.min(Math.max(0, top), getScrollMax(el));
}

function scrollElementTo(
    el: HTMLElement,
    top: number,
    target: ScrollTargetName,
    behavior: ScrollBehavior = 'auto',
    lockDuration = USER_SYNC_LOCK_MS
) {
    markProgrammaticScroll(target, lockDuration);
    el.scrollTo({
        top: clampScrollTop(el, top),
        behavior,
    });
}

function getActivePreviewScroller(): HTMLElement | null {
    if (device.value === 'pc') {
        return previewPane.value;
    }

    const doc = getPreviewIframe()?.contentDocument;
    return (doc?.scrollingElement as HTMLElement | null) || doc?.documentElement || previewPane.value;
}

function getEditorLineHeight(ta: HTMLTextAreaElement): number {
    const lineHeight = Number.parseFloat(window.getComputedStyle(ta).lineHeight);
    return Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 24;
}

function normalizeHeadingText(text: string): string {
    return text
        .replace(/\\([\\`*_[\]{}()#+\-.!>])/g, '$1')
        .replace(/[`*_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getMarkdownHeadingAnchors(): HeadingSourceAnchor[] {
    const lines = displayContent.value.split('\n');
    const anchors: HeadingSourceAnchor[] = [];
    let inFence = false;
    let fenceMarker = '';

    lines.forEach((line, index) => {
        const fenceMatch = line.match(/^\s*(```+|~~~+)/);
        if (fenceMatch) {
            const marker = fenceMatch[1][0];
            if (!inFence) {
                inFence = true;
                fenceMarker = marker;
            } else if (marker === fenceMarker) {
                inFence = false;
                fenceMarker = '';
            }
            return;
        }
        if (inFence) return;

        const match = line.match(/^\s{0,3}(#{1,3})\s+(.+?)\s*#*\s*$/);
        if (!match) return;
        anchors.push({
            line: index,
            level: match[1].length,
            text: normalizeHeadingText(match[2]),
        });
    });

    return anchors;
}

function getMarkdownHeadingLineForCatalogId(id: string): number | null {
    const catalogIndex = catalogHeadings.value.findIndex((heading) => heading.id === id);
    const sourceAnchors = getMarkdownHeadingAnchors();
    if (catalogIndex >= 0 && sourceAnchors[catalogIndex]) {
        return sourceAnchors[catalogIndex].line;
    }

    const catalogHeading = catalogHeadings.value.find((heading) => heading.id === id);
    if (!catalogHeading) return null;
    const normalizedText = normalizeHeadingText(catalogHeading.text);
    const fallback = sourceAnchors.find(
        (heading) => heading.level === catalogHeading.level && heading.text === normalizedText
    );
    return fallback?.line ?? null;
}

function getPreviewHeadingTop(id: string, scroller = getActivePreviewScroller()): number | null {
    if (!scroller) return null;

    if (device.value === 'pc') {
        const target = previewPane.value?.querySelector<HTMLElement>(`#${escapeCssId(id)}`);
        if (!target) return null;

        const scrollerRect = scroller.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        return scroller.scrollTop + (targetRect.top - scrollerRect.top) - SCROLL_SYNC_OFFSET;
    }

    const doc = getPreviewIframe()?.contentDocument;
    const target = doc?.getElementById(id);
    if (!target) return null;

    return target.getBoundingClientRect().top + scroller.scrollTop - SCROLL_SYNC_OFFSET;
}

function getEditorHeadingTop(id: string): number | null {
    const ta = editor.value;
    if (!ta) return null;
    const line = getMarkdownHeadingLineForCatalogId(id);
    if (line === null) return null;
    return line * getEditorLineHeight(ta);
}

function interpolateScrollTop(sourceTop: number, anchors: Array<{ source: number; target: number }>): number | null {
    if (anchors.length < 2) return null;
    const sortedAnchors = anchors
        .filter((anchor) => Number.isFinite(anchor.source) && Number.isFinite(anchor.target))
        .sort((a, b) => a.source - b.source);
    if (sortedAnchors.length < 2) return null;

    let previous = sortedAnchors[0];
    for (let i = 1; i < sortedAnchors.length; i++) {
        const next = sortedAnchors[i];
        if (sourceTop <= next.source) {
            const span = next.source - previous.source;
            const progress = span <= 0 ? 0 : (sourceTop - previous.source) / span;
            return previous.target + (next.target - previous.target) * Math.min(Math.max(progress, 0), 1);
        }
        previous = next;
    }

    return sortedAnchors[sortedAnchors.length - 1].target;
}

function mapScrollTopByCatalogAnchors(from: 'editor' | 'preview'): number | null {
    const ta = editor.value;
    const previewScroller = getActivePreviewScroller();
    if (!ta || !previewScroller) return null;

    const editorMax = getScrollMax(ta);
    const previewMax = getScrollMax(previewScroller);
    if (editorMax <= 0 || previewMax <= 0) return from === 'editor' ? 0 : null;

    const sourceHeadings = getMarkdownHeadingAnchors();
    const headings = catalogHeadings.value;
    const pairs: Array<{ editorTop: number; previewTop: number }> = [
        { editorTop: 0, previewTop: 0 },
    ];

    const count = Math.min(headings.length, sourceHeadings.length);
    for (let i = 0; i < count; i++) {
        const previewTop = getPreviewHeadingTop(headings[i].id, previewScroller);
        if (previewTop === null) continue;
        pairs.push({
            editorTop: sourceHeadings[i].line * getEditorLineHeight(ta),
            previewTop,
        });
    }
    pairs.push({ editorTop: editorMax, previewTop: previewMax });

    const sourceTop = from === 'editor' ? ta.scrollTop : previewScroller.scrollTop;
    const anchors = pairs.map((pair) =>
        from === 'editor'
            ? { source: pair.editorTop, target: pair.previewTop }
            : { source: pair.previewTop, target: pair.editorTop }
    );

    return interpolateScrollTop(sourceTop, anchors);
}

function mapScrollTopByRatio(from: 'editor' | 'preview'): number | null {
    const ta = editor.value;
    const previewScroller = getActivePreviewScroller();
    if (!ta || !previewScroller) return null;

    const editorMax = getScrollMax(ta);
    const previewMax = getScrollMax(previewScroller);
    if (from === 'editor') {
        if (editorMax <= 0) return 0;
        return previewMax * (ta.scrollTop / editorMax);
    }
    if (previewMax <= 0) return 0;
    return editorMax * (previewScroller.scrollTop / previewMax);
}

async function scrollToCatalogHeading(id: string) {
    activeCatalogId.value = id;
    if (mode.value === 'edit') {
        mode.value = 'split';
    }

    await nextTick();
    requestAnimationFrame(() => {
        const previewScroller = getActivePreviewScroller();
        const previewTop = getPreviewHeadingTop(id, previewScroller);
        if (previewScroller && previewTop !== null) {
            scrollElementTo(previewScroller, previewTop, 'preview', 'smooth', CATALOG_SYNC_LOCK_MS);
        }

        const ta = editor.value;
        const editorTop = getEditorHeadingTop(id);
        if (ta && editorTop !== null) {
            scrollElementTo(ta, editorTop, 'editor', 'smooth', CATALOG_SYNC_LOCK_MS);
        }
    });
}

function handlePreviewScroll() {
    if (isCatalogVisible.value) {
        updateActiveCatalogId();
    }
    if (mode.value !== 'split') return;
    if (programmaticScrollTargets.has('preview')) return;
    schedulePreviewToEditorSync();
}

function updateActiveCatalogId() {
    const headings = catalogHeadings.value;
    if (!headings.length) {
        activeCatalogId.value = '';
        return;
    }

    const pane = previewPane.value;
    if (!pane) {
        activeCatalogId.value = headings[0].id;
        return;
    }

    let currentId = headings[0].id;
    const threshold = 16;

    if (device.value === 'pc') {
        const paneTop = pane.getBoundingClientRect().top;
        for (const heading of headings) {
            const el = pane.querySelector<HTMLElement>(`#${escapeCssId(heading.id)}`);
            if (!el) continue;
            const top = el.getBoundingClientRect().top - paneTop;
            if (top <= threshold) currentId = heading.id;
            else break;
        }
    } else {
        const doc = getPreviewIframe()?.contentDocument;
        for (const heading of headings) {
            const el = doc?.getElementById(heading.id);
            if (!el) continue;
            const top = el.getBoundingClientRect().top;
            if (top <= threshold) currentId = heading.id;
            else break;
        }
    }

    activeCatalogId.value = currentId;
}

// ============================================================
// 标题自动识别（保留原逻辑）
// ============================================================
function extractH1Title(text: string): { title: string; body: string } {
    const re = /^\s*#\s+(.+?)\s*\n+/;
    const m = text.match(re);
    if (!m) return { title: '', body: text };
    return { title: m[1].trim(), body: text.slice(m[0].length) };
}

function handlePaste(e: ClipboardEvent) {
    if (displayContent.value.trim() !== '') return;
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!text) return;
    const { title: h1, body } = extractH1Title(text);
    if (!h1) return;
    e.preventDefault();
    e.stopPropagation();
    title.value = h1;
    displayContent.value = body;
    ElNotification({
        title: '已自动识别标题',
        message: h1,
        type: 'success',
        duration: 2500,
    });
}

// ============================================================
// 编辑器键盘增强：Tab 缩进 + Ctrl/Cmd+S 保存草稿
// ============================================================
function handleKeydown(e: KeyboardEvent) {
    const ta = editor.value;
    if (!ta) return;

    // Ctrl/Cmd + S：保存草稿
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDraft();
        return;
    }

    // Tab：插入真实 tab 字符（显示宽度由 CSS tab-size 控制，不切换焦点）
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const indent = '\t';
        // 多行选区：行首批量加/减缩进
        if (start !== end) {
            const value = ta.value;
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const segment = value.slice(lineStart, end);
            const next = e.shiftKey
                ? segment.replace(/^( {1,4}|\t)/gm, '')
                : segment.replace(/^/gm, indent);
            const newValue = value.slice(0, lineStart) + next + value.slice(end);
            displayContent.value = newValue;
            requestAnimationFrame(() => {
                ta.selectionStart = lineStart;
                ta.selectionEnd = lineStart + next.length;
            });
            return;
        }
        // 单光标：插入真实 tab 字符
        if (e.shiftKey) return;
        const value = ta.value;
        const newValue = value.slice(0, start) + indent + value.slice(end);
        displayContent.value = newValue;
        requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = start + indent.length;
        });
    }
}

// ============================================================
// 工具栏：常用片段插入
// ============================================================
const SNIPPETS: Record<string, string> = {
    codeBlock: '```bash\nls\n```',
    table: '| 列 1 | 列 2 |\n| --- | --- |\n| A | B |',
    math: '$$\nE = mc^2\n$$',
    mermaid: '```mermaid\nflowchart LR\n    A[开始] --> B[结束]\n```',
};

const LIST_PRESETS: { kind: MarkdownFormat; label: string }[] = [
    { kind: 'unordered-list', label: '无序列表' },
    { kind: 'ordered-list', label: '有序列表' },
];

const CODE_PRESETS: { kind: CodeFormat; label: string }[] = [
    { kind: 'inline-code', label: '单行代码' },
    { kind: 'code-block', label: '多行代码' },
];

// 提示块类型：与 utils/markdown.ts 的 ADMONITION_TYPES / EMOJIS / 默认标题保持一致
const ADMONITION_PRESETS: { kind: string; emoji: string; label: string; title: string }[] = [
    { kind: 'tips', emoji: '💡', label: '提示', title: '提示' },
    { kind: 'info', emoji: '📘', label: '说明', title: '说明' },
    { kind: 'warning', emoji: '⚠️', label: '注意', title: '注意' },
    { kind: 'error', emoji: '❌', label: '错误', title: '错误' },
    { kind: 'success', emoji: '🍺', label: '完成', title: '完成' },
    { kind: 'thinking', emoji: '🤔', label: '思考', title: '思考' },
    { kind: 'example', emoji: '🌰', label: '示例', title: '示例' },
    { kind: 'summary', emoji: '📌', label: '总结', title: '总结' },
];

type MarkdownFormat = 'bold' | 'unordered-list' | 'ordered-list';
type CodeFormat = 'inline-code' | 'code-block';

function insertSnippet(key: string) {
    const snippet = SNIPPETS[key];
    if (!snippet) return;
    insertText(snippet);
}

function insertAdmonition(kind: string) {
    const preset = ADMONITION_PRESETS.find((p) => p.kind === kind);
    if (!preset) return;
    insertText(`!!! ${preset.kind} ${preset.title}\n这里写${preset.label}内容\n!!!\n`);
}

function insertCode(format: CodeFormat) {
    if (format === 'code-block') {
        insertSnippet('codeBlock');
        return;
    }
    applyInlineCodeFormat();
}

function replaceSelection(insert: string, selectionStart?: number, selectionEnd?: number) {
    const ta = editor.value;
    if (!ta) {
        displayContent.value = (displayContent.value ? displayContent.value + '\n' : '') + insert;
        return;
    }

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const nextSelectionStart = selectionStart ?? start + insert.length;
    const nextSelectionEnd = selectionEnd ?? nextSelectionStart;

    ta.focus();
    ta.setSelectionRange(start, end);
    let inserted = false;
    try {
        inserted = document.execCommand('insertText', false, insert);
    } catch {
        inserted = false;
    }
    if (!inserted) {
        ta.setRangeText(insert, start, end, 'end');
        displayContent.value = ta.value;
    }

    requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
}

function applyBoldFormat() {
    const ta = editor.value;
    if (!ta) {
        displayContent.value = displayContent.value ? `**${displayContent.value}**` : '**加粗文本**';
        return;
    }

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    const text = selected || '加粗文本';
    replaceSelection(`**${text}**`, start + 2, start + 2 + text.length);
}

function applyInlineCodeFormat() {
    const ta = editor.value;
    if (!ta) {
        displayContent.value = displayContent.value ? `\`${displayContent.value}\`` : '`code`';
        return;
    }

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    const text = selected || 'code';
    replaceSelection(`\`${text}\``, start + 1, start + 1 + text.length);
}

function applyListFormat(ordered: boolean) {
    const ta = editor.value;
    if (!ta) {
        displayContent.value += ordered ? '1. 列表项' : '- 列表项';
        return;
    }

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    const source = selected || '列表项';
    const lines = source.split('\n');
    const formatted = lines.map((line, index) => {
        const text = line.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, '');
        return ordered ? `${index + 1}. ${text}` : `- ${text}`;
    }).join('\n');

    replaceSelection(formatted, start, start + formatted.length);
}

function applyMarkdownFormat(format: MarkdownFormat) {
    if (format === 'bold') {
        applyBoldFormat();
        return;
    }
    applyListFormat(format === 'ordered-list');
}

function insertText(snippet: string) {
    const ta = editor.value;
    if (!ta) {
        displayContent.value = (displayContent.value ? displayContent.value + '\n' : '') + snippet;
        return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    // 确保前面有空行（除非已经在行首）
    const before = ta.value.slice(0, start);
    const needsLeadingNewline = before.length > 0 && !before.endsWith('\n\n');
    const prefix = needsLeadingNewline ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const insert = prefix + snippet;

    // 优先用 execCommand('insertText')：唯一能既保留 scrollTop、又写入浏览器原生
    // undo 栈的 API（setRangeText 不会进入 undo 栈，导致 Ctrl+Z 失效）。
    ta.focus();
    ta.setSelectionRange(start, end);
    let inserted = false;
    try {
        // execCommand 已被标记为 deprecated，但目前仍是 textarea 中
        // 唯一能保留浏览器原生 undo 历史的 API，所有主流浏览器仍支持。
        inserted = document.execCommand('insertText', false, insert);
    } catch {
        inserted = false;
    }
    if (!inserted) {
        // 兜底：execCommand 不可用时退回 setRangeText（此时无 undo，但功能可用）
        ta.setRangeText(insert, start, end, 'end');
        displayContent.value = ta.value;
    }

    // 把光标所在行滚动到可视区（仅当当前 scrollTop 没覆盖光标行时调整）
    const caret = start + insert.length;
    const linesBefore = ta.value.slice(0, caret).split('\n').length;
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 22;
    const caretTop = (linesBefore - 1) * lineHeight;
    const viewTop = ta.scrollTop;
    const viewBottom = viewTop + ta.clientHeight;
    if (caretTop < viewTop || caretTop + lineHeight > viewBottom) {
        ta.scrollTop = Math.max(0, caretTop - ta.clientHeight / 2);
    }
}

// ============================================================
// 图片插入：在线画图使用原生链接新开标签页，导入图片上传后插入 URL
// ============================================================
function handleImageInsertCommand(command: ImageInsertCommand) {
    if (command === 'image') {
        imageInput.value?.click();
    }
}

async function handleImageImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const validationMessage = validateArticleImageFile(file);
    if (validationMessage) {
        ElNotification({
            title: '文件不支持',
            message: validationMessage,
            type: 'warning',
            duration: 2600,
        });
        return;
    }

    try {
        const uploaded = await uploadArticleImage(file);
        insertUploadedImage(uploaded.url, file.name.replace(/\.[^.]+$/i, ''));
        ElNotification({
            title: '图片已上传',
            message: '已插入图片链接，文章正文不会再保存 base64 数据',
            type: 'success',
            duration: 2400,
        });
    } catch (error: any) {
        ElNotification({
            title: '上传失败',
            message: error?.message ?? '图片上传失败，请稍后重试',
            type: 'error',
            duration: 2600,
        });
    }
}

function validateArticleImageFile(file: File): string {
    const fileName = file.name || '';
    const lowerName = fileName.toLowerCase();
    const isSVG = lowerName.endsWith('.svg') || lowerName.endsWith('.drawio.svg') || file.type === 'image/svg+xml';
    if (!isSVG && !SUPPORTED_IMAGE_TYPES.has(file.type)) {
        return '仅支持 PNG、JPG、WebP、GIF、SVG 或 .drawio.svg';
    }
    if (file.size <= 0) {
        return '图片文件为空';
    }
    if (file.size > ARTICLE_IMAGE_MAX_SIZE) {
        return '图片大小不能超过 10MB';
    }
    return '';
}

async function uploadArticleImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await _axios.post('/admin/auth/article/image/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    const { code, message, data } = response.data;
    if (code !== 2000 || message !== '') {
        throw new Error(message || '图片上传失败');
    }
    if (!data?.url) {
        throw new Error('上传接口没有返回图片 URL');
    }
    return data;
}

function insertUploadedImage(url: string, title: string) {
    const normalizedTitle = normalizeImageTitle(title);
    insertText(`<img src="${escapeHtmlAttribute(url)}" alt="${escapeHtmlAttribute(normalizedTitle)}" />`);
}

function normalizeImageTitle(title: string): string {
    return title.replace(/[\r\n\t]+/g, ' ').trim() || '图片';
}

function escapeHtmlAttribute(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ============================================================
// 编辑/预览滚动同步：标题锚点分段映射，缺少目录时回退到比例同步
// ============================================================
function syncEditorToPreview() {
    const previewScroller = getActivePreviewScroller();
    if (!previewScroller) return;
    const top = mapScrollTopByCatalogAnchors('editor') ?? mapScrollTopByRatio('editor');
    if (top === null) return;
    scrollElementTo(previewScroller, top, 'preview');
}

function syncPreviewToEditor() {
    const ta = editor.value;
    if (!ta) return;
    const top = mapScrollTopByCatalogAnchors('preview') ?? mapScrollTopByRatio('preview');
    if (top === null) return;
    scrollElementTo(ta, top, 'editor');
}

function scheduleEditorToPreviewSync() {
    if (editorToPreviewRaf) return;
    editorToPreviewRaf = requestAnimationFrame(() => {
        editorToPreviewRaf = 0;
        syncEditorToPreview();
    });
}

function schedulePreviewToEditorSync() {
    if (previewToEditorRaf) return;
    previewToEditorRaf = requestAnimationFrame(() => {
        previewToEditorRaf = 0;
        syncPreviewToEditor();
    });
}

function handleEditorScroll() {
    if (mode.value !== 'split') return;
    if (programmaticScrollTargets.has('editor')) return;
    scheduleEditorToPreviewSync();
}

// ============================================================
// 编辑模式切换：从文章管理页带数据进来
// ============================================================
function updateArticle(data: any) {
    id.value = data.id || data.articleID || '';
    draftID.value = data.draftID || '';
    tag.value = data.tag;
    title.value = data.title;
    displayContent.value = data.content;
    describe.value = data.describe;
}

// ============================================================
// 发布抽屉
// ============================================================
const drawer = ref(false);
const drawerTitle = computed(() => {
    if (draftID.value) return '发布草稿';
    return id.value ? '编辑文章' : '发布文章';
});
const publishButtonText = computed(() => {
    if (draftID.value) return '发布草稿';
    return id.value ? '保存修改' : '发布文章';
});

function saveArticle() {
    drawer.value = true;
}

function handleDraftSaved(payload: { id: string; title: string; tag: string; describe: string }) {
    draftID.value = payload.id || draftID.value;
    title.value = payload.title;
    tag.value = payload.tag;
    describe.value = payload.describe;
}

type SaveDraftOptions = {
    navigateAfterSave?: boolean;
};

const DEFAULT_AFTER_DRAFT_SAVE_PATH = '/home/manage-draft';

function normalizeRedirectQuery(value: unknown): string {
    if (Array.isArray(value)) {
        return typeof value[0] === 'string' ? value[0] : '';
    }
    return typeof value === 'string' ? value : '';
}

function isAllowedRedirectPath(path: string): boolean {
    return path === '/home/manage-article'
        || path.startsWith('/home/manage-article?')
        || path === '/home/manage-draft'
        || path.startsWith('/home/manage-draft?')
        || path === '/home/manage-tag'
        || path.startsWith('/home/manage-tag?');
}

function resolveAfterDraftSavePath(): string {
    const redirectPath = normalizeRedirectQuery(route.query.redirect);
    return redirectPath && isAllowedRedirectPath(redirectPath)
        ? redirectPath
        : DEFAULT_AFTER_DRAFT_SAVE_PATH;
}

async function navigateAfterDraftSave(): Promise<void> {
    await router.push(resolveAfterDraftSavePath()).catch(() => {
        return router.push(DEFAULT_AFTER_DRAFT_SAVE_PATH).catch(() => { });
    });
}

async function saveDraft(options: SaveDraftOptions = {}) {
    if (draftSaving.value) return;
    const userID = localStorage.getItem("userID");
    if (!userID) { router.push('/').catch(() => { }); return; }

    const payload = {
        id: draftID.value,
        articleID: id.value,
        title: title.value.trim(),
        tag: tag.value.trim(),
        describe: describe.value.trim(),
        content: displayContent.value,
    };
    draftSaving.value = true;
    try {
        const response = await _axios.post('/admin/auth/article/draft/save', payload);
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            draftID.value = data?.id || draftID.value;
            title.value = data?.title || payload.title;
            ElNotification({ title: 'Success', message: '草稿已保存', type: 'success' });
            if (options.navigateAfterSave) {
                await navigateAfterDraftSave();
            }
        } else {
            ElNotification({ title: 'Failed', message: message || '保存草稿失败', type: 'error' });
        }
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    } finally {
        draftSaving.value = false;
    }
}

// ============================================================
// 美化排版：补空格 + 行尾清理 + 列表/标题/引用空格规范
// ============================================================
function formatContent() {
    const before = displayContent.value;
    const after = beautifyMarkdown(before);
    if (after === before) {
        ElNotification({
            title: '已经是优雅的排版',
            message: '没有可优化的内容',
            type: 'info',
            duration: 1500,
        });
        return;
    }
    displayContent.value = after;
    ElNotification({
        title: '排版已美化',
        message: '完成补空格、清理行尾空白和收敛多余空行',
        type: 'success',
        duration: 2000,
    });
}

// ============================================================
// 生命周期
// ============================================================
onMounted(() => {
    emitter.on('updateArticle', updateArticle);
});

onBeforeUnmount(() => {
    emitter.off('updateArticle', updateArticle);
    if (editorToPreviewRaf) {
        cancelAnimationFrame(editorToPreviewRaf);
        editorToPreviewRaf = 0;
    }
    if (previewToEditorRaf) {
        cancelAnimationFrame(previewToEditorRaf);
        previewToEditorRaf = 0;
    }
    (Object.keys(programmaticScrollTimers) as ScrollTargetName[]).forEach((target) => {
        const timer = programmaticScrollTimers[target];
        if (timer) {
            window.clearTimeout(timer);
            programmaticScrollTimers[target] = undefined;
        }
    });
    programmaticScrollTargets.clear();
});
</script>

<style scoped>
.write-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #fff;
    overflow: hidden;
}

.write-toolbar {
    align-items: center;
    background: #fafafa;
    border-bottom: 1px solid var(--admin-header-border-color, #e4e7ed);
    box-sizing: border-box;
    display: flex;
    flex: 0 0 var(--admin-header-height, 48px);
    flex-wrap: nowrap;
    gap: 12px;
    height: var(--admin-header-height, 48px);
    justify-content: space-between;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0 16px;
    scrollbar-width: thin;
    white-space: nowrap;
}

.toolbar-left {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 12px;
}

.toolbar-stat {
    color: #909399;
    font-size: 12px;
}

.device-switch :deep(.el-radio-button__inner) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.device-label {
    font-size: 12px;
}

.toolbar-right {
    display: flex;
    align-items: center;
    column-gap: 12px;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    row-gap: 8px;
}

.toolbar-right :deep(.el-button) {
    margin-left: 0;
}

.toolbar-right :deep(.el-dropdown) {
    display: inline-flex;
}

.toolbar-right :deep(.el-button.is-link:hover),
.toolbar-right :deep(.el-button.is-link:focus),
.toolbar-right :deep(.el-button.is-link:focus-visible),
.toolbar-right :deep(.el-tooltip__trigger:focus-visible) {
    border-color: transparent;
    box-shadow: none;
    outline: none;
}

.toolbar-right :deep(.el-button.is-link.is-catalog-active) {
    color: var(--el-color-primary);
    font-weight: 600;
}

.toolbar-divider {
    border-left-color: #cdd0d6;
    height: 20px;
    margin: 0;
}

.admonition-menu-emoji {
    margin-right: 8px;
}

.write-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
}

.write-pane {
    flex: 1;
    overflow: auto;
    min-width: 0;
}

/* ============================================================ */
/* 编辑区 / 预览区滚动条样式：细滚动条，hover 不放大 */
/* ============================================================ */
.write-pane,
.write-preview-scroll,
.preview-catalog,
.md-textarea {
    /* Firefox */
    scrollbar-width: thin;
    scrollbar-color: #c0c4cc transparent;
}

.write-pane::-webkit-scrollbar,
.write-preview-scroll::-webkit-scrollbar,
.preview-catalog::-webkit-scrollbar,
.md-textarea::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.write-pane::-webkit-scrollbar-track,
.write-preview-scroll::-webkit-scrollbar-track,
.preview-catalog::-webkit-scrollbar-track,
.md-textarea::-webkit-scrollbar-track {
    background: transparent;
}

.write-pane::-webkit-scrollbar-thumb,
.write-preview-scroll::-webkit-scrollbar-thumb,
.preview-catalog::-webkit-scrollbar-thumb,
.md-textarea::-webkit-scrollbar-thumb {
    background: #c0c4cc;
    border-radius: 3px;
    /* hover 不变粗、不变色，保持一致 */
    border: none;
}

.write-pane::-webkit-scrollbar-thumb:hover,
.write-preview-scroll::-webkit-scrollbar-thumb:hover,
.preview-catalog::-webkit-scrollbar-thumb:hover,
.md-textarea::-webkit-scrollbar-thumb:hover,
.write-pane::-webkit-scrollbar-thumb:active,
.write-preview-scroll::-webkit-scrollbar-thumb:active,
.preview-catalog::-webkit-scrollbar-thumb:active,
.md-textarea::-webkit-scrollbar-thumb:active {
    background: #c0c4cc;
}

.write-pane::-webkit-scrollbar-corner,
.write-preview-scroll::-webkit-scrollbar-corner,
.preview-catalog::-webkit-scrollbar-corner,
.md-textarea::-webkit-scrollbar-corner {
    background: transparent;
}

.write-body[data-mode='edit'] .write-edit {
    flex: 1;
}

.write-body[data-mode='preview'] .write-preview-shell {
    flex: 1;
}

.write-body[data-mode='split'] .write-edit {
    border-right: 1px solid #e4e7ed;
}

.write-edit {
    display: flex;
}

.md-textarea {
    flex: 1;
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    padding: 16px 20px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 14px;
    line-height: 1.7;
    color: #2c3e50;
    tab-size: 4;
    -moz-tab-size: 4;
    background: #fff;
    box-sizing: border-box;
}

.write-preview-shell {
    background: #fff;
    display: flex;
    overflow: hidden;
}

.write-preview-scroll {
    background: #fff;
    flex: 1;
    min-width: 0;
    overflow: auto;
}

.preview-catalog {
    background: #fbfdff;
    border-left: 1px solid #e4e7ed;
    box-sizing: border-box;
    flex: 0 0 220px;
    overflow-y: auto;
    padding: 14px 12px;
}

.preview-catalog-title {
    border-bottom: 1px solid #edf2f7;
    color: #303133;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
    padding-bottom: 10px;
}

.preview-catalog-empty {
    color: #909399;
    font-size: 13px;
    line-height: 1.7;
}

.ssr-catalog {
    font-size: clamp(14px, 13px + 0.2vw, 15px);
    line-height: 1.6;
}

.ssr-catalog-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.ssr-catalog-item {
    border-left: 2px solid transparent;
    margin: 4px 0;
    padding: 2px 6px;
    transition:
        color 0.15s ease,
        background-color 0.15s ease,
        border-color 0.15s ease;
}

.ssr-catalog-item a {
    color: #555;
    display: block;
    line-height: 1.4;
    text-decoration: none;
    word-break: break-word;
}

@media (hover: hover) and (pointer: fine) {
    .ssr-catalog-item:hover a {
        color: #4dd0e1;
    }
}

.ssr-catalog-item.active {
    background-color: #f0fbfc;
    border-left-color: #4dd0e1;
}

.ssr-catalog-item.active a {
    color: #4dd0e1;
    font-weight: 600;
}

.ssr-catalog-item.level-1 {
    font-weight: 600;
}

.ssr-catalog-item.level-2 {
    padding-left: 10px;
}

.ssr-catalog-item.level-3 {
    font-size: clamp(13px, 12px + 0.2vw, 14px);
    padding-left: 22px;
}

@media (max-width: 1100px) {
    .preview-catalog {
        flex-basis: 180px;
    }
}

/* 抽屉样式（保留原版） */
.drawer-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.drawer-header-icon {
    color: var(--el-color-primary);
    font-size: 20px;
}

.drawer-header-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
}

.publish-drawer {
    --el-drawer-padding-primary: 0;
}

.publish-drawer :deep(.el-drawer__body) {
    overflow: hidden;
}

.image-file-input {
    display: none;
}

.drawio-menu-link {
    color: inherit;
    text-decoration: none;
}
</style>
