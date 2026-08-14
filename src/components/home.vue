<script lang="ts" setup>
import { RouterView } from "vue-router";
import appMenu from "./app-menu.vue";
</script>

<template>
	<div class="common-layout">
		<el-container class="inner-container">
			<el-aside class="layout-aside">
				<appMenu></appMenu>
			</el-aside>
			<el-main class="layout-main">
				<RouterView></RouterView>
			</el-main>
		</el-container>
	</div>
</template>

<style scoped>
.inner-container {
	--layout-menu-bg-color: #545c64;
	--layout-menu-divider-color: #cdd0d6;
	--layout-menu-width: 168px;

	height: 100vh;
}

.layout-aside {
	background-color: var(--layout-menu-bg-color);
	box-shadow: inset -1px 0 0 var(--layout-menu-divider-color);
	box-sizing: border-box;
	color: #fff;
	flex: 0 0 var(--layout-menu-width);
	line-height: normal;
	min-width: var(--layout-menu-width);
	overflow: hidden !important;
	text-align: left;
	width: var(--layout-menu-width) !important;
}

.layout-main {
	background-color: #f0f2f5;
	color: #333;
	overflow-y: auto;
}

.inner-container > .layout-main {
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	padding: 0px;
}
</style>
