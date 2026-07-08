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
				<articleManageTab :data="tabData" :currentPage="currentPage" :pageSize="pageSize"
					@refreshData="refreshCurrentPageData">
				</articleManageTab>
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
				<articleManageTab :data="tabData" :currentPage="currentPage" :pageSize="pageSize"
					@refreshData="refreshCurrentPageData"></articleManageTab>
			</el-tab-pane>
		</el-tabs>
	</div>

	<pagination :total="total" :currentPage="currentPage" :pageSize="pageSize"
		@handleCurrentChange="handleCurrentChange">
	</pagination>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import articleManageTab from "../components/article-manage-tab.vue";
import pagination from "../components/pagination.vue";
import { Calendar, View } from "@element-plus/icons-vue";
import { ElNotification } from "element-plus";
import _axios from "../utils/axios";

type ArticleOrder = "time" | "view";
type ArticleTabName = "按发布时间" | "按浏览量";

const route = useRoute();
const router = useRouter();

// 数据和分页信息
let tabData = ref([]);
let currentPage = ref(parsePositivePage(route.query.page));
let pageSize = 10;
let total = ref(0);
let activeTab = ref<ArticleTabName>(
	orderToTab(parseArticleOrder(route.query.order)),
);

// firstQueryValue 读取 query 中的第一个字符串值。
function firstQueryValue(value: unknown): string {
	if (Array.isArray(value)) {
		return typeof value[0] === "string" ? value[0] : "";
	}
	return typeof value === "string" ? value : "";
}

// parseArticleOrder 把 URL query 转为文章排序方式。
function parseArticleOrder(value: unknown): ArticleOrder {
	return firstQueryValue(value) === "view" ? "view" : "time";
}

// parsePositivePage 把 URL query 转为正整数页码。
function parsePositivePage(value: unknown): number {
	const page = Number.parseInt(firstQueryValue(value), 10);
	return Number.isFinite(page) && page > 0 ? page : 1;
}

// orderToTab 把接口排序值转为当前标签名。
function orderToTab(order: ArticleOrder): ArticleTabName {
	return order === "view" ? "按浏览量" : "按发布时间";
}

// currentOrder 获取当前标签对应的接口排序值。
function currentOrder(): ArticleOrder {
	return activeTab.value === "按浏览量" ? "view" : "time";
}

// syncRouteState 把当前文章管理状态写入 URL。
function syncRouteState(order: ArticleOrder, page: number) {
	router
		.replace({
			path: route.path,
			query: {
				order,
				page: String(page),
			},
		})
		.catch(() => { });
}

// 请求数据的通用函数
const fetchData = async (order: ArticleOrder) => {
	try {
		const response = await _axios.get("/admin/auth/article/list", {
			params: { order, page: currentPage.value, pageSize: pageSize },
		});

		if (response.data.code === 2000 && response.data.message === "") {
			tabData.value = response.data.data.rows;
			total.value = response.data.data.total;
		} else {
			ElNotification({
				title: "Failed",
				message: response.data.message,
				type: "error",
			});
		}
	} catch (error: any) {
		ElNotification({
			title: "Error",
			message: error.message,
			type: "error",
		});
	}
};

// Tab 切换时重置页码并重新请求数据。
watch(activeTab, async () => {
	currentPage.value = 1;
	const order = currentOrder();
	syncRouteState(order, currentPage.value);
	await fetchData(order);
});

// 监听当前页变化
let handleCurrentChange = async (newPage: number) => {
	currentPage.value = newPage;
	const order = currentOrder();
	syncRouteState(order, currentPage.value);
	await fetchData(order);
};

const refreshCurrentPageData = async () => {
	await fetchData(currentOrder());
};

// 初始加载数据
onMounted(async () => {
	const order = currentOrder();
	syncRouteState(order, currentPage.value);
	await fetchData(order);
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
