<template>
    <div class="site-dynamic-page">
        <div class="toolbar">
            <div class="toolbar-summary">
                <span>站点动态</span>
                <span class="summary-count">{{ siteDynamics.length }} 条</span>
            </div>
            <el-button type="primary" @click="openAddDrawer">
                <el-icon style="margin-right: 4px">
                    <Plus />
                </el-icon>
                新增动态
            </el-button>
        </div>

        <div class="dynamic-list">
            <div class="list-head">
                <span class="head-drag"></span>
                <span>内容</span>
                <span>日期</span>
                <span>状态</span>
                <span>更新时间</span>
                <span>操作</span>
            </div>

            <div
                v-for="(item, index) in siteDynamics"
                :key="item.id"
                class="list-row"
                :class="{ 'is-dragging': draggingIndex === index, 'is-drag-over': dragOverIndex === index }"
                @dragover.prevent="handleDragOver(index)"
                @drop.prevent="handleDrop(index)">
                <div class="drag-cell">
                    <button
                        class="drag-handle"
                        draggable="true"
                        title="拖动排序"
                        @dragstart="handleDragStart(index, $event)"
                        @dragend="handleDragEnd">
                        <el-icon>
                            <Rank />
                        </el-icon>
                    </button>
                </div>
                <div class="content-cell" :title="item.content">
                    {{ item.content }}
                </div>
                <div class="date-cell">{{ item.eventDate }}</div>
                <div class="status-cell">
                    <el-tag :type="item.status === 'published' ? 'success' : 'info'" disable-transitions>
                        {{ statusText(item.status) }}
                    </el-tag>
                </div>
                <div class="time-cell">{{ item.updateTime }}</div>
                <div class="action-cell">
                    <el-button size="default" @click="openEditDrawer(item)">编辑</el-button>
                    <el-button size="default" type="danger" @click="confirmDelete(item)">删除</el-button>
                </div>
            </div>

            <el-empty v-if="siteDynamics.length === 0" description="暂无站点动态" />
        </div>

        <el-drawer v-model="drawerVisible" :destroy-on-close="true" class="site-dynamic-drawer">
            <template #header>
                <div class="drawer-header">
                    <el-icon class="drawer-header-icon">
                        <component :is="isEdit ? Edit : Plus" />
                    </el-icon>
                    <span class="drawer-header-title">{{ drawerTitle }}</span>
                </div>
            </template>

            <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="site-dynamic-form">
                <div class="form-grid">
                    <el-form-item label="动态日期" prop="eventDate" required>
                        <el-date-picker
                            v-model="form.eventDate"
                            type="date"
                            value-format="YYYY-MM-DD"
                            placeholder="选择日期"
                            style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="状态" prop="status" required>
                        <el-segmented v-model="form.status" :options="statusOptions" />
                    </el-form-item>
                </div>

                <el-form-item label="动态内容" prop="content" required>
                    <el-input
                        v-model="form.content"
                        type="textarea"
                        maxlength="50"
                        show-word-limit
                        :autosize="{ minRows: 3, maxRows: 4 }"
                        placeholder="请输入要在前台展示的动态内容" />
                </el-form-item>

                <div class="form-footer">
                    <el-button @click="drawerVisible = false">取消</el-button>
                    <el-button type="primary" :loading="submitting" @click="submitForm">
                        {{ isEdit ? '保存修改' : '新增' }}
                    </el-button>
                </div>
            </el-form>
        </el-drawer>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessageBox, ElNotification, type FormInstance, type FormRules } from 'element-plus';
import { Edit, Plus, Rank } from '@element-plus/icons-vue';
import _axios from '../utils/axios';

type SiteDynamicStatus = 'published' | 'hidden';

interface SiteDynamicItem {
    id: string;
    content: string;
    status: SiteDynamicStatus;
    sortOrder: number;
    eventDate: string;
    createTime: string;
    updateTime: string;
}

interface SiteDynamicForm {
    id: string;
    content: string;
    status: SiteDynamicStatus;
    eventDate: string;
}

