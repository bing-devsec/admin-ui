<template>
    <div class="about-page">
        <div class="about-header">
            <div class="header-title">
                <span>关于我</span>
                <em>维护博客前台展示的个人资料、站点说明和联系方式。</em>
            </div>
            <div class="header-actions">
                <el-button type="success" plain :loading="latestLoading" @click="fetchLatestAboutMe()">获取最新管理员信息</el-button>
                <el-button type="primary" @click="onSubmit">保存修改</el-button>
            </div>
        </div>

        <el-form :model="aboutMe" :rules="rules" label-position="top" class="about-form">
            <section class="about-panel">
                <div class="form-layout">
                    <div class="primary-column">
                        <section class="form-section profile-section">
                            <div class="section-header">
                                <span>个人资料</span>
                                <em>基础身份信息</em>
                            </div>
                            <div class="field-grid">
                                <el-form-item label="昵称" prop="name">
                                    <el-input v-model="aboutMe.name" clearable />
                                </el-form-item>
                                <el-form-item label="职业" prop="job">
                                    <el-input v-model="aboutMe.job" clearable />
                                </el-form-item>
                                <el-form-item label="工龄" prop="workLife">
                                    <el-input v-model="aboutMe.workLife" clearable />
                                </el-form-item>
                                <el-form-item label="定位" prop="address">
                                    <el-input v-model="aboutMe.address" clearable />
                                </el-form-item>
                            </div>
                        </section>

                        <section class="form-section contact-section">
                            <div class="section-header">
                                <span>联系方式</span>
                                <em>支持多个邮箱</em>
                            </div>
                            <el-form-item label="邮箱" prop="email">
                                <el-select
                                    v-model="aboutMe.email"
                                    multiple
                                    filterable
                                    allow-create
                                    default-first-option
                                    placeholder="输入邮箱后回车添加">
                                    <el-option v-for="item in aboutMe.email" :key="item" :label="item" :value="item" />
                                </el-select>
                            </el-form-item>
                        </section>
                    </div>

                    <div class="content-column">
                        <section class="form-section website-section">
                            <div class="section-header">
                                <span>网站信息</span>
                                <em>描述博客内容和站点定位</em>
                            </div>
                            <el-form-item label="域名信息" prop="domainInfo">
                                <el-input
                                    v-model="aboutMe.domainInfo"
                                    type="textarea"
                                    :autosize="{ minRows: 2, maxRows: 8 }"
                                    :maxlength="100"
                                    show-word-limit
                                    clearable />
                            </el-form-item>
                            <el-form-item label="博客内容" prop="blogContent">
                                <el-input
                                    v-model="aboutMe.blogContent"
                                    type="textarea"
                                    :autosize="{ minRows: 4, maxRows: 12 }"
                                    :maxlength="200"
                                    show-word-limit
                                    clearable />
                            </el-form-item>
                            <el-form-item label="本站定位" prop="websiteLocation">
                                <el-input
                                    v-model="aboutMe.websiteLocation"
                                    type="textarea"
                                    :autosize="{ minRows: 4, maxRows: 12 }"
                                    :maxlength="200"
                                    show-word-limit
                                    clearable />
                            </el-form-item>
                        </section>
                    </div>

                    <section class="form-section statement-section">
                        <div class="section-header">
                            <span>免责声明</span>
                            <em>版权与内容说明</em>
                        </div>
                        <el-form-item label="声明内容" prop="statement">
                            <el-input
                                v-model="aboutMe.statement"
                                type="textarea"
                                :autosize="{ minRows: 6, maxRows: 18 }"
                                :maxlength="500"
                                show-word-limit
                                clearable />
                        </el-form-item>
                    </section>
                </div>
            </section>
        </el-form>
    </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { ElNotification, ElMessage } from 'element-plus';
import _axios from '../utils/axios';

interface AboutMePayload {
    name?: string;
    job?: string;
    workLife?: string;
    address?: string;
    domainInfo?: string;
    blogContent?: string;
    websiteLocation?: string;
    statement?: string;
    email?: string[];
}

const aboutMe = reactive({
    userID: '',
    name: '',
    job: '',
    workLife: '',
    address: '',
    domainInfo: '',
    blogContent: '',
    websiteLocation: '',
    statement: '',
    email: [] as string[],
})

const latestLoading = ref(false);

