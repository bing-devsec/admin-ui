<template>
    <addTools></addTools>
    <div class="tabs-container">
        <!-- :data="toolArray"是将toolArray数组作为表格的数据源。 -->
        <el-table :data="currentToolArray" style="width: 100%">

            <!-- label：列头显示的名称。例如label="序号"表示列头显示为"序号"。 -->
            <!-- width：该列的宽度。例如width="180"表示该列的宽度为120像素。 -->
            <el-table-column label="序号" width="120">

                <!-- #default定义了一个名为"default"的插槽，"default"是默认插槽的特殊名字。 -->
                <!-- "scope"是一个变量，它接收了el-table-column为该插槽传递的数据。
                在 Element UI 中，el-table-column传递给插槽的数据包含了当前行的数据、当前列的数据、当前行索引，
                可以通过scope.row、scope.column、scope.$index分别访问。 -->
                <template #default="scope">
                    <div style="display: flex; align-items: center">
                        <!-- 打印当前行的数据(输出所有的索引加1) -->
                        <span>{{ (currentPage - 1) * pageSize + scope.$index + 1 }}</span>
                    </div>
                </template>
            </el-table-column>

            <el-table-column label="描述" width="280">
                <template #default="scope">
                    <div style="display: flex; align-items: center">
                        <span>{{ scope.row.describe }}</span>
                    </div>
                </template>
            </el-table-column>

            <el-table-column label="URL" width="420">
                <template #default="scope">
                    <div style="display: flex; align-items: center">
                        <span>{{ scope.row.url }}</span>
                    </div>
                </template>
            </el-table-column>

            <el-table-column label="操作"  min-width="160">
                <template #default="scope">
                    <div style="display: flex; justify-content: flex-start;">
                        <el-button size="default"
                            @click="handleEdit((currentPage - 1) * pageSize + scope.$index, scope.row)">编辑</el-button>
                        <el-button size="default" type="danger"
                            @click="open((currentPage - 1) * pageSize + scope.$index, scope.row)">删除</el-button>
                    </div>
                </template>
            </el-table-column>

        </el-table>
    </div>
    <el-drawer v-model="drawer" title="title" :with-header="false">
        <!-- 这里一定要做双向数据绑定 -->
        <updateTools v-model:describe="describe" v-model:url="url" :tools_id="tools_id"></updateTools>
    </el-drawer>
    <Pagination :total="total" :currentPage="currentPage" :pageSize="pageSize"
        @handleCurrentChange="handleCurrentChange">
    </Pagination>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessageBox } from 'element-plus'
import type { Action } from 'element-plus'
import addTools from '../components/addTools.vue'
import updateTools from '../components/updateTools.vue';
import Pagination from '../components/Pagination.vue'
import { useRouter } from "vue-router";

const router = useRouter();

let currentPage = ref(1)    // 初始页码为1
const pageSize = 9          // 每页的文章数量，每页最多9篇文章
let total = ref(0)          // 工具总数

let describe = ref('');
let url = ref('');
let tools_id = ref('');

const toolArray = ref([]);  // 用于保存后端返回的工具数组

let handleCurrentChange = (newPage: number) => {
    currentPage.value = newPage;
};

const drawer = ref(false)

interface Tools {
    tools_id: string
    describe: string
    url: string
}
const accessToken = localStorage.getItem("accessToken");
onMounted(async () => {
    try {
        const response = await window.$axios.get('/admin/getTools', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        toolArray.value = response.data.toolsArray;
        total.value = toolArray.value.length;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            // 访问令牌过期，尝试使用刷新令牌获取新的访问令牌
            let refreshToken = localStorage.getItem("refreshToken");

            if (refreshToken) {
                try {
                    const response = await window.$axios.post("/admin/refresh-token", null, {
                        headers: {
                            'Authorization': `Bearer ${refreshToken}`
                        }
                    });
                    // 保存新的访问令牌和刷新令牌
                    const accessToken = response.data.access_token;
                    refreshToken = response.data.refresh_token;
                    localStorage.setItem("accessToken", accessToken);
                    localStorage.setItem("refreshToken", refreshToken);
                    // 重新发起请求
                    window.$axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                    const toolResponse = await window.$axios.get('/admin/getTools');
                    toolArray.value = toolResponse.data.toolsArray;
                    total.value = toolArray.value.length;
                } catch (refreshError) {
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

let currentToolArray = computed(() => {
    if (toolArray.value) {
        const start = (currentPage.value - 1) * pageSize;
        const end = start + pageSize;
        return toolArray.value.slice(start, end);
    } else {
        return [];
    }
});

// 更新操作
const handleEdit = async (index: number, row: Tools) => {
    //做数据双向绑定传递数据
    describe.value = row.describe
    url.value = row.url
    tools_id.value = row.tools_id

    //弹出抽屉
    drawer.value = true;
}

const open = (index: number, row: Tools) => {
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

//点击删除按钮的业务逻辑
const handleDelete = async (index: number, row: Tools) => {
    window.$axios
        .delete(`/admin/deleteTools?tools_id=${row.tools_id}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })
        .then(function (response: { data: { msg: string; }; }) {
            //通过后端返回的状态码进行判断用户是否可以登录
            if (response.data.msg == "删除成功") {
                alert(response.data.msg);
                toolArray.value.splice(index, 1);
                location.reload();
            } else {
                alert("删除失败");
            }
        })
        .catch((error: any) => handleAxiosError(error, handleDelete, [index, row]));
};


function handleAxiosError(error: { response: { status: number; }; toString: () => string; }, retryFunction: (index: number, row: Tools) => Promise<void>, retryArgs: (number | Tools | Action)[]) {
    if (error.response && error.response.status === 401) {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
            window.$axios
                .post("/admin/refresh-token", null, {
                    headers: {
                        'Authorization': `Bearer ${refreshToken}`
                    }
                })
                .then(function (response: { data: { access_token: any; refresh_token: any; }; }) {
                    const accessToken = response.data.access_token;
                    const newRefreshToken = response.data.refresh_token;
                    localStorage.setItem("accessToken", accessToken);
                    localStorage.setItem("refreshToken", newRefreshToken);
                    location.reload();
                })
                .catch(function () {
                    router.push("/short-message-login");
                });
        } else {
            router.push("/short-message-login");
        }
    } else if (error.response && error.response.status === 403) {
        router.push("/short-message-login");
    } else {
        alert("操作失败: " + error.toString());
    }
}
</script>

<style scoped>
.tabs-container {
    max-height: 100%;
    overflow-y: auto;
    margin-bottom: 45px;
}
</style>