const siteDynamics = ref<SiteDynamicItem[]>([]);
const drawerVisible = ref(false);
const submitting = ref(false);
const draggingIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);
const formRef = ref<FormInstance>();

const form = reactive<SiteDynamicForm>({
    id: '',
    content: '',
    status: 'published',
    eventDate: today(),
});

const statusOptions = [
    { label: '已发布', value: 'published' },
    { label: '已隐藏', value: 'hidden' },
];

const isEdit = computed(() => !!form.id);
const drawerTitle = computed(() => (isEdit.value ? '编辑站点动态' : '新增站点动态'));

const rules: FormRules = {
    content: [
        { required: true, message: '请输入动态内容', trigger: 'blur' },
        { max: 50, message: '动态内容不超过 50 个字符', trigger: 'blur' },
    ],
    eventDate: [{ required: true, message: '请选择动态日期', trigger: 'change' }],
    status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

function today() {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function statusText(status: string) {
    return status === 'published' ? '已发布' : '已隐藏';
}

function resetForm(row?: SiteDynamicItem) {
    form.id = row?.id ?? '';
    form.content = row?.content ?? '';
    form.status = row?.status ?? 'published';
    form.eventDate = row?.eventDate ?? today();
    formRef.value?.clearValidate();
}

async function fetchSiteDynamics() {
    try {
        const response = await _axios.get('/admin/auth/site-dynamic/list');
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            siteDynamics.value = data.rows || [];
            return;
        }
        ElNotification({ title: 'Failed', message: '获取站点动态失败', type: 'error' });
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    }
}

function openAddDrawer() {
    resetForm();
    drawerVisible.value = true;
}

function openEditDrawer(row: SiteDynamicItem) {
    resetForm(row);
    drawerVisible.value = true;
}

async function submitForm() {
    if (!formRef.value) return;
    try {
        await formRef.value.validate();
    } catch {
        return;
    }

    submitting.value = true;
    const payload = {
        id: form.id,
        content: form.content.trim(),
        status: form.status,
        eventDate: form.eventDate,
    };
    const request = isEdit.value
        ? _axios.put('/admin/auth/site-dynamic/update', payload)
        : _axios.post('/admin/auth/site-dynamic/add', payload);
    const successMsg = isEdit.value ? '更新站点动态成功' : '新增站点动态成功';
    const failMsg = isEdit.value ? '更新站点动态失败' : '新增站点动态失败';

    try {
        const response = await request;
        const { code, message } = response.data;
        if (code === 2000 && message === '') {
            ElNotification({ title: 'Success', message: successMsg, type: 'success' });
            drawerVisible.value = false;
            await fetchSiteDynamics();
            return;
        }
        ElNotification({ title: 'Failed', message: failMsg, type: 'error' });
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    } finally {
        submitting.value = false;
    }
}

function handleDragStart(index: number, event: DragEvent) {
    draggingIndex.value = index;
    dragOverIndex.value = index;
    event.dataTransfer?.setData('text/plain', siteDynamics.value[index].id);
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
    }
}

function handleDragOver(index: number) {
    if (draggingIndex.value === null) return;
    dragOverIndex.value = index;
}

async function handleDrop(targetIndex: number) {
    const sourceIndex = draggingIndex.value;
    dragOverIndex.value = null;
    draggingIndex.value = null;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const previous = [...siteDynamics.value];
    const next = [...siteDynamics.value];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    siteDynamics.value = next;

    try {
        const response = await _axios.put('/admin/auth/site-dynamic/reorder', {
            ids: siteDynamics.value.map((item) => item.id),
        });
        const { code, message } = response.data;
        if (code === 2000 && message === '') {
            ElNotification({ title: 'Success', message: '排序已保存', type: 'success' });
            await fetchSiteDynamics();
            return;
        }
        siteDynamics.value = previous;
        ElNotification({ title: 'Failed', message: '保存站点动态排序失败', type: 'error' });
    } catch (error: any) {
        siteDynamics.value = previous;
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    }
}

function handleDragEnd() {
    draggingIndex.value = null;
    dragOverIndex.value = null;
}

