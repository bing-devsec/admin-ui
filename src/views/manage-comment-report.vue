<template>
    <div class="comment-report-page">
        <div class="filter-bar">
            <el-select v-model="statusFilter" placeholder="举报状态" class="status-select" @change="handleFilterChange">
                <el-option label="全部状态" value="" />
                <el-option label="待处理" value="pending" />
                <el-option label="已确认" value="accepted" />
                <el-option label="已驳回" value="rejected" />
            </el-select>
            <el-input v-model.trim="commentQueryFilter" class="comment-query-filter" clearable placeholder="按评论 ID / 评论关键字筛选" @clear="handleFilterChange" @keyup.enter="handleFilterChange" />
            <el-input v-model.trim="authorHandleFilter" class="user-filter" clearable placeholder="按评论人编号筛选" @clear="handleFilterChange" @keyup.enter="handleFilterChange" />
            <el-input v-model.trim="reporterHandleFilter" class="user-filter" clearable placeholder="按举报人编号筛选" @clear="handleFilterChange" @keyup.enter="handleFilterChange" />
            <el-button type="primary" @click="handleFilterChange">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
        </div>

        <div class="table-container">
            <el-table scrollbar-always-on v-loading="loading" :data="reportList" style="width: 100%" class="monospace-column">
                <el-table-column label="序号" min-width="60" max-width="90">
                    <template #default="scope">
                        <span>{{ (currentPage - 1) * pageSize + scope.$index + 1 }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="举报状态" min-width="100" max-width="120">
                    <template #default="scope">
                        <el-tag :type="reportStatusTagType(scope.row.status)" effect="light">
                            {{ reportStatusText(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column label="文章标题" min-width="220" max-width="320" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.articleTitle || '文章已删除' }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="评论内容" min-width="260" max-width="420" show-overflow-tooltip>
                    <template #default="scope">
                        <div class="content-cell">
                            <span>{{ scope.row.commentContent || '-' }}</span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="举报人编号" min-width="150" max-width="190" show-overflow-tooltip>
                    <template #default="scope">
                        <button v-if="canOpenReporter(scope.row)" type="button" class="user-code-link" @click="openReporter(scope.row)">
                            {{ reporterCode(scope.row) }}
                        </button>
                        <span v-else>{{ reporterCode(scope.row) }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="举报时间" min-width="170" max-width="190" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.createTime }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="操作" min-width="150" max-width="170" fixed="right">
                    <template #default="scope">
                        <div class="action-buttons action-buttons--compact">
                            <el-button size="default" type="primary" plain @click="openDetail(scope.row)">详情</el-button>
                            <el-dropdown trigger="click" @command="(command) => handleReportAction(command, scope.row)">
                                <el-button size="default" class="action-more-button">更多</el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="accept" :disabled="scope.row.status !== 'pending'">确认违规</el-dropdown-item>
                                        <el-dropdown-item command="reject" :disabled="scope.row.status !== 'pending'">驳回举报</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <pagination :total="total" :currentPage="currentPage" :pageSize="pageSize" @handleCurrentChange="handleCurrentChange" />

        <el-drawer v-model="detailDrawer" :destroy-on-close="true" size="560px" class="report-detail-drawer">
            <template #header>
                <div class="drawer-header">
                    <span class="drawer-title">举报详情</span>
                    <el-tag v-if="selectedReport" :type="reportStatusTagType(selectedReport.status)" effect="light">
                        {{ reportStatusText(selectedReport.status) }}
                    </el-tag>
                </div>
            </template>

            <div v-if="selectedReport" class="report-detail">
                <div class="detail-meta-panel">
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">举报 ID</span>
                        <span class="detail-meta-value">{{ selectedReport.id }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">评论 ID</span>
                        <span class="detail-meta-value">{{ selectedReport.commentID }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">文章标题</span>
                        <span class="detail-meta-value">{{ selectedReport.articleTitle || '文章已删除' }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">评论状态</span>
                        <span class="detail-meta-value">{{ commentStatusText(selectedReport.commentStatus) }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">评论人</span>
                        <span class="detail-meta-value">{{ userLabel(selectedReport.commentAuthorHandle, selectedReport.commentAuthorName) }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">举报人编号</span>
                        <span class="detail-meta-value">
                            <button v-if="canOpenReporter(selectedReport)" type="button" class="user-code-link" @click="openReporter(selectedReport)">
                                {{ reporterCode(selectedReport) }}
                            </button>
                            <span v-else>{{ reporterCode(selectedReport) }}</span>
                        </span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">IP</span>
                        <span class="detail-meta-value">{{ selectedReport.ip || '-' }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">举报时间</span>
                        <span class="detail-meta-value">{{ selectedReport.createTime }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">更新时间</span>
                        <span class="detail-meta-value">{{ selectedReport.updateTime || '-' }}</span>
                    </div>
                </div>

                <div class="detail-content-panel">
                    <div class="detail-content-header">
                        <span class="detail-content-title">举报原因</span>
                    </div>
                    <p class="detail-full-content">{{ selectedReport.reason || '-' }}</p>
                </div>

                <div class="detail-content-panel">
                    <div class="detail-content-header">
                        <span class="detail-content-title">评论正文</span>
                        <el-tag :type="commentStatusTagType(selectedReport.commentStatus)" effect="light">
                            {{ commentStatusText(selectedReport.commentStatus) }}
                        </el-tag>
                    </div>
                    <p class="detail-full-content">{{ selectedReport.commentContent || '-' }}</p>
                </div>

                <div v-if="selectedReport.status === 'pending'" class="detail-actions">
                    <el-button type="danger" plain @click="confirmHandleReport(selectedReport, 'accept')">确认违规</el-button>
                    <el-button plain @click="confirmHandleReport(selectedReport, 'reject')">驳回举报</el-button>
                </div>
            </div>
        </el-drawer>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessageBox, ElNotification } from 'element-plus';
import pagination from '../components/pagination.vue';
import _axios from '../utils/axios';

type ReportStatus = 'pending' | 'accepted' | 'rejected';
type ReportAction = 'accept' | 'reject';

interface CommentReportItem {
    id: string;
    commentID: string;
    articleID: string;
    articleTitle: string;
    commentAuthorID?: string;
    commentAuthorName: string;
    commentAuthorHandle?: string;
    commentContent: string;
    commentStatus: string;
    reporterID: string;
    reporterName: string;
    reporterHandle?: string;
    reason?: string;
    status: ReportStatus;
    ip?: string;
    createTime: string;
    updateTime: string;
}

const reportList = ref<CommentReportItem[]>([]);
const router = useRouter();
const currentPage = ref(1);
const pageSize = 10;
const total = ref(0);
const loading = ref(false);
const statusFilter = ref('');
const commentQueryFilter = ref('');
const authorHandleFilter = ref('');
const reporterHandleFilter = ref('');
const detailDrawer = ref(false);
const selectedReport = ref<CommentReportItem | null>(null);

const reportStatusText = (status: string) => {
    switch (status) {
        case 'accepted':
            return '已确认';
        case 'rejected':
            return '已驳回';
        default:
            return '待处理';
    }
};

const reportStatusTagType = (status: string) => {
    switch (status) {
        case 'accepted':
            return 'success';
        case 'rejected':
            return 'info';
        default:
            return 'warning';
    }
};

const commentStatusText = (status: string) => {
    switch (status) {
        case 'approved':
            return '已通过';
        case 'rejected':
            return '已拒绝';
        default:
            return '待审核';
    }
};

const commentStatusTagType = (status: string) => {
    switch (status) {
        case 'approved':
            return 'success';
        case 'rejected':
            return 'danger';
        default:
            return 'warning';
    }
};

const userLabel = (handle?: string, name?: string) => {
    const code = (handle || '').trim();
    const displayName = (name || '').trim();
    if (code && displayName) return `${code}｜${displayName}`;
    return code || displayName || '-';
};

const normalizeOptionalValue = (value?: string) => (value || '').trim();

const reporterCode = (row: CommentReportItem) => normalizeOptionalValue(row.reporterHandle) || '-';

const canOpenReporter = (row: CommentReportItem) => normalizeOptionalValue(row.reporterHandle) !== '';

const openReporter = (row: CommentReportItem) => {
    const handle = normalizeOptionalValue(row.reporterHandle);
    if (!handle) return;
    void router.push({
        path: '/home/manage-user',
        query: { handle },
    });
};

const openDetail = (row: CommentReportItem) => {
    selectedReport.value = row;
    detailDrawer.value = true;
};

const fetchReportList = async () => {
    loading.value = true;
    try {
        const response = await _axios.get('/admin/auth/comment/report-list', {
            params: {
                page: currentPage.value,
                pageSize,
                status: statusFilter.value || undefined,
                commentQuery: commentQueryFilter.value || undefined,
                authorHandle: authorHandleFilter.value || undefined,
                reporterHandle: reporterHandleFilter.value || undefined,
            },
        });
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            reportList.value = data.rows || [];
            total.value = data.total || 0;
            return;
        }
        ElNotification({
            title: 'Failed',
            message: message || '获取举报列表失败',
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
    await fetchReportList();
};

const handleFilterChange = async () => {
    currentPage.value = 1;
    await fetchReportList();
};

const resetFilters = async () => {
    statusFilter.value = '';
    commentQueryFilter.value = '';
    authorHandleFilter.value = '';
    reporterHandleFilter.value = '';
    currentPage.value = 1;
    await fetchReportList();
};

const confirmHandleReport = (row: CommentReportItem, action: ReportAction) => {
    const isAccept = action === 'accept';
    const title = isAccept ? '确认违规' : '驳回举报';
    const message = isAccept
        ? '确认该评论违规吗？确认后评论会变为已拒绝。'
        : '确认驳回该评论的待处理举报吗？驳回后评论会恢复为已通过。';
    ElMessageBox.alert(message, title, {
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        customClass: 'messageStyle',
        cancelButtonClass: 'messageCancelBtn',
        confirmButtonClass: 'messageConfirmBtn',
    })
        .then(() => {
            void handleReport(row, action);
        })
        .catch((confirmAction) => {
            if (confirmAction === 'cancel') return;
        });
};

const handleReportAction = (command: string | number | object, row: CommentReportItem) => {
    if (command === 'accept') {
        confirmHandleReport(row, 'accept');
        return;
    }
    if (command === 'reject') {
        confirmHandleReport(row, 'reject');
    }
};

const handleReport = async (row: CommentReportItem, action: ReportAction) => {
    try {
        const response = await _axios.put('/admin/auth/comment/report', {
            commentID: row.commentID,
            action,
        });
        const { code, message } = response.data;
        if (code === 2000 && message === '') {
            await fetchReportList();
            if (selectedReport.value?.commentID === row.commentID) {
                detailDrawer.value = false;
                selectedReport.value = null;
            }
            ElNotification({
                title: 'Success',
                message: action === 'accept' ? '已确认举报，评论已拒绝' : '已驳回举报，评论已通过',
                type: 'success',
            });
            return;
        }
        ElNotification({
            title: 'Failed',
            message: message || '处理举报失败',
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

onMounted(fetchReportList);
</script>

<style scoped>
.comment-report-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.filter-bar {
    display: flex;
    flex: 0 0 var(--admin-header-height, 48px);
    height: var(--admin-header-height, 48px);
    align-items: center;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0 15px;
    border-bottom: 1px solid var(--admin-header-border-color, #e4e7ed);
    background: #fff;
    box-sizing: border-box;
    scrollbar-width: thin;
}

.filter-bar > * {
    flex: 0 0 auto;
}

.status-select {
    width: 140px;
}

.comment-query-filter {
    width: 260px;
}

.user-filter {
    width: 180px;
}

.table-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.comment-report-page :deep(.el-table) {
    color: #606266;
    font-family: monospace;
    font-size: 14px;
    font-weight: 400;
}

.comment-report-page :deep(.el-table th),
.comment-report-page :deep(.el-table td) {
    white-space: nowrap;
}

.comment-report-page :deep(.el-table th .cell),
.comment-report-page :deep(.el-table td .cell) {
    font-weight: 400;
}

.monospace-column {
    font-family: monospace;
}

.content-cell {
    display: block;
    min-width: 0;
}

.content-cell span {
    display: block;
    overflow: hidden;
    color: #303133;
    text-overflow: ellipsis;
    white-space: nowrap;
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

.user-code-link {
    display: block;
    max-width: 100%;
    overflow: hidden;
    padding: 0;
    border: 0;
    background: transparent;
    color: #409eff;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-code-link:hover {
    color: #337ecc;
    text-decoration: underline;
    text-underline-offset: 3px;
}

:global(.report-detail-drawer .el-drawer__header) {
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

.report-detail {
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
    width: 72px;
    flex: 0 0 72px;
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

.detail-full-content {
    margin: 0;
    color: #303133;
    font-size: 14px;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-word;
}

.detail-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.detail-actions :deep(.el-button) {
    margin-left: 0;
}
</style>
