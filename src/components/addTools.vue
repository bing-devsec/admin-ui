<template>
  <el-button size="large" type="primary" text @click="dialogFormVisible = true">
    添加工具
  </el-button>

  <el-dialog v-model="dialogFormVisible" title="工具信息">

    <el-form :model="form">
      <el-form-item label="描述" :label-width="formLabelWidth">
        <el-input v-model="form.describe" autocomplete="off" />
      </el-form-item>
      <el-form-item label="URL" :label-width="formLabelWidth">
        <el-input v-model="form.url" autocomplete="off" />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogFormVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">
          提交
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from "vue-router";

const router = useRouter();

const formLabelWidth = '140px'
const dialogFormVisible = ref(false)

const form = ref({
  url: '',
  describe: '',
})

async function submitForm() {
  const accessToken = localStorage.getItem("accessToken");
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    const response = await axiosWithRetry('/admin/addTools', {
      data: form.value,
      headers: headers,
    });

    // 关闭对话框
    dialogFormVisible.value = false;

    // 根据响应处理结果
    if (response.data.msg === "添加成功") {
      alert("添加成功");
    } else {
      alert("提交失败");
    }
  } catch (error) {
    // 这里处理未能在axiosWithRetry中处理的错误
    console.error("An error occurred:", error);
  }
}

// 封装axios请求，以便在请求失败时自动尝试刷新token并重试
async function axiosWithRetry(url: any, options: { data: any; headers: { [x: string]: string; }; }) {
  try {
    // 尝试发送请求
    return await window.$axios.post(url, options.data, {headers: options.headers});
  } catch (error) {
    // 如果请求因为token过期失败，则尝试刷新token
    if (error.response && error.response.status === 401) {
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const refreshResponse = await window.$axios.post("/admin/refresh-token", null, {
          headers: {
            'Authorization': `Bearer ${refreshToken}`
          }
        });
        // 更新localStorage中的token
        const newAccessToken = refreshResponse.data.access_token;
        localStorage.setItem("accessToken", newAccessToken);
        const newRefreshToken = refreshResponse.data.refresh_token;
        localStorage.setItem("refreshToken", newRefreshToken);
        // 更新请求头中的token并重试
        options.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return await window.$axios.post(url, options.data, {headers: options.headers});
      } catch (refreshError) {
        // 如果刷新token也失败了，那么跳转到登录页面
        router.push("/short-message-login");
        return Promise.reject(refreshError);
      }
    } else {
      // 其他错误直接抛出
      return Promise.reject(error);
    }
  }
}

</script>

<style scoped>
.el-button--text {
  margin-right: 15px;
}

.el-input {
  width: 350px;
}

.dialog-footer button:first-child {
  margin-right: 10px;
}
</style>