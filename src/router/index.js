import { createRouter, createWebHistory } from 'vue-router';

const routes = [
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
                path: 'about-me',
                component: () => import('@/views/about-me.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: 'sign-out',
                component: () => import('@/views/sign-out.vue'),
                meta: { requiresAuth: true },
            }
        ],
    },
    {
        path: '/',
        component: () => import('@/views/login.vue'),
    }
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

function isTokenExpired(token) {
    if (!token) return true;
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return Date.now() / 1000 >= exp;
}

function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
        return window.$axios
            .post('/admin/refresh-token', null, {
                headers: { Authorization: `Bearer ${refreshToken}` },
            })
            .then(response => {
                const { code, message, data } = response.data;
                const { accessToken, refreshToken, userID } = data || {};
                if (code === 4010 || code === 4011 || code===4012 || code===5000) {
                    router.push('/').catch(() => {});
                    return false;
                }
                if (code===2000&&message===''){
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);
                    localStorage.setItem('userID', userID);
                    window.$axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                    return true;
                }
                return false;
            })
            .catch(() => {
                return false;
            });
    }
    return Promise.resolve(false);
}

// 设置全局路由守卫
router.beforeEach(async (to, from, next) => {
    let token = localStorage.getItem('accessToken');

    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!token) {
            next({ path: '/login' });
        } else if (isTokenExpired(token)) {
            const refreshSuccess = await refreshAccessToken();
            if (refreshSuccess) {
                next();
            } else {
                next({ path: '/login' });
            }
        } else {
            next();
        }
    } else {
        next();
    }
});

export default router;
