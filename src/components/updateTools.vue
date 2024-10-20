<template>
    <br />
    <el-form ref="form" :model="tools" label-width=auto :label-position="labelPosition" :size="size"
        style="margin-left: 20px;">

        <!-- label：设置表单项的标签文本。 -->
        <el-form-item label="描述">
            <el-input style="width: 80%;" v-model="localDescribe" />
        </el-form-item>

        <el-form-item label="URL">
            <el-input style="width: 80%;" v-model="localUrl" />
        </el-form-item>

        <el-form-item>
            <el-button type="primary" @click="onSubmit" style="margin-left: 70px;">提交</el-button>
        </el-form-item>

    </el-form>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRouter } from "vue-router";
const router = useRouter();

const size = ref('default')
const labelPosition = ref('right')

import { computed } from 'vue';

const props = defineProps({
    describe: String,
    url: String,
    tools_id: String
});

const emit = defineEmits(['update:describe', 'update:url']);

const localDescribe = computed({
    get: () => props.describe,
    set: (value) => emit('update:describe', value)
});

const localUrl = computed({
    get: () => props.url,
    set: (value) => emit('update:url', value)
});

let tools = reactive({
    describe: '',
    url: '',
})

function handleAxiosError(error: { response: { status: number; data: { msg: any; }; }; }) {
    if (error.response && error.response.status === 401) {
        // 访问令牌过期，尝试使用刷新令牌获取新的访问令牌
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
            window.$axios
                .post("/admin/refresh-token", null, {
                    headers: {
                        'Authorization': `Bearer ${refreshToken}`
                    }
                })
                .then(function (response: { data: { access_token: any; refresh_token: any; }; }) {
                    // 保存新的访问令牌和刷新令牌
                    const accessToken = response.data.access_token;
                    const newRefreshToken = response.data.refresh_token;
                    localStorage.setItem("accessToken", accessToken);
                    localStorage.setItem("refreshToken", newRefreshToken);
                    location.reload();
                })
                .catch(function () {
                    // 刷新令牌也过期或无效，跳转到短信登录页面
                    router.push("/short-message-login");
                });
        } else {
            // 没有刷新令牌，跳转到短信登录页面
            router.push("/short-message-login");
        }
    } else if (error.response && error.response.status === 403) {
        // 其他授权错误，跳转到短信登录页面
        router.push("/short-message-login");
    } else {
        // 对于其他错误直接弹窗提示
        alert(error.response.data.msg || "An error occurred, please try again later");
    }
}

function onSubmit() {
    //包装要发送的信息
    let data = {
        describe: localDescribe.value,
        url: localUrl.value,
        tools_id: props.tools_id,
    }
    const accessToken = localStorage.getItem("accessToken");
    window.$axios.put('/admin/modifyTools', data, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
        .then(function (response: { data: { msg: string; }; }) {
            if (response.data.msg == "更新成功") {
                alert("修改成功");
                location.reload();
            } else {
                alert("修改失败，请稍后再试")
            }
        })
        .catch(handleAxiosError);
}
</script>