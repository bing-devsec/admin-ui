<template>
    <el-tabs v-model="activeTag" class="demo-tabs" @tab-change="handleTabClick">
        <div class="tabs-container">
            <div class="button-container">
                <el-button type="primary" @click="openDialog" :disabled="!selectedID.length">修改标签</el-button>
            </div>
            <el-tab-pane v-if="isReady" v-for="tag in tags" :key="tag" :label="tag" :name="tag" class="el-tabs">
                <tagArticleList :data="articleList" :currentPage="currentPage" :pageSize="pageSize"
                    @selection-change="handleSelectionChange"></tagArticleList>
            </el-tab-pane>
        </div>

        <pagination :total="total" :currentPage="currentPage" :pageSize="pageSize"
            @handleCurrentChange="handleCurrentChange"></pagination>

        <!-- 弹窗组件 -->
        <updateTag v-if="dialogVisible" :visible="dialogVisible" @update:visible="dialogVisible = $event"
            :selectedID="selectedID" :currentTag="activeTag" @update:refresh="handleTagRefresh"></updateTag>
    </el-tabs>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElNotification } from "element-plus";
import updateTag from '../components/update-tag.vue';
import tagArticleList from '../components/tag-article-list.vue'
import pagination from '../components/pagination.vue'
import _axios from '../utils/axios'

const isReady = ref(false);
const activeTag = ref('');
const tags = ref<string[]>([]);
const articleList = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = 9;
const total = ref(0);
const dialogVisible = ref(false)

const selectedID = ref<string[]>([]);
const handleSelectionChange = (selection: any[]) => {
    selectedID.value = selection.map(item => item.id);
};

onMounted(async () => {
    await fetchTagList()
    nextTick(() => {
        isReady.value = true
    })
})

const fetchTagList = async () => {
    try {
        const response = await _axios.get('/admin/tag/list');
        const { code, message, data } = response.data;
        if (code === 2000 && message === "") {
            tags.value = data;
            if (tags.value.length > 0) {
                activeTag.value = tags.value[0];
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
        const response = await _axios.get('/admin/tag/article-list', {
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
    await fetchArticleList()
}

const handleTabClick = async () => {
    currentPage.value = 1
    await fetchArticleList()
}

const openDialog = () => {
    dialogVisible.value = true
}

const handleTagRefresh = async () => {
    await fetchTagList();
    await fetchArticleList();
};
</script>

<style>
.el-tabs__nav-scroll {
    --el-tabs-header-height: 50px;
}

.tabs-container {
    display: flex;
    flex-direction: column;
}

.button-container {
    margin-bottom: 15px;
    margin-left: 15px;

}

.el-tabs__item {
    padding: 24px 20px !important;
}
</style>