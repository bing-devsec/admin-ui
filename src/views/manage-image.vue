<template>
    <div class="image-page">
        <section class="image-header">
            <div class="image-actions">
                <el-input
                    v-model.trim="keyword"
                    class="image-keyword"
                    clearable
                    placeholder="搜索图片名称 / URL"
                    @clear="handleFilterChange"
                    @keyup.enter="handleFilterChange" />
                <el-select v-model="statusFilter" class="image-status" @change="handleFilterChange">
                    <el-option label="全部状态" value="" />
                    <el-option label="已使用" value="used" />
                    <el-option label="未使用" value="unused" />
                    <el-option label="缺失" value="missing" />
                </el-select>
                <el-button type="primary" :loading="scanLoading" @click="scanImages">
                    重新扫描
                </el-button>
            </div>
        </section>

        <section class="image-table-wrap">
            <el-table
                v-loading="loading"
                scrollbar-always-on
                :data="imageList"
                class="image-table"
                style="width: 100%">
                <el-table-column label="序号" min-width="64" max-width="90">
                    <template #default="scope">
                        <span>{{ (currentPage - 1) * pageSize + scope.$index + 1 }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="图片名称" min-width="190" show-overflow-tooltip>
                    <template #default="scope">
                        <span class="file-name">{{ scope.row.imageName }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="状态" min-width="96" max-width="110">
                    <template #default="scope">
                        <el-tag :type="statusTagType(scope.row.status)" effect="light">
                            {{ statusText(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="引用次数" min-width="96" max-width="120">
                    <template #default="scope">
                        <span>{{ scope.row.refCount }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="大小" min-width="100" max-width="120">
                    <template #default="scope">
                        <span>{{ formatBytes(scope.row.size) }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="类型" min-width="120" max-width="150" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.mime || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="更新时间" min-width="150" max-width="180" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.updateTime || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="操作" min-width="170" max-width="190" fixed="right">
                    <template #default="scope">
                        <div class="action-buttons">
                            <el-button size="default" type="primary" plain @click="openDetail(scope.row)">详情</el-button>
                            <el-button
                                size="default"
                                type="danger"
                                :loading="deletingID === scope.row.id"
                                :disabled="deletingID !== '' && deletingID !== scope.row.id"
                                @click="confirmDelete(scope.row)">
                                删除
                            </el-button>
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

        <el-drawer
            v-model="detailDrawer"
            size="640px"
            :destroy-on-close="true"
            class="image-detail-drawer">
            <template #header>
                <div class="drawer-title">
                    <span>图片详情</span>
                </div>
            </template>

            <div v-if="detailLoading" class="detail-loading">加载图片详情中...</div>
            <div v-else-if="selectedDetail" class="image-detail">
                <div class="detail-meta-panel">
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">图片名称</span>
                        <span class="detail-meta-value" :title="selectedDetail.image.imageName">{{ selectedDetail.image.imageName }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">URL</span>
                        <span class="detail-meta-value detail-meta-value--break">
                            <a
                                class="detail-image-link"
                                :href="selectedDetail.image.url"
                                target="_blank"
                                rel="noopener noreferrer">
                                {{ selectedDetail.image.url }}
                            </a>
                        </span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">大小</span>
                        <span class="detail-meta-value">{{ formatBytes(selectedDetail.image.size) }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">类型</span>
                        <span class="detail-meta-value">{{ selectedDetail.image.mime || '-' }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">状态</span>
                        <span class="detail-meta-value">
                            <el-tag :type="statusTagType(selectedDetail.image.status)" effect="light">
                                {{ statusText(selectedDetail.image.status) }}
                            </el-tag>
                        </span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">来源</span>
                        <span class="detail-meta-value">{{ selectedDetail.image.source || '-' }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">引用次数</span>
                        <span class="detail-meta-value">{{ selectedDetail.image.refCount }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">最后扫描</span>
                        <span class="detail-meta-value">{{ selectedDetail.image.lastSeenTime || '-' }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">更新时间</span>
                        <span class="detail-meta-value">{{ selectedDetail.image.updateTime || '-' }}</span>
                    </div>
                    <div class="detail-meta-row detail-meta-row--references">
                        <span class="detail-meta-label">引用文章</span>
                        <div class="detail-meta-value detail-meta-value--references">
                            <span v-if="selectedDetail.references.length === 0" class="reference-empty">
                                暂无文章引用
                            </span>
                            <div v-else class="reference-list">
                                <div v-for="reference in selectedDetail.references" :key="reference.id" class="reference-row">
                                    <span class="reference-title" :title="reference.articleTitle || '文章已删除'">
                                        {{ reference.articleTitle || '文章已删除' }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="detail-content-panel">
                    <div class="detail-content-header">
                        <span class="detail-content-title">图片预览</span>
                    </div>
                    <div class="preview-stage">
                        <img :src="selectedDetail.image.url" :alt="selectedDetail.image.imageName" />
                    </div>
                </div>
            </div>
        </el-drawer>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { ElMessageBox, ElNotification } from 'element-plus';
import pagination from '../components/pagination.vue';
import _axios from '../utils/axios';

interface ImageItem {
    id: string;
    url: string;
    imageName: string;
    mime: string;
    size: number;
    etag: string;
    status: 'used' | 'unused' | 'missing';
    source: string;
    refCount: number;
    lastSeenTime: string;
    objectModifiedTime: string;
    createTime: string;
    updateTime: string;
}

interface ImageReference {
    id: string;
    articleID: string;
    articleTitle: string;
}

interface ImageDetail {
    image: ImageItem;
    references: ImageReference[];
}

const imageList = ref<ImageItem[]>([]);
const selectedDetail = ref<ImageDetail | null>(null);
const currentPage = ref(1);
const pageSize = 10;
const total = ref(0);
const statusFilter = ref('used');
const keyword = ref('');
const loading = ref(false);
const scanLoading = ref(false);
const detailLoading = ref(false);
const detailDrawer = ref(false);
const deletingID = ref('');

const fetchImageList = async () => {
    loading.value = true;
    try {
        const response = await _axios.get('/admin/auth/article/image/list', {
            params: {
                page: currentPage.value,
                pageSize,
                status: statusFilter.value || undefined,
                keyword: keyword.value || undefined,
            },
        });
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            imageList.value = data.rows || [];
            total.value = data.total || 0;
        } else {
            ElNotification({ title: 'Failed', message: message || '获取图片列表失败', type: 'error' });
        }
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    } finally {
        loading.value = false;
    }
};

const handleCurrentChange = async (newPage: number) => {
    currentPage.value = newPage;
    await fetchImageList();
};

const handleFilterChange = async () => {
    currentPage.value = 1;
    await fetchImageList();
};

const scanImages = async () => {
    scanLoading.value = true;
    try {
        const response = await _axios.post('/admin/auth/article/image/scan');
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            ElNotification({
                title: 'Success',
                message: `扫描完成：${data.imageTotal} 张图片，${data.referenceTotal} 次引用`,
                type: 'success',
            });
            currentPage.value = 1;
            await fetchImageList();
        } else {
            ElNotification({ title: 'Failed', message: message || '扫描图片失败', type: 'error' });
        }
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    } finally {
        scanLoading.value = false;
    }
};

const openDetail = async (row: ImageItem) => {
    detailDrawer.value = true;
    detailLoading.value = true;
    selectedDetail.value = null;
    try {
        const response = await _axios.get('/admin/auth/article/image/detail', {
            params: { id: row.id },
        });
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            selectedDetail.value = data;
        } else {
            ElNotification({ title: 'Failed', message: message || '获取图片详情失败', type: 'error' });
        }
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    } finally {
        detailLoading.value = false;
    }
};

const confirmDelete = (row: ImageItem) => {
    const force = row.refCount > 0;
    const warning = force
        ? `<p>这张图片仍被 <strong>${row.refCount}</strong> 次引用，删除后相关文章会出现图片失效。</p>`
        : '<p>这张图片当前没有文章引用。</p>';

    ElMessageBox.alert(`${warning}<p>${row.imageName || '未命名图片'}</p>`, '删除图片', {
        showCancelButton: true,
        confirmButtonText: '直接删除',
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
            const deleted = await deleteImage(row.id, force);
            instance.confirmButtonLoading = false;
            instance.confirmButtonText = '直接删除';
            deletingID.value = '';
            if (deleted) done();
        },
    }).catch((action) => {
        if (action === 'cancel') return;
    });
};

const deleteImage = async (id: string, force: boolean): Promise<boolean> => {
    try {
        const response = await _axios.delete('/admin/auth/article/image/delete', {
            data: { id, force },
        });
        const { code, message } = response.data;
        if (code === 2000 && message === '') {
            ElNotification({ title: 'Success', message: '图片已删除', type: 'success' });
            if (selectedDetail.value?.image.id === id) {
                detailDrawer.value = false;
                selectedDetail.value = null;
            }
            await fetchImageList();
            return true;
        }
        ElNotification({ title: 'Failed', message: message || '删除图片失败', type: 'error' });
        return false;
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
        return false;
    }
};

const statusText = (status: string) => {
    switch (status) {
        case 'used':
            return '已使用';
        case 'unused':
            return '未使用';
        case 'missing':
            return '缺失';
        default:
            return status || '-';
    }
};

const statusTagType = (status: string) => {
    switch (status) {
        case 'used':
            return 'success';
        case 'unused':
            return 'warning';
        case 'missing':
            return 'danger';
        default:
            return 'info';
    }
};

const formatBytes = (size: number) => {
    if (!Number.isFinite(size) || size <= 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

onMounted(fetchImageList);
</script>

<style scoped>
.image-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.image-header {
    align-items: center;
    background: #fff;
    border-bottom: 1px solid var(--admin-header-border-color, #e4e7ed);
    box-sizing: border-box;
    display: flex;
    flex: 0 0 var(--admin-header-height, 48px);
    gap: 12px;
    height: var(--admin-header-height, 48px);
    justify-content: flex-start;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0 15px;
    scrollbar-width: thin;
}

.image-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    gap: 10px;
    justify-content: flex-start;
    white-space: nowrap;
}

.image-keyword {
    width: 280px;
}

.image-status {
    width: 130px;
}

.image-table-wrap {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.file-name {
    color: #1f2d3d;
    font-weight: 400;
}

.image-page :deep(.el-table) {
    color: #606266;
    font-family: monospace;
    font-size: 14px;
    font-weight: 400;
}

.image-page :deep(.el-table th),
.image-page :deep(.el-table td) {
    white-space: nowrap;
}

.image-page :deep(.el-table th .cell),
.image-page :deep(.el-table td .cell) {
    font-weight: 400;
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

:global(.image-detail-drawer .el-drawer__header) {
    margin-bottom: 10px;
}

.drawer-title {
    align-items: center;
    display: flex;
    gap: 10px;
    color: #303133;
    font-size: 17px;
    font-weight: 400;
}

.detail-loading {
    color: #909399;
    padding: 24px;
}

.image-detail {
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: #303133;
    font-family: monospace;
}

.preview-stage {
    align-items: center;
    background:
        linear-gradient(45deg, #f2f5fa 25%, transparent 25%),
        linear-gradient(-45deg, #f2f5fa 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #f2f5fa 75%),
        linear-gradient(-45deg, transparent 75%, #f2f5fa 75%);
    background-color: #fff;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0;
    background-size: 20px 20px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    display: flex;
    justify-content: center;
    min-height: 300px;
    overflow: auto;
    padding: 18px;
}

.preview-stage img {
    max-height: 520px;
    max-width: 100%;
    object-fit: contain;
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

.detail-meta-row--references {
    align-items: flex-start;
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

.detail-meta-value--break {
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
    word-break: break-all;
}

.detail-image-link {
    color: #409eff;
    text-decoration: none;
    word-break: break-all;
}

.detail-image-link:hover {
    color: #337ecc;
    text-decoration: underline;
    text-underline-offset: 3px;
}

.detail-meta-value--references {
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
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

.reference-empty {
    color: #909399;
    font-size: 13px;
    line-height: 22px;
}

.reference-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.reference-row {
    display: flex;
    min-width: 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #f0f2f5;
}

.reference-row:last-child {
    padding-bottom: 0;
    border-bottom: 0;
}

.reference-title {
    overflow: hidden;
    color: #303133;
    font-size: 13px;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

@media (max-width: 900px) {
    .image-keyword {
        width: 220px;
    }
}
</style>