function confirmDelete(row: SiteDynamicItem) {
    ElMessageBox.alert('你确定删除这条站点动态吗', '删除站点动态', {
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        customClass: 'messageStyle',
        cancelButtonClass: 'messageCancelBtn',
        confirmButtonClass: 'messageConfirmBtn',
    })
        .then(() => deleteSiteDynamic(row))
        .catch((action) => {
            if (action === 'cancel') return;
        });
}

async function deleteSiteDynamic(row: SiteDynamicItem) {
    try {
        const response = await _axios.delete('/admin/auth/site-dynamic/delete', {
            data: { id: row.id },
        });
        const { code, message } = response.data;
        if (code === 2000 && message === '') {
            ElNotification({ title: 'Success', message: '删除站点动态成功', type: 'success' });
            await fetchSiteDynamics();
            return;
        }
        ElNotification({ title: 'Failed', message: '删除站点动态失败', type: 'error' });
    } catch (error: any) {
        ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
    }
}

onMounted(() => {
    void fetchSiteDynamics();
});
</script>

<style scoped>
.site-dynamic-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.toolbar {
    align-items: center;
    background: #fff;
    border-bottom: 1px solid var(--admin-header-border-color, #e4e7ed);
    box-sizing: border-box;
    display: flex;
    flex: 0 0 var(--admin-header-height, 48px);
    gap: 12px;
    height: var(--admin-header-height, 48px);
    justify-content: space-between;
    padding: 0 15px;
}

.toolbar-summary {
    align-items: center;
    color: #303133;
    display: flex;
    font-size: 14px;
    font-weight: 600;
    gap: 8px;
}

.summary-count {
    color: #909399;
    font-size: 13px;
    font-weight: 400;
}

.dynamic-list {
    flex: 1;
    min-height: 0;
    overflow: auto;
}

.list-head,
.list-row {
    align-items: center;
    display: grid;
    grid-template-columns: 56px minmax(260px, 1fr) 130px 120px 160px 190px;
}

.list-head {
    background: #fafafa;
    border-bottom: 1px solid #ebeef5;
    color: #909399;
    font-size: 13px;
    font-weight: 600;
    height: 44px;
    padding-right: 12px;
}

.list-row {
    background: #fff;
    border-bottom: 1px solid #ebeef5;
    min-height: 58px;
    padding-right: 12px;
    transition:
        background-color 0.16s ease,
        box-shadow 0.16s ease;
}

.list-row:hover {
    background: #fafcff;
}

.list-row.is-dragging {
    opacity: 0.62;
}

.list-row.is-drag-over {
    box-shadow: inset 0 2px 0 var(--el-color-primary);
}

.drag-cell {
    align-items: center;
    display: flex;
    justify-content: center;
}

.drag-handle {
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: #a8abb2;
    cursor: grab;
    display: inline-flex;
    height: 30px;
    justify-content: center;
    padding: 0;
    width: 30px;
}

.drag-handle:hover {
    background: #ecf5ff;
    border-color: #c6e2ff;
    color: var(--el-color-primary);
}

.drag-handle:active {
    cursor: grabbing;
}

.content-cell {
    color: #303133;
    font-size: 14px;
    line-height: 1.5;
    min-width: 0;
    overflow: hidden;
    padding-right: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.date-cell,
.time-cell {
    color: #606266;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
}

.status-cell {
    min-width: 0;
}

.action-cell {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
}

.drawer-header {
    align-items: center;
    display: flex;
    gap: 8px;
}

.drawer-header-icon {
    color: var(--el-color-primary);
    font-size: 20px;
}

.drawer-header-title {
    color: #303133;
    font-size: 16px;
    font-weight: 600;
}

.site-dynamic-form {
    height: 100%;
    overflow-y: auto;
}

.form-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.form-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 16px;
}

@media (max-width: 1100px) {
    .dynamic-list {
        overflow-x: auto;
    }

    .list-head,
    .list-row {
        min-width: 920px;
    }
}

@media (max-width: 700px) {
    .toolbar {
        height: auto;
        padding: 10px 15px;
    }

    .form-grid {
        grid-template-columns: 1fr;
    }
}
</style>
