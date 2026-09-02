<template>
    <div class="user-page">
        <div class="filter-bar">
            <el-input
                v-model="handleFilter"
                class="handle-filter"
                placeholder="用户编号"
                clearable
                @keyup.enter="handleFilterChange"
                @clear="handleFilterChange" />
            <el-input
                v-model="displayNameFilter"
                class="name-filter"
                placeholder="用户昵称"
                clearable
                @keyup.enter="handleFilterChange"
                @clear="handleFilterChange" />
            <el-select v-model="providerFilter" class="provider-filter" placeholder="登录来源" clearable @change="handleFilterChange">
                <el-option label="GitHub" value="github" />
                <el-option label="Google" value="google" />
            </el-select>
            <el-select v-model="permissionFilter" class="permission-filter" placeholder="评论权限" clearable @change="handleFilterChange">
                <el-option label="正常" value="normal" />
                <el-option label="禁止评论" value="disabled" />
            </el-select>
            <el-button type="primary" @click="handleFilterChange">筛选</el-button>
            <el-button @click="resetFilters">重置</el-button>
        </div>

        <div class="table-container">
            <el-table scrollbar-always-on v-loading="loading" :data="userList" style="width: 100%" class="monospace-column">
                <el-table-column label="序号" min-width="70" max-width="90">
                    <template #default="scope">
                        <span>{{ (currentPage - 1) * pageSize + scope.$index + 1 }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="用户信息" min-width="310" max-width="420" show-overflow-tooltip>
                    <template #default="scope">
                        <div class="user-cell">
                            <img v-if="scope.row.avatarURL" :src="scope.row.avatarURL" :alt="scope.row.displayName" class="user-avatar" />
                            <span v-else class="user-avatar-fallback">{{ providerInitial(scope.row.provider) }}</span>
                            <span class="user-provider">{{ providerText(scope.row.provider) }}</span>
                            <span class="user-separator">｜</span>
                            <span class="user-code">{{ scope.row.handle || '-' }}</span>
                            <span class="user-separator">｜</span>
                            <span class="user-name">{{ scope.row.displayName || '-' }}</span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="评论权限" min-width="120" max-width="150">
                    <template #default="scope">
                        <el-tag :type="scope.row.commentDisabled ? 'danger' : 'success'" effect="light">
                            {{ scope.row.commentDisabled ? '禁止评论' : '正常' }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column label="评论数" min-width="100" max-width="120">
                    <template #default="scope">
                        <span>{{ scope.row.commentCount }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="最近评论" min-width="170" max-width="190" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.lastCommentTime || '-' }}</span>
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
                            <el-dropdown trigger="click" @command="(command) => handleUserAction(command, scope.row)">
                                <el-button size="default" class="action-more-button">更多</el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item :command="scope.row.commentDisabled ? 'enable-comment' : 'disable-comment'">
                                            {{ scope.row.commentDisabled ? '解除限制' : '禁止评论' }}
                                        </el-dropdown-item>
                                        <el-dropdown-item command="force-logout">强制下线</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <pagination :total="total" :currentPage="currentPage" :pageSize="pageSize" @handleCurrentChange="handleCurrentChange" />

        <el-dialog v-model="permissionDialogVisible" title="禁止评论" width="460px" class="user-permission-dialog">
            <div class="permission-form">
                <div class="permission-target">
                    <span>目标用户</span>
                    <strong>{{ permissionTarget?.handle || '-' }} ｜ {{ permissionTarget?.displayName || '-' }}</strong>
                </div>
                <div class="permission-section">
                    <span class="permission-label">禁止策略</span>
                    <div class="policy-options">
                        <button
                            v-for="option in permissionPolicyOptions"
                            :key="option.value"
                            type="button"
                            class="policy-option"
                            :class="{ 'is-active': permissionDuration === option.value }"
                            @click="permissionDuration = option.value">
                            <span>{{ option.label }}</span>
                            <em>{{ option.description }}</em>
                        </button>
                    </div>
                </div>
                <div class="permission-section">
                    <span class="permission-label">后台备注</span>
                    <el-input
                        v-model="permissionReason"
                        type="textarea"
                        :rows="4"
                        maxlength="200"
                        show-word-limit
                        placeholder="例如：连续发布无意义评论" />
                </div>
            </div>
            <template #footer>
                <el-button @click="permissionDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitDisableComment">确定</el-button>
            </template>
        </el-dialog>

        <el-drawer v-model="detailDrawer" :destroy-on-close="true" size="520px" class="user-detail-drawer admin-drawer admin-detail-drawer">
            <template #header>
                <div class="drawer-header">
                    <span class="drawer-title">用户详情</span>
                </div>
            </template>

            <div v-if="selectedUser" class="user-detail">
                <div class="detail-row">
                    <span>用户编号</span>
                    <strong>{{ selectedUser.handle || '-' }}</strong>
                </div>
                <div class="detail-row">
                    <span>用户名</span>
                    <strong>{{ selectedUser.displayName || '-' }}</strong>
                </div>
                <div class="detail-row">
                    <span>用户来源</span>
                    <strong>{{ providerText(selectedUser.provider) }}</strong>
                </div>
                <div class="detail-row">
                    <span>Email</span>
                    <strong>{{ selectedUser.email || '-' }}</strong>
                </div>
                <div class="detail-row">
                    <span>创建时间</span>
                    <strong>{{ selectedUser.createTime || '-' }}</strong>
                </div>
                <div class="detail-row">
                    <span>更新时间</span>
                    <strong>{{ selectedUser.updateTime || '-' }}</strong>
                </div>
                <div class="detail-row">
                    <span>评论策略</span>
                    <strong>{{ commentPolicyText(selectedUser) }}</strong>
                </div>
                <div class="detail-row">
                    <span>限制原因</span>
                    <strong>{{ commentDisabledReasonText(selectedUser) }}</strong>
                </div>
                <div class="detail-row">
                    <span>限制到期</span>
                    <strong>{{ commentDisabledUntilText(selectedUser) }}</strong>
                </div>
                <div class="detail-row">
                    <span>用户 ID</span>
                    <strong>{{ selectedUser.id }}</strong>
                </div>
                <div class="detail-row">
                    <span>Provider UID</span>
                    <strong>{{ selectedUser.providerUserID || '-' }}</strong>
                </div>
                <div class="detail-row">
                    <span>Session Version</span>
                    <strong>{{ selectedUser.sessionVersion }}</strong>
                </div>
            </div>
        </el-drawer>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox, ElNotification } from 'element-plus';
