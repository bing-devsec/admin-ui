<template>
  <el-row class="mb-4 custom-row">
    <el-button class="custom-button" @click="exitLogin">退出登录</el-button>
  </el-row>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
const router = useRouter();
function exitLogin() {
  router.push('/login');
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
  height: 45px;
  line-height: 45px;
  margin-right: 50px;
}
</style>