const rules = {
    email: [
        {
            validator: (rule: any, value: string[], callback: any) => {
                if (value && value.length > 0) {
                    const invalidEmails = value.filter(email => !isValidEmail(email.trim()));
                    if (invalidEmails.length > 0) {
                        callback(new Error('请输入有效的邮箱地址'));
                    } else {
                        callback();
                    }
                } else {
                    callback();
                }
            },
            trigger: ['change', 'blur']
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

function fillAboutMeForm(data: AboutMePayload) {
    Object.assign(aboutMe, {
        userID: localStorage.getItem('userID') || '',
        name: data.name || '',
        job: data.job || '',
        workLife: data.workLife || '',
        address: data.address || '',
        domainInfo: data.domainInfo || '',
        blogContent: data.blogContent || '',
        websiteLocation: data.websiteLocation || '',
        statement: data.statement || '',
        email: Array.isArray(data.email) ? data.email : [],
    });
}

async function fetchLatestAboutMe(showSuccess = true) {
    latestLoading.value = true;

    try {
        const response = await _axios.get('/user/about-me');
        const { code, data } = response.data;
        if (code === 2000 && data) {
            fillAboutMeForm(data);
            if (showSuccess) {
                ElMessage.success('已填入当前最新管理员信息');
            }
        } else {
            ElMessage.error('获取当前管理员信息失败');
        }
    } catch (error) {
        ElNotification({
            title: "Error",
            message: error,
            type: "error",
        });
    } finally {
        latestLoading.value = false;
    }
}

async function onSubmit() {
    if (!isFormValid()) {
        ElMessage.error('请至少填写一个字段');
        return;
    }

    aboutMe.userID = localStorage.getItem('userID') || '';

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
        const response = await _axios.put('/admin/auth/about-me', {
            userID: aboutMe.userID,
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
.about-page {
    display: flex;
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    background: #fff;
    color: #303133;
    font-family: monospace;
}

.about-header {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 15px;
    border-bottom: 1px solid #dceafe;
    background: linear-gradient(90deg, #f8fbff 0%, #fff 44%, #f7fbff 100%);
}

.header-title {
    display: flex;
    min-width: 0;
    align-items: baseline;
    gap: 12px;
}

.header-title span {
    flex: none;
    color: #303133;
    font-size: 16px;
    font-weight: 400;
    line-height: 32px;
}

.header-title em {
    overflow: hidden;
    color: #909399;
    font-size: 12px;
    font-style: normal;
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.header-actions {
    display: flex;
    flex: none;
    align-items: center;
    gap: 10px;
}

.about-form {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
}

.about-panel {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: #fff;
}

.form-layout {
    display: grid;
    align-items: stretch;
    gap: 0 28px;
    grid-template-columns: minmax(320px, 0.78fr) minmax(520px, 1.22fr);
    padding: 15px 15px 18px;
}

.primary-column,
.content-column {
    display: flex;
    height: 100%;
    min-width: 0;
    flex-direction: column;
    gap: 20px;
}

.statement-section {
    grid-column: 1 / -1;
    margin-top: 18px;
}

.form-section {
    --section-bg: #f8fbff;
    --section-color: #409eff;

    position: relative;
    min-width: 0;
    padding: 12px 14px;
    border-radius: 6px;
    background: var(--section-bg);
    box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.05);
}

.profile-section {
    --section-bg: #ecf5ff;
    --section-color: #409eff;
}

.contact-section {
    --section-bg: #f0f9eb;
    --section-color: #67c23a;

    flex: 1;
    min-height: 126px;
    padding-bottom: 36px;
}

.website-section {
    --section-bg: #fdf6ec;
    --section-color: #e6a23c;

    box-sizing: border-box;
    height: 100%;
}

.statement-section {
    --section-bg: #f5f3ff;
    --section-color: #8b5cf6;
}

.section-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.section-header span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #303133;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
}

.section-header span::before {
    width: 6px;
    height: 6px;
    background: var(--section-color);
    content: "";
}

.section-header em {
    overflow: hidden;
    color: #909399;
    font-size: 12px;
    font-style: normal;
    line-height: 18px;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.field-grid {
    display: grid;
    gap: 0 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.about-page :deep(.el-form-item) {
    margin-bottom: 14px;
}

.about-page :deep(.el-form-item:last-child) {
    margin-bottom: 0;
}

.about-page :deep(.el-form-item__label) {
    margin-bottom: 4px;
    color: #606266;
    font-family: monospace;
    font-size: 13px;
    font-weight: 400;
    line-height: 20px;
}

.about-page :deep(.el-input),
.about-page :deep(.el-select) {
    width: 100%;
}

.about-page :deep(.el-input__wrapper),
.about-page :deep(.el-textarea__inner),
.about-page :deep(.el-select__wrapper) {
    border-radius: 4px;
    box-shadow: 0 0 0 1px #dcdfe6 inset;
    font-family: monospace;
    font-weight: 400;
}

.about-page :deep(.el-textarea__inner) {
    line-height: 1.7;
}

.contact-section :deep(.el-form-item__error) {
    top: calc(100% + 6px);
    padding-top: 0;
    line-height: 18px;
}

@media (max-width: 1080px) {
    .form-layout {
        grid-template-columns: 1fr;
    }

    .primary-column,
    .content-column {
        height: auto;
    }

    .contact-section {
        flex: none;
    }

    .website-section {
        height: auto;
    }

    .statement-section {
        grid-column: 1;
    }

    .content-column {
        margin-top: 20px;
        padding-top: 18px;
        border-top: 1px solid #ebeef5;
    }
}

@media (max-width: 640px) {
    .about-header {
        align-items: flex-start;
        flex-direction: column;
    }

    .header-actions {
        width: 100%;
        justify-content: flex-end;
    }

    .field-grid {
        grid-template-columns: 1fr;
    }
}
</style>
