<template>
  <el-row class="mb-4 custom-row">
    <el-button class="custom-button" @click="exitLogin">退出登录</el-button>
  </el-row>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
const router = useRouter();
function exitLogin() {
  router.push('/');
}
</script>

<style scoped>
.custom-row {
  align-items: center;
  margin-left: 35px;
}

.custom-button {
  background-color: #eee;
  border: 2px solid #555;
  font-size: larger;
  width: 90px;
  /* 设置你想要的宽度 */
  height: 45px;
  /* 设置你想要的高度 */
  line-height: 45px;
  /* 使文字垂直居中 */
  margin-right: 50px;
}
</style>
