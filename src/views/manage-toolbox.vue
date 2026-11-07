<template>
    <section class="sortable-page toolbox-admin" aria-labelledby="toolbox-heading">
        <header class="toolbar">
            <div class="toolbar-summary">
                <h1 id="toolbox-heading">工具箱管理</h1>
                <span v-if="!loadError && !loading" class="summary-count">{{ tools.length }} 条</span>
            </div>
            <el-button type="primary" :icon="Plus" :disabled="readOnly" @click="openEditor()">新增工具</el-button>
        </header>

        <div ref="listRoot" v-loading="loading" class="dynamic-list">
            <div v-if="loadError" role="alert" class="load-error">
                <span>{{ loadError }}</span>
                <el-button size="small" :disabled="loading" @click="load">重新加载</el-button>
            </div>
            <template v-else>
                <div class="list-head" aria-hidden="true">
                    <span></span><span>工具名称</span><span>简介</span><span>网址</span><span>状态</span><span>操作</span>
                </div>
                <div v-for="(tool, index) in tools" :key="tool.id" class="list-row" :data-tool-id="tool.id"
                    :class="{ 'is-dragging': draggingId === tool.id, 'is-drag-over': dropId === tool.id && dropId !== draggingId, 'is-drop-after': dropId === tool.id && index > dragIndex }">
                    <div class="drag-cell">
                        <button type="button" class="drag-handle" :disabled="tools.length < 2"
                            :aria-disabled="readOnly || tools.length < 2" :aria-label="`调整${tool.name}的位置，上下方向键移动`"
                            title="拖动排序，也可使用 ↑ ↓ 键" aria-keyshortcuts="ArrowUp ArrowDown"
                            @pointerdown="beginDrag($event, tool.id)" @pointermove="trackPointer" @pointerup="finishDrag"
                            @lostpointercapture="cancelDrag" @pointercancel="cancelDrag" @keydown.esc="cancelDrag"
                            @keydown.up.prevent="moveTool(tool.id, index - 1, $event.currentTarget)"
                            @keydown.down.prevent="moveTool(tool.id, index + 1, $event.currentTarget)">
                            <el-icon><Rank /></el-icon>
                        </button>
                    </div>
                    <strong class="tool-name" :title="tool.name">{{ tool.name }}</strong>
                    <p class="tool-description" :class="{ 'is-empty': !tool.description }" :title="tool.description || undefined">
                        {{ tool.description || '—' }}
                    </p>
                    <span class="tool-url" :title="tool.url">{{ tool.url }}</span>
                    <div class="status-cell">
                        <el-tag :type="tool.enabled ? 'success' : 'info'" disable-transitions>{{ tool.enabled ? '已展示' : '已隐藏' }}</el-tag>
                    </div>
                    <div class="action-cell">
                        <el-button :disabled="readOnly" :aria-label="'编辑工具 ' + tool.name" @click="openEditor(tool)">编辑</el-button>
                        <el-button type="danger" :disabled="readOnly" :aria-label="'删除工具 ' + tool.name" @click="confirmDelete(tool)">删除</el-button>
                    </div>
                </div>
                <el-empty v-if="!loading && !tools.length" description="尚未添加工具" />
            </template>
        </div>
        <el-drawer v-model="editorOpen" :before-close="beforeClose"
            destroy-on-close size="min(520px, 92vw)" footer-class="toolbox-drawer-footer" class="toolbox-drawer admin-drawer admin-form-drawer">
            <template #header="{ titleId, titleClass }">
                <div class="drawer-header">
                    <el-icon class="drawer-header-icon"><component :is="editingId ? Edit : Plus" /></el-icon>
                    <span :id="titleId" :class="[titleClass, 'drawer-header-title']">{{ editingId ? '编辑工具' : '新增工具' }}</span>
                </div>
            </template>
            <el-form id="toolbox-editor-form" ref="formRef" class="toolbox-form" scroll-to-error :model="form" :rules="rules" :disabled="busy" label-position="top" @submit.prevent="save">
                <el-form-item label="工具名称" prop="name">
                    <el-input v-model="form.name" placeholder="例如：JSON 工具箱"
                        :maxlength="nameLimit" :count-graphemes="countCharacters" show-word-limit />
                </el-form-item>
                <el-form-item label="工具网址" prop="url">
                    <el-input v-model.trim="form.url" placeholder="https://example.com/" />
                </el-form-item>
                <el-form-item label="工具简介" prop="description">
                    <el-input v-model="form.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }"
                        :input-style="{ maxHeight: 'min(200px, 30dvh)' }" placeholder="简要说明工具可以做什么"
                        :maxlength="descriptionLimit" :count-graphemes="countCharacters" show-word-limit />
                </el-form-item>
                <el-form-item label="展示状态" prop="enabled">
                    <el-segmented v-model="form.enabled" :options="visibilityOptions" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="form-footer toolbox-footer">
                    <el-button :disabled="busy" @click="editorOpen = false">取消</el-button>
                    <el-button type="primary" form="toolbox-editor-form" native-type="submit" :loading="busy">{{ editingId ? '保存修改' : '新增' }}</el-button>
                </div>
            </template>
        </el-drawer>
    </section>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { isAxiosError } from 'axios';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Edit, Plus, Rank } from '@element-plus/icons-vue';
