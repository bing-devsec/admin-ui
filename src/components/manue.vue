<template>
    <h2 class="mb-2">菜单</h2>
    <el-menu active-text-color="#ffd04b" background-color="#545c64" text-color="#fff" :default-active="activeIndex" router>
      
      <el-menu-item index="/home/writeDocument">
        <el-icon>
          <documentAdd/>
        </el-icon>
        <span>写文章</span>
      </el-menu-item>

      <el-menu-item index="/home/manageDocument">
        <el-icon>
          <Document/>
        </el-icon>
        <span>文章管理</span>
      </el-menu-item>

      <el-menu-item index="/home/manageLabel">
        <el-icon>
          <Management/>
        </el-icon>
        <span>专栏管理</span>
      </el-menu-item>

      <el-menu-item index="/home/toolsConfig">
        <el-icon>
          <Link/>
        </el-icon>
        <span>友链管理</span>
      </el-menu-item>

      <el-menu-item index="/home/aboutMe">
        <el-icon>
          <Avatar/>
        </el-icon>
        <span>关于我</span>
      </el-menu-item>
    </el-menu>
</template>

<script lang="ts" setup>
import {DocumentAdd,Document,Management,Link,Avatar} from "@element-plus/icons-vue";
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
let activeIndex = ref(route.path);

watch(() => route.path, newPath => {
  activeIndex.value = newPath;
});
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
  height: 100%;
  overflow-y: hidden;
}
</style>
