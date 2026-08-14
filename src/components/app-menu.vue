<template>
	<div class="app-menu">
		<div class="menu-header">
			<span class="menu-brand-mark">B</span>
			<span class="menu-title">博客后台管理</span>
		</div>
		<el-menu
			class="menu-list"
			active-text-color="#ffd04b"
			background-color="#545c64"
			text-color="#fff"
			:default-active="activeIndex"
			:default-openeds="defaultOpeneds"
			:unique-opened="false"
			router>

			<el-sub-menu v-for="section in menuSections" :key="section.index" :index="section.index">
				<template #title>
					<el-icon>
						<component :is="section.icon" />
					</el-icon>
					<span>{{ section.title }}</span>
				</template>
				<el-menu-item v-for="item in section.children" :key="item.index" :index="item.index">
					<el-icon>
						<component :is="item.icon" />
					</el-icon>
					<span>{{ item.title }}</span>
				</el-menu-item>
			</el-sub-menu>
		</el-menu>
	</div>
</template>

<script lang="ts" setup>
import { Back, Comment, Document, DocumentAdd, Link, Management, Picture, Postcard, Search, User, Warning } from "@element-plus/icons-vue";
import { markRaw, ref, watch, type Component } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const activeIndex = ref(router.currentRoute.value.path);
const iconOf = (icon: Component) => markRaw(icon);

interface MenuItem {
	index: string;
	title: string;
	icon: Component;
}

interface MenuSection {
	index: string;
	title: string;
	icon: Component;
	children: MenuItem[];
}

const menuSections: MenuSection[] = [
	{
		index: 'creation',
		title: '创作',
		icon: iconOf(DocumentAdd),
		children: [
			{ index: '/home/write-article', title: '写文章', icon: iconOf(DocumentAdd) },
			{ index: '/home/manage-draft', title: '草稿管理', icon: iconOf(Document) },
		],
	},
	{
		index: 'content',
		title: '内容',
		icon: iconOf(Management),
		children: [
			{ index: '/home/manage-article', title: '文章管理', icon: iconOf(Document) },
			{ index: '/home/manage-image', title: '图片管理', icon: iconOf(Picture) },
			{ index: '/home/manage-tag', title: '专栏管理', icon: iconOf(Management) },
			{ index: '/home/manager-link', title: '友链管理', icon: iconOf(Link) },
			{ index: '/home/about-me', title: '关于我', icon: iconOf(Postcard) },
		],
	},
	{
		index: 'interaction',
		title: '互动',
		icon: iconOf(Comment),
		children: [
			{ index: '/home/manage-comment', title: '评论管理', icon: iconOf(Comment) },
			{ index: '/home/manage-comment-report', title: '举报管理', icon: iconOf(Warning) },
			{ index: '/home/manage-comment-moderation', title: '审核模拟', icon: iconOf(Search) },
		],
	},
	{
		index: 'system',
		title: '系统',
		icon: iconOf(User),
		children: [
			{ index: '/home/manage-user', title: '用户管理', icon: iconOf(User) },
			{ index: '/home/sign-out', title: '退出登录', icon: iconOf(Back) },
		],
	},
];

const defaultOpeneds = menuSections.map(section => section.index);

watch(() => router.currentRoute.value.path, newPath => {
	activeIndex.value = newPath;
});
</script>

<style scoped>
.app-menu {
	--menu-active-color: #ffd04b;
	--menu-bg-color: #545c64;
	--menu-divider-color: #cdd0d6;
	--menu-header-height: var(--admin-header-height, 48px);
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
	gap: 10px;
	height: var(--menu-header-height);
	justify-content: flex-start;
	padding: 0 12px;
}

.menu-brand-mark {
	align-items: center;
	background: linear-gradient(135deg, rgba(255, 208, 75, 0.95), rgba(255, 176, 58, 0.95));
	border-radius: 10px;
	box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
	color: #2d2f33;
	display: inline-flex;
	flex: 0 0 30px;
	font-size: 16px;
	font-weight: 800;
	height: 30px;
	justify-content: center;
	line-height: 1;
	width: 30px;
}

.menu-title {
	font-size: 14px;
	font-weight: 700;
	letter-spacing: 0.01em;
	line-height: 1;
	overflow: hidden;
	text-align: center;
	text-overflow: clip;
	white-space: nowrap;
}

.menu-list {
	background-color: var(--menu-bg-color);
	border-right: 0;
	box-sizing: border-box;
	flex: 1;
	min-height: 0;
	overscroll-behavior: contain;
	overflow-x: hidden;
	overflow-y: auto;
	scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
	scrollbar-width: thin;
	width: 100%;
	-webkit-overflow-scrolling: touch;
}

.menu-list::-webkit-scrollbar {
	width: 6px;
}

.menu-list::-webkit-scrollbar-track {
	background: transparent;
}

.menu-list::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.26);
	border-radius: 999px;
}

.menu-list::-webkit-scrollbar-thumb:hover {
	background: rgba(255, 255, 255, 0.36);
}

:deep(.el-menu-item) {
	box-sizing: border-box;
	height: 42px;
	line-height: 42px;
}

:deep(.el-sub-menu__title) {
	box-sizing: border-box;
	height: 46px;
	line-height: 46px;
}

:deep(.el-sub-menu__title:hover) {
	background-color: rgba(255, 255, 255, 0.08);
}

:deep(.el-menu-item:hover) {
	background-color: rgba(255, 255, 255, 0.08);
}

:deep(.el-menu-item.is-active),
:deep(.el-sub-menu.is-active > .el-sub-menu__title) {
	background-color: rgba(255, 208, 75, 0.1);
}

:deep(.el-menu--inline) {
	background-color: rgba(0, 0, 0, 0.08);
	padding: 4px 0;
}

:deep(.el-menu--inline .el-menu-item) {
	height: 38px;
	line-height: 38px;
}

:deep(.el-menu--inline .el-menu-item .el-icon) {
	font-size: 15px;
}

</style>
