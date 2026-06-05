<template>
	<div></div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';

const router = useRouter();
const logout = async () => {
	// token 为 HttpOnly Cookie，前端无法删除，需调用后端登出接口清除 Cookie
	try {
		await window.$axios.post('/admin/logout');
	} catch {
		// 即使登出接口失败，也继续清理前端登录标记并跳转
	}
	localStorage.removeItem('userID');
	router.push('/').catch(() => {});
};
logout();
</script>