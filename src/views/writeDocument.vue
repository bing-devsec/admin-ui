<template>
  <MdEditor v-model="text" class="writeBlog" :codeFoldable=true :autoFoldThreshold=30 :tabWidth=4 :autoDetectCode=true
    noUploadImg :showCodeRowNumber="true" :formatCopiedText="formatCopiedText" @onSave="saveBlog">
  </MdEditor>

  <el-drawer v-model="drawer" title="title" :with-header="false">
    <submitBlog :text="text" :blogId="blogId" :label="label" :title="title" :abstract="abstract"></submitBlog>
  </el-drawer>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { MdEditor } from 'md-editor-v3';
import submitBlog from '../components/submit-blog.vue'; 

import 'md-editor-v3/lib/style.css';
import emitter from '../utils/event-bus.js'

// 文本内容
let text = ref('# Hello Editor');
// 格式化代码
const formatCopiedText = (text: any) => {
  return `${text}  - from md-editor-v3`;
};
const drawer = ref(false)

function saveBlog() {
  //弹出抽屉
  drawer.value = true;
  //然后在抽屉里面填文章信息，点击提交按钮，将数据发送到后端
  //需要将text文本数据使用props的方式传递给submitBlog组件
}

let blogId = ref('')
let label = ref('')
let title = ref('')
let abstract = ref('')
//修改文章的事件监听
onMounted(() => {
  // 监听全局事件
  emitter.on('modifyBlog', showBlog)
});

//接收数据
function showBlog(data: any) {
  blogId.value = data.id
  label.value = data.label
  title.value = data.title
  text.value = data.textData
  abstract.value = data.describe
}
</script>

<style scoped>
.writeBlog {
  display: flex;
  flex-shrink: 0;
  height: calc(100vh);
  box-sizing: border-box;
  background-color: #fff;
  overflow: auto;
}
</style>