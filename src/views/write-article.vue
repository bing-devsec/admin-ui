<template>
    <div ref="editorRoot">
        <MdEditor v-model="displayContent" class="writeArticle" :codeFoldable="true"
            :autoFoldThreshold="autoFoldThreshold" :tabWidth="tabWidth" :autoDetectCode="autoDetectCode"
            :formatCopiedText="formatCopiedText" :toolbarsExclude="toolbarsExclude"
            :toolbars="toolbars" @onSave="saveArticle">
            <template #defToolbars>
                <NormalToolbar title="发布文章" @on-click="saveArticle">
                    <template #trigger>
                        <el-icon class="publish-icon">
                            <Promotion />
                        </el-icon>
                    </template>
                </NormalToolbar>
            </template>
        </MdEditor>
    </div>

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
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { MdEditor, NormalToolbar } from 'md-editor-v3';
import { ElNotification } from 'element-plus';
import { Promotion } from '@element-plus/icons-vue';
import SubmitArticle from '../components/submit-article.vue';
import emitter from '../utils/event-bus.js'
import 'md-editor-v3/lib/style.css';

const autoFoldThreshold = ref(20);
const autoDetectCode = ref(true);
const tabWidth = ref(4);

const toolbarsExclude = ref(['save', 'github']);
const toolbars = ref<any[]>([
    'bold', 'underline', 'italic', '-', 'strikeThrough', 'title', 'sub', 'sup', 'quote',
    'unorderedList', 'orderedList', 'task', '-', 'codeRow', 'code', 'link', 'image', 'table',
    'mermaid', 'katex', '-', 'revoke', 'next', 0,
    '=',
    'pageFullscreen', 'fullscreen', 'preview', 'previewOnly', 'htmlPreview', 'catalog'
]);

let id = ref('');
let tag = ref('');
let title = ref('');
let describe = ref('');
let displayContent = ref('');

const editorRoot = ref<HTMLElement | null>(null);

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

function updateArticle(data: any) {
    id.value = data.id
    tag.value = data.tag
    title.value = data.title
    displayContent.value = data.content
    describe.value = data.describe
}

const drawer = ref(false);
const drawerTitle = computed(() => id.value ? '编辑文章' : '发布文章');
const formatCopiedText = (content: any) => { return `${content}  - from md-editor-v3` };

function saveArticle() {
    drawer.value = true;
}

onMounted(() => {
    emitter.on('updateArticle', updateArticle)
    editorRoot.value?.addEventListener('paste', handlePaste, true);
});

onBeforeUnmount(() => {
    editorRoot.value?.removeEventListener('paste', handlePaste, true);
});
</script>

<style scoped>
.writeArticle {
    display: flex;
    flex-shrink: 0;
    height: calc(100vh);
    box-sizing: border-box;
    background-color: #fff;
    overflow: auto;
}

.writeArticle :deep(pre),
.writeArticle :deep(pre code),
.writeArticle :deep(.md-editor-preview pre),
.writeArticle :deep(.md-editor-preview code),
.writeArticle :deep(.md-editor-code) {
    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;
}

.publish-icon {
    color: var(--el-color-primary);
    font-size: 18px;
    transition: transform 0.15s ease;
}

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