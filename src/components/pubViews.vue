<template>
    <!-- :data="data"是将data数组作为表格的数据源。 -->
    <el-table :data="currentPageData" style="width: 100%">
        <!-- label：列头显示的名称。例如label="Date"表示列头显示为"Date"。 -->
        <!-- width：该列的宽度。例如width="180"表示该列的宽度为180像素。 -->
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

        <el-table-column label="标题" width="320">
            <template #default="scope">
                <div style="display: flex; align-items: center">
                    <span>{{ scope.row.title }}</span>
                </div>
            </template>
        </el-table-column>

        <el-table-column label="专栏" width="240">
            <template #default="scope">
                <div style="display: flex; align-items: center">
                    <span>{{ scope.row.label }}</span>
                </div>
            </template>
        </el-table-column>

        <el-table-column label="浏览量" width="160">
            <template #default="scope">
                <div style="display: flex; align-items: center">
                    <span>{{ scope.row.views }}</span>
                </div>
            </template>
        </el-table-column>

        <el-table-column label="发布时间" width="260">
            <template #default="scope">
                <div style="display: flex; align-items: center">
                    <span>{{ scope.row.create_time }}</span>
                </div>
            </template>
        </el-table-column>

        <el-table-column label="操作" min-width="160">
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
</template>

<script lang="ts" setup>
import { toRefs, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessageBox } from "element-plus";
import type { Action } from "element-plus";
import emitter from "../utils/event-bus.js";
const router = useRouter();

interface Blog {
    blog_id: string;
    title: string;
    label: string;
    views: number;
    create_time: string;
}

// 接收父组件传递的数据
const props = defineProps<{ data: Blog[]; currentPage: number }>();

// 将props对象转换为响应式的对象
const { data } = toRefs(props);
let { currentPage } = toRefs(props);
const pageSize = 9;

//分页模块
const currentPageData = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    const end = start + pageSize;
    return data.value.slice(start, end);
});

//编辑按钮
const textData = ref(""); // 用于保存后端返回的文本信息
const describe =ref("");

// 封装获取博客详情的函数
async function fetchBlogDetails(blog_id: string) {
  const accessToken = localStorage.getItem("accessToken");
  try {
    const response = await window.$axios.get(`/admin/getModifyBlog?blog_id=${blog_id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response;
  } catch (error: any) {
    throw error;
  }
}

// 处理编辑逻辑
const handleEdit = async (_index: number, row: Blog) => {
  try {
    const response = await fetchBlogDetails(row.blog_id);
    textData.value = response.data.blog;
    describe.value = response.data.describe;

    // 路由跳转
    router.push("/home/writeDocument").then(() => {
      emitter.emit("modifyBlog", {
        id: row.blog_id,
        textData: textData.value,
        describe: describe.value,
        title: row.title,
        label: row.label,
      });
    });
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      // 尝试刷新令牌并重试
      await refreshTokenAndRetry(row);
    } else {
      // 处理其他错误
      alert(error);
    }
  }
};
// 刷新令牌并重试失败的请求
async function refreshTokenAndRetry(row: Blog) {
  let refreshToken = localStorage.getItem("refreshToken");
  if (refreshToken) {
    try {
      const response = await window.$axios.post("/admin/refresh-token", null, {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });
      // 更新本地存储的令牌
      localStorage.setItem("accessToken", response.data.access_token);
      localStorage.setItem("refreshToken", response.data.refresh_token);

      // 用新令牌重试失败的请求
      await handleEdit(-1, row);
    } catch (error: any) {
      // 刷新令牌失败，跳转到登录页面
      router.push("/short-message-login");
    }
  } else {
    // 没有刷新令牌，跳转到登录页面
    router.push("/short-message-login");
  }
}

const open = (index: number, row: Blog) => {
    ElMessageBox.alert("你确定删除这篇文章吗", "删除文章", {
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

async function handleDelete(index: number, row: Blog) {
    try {
        await sendRequestWithAutoRefreshToken({
            method: 'delete',
            url: `/admin/deleteBlog?blog_id=${row.blog_id}`,
        });
        data.value.splice(index, 1);
        alert('删除成功');
    } catch (error) {
        alert('删除失败');
    }
}

// 封装的请求方法，自动处理令牌刷新逻辑
async function sendRequestWithAutoRefreshToken(requestConfig: { method?: string; url: any; headers?: any; }) {
    try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await window.$axios(requestConfig.url, {
            ...requestConfig,
            headers: {
                ...requestConfig.headers,
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            // 尝试刷新令牌
            const refreshToken = localStorage.getItem("refreshToken");
            if (refreshToken) {
                try {
                    const response = await window.$axios.post("/admin/refresh-token", null, {
                        headers: {
                            'Authorization': `Bearer ${refreshToken}`
                        }
                    });
                    // 保存新的令牌
                    localStorage.setItem("accessToken", response.data.access_token);
                    localStorage.setItem("refreshToken", response.data.refresh_token);

                    return sendRequestWithAutoRefreshToken(requestConfig);
                } catch (refreshError) {
                    handleTokenRefreshFailure();
                }
            } else {
                // 没有刷新令牌
                handleTokenRefreshFailure();
            }
        } else {
            throw error;
        }
    }
}

// 刷新令牌失败或没有刷新令牌，跳转到登录页面
function handleTokenRefreshFailure() {
    router.push("/short-message-login");
}
</script>
