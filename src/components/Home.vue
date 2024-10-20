<script lang="ts" setup>
import { RouterLink, RouterView } from 'vue-router';
import returnindex from './returnIndex.vue';
import exitLogin from './exitLogin.vue';
import asideManue from './asideManue.vue';

</script>

<template>
    <div class="common-layout">
        <el-container class="outer-container">
            <el-header>
                <returnindex></returnindex>
                <exitLogin></exitLogin>
            </el-header>

            <el-container class="inner-container">

                <el-aside width="13%">
                    <asideManue></asideManue>
                </el-aside>

                <el-main>
                    <RouterView></RouterView>
                </el-main>

            </el-container>
        </el-container>
    </div>
</template>


<style>
.outer-container {
    height: 100vh;
    overflow: hidden;
}

.inner-container {
    height: calc(100vh - 60px);
    overflow: auto;
}

.el-header,
.el-footer {
  background-color: #2f2f2f;
  color: #111;
  text-align: center;
  line-height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #555;
}

.el-aside {
  background-color: #E6E8EB;
  color: #333;
  text-align: center;
  height: calc(100vh - 60px);
  overflow-y: hidden !important;
}

.el-main {
  background-color: #F0F2F5;
  color: #333;
  overflow-y: auto;
}

.el-container > .el-main {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 0px;
}

body>.el-container {
  margin-bottom: 0px;
}

.el-container:nth-child(5) .el-aside,
.el-container:nth-child(6) .el-aside {
  line-height: 260px;
}

.el-container:nth-child(7) .el-aside {
  line-height: 320px;
}
</style>