import pagination from '../components/pagination.vue';
import _axios from '../utils/axios';

interface UserItem {
    id: string;
    provider: string;
    providerUserID?: string;
    displayName: string;
    handle: string;
    avatarURL?: string;
    profileURL?: string;
    email?: string;
    commentDisabled: boolean;
    commentDisabledReason?: string;
    commentDisabledUntil?: string;
    sessionVersion: number;
    commentCount: number;
    lastCommentTime?: string;
    createTime: string;
    updateTime: string;
}

const userList = ref<UserItem[]>([]);
const route = useRoute();
const router = useRouter();
const currentPage = ref(1);
const pageSize = 10;
const total = ref(0);
const loading = ref(false);
const handleFilter = ref('');
const displayNameFilter = ref('');
const providerFilter = ref('');
const permissionFilter = ref('');
const permissionDialogVisible = ref(false);
const permissionTarget = ref<UserItem | null>(null);
const permissionDuration = ref('permanent');
const permissionReason = ref('');
const detailDrawer = ref(false);
const selectedUser = ref<UserItem | null>(null);

const permissionPolicyOptions = [
    {
        value: 'permanent',
        label: '永久禁止',
        description: '直到后台手动解除',
    },
    {
        value: '7',
        label: '禁止 7 天',
        description: '适合短期冷却',
    },
    {
        value: '30',
        label: '禁止 30 天',
        description: '适合重复违规',
    },
];

const padDatePart = (value: number) => String(value).padStart(2, '0');

const providerText = (provider?: string) => {
    if (provider === 'github') return 'GitHub';
    if (provider === 'google') return 'Google';
    return 'OAuth';
};

const providerInitial = (provider?: string) => {
    if (provider === 'github') return 'GH';
    if (provider === 'google') return 'GO';
    return 'OA';
};

