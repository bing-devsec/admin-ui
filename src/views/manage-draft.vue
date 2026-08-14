<template>
    <div class="draft-page">
        <section class="draft-header">
            <span class="draft-desc">草稿仅保存在后台，不进入前台列表、缓存和 Sitemap</span>
        </section>

        <section class="draft-table-wrap">
            <el-table
                v-loading="loading"
                scrollbar-always-on
                :data="draftList"
                class="draft-table monospace-column"
                style="width: 100%">
                <el-table-column label="序号" min-width="64" max-width="90">
                    <template #default="scope">
                        <span>{{ (currentPage - 1) * pageSize + scope.$index + 1 }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="标题" min-width="240" show-overflow-tooltip>
                    <template #default="scope">
                        <span class="draft-name">{{ scope.row.title || '未命名草稿' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="类型" min-width="120" max-width="150">
                    <template #default="scope">
                        <el-tag :type="scope.row.draftType === 'edit' ? 'warning' : 'success'" effect="light">
                            {{ scope.row.draftType === 'edit' ? '编辑文章' : '新草稿' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="专栏" min-width="140" max-width="180" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.tag || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="创建时间" min-width="160" max-width="190" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.createTime || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="更新时间" min-width="160" max-width="190" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.updateTime || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="操作" min-width="150" max-width="170" fixed="right">
                    <template #default="scope">
                        <div class="action-buttons action-buttons--compact">
                            <el-button size="default" @click="editDraft(scope.row)">编辑</el-button>
                            <el-dropdown
                                trigger="click"
                                :disabled="busyID !== ''"
                                @command="(command) => handleDraftAction(command, scope.row)">
                                <el-button
                                    size="default"
                                    class="action-more-button"
                                    :loading="publishingID === scope.row.id || deletingID === scope.row.id">
                                    更多
                                </el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="download">下载</el-dropdown-item>
                                        <el-dropdown-item command="publish">发布</el-dropdown-item>
                                        <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </section>

        <pagination
            :total="total"
            :currentPage="currentPage"
            :pageSize="pageSize"
            @handleCurrentChange="handleCurrentChange" />
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox, ElNotification } from 'element-plus';
import pagination from '../components/pagination.vue';
import emitter from '../utils/event-bus.js';
import _axios from '../utils/axios';

interface DraftItem {
    id: string;
    articleID?: string;
    draftType: 'new' | 'edit';
    title: string;
    tag: string;
    createTime: string;
    updateTime: string;
}

interface DraftDetail {
    id: string;
    articleID?: string;
    title: string;
    tag: string;
    describe: string;
    content: string;
}

type DraftAction = 'download' | 'publish' | 'delete';

const route = useRoute();
const router = useRouter();
const draftList = ref<DraftItem[]>([]);
const currentPage = ref(parsePositivePage(route.query.page));
const pageSize = 10;
const total = ref(0);
const loading = ref(false);
const publishingID = ref('');
const deletingID = ref('');
const busyID = computed(() => publishingID.value || deletingID.value);

function firstQueryValue(value: unknown): string {
    if (Array.isArray(value)) {
        return typeof value[0] === 'string' ? value[0] : '';
    }
    return typeof value === 'string' ? value : '';
}

function parsePositivePage(value: unknown): number {
    const page = Number.parseInt(firstQueryValue(value), 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
}

function syncRouteState() {
    router.replace({
        path: route.path,
        query: { page: String(currentPage.value) },
    }).catch(() => { });
}

async function fetchDraftList() {
    loading.value = true;
    try {
        const response = await _axios.get('/admin/auth/article/draft/list', {
            params: { page: currentPage.value, pageSize },
        });
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            draftList.value = data?.rows ?? [];
            total.value = data?.total ?? 0;
        } else {
            ElNotification({ title: 'Failed', message: message || '获取草稿列表失败', type: 'error' });
        }
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    } finally {
        loading.value = false;
    }
}

async function fetchDraftDetail(id: string): Promise<DraftDetail | null> {
    try {
        const response = await _axios.get('/admin/auth/article/draft/detail', {
            params: { id },
        });
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            return data;
        }
        ElNotification({ title: 'Failed', message: message || '获取草稿详情失败', type: 'error' });
        return null;
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
        return null;
    }
}

async function editDraft(row: DraftItem) {
    const detail = await fetchDraftDetail(row.id);
    if (!detail) return;
    await router.push({
        path: '/home/write-article',
        query: { redirect: route.fullPath },
    }).catch(() => { });
    emitter.emit('updateArticle', {
        id: detail.articleID || '',
        draftID: detail.id,
        title: detail.title,
        tag: detail.tag,
        content: detail.content,
        describe: detail.describe,
    });
}

async function publishDraft(row: DraftItem) {
    if (busyID.value) return;
    publishingID.value = row.id;
    try {
        const detail = await fetchDraftDetail(row.id);
        if (!detail) return;
        if (!detail.title.trim() || !detail.tag.trim() || !detail.describe.trim() || !detail.content.trim()) {
            ElNotification({
                title: '草稿不完整',
                message: '请先补齐标题、专栏、摘要和正文后再发布',
                type: 'warning',
            });
            return;
        }

        const response = await _axios.post('/admin/auth/article/draft/publish', {
            id: detail.id,
            title: detail.title,
            tag: detail.tag,
            describe: detail.describe,
            content: detail.content,
        });
        const { code, message } = response.data;
        if (code === 2000 && message === '') {
            ElNotification({ title: 'Success', message: '草稿已发布', type: 'success' });
            await refreshDraftListAfterMutation();
        } else {
            ElNotification({ title: 'Failed', message: message || '发布草稿失败', type: 'error' });
        }
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    } finally {
        publishingID.value = '';
    }
}

function handleDraftAction(command: DraftAction, row: DraftItem) {
    switch (command) {
        case 'download':
            void downloadDraft(row);
            break;
        case 'publish':
            void publishDraft(row);
            break;
        case 'delete':
            confirmDelete(row);
            break;
    }
}

async function downloadDraft(row: DraftItem) {
    const detail = await fetchDraftDetail(row.id);
    if (!detail) return;

    const blob = new Blob([detail.content || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeMarkdownFileName(detail.title || row.title || `draft-${row.id}`)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function safeMarkdownFileName(name: string): string {
    const safeName = name.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-');
    return safeName || 'draft';
}

function confirmDelete(row: DraftItem) {
    ElMessageBox.alert(`确定删除 <strong>${row.title || '未命名草稿'}</strong> 吗？`, '删除草稿', {
        showCancelButton: true,
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        customClass: 'messageStyle',
        cancelButtonClass: 'messageCancelBtn',
        confirmButtonClass: 'messageConfirmBtn',
        dangerouslyUseHTMLString: true,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        beforeClose: async (action, instance, done) => {
            if (action !== 'confirm') {
                done();
                return;
            }
            if (deletingID.value !== '') return;

            deletingID.value = row.id;
            instance.confirmButtonLoading = true;
            instance.confirmButtonText = '正在删除...';
            const deleted = await deleteDraft(row.id);
            instance.confirmButtonLoading = false;
            instance.confirmButtonText = '删除';
            deletingID.value = '';
            if (deleted) done();
        },
    }).catch((action) => {
        if (action === 'cancel') return;
    });
}

async function deleteDraft(id: string): Promise<boolean> {
    try {
        const response = await _axios.delete('/admin/auth/article/draft/delete', {
            data: { id },
        });
        const { code, message } = response.data;
        if (code === 2000 && message === '') {
            ElNotification({ title: 'Success', message: '草稿已删除', type: 'success' });
            await refreshDraftListAfterMutation();
            return true;
        }
        ElNotification({ title: 'Failed', message: message || '删除草稿失败', type: 'error' });
        return false;
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
        return false;
    }
}

async function refreshDraftListAfterMutation() {
    await fetchDraftList();
    if (draftList.value.length === 0 && currentPage.value > 1) {
        currentPage.value -= 1;
        syncRouteState();
        await fetchDraftList();
    }
}

async function handleCurrentChange(newPage: number) {
    currentPage.value = newPage;
    syncRouteState();
    await fetchDraftList();
}

onMounted(async () => {
    syncRouteState();
    await fetchDraftList();
});
</script>

<style scoped>
.draft-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.draft-header {
    align-items: center;
    background: #fff;
    border-bottom: 1px solid var(--admin-header-border-color, #e4e7ed);
    box-sizing: border-box;
    display: flex;
    flex: 0 0 var(--admin-header-height, 48px);
    height: var(--admin-header-height, 48px);
    justify-content: flex-start;
    min-width: 0;
    padding: 0 15px;
}

.draft-desc {
    color: #909399;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.draft-table-wrap {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.monospace-column {
    font-family: monospace;
}

.draft-name {
    color: #1f2937;
    font-weight: 600;
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
</style>
