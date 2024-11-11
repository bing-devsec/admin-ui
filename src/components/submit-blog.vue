<template>
    <br />
    <!-- ref="form"：可以用来在组件之间传递数据。 -->
    <!-- :model="blog"：这个绑定的 model 对象，其中的字段值将会与表单项进行双向绑定。 -->
    <!-- label-width="auto"：设置表单域标签的宽度自动。 -->
    <!-- :label-position="labelPosition"：定义标签的位置。 -->
    <!-- :size="size"：用于改变该组件的默认尺寸。 -->
    <el-form ref="form" :model="blog" label-width="auto" :label-position="labelPosition" :size="size" style="margin-left: 20px">
        <!-- label：设置表单项的标签文本。 -->
        <el-form-item label="标题">
            <el-input style="width: 80%" v-model="blog.title" />
        </el-form-item>

        <el-form-item label="标签">
            <el-input style="width: 80%" v-model="blog.label" />
        </el-form-item>

        <el-form-item label="摘要">
            <el-input style="width: 80%" v-model="blog.abstract" type="textarea" :autosize="{ minRows: 2, maxRows: 12 }"
                :show-word-limit="true" :maxlength="200" />
        </el-form-item>

        <el-form-item>
            <el-button type="primary" @click="onSubmit" style="margin-left: 70px">提交</el-button>
        </el-form-item>
    </el-form>
</template>

<script lang="ts" setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const size = ref("default");
const labelPosition = ref("right");
const blog = reactive({
    title: "",
    label: "",
    abstract: "",
});

const props = defineProps<{ text: string, blogId: string, title: string, label: string, abstract: string }>();

blog.title = props.title
blog.label = props.label
blog.abstract = props.abstract

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
    const data = {
        blog: blog,
        text: props.text,
        blog_id: props.blogId,
    };
    //根据是否有id值来判断是增加文章还是修改文章
    if (data.blog_id == "") {
        //增加文章
        const accessToken = localStorage.getItem("accessToken");
        window.$axios
            .post("/admin/writeBlog", data, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })
            .then(function (response: { data: { code: any; msg: any; }; }) {
                let code = response.data.code;
                if (code == 20000) {
                    alert(response.data.msg);
                    router.push('/home/manageDocument');
                } else {
                    alert(response.data.msg);
                }
            })
            .catch(handleAxiosError);
    } else {
        //修改文章
        const accessToken = localStorage.getItem("accessToken");
        window.$axios
            .post("/admin/modifyBlog", data, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })
            .then(function (response: { data: { code: string; msg: any; }; }) {
                if (response.data.msg == "更新成功") {
                    alert(response.data.msg);
                    router.push('/home/manageDocument');
                } else {
                    alert(response.data.msg);
                }
            })
            .catch(handleAxiosError);
    }
}
</script>