const formatDateTime = (date: Date) => {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;
};

const disabledUntilByDuration = () => {
    if (permissionDuration.value === 'permanent') return '';
    const days = Number(permissionDuration.value);
    if (!Number.isFinite(days) || days <= 0) return '';
    const date = new Date();
    date.setDate(date.getDate() + days);
    return formatDateTime(date);
};

const commentPolicyText = (row: UserItem) => {
    if (!row.commentDisabled) return '正常';
    if (row.commentDisabledUntil) return `临时禁止｜至 ${row.commentDisabledUntil}`;
    return '永久禁止';
};

const commentDisabledReasonText = (row: UserItem) => {
    if (!row.commentDisabled) return '-';
    return row.commentDisabledReason || '未填写原因';
};

const commentDisabledUntilText = (row: UserItem) => {
    if (!row.commentDisabled) return '-';
    return row.commentDisabledUntil || '永久';
};

const routeQueryString = (value: unknown) => {
    if (Array.isArray(value)) return String(value[0] || '');
    if (typeof value === 'string') return value;
    return '';
};

const syncHandleFilterFromRoute = () => {
    const handle = routeQueryString(route.query.handle).trim();
    if (handle === handleFilter.value) return false;
    handleFilter.value = handle;
    currentPage.value = 1;
    return true;
};

const replaceHandleRouteQuery = () => {
    const nextQuery = { ...route.query };
    const handle = handleFilter.value.trim();
    if (handle) {
        nextQuery.handle = handle;
    } else {
        delete nextQuery.handle;
    }
    void router.replace({
        path: route.path,
        query: nextQuery,
    });
};

