<template>
	<div class="tabs-container">
		<el-tabs type="border-card" v-model="activeTab" class="demo-tabs">
			<el-tab-pane name="按发布时间" label="按发布时间">
				<template #label>
					<span class="custom-tabs-label">
						<el-icon>
							<Calendar />
						</el-icon>
						<span>按发布时间</span>
					</span>
				</template>
				<articleManageTab :data="tabData" :currentPage="currentPage" :pageSize="pageSize" @refreshData="refreshCurrentPageData"></articleManageTab>
			</el-tab-pane>

			<el-tab-pane name="按浏览量" label="按浏览量">
				<template #label>
					<span class="custom-tabs-label">
						<el-icon>
							<View />
						</el-icon>
						<span>按浏览量</span>
					</span>
				</template>
				<articleManageTab :data="tabData" :currentPage="currentPage" :pageSize="pageSize" @refreshData="refreshCurrentPageData"></articleManageTab>
			</el-tab-pane>
		</el-tabs>
	</div>

	<pagination :total="total" :currentPage="currentPage" :pageSize="pageSize"
		@handleCurrentChange="handleCurrentChange">
	</pagination>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import articleManageTab from '../components/article-manage-tab.vue';
import pagination from '../components/pagination.vue';
import { Calendar, View } from "@element-plus/icons-vue";
import { ElNotification } from "element-plus";
import _axios from '../utils/axios';

// 数据和分页信息
let tabData = ref([]);
let currentPage = ref(1);
let pageSize = 10;
let total = ref(0);
let activeTab = ref('按发布时间');

// 请求数据的通用函数
const fetchData = async (order: string) => {
	try {
		const response = await _axios.get('/admin/auth/article/list', {
			params: { order, page: currentPage.value, pageSize: pageSize },
		});

		if (response.data.code === 2000&& response.data.message === "") {
			tabData.value = response.data.data.rows;
			total.value = response.data.data.total;
		} else {
			ElNotification({
				title: "Failed",
				message: response.data.message,
				type: "error",
			});
		}
	} catch (error) {
		ElNotification({
			title: "Error",
			message: error.message,
			type: "error",
		});
	}
};

// Tab 切换时重新请求数据
watch(activeTab, (newTab) => {
	if (newTab === '按发布时间') {
		fetchData('time');
	} else if (newTab === '按浏览量') {
		fetchData('view');
	}
});

// 监听当前页变化
let handleCurrentChange = (newPage: number) => {
	currentPage.value = newPage;
	fetchData(activeTab.value === '按发布时间' ? 'time' : 'view');
};

const refreshCurrentPageData = async () => {
  await fetchData(activeTab.value === '按发布时间' ? 'time' : 'view');
};

// 初始加载数据
onMounted(async () => {
	await fetchData('time');
});
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
	margin-left: 5px;
}
</style>
