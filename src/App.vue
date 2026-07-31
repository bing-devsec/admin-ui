<template>
  <div class="admin-app" :class="{ 'admin-app--allow-portrait': allowPortrait }">
    <div class="admin-app__content">
      <RouterView></RouterView>
    </div>

    <section class="mobile-landscape-guard" role="status" aria-live="polite">
      <div class="mobile-landscape-guard__card">
        <div class="mobile-landscape-guard__device" aria-hidden="true"></div>
        <p class="mobile-landscape-guard__title">后台管理仅支持横屏使用</p>
        <p class="mobile-landscape-guard__desc">请旋转设备至横屏后继续操作。</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';

const route = useRoute();
const allowPortrait = computed(() => route.matched.some((record) => record.meta.allowPortrait));
</script>

<style scoped>
.admin-app {
  min-height: 100vh;
  min-height: 100dvh;
}

.admin-app__content {
  min-height: inherit;
}

.mobile-landscape-guard {
  display: none;
}

@media (any-pointer: coarse) and (orientation: landscape) {
  .admin-app:not(.admin-app--allow-portrait) {
    min-width: 900px;
  }
}

@media (any-pointer: coarse) and (orientation: portrait) {
  .admin-app:not(.admin-app--allow-portrait) {
    min-height: 100dvh;
    overflow: hidden;
  }

  .admin-app:not(.admin-app--allow-portrait) .admin-app__content {
    display: none;
  }

  .admin-app:not(.admin-app--allow-portrait) .mobile-landscape-guard {
    align-items: center;
    background:
      radial-gradient(circle at 20% 20%, rgba(64, 158, 255, 0.18), transparent 30%),
      linear-gradient(145deg, #f7fafc 0%, #edf2f7 100%);
    box-sizing: border-box;
    color: #303133;
    display: flex;
    inset: 0;
    justify-content: center;
    padding: 24px;
    position: fixed;
    z-index: 9999;
  }

  .mobile-landscape-guard__card {
    align-items: center;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(148, 163, 184, 0.32);
    border-radius: 20px;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    max-width: 320px;
    padding: 30px 24px;
    text-align: center;
    width: 100%;
  }

  .mobile-landscape-guard__device {
    border: 3px solid #409eff;
    border-radius: 16px;
    box-sizing: border-box;
    height: 64px;
    margin-bottom: 22px;
    position: relative;
    width: 112px;
  }

  .mobile-landscape-guard__device::before {
    background: #409eff;
    border-radius: 999px;
    content: "";
    height: 18px;
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
  }

  .mobile-landscape-guard__title {
    color: #1f2937;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.35;
    margin: 0 0 8px;
  }

  .mobile-landscape-guard__desc {
    color: #606266;
    font-size: 14px;
    line-height: 1.7;
    margin: 0;
  }
}
</style>
