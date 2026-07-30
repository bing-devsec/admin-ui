<template>
    <div class="moderation-page">
        <section
            ref="workbenchRef"
            class="moderation-workbench"
            :class="{ 'is-resizing': resizing }"
            :style="workbenchStyle">
            <div class="input-panel">
                <div class="panel-header">
                    <div>
                        <span class="panel-title">评论审核模拟</span>
                    </div>
                    <div class="panel-tools">
                        <el-tag :type="lineLimitExceeded ? 'danger' : 'info'" effect="light">
                            评论数：{{ commentLines.length }}/5000
                        </el-tag>
                    </div>
                </div>

                <div class="editor-shell">
                    <div class="editor-body" @click="focusEditor">
                        <div class="editor-active-line" :style="activeLineStyle"></div>
                        <div class="editor-gutter" :style="editorGutterStyle">
                            <div class="editor-line-number-list" :style="editorLineNumberListStyle">
                                <div
                                    v-for="line in editorLineNumbers"
                                    :key="line"
                                    class="editor-line-number"
                                    :class="{ 'is-active': line === activeInputLine }">
                                    {{ line }}
                                </div>
                            </div>
                        </div>
                        <textarea
                            ref="editorRef"
                            v-model="rawInput"
                            class="editor-textarea"
                            :style="editorTextareaStyle"
                            wrap="off"
                            spellcheck="false"
                            autocomplete="off"
                            placeholder="这篇文章写得很好&#10;可以加微信继续交流吗&#10;这里有赌博博彩项目"
                            @beforeinput="handleEditorBeforeInput"
                            @click="updateActiveInputLine"
                            @input="handleEditorInput"
                            @keyup="updateActiveInputLine"
                            @paste="handleEditorPaste"
                            @scroll="handleEditorScroll"></textarea>
                    </div>
                </div>

                <div class="input-actions">
                    <div class="action-group">
                        <el-button @click="resetPreview">清空</el-button>
                        <el-button type="primary" :loading="loading" :disabled="!canSubmit" @click="runPreview">
                            开始审核
                        </el-button>
                    </div>
                </div>
            </div>

            <div
                class="workbench-resizer"
                role="separator"
                aria-orientation="vertical"
                title="拖动调整宽度"
                @mousedown="startResize">
                <span></span>
            </div>

            <div class="result-panel">
                <div class="result-toolbar">
                    <span class="result-title">审核结果</span>
                    <el-input
                        v-model="resultContentKeyword"
                        class="result-search"
                        clearable
                        placeholder="搜索评论内容"
                        @clear="handleResultFilterChange"
                        @input="handleResultFilterChange" />
                </div>

                <el-table
                    v-loading="loading"
                    :data="pagedPreviewRows"
                    scrollbar-always-on
                    class="result-table"
                    height="100%">
                    <el-table-column label="行号" min-width="76" max-width="90">
                        <template #default="scope">
                            <button type="button" class="line-jump-button" @click="focusInputLine(scope.row.line)">
                                {{ scope.row.line }}
                            </button>
                        </template>
                    </el-table-column>
                    <el-table-column min-width="132" max-width="156">
                        <template #header>
                            <el-dropdown trigger="click" @command="setResultStatusFilter">
                                <button type="button" class="status-filter-trigger">
                                    <span>审核状态</span>
                                    <span class="status-filter-caret"></span>
                                </button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="" :class="{ 'is-selected': resultStatusFilter === '' }">
                                            全部状态
                                        </el-dropdown-item>
                                        <el-dropdown-item command="approved" :class="{ 'is-selected': resultStatusFilter === 'approved' }">
                                            已通过
                                        </el-dropdown-item>
                                        <el-dropdown-item command="pending" :class="{ 'is-selected': resultStatusFilter === 'pending' }">
                                            待审核
                                        </el-dropdown-item>
                                        <el-dropdown-item command="rejected" :class="{ 'is-selected': resultStatusFilter === 'rejected' }">
                                            已拒绝
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </template>
                        <template #default="scope">
                            <el-tag :type="statusTagType(scope.row.status)" effect="light">
                                {{ statusText(scope.row.status) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="riskScore" label="风险分" min-width="82" max-width="96" />
                    <el-table-column label="评论内容" min-width="280" show-overflow-tooltip>
                        <template #default="scope">
                            <span class="content-cell">{{ scope.row.content }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="机审原因" min-width="300" show-overflow-tooltip>
                        <template #default="scope">
                            <span>{{ reasonSummary(scope.row) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" min-width="92" max-width="110" fixed="right">
                        <template #default="scope">
                            <el-button type="primary" plain @click="openDetail(scope.row)">详情</el-button>
                        </template>
                    </el-table-column>
                </el-table>

                <div class="result-pagination">
                    <el-pagination
                        v-model:current-page="resultCurrentPage"
                        v-model:page-size="resultPageSize"
                        background
                        :page-sizes="RESULT_PAGE_SIZES"
                        :total="filteredPreviewRows.length"
                        layout="total, sizes, prev, pager, next, jumper" />
                </div>
            </div>
        </section>

        <el-drawer v-model="detailDrawer" :destroy-on-close="true" size="640px" class="moderation-detail-drawer">
            <template #header>
                <div class="drawer-header">
                    <span class="drawer-title">审核详情</span>
                </div>
            </template>

            <div v-if="selectedRow" class="detail-body">
                <div class="detail-meta-panel">
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">行号</span>
                        <span class="detail-meta-value">{{ selectedRow.line }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">状态</span>
                        <span class="detail-meta-value">
                            <el-tag :type="statusTagType(selectedRow.status)" effect="light">
                                {{ statusText(selectedRow.status) }}
                            </el-tag>
                        </span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">风险分</span>
                        <span class="detail-meta-value">{{ selectedRow.riskScore }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">决策</span>
                        <span class="detail-meta-value">{{ moderationDecisionText(selectedRow.decision) }}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">评论正文</div>
                    <p class="detail-content">{{ selectedRow.content }}</p>
                </div>

                <div v-if="selectedRow.reasons?.length" class="detail-section detail-section--reasons">
                    <div class="detail-section-title">机审原因</div>
                    <div class="reason-list">
                        <span v-for="(reason, index) in selectedRow.reasons" :key="`${index}-${reason}`" class="reason-chip">
                            {{ reason }}
                        </span>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">命中信号</div>
                    <el-table v-if="selectedRow.signals?.length" :data="selectedRow.signals" size="small" class="signal-table">
                        <el-table-column label="来源" min-width="92">
                            <template #default="scope">{{ moderationSourceText(scope.row.source) }}</template>
                        </el-table-column>
                        <el-table-column label="等级" min-width="92">
                            <template #default="scope">{{ moderationLevelText(scope.row.level) }}</template>
                        </el-table-column>
                        <el-table-column prop="score" label="分值" min-width="70" />
                        <el-table-column label="原因" min-width="260" show-overflow-tooltip>
                            <template #default="scope">{{ scope.row.reasonText || scope.row.reason || '-' }}</template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-else description="没有命中风险信号" :image-size="72" />
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">文本归一化</div>
                    <div class="text-grid">
                        <div class="text-row">
                            <span>原文</span>
                            <p>{{ selectedRow.text.raw || '-' }}</p>
                        </div>
                        <div class="text-row">
                            <span>归一化</span>
                            <p>{{ selectedRow.text.normalized || '-' }}</p>
                        </div>
                        <div class="text-row">
                            <span>紧凑文本</span>
                            <p>{{ selectedRow.text.compact || '-' }}</p>
                        </div>
                        <div v-if="selectedRow.text.pinyinFolded" class="text-row">
                            <span>拼音折叠</span>
                            <p>{{ selectedRow.text.pinyinFolded }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </el-drawer>
    </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { ElNotification } from 'element-plus';
import _axios from '../utils/axios';

type CommentStatus = 'pending' | 'approved' | 'rejected';
type ResultStatusFilter = CommentStatus | '';

interface ModerationPreviewText {
    raw: string;
    normalized: string;
    compact: string;
    pinyinFolded?: string;
    decodedTexts?: string[];
}

interface ModerationPreviewSignal {
    source: string;
    category?: string;
    level?: string;
    score: number;
    reason?: string;
    reasonText?: string;
    evidence?: string;
    ruleID?: string;
}

interface ModerationPreviewRow {
    line: number;
    content: string;
    status: CommentStatus;
    riskScore: number;
    finalScore: number;
    decision: string;
    reasons?: string[];
    rawReasons?: string[];
    signals?: ModerationPreviewSignal[];
    text: ModerationPreviewText;
}

interface ModerationPreviewResponse {
    rows: ModerationPreviewRow[];
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    behaviorDryRun: boolean;
}

const rawInput = ref('');
const loading = ref(false);
const previewResult = ref<ModerationPreviewResponse | null>(null);
const resultStatusFilter = ref<ResultStatusFilter>('');
const resultContentKeyword = ref('');
const resultCurrentPage = ref(1);
const resultPageSize = ref(20);
const detailDrawer = ref(false);
const selectedRow = ref<ModerationPreviewRow | null>(null);
const resizing = ref(false);
const workbenchRef = ref<HTMLElement | null>(null);
const inputPanelWidth = ref(480);
const editorRef = ref<HTMLTextAreaElement | null>(null);
const editorScrollTop = ref(0);
const activeInputLine = ref(1);

const EDITOR_LINE_HEIGHT = 24;
const EDITOR_PADDING_TOP = 10;
const MAX_COMMENT_LINES = 5000;
const INPUT_PANEL_MIN_WIDTH = 280;
const RESULT_PANEL_MIN_WIDTH = 420;
const RESIZER_WIDTH = 8;
const RESULT_PAGE_SIZES = [10, 20, 50, 100, 200, 500];

const rawLines = computed(() => rawInput.value.split(/\r?\n/));
const inputLineCount = computed(() => (rawInput.value === '' ? 0 : rawLines.value.length));
const commentEntries = computed(() => rawLines.value
    .map((line, index) => ({ line: index + 1, content: line.trim() }))
    .filter((item) => item.content !== ''));
const commentLines = computed(() => commentEntries.value.map((item) => item.content));
const lineLimitExceeded = computed(() => inputLineCount.value > MAX_COMMENT_LINES);
const hasTooLongLine = computed(() => commentLines.value.some((line) => Array.from(line).length > 1000));
const canSubmit = computed(() => commentLines.value.length > 0 && !lineLimitExceeded.value && !hasTooLongLine.value && !loading.value);
const totalInputLines = computed(() => Math.max(rawLines.value.length, 1));
const editorLineNumbers = computed(() => Array.from({ length: totalInputLines.value }, (_, index) => index + 1));
const editorGutterWidth = computed(() => Math.max(38, String(totalInputLines.value).length * 8 + 22));
const filteredPreviewRows = computed(() => {
    let rows = previewResult.value?.rows || [];
    if (resultStatusFilter.value) {
        rows = rows.filter((row) => row.status === resultStatusFilter.value);
    }
    const keyword = resultContentKeyword.value.trim().toLowerCase();
    if (keyword) {
        rows = rows.filter((row) => row.content.toLowerCase().includes(keyword));
    }
    return rows;
});
const maxResultPage = computed(() => Math.max(1, Math.ceil(filteredPreviewRows.value.length / resultPageSize.value)));
const pagedPreviewRows = computed(() => {
    const start = (resultCurrentPage.value - 1) * resultPageSize.value;
    return filteredPreviewRows.value.slice(start, start + resultPageSize.value);
});
const activeLineStyle = computed(() => ({
    top: `${EDITOR_PADDING_TOP + (activeInputLine.value - 1) * EDITOR_LINE_HEIGHT - editorScrollTop.value}px`,
}));
const editorGutterStyle = computed(() => ({
    width: `${editorGutterWidth.value}px`,
}));
const editorLineNumberListStyle = computed(() => ({
    transform: `translateY(-${editorScrollTop.value}px)`,
}));
const editorTextareaStyle = computed(() => ({
    paddingLeft: `${editorGutterWidth.value + 12}px`,
}));

const inputHint = computed(() => {
    if (lineLimitExceeded.value) return '评论行数超过 5000 行，请拆分后再审核。';
    if (hasTooLongLine.value) return '存在超过 1000 字的评论，请缩短后再审核。';
    if (commentLines.value.length === 0) return '空行会被忽略。';
    return `将审核 ${commentLines.value.length} 条评论，空行会被忽略。`;
});

const statusText = (status: string) => {
    switch (status) {
        case 'approved':
            return '已通过';
        case 'rejected':
            return '已拒绝';
        default:
            return '待审核';
    }
};

const statusTagType = (status: string) => {
    switch (status) {
        case 'approved':
            return 'success';
        case 'rejected':
            return 'danger';
        default:
            return 'warning';
    }
};

const moderationDecisionText = (decision: string) => {
    switch (decision) {
        case 'block_signal':
            return '硬拒信号';
        case 'review_signal':
            return '待复核信号';
        case 'no_risk_signal':
            return '无风险信号';
        case 'disabled':
            return '审核已停用';
        case 'error':
            return '审核异常';
        default:
            return decision || '-';
    }
};

const moderationSourceText = (source: string) => {
    switch (source) {
        case 'lexicon':
            return '敏感词库';
        case 'structure':
            return '结构规则';
        case 'context':
            return '上下文规则';
        case 'behavior':
            return '行为风险';
        default:
            return source || '-';
    }
};

const moderationLevelText = (level?: string) => {
    switch (level) {
        case 'allow':
            return '通过';
        case 'notice':
            return '提示';
        case 'review':
            return '待复核';
        case 'block':
            return '建议拒绝';
        default:
            return level || '-';
    }
};

const reasonSummary = (row: ModerationPreviewRow) => {
    if (!row.reasons?.length) return '-';
    return row.reasons.join('；');
};

const handleResultFilterChange = () => {
    resultCurrentPage.value = 1;
};

const setResultStatusFilter = (command: string | number | object) => {
    resultStatusFilter.value = String(command) as ResultStatusFilter;
    handleResultFilterChange();
};

const clampInputPanelWidth = (width: number) => {
	const rect = workbenchRef.value?.getBoundingClientRect();
	const maxWidth = rect
		? Math.max(INPUT_PANEL_MIN_WIDTH, Math.min(rect.width * 0.5, rect.width - RESULT_PANEL_MIN_WIDTH - RESIZER_WIDTH))
		: width;
	return Math.min(Math.max(width, INPUT_PANEL_MIN_WIDTH), maxWidth);
};
const clampedInputPanelWidth = computed(() => clampInputPanelWidth(inputPanelWidth.value));
const workbenchStyle = computed(() => ({
	gridTemplateColumns: `${clampedInputPanelWidth.value}px ${RESIZER_WIDTH}px minmax(0, 1fr)`,
}));

const handleResize = (event: MouseEvent) => {
	const rect = workbenchRef.value?.getBoundingClientRect();
	if (!rect) return;
	const nextWidth = clampInputPanelWidth(event.clientX - rect.left);
	inputPanelWidth.value = nextWidth;
};

const stopResize = () => {
	resizing.value = false;
	window.removeEventListener('mousemove', handleResize);
	window.removeEventListener('mouseup', stopResize);
};

const startResize = (event: MouseEvent) => {
	event.preventDefault();
	resizing.value = true;
	window.addEventListener('mousemove', handleResize);
	window.addEventListener('mouseup', stopResize);
};

const focusEditor = () => {
    editorRef.value?.focus();
};

const handleEditorScroll = () => {
    editorScrollTop.value = editorRef.value?.scrollTop || 0;
};

const lineCountOf = (value: string) => (value === '' ? 0 : value.split(/\r?\n/).length);

const nextEditorValue = (insertText: string) => {
    const editor = editorRef.value;
    if (!editor) return rawInput.value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    return `${rawInput.value.slice(0, start)}${insertText}${rawInput.value.slice(end)}`;
};

const notifyLineLimit = () => {
    ElNotification({
        title: 'Failed',
        message: `评论行数不能超过 ${MAX_COMMENT_LINES} 行，空行也会计入。`,
        type: 'warning',
    });
};

const preventIfLineLimitExceeded = (event: Event, insertText: string) => {
    if (lineCountOf(nextEditorValue(insertText)) <= MAX_COMMENT_LINES) return false;
    event.preventDefault();
    notifyLineLimit();
    return true;
};

const handleEditorBeforeInput = (event: InputEvent) => {
    if (event.inputType.startsWith('delete')) return;
    if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') {
        preventIfLineLimitExceeded(event, '\n');
        return;
    }
    if (event.data) {
        preventIfLineLimitExceeded(event, event.data);
    }
};

const handleEditorPaste = (event: ClipboardEvent) => {
    const text = event.clipboardData?.getData('text') || '';
    if (text) {
        preventIfLineLimitExceeded(event, text);
    }
};

const updateActiveInputLine = () => {
    const editor = editorRef.value;
    if (!editor) return;
    activeInputLine.value = rawInput.value.slice(0, editor.selectionStart).split(/\r?\n/).length;
    handleEditorScroll();
};

const handleEditorInput = () => {
    updateActiveInputLine();
};

const lineStartOffset = (line: number) => {
    const lines = rawInput.value.split('\n');
    const targetLine = Math.max(1, Math.min(line, lines.length));
    let offset = 0;
    for (let index = 0; index < targetLine - 1; index += 1) {
        offset += lines[index].length + 1;
    }
    return offset;
};

const focusInputLine = (line: number) => {
    activeInputLine.value = Math.max(1, line);
    nextTick(() => {
        const editor = editorRef.value;
        if (!editor) return;
        const offset = lineStartOffset(line);
        editor.focus();
        editor.setSelectionRange(offset, offset);
        editor.scrollTop = Math.max(0, (activeInputLine.value - 1) * EDITOR_LINE_HEIGHT - EDITOR_LINE_HEIGHT * 4);
        handleEditorScroll();
    });
};

const resetPreview = () => {
    rawInput.value = '';
    previewResult.value = null;
    resultStatusFilter.value = '';
    resultContentKeyword.value = '';
    resultCurrentPage.value = 1;
    resultPageSize.value = 20;
    selectedRow.value = null;
    detailDrawer.value = false;
    activeInputLine.value = 1;
    editorScrollTop.value = 0;
};

const openDetail = (row: ModerationPreviewRow) => {
    selectedRow.value = row;
    detailDrawer.value = true;
    focusInputLine(row.line);
};

const runPreview = async () => {
    if (!canSubmit.value) {
        ElNotification({
            title: 'Failed',
            message: inputHint.value,
            type: 'warning',
        });
        return;
    }

    loading.value = true;
    try {
        const submittedEntries = [...commentEntries.value];
        const response = await _axios.post('/admin/auth/comment/moderation-preview', {
            comments: submittedEntries.map((item) => item.content),
        });
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            previewResult.value = {
                ...data,
                rows: (data.rows || []).map((row: ModerationPreviewRow) => ({
                    ...row,
                    line: submittedEntries[row.line - 1]?.line || row.line,
                })),
            };
            resultStatusFilter.value = '';
            resultContentKeyword.value = '';
            resultCurrentPage.value = 1;
            selectedRow.value = null;
            detailDrawer.value = false;
            return;
        }
        ElNotification({
            title: 'Failed',
            message: message || '审核模拟失败',
            type: 'error',
        });
    } catch (error: any) {
        ElNotification({
            title: 'Error',
            message: error?.message ?? String(error),
            type: 'error',
        });
    } finally {
        loading.value = false;
    }
};

onBeforeUnmount(() => {
	stopResize();
});

watch([() => filteredPreviewRows.value.length, resultPageSize], () => {
    if (resultCurrentPage.value > maxResultPage.value) {
        resultCurrentPage.value = maxResultPage.value;
    }
});
</script>

<style scoped>
.moderation-page {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    background: #f5f7fa;
}

.moderation-workbench {
    display: grid;
    height: 100%;
    min-height: 0;
    gap: 0;
    padding: 0;
}

.moderation-workbench.is-resizing {
    cursor: col-resize;
    user-select: none;
}

.input-panel,
.result-panel {
    min-height: 0;
    border: 0;
    border-radius: 0;
    background: #fff;
}

.input-panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.panel-header {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: var(--admin-header-height, 48px);
    justify-content: space-between;
    gap: 12px;
    padding: 0 14px;
    border-bottom: 1px solid #ebeef5;
}

.panel-tools {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
}

.panel-title {
    color: #303133;
    font-size: 16px;
    font-weight: 400;
}

.panel-header p {
    margin: 6px 0 0;
    color: #909399;
    font-size: 12px;
    line-height: 1.6;
}

.editor-shell {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: #fff;
}

.editor-body {
    position: relative;
    flex: 1;
    min-height: 360px;
    overflow: hidden;
    background: #fff;
}

.editor-active-line {
    position: absolute;
    right: 0;
    left: 0;
    z-index: 0;
    height: 24px;
    background: #ecf5ff;
    pointer-events: none;
}

.editor-gutter {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    overflow: hidden;
    border-right: 1px solid #ebeef5;
    background: #f8fafc;
    color: #a8abb2;
    font-family: monospace;
    font-size: 12px;
    line-height: 24px;
    pointer-events: none;
    user-select: none;
}

.editor-line-number-list {
    padding-top: 10px;
    will-change: transform;
}

.editor-line-number {
    height: 24px;
    box-sizing: border-box;
    padding: 0 8px 0 6px;
    text-align: right;
}

.editor-line-number.is-active {
    color: #606266;
    font-weight: 600;
}

.editor-textarea {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 0;
    background: transparent;
    color: #303133;
    font-family: monospace;
    font-size: 13px;
    line-height: 24px;
    outline: none;
    overflow: auto;
    resize: none;
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
}

.editor-textarea::placeholder {
    color: #c0c4cc;
}

.input-actions {
    display: flex;
    height: 46px;
    flex: 0 0 46px;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    box-sizing: border-box;
    padding: 0 14px;
    border-top: 1px solid #ebeef5;
}

.action-group {
    display: flex;
    flex: 0 0 auto;
    gap: 8px;
}

.result-panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
}

.result-toolbar {
    display: flex;
    height: var(--admin-header-height, 48px);
    flex: 0 0 var(--admin-header-height, 48px);
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-sizing: border-box;
    padding: 0 14px;
    border-bottom: 1px solid #ebeef5;
    background: #fff;
}

.result-title {
    color: #303133;
    font-size: 16px;
    font-weight: 400;
}

.result-search {
    width: min(360px, 48%);
    flex: 0 1 360px;
}

.workbench-resizer {
    position: relative;
    background: #e4e7ed;
    cursor: col-resize;
}

.workbench-resizer span {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 44px;
    border-radius: 999px;
    background: #c0c4cc;
    transform: translate(-50%, -50%);
    transition: background-color 0.2s;
}

.workbench-resizer:hover span,
.moderation-workbench.is-resizing .workbench-resizer span {
    background: #409eff;
}

.result-table {
    flex: 1;
    min-height: 0;
    font-family: monospace;
}

:deep(.result-table .el-table__header-wrapper th .cell) {
    display: flex;
    align-items: center;
    min-height: 32px;
    line-height: 32px;
}

:deep(.result-table .el-table__header-wrapper th.el-table__cell) {
    padding: 4px 0;
}

:deep(.result-table .el-dropdown) {
    display: inline-flex;
    align-items: center;
}

.status-filter-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 24px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #909399;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    line-height: 24px;
}

.status-filter-trigger:hover {
    color: #606266;
}

.status-filter-caret {
    width: 0;
    height: 0;
    border-top: 5px solid #909399;
    border-right: 4px solid transparent;
    border-left: 4px solid transparent;
    transition: border-top-color 0.2s;
}

.status-filter-trigger:hover .status-filter-caret {
    border-top-color: #606266;
}

:global(.el-dropdown-menu__item.is-selected) {
    color: #409eff;
    font-weight: 600;
}

.result-pagination {
    display: flex;
    height: 46px;
    flex: 0 0 46px;
    align-items: center;
    justify-content: flex-end;
    box-sizing: border-box;
    padding: 0 14px;
    border-top: 1px solid #ebeef5;
    background: #fff;
}

.content-cell {
    color: #303133;
}

.line-jump-button {
    padding: 0;
    border: 0;
    background: transparent;
    color: #409eff;
    cursor: pointer;
    font-family: monospace;
}

.line-jump-button:hover {
    color: #337ecc;
    text-decoration: underline;
    text-underline-offset: 3px;
}

:global(.moderation-detail-drawer .el-drawer__header) {
    margin-bottom: 10px;
}

.drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.drawer-title {
    color: #303133;
    font-size: 17px;
    font-weight: 400;
}

.detail-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: #303133;
    font-family: monospace;
}

.detail-meta-panel {
    overflow: hidden;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    background: #fff;
}

.detail-meta-row {
    display: flex;
    min-width: 0;
    gap: 14px;
    padding: 10px 14px;
    border-bottom: 1px solid #f0f2f5;
}

.detail-meta-row:last-child {
    border-bottom: 0;
}

.detail-meta-label {
    width: 66px;
    flex: 0 0 66px;
    color: #909399;
    font-size: 12px;
    line-height: 22px;
}

.detail-meta-value {
    min-width: 0;
    color: #303133;
    font-size: 13px;
    line-height: 22px;
}

.detail-section {
    padding: 16px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    background: linear-gradient(180deg, #f8fbff 0%, #fff 100%);
}

.detail-section--reasons {
    background: linear-gradient(180deg, #fff8f0 0%, #fff 100%);
}

.detail-section-title {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
    color: #303133;
    font-size: 14px;
    font-weight: 400;
}

.detail-content {
    margin: 0;
    color: #303133;
    font-size: 14px;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-word;
}

.reason-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.reason-chip {
    display: inline-flex;
    max-width: 100%;
    padding: 4px 8px;
    border: 1px solid #f3d19e;
    border-radius: 4px;
    background: #fff;
    color: #7d4b00;
    font-size: 12px;
    line-height: 1.6;
    word-break: break-word;
}

.signal-table {
    font-size: 12px;
}

.text-grid {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #ebeef5;
    border-radius: 4px;
}

.text-row {
    display: flex;
    min-width: 0;
    gap: 12px;
    padding: 10px 12px;
    border-bottom: 1px solid #f0f2f5;
}

.text-row:last-child {
    border-bottom: 0;
}

.text-row span {
    width: 66px;
    flex: 0 0 66px;
    color: #909399;
    font-size: 12px;
    line-height: 22px;
}

.text-row p {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    color: #303133;
    font-size: 13px;
    line-height: 22px;
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
