<template>
    <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize" :pager-count="pagerCount"
        :current-page="currentPage" @current-change="handlePageChange" class="pagination-container" />
</template>

<script lang="ts" setup>
import { toRefs, ref } from 'vue'
const props = defineProps<{ total: number }>()
let { total } = toRefs(props)

const emit = defineEmits(['handleCurrentChange'])

let currentPage = ref(1);
let pageSize = ref(9);
let pagerCount = 9;

const handlePageChange = (newPage: number) => {
    currentPage.value = newPage;
    emit('handleCurrentChange', newPage)
};

</script>

<style scoped>
.pagination-container {
    border-top: 2px solid #666;
    border-bottom: 2px solid #666;
    padding: 6px;
    background-color: white;
    display: flex;
    justify-content: center;
    position: fixed;
    bottom: 0;
    left: 13%;
    right: 0px;
}
</style>