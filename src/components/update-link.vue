<template>
    <div class="link-form-wrapper">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :size="size" class="link-form">
            <el-form-item label="名称" prop="name" required>
                <el-input v-model="form.name" placeholder="请输入友链名称（如：某人的博客）" maxlength="50" show-word-limit />
            </el-form-item>

            <el-form-item label="URL" prop="url" required>
                <el-input v-model="form.url" placeholder="请输入友链地址（如：https://example.com）">
                </el-input>
                <div class="form-hint">建议填写完整 URL（包含 https:// 或 http://）</div>
            </el-form-item>

            <div class="form-footer">
                <el-button @click="onCancel">取消</el-button>
                <el-button type="primary" :loading="submitting" @click="onSubmit">
                    {{ isEdit ? '保存修改' : '添加' }}
                </el-button>
            </div>
        </el-form>
    </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed, watch } from 'vue';
import { ElNotification, type FormInstance, type FormRules } from 'element-plus';
import _axios from '../utils/axios';

const size = ref<'default' | 'small' | 'large'>('default');
const formRef = ref<FormInstance>();
const submitting = ref(false);

const props = defineProps<{
    id?: string;
    name?: string;
    url?: string;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'refresh'): void;
}>();

const isEdit = computed(() => !!props.id);

const form = reactive({
    name: props.name ?? '',
    url: props.url ?? '',
});

watch(
    () => [props.id, props.name, props.url],
    () => {
        form.name = props.name ?? '';
        form.url = props.url ?? '';
        formRef.value?.clearValidate();
    },
);

const rules: FormRules = {
    name: [
        { required: true, message: '请输入友链名称', trigger: 'blur' },
        { max: 50, message: '名称不超过 50 个字符', trigger: 'blur' },
    ],
    url: [
        { required: true, message: '请输入 URL', trigger: 'blur' },
        {
            validator: (_rule, value, callback) => {
                const v = (value ?? '').trim();
                if (!v) return callback();
                try {
                    const u = new URL(v);
                    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
                        return callback(new Error('URL 必须以 http:// 或 https:// 开头'));
                    }
                    callback();
                } catch {
                    callback(new Error('URL 格式不正确'));
                }
            },
            trigger: 'blur',
        },
    ],
};

function onCancel() {
    emit('close');
}

async function onSubmit() {
    if (!formRef.value) return;
    try {
        await formRef.value.validate();
    } catch {
        return;
    }

    submitting.value = true;
    const data = {
        id: props.id ?? '',
        name: form.name.trim(),
        url: form.url.trim(),
    };

    const request = isEdit.value
        ? _axios.put('/admin/auth/link/update', data)
        : _axios.post('/admin/auth/link/add', data);

    const successMsg = isEdit.value ? '修改友链成功' : '添加友链成功';
    const failMsg = isEdit.value ? '修改友链失败' : '添加友链失败';

    request
        .then((response) => {
            const { code, message } = response.data;
            if (code === 2000 && message === '') {
                ElNotification({ title: 'Success', message: successMsg, type: 'success' });
                emit('refresh');
                emit('close');
            } else {
                ElNotification({ title: 'Failed', message: failMsg, type: 'error' });
            }
        })
        .catch((error: any) => {
            ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
        })
        .finally(() => {
            submitting.value = false;
        });
}
</script>

<style scoped>
.link-form-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.link-form {
    flex: 1;
    overflow-y: auto;
}

.form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
}

.form-hint {
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
    margin-top: 4px;
}
</style>
