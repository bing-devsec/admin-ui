<template>
    <div class="tabs-container">
        <div class="button-container">
            <el-button type="primary" @click="openDialog">添加友链</el-button>
        </div>
        <el-table :data="paginatedLinkList" style="width: 100%">
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
                        <el-button size="default" type="danger" @click="open(scope.$index, scope.row)">删除</el-button>
                    </div>
                </template>
            </el-table-column>
        </el-table>
    </div>
    <addLink :visible="dialogVisible" @update:visible="dialogVisible = $event" @update:refresh="fetchLinkList">
    </addLink>
    <el-drawer v-model="drawer" title="title" :with-header="false">
        <updateLink v-model:name="name" v-model:url="url" :id="id" @update:refresh="fetchLinkList"
            @close-drawer="closeDrawer"></updateLink>
    </el-drawer>
    <pagination :total="total" :currentPage="currentPage" :pageSize="pageSize"
        @handleCurrentChange="handleCurrentChange">
    </pagination>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessageBox, ElNotification } from 'element-plus';
import addLink from '../components/add-link.vue';
import updateLink from '../components/update-link.vue';
import pagination from '../components/pagination.vue';
import _axios from '../utils/axios';

const currentPage = ref(1);
const pageSize = 9;
const total = ref(0);
let name = ref('');
let url = ref('');
let id = ref('');
let linkList = ref<Link[]>([]);
const dialogVisible = ref(false);
let drawer = ref(false);

interface Link {
    id: string;
    name: string;
    url: string;
}

const paginatedLinkList = computed(() => {
    if (linkList.value && Array.isArray(linkList.value)) {
        const start = (currentPage.value - 1) * pageSize;
        const end = start + pageSize;
        return linkList.value.slice(start, end);
    }
    return [];
});

const handleCurrentChange = (newPage: number) => {
    currentPage.value = newPage;
};

const fetchLinkList = async () => {
    try {
        const response = await _axios.get('/admin/link/list');
        const { code, message, data } = response.data;
        if (code === 2000 && message === "") {
            linkList.value = data.rows || [];
            total.value = data.rows ? data.rows.length : 0;
            currentPage.value = 1;
        } else {
            ElNotification({
                title: "Failed",
                message: "获取工具列表失败",
                type: "error",
            });
        }
    } catch (error) {
        ElNotification({
            title: "Error",
            message: error,
            type: "error",
        });
    }
};

onMounted(fetchLinkList);

const openDialog = () => {
    dialogVisible.value = true;
};

const closeDrawer = () => {
    drawer.value = false;
};

const handleEdit = async (row: Link) => {
    if (row) {
        name.value = row.name;
        url.value = row.url;
        id.value = row.id;
        drawer.value = true;
    }
};

// 删除友链
const open = (index: number, row: Link) => {
    ElMessageBox.alert("你确定删除这条友链吗", "删除友链", {
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        customClass: "messageStyle",
        cancelButtonClass: 'messageCancelBtn',
        confirmButtonClass: 'messageConfirmBtn',
        dangerouslyUseHTMLString: true,
    }).then(() => {
        handleDelete(index, row);
    }).catch((action) => {
        if (action === "cancel") {
            return;
        }
    });
};

// 删除友链axios
const handleDelete = async (index: number, row: Link) => {
    try {
        const response = await _axios.delete(`/admin/link/delete`, {
            data: { id: row.id },
        });
        const { code, message } = response.data;

        if (code === 2000 && message === "") {
            linkList.value.splice(index, 1);
            ElNotification({
                title: "Success",
                message: "删除友链成功",
                type: "success",
            });
        } else {
            ElNotification({
                title: "Failed",
                message: "删除友链失败",
                type: "error",
            });
        }
    } catch (error) {
        ElNotification({
            title: "Error",
            message: error,
            type: "error",
        });
    }
};
</script>

<style scoped>
.el-tabs__nav-scroll {
    --el-tabs-header-height: 50px;
}

.tabs-container {
    display: flex;
    flex-direction: column;
}

.button-container {
    margin-top: 15px;
    margin-bottom: 15px;
    margin-left: 15px;
}

.el-tabs__item {
    padding: 24px 20px !important;
}
</style>