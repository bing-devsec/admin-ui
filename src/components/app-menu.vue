<template>
	<div class="app-menu" :class="{ 'app-menu--collapsed': collapsed }">
		<div class="menu-header">
			<span class="menu-title">菜单</span>
		</div>
		<el-menu
			class="menu-list"
			active-text-color="#ffd04b"
			background-color="#545c64"
			text-color="#fff"
			:default-active="activeIndex"
			:collapse="collapsed"
			:collapse-transition="false"
			router>

			<el-menu-item index="/home/write-article">
				<el-icon>
					<DocumentAdd />
				</el-icon>
				<span>写文章</span>
			</el-menu-item>

			<el-menu-item index="/home/manage-article">
				<el-icon>
					<Document />
				</el-icon>
				<span>文章管理</span>
			</el-menu-item>

			<el-menu-item index="/home/manage-tag">
				<el-icon>
					<Management />
				</el-icon>
				<span>专栏管理</span>
			</el-menu-item>

			<el-menu-item index="/home/manager-link">
				<el-icon>
					<Link />
				</el-icon>
				<span>友链管理</span>
			</el-menu-item>

			<el-menu-item index="/home/manage-comment">
				<el-icon>
					<Comment />
				</el-icon>
				<span>评论管理</span>
			</el-menu-item>

			<el-menu-item index="/home/manage-user">
				<el-icon>
					<User />
				</el-icon>
				<span>用户管理</span>
			</el-menu-item>

			<el-menu-item index="/home/about-me">
				<el-icon>
					<Postcard />
				</el-icon>
				<span>关于我</span>
			</el-menu-item>

			<el-menu-item index="/home/sign-out">
				<el-icon>
					<Back />
				</el-icon>
				<span>退出登录</span>
			</el-menu-item>
		</el-menu>
		<div class="menu-footer">
			<button
				class="collapse-trigger"
				type="button"
				:aria-label="collapsed ? '展开菜单' : '收起菜单'"
				:title="collapsed ? '展开菜单' : '收起菜单'"
				@click="toggleCollapse">
				<el-icon>
					<ArrowRight v-if="collapsed" />
					<ArrowLeft v-else />
				</el-icon>
			</button>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ArrowLeft, ArrowRight, Back, Comment, Document, DocumentAdd, Link, Management, Postcard, User } from "@element-plus/icons-vue";
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

defineProps<{
	collapsed: boolean;
}>();

const emit = defineEmits<{
	(event: 'toggle-collapse'): void;
}>();

const router = useRouter();
const activeIndex = ref(router.currentRoute.value.path);

const toggleCollapse = () => {
	emit('toggle-collapse');
};

watch(() => router.currentRoute.value.path, newPath => {
	activeIndex.value = newPath;
});
</script>

<style scoped>
.app-menu {
	--menu-active-color: #ffd04b;
	--menu-bg-color: #545c64;
	--menu-divider-color: #cdd0d6;
	--menu-header-height: 48px;
	--menu-text-color: #fff;

	background-color: var(--menu-bg-color);
	block-size: 100%;
	box-sizing: border-box;
	color: var(--menu-text-color);
	display: flex;
	flex-direction: column;
	inline-size: 100%;
	overflow: hidden;
}

.menu-header {
	align-items: center;
	background-color: var(--menu-bg-color);
	border-bottom: 1px solid var(--menu-divider-color);
	box-sizing: border-box;
	color: var(--menu-text-color);
	display: flex;
	flex-shrink: 0;
	height: var(--menu-header-height);
	justify-content: center;
	padding: 0 16px;
}

.menu-title {
	font-size: 1.5rem;
	font-weight: 700;
	letter-spacing: 0.02em;
	line-height: 1;
	overflow: hidden;
	text-align: center;
	text-overflow: clip;
	white-space: nowrap;
}

.collapse-trigger {
	align-items: center;
	background-color: rgba(255, 255, 255, 0.1);
	border: 0;
	border-radius: 10px;
	box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
	color: var(--menu-text-color);
	cursor: pointer;
	display: inline-flex;
	height: 34px;
	justify-content: center;
	padding: 0;
	transition: background-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
	width: 42px;
}

.collapse-trigger .el-icon {
	font-size: 16px;
}

.collapse-trigger:hover,
.collapse-trigger:focus-visible {
	background-color: rgba(255, 208, 75, 0.18);
	box-shadow: inset 0 0 0 1px rgba(255, 208, 75, 0.32);
	color: var(--menu-active-color);
	outline: none;
}

.app-menu--collapsed .menu-header {
	padding: 0;
}

.app-menu--collapsed .menu-title {
	display: none;
}

.menu-list {
	background-color: var(--menu-bg-color);
	border-right: 0;
	box-sizing: border-box;
	flex: 1;
	min-height: 0;
	overflow-x: hidden;
	overflow-y: hidden;
	width: 100%;
}

.menu-footer {
	align-items: center;
	background-color: var(--menu-bg-color);
	border-top: 1px solid rgba(205, 208, 214, 0.45);
	box-sizing: border-box;
	display: flex;
	flex-shrink: 0;
	height:46px;
	justify-content: center;
	padding: 10px 20px;
}

.menu-list:not(.el-menu--collapse) {
	width: 100%;
}

:deep(.el-menu-item) {
	box-sizing: border-box;
}

:deep(.el-menu-item:hover) {
	background-color: rgba(255, 255, 255, 0.08);
}

:deep(.el-menu-item.is-active) {
	background-color: rgba(255, 208, 75, 0.1);
}
</style>
