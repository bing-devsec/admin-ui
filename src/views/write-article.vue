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
                        <span class="device-label">PC</span>
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
                <el-dropdown trigger="click" @command="insertAdmonition">
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
                <el-button @click="insertSnippet('code')" link>代码块</el-button>
                <el-button @click="insertSnippet('table')" link>表格</el-button>
                <el-button @click="insertSnippet('math')" link>公式</el-button>
                <el-button @click="insertSnippet('mermaid')" link>Mermaid</el-button>
                <el-divider direction="vertical" />
                <el-button @click="formatContent" link>
                    <el-icon style="margin-right: 4px;">
                        <MagicStick />
                    </el-icon>美化排版
                </el-button>
                <el-button type="primary" @click="saveArticle">
                    <el-icon style="margin-right: 4px;">
                        <Promotion />
                    </el-icon>
                    {{ id ? '保存修改' : '发布文章' }}
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

            <div v-show="mode !== 'edit'" class="write-pane write-preview" ref="previewPane">
                <ArticlePreview
                    :markdown="displayContent"
                    :device="device"
                    :device-width="currentDevice.width"
                    :device-height="currentDevice.height"
                />
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
            <SubmitArticle :id="id" :title="title" :tag="tag" :displayContent="displayContent" :describe="describe"
                @close="drawer = false">
            </SubmitArticle>
        </el-drawer>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { ElNotification } from 'element-plus';
import { Promotion, MagicStick, Monitor, Iphone, Cellphone, ArrowDown } from '@element-plus/icons-vue';
import SubmitArticle from '../components/submit-article.vue';
import ArticlePreview from '../components/article-preview.vue';
import emitter from '../utils/event-bus.js';
import { beautifyMarkdown } from '../utils/format-text';
import {
    DEFAULT_DEVICE_ID,
    DEFAULT_DEVICE_BY_CATEGORY,
    findDevice,
    type DevicePreset,
} from '../utils/device-presets';

// ============================================================
// 状态
// ============================================================
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
const tag = ref('');
const title = ref('');
const describe = ref('');
const displayContent = ref('');

const editor = ref<HTMLTextAreaElement | null>(null);
const previewPane = ref<HTMLElement | null>(null);

const charCount = computed(() => displayContent.value.length);
const lineCount = computed(() => displayContent.value ? displayContent.value.split('\n').length : 0);

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
// 编辑器键盘增强：Tab 缩进 + Ctrl/Cmd+S 发布
// ============================================================
function handleKeydown(e: KeyboardEvent) {
    const ta = editor.value;
    if (!ta) return;

    // Ctrl/Cmd + S：发布
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveArticle();
        return;
    }

    // Tab：插入 4 空格（不切换焦点）
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const indent = '    ';
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
        // 单光标：插入 4 空格
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
    code: '```js\nconsole.log("hello");\n```\n',
    table: '| 列 1 | 列 2 |\n| --- | --- |\n| A | B |\n',
    math: '$$\nE = mc^2\n$$\n',
    mermaid: '```mermaid\nflowchart LR\n    A[开始] --> B[结束]\n```\n',
};

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
// 编辑/预览滚动同步（按比例）
// ============================================================
let syncing = false;
function handleEditorScroll() {
    if (mode.value !== 'split') return;
    if (syncing) return;
    const ta = editor.value;
    const pane = previewPane.value;
    if (!ta || !pane) return;
    const taMax = ta.scrollHeight - ta.clientHeight;
    if (taMax <= 0) return;
    const ratio = ta.scrollTop / taMax;
    const paneMax = pane.scrollHeight - pane.clientHeight;
    syncing = true;
    pane.scrollTop = paneMax * ratio;
    requestAnimationFrame(() => {
        syncing = false;
    });
}

// ============================================================
// 编辑模式切换：从文章管理页带数据进来
// ============================================================
function updateArticle(data: any) {
    id.value = data.id;
    tag.value = data.tag;
    title.value = data.title;
    displayContent.value = data.content;
    describe.value = data.describe;
}

// ============================================================
// 发布抽屉
// ============================================================
const drawer = ref(false);
const drawerTitle = computed(() => (id.value ? '编辑文章' : '发布文章'));

function saveArticle() {
    drawer.value = true;
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid #e4e7ed;
    background: #fafafa;
    flex-shrink: 0;
    gap: 12px;
    flex-wrap: wrap;
}

.toolbar-left {
    display: flex;
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
    gap: 6px;
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
.md-textarea {
    /* Firefox */
    scrollbar-width: thin;
    scrollbar-color: #c0c4cc transparent;
}

.write-pane::-webkit-scrollbar,
.md-textarea::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.write-pane::-webkit-scrollbar-track,
.md-textarea::-webkit-scrollbar-track {
    background: transparent;
}

.write-pane::-webkit-scrollbar-thumb,
.md-textarea::-webkit-scrollbar-thumb {
    background: #c0c4cc;
    border-radius: 3px;
    /* hover 不变粗、不变色，保持一致 */
    border: none;
}

.write-pane::-webkit-scrollbar-thumb:hover,
.md-textarea::-webkit-scrollbar-thumb:hover,
.write-pane::-webkit-scrollbar-thumb:active,
.md-textarea::-webkit-scrollbar-thumb:active {
    background: #c0c4cc;
}

.write-pane::-webkit-scrollbar-corner,
.md-textarea::-webkit-scrollbar-corner {
    background: transparent;
}

.write-body[data-mode='edit'] .write-edit {
    flex: 1;
}

.write-body[data-mode='preview'] .write-preview {
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
    background: #fff;
    box-sizing: border-box;
}

.write-preview {
    background: #fff;
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
</style>
