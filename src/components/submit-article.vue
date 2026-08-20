<template>
    <div class="submit-article-wrapper">
        <el-form
            ref="formRef"
            v-loading="submitting"
            :element-loading-text="submitLoadingText"
            :model="article"
            :rules="rules"
            label-position="top"
            :size="size"
            class="article-form"
        >
            <el-form-item label="标题" prop="title" required>
                <el-input v-model="article.title" placeholder="请输入文章标题" maxlength="100" show-word-limit
                    :disabled="submitting" />
            </el-form-item>

            <el-form-item label="标签" prop="tag" required>
                <el-select v-model="article.tag" placeholder="选择已有标签或输入创建新标签" filterable :loading="tagLoading"
                    :disabled="submitting" allow-create default-first-option style="width: 100%">
                    <el-option v-for="item in tagOptions" :key="item.name" :label="item.name" :value="item.name" />
                </el-select>
                <div class="form-hint">输入标签名后回车可创建新标签；若与已有标签同名将自动复用</div>
            </el-form-item>

            <el-form-item prop="describe">
                <template #label>
                    <div class="label-with-action">
                        <span class="label-text"><span class="required-star">*</span>摘要</span>
                        <el-button type="primary" link size="small" @click="generateDescribe"
                            :disabled="submitting || !props.displayContent">
                            <el-icon style="margin-right: 4px">
                                <MagicStick />
                            </el-icon>
                            从正文生成
                        </el-button>
                    </div>
                </template>
                <el-input ref="describeRef" v-model="article.describe" type="textarea"
                    placeholder="一句话概括文章核心内容（建议 50-200 字）" :autosize="{ minRows: 4, maxRows: 12 }" show-word-limit
                    :maxlength="200" resize="none" class="describe-textarea" :disabled="submitting" />
            </el-form-item>

            <el-alert
                v-if="submitting"
                :title="submitLoadingText"
                description="后端会等待 EdgeOne 缓存清理任务完成后再返回，请勿关闭页面或重复提交。"
                type="info"
                :closable="false"
                class="submit-progress-alert"
            />

            <div class="form-footer">
                <el-button :disabled="submitting || draftSaving" @click="onCancel">取消</el-button>
                <el-button v-if="!isDraftPublish" :loading="draftSaving" :disabled="submitting" @click="onSaveDraft">
                    保存草稿
                </el-button>
                <el-button type="primary" :loading="submitting" @click="onSubmit">
                    {{ submitButtonText }}
                </el-button>
            </div>
        </el-form>
    </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElNotification, type FormInstance, type FormRules } from "element-plus";
import { MagicStick } from "@element-plus/icons-vue";
import _axios from "../utils/axios";

const route = useRoute();
const router = useRouter();
const size = ref<"default" | "small" | "large">("default");
const formRef = ref<FormInstance>();
const submitting = ref(false);
const draftSaving = ref(false);

const article = reactive({
    title: "",
    tag: "",
    describe: "",
});

const rules: FormRules = {
    title: [
        { required: true, message: "请输入文章标题", trigger: "blur" },
        { max: 100, message: "标题不超过 100 个字符", trigger: "blur" },
    ],
    tag: [
        { required: true, message: "请选择或输入文章标签", trigger: "change" },
    ],
    describe: [
        {
            validator: (_rule, value, callback) => {
                const v = (value ?? '').trim();
                if (!v) return callback(new Error('请填写文章摘要'));
                if (v.length < 10) return callback(new Error('摘要至少 10 个字符'));
                callback();
            },
            trigger: 'blur',
        },
    ],
};

interface TagItem {
    name: string;
    articleNum: number;
}

const tagOptions = ref<TagItem[]>([]);
const tagLoading = ref(false);
const describeRef = ref<any>(null);

// DEFAULT_AFTER_SAVE_PATH 是保存文章后的默认兜底页面。
const DEFAULT_AFTER_SAVE_PATH = "/home/manage-article";
const DEFAULT_AFTER_DRAFT_SAVE_PATH = "/home/manage-draft";