const fetchUserList = async () => {
    loading.value = true;
    try {
        const response = await _axios.get('/admin/auth/user/list', {
            params: {
                page: currentPage.value,
                pageSize,
                handle: handleFilter.value || undefined,
                displayName: displayNameFilter.value || undefined,
                provider: providerFilter.value || undefined,
                commentPermission: permissionFilter.value || undefined,
            },
        });
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            userList.value = data.rows || [];
            total.value = data.total || 0;
            return;
        }
        ElNotification({
            title: 'Failed',
            message: message || '获取用户列表失败',
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

const handleFilterChange = async () => {
    replaceHandleRouteQuery();
    currentPage.value = 1;
    await fetchUserList();
};

const resetFilters = async () => {
    handleFilter.value = '';
    displayNameFilter.value = '';
    providerFilter.value = '';
    permissionFilter.value = '';
    replaceHandleRouteQuery();
    currentPage.value = 1;
    await fetchUserList();
};

const handleCurrentChange = async (newPage: number) => {
    currentPage.value = newPage;
    await fetchUserList();
};

const openDetail = (row: UserItem) => {
    selectedUser.value = row;
    detailDrawer.value = true;
};

const openDisableDialog = (row: UserItem) => {
    permissionTarget.value = row;
    permissionDuration.value = 'permanent';
    permissionReason.value = row.commentDisabledReason || '';
    permissionDialogVisible.value = true;
};

const updateCommentPermission = async (row: UserItem, disabled: boolean, reason = '', disabledUntil = '') => {
    const response = await _axios.put('/admin/auth/user/comment-permission', {
        id: row.id,
        disabled,
        reason,
        disabledUntil,
    });
    const { code, message } = response.data;
    if (code !== 2000 || message !== '') {
        throw new Error(message || '更新评论权限失败');
    }
};

const submitDisableComment = async () => {
    if (!permissionTarget.value) return;
    try {
        await updateCommentPermission(permissionTarget.value, true, permissionReason.value.trim(), disabledUntilByDuration());
        permissionDialogVisible.value = false;
        await fetchUserList();
        ElNotification({
            title: 'Success',
            message: '已禁止该用户评论',
            type: 'success',
        });
    } catch (error: any) {
        ElNotification({
            title: 'Error',
            message: error?.message ?? String(error),
            type: 'error',
        });
    }
};

const enableComment = async (row: UserItem) => {
    try {
        await updateCommentPermission(row, false);
        await fetchUserList();
        ElNotification({
            title: 'Success',
            message: '已解除评论限制',
            type: 'success',
        });
    } catch (error: any) {
        ElNotification({
            title: 'Error',
            message: error?.message ?? String(error),
            type: 'error',
        });
    }
};

const forceLogout = (row: UserItem) => {
    ElMessageBox.confirm(`确定让 ${row.handle || row.displayName} 的当前登录态失效吗？`, '强制下线', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    })
        .then(async () => {
            const response = await _axios.put('/admin/auth/user/force-logout', { id: row.id });
            const { code, message } = response.data;
            if (code === 2000 && message === '') {
                await fetchUserList();
                ElNotification({
                    title: 'Success',
                    message: '已使该用户登录态失效',
                    type: 'success',
                });
                return;
            }
            ElNotification({
                title: 'Failed',
                message: message || '强制下线失败',
                type: 'error',
            });
        })
        .catch(() => {});
};

const handleUserAction = (command: string | number | object, row: UserItem) => {
    if (command === 'enable-comment') {
        void enableComment(row);
        return;
    }
    if (command === 'disable-comment') {
        openDisableDialog(row);
        return;
    }
    if (command === 'force-logout') {
        forceLogout(row);
    }
};

watch(
    () => route.query.handle,
    async () => {
        if (!syncHandleFilterFromRoute()) return;
        await fetchUserList();
    },
);

onMounted(async () => {
    syncHandleFilterFromRoute();
    await fetchUserList();
});
</script>

<style scoped>
.user-page {
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

.handle-filter {
    width: 160px;
}

.name-filter {
    width: 180px;
}

.provider-filter,
.permission-filter {
    width: 140px;
}

.table-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.user-page :deep(.el-table) {
    color: #606266;
    font-family: monospace;
    font-size: 14px;
    font-weight: 400;
}

.user-page :deep(.el-table th),
.user-page :deep(.el-table td) {
    white-space: nowrap;
}

.user-page :deep(.el-table th .cell),
.user-page :deep(.el-table td .cell) {
    font-weight: 400;
}

.monospace-column {
    font-family: monospace;
}

.user-cell {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 6px;
}

.user-avatar,
.user-avatar-fallback {
    width: 24px;
    height: 24px;
    flex: 0 0 24px;
    border-radius: 50%;
}

.user-avatar {
    object-fit: cover;
}

.user-avatar-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #eef2ff;
    color: #526ecc;
    font-size: 10px;
    font-weight: 400;
}

.user-provider {
    flex: 0 0 48px;
    color: #909399;
    font-size: 12px;
}

.user-separator {
    flex: 0 0 auto;
    color: #d4d7de;
    font-size: 12px;
}

.user-code,
.user-name {
    overflow: hidden;
    color: #303133;
    font-size: 13px;
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-code {
    flex: 0 0 52px;
}

.user-name {
    flex: 1 1 auto;
    min-width: 0;
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

.permission-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.permission-target {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    background: #fafafa;
    color: #909399;
    font-family: monospace;
    font-size: 13px;
}

.permission-target strong {
    color: #303133;
    font-weight: 400;
}

.permission-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.permission-label {
    color: #606266;
    font-family: monospace;
    font-size: 13px;
    font-weight: 400;
}

.policy-options {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}

.policy-option {
    min-width: 0;
    padding: 10px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font-family: monospace;
    text-align: left;
    transition: border-color 0.2s, background-color 0.2s;
}

.policy-option:hover,
.policy-option.is-active {
    border-color: #409eff;
    background: #f5faff;
}

.policy-option span,
.policy-option em {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.policy-option span {
    color: #303133;
    font-size: 13px;
    font-weight: 400;
}

.policy-option em {
    margin-top: 5px;
    color: #909399;
    font-size: 12px;
    font-style: normal;
}

.drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.user-detail {
    overflow: hidden;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    background: #fff;
    color: #303133;
    font-family: monospace;
}

.detail-row {
    display: flex;
    min-width: 0;
    gap: 14px;
    padding: 10px 14px;
    border-bottom: 1px solid #f0f2f5;
}

.detail-row:last-child {
    border-bottom: 0;
}

.detail-row span {
    width: 112px;
    flex: 0 0 112px;
    color: #909399;
    font-size: 12px;
    line-height: 22px;
}

.detail-row strong {
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
</style>
