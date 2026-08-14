import {
    createRouter,
    createWebHistory,
    type RouteRecordRaw,
} from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/home',
        component: () => import('@/components/home.vue'),
        children: [
            {
                path: 'write-article',
                component: () => import('@/views/write-article.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'manage-article',
                component: () => import('@/views/manage-article.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'manage-draft',
                component: () => import('@/views/manage-draft.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'manage-image',
                component: () => import('@/views/manage-image.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'manage-tag',
                component: () => import('@/views/manage-tag.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'manager-link',
                component: () => import('@/views/manage-link.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'manage-comment',
                component: () => import('@/views/manage-comment.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'manage-comment-moderation',
                component: () => import('@/views/manage-comment-moderation.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'manage-comment-report',
                component: () => import('@/views/manage-comment-report.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'manage-user',
                component: () => import('@/views/manage-user.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'about-me',
                component: () => import('@/views/about-me.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'sign-out',
                component: () => import('@/views/sign-out.vue'),
                meta: { requiresAuth: true },
            },
        ],
    },
    {
        path: '/',
        component: () => import('@/views/login.vue'),
        meta: { allowPortrait: true },
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

// 设置全局路由守卫
// token 已改为 HttpOnly Cookie，前端无法读取，故以 userID 登录标记判断是否登录；
// token 是否过期、能否续期，由 axios 响应拦截器在实际请求时处理（4012 自动刷新、4010/4011 跳登录）。
router.beforeEach((to, _from, next) => {
    const isLoggedIn = !!localStorage.getItem('userID');

    if (to.matched.some((record) => record.meta.requiresAuth) && !isLoggedIn) {
        next({ path: '/' });
    } else {
        next();
    }
});

export default router;
