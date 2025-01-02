<template>
    <el-dialog width="35%" :model-value="visible" @update:model-value="$emit('update:visible', $event)" title="添加友联">
        <el-form>
            <el-form-item label="名称" :label-width="formLabelWidth">
                <el-input v-model="form.name" autocomplete="off" />
            </el-form-item>
            <el-form-item label="URL" :label-width="formLabelWidth">
                <el-input v-model="form.url" autocomplete="off" />
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
import { ref, watch, defineEmits } from 'vue';
import { ElNotification } from 'element-plus';
import _axios from '../utils/axios';

const formLabelWidth = '100px';
const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'update:refresh'): void;
}>();

const form = ref({
    name: '',
    url: ''
});

const resetForm = () => {
    form.value = {
        name: '',
        url: ''
    };
};

watch(() => props.visible, (newValue) => {
    if (!newValue) {
        resetForm();
    }
});

const closeDialog = () => {
    resetForm();
    emit('update:visible', false);
};

const submitForm = async () => {
    const data = {
        name: form.value.name,
        url: form.value.url
    };

    try {
        const response = await _axios.post('/admin/link/add', data);
        const { code, message } = response.data;

        if (code === 2000 && message === "") {
            ElNotification({
                title: "Success",
                message: "添加成功",
                type: "success",
            });
            closeDialog();
            emit('update:refresh');
        } else {
            ElNotification({
                title: "Failed",
                message: "添加失败",
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