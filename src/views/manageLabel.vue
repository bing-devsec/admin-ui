<template>
    <!-- blogLabelNumber 是一个变量，表示所有标签的数量。 -->
    <!-- type="card"：设置标签页类型，这里的 “card” 代表标签页为卡片样式。 -->
    <el-tabs v-model="blogLabelNumber" type="card" class="demo-tabs" @tab-click="getArticleCount">
        <!-- <el-tab-pane>：这是一个标签页面板组件， -->
        <!-- v-for="item in blogLabels"：用于循环创建多个标签页面板。blogLabels是一个数组，表示所有的标签。item是数组中的每一个元素。 -->
        <!-- :key="item.id"：用于追踪每个节点的身份，从而重用和重新排序现有元素。item.id 是每个元素的唯一标识。(就是数组的下标加1) -->
        <!-- :label="item.title"：设置标签页标题，item.title 是每个元素的标题。 -->
        <!-- :name="item.id"：设置标签页名称，item.name 是每个元素的名称。 -->
        <div class="tabs-container">
            <el-tab-pane v-for="item in BlogLabels" :key="item.label_id" :label="item.label_name" :name="item.label_id"
                class="el-tabs">
                <blogLabel :data="item.articles" :currentPage="currentPage" :labelName="item.label_name">
                </blogLabel>
            </el-tab-pane>
        </div>


        <pagination :total="total" :currentPage="currentPage" :pageSize="pageSize"
            @handleCurrentChange="handleCurrentChange">
        </pagination>
    </el-tabs>
</template>

<script lang="ts" setup>

import { ref, onMounted } from 'vue'
import blogLabel from '../components/blogLabel.vue'
import pagination from '../components/pagination.vue'
import { useRouter } from "vue-router";

const router = useRouter();

//当前标签下的博客文章的数量
//然后每次切换标签的时候，更新这个变量的值。然后把这个变量传给Pagination组件。
let currentPage = ref(1)    // 初始页码为1
const pageSize = 9          // 每页的文章数量，每页最多9篇文章
let total = ref(0)          // 文章总数



let handleCurrentChange = (newPage: number) => {
    currentPage.value = newPage;
};

let labelArry = ref<number[]>([])
function getArticleCount(tab: any) {
    total.value = labelArry.value[tab.index]
}

//标签数组
interface LabelArray {
    label_id: string;
    label_name: string; //标签名
}
let Labels = ref<LabelArray[]>([]);

const blogLabelNumber = ref(1)

let BlogLabels = ref<{ label_id: string; label_name: string; articles: any[] }[]>([]);
const accessToken = localStorage.getItem("accessToken");

// 输入是标签名，返回是一个数组，该数组的每一个元素就是一条属于该标签的文章信息、标签名和标签ID
const getArticlesByLabel = async (label_id: string) => {
    try {
        let response = await window.$axios.get(`/admin/articleArray?label_id=${label_id}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data.articleArray;
    } catch (error: any) {
        if (error.response && error.response.status === 401) {
            // 访问令牌过期，尝试使用刷新令牌获取新的访问令牌
            let refreshToken = localStorage.getItem("refreshToken");

            if (refreshToken) {
                try {
                    let response = await window.$axios.post("/admin/refresh-token", null, {
                        headers: {
                            'Authorization': `Bearer ${refreshToken}`
                        }
                    });
                    // 保存新的访问令牌和刷新令牌
                    const accessToken = response.data.access_token;
                    refreshToken = response.data.refresh_token;
                    localStorage.setItem("accessToken", accessToken);
                    localStorage.setItem("refreshToken", refreshToken);
                    location.reload();
                } catch (error: any) {
                    // 刷新令牌也过期或无效，跳转到短信登录页面
                    router.push("/short-message-login");
                }
            } else {
                // 没有刷新令牌，跳转到短信登录页面
                router.push("/short-message-login");
            }
        } else if (error.response && error.response.status === 403) {
            router.push("/short-message-login");
        } else {
            alert(error);
        }
    }
};

onMounted(async () => {
    try {
        // 获取一个数组，该数组的内容是所有的标签
        const response1 = await window.$axios.get('/admin/getAllLabel', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        Labels.value = response1.data.labelArray;

        // 初始化 BlogLabels
        BlogLabels.value = [];

        // 遍历标签数组Labels，每一个标签元素用label表示
        let i: number;
        for (i = 0; i < Labels.value.length; i++) {
            let label = Labels.value[i]
            let articleArray = await getArticlesByLabel(label.label_id);
            // 将标签及其相关的文章添加到BlogLabels
            BlogLabels.value.push({ label_id: label.label_id, label_name: label.label_name, articles: articleArray });
            labelArry.value[i] = BlogLabels.value[i].articles.length
        }

    } catch (error: any) {
        if (error.response && error.response.status === 401) {
            // 访问令牌过期，尝试使用刷新令牌获取新的访问令牌
            let refreshToken = localStorage.getItem("refreshToken");

            if (refreshToken) {
                try {
                    let response = await window.$axios.post("/admin/refresh-token", null, {
                        headers: {
                            'Authorization': `Bearer ${refreshToken}`
                        }
                    });
                    // 保存新的访问令牌和刷新令牌
                    const accessToken = response.data.access_token;
                    refreshToken = response.data.refresh_token;
                    localStorage.setItem("accessToken", accessToken);
                    localStorage.setItem("refreshToken", refreshToken);
                    location.reload();
                } catch (error: any) {
                    // 刷新令牌也过期或无效，跳转到短信登录页面
                    router.push("/short-message-login");
                }
            } else {
                // 没有刷新令牌，跳转到短信登录页面
                router.push("/short-message-login");
            }
        } else if (error.response && error.response.status === 403) {
            router.push("/short-message-login");
        } else {
            alert(error);
        }
    }
});

</script>

<style>
.tabs-container {
    max-height: 100%;
    overflow-y: auto;
    margin-bottom: 45px;
}

.demo-tabs>.el-tabs__content {
    color: #6b778c;
    font-size: 32px;
    font-weight: 400;
}

.el-tabs__item {
    padding: 24px 20px !important;
}

.el-tabs--card>.el-tabs__header {
    padding: 0;
    position: relative;
    margin: 0;
    height: 48px !important;
}
</style>
