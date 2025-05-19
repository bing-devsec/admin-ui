<template>
    <MdEditor v-model="displayContent" class="writeArticle" :codeFoldable="true"
        :autoFoldThreshold="autoFoldThreshold" :tabWidth="tabWidth" :autoDetectCode="autoDetectCode"
        :formatCopiedText="formatCopiedText" @onSave="saveArticle">
    </MdEditor>

    <el-drawer v-model="drawer" title="title" :with-header="false">
        <SubmitArticle :id="id" :title="title" :tag="tag" :displayContent="displayContent" :describe="describe">
        </SubmitArticle>
    </el-drawer>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import { MdEditor } from 'md-editor-v3';
import SubmitArticle from '../components/submit-article.vue';
import emitter from '../utils/event-bus.js'
import 'md-editor-v3/lib/style.css';

const autoFoldThreshold = ref(20);
const autoDetectCode = ref(true);
const tabWidth = ref(4);

let id = ref('');
let tag = ref('');
let title = ref('');
let describe = ref('');
let content = ref('');
let displayContent = ref('');


watch(displayContent, (newValue) => {
    content.value = newValue.replace(/\t/g, '    ');
}, { immediate: true });

function updateArticle(data: any) {
    id.value = data.id
    tag.value = data.tag
    title.value = data.title
    content.value = data.content
    displayContent.value = data.content
    describe.value = data.describe
}

const drawer = ref(false);
const formatCopiedText = (content: any) => { return `${content}  - from md-editor-v3` };

function saveArticle() {
    drawer.value = true;
}

onMounted(() => {
    emitter.on('updateArticle', updateArticle)
});
</script>

<style scoped>
.writeArticle {
    display: flex;
    flex-shrink: 0;
    height: calc(100vh);
    box-sizing: border-box;
    background-color: #fff;
    overflow: auto;
}
</style>