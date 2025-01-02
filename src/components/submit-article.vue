<template>
    <br />
    <el-form ref="form" :model="article" label-width="auto" :label-position="labelPosition" :size="size"
        style="margin-left: 20px">
        <el-form-item label="标题">
            <el-input style="width: 80%" v-model="article.title" />
        </el-form-item>

        <el-form-item label="标签">
            <el-input style="width: 80%" v-model="article.tag" />
        </el-form-item>

        <el-form-item label="摘要">
            <el-input style="width: 80%" v-model="article.describe" type="textarea"
                :autosize="{ minRows: 2, maxRows: 12 }" :show-word-limit="true" :maxlength="200" />
        </el-form-item>

        <el-form-item>
            <el-button type="primary" @click="onSubmit" style="margin-left: 70px">提交</el-button>
        </el-form-item>
    </el-form>
</template>

<script lang="ts" setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElNotification } from "element-plus";
import _axios from "../utils/axios";

const router = useRouter();
const size = ref("default");
const labelPosition = ref("right");
const article = reactive({
    title: "",
    tag: "",
    describe: "",
});

const props = defineProps<{ displayContent: string, id: string, title: string, tag: string, describe: string }>();

article.title = props.title
article.tag = props.tag
article.describe = props.describe

function onSubmit() {
    const data = {
        id: props.id,
        title: article.title,
        tag: article.tag,
        content: props.displayContent,
        describe: article.describe,
    };

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) { router.push("/login"); return; }

    if (data.id === "") {
        _axios
            .post("/admin/article/add", data)
            .then(function (response: { data: { code: number; message: string; data: any; }; }) {
                const { code, message } = response.data;
                if (code === 2000&& message === "") {
                    ElNotification({
                        title: "Success",
                        message: "添加文章成功",
                        type: "success",
                    });
                    router.push('/home/manage-article');
                } else {
                    ElNotification({
                        title: "Failed",
                        message: "添加文章失败",
                        type: "error",
                    });
                }
            })
            .catch(function (error: any) {
                ElNotification({
                    title: "Error",
                    message: error,
                    type: "error",
                });
            });
    } else {
        _axios
            .put("/admin/article/update", data)
            .then(function (response: { data: { code: number; message: string; data: any; }; }) {
                const { code, message } = response.data;
                if (code === 2000&& message === "") {
                    ElNotification({
                        title: "Success",
                        message: "修改文章成功",
                        type: "success",
                    });
                    router.push('/home/manage-article');
                } else {
                    ElNotification({
                        title: "Failed",
                        message: "修改文章失败",
                        type: "error",
                    });
                }
            })
            .catch(function (error: any) {
                ElNotification({
                    title: "Error",
                    message: error,
                    type: "error",
                });
            });
    }
}

</script>