import { deleteTool, listToolbox, reorderTools, saveTool, type ToolboxTool, type ToolFields } from '@/utils/toolbox';

const nameLimit = 30;
const descriptionLimit = 100;
const countCharacters = (value: string) => Array.from(value).length;

const tools = ref<ToolboxTool[]>([]);
const loading = ref(false);
const loadError = ref('');
const busy = ref(false);
const readOnly = computed(() => loading.value || busy.value || !!loadError.value);
const editingId = ref('');
const editorOpen = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<ToolFields>({ name: '', url: '', description: '', enabled: true });
const visibilityOptions = [{ label: '已展示', value: true }, { label: '已隐藏', value: false }];
function validUrl(value: string) {
    try {
        const url = new URL(value);
        return /^https?:\/\//i.test(value) && !/[\s\\]/.test(value) && !!url.hostname
            && !url.username && !url.password && new TextEncoder().encode(value).length <= 2048;
    } catch {
        return false;
    }
}

const urlRule = {
    validator: (_rule: unknown, value: string, done: (error?: Error) => void) =>
        !value || validUrl(value) ? done() : done(new Error('请输入完整的 HTTP 或 HTTPS 网址，不得包含账号密码，最长 2048 字节')),
    trigger: 'blur',
};
const rules: FormRules = {
    name: [
        { required: true, whitespace: true, message: '请输入工具名称', trigger: 'blur' },
        { max: nameLimit, message: `工具名称最多 ${nameLimit} 个字符`, trigger: 'blur' },
    ],
    description: [{ max: descriptionLimit, message: `工具简介最多 ${descriptionLimit} 个字符`, trigger: 'blur' }],
    url: [{ required: true, message: '请输入工具网址', trigger: 'blur' }, urlRule],
};

function errorText(error: unknown, fallback: string) {
    if (isAxiosError(error) && typeof error.response?.data?.message === 'string' && error.response.data.message) {
        return error.response.data.message;
    }
    return error instanceof Error ? error.message : fallback;
}

async function load() {
    loading.value = true;
    loadError.value = '';
    try {
        tools.value = await listToolbox();
    } catch (error) {
        loadError.value = errorText(error, '工具箱数据加载失败');
    } finally {
        loading.value = false;
    }
}

function openEditor(tool?: ToolboxTool) {
    editingId.value = tool?.id ?? '';
    Object.assign(form, {
        name: tool?.name ?? '', description: tool?.description ?? '', url: tool?.url ?? '',
        enabled: tool?.enabled ?? true,
    });
    editorOpen.value = true;
    formRef.value?.clearValidate();
}

function beforeClose(done: () => void) {
    if (!busy.value) done();
}

