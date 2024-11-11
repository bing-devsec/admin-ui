<script lang="ts" setup>
import { RouterLink, RouterView } from "vue-router";
import manue from "./manue.vue";
</script>

<template>
	<div class="common-layout">
		<el-container class="inner-container">
			<el-aside width="12%">
				<manue></manue>
			</el-aside>
			<el-main>
				<RouterView></RouterView>
			</el-main>
		</el-container>
	</div>
</template>


<style>
.inner-container {
	height: calc(100vh);
}

.el-aside {
	background-color: #e6e8eb;
	color: #333;
	text-align: center;
	overflow-y: hidden !important;
}

.el-main {
	background-color: #f0f2f5;
	color: #333;
	overflow-y: auto;
}

.el-container>.el-main {
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