const props = defineProps<{
    displayContent: string;
    id: string;
    draftID: string;
    title: string;
    tag: string;
    describe: string;
}>();
const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'draft-saved', payload: { id: string; title: string; tag: string; describe: string }): void;
}>();

const isEdit = computed(() => !!props.id);
const isDraftPublish = computed(() => !!props.draftID);
const submitLoadingText = computed(() => (
    isDraftPublish.value
        ? "正在发布草稿，请稍候"
        : isEdit.value
        ? "正在保存修改并清理 CDN 缓存，请稍候"
        : "正在发布文章，请稍候"
));
const submitButtonText = computed(() => {
    if (submitting.value) {
        if (isDraftPublish.value) return "正在发布...";
        return isEdit.value ? "正在保存..." : "正在发布...";
    }
    if (isDraftPublish.value) return "发布草稿";
    return isEdit.value ? "保存修改" : "发布";
});

article.title = props.title;
article.tag = props.tag;
article.describe = props.describe;

async function fetchTags() {
    tagLoading.value = true;
    try {
        const response = await _axios.get('/admin/auth/tag/list');
        const { code, message, data } = response.data;
        if (code === 2000 && message === "") {
            tagOptions.value = data?.rows ?? [];
        } else {
            ElNotification({ title: "Failed", message: "获取标签列表失败", type: "error" });
        }
    } catch (error: any) {
        ElNotification({ title: "Error", message: error?.message ?? String(error), type: "error" });
    } finally {
        tagLoading.value = false;
    }
}

onMounted(() => {
    fetchTags();
});

