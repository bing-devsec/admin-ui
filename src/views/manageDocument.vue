<template>
	<div class="tabs-container">
		<el-tabs type="border-card" class="demo-tabs">

			<el-tab-pane>
				<template #label>
					<span class="custom-tabs-label">
						<el-icon>
							<Calendar />
						</el-icon>
						<span>按发布时间</span>
					</span>
				</template>
				<pubTime :data="pubTimeData" :currentPage="currentPage"></pubTime>
			</el-tab-pane>

			<el-tab-pane>
				<template #label>
					<span class="custom-tabs-label">
						<el-icon>
							<View />
						</el-icon>
						<span>按浏览量</span>
					</span>
				</template>
				<pubViews :data="pubViewsData" :currentPage="currentPage"></pubViews>
			</el-tab-pane>

		</el-tabs>
	</div>

	<pagination :total="total" :currentPage="currentPage" :pageSize="pageSize"
				@handleCurrentChange="handleCurrentChange">
	</pagination>
</template>

<script lang="ts" setup>
import { Calendar, View } from "@element-plus/icons-vue";
import { ref, onMounted } from 'vue';

import pubTime from '../components/pubTime.vue'
import pubViews from '../components/pubViews.vue'
import pagination from '../components/pagination.vue';
import { useRouter } from "vue-router";
const router = useRouter();

let pubTimeData = ref([]);
let pubViewsData = ref([]);
let currentPage = ref(1)    // 初始页码为1
const pageSize = 9          // 每页的文章数量，每页最多9篇文章
let total = ref(0)          // 文章总数
const accessToken = localStorage.getItem("accessToken");

onMounted(async () => {
	try {
		const response1 = await window.$axios.get('/admin/sortByPubTime', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});
		pubTimeData.value = response1.data.blog;
		total.value = response1.data.blog.length;

		const response2 = await window.$axios.get('/admin/sortByViews', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});
		pubViewsData.value = response2.data.blog;
	} catch (error) {
		if (error.response && error.response.status === 401) {
			// 访问令牌过期，尝试使用刷新令牌获取新的访问令牌
			let refreshToken = localStorage.getItem("refreshToken");

			if (refreshToken) {
				try {
					const response = await window.$axios.post("/admin/refresh-token", null, {
						headers: {
							'Authorization': `Bearer ${refreshToken}`
						}
					});
					// 保存新的访问令牌和刷新令牌
					const accessToken = response.data.access_token;
					refreshToken = response.data.refresh_token;
					localStorage.setItem("accessToken", accessToken);
					localStorage.setItem("refreshToken", refreshToken);
					location.reload();
				} catch (refreshError) {
					// 刷新令牌也过期或无效，跳转到短信登录页面
					router.push("/short-message-login");
				}
			} else {
				// 没有刷新令牌，跳转到短信登录页面
				router.push("/short-message-login");
			}
		} else if (error.response && error.response.status === 403) {
			router.push("/short-message-login");
		} else {
			alert(error);
		}

	}
});

let handleCurrentChange = (newPage) => {
	currentPage.value = newPage;
};

</script>

<style scoped>
.tabs-container {
	max-height: 100%;
	overflow-y: auto;
	margin-bottom: 45px;
}

.demo-tabs>.el-tabs__content {
	color: #6b778c;
	font-size: 32px;
	font-weight: 400;
}

.demo-tabs .custom-tabs-label .el-icon {
	vertical-align: middle;
}

.demo-tabs .custom-tabs-label span {
	vertical-align: middle;
	margin-left: 4px;
}
</style>
