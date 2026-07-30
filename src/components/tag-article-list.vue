<template>
    <el-table scrollbar-always-on :data="data" style="width: 100%" @selection-change="handleSelectionChange" class="monospace-column">
        <el-table-column type="selection" width="50"></el-table-column>
        <el-table-column label="序号" min-width="60" max-width="100">
            <template #default="scope">
                <div style="display: flex; align-items: center">
                    <span>{{ (currentPage - 1) * pageSize + scope.$index + 1 }}</span>
                </div>
            </template>
        </el-table-column>
        <el-table-column label="标题" min-width="230" max-width="500" show-overflow-tooltip>
            <template #default="scope">
                <span>{{ scope.row.title }}</span>
            </template>
        </el-table-column>
        <el-table-column label="浏览量" min-width="90" max-width="180">
            <template #default="scope">
                <span>{{ scope.row.viewNum }}</span>
            </template>
        </el-table-column>
        <el-table-column label="发布时间" min-width="170" max-width="190" show-overflow-tooltip>
            <template #default="scope">
                <span>{{ scope.row.createTime }}</span>
            </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="170" max-width="190" show-overflow-tooltip>
            <template #default="scope">
                <span>{{ scope.row.updateTime }}</span>
            </template>
        </el-table-column>
        <el-table-column label="操作" min-width="145" max-width="150" fixed="right">
            <template #default="scope">
                <div class="action-buttons">
                    <el-button size="default"
                        :disabled="deletingArticleID !== ''"
                        @click="handleEdit((currentPage - 1) * pageSize + scope.$index, scope.row)">编辑</el-button>
                    <el-button size="default" type="danger" :loading="isDeletingArticle(scope.row.id)"
                        :disabled="deletingArticleID !== '' && !isDeletingArticle(scope.row.id)"
                        @click="open(scope.row)">删除</el-button>
                </div>
            </template>
        </el-table-column>
    </el-table>
</template>

<script lang="ts" setup>
import { ref, toRefs } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox, ElNotification } from 'element-plus'
import emitter from '../utils/event-bus.js'
import _axios from '../utils/axios';
const route = useRoute();
const router = useRouter();

const emit = defineEmits(['selection-change', 'refresh']);
const handleSelectionChange = (selection: any[]) => {
    emit('selection-change', selection);
};

interface Article {
    id: string;
    title: string;
    tag: string;
    viewNum: number;
    createTime: string;
    updateTime: string;
}

const props = defineProps<{
    data: Article[];
    currentPage: number;
    pageSize: number;
}>();
const { data, currentPage, pageSize } = toRefs(props);

const id = ref("");
const title = ref("");
const content = ref("");
const describe = ref("");
const tag = ref("");
const deletingArticleID = ref("");

function isDeletingArticle(articleID: string): boolean {
    return deletingArticleID.value === articleID;
}

// 封装获取博客详情的函数
async function fetchArticleDetails(id: string) {
    try {
        const response = await _axios.get(`/admin/auth/article/detail`, {
            params: { id: id },
        });

        const { code, message } = response.data;
        if (code === 2000 && message === "") {
            return response.data;
        } else {
            ElNotification({
                title: "Failed",
                message: "获取文章内容失败”",
                type: "error",
            });
            return null;
        }
    } catch (error: any) {
        ElNotification({
            title: "Error",
            message: error,
            type: "error",
        });
        throw error;
    }
}

// 处理编辑逻辑
const handleEdit = async (_index: number, row: Article) => {
    try {
        const response = await fetchArticleDetails(row.id);
        const { code, message, data } = response;
        if (code === 2000 && message === "") {
            id.value = data.id;
            title.value = data.title;
            tag.value = data.tag;
            content.value = data.content;
            describe.value = data.describe;

            router.push({
                path: "/home/write-article",
                query: { redirect: route.fullPath },
            }).then(() => {
                emitter.emit("updateArticle", {
                    id: row.id,
                    title: title.value,
                    tag: tag.value,
                    content: content.value,
                    describe: describe.value,
                });
            });
        } else {
            ElNotification({
                title: "Failed",
                message: "获取文章详情失败",
                type: "error",
            });
        }
    } catch (error: any) {
        ElNotification({
            title: "Error",
            message: error,
            type: "error",
        });
    }
};

const open = (row: Article) => {
    ElMessageBox.alert(`确定删除 <strong>${row.title}</strong> 这篇文章吗？`, "删除文章", {
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        customClass: "messageStyle",
        cancelButtonClass: 'messageCancelBtn',
        confirmButtonClass: 'messageConfirmBtn',
        dangerouslyUseHTMLString: true,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        beforeClose: async (action, instance, done) => {
            if (action !== "confirm") {
                done();
                return;
            }
            if (deletingArticleID.value !== "") {
                return;
            }

            deletingArticleID.value = row.id;
            instance.confirmButtonLoading = true;
            instance.confirmButtonText = "正在清理 CDN 缓存...";
            let deleted = false;
            try {
                deleted = await handleDelete(row);
            } finally {
                instance.confirmButtonLoading = false;
                instance.confirmButtonText = "确定";
                deletingArticleID.value = "";
            }
            if (deleted) {
                done();
            }
        },
    }).catch((action) => {
        if (action === "cancel") {
            return;
        }
    });
};

async function handleDelete(row: Article): Promise<boolean> {
    try {
        const response = await _axios.delete(`/admin/auth/article/delete`, {
            data: { id: row.id },
        });
        const { code, message } = response.data;
        if (code === 2000 && message === "") {
            ElNotification({
                title: "Success",
                message: "删除文章成功",
                type: "success",
            });
            emit('refresh');
            return true;
        } else {
            ElNotification({
                title: "Failed",
                message: message || "删除文章失败",
                type: "error",
            });
            return false;
        }
    } catch (error: any) {
        ElNotification({
            title: "Error",
            message: error?.message ?? String(error),
            type: "error",
        });
        return false;
    }
}
</script>

<style scoped>
.el-table th,
.el-table td {
    white-space: nowrap;
}

.monospace-column {
    font-family: monospace;
}

.action-buttons {
    display: flex;
    justify-content: flex-start;
}

@media (max-width: 768px) {
    .el-table-column {
        min-width: 100px;
    }

    .action-buttons {
        flex-wrap: nowrap;
    }
}

@media (min-width: 769px) {
    .el-table-column {
        min-width: 150px;
    }

    .action-buttons {
        flex-wrap: nowrap;
    }
}
</style>