function summarize(markdown: string, targetLen = 160, maxLen = 200, minLen = 50): string {
    if (!markdown) return '';
    let text = markdown.replace(/\r\n/g, '\n');
    text = text.replace(/^---\n[\s\S]*?\n---\n/, '');
    text = text.replace(/```[\s\S]*?```/g, '\n\n');
    text = text.replace(/<[^>]+>/g, '');

    const blocks = text.split(/\n\s*\n/);
    const candidates: string[] = [];

    for (const raw of blocks) {
        const block = raw.trim();
        if (!block) continue;
        if (/^#+\s+/.test(block)) continue;
        if (/^>\s+/m.test(block) && block.split('\n').every(l => /^>/.test(l) || !l.trim())) continue;
        if (/^[-*+]\s+/m.test(block) && block.split('\n').every(l => /^[-*+]\s+/.test(l) || !l.trim())) continue;
        if (/^\d+\.\s+/m.test(block) && block.split('\n').every(l => /^\d+\.\s+/.test(l) || !l.trim())) continue;
        const lines = block.split('\n');
        if (lines.length >= 2 && lines.some(l => /^\s*\|/.test(l)) && lines.some(l => /^\s*\|?\s*-{3,}/.test(l))) continue;
        if (lines.every(l => /^\s*\|/.test(l) || !l.trim())) continue;
        if (block.split('\n').every(l => /^\s*!?\[[^\]]*\]\([^)]+\)\s*$/.test(l) || !l.trim())) continue;
        candidates.push(block);
    }

    if (candidates.length === 0) return '';

    const cleanInline = (s: string) =>
        s.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/`([^`]*)`/g, '$1')
            .replace(/(\*\*|__)(.+?)\1/g, '$2')
            .replace(/(\*|_)(.+?)\1/g, '$2')
            .replace(/~~(.+?)~~/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();

    let merged = '';
    for (const c of candidates) {
        const piece = cleanInline(c);
        if (!piece) continue;
        if (!merged) merged = piece;
        else merged += ' ' + piece;
        if (merged.length >= targetLen) break;
    }

    if (!merged) return '';
    if (merged.length <= maxLen) {
        if (merged.length >= minLen) return merged;
        return merged;
    }

    const truncated = merged.slice(0, maxLen);
    const sentenceBreak = Math.max(
        truncated.lastIndexOf('。'),
        truncated.lastIndexOf('！'),
        truncated.lastIndexOf('？'),
        truncated.lastIndexOf('. '),
        truncated.lastIndexOf('! '),
        truncated.lastIndexOf('? '),
    );
    if (sentenceBreak > minLen) {
        return truncated.slice(0, sentenceBreak + 1).trim();
    }
    const softBreak = Math.max(
        truncated.lastIndexOf('，'),
        truncated.lastIndexOf('、'),
        truncated.lastIndexOf(', '),
        truncated.lastIndexOf('；'),
        truncated.lastIndexOf('; '),
    );
    if (softBreak > minLen) {
        return truncated.slice(0, softBreak).trim() + '…';
    }
    return truncated.trim() + '…';
}

function generateDescribe() {
    const result = summarize(props.displayContent || '');
    if (!result) {
        ElNotification({ title: "提示", message: "正文中未找到合适的段落作为摘要", type: "warning" });
        return;
    }

    const textarea: HTMLTextAreaElement | undefined = describeRef.value?.textarea;
    if (textarea) {
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('insertText', false, result);
        if (!ok) {
            article.describe = result;
        }
    } else {
        article.describe = result;
    }

    ElNotification({
        title: "已生成摘要",
        message: "可按 Ctrl+Z (Cmd+Z) 撤销",
        type: "success",
        duration: 2500,
    });
}

function onCancel() {
    emit('close');
}

// normalizeRedirectQuery 从 route query 中提取回跳地址。
function normalizeRedirectQuery(value: unknown): string {
    if (Array.isArray(value)) {
        return typeof value[0] === "string" ? value[0] : "";
    }
    return typeof value === "string" ? value : "";
}

// isAllowedRedirectPath 限制保存后的回跳地址只能落在后台内部页面。
function isAllowedRedirectPath(path: string): boolean {
    return path === "/home/manage-article"
        || path.startsWith("/home/manage-article?")
        || path === "/home/manage-draft"
        || path.startsWith("/home/manage-draft?")
        || path === "/home/manage-tag"
        || path.startsWith("/home/manage-tag?");
}

// shouldFallbackRedirect 判断回跳地址是否需要退回默认文章管理页。
function shouldFallbackRedirect(redirectPath: string, oldTag: string, nextTag: string): boolean {
    return redirectPath.startsWith("/home/manage-tag") && oldTag.trim() !== nextTag.trim();
}

// resolveAfterSavePath 计算文章保存成功后的最终跳转地址。
function resolveAfterSavePath(oldTag: string, nextTag: string): string {
    const redirectPath = normalizeRedirectQuery(route.query.redirect);
    if (!redirectPath || !isAllowedRedirectPath(redirectPath)) {
        return DEFAULT_AFTER_SAVE_PATH;
    }
    if (shouldFallbackRedirect(redirectPath, oldTag, nextTag)) {
        return DEFAULT_AFTER_SAVE_PATH;
    }
    return redirectPath;
}

function resolveAfterDraftSavePath(): string {
    const redirectPath = normalizeRedirectQuery(route.query.redirect);
    return redirectPath && isAllowedRedirectPath(redirectPath)
        ? redirectPath
        : DEFAULT_AFTER_DRAFT_SAVE_PATH;
}

// navigateAfterSave 跳转失败时回落到默认文章管理页。
async function navigateAfterSave(targetPath: string): Promise<void> {
    try {
        await router.push(targetPath);
    } catch {
        await router.push(DEFAULT_AFTER_SAVE_PATH).catch(() => { });
    }
}

async function onSubmit() {
    if (submitting.value) return;
    if (!formRef.value) return;
    try {
        await formRef.value.validate();
    } catch {
        return;
    }

    const trimmedTag = article.tag.trim();
    article.tag = trimmedTag;
    const isNewTag = trimmedTag !== "" && !tagOptions.value.some(t => t.name === trimmedTag);

    const requestData = {
        id: props.draftID || props.id,
        title: article.title.trim(),
        tag: trimmedTag,
        content: props.displayContent,
        describe: article.describe,
    };

    const userID = localStorage.getItem("userID");
    if (!userID) { router.push('/').catch(() => { }); return; }

    const notifyNewTag = () => {
        if (isNewTag) {
            ElNotification({
                title: "已创建新标签",
                message: trimmedTag,
                type: "info",
                duration: 2500,
            });
        }
    };

    submitting.value = true;
    const request = props.draftID
        ? _axios.post("/admin/auth/article/draft/publish", requestData)
        : requestData.id === ""
        ? _axios.post("/admin/auth/article/add", requestData)
        : _axios.put("/admin/auth/article/update", requestData);

    request
        .then(async (response: { data: { code: number; message: string; data: any } }) => {
            const { code, message } = response.data;
            const successMsg = isDraftPublish.value ? "发布草稿成功" : isEdit.value ? "修改文章成功" : "添加文章成功";
            const failureMsg = isDraftPublish.value ? "发布草稿失败" : isEdit.value ? "修改文章失败" : "添加文章失败";
            if (code === 2000 && message === "") {
                ElNotification({ title: "Success", message: successMsg, type: "success" });
                notifyNewTag();
                const afterSavePath = resolveAfterSavePath(props.tag, trimmedTag);
                emit('close');
                await navigateAfterSave(afterSavePath);
            } else {
                ElNotification({ title: "Failed", message: message || failureMsg, type: "error" });
            }
        })
        .catch((error: any) => {
            ElNotification({ title: "Error", message: error?.message ?? String(error), type: "error" });
        })
        .finally(() => {
            submitting.value = false;
        });
}

async function onSaveDraft() {
    if (draftSaving.value || submitting.value) return;
    const userID = localStorage.getItem("userID");
    if (!userID) { router.push('/').catch(() => { }); return; }

    const payload = {
        id: props.draftID,
        articleID: props.id,
        title: article.title.trim(),
        tag: article.tag.trim(),
        describe: article.describe.trim(),
        content: props.displayContent,
    };
    draftSaving.value = true;
    try {
        const response = await _axios.post("/admin/auth/article/draft/save", payload);
        const { code, message, data } = response.data;
        if (code === 2000 && message === "") {
            const nextDraftID = data?.id || props.draftID;
            const nextTitle = data?.title || payload.title;
            emit('draft-saved', {
                id: nextDraftID,
                title: nextTitle,
                tag: payload.tag,
                describe: payload.describe,
            });
            ElNotification({ title: "Success", message: "草稿已保存", type: "success" });
            emit('close');
            await navigateAfterSave(resolveAfterDraftSavePath());
        } else {
            ElNotification({ title: "Failed", message: message || "保存草稿失败", type: "error" });
        }
    } catch (error: any) {
        ElNotification({ title: "Error", message: error?.message ?? String(error), type: "error" });
    } finally {
        draftSaving.value = false;
    }
}
</script>

<style scoped>
.submit-article-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    margin: -20px;
}

.article-form {
    flex: 1;
    overflow-y: auto;
    padding: 0px 24px;
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

.label-with-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.label-text {
    display: inline-flex;
    align-items: center;
}

.required-star {
    color: var(--el-color-danger);
    margin-right: 4px;
    font-family: SimSun, sans-serif;
}

.describe-textarea :deep(.el-textarea__inner) {
    padding-bottom: 24px;
}

.describe-textarea :deep(.el-input__count) {
    background: transparent;
    bottom: 4px;
    right: 8px;
}

.submit-progress-alert {
    position: relative;
    z-index: 2001;
    border: 1px solid var(--el-color-primary-light-7);
    background: var(--el-color-primary-light-9);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.12);
}

.submit-progress-alert :deep(.el-alert__title) {
    color: #1f5f99;
    font-weight: 600;
}

.submit-progress-alert :deep(.el-alert__description) {
    color: #3f5366;
    line-height: 1.6;
}

</style>
