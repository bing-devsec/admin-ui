<template>
    <br />
    <el-form ref="form" :model="aboutMe" :rules="rules" label-width="auto" :label-position="labelPosition" :size="size"
        style="margin-left: 30px;">
        <!-- 关于我信息 -->
        <el-form-item label="昵称" prop="name">
            <el-input style="width: 20%;" v-model="aboutMe.name" />
        </el-form-item>
        <el-form-item label="职业" prop="job">
            <el-input style="width: 20%;" v-model="aboutMe.job" />
        </el-form-item>
        <el-form-item label="工龄" prop="workLife">
            <el-input style="width: 20%;" v-model="aboutMe.workLife" />
        </el-form-item>
        <el-form-item label="定位" prop="address">
            <el-input style="width: 20%;" v-model="aboutMe.address" clearable />
        </el-form-item>

        <!-- 网站信息 -->
        <el-form-item label="域名信息" prop="domainInfo">
            <el-input style="width: 60%;" v-model="aboutMe.domainInfo" clearable />
        </el-form-item>
        <el-form-item label="博客内容" prop="blogContent">
            <el-input style="width: 60%;" v-model="aboutMe.blogContent" clearable />
        </el-form-item>
        <el-form-item label="本站定位" prop="websiteLocation">
            <el-input style="width: 60%;" v-model="aboutMe.websiteLocation" clearable />
        </el-form-item>
        <el-form-item label="免责声明" prop="statement">
            <el-input style="width: 60%;" v-model="aboutMe.statement" clearable />
        </el-form-item>

        <!-- 联系我信息 -->
        <el-form-item label="邮箱" prop="email">
            <el-select v-model="aboutMe.email" multiple filterable allow-create default-first-option
                style="width: 60%;">
                <el-option v-for="item in aboutMe.email" :key="item" :label="item" :value="item" />
            </el-select>
        </el-form-item>

        <el-form-item class="submit-button-wrapper">
  <el-button type="primary" @click="onSubmit" style="margin-left: 70px;">提交</el-button>
</el-form-item>
    </el-form>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { ElNotification, ElMessage } from 'element-plus';
import _axios from '../utils/axios';

const size = ref('default')
const labelPosition = ref('right')

const aboutMe = reactive({
    id: '',
    name: '冰冰同学',
    job: '',
    workLife: '',
    address: '',
    domainInfo: '',
    blogContent: '',
    websiteLocation: '',
    statement: '',
    email: [] as string[],
})

const rules = {
    email: [
        {
            type: 'email',
            message: '请输入有效的邮箱地址',
            trigger: 'blur'
        },
        {
            validator: (rule: any, value: string[], callback: any) => {
                if (value && value.length > 0) {
                    const invalidEmails = value.filter(email => !isValidEmail(email));
                    if (invalidEmails.length > 0) {
                        callback(new Error('存在无效的邮箱地址'));
                    } else {
                        callback();
                    }
                } else {
                    callback();
                }
            },
            trigger: 'change'
        }
    ]
};

// 辅助函数：验证单个邮箱地址
function isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}


function validateLength(data: any, maxLength: number): boolean {
    return JSON.stringify(data).length <= maxLength;
}

function isFormValid(): boolean {
    return Object.values(aboutMe).some((value, index) => {
        if (index === 0 || (Array.isArray(value) && value.length === 0)) return false;
        return value !== '' && value !== null && value !== undefined;
    });
}

async function onSubmit() {
    if (!isFormValid()) {
        ElMessage.error('请至少填写一个字段');
        return;
    }

    aboutMe.id = localStorage.getItem('userID') || '';

    const aboutMeInfo = {
        name: aboutMe.name,
        job: aboutMe.job,
        workLife: aboutMe.workLife,
        address: aboutMe.address,
    };

    const websiteInfo = {
        domainInfo: aboutMe.domainInfo,
        blogContent: aboutMe.blogContent,
        websiteLocation: aboutMe.websiteLocation,
        statement: aboutMe.statement,
    };

    const contactMeInfo = {
        email: aboutMe.email,
    };

    if (!validateLength(aboutMeInfo, 1000)) {
        ElMessage.error('关于我信息总长度不能超过1000个字符');
        return;
    }

    if (!validateLength(websiteInfo, 1000)) {
        ElMessage.error('网站信息总长度不能超过1000个字符');
        return;
    }

    if (!validateLength(contactMeInfo, 500)) {
        ElMessage.error('联系我信息总长度不能超过500个字符');
        return;
    }

    try {
        const response = await _axios.put('/admin/about-me', {
            id: aboutMe.id,
            ...aboutMeInfo,
            ...websiteInfo,
            ...contactMeInfo,
        });
        const { code, message } = response.data;
        if (code === 2000 && message === "") {
            ElNotification({
                title: "Success",
                message: "提交成功",
                type: "success",
            });
            // 重置表单内容
            Object.assign(aboutMe);
        } else {
            ElNotification({
                title: "Failed",
                message: "提交失败，请稍后再试",
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
.submit-button-wrapper {
  margin-top:50px;
}
</style>
