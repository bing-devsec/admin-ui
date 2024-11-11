import { createRouter, createWebHistory } from 'vue-router';

import writeDocument from '@/views/writeDocument.vue';
import manageDocument from '@/views/manageDocument.vue';
import pubTime from '@/components/pubTime.vue';
import pubViews from '@/components/pubViews.vue';
import home from '@/components/home.vue';

import manageLabel from '@/views/manageLabel.vue';
import toolsConfig from '@/views/toolsConfig.vue';
import aboutMe from '@/views/aboutMe.vue';
import login from '@/views/login.vue';

const routes = [
  {
    path: '/home',
    component: home,
    children: [
      {
        path: '',
        component: manageDocument,
      },
      {
        path: 'article/list',
        component: manageDocument,
        children: [
          {
            path: 'pubTime',
            component: pubTime,
          },
          {
            path: 'pubViews',
            component: pubViews,
          },
        ],
      },
      {
        path: 'writeDocument',
        component: writeDocument,
        // meta: { requiresAuth: true },
      },
      {
        path: 'manageLabel',
        component: manageLabel,
      },
      {
        path: 'toolsConfig',
        component: toolsConfig,
      },
      {
        path: 'aboutMe',
        component: aboutMe,
      },
    ],
  },
  {
    path: '/login',
    component: login,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes, // 这里直接使用 routes 数组
});

// 设置全局路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('accessToken');

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!token) {
      next({ path: '/login' }); // 使用 path 而不是 name
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router; // 导出 router 实例
