import { createRouter, createWebHistory } from 'vue-router';

import fingerPrint from '@/views/finger-print.vue';

import login from '@/views/login.vue';
import home from '@/components/home.vue';

import writeArticle from '@/views/write-article.vue';
import manageArticle from '@/views/manage-article.vue';
import manageTag from '@/views/manage-tag.vue';
import manageLink from '@/views/manage-link.vue';
import aboutMe from '@/views/about-me.vue';
import signOut from '@/views/sign-out.vue';

const routes = [
    {
        path: '/home',
        component: home,
        children: [
            {
                path: 'write-article',
                component: writeArticle,
                meta: { requiresAuth: true },
            },
            {
                path: 'manage-article',
                component: manageArticle,
                meta: { requiresAuth: true },
            },
            {
                path: 'manage-tag',
                component: manageTag,
                meta: { requiresAuth: true },
            },
            {
                path: 'manager-link',
                component: manageLink,
                meta: { requiresAuth: true },
            },
            {
                path: 'about-me',
                component: aboutMe,
                meta: { requiresAuth: true },
            },
            {
                path: 'sign-out',
                component: signOut,
                meta: { requiresAuth: true },
            }
        ],
    },
    {
        path: '/login',
        component: login,
    },
    {
        path: '/',
        component: fingerPrint,
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
                    router.push("/login");
                    return false;
                }
                if (code===2000){
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
