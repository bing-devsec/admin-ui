<template>
    <el-dialog width="35%" v-model="dialogVisible" title="修改标签" @update:modelValue="$emit('update:visible', $event)">
        <el-form>
            <el-form-item label="旧标签" :label-width="formLabelWidth">
                <el-input :value="currentTag" disabled />
            </el-form-item>
            <el-form-item label="新标签" :label-width="formLabelWidth">
                <el-input v-model="newTag" autocomplete="off" />
            </el-form-item>
        </el-form>

        <template #footer>
            <span class="dialog-footer">
                <el-button @click="closeDialog">取消</el-button>
                <el-button type="primary" @click="submitForm">
                    提交
                </el-button>
            </span>
        </template>
    </el-dialog>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { ElNotification } from 'element-plus';
import _axios from '../utils/axios';

const newTag = ref('');
const formLabelWidth = '80px';
const dialogVisible = ref(props.visible);
const emit = defineEmits(['update:visible', 'update:refresh']);
const props = defineProps<{
    visible: boolean;
    selectedID: string[];
    currentTag: string;
}>();

watch(() => props.visible, (newValue) => {
    dialogVisible.value = newValue;
});

function closeDialog() {
    emit('update:visible', false);
}

async function submitForm() {
    const data = {
        newTagName: newTag.value,
        oldTagName: props.currentTag,
        articleIDList: props.selectedID
    };

    try {
        const response = await _axios.put('/admin/auth/tag/update', data);
        const { code, message } = response.data;

        if (code === 2000 && message === "") {
            ElNotification({
                title: "Success",
                message: "标签修改成功",
                type: "success",
            });
            closeDialog();
            emit('update:refresh');
        } else {
            ElNotification({
                title: "Failed",
                message: "标签修改失败",
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
}
</script>

<style scoped>
.el-input {
    width: 90%;
}
</style>
