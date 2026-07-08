<template>
    <el-tabs v-model="activeTag" class="demo-tabs" @tab-change="handleTabClick">
        <div class="tabs-container">
            <div class="button-container">
                <el-button type="primary" @click="openDialog" :disabled="!selectedID.length">修改标签</el-button>
            </div>

            <!-- 表格容器 -->
            <div class="table-container">
                <el-tab-pane v-if="isReady" v-for="tag in tags" :key="tag" :label="tag" :name="tag">
                    <tagArticleList :data="articleList" :currentPage="currentPage" :pageSize="pageSize"
                        @selection-change="handleSelectionChange" @refresh="fetchArticleList"></tagArticleList>
                </el-tab-pane>
            </div>
        </div>

        <updateTag v-if="dialogVisible" :visible="dialogVisible" @update:visible="dialogVisible = $event"
            :selectedID="selectedID" :currentTag="activeTag" @update:refresh="handleTagRefresh"></updateTag>

        <pagination :total="total" :currentPage="currentPage" :pageSize="pageSize"
            @handleCurrentChange="handleCurrentChange"></pagination>
    </el-tabs>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { ElNotification } from "element-plus";
import updateTag from '../components/update-tag.vue';
import tagArticleList from '../components/tag-article-list.vue'
import pagination from '../components/pagination.vue'
import _axios from '../utils/axios'

const route = useRoute();
const router = useRouter();

const isReady = ref(false);
const activeTag = ref('');
const tags = ref<string[]>([]);
const articleList = ref<any[]>([]);
const currentPage = ref(parsePositivePage(route.query.page));
const pageSize = 10;
const total = ref(0);
const dialogVisible = ref(false)

const selectedID = ref<string[]>([]);
const handleSelectionChange = (selection: any[]) => {
    selectedID.value = selection.map(item => item.id);
};

// firstQueryValue 读取 query 中的第一个字符串值。
function firstQueryValue(value: unknown): string {
    if (Array.isArray(value)) {
        return typeof value[0] === 'string' ? value[0] : '';
    }
    return typeof value === 'string' ? value : '';
}

// parsePositivePage 把 URL query 转为正整数页码。
function parsePositivePage(value: unknown): number {
    const page = Number.parseInt(firstQueryValue(value), 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
}

// syncRouteState 把当前专栏管理状态写入 URL。
function syncRouteState() {
    router.replace({
        path: route.path,
        query: {
            tag: activeTag.value,
            page: String(currentPage.value),
        },
    }).catch(() => { });
}

onMounted(async () => {
    await fetchTagList(firstQueryValue(route.query.tag))
    nextTick(() => {
        isReady.value = true
    })
})

const fetchTagList = async (currentActiveTag: string = '') => {
    try {
        const response = await _axios.get('/admin/auth/tag/list');
        const { code, message, data } = response.data;
        if (code === 2000 && message === "") {
            tags.value = (data?.rows ?? []).map((row: { name: string; articleNum: number }) => row.name);
            if (tags.value.length > 0) {
                if (currentActiveTag && tags.value.includes(currentActiveTag)) {
                    activeTag.value = currentActiveTag;
                } else {
                    activeTag.value = tags.value[0];
                    currentPage.value = 1;
                }
                syncRouteState();
                await fetchArticleList();
            }
        } else {
            ElNotification({
                title: "Failed",
                message: "获取标签列表失败",
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

const fetchArticleList = async () => {
    if (!activeTag.value) return;
    try {
        const response = await _axios.get('/admin/auth/tag/article-list', {
            params: {
                tagName: activeTag.value,
                page: currentPage.value,
                pageSize: pageSize,
            },
        });
        const { code, message, data } = response.data;
        if (code === 2000 && message === "") {
            articleList.value = data.rows;
            total.value = data.total;
        } else {
            ElNotification({
                title: "Failed",
                message: "获取 " + activeTag.value + " 标签的文章列表失败",
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

const handleCurrentChange = async (newPage: number) => {
    currentPage.value = newPage
    syncRouteState();
    await fetchArticleList()
}

const handleTabClick = async () => {
    currentPage.value = 1
    syncRouteState();
    await fetchArticleList()
}

const openDialog = () => {
    dialogVisible.value = true
}

const handleTagRefresh = async () => {
    await fetchTagList(activeTag.value);
};
</script>

<style scoped>
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
    margin-bottom: 15px;
    margin-left: 15px;
}

.el-tabs {
    --el-tabs-header-height: 50px;
}

:deep(.el-tabs__nav) {
    margin: 0 15px;
}

.el-tabs__item {
    padding: 0 24px;
}
</style>
