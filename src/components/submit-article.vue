<template>
    <div class="submit-article-wrapper">
        <el-form ref="formRef" :model="article" :rules="rules" label-position="top" :size="size" class="article-form">
            <el-form-item label="标题" prop="title" required>
                <el-input v-model="article.title" placeholder="请输入文章标题" maxlength="100" show-word-limit />
            </el-form-item>

            <el-form-item label="标签" prop="tag" required>
                <el-select v-model="article.tag" placeholder="选择已有标签或输入创建新标签" filterable :loading="tagLoading"
                    allow-create default-first-option style="width: 100%">
                    <el-option v-for="item in tagOptions" :key="item.name" :label="item.name" :value="item.name" />
                </el-select>
                <div class="form-hint">输入标签名后回车可创建新标签；若与已有标签同名将自动复用</div>
            </el-form-item>

            <el-form-item prop="describe">
                <template #label>
                    <div class="label-with-action">
                        <span class="label-text"><span class="required-star">*</span>摘要</span>
                        <el-button type="primary" link size="small" @click="generateDescribe"
                            :disabled="!props.displayContent">
                            <el-icon style="margin-right: 4px">
                                <MagicStick />
                            </el-icon>
                            从正文生成
                        </el-button>
                    </div>
                </template>
                <el-input ref="describeRef" v-model="article.describe" type="textarea"
                    placeholder="一句话概括文章核心内容（建议 50-200 字）" :autosize="{ minRows: 4, maxRows: 12 }" show-word-limit
                    :maxlength="200" resize="none" class="describe-textarea" />
            </el-form-item>

            <div class="form-footer">
                <el-button @click="onCancel">取消</el-button>
                <el-button type="primary" :loading="submitting" @click="onSubmit">
                    {{ isEdit ? '保存修改' : '发布' }}
                </el-button>
            </div>
        </el-form>
    </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox, ElNotification, type FormInstance, type FormRules } from "element-plus";
import { MagicStick } from "@element-plus/icons-vue";
import _axios from "../utils/axios";

const route = useRoute();
const router = useRouter();
const size = ref<"default" | "small" | "large">("default");
const formRef = ref<FormInstance>();
const submitting = ref(false);

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

// PORTAL_BASE_URL 用于生成线上文章详情页缓存预热命令。
const PORTAL_BASE_URL = "https://liubing.xyz";
// DEFAULT_AFTER_SAVE_PATH 是保存文章后的默认兜底页面。
const DEFAULT_AFTER_SAVE_PATH = "/home/manage-article";

const props = defineProps<{ displayContent: string, id: string, title: string, tag: string, describe: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const isEdit = computed(() => !!props.id);

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

// escapeHTML 转义命令文本，避免弹窗 HTML 注入。
function escapeHTML(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// shellQuote 单引号包裹 shell 参数。
function shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

// getSavedArticleID 从接口响应或编辑态参数中提取文章 ID。
function getSavedArticleID(responseData: any, fallbackID: string): string {
    const value = responseData?.id ?? fallbackID;
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim();
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

// navigateAfterSave 跳转失败时回落到默认文章管理页。
async function navigateAfterSave(targetPath: string): Promise<void> {
    try {
        await router.push(targetPath);
    } catch {
        await router.push(DEFAULT_AFTER_SAVE_PATH).catch(() => { });
    }
}

// buildCacheWarmupCommand 生成文章详情页 CDN 预热命令。
function buildCacheWarmupCommand(articleID: string): string {
    const articleURL = `${PORTAL_BASE_URL}/article-detail/${encodeURIComponent(articleID)}`;
    return `curl -sS -D - -o /dev/null ${shellQuote(articleURL)}`;
}

// copyTextToClipboard 复制文本到剪贴板，兼容非安全上下文。
async function copyTextToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
        const ok = document.execCommand("copy");
        if (!ok) {
            throw new Error("copy command failed");
        }
    } finally {
        document.body.removeChild(textarea);
    }
}

// showCacheWarmupCommand 展示缓存重新录入命令，并在确认后复制。
async function showCacheWarmupCommand(articleID: string): Promise<void> {
    const command = buildCacheWarmupCommand(articleID);
    const message = `
        <div class="cache-command-dialog">
            <div class="cache-command-status">
                <span>CDN 清理任务已提交，复制命令到终端执行即可重新录入缓存。</span>
            </div>
            <pre class="cache-command-block">${escapeHTML(command)}</pre>
        </div>
    `;

    try {
        await ElMessageBox.alert(message, "重新录入缓存", {
            dangerouslyUseHTMLString: true,
            confirmButtonText: "复制命令",
            closeOnClickModal: false,
            customClass: "cache-command-message-box",
        });
        await copyTextToClipboard(command);
        ElMessage.success("命令已复制，可以直接粘贴到终端执行");
    } catch (error: any) {
        if (error !== "close" && error !== "cancel") {
            ElMessage.error("复制命令失败，请手动复制弹窗中的命令");
        }
    }
}

async function onSubmit() {
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
        id: props.id,
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
    const request = requestData.id === ""
        ? _axios.post("/admin/auth/article/add", requestData)
        : _axios.put("/admin/auth/article/update", requestData);

    request
        .then(async (response: { data: { code: number; message: string; data: any } }) => {
            const { code, message, data: responseData } = response.data;
            const successMsg = isEdit.value ? "修改文章成功" : "添加文章成功";
            const failureMsg = isEdit.value ? "修改文章失败" : "添加文章失败";
            if (code === 2000 && message === "") {
                ElNotification({ title: "Success", message: successMsg, type: "success" });
                notifyNewTag();
                const savedArticleID = getSavedArticleID(responseData, props.id);
                if (savedArticleID) {
                    await showCacheWarmupCommand(savedArticleID);
                } else {
                    ElNotification({
                        title: "缓存命令未生成",
                        message: "接口未返回文章 ID，无法生成文章详情页缓存预热命令",
                        type: "warning",
                    });
                }
                const afterSavePath = resolveAfterSavePath(props.tag, trimmedTag);
                emit('close');
                await navigateAfterSave(afterSavePath);
            } else {
                ElNotification({ title: "Failed", message: failureMsg, type: "error" });
            }
        })
        .catch((error: any) => {
            ElNotification({ title: "Error", message: error?.message ?? String(error), type: "error" });
        })
        .finally(() => {
            submitting.value = false;
        });
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

:global(.cache-command-message-box) {
    max-width: 720px;
    width: min(720px, calc(100vw - 32px));
    border-radius: 8px;
    padding: 0;
}

:global(.cache-command-message-box .el-message-box__header) {
    padding: 22px 24px 8px;
}

:global(.cache-command-message-box .el-message-box__title) {
    color: #1f2937;
    font-size: 20px;
    font-weight: 700;
}

:global(.cache-command-message-box .el-message-box__content) {
    padding: 8px 24px 0;
}

:global(.cache-command-message-box .el-message-box__btns) {
    padding: 20px 24px 24px;
}

:global(.cache-command-status) {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.7;
}

:global(.cache-command-block) {
    max-height: 180px;
    overflow: auto;
    margin: 0;
    padding: 14px;
    border-radius: 6px;
    background: #1f2937;
    color: #e5e7eb;
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}
</style>