async function save() {
    if (busy.value || !formRef.value) return;
    busy.value = true;
    try {
        const ok = await formRef.value.validate().catch(() => false);
        if (!ok) return;
        await saveTool({ ...form, name: form.name.trim(), description: form.description.trim() }, editingId.value);
        ElMessage.success('已保存');
        editorOpen.value = false;
        await load();
    } catch (error) {
        ElMessage.error(errorText(error, '保存失败'));
    } finally {
        busy.value = false;
    }
}

async function confirmDelete(item: ToolboxTool) {
    if (readOnly.value) return;
    try {
        await ElMessageBox.confirm('确定删除工具“' + item.name + '”吗？', '删除工具', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
    } catch {
        return;
    }
    busy.value = true;
    try {
        await deleteTool(item.id);
        ElMessage.success('已删除');
        await load();
    } catch (error) {
        ElMessage.error(errorText(error, '删除失败'));
    } finally {
        busy.value = false;
    }
}

const listRoot = ref<HTMLElement>();
const draggingId = ref('');
const dropId = ref('');
const dragIndex = computed(() => tools.value.findIndex(tool => tool.id === draggingId.value));
let pointerId: number | undefined;
let scrollFrame = 0;
let pointerX = 0;
let pointerY = 0;

function rowAtPointer() {
    const row = document.elementFromPoint(pointerX, pointerY)?.closest<HTMLElement>('[data-tool-id]');
    return row && listRoot.value?.contains(row) ? row.dataset.toolId || '' : '';
}

function updateDropTarget() {
    cancelAnimationFrame(scrollFrame);
    const list = listRoot.value;
    if (!list || pointerId === undefined) return;
    const bounds = list.getBoundingClientRect();
    const inside = pointerX >= bounds.left && pointerX <= bounds.right && pointerY >= bounds.top && pointerY <= bounds.bottom;
    if (inside) {
        const edge = 30;
        const speed = Math.max(0, edge - (bounds.bottom - pointerY)) - Math.max(0, edge - (pointerY - bounds.top));
        const before = list.scrollTop;
        list.scrollTop += Math.round(speed / 2);
        if (list.scrollTop !== before) scrollFrame = requestAnimationFrame(updateDropTarget);
    }
    dropId.value = rowAtPointer();
}

function beginDrag(event: PointerEvent, id: string) {
    if (readOnly.value || !event.isPrimary || event.button !== 0 || pointerId !== undefined) return;
    pointerId = event.pointerId;
    draggingId.value = dropId.value = id;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function trackPointer(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    updateDropTarget();
}

function cancelDrag() {
    cancelAnimationFrame(scrollFrame);
    pointerId = undefined;
    draggingId.value = dropId.value = '';
}

function finishDrag(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    const from = draggingId.value;
    const targetId = rowAtPointer();
    cancelDrag();
    void moveTool(from, tools.value.findIndex(tool => tool.id === targetId));
}

async function moveTool(id: string, to: number, focus?: EventTarget | null) {
    const previous = tools.value;
    const from = previous.findIndex(tool => tool.id === id);
    if (readOnly.value || from < 0 || to < 0 || to >= previous.length || from === to) return;
    const next = [...previous];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    busy.value = true;
    tools.value = next;
    try {
        await reorderTools(next.map(tool => tool.id), previous.map(tool => tool.id));
        ElMessage.success('排序已保存');
    } catch (error) {
        tools.value = previous;
        ElMessage.error(errorText(error, '未能确认排序，请以重新加载后的列表为准'));
    } finally {
        // A timeout can occur after commit. Read the authoritative order before allowing another move.
        await load();
        busy.value = false;
        await nextTick();
        if (focus instanceof HTMLElement && focus.isConnected && document.activeElement === document.body) {
            focus.focus({ preventScroll: true });
        }
    }
}

onBeforeUnmount(cancelDrag);

onMounted(load);
</script>

<style scoped src="../assets/admin-sortable-list.css"></style>
<style scoped src="../assets/admin-toolbox.css"></style>
