<template>
    <div class="tabs-container">
        <div class="button-container">
            <el-button type="primary" @click="openAddDrawer">
                <el-icon style="margin-right: 4px">
                    <Plus />
                </el-icon>
                添加友链
            </el-button>
        </div>
        <div class="table-container">
            <el-table :data="paginatedLinkList" style="width: 100%" class="monospace-column">
                <el-table-column label="序号" min-width="60" max-width="100">
                    <template #default="scope">
                        <span>{{ (currentPage - 1) * pageSize + scope.$index + 1 }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="名称" min-width="260" max-width="320" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.name }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="URL" min-width="260" max-width="320" show-overflow-tooltip>
                    <template #default="scope">
                        <span>{{ scope.row.url }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="操作" min-width="145" max-width="150">
                    <template #default="scope">
                        <div class="action-buttons">
                            <el-button size="default" @click="handleEdit(scope.row)">编辑</el-button>
                            <el-button size="default" type="danger"
                                @click="open(scope.$index, scope.row)">删除</el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>

    <el-drawer v-model="drawer" :title="drawerTitle" :destroy-on-close="true" class="link-drawer">
        <template #header>
            <div class="drawer-header">
                <el-icon class="drawer-header-icon">
                    <component :is="isEdit ? Edit : Link" />
                </el-icon>
                <span class="drawer-header-title">{{ drawerTitle }}</span>
            </div>
        </template>
        <updateLink :id="editingId" :name="editingName" :url="editingUrl"
            @close="drawer = false" @refresh="fetchLinkList" />
    </el-drawer>

    <pagination :total="total" :currentPage="currentPage" :pageSize="pageSize"
        @handleCurrentChange="handleCurrentChange">
    </pagination>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessageBox, ElNotification } from 'element-plus';
import { Plus, Edit, Link } from '@element-plus/icons-vue';
import updateLink from '../components/update-link.vue';
import pagination from '../components/Pagination.vue';
import _axios from '../utils/axios';

const currentPage = ref(1);
const pageSize = 10;
const total = ref(0);
const editingId = ref('');
const editingName = ref('');
const editingUrl = ref('');
const linkList = ref<LinkItem[]>([]);
const drawer = ref(false);

interface LinkItem {
    id: string;
    name: string;
    url: string;
}

const isEdit = computed(() => !!editingId.value);
const drawerTitle = computed(() => (isEdit.value ? '编辑友链' : '添加友链'));

const sortedLinkList = computed(() => {
    return [...linkList.value].sort((a, b) => {
        if (a.id.length !== b.id.length) return b.id.length - a.id.length;
        return b.id.localeCompare(a.id);
    });
});

const paginatedLinkList = computed(() => {
    if (sortedLinkList.value && Array.isArray(sortedLinkList.value)) {
        const start = (currentPage.value - 1) * pageSize;
        const end = start + pageSize;
        return sortedLinkList.value.slice(start, end);
    }
    return [];
});

const handleCurrentChange = (newPage: number) => {
    currentPage.value = newPage;
};

const fetchPageData = async (page: number) => {
    currentPage.value = page;
    await fetchLinkList();
};

const fetchLinkList = async () => {
    try {
        const response = await _axios.get('/admin/auth/link/list');
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            linkList.value = data.rows || [];
            total.value = data.rows ? data.rows.length : 0;
        } else {
            ElNotification({
                title: 'Failed',
                message: '获取友链列表失败',
                type: 'error',
            });
        }
    } catch (error: any) {
        ElNotification({
            title: 'Error',
            message: error?.message ?? String(error),
            type: 'error',
        });
    }
};

onMounted(fetchLinkList);

const openAddDrawer = () => {
    editingId.value = '';
    editingName.value = '';
    editingUrl.value = '';
    drawer.value = true;
};

const handleEdit = (row: LinkItem) => {
    if (!row) return;
    editingId.value = row.id;
    editingName.value = row.name;
    editingUrl.value = row.url;
    drawer.value = true;
};

const open = (index: number, row: LinkItem) => {
    ElMessageBox.alert('你确定删除这条友链吗', '删除友链', {
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        customClass: 'messageStyle',
        cancelButtonClass: 'messageCancelBtn',
        confirmButtonClass: 'messageConfirmBtn',
        dangerouslyUseHTMLString: true,
    })
        .then(() => {
            handleDelete(index, row);
        })
        .catch((action) => {
            if (action === 'cancel') return;
        });
};

const handleDelete = async (_index: number, row: LinkItem) => {
    try {
        const response = await _axios.delete('/admin/auth/link/delete', {
            data: { id: row.id },
        });
        const { code, message } = response.data;

        if (code === 2000 && message === '') {
            await fetchPageData(currentPage.value);
            ElNotification({
                title: 'Success',
                message: '删除友链成功',
                type: 'success',
            });
        } else {
            ElNotification({
                title: 'Failed',
                message: '删除友链失败',
                type: 'error',
            });
        }
    } catch (error: any) {
        ElNotification({
            title: 'Error',
            message: error?.message ?? String(error),
            type: 'error',
        });
    }
};
</script>

<style scoped>
.monospace-column {
    font-family: monospace;
}

.tabs-container {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.table-container {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 46px;
}

.button-container {
    margin-top: 9px;
    margin-bottom: 9px;
    margin-left: 15px;
}

.el-tabs__nav-scroll {
    --el-tabs-header-height: 50px;
}

.el-tabs__item {
    padding: 24px 20px !important;
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
</style>
