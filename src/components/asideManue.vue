<template>
    <h2 class="mb-2">菜单</h2>
    <el-menu :style="{ height: menuHeight + 'px' }" active-text-color="#ffd04b" background-color="#545c64"
      class="el-menu-vertical-demo" text-color="#fff" :default-active="activeIndex" router>
      
      <el-menu-item index="/home/writeDocument">
        <el-icon>
          <DocumentAdd />
        </el-icon>
        <span>写文章</span>
      </el-menu-item>

      <el-menu-item index="/home/manageDocument">
        <el-icon>
          <Document />
        </el-icon>
        <span>文章管理</span>
      </el-menu-item>

      <el-menu-item index="/home/manageLabel">
        <el-icon>
          <Management />
        </el-icon>
        <span>专栏管理</span>
      </el-menu-item>

      <el-menu-item index="/home/toolsConfig">
        <el-icon>
          <Briefcase />
        </el-icon>
        <span>工具栏信息</span>
      </el-menu-item>

      <el-menu-item index="/home/aboutMe">
        <el-icon>
          <Avatar />
        </el-icon>
        <span>关于我</span>
      </el-menu-item>
    </el-menu>
</template>

<script lang="ts" setup>
import {
  Document,
  DocumentAdd,
  Management,
  Menu as IconMenu,
  Avatar,
  Briefcase,
} from "@element-plus/icons-vue";
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
let activeIndex = ref(route.path);

watch(() => route.path, newPath => {
  activeIndex.value = newPath;
});

const menuHeight = ref(0);

onMounted(() => {
  updateMenuHeight();
  window.addEventListener('resize', updateMenuHeight);
});

function updateMenuHeight() {
  const otherElementsHeight = 95;
  menuHeight.value = window.innerHeight - otherElementsHeight;
}
</script>

<style scoped>

.mb-2 {
  background-color: #545c64;
  color: white;
  text-align: center;
  line-height: 3rem;
  border-bottom: 2px solid #cdd0d6;
  border-right: 1px solid #cdd0d6;
}

.el-menu {
  overflow-y: hidden;
}
</style>
