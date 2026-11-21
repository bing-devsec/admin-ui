<template>
    <div class="embed-page">
        <div class="embed-filters">
            <el-input v-model.trim="keyword" class="keyword-filter" clearable aria-label="搜索动画 ID"
                placeholder="搜索动画 ID" @clear="applyFilters" @keyup.enter="applyFilters" />
            <el-select v-model="status" class="status-filter" aria-label="引用状态" @change="applyFilters">
                <el-option label="全部状态" value="" />
                <el-option label="已引用" value="used" />
                <el-option label="未引用" value="unused" />
            </el-select>
        </div>

        <div class="embed-list">
            <el-table v-loading="loading" :data="rows" row-key="id" scrollbar-always-on>
                <el-table-column label="动画 ID" min-width="260" show-overflow-tooltip>
                    <template #default="{ row }"><code>{{ row.id }}</code></template>
                </el-table-column>
                <el-table-column label="引用状态" width="100">
                    <template #default="{ row }">
                        <el-tag :type="row.status === 'used' ? 'success' : 'info'">
                            {{ row.status === 'used' ? '已引用' : '未引用' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="引用文章" prop="refCount" width="100" />
                <el-table-column label="存储大小" width="110">
                    <template #default="{ row }">{{ formatSize(row.size) }}</template>
                </el-table-column>
                <el-table-column label="更新时间" prop="updateTime" min-width="155" />
                <el-table-column label="操作" width="165" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" plain @click="openPreview(row)">预览</el-button>
                        <el-button type="danger" :disabled="row.status !== 'unused' || !!pendingDelete"
                            :loading="deleting === row.id" @click="confirmDelete(row)">删除</el-button>
                    </template>
                </el-table-column>
                <template #empty>
                    <template v-if="loadError">
                        {{ loadError }}
                        <el-button link type="primary" @click="loadList">重新加载</el-button>
                    </template>
                    <span v-else-if="!loading">暂无匹配的动画</span>
                </template>
            </el-table>
        </div>

        <Pagination :total="total" :page-size="pageSize" :current-page="page" @handle-current-change="changePage" />

        <el-drawer v-model="previewOpen" title="动画预览" size="min(720px, 100%)" destroy-on-close
            class="admin-drawer admin-detail-drawer">
            <template v-if="previewOpen && selected">
                <dl class="embed-metadata">
                    <dt>动画 ID</dt><dd><code>{{ selected.id }}</code></dd>
                    <dt>存储大小</dt><dd>{{ formatSize(selected.size) }}（gzip）</dd>
                    <dt>更新时间</dt><dd>{{ selected.updateTime }}</dd>
                    <dt><el-tooltip content="按已保存的文章和草稿源码统计，代码示例中的动画引用也会计入。" placement="top">
                        <span>引用文章</span>
                    </el-tooltip></dt>
                    <dd>
                        <span v-if="!selected.references.length">暂无文章引用</span>
                        <ul v-else class="references">
                            <li v-for="article in selected.references" :key="article.status + article.id">
                                <el-tag size="small" :type="article.status === 'draft' ? 'warning' : 'success'">
                                    {{ article.status === 'draft' ? '草稿' : '已发布' }}
                                </el-tag>
                                {{ article.title || article.id }}
                            </li>
                        </ul>
                    </dd>
                </dl>
                <HtmlEmbedPreview :key="selected.id" :id="selected.id" />
            </template>
        </el-drawer>
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import Pagination from '@/components/pagination.vue';
import axios from '@/utils/axios';

interface HtmlEmbed {
    id: string;
    size: number;
    updateTime: string;
    status: 'used' | 'unused';
    refCount: number;
    references: { id: string; title: string; status: 'published' | 'draft' }[];
}

const HtmlEmbedPreview = defineAsyncComponent(() => import('@/components/html-embed-preview.vue'));
const basePath = '/admin/auth/article/html-embed';
const pageSize = 10;
const page = ref(1);
const total = ref(0);
const rows = ref<HtmlEmbed[]>([]);
const keyword = ref('');
const status = ref('');
let appliedKeyword = '';
const loading = ref(true);
const loadError = ref('');
let listRequest: AbortController | undefined;
const pendingDelete = ref('');
const deleting = ref('');
const previewOpen = ref(false);
const selected = ref<HtmlEmbed>();

function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KiB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MiB';
}

async function loadList(): Promise<void> {
    listRequest?.abort();
    const request = new AbortController();
    listRequest = request;
    loading.value = true;
    loadError.value = '';
    try {
        const { data } = await axios.get(basePath + '/list', {
            params: { page: page.value, pageSize, status: status.value || undefined, keyword: appliedKeyword || undefined },
            signal: request.signal,
        });
        if (request.signal.aborted) return;
        if (data.code !== 2000 || data.message) throw new Error(data.message || '动画列表加载失败');
        const lastPage = Math.max(1, Math.ceil(data.data.total / pageSize));
        if (page.value > lastPage) {
            page.value = lastPage;
            return loadList();
        }
        rows.value = data.data.rows ?? [];
        total.value = data.data.total;
    } catch (error) {
        if (request.signal.aborted) return;
        rows.value = [];
        total.value = 0;
        loadError.value = error instanceof Error ? error.message : '动画列表加载失败';
    } finally {
        if (!request.signal.aborted) loading.value = false;
    }
}

function applyFilters() {
    appliedKeyword = keyword.value;
    page.value = 1;
    void loadList();
}

function changePage(nextPage: number) {
    if (nextPage === page.value) return;
    page.value = nextPage;
    void loadList();
}

function openPreview(row: HtmlEmbed) {
    selected.value = row;
    previewOpen.value = true;
}

async function confirmDelete(row: HtmlEmbed) {
    if (row.status !== 'unused' || pendingDelete.value) return;
    pendingDelete.value = row.id;
    try {
        await ElMessageBox.confirm('确定删除动画 ' + row.id + ' 吗？删除后，服务器将停止提供这份动画。', '删除动画',
            { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
    } catch {
        pendingDelete.value = '';
        return;
    }
    if (listRequest?.signal.aborted) return;
    deleting.value = row.id;
    try {
        const { data } = await axios.delete(basePath + '/delete', { data: { id: row.id } });
        if (data.code !== 2000 || data.message) throw new Error(data.message || '删除动画失败');
        ElMessage.success('动画已删除');
    } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : '删除动画失败');
    } finally {
        deleting.value = '';
        pendingDelete.value = '';
        if (listRequest && !listRequest.signal.aborted) await loadList();
    }
}

onMounted(loadList);
onBeforeUnmount(() => listRequest?.abort());
</script>

<style scoped>
.embed-page {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
}
.embed-filters {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: var(--admin-header-height, 48px);
    padding: 0 15px;
    border-bottom: 1px solid var(--admin-header-border-color, #e4e7ed);
    background: white;
}
.keyword-filter { width: 280px; min-width: 110px; }
.status-filter { width: 130px; flex-shrink: 0; }
.embed-list { flex: 1; min-height: 0; overflow: auto; }
.embed-metadata {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    align-items: baseline;
    gap: 10px 16px;
    margin: 0 0 20px;
}
.embed-metadata dt { color: var(--el-text-color-secondary); }
.embed-metadata dd { margin: 0; overflow-wrap: anywhere; }
.references { display: grid; gap: 8px; list-style: none; margin: 0; padding: 0; }
.references .el-tag { margin-right: 4px; }
</style>
