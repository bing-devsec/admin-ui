<template>
    <div class="comment-page">
        <div class="filter-bar">
            <el-select v-model="statusFilter" placeholder="评论状态" class="status-select" @change="handleFilterChange">
                <el-option label="全部状态" value="" />
                <el-option label="待审核" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已拒绝" value="rejected" />
            </el-select>
            <el-input
                v-model.trim="articleTitleFilter"
                class="article-filter"
                clearable
                placeholder="按文章标题筛选"
                @clear="handleFilterChange"
                @keyup.enter="handleFilterChange" />
            <el-input
                v-model.trim="contentKeywordFilter"
                class="comment-filter"
                clearable
                placeholder="按评论关键字筛选"
                @clear="handleFilterChange"
                @keyup.enter="handleFilterChange" />
            <el-input
                v-model.trim="authorHandleFilter"
                class="author-filter"
                clearable
                placeholder="按评论人编号筛选"
                @clear="handleFilterChange"
                @keyup.enter="handleFilterChange" />
            <el-popover
                v-model:visible="timeFilterVisible"
                trigger="click"
                placement="bottom-start"
                :width="336"
                popper-class="comment-time-filter-popper"
                :teleported="false"
                @show="syncTimeRangeDraft">
                <template #reference>
                    <button type="button" class="time-filter-trigger" :class="{ 'is-active': hasCommentTimeRange }">
                        <span>{{ timeRangeLabel }}</span>
                        <span v-if="hasCommentTimeRange" class="time-filter-clear" @click.stop="clearTimeRangeFilter">×</span>
                    </button>
                </template>

                <div class="time-range-panel">
                    <div class="time-range-panel-header">
                        <span>创建时间范围</span>
                        <em>{{ timeRangeDraftHint }}</em>
                    </div>
                    <el-calendar v-model="timeCalendarDate" class="time-range-calendar">
                        <template #date-cell="{ data }">
                            <button
                                type="button"
                                class="time-range-day"
                                :class="timeRangeDayClass(data.day, data.type)"
                                :disabled="data.type !== 'current-month'"
                                @click.stop="selectTimeRangeDay(data.day, data.type)">
                                {{ Number(data.day.slice(8, 10)) }}
                            </button>
                        </template>
                    </el-calendar>
                    <div class="time-range-panel-actions">
                        <el-button @click="clearTimeRangeFilter">清空</el-button>
                        <el-button type="primary" :disabled="!timeRangeDraftStart" @click="applyTimeRangeDraft">应用</el-button>
                    </div>
                </div>
            </el-popover>
            <el-button type="primary" @click="handleFilterChange">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
            <el-button type="danger" :disabled="selectedCommentIDList.length === 0" @click="confirmBatchDelete">批量删除</el-button>
        </div>

        <div class="table-container">
            <el-table scrollbar-always-on v-loading="loading" :data="commentList" style="width: 100%" class="monospace-column" @selection-change="handleSelectionChange">
                <el-table-column type="selection" width="50" />

                <el-table-column label="序号" min-width="60" max-width="100">
                    <template #default="scope">
                        <span>{{ (currentPage - 1) * pageSize + scope.$index + 1 }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="评论状态" min-width="110" max-width="140">
                    <template #default="scope">
                        <el-tag :type="statusTagType(scope.row.status)" effect="light">
                            {{ statusText(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column label="评论内容" min-width="300" max-width="520" show-overflow-tooltip>
                    <template #default="scope">
                        <span class="comment-content-cell">{{ scope.row.content || '-' }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="文章标题" min-width="230" max-width="500" show-overflow-tooltip>
                    <template #default="scope">
                        <div class="article-cell">
                            <span class="article-title">{{ scope.row.articleTitle || '文章已删除' }}</span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="评论人编号" min-width="120" max-width="150" show-overflow-tooltip>
                    <template #default="scope">
                        <button v-if="canOpenAuthor(scope.row)" type="button" class="author-code author-code-link" @click="openAuthor(scope.row)">
                            {{ commentAuthorCode(scope.row) }}
                        </button>
                        <span v-else class="author-code">{{ commentAuthorCode(scope.row) }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="创建时间" min-width="170" max-width="190" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.createTime }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="操作" min-width="150" max-width="170" fixed="right">
                    <template #default="scope">
                        <div class="action-buttons action-buttons--compact">
                            <el-button size="default" type="primary" plain @click="openDetail(scope.row)">详情</el-button>
                            <el-dropdown trigger="click" @command="(command) => handleCommentAction(command, scope.row)">
                                <el-button size="default" class="action-more-button">更多</el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="approve" :disabled="scope.row.status === 'approved'">通过</el-dropdown-item>
                                        <el-dropdown-item command="reject" :disabled="scope.row.status === 'rejected'">拒绝</el-dropdown-item>
                                        <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <pagination :total="total" :currentPage="currentPage" :pageSize="pageSize" @handleCurrentChange="handleCurrentChange" />

        <el-drawer v-model="detailDrawer" :destroy-on-close="true" size="min(960px, 94vw)" class="comment-detail-drawer admin-drawer admin-detail-drawer">
            <template #header>
                <div class="drawer-header">
                    <span class="drawer-title">评论详情</span>
                    <div v-if="selectedComment" class="drawer-status-summary">
                        <span>当前业务状态</span>
                        <el-tag :type="statusTagType(selectedComment.status)" effect="light">{{ statusText(selectedComment.status) }}</el-tag>
                        <template v-if="selectedModeration">
                            <span>原始机审</span>
                            <el-tag :type="statusTagType(selectedModeration.result.status)" effect="plain">{{ statusText(selectedModeration.result.status) }}</el-tag>
                        </template>
                    </div>
                </div>
            </template>

            <div v-if="selectedComment" v-loading="detailLoading" class="comment-detail">
                <el-alert
                    v-if="detailError"
                    class="detail-load-error"
                    :closable="false"
                    type="error"
                    show-icon
                    :title="detailError" />
                <el-tabs v-model="detailTab" class="comment-detail-tabs">
                    <el-tab-pane label="评论概览" name="overview">
                        <div class="detail-meta-panel detail-meta-panel--grid">
                            <div class="detail-meta-row"><span class="detail-meta-label">评论 ID</span><span class="detail-meta-value">{{ selectedComment.id }}</span></div>
                            <div class="detail-meta-row"><span class="detail-meta-label">当前状态</span><span class="detail-meta-value"><el-tag :type="statusTagType(selectedComment.status)" effect="light">{{ statusText(selectedComment.status) }}</el-tag></span></div>
                            <div class="detail-meta-row"><span class="detail-meta-label">评论类型</span><span class="detail-meta-value">{{ selectedComment.parentID ? '回复' : '主评论' }}</span></div>
                            <div class="detail-meta-row"><span class="detail-meta-label">回复对象</span><span class="detail-meta-value">{{ replyTargetCode(selectedComment) }}</span></div>
                            <div class="detail-meta-row"><span class="detail-meta-label">评论人</span><span class="detail-meta-value">{{ commentAuthorCode(selectedComment) }}</span></div>
                            <div class="detail-meta-row"><span class="detail-meta-label">文章</span><span class="detail-meta-value">{{ selectedComment.articleTitle || '文章已删除' }}</span></div>
                            <div class="detail-meta-row"><span class="detail-meta-label">IP</span><span class="detail-meta-value">{{ selectedComment.ip || '-' }}</span></div>
                            <div class="detail-meta-row"><span class="detail-meta-label">创建时间</span><span class="detail-meta-value">{{ selectedComment.createTime }}</span></div>
                            <div class="detail-meta-row"><span class="detail-meta-label">更新时间</span><span class="detail-meta-value">{{ selectedComment.updateTime || '-' }}</span></div>
                            <div class="detail-meta-row"><span class="detail-meta-label">审计快照</span><span class="detail-meta-value">{{ selectedModeration ? `#${selectedModeration.auditID}` : '暂无新审核系统审计快照' }}</span></div>
                        </div>
                        <div class="detail-content-panel">
                            <div class="detail-content-header"><span class="detail-content-title">评论正文</span></div>
                            <p class="comment-full-content">{{ selectedComment.content }}</p>
                        </div>
                        <el-alert
                            v-if="selectedModeration && selectedModeration.result.status !== selectedComment.status"
                            :closable="false"
                            type="warning"
                            show-icon
                            title="当前业务状态已经与原始机器审核结果不同；审核快照仍保留当时的判断，不会被管理员操作覆盖。" />
                    </el-tab-pane>

                    <el-tab-pane label="机器审核过程" name="moderation">
                        <comment-moderation-audit-detail
                            v-if="!detailError && selectedModeration"
                            :row="selectedModeration.result"
                            :meta="selectedModerationMeta" />
                        <el-empty v-else-if="!detailError" description="该评论没有新审核系统的完整审计快照" />
                    </el-tab-pane>

                    <el-tab-pane label="人工处置" name="review">
                        <div class="review-panel">
                            <el-alert
                                :closable="false"
                                type="info"
                                show-icon
                                title="业务状态修改与审核校准相互独立；只有明确勾选后，本次人工判断才会影响后续审核。" />
                            <el-form label-position="top" class="review-form">
                                <el-form-item label="新的业务状态" required>
                                    <el-radio-group v-model="reviewForm.status" class="review-status-group">
                                        <el-radio-button label="approved">已通过</el-radio-button>
                                        <el-radio-button label="pending">待审核</el-radio-button>
                                        <el-radio-button label="rejected">已拒绝</el-radio-button>
                                    </el-radio-group>
                                </el-form-item>
                                <div class="calibration-card" :class="{ 'is-enabled': reviewForm.includeFeedback }">
                                    <el-checkbox v-model="reviewForm.includeFeedback" :disabled="!selectedModeration">
                                        同时作为人工审核纠正纳入校准
                                    </el-checkbox>
                                    <p v-if="!selectedModeration">该评论没有新审核系统的审计记录，无法关联校准反馈，但仍可修改业务状态。</p>
                                    <p v-else>反馈会关联审计记录 #{{ selectedModeration.auditID }}，并与模拟反馈共同参与后续真实评论决策。</p>
                                </div>
                                <el-form-item
                                    v-if="reviewForm.includeFeedback"
                                    label="正确分类"
                                    :required="reviewForm.status !== 'approved'">
                                    <el-select
                                        v-model="reviewForm.expectedCategory"
                                        style="width: 100%"
                                        filterable
                                        clearable
                                        :disabled="reviewForm.status === 'approved'"
                                        :placeholder="reviewForm.status === 'approved' ? '已通过无需风险分类' : '选择最主要的风险分类'">
                                        <el-option
                                            v-for="option in feedbackCategoryOptions"
                                            :key="option.value"
                                            :label="`${option.label}（${option.value}）`"
                                            :value="option.value" />
                                    </el-select>
                                </el-form-item>
                                <el-form-item v-if="reviewForm.includeFeedback" label="判断依据（建议填写）">
                                    <el-input
                                        v-model="reviewForm.note"
                                        type="textarea"
                                        :rows="4"
                                        maxlength="500"
                                        show-word-limit
                                        placeholder="说明误判或漏判原因，以及对象、动作、否定或引用关系。" />
                                </el-form-item>
                                <div class="review-actions">
                                    <span>提交时将原子更新业务状态{{ reviewForm.includeFeedback ? '并保存校准反馈' : '' }}。</span>
                                    <el-button type="primary" :loading="reviewSubmitting" @click="submitReview">确认处置</el-button>
                                </div>
                            </el-form>
                        </div>
                    </el-tab-pane>
                </el-tabs>
            </div>
        </el-drawer>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessageBox, ElNotification } from 'element-plus';
import pagination from '../components/pagination.vue';
import CommentModerationAuditDetail from '../components/comment-moderation-audit-detail.vue';
import type { ModerationAuditMeta, ModerationPreviewRow } from '../types/comment-moderation';
import _axios from '../utils/axios';

type CommentStatus = 'pending' | 'approved' | 'rejected';

interface CommentItem {
    id: string;
    articleTitle: string;
    parentID?: string;
    replyToAuthorName?: string;
    replyToAuthorHandle?: string;
    authorHandle?: string;
    content: string;
    status: CommentStatus;
    moderationReasons?: string[];
    ip?: string;
    createTime: string;
    updateTime: string;
}

interface CommentModerationAudit {
    auditID: string;
    source: string;
    policyVersion: string;
    evaluatedAt: string;
    context: ModerationAuditMeta['context'];
    result: ModerationPreviewRow;
}

interface CommentDetailResponse {
    comment: CommentItem;
    moderation?: CommentModerationAudit;
    feedbackCategories?: string[];
}

const commentList = ref<CommentItem[]>([]);
const router = useRouter();
const currentPage = ref(1);
const pageSize = 10;
const total = ref(0);
const loading = ref(false);
const statusFilter = ref('');
const articleTitleFilter = ref('');
const contentKeywordFilter = ref('');
const authorHandleFilter = ref('');
const commentTimeRange = ref<string[] | null>([]);
const timeFilterVisible = ref(false);
const timeCalendarDate = ref(new Date());
const timeRangeDraftStart = ref('');
const timeRangeDraftEnd = ref('');
const detailDrawer = ref(false);
const selectedComment = ref<CommentItem | null>(null);
const selectedModeration = ref<CommentModerationAudit | null>(null);
const detailLoading = ref(false);
const detailError = ref('');
const detailTab = ref<'overview' | 'moderation' | 'review'>('overview');
const reviewSubmitting = ref(false);
const feedbackCategories = ref<string[]>([]);
const reviewForm = ref({
    status: 'pending' as CommentStatus,
    includeFeedback: false,
    expectedCategory: '',
    note: '',
});
const selectedCommentIDList = ref<string[]>([]);

const selectedModerationMeta = computed<ModerationAuditMeta>(() => ({
    auditID: selectedModeration.value?.auditID || '',
    source: selectedModeration.value?.source || '',
    policyVersion: selectedModeration.value?.policyVersion || '',
    evaluatedAt: selectedModeration.value?.evaluatedAt || '',
    context: selectedModeration.value?.context,
}));

const DATE_VALUE_LENGTH = 'YYYY-MM-DD'.length;
const TIME_RANGE_START_SUFFIX = ' 00:00:00';
const TIME_RANGE_END_SUFFIX = ' 23:59:59';

const padDatePart = (value: number) => String(value).padStart(2, '0');

const formatCalendarDate = (date: Date) => {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};

const parseCalendarDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const toDateOnly = (value?: string) => (value || '').slice(0, DATE_VALUE_LENGTH);

const hasCommentTimeRange = computed(() => Boolean(commentTimeRange.value?.[0] && commentTimeRange.value?.[1]));

const timeRangeLabel = computed(() => {
    if (!hasCommentTimeRange.value) return '创建时间范围';
    return `${toDateOnly(commentTimeRange.value?.[0])} 至 ${toDateOnly(commentTimeRange.value?.[1])}`;
});

const timeRangeDraftHint = computed(() => {
    if (!timeRangeDraftStart.value) return '选择起始日期';
    if (!timeRangeDraftEnd.value) return '选择结束日期';
    return `${timeRangeDraftStart.value} 至 ${timeRangeDraftEnd.value}`;
});

const isCurrentCalendarMonth = (cellType?: string) => cellType === 'current-month';

const syncTimeRangeDraft = () => {
    timeRangeDraftStart.value = toDateOnly(commentTimeRange.value?.[0]);
    timeRangeDraftEnd.value = toDateOnly(commentTimeRange.value?.[1]);
    timeCalendarDate.value = timeRangeDraftStart.value ? parseCalendarDate(timeRangeDraftStart.value) : new Date();
};

const selectTimeRangeDay = (day: string, cellType?: string) => {
    if (!isCurrentCalendarMonth(cellType)) return;

    if (!timeRangeDraftStart.value || timeRangeDraftEnd.value) {
        timeRangeDraftStart.value = day;
        timeRangeDraftEnd.value = '';
        return;
    }
    if (day < timeRangeDraftStart.value) {
        timeRangeDraftEnd.value = timeRangeDraftStart.value;
        timeRangeDraftStart.value = day;
        return;
    }
    timeRangeDraftEnd.value = day;
};

const timeRangeDayClass = (day: string, cellType?: string) => {
    const isCurrentMonth = isCurrentCalendarMonth(cellType);
    const hasRange = Boolean(timeRangeDraftStart.value && timeRangeDraftEnd.value);
    return {
        'is-muted': !isCurrentMonth,
        'is-today': isCurrentMonth && day === formatCalendarDate(new Date()),
        'is-start': isCurrentMonth && day === timeRangeDraftStart.value,
        'is-end': isCurrentMonth && day === timeRangeDraftEnd.value,
        'is-in-range': isCurrentMonth && hasRange && day > timeRangeDraftStart.value && day < timeRangeDraftEnd.value,
    };
};

const applyTimeRangeDraft = async () => {
    if (!timeRangeDraftStart.value) return;
    const endDate = timeRangeDraftEnd.value || timeRangeDraftStart.value;
    commentTimeRange.value = [
        `${timeRangeDraftStart.value}${TIME_RANGE_START_SUFFIX}`,
        `${endDate}${TIME_RANGE_END_SUFFIX}`,
    ];
    timeFilterVisible.value = false;
    await handleFilterChange();
};

const clearTimeRangeFilter = async () => {
    timeRangeDraftStart.value = '';
    timeRangeDraftEnd.value = '';
    commentTimeRange.value = [];
    timeFilterVisible.value = false;
    await handleFilterChange();
};

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

const normalizeOptionalValue = (value?: string) => (value || '').trim();

const moderationCategoryLabels: Record<string, string> = {
    abuse: '辱骂攻击', contact: '联系方式导流', decoded_url: '编码外链', drugs: '毒品风险',
    gambling: '赌博', gore: '血腥内容', hate: '仇恨排斥', harmful_value: '有害价值观',
    illegal_privacy: '违法与隐私', minor: '未成年人风险', political: '政治动员',
    risk_phrase: '风险短语', script_injection: '脚本注入', sensitive: '敏感风险',
    sexual: '色情低俗', spam_fraud: '垃圾与欺诈', text_quality: '文本质量',
    url: '外链风险', violence: '暴力威胁',
};

const feedbackCategoryOptions = computed(() => feedbackCategories.value.map((value) => ({
    value,
    label: moderationCategoryLabels[value] || value,
})));

const commentAuthorCode = (row: CommentItem) => normalizeOptionalValue(row.authorHandle) || '-';

const replyTargetCode = (row: CommentItem) => normalizeOptionalValue(row.replyToAuthorHandle) || normalizeOptionalValue(row.replyToAuthorName) || '-';

const canOpenAuthor = (row: CommentItem) => normalizeOptionalValue(row.authorHandle) !== '';

const shouldShowModerationReasons = (row: CommentItem) => {
    return (row.status === 'pending' || row.status === 'rejected') && Boolean(row.moderationReasons?.length);
};

const openAuthor = (row: CommentItem) => {
    const handle = normalizeOptionalValue(row.authorHandle);
    if (!handle) return;
    void router.push({
        path: '/home/manage-user',
        query: { handle },
    });
};

const suggestedFeedbackCategory = () => {
    const moderation = selectedModeration.value?.result;
    if (!moderation) return '';
    const allowed = new Set(feedbackCategories.value);
    const probabilities = moderation.trace?.decisionEngine?.decision.categoryProbabilities || {};
    const probabilityCategory = Object.entries(probabilities)
        .filter(([category]) => allowed.has(category))
        .sort((left, right) => right[1] - left[1])[0]?.[0];
    if (probabilityCategory) return probabilityCategory;
    return [...(moderation.signals || [])]
        .filter((signal) => Boolean(signal.category && allowed.has(signal.category)))
        .sort((left, right) => right.score - left.score)[0]?.category || '';
};

const resetReviewForm = () => {
    reviewForm.value = {
        status: selectedComment.value?.status || 'pending',
        includeFeedback: false,
        expectedCategory: '',
        note: '',
    };
};

const fetchCommentDetail = async (id: string) => {
    detailLoading.value = true;
    detailError.value = '';
    try {
        const response = await _axios.get('/admin/auth/comment/detail', { params: { id } });
        const { code, message, data } = response.data;
        if (code !== 2000 || message !== '') {
            detailError.value = message || '获取评论详情失败';
            ElNotification({ title: 'Failed', message: message || '获取评论详情失败', type: 'error' });
            return;
        }
        const detail = data as CommentDetailResponse;
        selectedComment.value = detail.comment;
        selectedModeration.value = detail.moderation || null;
        feedbackCategories.value = detail.feedbackCategories || [];
        resetReviewForm();
    } catch (error: any) {
        detailError.value = error?.message ?? String(error);
        ElNotification({ title: 'Error', message: detailError.value, type: 'error' });
    } finally {
        detailLoading.value = false;
    }
};

const openDetail = (row: CommentItem) => {
    selectedComment.value = row;
    selectedModeration.value = null;
    feedbackCategories.value = [];
    detailError.value = '';
    detailTab.value = 'overview';
    resetReviewForm();
    detailDrawer.value = true;
    void fetchCommentDetail(row.id);
};

const submitReview = async () => {
    if (!selectedComment.value || reviewSubmitting.value) return;
    const includeFeedback = reviewForm.value.includeFeedback;
    const category = reviewForm.value.status === 'approved' ? '' : reviewForm.value.expectedCategory.trim();
    if (includeFeedback && !selectedModeration.value) {
        ElNotification({ title: '无法校准', message: '该评论没有可关联的审核记录', type: 'warning' });
        return;
    }
    if (includeFeedback && reviewForm.value.status !== 'approved' && !category) {
        ElNotification({ title: '分类未选择', message: '待审核或已拒绝的校准反馈必须选择主要风险分类', type: 'warning' });
        return;
    }
    if (includeFeedback && category && !feedbackCategories.value.includes(category)) {
        ElNotification({ title: '分类无效', message: '请选择后端提供的审核分类', type: 'warning' });
        return;
    }
    reviewSubmitting.value = true;
    try {
        const response = await _axios.put('/admin/auth/comment/review', {
            id: selectedComment.value.id,
            status: reviewForm.value.status,
            includeFeedback,
            auditID: includeFeedback ? selectedModeration.value?.auditID : '',
            expectedCategory: includeFeedback ? category : '',
            note: includeFeedback ? reviewForm.value.note.trim() : '',
        });
        const { code, message } = response.data;
        if (code !== 2000 || message !== '') {
            ElNotification({ title: 'Failed', message: message || '处理评论失败', type: 'error' });
            return;
        }
        await fetchCommentList();
        await fetchCommentDetail(selectedComment.value.id);
        ElNotification({
            title: 'Success',
            message: includeFeedback ? '业务状态与校准反馈已保存' : '评论业务状态已更新',
            type: 'success',
        });
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    } finally {
        reviewSubmitting.value = false;
    }
};

const handleSelectionChange = (selection: CommentItem[]) => {
    selectedCommentIDList.value = selection.map((item) => item.id);
};

const fetchCommentList = async () => {
    loading.value = true;
    try {
        const response = await _axios.get('/admin/auth/comment/list', {
            params: {
                page: currentPage.value,
                pageSize,
                status: statusFilter.value || undefined,
                articleTitle: articleTitleFilter.value || undefined,
                contentKeyword: contentKeywordFilter.value || undefined,
                authorHandle: authorHandleFilter.value || undefined,
                createStartTime: commentTimeRange.value?.[0] || undefined,
                createEndTime: commentTimeRange.value?.[1] || undefined,
            },
        });
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            commentList.value = data.rows || [];
            total.value = data.total || 0;
            return;
        }
        ElNotification({
            title: 'Failed',
            message: message || '获取评论列表失败',
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

const handleCurrentChange = async (newPage: number) => {
    currentPage.value = newPage;
    await fetchCommentList();
};

const handleFilterChange = async () => {
    currentPage.value = 1;
    await fetchCommentList();
};

const resetFilters = async () => {
    statusFilter.value = '';
    articleTitleFilter.value = '';
    contentKeywordFilter.value = '';
    authorHandleFilter.value = '';
    commentTimeRange.value = [];
    timeRangeDraftStart.value = '';
    timeRangeDraftEnd.value = '';
    timeFilterVisible.value = false;
    currentPage.value = 1;
    await fetchCommentList();
};

const updateStatus = async (row: CommentItem, status: CommentStatus) => {
    try {
        const response = await _axios.put('/admin/auth/comment/status', {
            id: row.id,
            status,
        });
        const { code, message } = response.data;
        if (code === 2000 && message === '') {
            if (selectedComment.value?.id === row.id) {
                detailDrawer.value = false;
                selectedComment.value = null;
            }
            await fetchCommentList();
            ElNotification({
                title: 'Success',
                message: '评论状态已更新',
                type: 'success',
            });
            return;
        }
        ElNotification({
            title: 'Failed',
            message: message || '更新评论状态失败',
            type: 'error',
        });
    } catch (error: any) {
        ElNotification({
            title: 'Error',
            message: error?.message ?? String(error),
            type: 'error',
        });
    }
};

const handleCommentAction = (command: string | number | object, row: CommentItem) => {
    if (command === 'approve') {
        void updateStatus(row, 'approved');
        return;
    }
    if (command === 'reject') {
        void updateStatus(row, 'rejected');
        return;
    }
    if (command === 'delete') {
        confirmDelete(row);
    }
};

const confirmDelete = (row: CommentItem) => {
    ElMessageBox.alert('确定删除这条评论吗？删除后不可恢复。', '删除评论', {
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        customClass: 'messageStyle',
        cancelButtonClass: 'messageCancelBtn',
        confirmButtonClass: 'messageConfirmBtn',
        dangerouslyUseHTMLString: true,
    })
        .then(() => {
            void deleteComments([row.id], '评论已删除');
        })
        .catch((action) => {
            if (action === 'cancel') return;
        });
};

const confirmBatchDelete = () => {
    if (selectedCommentIDList.value.length === 0) return;
    ElMessageBox.alert(`确定删除选中的 <strong>${selectedCommentIDList.value.length}</strong> 条评论吗？删除后不可恢复。`, '批量删除评论', {
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        customClass: 'messageStyle',
        cancelButtonClass: 'messageCancelBtn',
        confirmButtonClass: 'messageConfirmBtn',
        dangerouslyUseHTMLString: true,
    })
        .then(() => {
            void deleteComments([...selectedCommentIDList.value], `已删除 ${selectedCommentIDList.value.length} 条评论`);
        })
        .catch((action) => {
            if (action === 'cancel') return;
        });
};

const deleteComments = async (ids: string[], successMessage: string) => {
    if (ids.length === 0) return;
    try {
        const response = await _axios.delete('/admin/auth/comment/delete', {
            data: ids.length === 1 ? { id: ids[0] } : { idList: ids },
        });
        const { code, message } = response.data;
        if (code === 2000 && message === '') {
            const deletedIDSet = new Set(ids);
            if (selectedComment.value && deletedIDSet.has(selectedComment.value.id)) {
                detailDrawer.value = false;
                selectedComment.value = null;
            }
            selectedCommentIDList.value = selectedCommentIDList.value.filter((id) => !deletedIDSet.has(id));
            await fetchCommentList();
            ElNotification({
                title: 'Success',
                message: successMessage,
                type: 'success',
            });
            return;
        }
        ElNotification({
            title: 'Failed',
            message: message || '删除评论失败',
            type: 'error',
        });
    } catch (error: any) {
        ElNotification({
            title: 'Error',
            message: error?.message ?? String(error),
            type: 'error',
        });
    }
};

watch(() => reviewForm.value.status, (status) => {
    if (status === 'approved') {
        reviewForm.value.expectedCategory = '';
        return;
    }
    if (reviewForm.value.includeFeedback && !reviewForm.value.expectedCategory) {
        reviewForm.value.expectedCategory = suggestedFeedbackCategory();
    }
});

watch(() => reviewForm.value.includeFeedback, (enabled) => {
    if (!enabled || reviewForm.value.status === 'approved' || reviewForm.value.expectedCategory) return;
    reviewForm.value.expectedCategory = suggestedFeedbackCategory();
});

onMounted(fetchCommentList);
</script>

<style scoped>
.comment-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.filter-bar {
    align-items: center;
    background: #fff;
    border-bottom: 1px solid var(--admin-header-border-color, #e4e7ed);
    box-sizing: border-box;
    display: flex;
    flex: 0 0 var(--admin-header-height, 48px);
    gap: 10px;
    height: var(--admin-header-height, 48px);
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0 15px;
    scrollbar-width: thin;
    flex-wrap: nowrap;
}

.filter-bar > * {
    flex: 0 0 auto;
}

.status-select {
    width: 140px;
}

.article-filter {
    width: 220px;
}

.comment-filter {
    width: 220px;
}

.author-filter {
    width: 180px;
}

.time-filter-trigger {
    display: inline-flex;
    width: 260px;
    height: 32px;
    align-items: center;
    justify-content: space-between;
    padding: 0 11px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: #fff;
    color: #a8abb2;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    transition: border-color 0.2s, color 0.2s;
}

.time-filter-trigger:hover,
.time-filter-trigger.is-active {
    border-color: #c0c4cc;
    color: #303133;
}

.time-filter-clear {
    display: inline-flex;
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #909399;
    font-size: 16px;
    line-height: 1;
}

.time-filter-clear:hover {
    background: #f2f3f5;
    color: #606266;
}

.time-range-panel {
    width: 312px;
}

.time-range-panel-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
}

.time-range-panel-header span {
    color: #303133;
    font-size: 14px;
}

.time-range-panel-header em {
    overflow: hidden;
    color: #909399;
    font-size: 12px;
    font-style: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.time-range-calendar {
    --el-calendar-cell-width: 34px;
}

.time-range-calendar :deep(.el-calendar__header) {
    padding: 8px 0 10px;
}

.time-range-calendar :deep(.el-calendar__title) {
    color: #303133;
    font-size: 14px;
    font-weight: 400;
}

.time-range-calendar :deep(.el-calendar__button-group .el-button) {
    padding: 6px 8px;
    font-size: 12px;
}

.time-range-calendar :deep(.el-calendar__body) {
    padding: 0;
}

.time-range-calendar :deep(.el-calendar-table thead th) {
    padding: 6px 0;
    color: #909399;
    font-size: 12px;
    font-weight: 400;
}

.time-range-calendar :deep(.el-calendar-table td) {
    border: 0;
}

.time-range-calendar :deep(.el-calendar-day) {
    display: flex;
    height: 34px;
    align-items: center;
    justify-content: center;
    padding: 2px;
}

.time-range-day {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #606266;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
}

.time-range-day:hover {
    background: #f2f6fc;
    color: #409eff;
}

.time-range-day.is-muted,
.time-range-day.is-muted:hover,
.time-range-day:disabled {
    background: transparent;
    color: #c0c4cc;
    cursor: not-allowed;
}

.time-range-day.is-today {
    background: #ecf5ff;
    color: #409eff;
}

.time-range-day.is-in-range {
    width: 100%;
    border-radius: 8px;
    background: #ecf5ff;
    color: #409eff;
}

.time-range-day.is-start,
.time-range-day.is-end {
    width: 28px;
    border-radius: 50%;
    background: #409eff;
    color: #fff;
}

.time-range-panel-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #ebeef5;
}

.table-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.comment-page :deep(.el-table) {
    color: #606266;
    font-family: monospace;
    font-size: 14px;
    font-weight: 400;
}

.comment-page :deep(.el-table th),
.comment-page :deep(.el-table td) {
    white-space: nowrap;
}

.comment-page :deep(.el-table th .cell),
.comment-page :deep(.el-table td .cell) {
    font-weight: 400;
}

.monospace-column {
    font-family: monospace;
}

.article-cell {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
}

.article-title {
    color: #303133;
    font-weight: 400;
}

.comment-content-cell,
.author-code {
    display: block;
    overflow: hidden;
    color: #303133;
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.comment-content-cell {
    font-size: 14px;
}

.author-code {
    font-size: 13px;
}

.author-code-link {
    width: fit-content;
    max-width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: #409eff;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
}

.author-code-link:hover {
    color: #337ecc;
    text-decoration: underline;
    text-underline-offset: 3px;
}

.action-buttons {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-start;
    gap: 4px;
}

.action-buttons :deep(.el-button) {
    margin-left: 0;
}

.drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.drawer-status-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #909399;
    font-size: 12px;
}

.comment-detail {
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: #303133;
    font-family: inherit;
}

.comment-detail-tabs :deep(.el-tabs__header) {
    margin-bottom: 16px;
}

.comment-detail-tabs :deep(.el-tabs__item) {
    font-weight: 500;
}

.detail-meta-panel {
    overflow: hidden;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    background: #fff;
}

.detail-meta-panel--grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-bottom: 14px;
}

.detail-meta-panel--grid .detail-meta-row:nth-child(odd) {
    border-right: 1px solid #f0f2f5;
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

.detail-meta-row--reasons {
    align-items: flex-start;
    background: #fffaf2;
}

.detail-meta-label {
    width: 66px;
    flex: 0 0 66px;
    color: #909399;
    font-size: 12px;
    line-height: 22px;
    text-align: left;
}

.detail-meta-value {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    color: #303133;
    font-size: 13px;
    font-weight: 400;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.detail-meta-value--reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
}

.moderation-reason-chip {
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

.detail-content-panel {
    padding: 16px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    background: linear-gradient(180deg, #f8fbff 0%, #fff 100%);
}

.detail-content-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
}

.detail-content-title {
    color: #303133;
    font-size: 14px;
    font-weight: 400;
}

.comment-full-content {
    margin: 0;
    color: #303133;
    font-size: 14px;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-word;
}

.review-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: 680px;
}

.review-form {
    padding: 18px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    background: #fff;
}

.review-status-group {
    display: flex;
    width: 100%;
}

.review-status-group :deep(.el-radio-button) {
    flex: 1;
}

.review-status-group :deep(.el-radio-button__inner) {
    width: 100%;
}

.calibration-card {
    margin: 4px 0 18px;
    padding: 12px 14px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    background: #fafafa;
}

.calibration-card.is-enabled {
    border-color: #b3d8ff;
    background: #f3f9ff;
}

.calibration-card p {
    margin: 7px 0 0 24px;
    color: #909399;
    font-size: 11px;
    line-height: 1.6;
}

.review-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding-top: 14px;
    border-top: 1px solid #ebeef5;
}

.review-actions span {
    color: #909399;
    font-size: 11px;
}

@media (max-width: 720px) {
    .drawer-status-summary {
        display: none;
    }

    .detail-meta-panel--grid {
        grid-template-columns: 1fr;
    }

    .detail-meta-panel--grid .detail-meta-row:nth-child(odd) {
        border-right: 0;
    }

    .review-actions {
        align-items: stretch;
        flex-direction: column;
    }
}
</style>
