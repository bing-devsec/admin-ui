<template>
    <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize" :pager-count="pagerCount"
        :current-page="currentPage" @current-change="handlePageChange" class="pagination-container" />
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
    total: number;
    currentPage?: number;
    pageSize?: number;
}>(), {
    currentPage: 1,
    pageSize: 10,
});

const emit = defineEmits<{
    (event: 'handleCurrentChange', page: number): void;
}>();

const pagerCount = 9;

const handlePageChange = (newPage: number) => {
    emit('handleCurrentChange', newPage);
};

</script>

<style scoped>
.pagination-container {
    z-index: 1000;
    border-top: 1px solid #666;
    border-bottom: 1px solid #666;
    padding: 6px;
    background-color: white;
    box-sizing: border-box;
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    width: 100%;
}
</style>
