<template>
    <br />
    <el-form ref="form" :model="link" label-width=auto :label-position="labelPosition" :size="size"
        style="margin-left: 20px;">
        <el-form-item label="名称">
            <el-input style="width: 85%;" v-model="localName" />
        </el-form-item>

        <el-form-item label="URL">
            <el-input style="width: 85%;" v-model="localUrl" />
        </el-form-item>

        <el-form-item>
            <el-button type="primary" @click="onSubmit" style="margin-left: 70px;">提交</el-button>
        </el-form-item>

    </el-form>
</template>

<script lang="ts" setup>
import { reactive, ref,computed } from 'vue';
import { ElNotification } from 'element-plus';
import _axios from '../utils/axios';

const size = ref('default')
const labelPosition = ref('right')
const emit = defineEmits(['update:name', 'update:url', 'update:refresh', 'close-drawer']);
const props = defineProps({ name: String, url: String, id: String });

const localName = computed({
    get: () => props.name,
    set: (value) => emit('update:name', value)
});

const localUrl = computed({
    get: () => props.url,
    set: (value) => emit('update:url', value)
});

let link = reactive({
    name: '',
    url: '',
})

const onSubmit = async () => {
    const data = {
        name: localName.value,
        url: localUrl.value,
        id: props.id,
    };

    try {
        const response = await _axios.put('/admin/link/update', data);
        const { code, message } = response.data;

        if (code === 2000 && message === "") {
            ElNotification({
                title: "Success",
                message: "修改友链成功",
                type: "success",
            });
            emit('update:refresh');
            emit('close-drawer');
        } else {
            ElNotification({
                title: "Failed",
                message: "修改友链失败",
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