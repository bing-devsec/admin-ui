<template>
	<div></div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';

const router = useRouter();
const logout = () => {
	localStorage.removeItem("accessToken");
	localStorage.removeItem("refreshToken");
	localStorage.removeItem("userID");
	window.$axios.defaults.headers.common["Authorization"] = "";
	router.push('/').catch(() => {});
};
logout();
</script>