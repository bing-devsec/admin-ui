<template>
    <br />
    <!-- ref="form"：可以用来在组件之间传递数据。 -->
    <!-- :model="aboutMe"：这个绑定的 model 对象，其中的字段值将会与表单项进行双向绑定。 -->
    <!-- label-width="auto"：设置表单域标签的宽度自动。 -->
    <!-- :label-position="labelPosition"：定义标签的位置。 -->
    <!-- :size="size"：用于改变该组件的默认尺寸。 -->
    <el-form ref="form" :model="aboutMe" label-width=auto :label-position="labelPosition" :size="size"
        style="margin-left: 20px;">

        <!-- label：设置表单项的标签文本。 -->
        <el-form-item label="昵称">

            <!-- v-model="aboutMe.name"：使用Vue的双向数据绑定，将输入框的值与 aboutMe.name 绑定。 -->
            <el-input style="width: 20%;" v-model="aboutMe.name" />
        </el-form-item>

        <el-form-item label="性别">
            <el-radio-group v-model="aboutMe.sex">
                <el-radio label="男" />
                <el-radio label="女" />
            </el-radio-group>
        </el-form-item>

        <el-form-item label="邮箱">
            <el-input style="width: 20%;" v-model="aboutMe.email" />
        </el-form-item>

        <el-form-item label="职业">
            <el-input style="width: 20%;" v-model="aboutMe.profession" />
        </el-form-item>

        <el-form-item label="定位">
            <el-input style="width: 20%;" v-model="aboutMe.position" clearable />
        </el-form-item>

        <el-form-item label="编程语言">
            <el-input style="width: 30%;" v-model="aboutMe.language" />
        </el-form-item>

        <el-form-item label="域名信息">
            <el-input style="width: 60%;" v-model="aboutMe.domain" clearable />
        </el-form-item>

        <el-form-item label="博客内容">
            <el-input style="width: 60%;" v-model="aboutMe.introduction" clearable />
        </el-form-item>

        <el-form-item label="本站定位">
            <el-input style="width: 60%;" v-model="aboutMe.location" clearable />
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

const aboutMe = reactive({
    user_id: '',
    name: '冰冰同学',
    sex: '男',
    profession: '',
    position: '',
    language: '',
    domain: '',
    introduction: '',
    location: '',
    email: '',
})

function handleAxiosError(error: any) {
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
        alert(error.response.data.msg);
    }
}

async function onSubmit() {
    const user_id = localStorage.getItem('user_id') as string;

    aboutMe.user_id = user_id
    const accessToken = localStorage.getItem("accessToken");
    try {
        const response = await window.$axios.put('/admin/aboutMe', aboutMe, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (response.data.msg == "提交成功") {
            alert("提交成功");
        } else {
            alert("提交失败，请稍后再试")
        }

    } catch (error) {
        handleAxiosError(error);
    };
}
</script>

<style scoped>
.el-radio-group {
    margin-right: 12px;
}
</style>